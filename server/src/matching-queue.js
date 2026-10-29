import { MatchRequest, MentorProfile, MentorApplication, User, UserBlock, Notification, Session, Conversation } from './models.js';
import { rankMentors } from './matching.js';
import { incrementMetric } from './observability.js';

const OFFER_TTL_MS = 15 * 60_000;
const RETRY_AFTER_MS = 30_000;

async function nextEligibleCandidate(request, exclude = new Set()) {
  const profiles = await MentorProfile.find({ available: true, sessionFormats: request.format })
    .populate({ path: 'user', match: { institution: request.institution, isBanned: false }, select: 'alias institution isBanned' });
  const blockedRows = await UserBlock.find({ $or: [{ blocker: request.requester }, { blocked: request.requester }] }).select('blocker blocked');
  const blocked = new Set(blockedRows.map(row => String(row.blocker) === String(request.requester) ? String(row.blocked) : String(row.blocker)));
  const attempted = new Set([...(request.attemptedMentors || []).map(String), ...exclude]);
  const eligible = profiles.filter(profile => profile.user && String(profile.user._id) !== String(request.requester) && !blocked.has(String(profile.user._id)) && !attempted.has(String(profile.user._id)));
  const approved = await MentorApplication.find({ applicant: { $in: eligible.map(profile => profile.user._id) }, status: 'approved' }).select('applicant');
  const approvedIds = new Set(approved.map(item => String(item.applicant)));
  return rankMentors(eligible.filter(profile => approvedIds.has(String(profile.user._id))).map(profile => ({ ...profile.toObject(), user: profile.user })), { topic: request.topic, institution: request.institution, format: request.format, languages: request.preferences?.languages || [], preferredTimes: request.preferences?.preferredTimes || [] });
}

async function isEligibleCandidate(request, candidateId) {
  if (!candidateId || String(candidateId) === String(request.requester)) return false;
  const [user, profile, approved, blocked] = await Promise.all([
    User.findOne({ _id: candidateId, institution: request.institution, isBanned: false }).select('_id alias institution'),
    MentorProfile.findOne({ user: candidateId, available: true, sessionFormats: request.format }),
    MentorApplication.exists({ applicant: candidateId, status: 'approved' }),
    UserBlock.exists({ $or: [{ blocker: request.requester, blocked: candidateId }, { blocker: candidateId, blocked: request.requester }] })
  ]);
  return user && profile && approved && !blocked ? { user, profile } : null;
}

