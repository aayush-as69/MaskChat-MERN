import mongoose from 'mongoose';

const { Schema, model } = mongoose;
const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, select: false },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['student', 'mentor', 'moderator', 'institution_admin', 'admin'], default: 'student', index: true },
  institution: { type: String, required: true, trim: true, maxlength: 120 },
  institutionCode: { type: String, trim: true, lowercase: true, maxlength: 12 },
  degreeCode: { type: String, trim: true, lowercase: true, maxlength: 12 },
  programCode: { type: String, trim: true, lowercase: true, maxlength: 20 },
  studentCode: { type: String, trim: true, maxlength: 40, select: false },
  cohortYear: { type: Number, min: 1900, max: 2200, index: true },
  institutionVerifiedAt: { type: Date, default: null, select: false },
  alias: { type: String, required: true, trim: true, maxlength: 40 },
  year: { type: Number, min: 1, max: 8 },
  interests: [{ type: String, trim: true, maxlength: 40 }],
  isBanned: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true, strict: 'throw' });
userSchema.index({ institution: 1, role: 1, isBanned: 1 });

const mentorProfileSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  bio: { type: String, default: '', maxlength: 500 },
  expertise: [{ type: String, trim: true, maxlength: 50 }],
  languages: [{ type: String, trim: true, maxlength: 30 }],
  availabilityWindows: [{ type: String, trim: true, maxlength: 40 }],
  available: { type: Boolean, default: false, index: true },
  sessionFormats: { type: [String], enum: ['individual', 'group'], default: ['individual'] },
  ratingCount: { type: Number, default: 0 },
  ratingAverage: { type: Number, default: 0 }
}, { timestamps: true, strict: 'throw' });

const sessionSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  mentor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  topic: { type: String, required: true, maxlength: 100 },
  format: { type: String, enum: ['individual', 'group'], default: 'individual' },
  status: { type: String, enum: ['requested', 'accepted', 'active', 'completed', 'cancelled', 'declined'], default: 'requested', index: true },
  // Unique while a request is live; removed when the session reaches a terminal state.
  activePairKey: { type: String, select: false },
  matchRequest: { type: Schema.Types.ObjectId, ref: 'MatchRequest', select: false },
  scheduledAt: { type: Date },
  startedAt: { type: Date },
  endedAt: { type: Date },
  takeaway: { type: String, default: '', maxlength: 2000 },
  description: { type: String, default: '', maxlength: 1500 },
  maxParticipants: { type: Number, min: 2, max: 50, default: 8 },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  invitedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  visibility: { type: String, enum: ['institution', 'invite_only'], default: 'institution' },
  joinDeadline: { type: Date },
  cancelledReason: { type: String, default: '', maxlength: 500 }
}, { timestamps: true, strict: 'throw' });
sessionSchema.index({ student: 1, mentor: 1, status: 1 });
sessionSchema.index({ activePairKey: 1 }, { unique: true, sparse: true });
sessionSchema.index({ matchRequest: 1 }, { unique: true, sparse: true });

const conversationSchema = new Schema({
  session: { type: Schema.Types.ObjectId, ref: 'Session', required: true, unique: true },
  members: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessageAt: { type: Date }
}, { timestamps: true, strict: 'throw' });
conversationSchema.index({ members: 1, lastMessageAt: -1 });

const messageSchema = new Schema({
  conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  senderAlias: { type: String, required: true, maxlength: 40 },
  body: { type: String, required: true, trim: true, maxlength: 4000 },
  clientMessageId: { type: String, required: true, maxlength: 100 },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true, strict: 'throw' });
messageSchema.index({ conversation: 1, sender: 1, clientMessageId: 1 }, { unique: true });
messageSchema.index({ conversation: 1, createdAt: -1 });

const reportSchema = new Schema({
  reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reportedUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  conversation: { type: Schema.Types.ObjectId, ref: 'Conversation' },
  message: { type: Schema.Types.ObjectId, ref: 'Message' },
  reason: { type: String, enum: ['harassment', 'inappropriate_content', 'safety_concern', 'spam', 'other'], required: true },
  details: { type: String, default: '', maxlength: 1500 },
  status: { type: String, enum: ['open', 'reviewing', 'resolved', 'dismissed'], default: 'open', index: true },
  moderatorNotes: { type: String, default: '', maxlength: 1500 }
}, { timestamps: true, strict: 'throw' });
reportSchema.index({ status: 1, createdAt: -1 });