export async function processMatchingQueueBatch({ limit = 25, now = new Date() } = {}) {
  let processed = 0;
  const staleBefore = new Date(now.getTime() - 2 * 60_000);

  // Recover queue claims left behind by a process crash.
  const staleProcessing = await MatchRequest.find({ status: 'processing', updatedAt: { $lte: staleBefore } }).limit(limit);
  for (const request of staleProcessing) {
    await MatchRequest.updateOne({ _id: request._id, status: 'processing', updatedAt: { $lte: staleBefore } }, { $set: { status: 'queued', processedAt: now }, $unset: { offeredMentor: 1, expiresAt: 1 } });
  }

  // Reconcile a mentor acceptance that crashed between creating the session and completing the queue request.
  const staleAccepting = await MatchRequest.find({ status: 'accepting', updatedAt: { $lte: staleBefore } }).limit(limit);
  for (const request of staleAccepting) {
    const session = await Session.findOne({ matchRequest: request._id });
    if (session) {
      await Conversation.findOneAndUpdate({ session: session._id }, { $setOnInsert: { session: session._id, members: [session.student, session.mentor] } }, { upsert: true, new: true });
      await MatchRequest.updateOne({ _id: request._id, status: 'accepting' }, { $set: { status: 'matched', session: session._id, processedAt: now } });
    } else {
      await MatchRequest.updateOne({ _id: request._id, status: 'accepting' }, { $set: { status: 'queued', processedAt: now }, $unset: { offeredMentor: 1, expiresAt: 1 }, $pull: { candidates: { mentor: request.offeredMentor } } });
    }
  }

  const expired = await MatchRequest.find({ status: 'offered', expiresAt: { $lte: now } }).limit(limit);
  for (const request of expired) {
    const oldMentor = String(request.offeredMentor || '');
    request.candidates = (request.candidates || []).filter(candidate => String(candidate.mentor) !== oldMentor);
    if (oldMentor) request.attemptedMentors = [...new Set([...(request.attemptedMentors || []).map(String), oldMentor])];
    request.status = 'queued'; request.offeredMentor = undefined; request.expiresAt = undefined; request.processedAt = now;
    await request.save(); processed++;
  }

  const queued = await MatchRequest.find({ status: 'queued', $or: [{ processedAt: null }, { processedAt: { $lte: new Date(now.getTime() - RETRY_AFTER_MS) } }] }).sort({ createdAt: 1 }).limit(limit);
  for (const request of queued) {
    // Conditional claim prevents two worker ticks from processing the same request concurrently.
    const claimed = await MatchRequest.findOneAndUpdate({ _id: request._id, status: 'queued', updatedAt: request.updatedAt }, { $set: { status: 'processing', processedAt: now } }, { new: true });
    if (!claimed) continue;
    try {
      const requester = await User.findOne({ _id: claimed.requester, institution: claimed.institution, isBanned: false }).select('_id');
      if (!requester) {
        claimed.status = 'cancelled'; claimed.processedAt = now; await claimed.save();
        continue;
      }
      if (claimed.format === 'group' && (!claimed.preferences?.scheduledAt || new Date(claimed.preferences.scheduledAt).getTime() < now.getTime() + 5 * 60_000)) {
        claimed.status = 'no_match'; claimed.offeredMentor = undefined; claimed.expiresAt = undefined; claimed.processedAt = now; claimed.candidates = [];
        await claimed.save();
        await Notification.create({ user: claimed.requester, kind: 'match_update', message: 'The preferred group-session time is too close or has passed. Please submit a new request with a future time.' }).catch(() => incrementMetric('notification_write_errors'));
        continue;
      }

      const tried = new Set([...(claimed.attemptedMentors || []).map(String)]);
      let candidate = null;
      let candidateUser = null;
      const remaining = [...(claimed.candidates || [])];
      while (remaining.length && !candidate) {
        const possible = remaining.shift();
        const id = String(possible.mentor || '');
        if (!id || tried.has(id)) continue;
        tried.add(id);
        const eligible = await isEligibleCandidate(claimed, id);
        if (eligible) { candidate = possible; candidateUser = eligible.user; }
      }

      if (!candidate) {
        const ranked = await nextEligibleCandidate(claimed, tried);
        if (ranked.length) {
          const best = ranked[0];
          candidate = { mentor: best.mentor.user._id, score: best.score, reasons: best.reasons };
          candidateUser = best.mentor.user;
          // Keep remaining ranked candidates in order, but never re-offer the current candidate.
          claimed.candidates = ranked.slice(1).map(item => ({ mentor: item.mentor.user._id, score: item.score, reasons: item.reasons }));
        }
      } else {
        claimed.candidates = remaining;
      }

      if (!candidate || !candidateUser) {
        // Keep the request queued so newly available mentors can be picked up on a later worker tick.
        claimed.status = 'queued'; claimed.offeredMentor = undefined; claimed.expiresAt = undefined; claimed.processedAt = now; claimed.candidates = [];
        await claimed.save();
        continue;
      }

      claimed.offeredMentor = candidate.mentor; claimed.offeredAt = now; claimed.expiresAt = new Date(now.getTime() + OFFER_TTL_MS); claimed.status = 'offered'; claimed.processedAt = now;
      claimed.attemptedMentors = [...new Set([...(claimed.attemptedMentors || []).map(String), String(candidate.mentor)])];
      await claimed.save();
      await Notification.create({ user: candidateUser._id, kind: 'match_offer', message: `A student is looking for help with ${claimed.topic}. Review the matching request in your queue.` }).catch(() => incrementMetric('notification_write_errors'));
      processed++;
    } catch (error) {
      // Re-queue with a cooldown; the next worker tick will retry without tight-looping.
      await MatchRequest.updateOne({ _id: claimed._id, status: 'processing' }, { $set: { status: 'queued', processedAt: now } });
      throw error;
    }
  }
  return { processed, expiredOffers: expired.length, checkedAt: now.toISOString() };
}