const blockSchema = new Schema({
  blocker: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  blocked: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true, strict: 'throw' });
blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

const notificationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  kind: { type: String, required: true, maxlength: 50 },
  message: { type: String, required: true, maxlength: 300 },
  readAt: { type: Date, default: null }
}, { timestamps: true, strict: 'throw' });

const auditSchema = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true, maxlength: 100 },
  targetType: { type: String, maxlength: 80 },
  targetId: { type: String, maxlength: 100 },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true, strict: 'throw' });
auditSchema.index({ createdAt: -1 });


const mentorApplicationSchema = new Schema({
  applicant: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  institution: { type: String, required: true, trim: true, maxlength: 120, index: true },
  pathway: { type: String, enum: ['senior', 'junior_exception'], required: true },
  skills: [{ type: String, trim: true, maxlength: 60 }],
  evidence: { type: String, default: '', maxlength: 2500 },
  academicYear: { type: Number, min: 1, max: 8 },
  cohortYear: { type: Number, min: 2000, max: 2100 },
  document: {
    storageName: { type: String, select: false },
    originalName: { type: String, maxlength: 160 },
    mimeType: { type: String, enum: ['image/jpeg', 'image/png', 'application/pdf'] },
    size: { type: Number, max: 5 * 1024 * 1024 },
    uploadedAt: { type: Date }
  },
  identityStatus: { type: String, enum: ['missing', 'pending', 'verified', 'rejected'], default: 'missing', index: true },
  status: { type: String, enum: ['submitted', 'identity_pending', 'eligibility_review', 'recommendations_pending', 'assessment_pending', 'approved', 'rejected', 'suspended', 'revoked'], default: 'submitted', index: true },
  reviewer: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewerNotes: { type: String, default: '', maxlength: 1500 },
  reviewedAt: { type: Date },
  approvedAt: { type: Date },
  revokedAt: { type: Date }
}, { timestamps: true, strict: 'throw' });
mentorApplicationSchema.index({ applicant: 1, status: 1 });
mentorApplicationSchema.index({ 'document.storageName': 1 }, { sparse: true });

const mentorRecommendationSchema = new Schema({
  application: { type: Schema.Types.ObjectId, ref: 'MentorApplication', required: true },
  applicant: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  mentor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  institution: { type: String, required: true, maxlength: 120 },
  decision: { type: String, enum: ['recommend', 'decline'], required: true },
  rationale: { type: String, required: true, maxlength: 1200 },
  mentorRatingAtSubmission: { type: Number, min: 0, max: 5 },
  status: { type: String, enum: ['active', 'withdrawn'], default: 'active' }
}, { timestamps: true, strict: 'throw' });
mentorRecommendationSchema.index({ application: 1, mentor: 1 }, { unique: true });
mentorRecommendationSchema.index({ applicant: 1, institution: 1 });

const forumCategorySchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80, unique: true },
  slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 90, unique: true },
  description: { type: String, default: '', maxlength: 300 },
  active: { type: Boolean, default: true }
}, { timestamps: true, strict: 'throw' });

const forumPostSchema = new Schema({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  alias: { type: String, required: true, maxlength: 40 },
  institution: { type: String, required: true, maxlength: 120, index: true },
  category: { type: Schema.Types.ObjectId, ref: 'ForumCategory', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  body: { type: String, required: true, trim: true, maxlength: 10000 },
  tags: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],
  status: { type: String, enum: ['published', 'locked', 'removed'], default: 'published', index: true },
  acceptedReply: { type: Schema.Types.ObjectId, ref: 'ForumReply', default: null },
  voteCount: { type: Number, default: 0 },
  replyCount: { type: Number, default: 0 },
  lastActivityAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true, strict: 'throw' });
forumPostSchema.index({ institution: 1, status: 1, lastActivityAt: -1 });
forumPostSchema.index({ category: 1, status: 1, createdAt: -1 });

const forumReplySchema = new Schema({
  post: { type: Schema.Types.ObjectId, ref: 'ForumPost', required: true, index: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  alias: { type: String, required: true, maxlength: 40 },
  body: { type: String, required: true, trim: true, maxlength: 5000 },
  parentReply: { type: Schema.Types.ObjectId, ref: 'ForumReply', default: null },
  voteCount: { type: Number, default: 0 },
  status: { type: String, enum: ['published', 'removed'], default: 'published' }
}, { timestamps: true, strict: 'throw' });
forumReplySchema.index({ post: 1, createdAt: 1 });

const forumVoteSchema = new Schema({
  voter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['post', 'reply'], required: true },
  target: { type: Schema.Types.ObjectId, required: true },
  value: { type: Number, enum: [-1, 1], default: 1 }
}, { timestamps: true, strict: 'throw' });
forumVoteSchema.index({ voter: 1, targetType: 1, target: 1 }, { unique: true });

const aiUsageSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  feature: { type: String, required: true, maxlength: 40 },
  provider: { type: String, required: true, maxlength: 40 },
  status: { type: String, enum: ['success', 'error'], required: true },
  inputChars: { type: Number, min: 0 },
  outputChars: { type: Number, min: 0 }
}, { timestamps: true, strict: 'throw' });
aiUsageSchema.index({ user: 1, createdAt: -1 });


const matchRequestSchema = new Schema({
  requester: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  institution: { type: String, required: true, index: true, maxlength: 120 },
  topic: { type: String, required: true, trim: true, maxlength: 100 },
  format: { type: String, enum: ['individual', 'group'], default: 'individual' },
  preferences: { languages: [{ type: String, maxlength: 30 }], preferredTimes: [{ type: String, maxlength: 40 }], scheduledAt: { type: Date }, note: { type: String, default: '', maxlength: 500 } },
  status: { type: String, enum: ['queued', 'processing', 'accepting', 'offered', 'matched', 'cancelled', 'expired', 'no_match'], default: 'queued', index: true },
  candidates: [{ mentor: { type: Schema.Types.ObjectId, ref: 'User' }, score: Number, reasons: [String] }],
  // Persistent exclusion set prevents declined/expired mentors from being re-ranked on later worker ticks.
  attemptedMentors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  offeredMentor: { type: Schema.Types.ObjectId, ref: 'User' },
  offeredAt: Date,
  expiresAt: Date,
  session: { type: Schema.Types.ObjectId, ref: 'Session' },
  processedAt: Date
}, { timestamps: true, strict: 'throw' });
matchRequestSchema.index({ institution: 1, status: 1, createdAt: 1 });
matchRequestSchema.index({ requester: 1, status: 1 });
matchRequestSchema.index({ requester: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['queued', 'offered', 'processing', 'accepting'] } } });

const operationalIncidentSchema = new Schema({
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium', index: true },
  state: { type: String, enum: ['open', 'contained', 'resolved'], default: 'open', index: true },
  summary: { type: String, required: true, trim: true, minlength: 5, maxlength: 500 },
  category: { type: String, default: 'operational', maxlength: 80 },
  institution: { type: String, default: null, maxlength: 120 },
  actionTaken: { type: String, default: '', maxlength: 1000 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date
}, { timestamps: true, strict: 'throw' });
operationalIncidentSchema.index({ state: 1, severity: 1, createdAt: -1 });

export const User = mongoose.models.User || model('User', userSchema);
export const MentorProfile = mongoose.models.MentorProfile || model('MentorProfile', mentorProfileSchema);
export const Session = mongoose.models.Session || model('Session', sessionSchema);
export const Conversation = mongoose.models.Conversation || model('Conversation', conversationSchema);
export const Message = mongoose.models.Message || model('Message', messageSchema);
export const Report = mongoose.models.Report || model('Report', reportSchema);
export const UserBlock = mongoose.models.UserBlock || model('UserBlock', blockSchema);
export const Notification = mongoose.models.Notification || model('Notification', notificationSchema);
export const AuditLog = mongoose.models.AuditLog || model('AuditLog', auditSchema);

export const MentorApplication = mongoose.models.MentorApplication || model('MentorApplication', mentorApplicationSchema);
export const MentorRecommendation = mongoose.models.MentorRecommendation || model('MentorRecommendation', mentorRecommendationSchema);
export const ForumCategory = mongoose.models.ForumCategory || model('ForumCategory', forumCategorySchema);
export const ForumPost = mongoose.models.ForumPost || model('ForumPost', forumPostSchema);
export const ForumReply = mongoose.models.ForumReply || model('ForumReply', forumReplySchema);
export const ForumVote = mongoose.models.ForumVote || model('ForumVote', forumVoteSchema);
export const AIUsage = mongoose.models.AIUsage || model('AIUsage', aiUsageSchema);
export const MatchRequest = mongoose.models.MatchRequest || model('MatchRequest', matchRequestSchema);
export const OperationalIncident = mongoose.models.OperationalIncident || model('OperationalIncident', operationalIncidentSchema);
