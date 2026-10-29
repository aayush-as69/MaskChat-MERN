import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User, Conversation, Message, UserBlock, MentorApplication } from './models.js';
import { config } from './config.js';
import { observeSocketEvent, timed, elapsed, incrementMetric } from './observability.js';

const blockedWords = [/\b(?:kill yourself|go die)\b/i];
function safeMessage(body) {
  const value = String(body || '').trim();
  if (!value || value.length > 4000) return { ok: false, error: 'Messages must be between 1 and 4000 characters.' };
  if (/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(value) || /\b(?:\+?\d[\d\s().-]{8,}\d)\b/.test(value)) {
    return { ok: false, error: 'For your privacy, do not share email addresses or phone numbers.' };
  }
  if (blockedWords.some((pattern) => pattern.test(value))) return { ok: false, error: 'Please keep messages respectful.' };
  return { ok: true, value };
}

export function attachSocketServer(httpServer) {
  const io = new Server(httpServer, { cors: { origin: config.CLIENT_ORIGIN, credentials: true }, maxHttpBufferSize: 1e5 });
  io.use(async (socket, next) => {
    try {
      if (socket.handshake.headers.origin !== config.CLIENT_ORIGIN) return next(new Error('Invalid request origin'));
      const cookie = socket.handshake.headers.cookie || '';
      const token = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('maskchat_session='))?.split('=').slice(1).join('=');
      if (!token) return next(new Error('Authentication required'));
      const payload = jwt.verify(decodeURIComponent(token), config.COOKIE_SECRET, { issuer: 'maskchat' });
      const user = await User.findById(payload.sub).select('+institutionVerifiedAt');
      if (!user || user.isBanned || (config.NODE_ENV === 'production' && !user.institutionVerifiedAt)) return next(new Error('Authentication required'));
      socket.data.user = { id: String(user._id), alias: user.alias, role: user.role };
      next();
    } catch { next(new Error('Authentication required')); }
  });
  io.on('connection', (socket) => {
    // User-scoped delivery rooms let us re-check current conversation membership before each emit.
    socket.join(`user:${socket.data.user.id}`);
    const messageTimes = [];
    const joinTimes = [];
    socket.on('conversation:join', async ({ conversationId } = {}, ack = () => {}) => {
      const started = timed();
      try {
        const now = Date.now();
        while (joinTimes.length && now - joinTimes[0] > 60_000) joinTimes.shift();
        if (joinTimes.length >= 30) return ack({ error: 'Too many join attempts. Please wait.' });
        joinTimes.push(now);
        if (typeof conversationId !== 'string' || conversationId.length > 100) return ack({ error: 'Invalid conversation' });
        const convo = await Conversation.findOne({ _id: conversationId, members: socket.data.user.id });
        if (!convo) return ack({ error: 'Conversation not found' });
        if (socket.data.user.role === 'mentor' && !await MentorApplication.exists({ applicant: socket.data.user.id, status: 'approved' })) return ack({ error: 'Mentor privileges are not currently approved.' });
        observeSocketEvent('conversation_join', elapsed(started), true); ack({ ok: true });
      } catch { observeSocketEvent('conversation_join', elapsed(started), false); ack({ error: 'Unable to join conversation' }); }
    });
    socket.on('message:send', async (payload = {}, ack = () => {}) => {
      const started = timed();
      try {
        const now = Date.now();
        while (messageTimes.length && now - messageTimes[0] > 10_000) messageTimes.shift();
        if (messageTimes.length >= 20) return ack({ error: 'You are sending messages too quickly. Please pause briefly.' });
        messageTimes.push(now);
        const { conversationId, body, clientMessageId } = payload;
        if (typeof conversationId !== 'string' || typeof clientMessageId !== 'string' || clientMessageId.length > 100) return ack({ error: 'Invalid message payload' });
        const checked = safeMessage(body);
        if (!checked.ok) return ack({ error: checked.error });
        const convo = await Conversation.findOne({ _id: conversationId, members: socket.data.user.id });
        if (!convo) return ack({ error: 'Conversation not found' });
        if (socket.data.user.role === 'mentor' && !await MentorApplication.exists({ applicant: socket.data.user.id, status: 'approved' })) return ack({ error: 'Mentor privileges are not currently approved.' });
        const blocked = await UserBlock.exists({ $or: [
          { blocker: socket.data.user.id, blocked: { $in: convo.members.filter((id) => String(id) !== socket.data.user.id) } },
          { blocked: socket.data.user.id, blocker: { $in: convo.members.filter((id) => String(id) !== socket.data.user.id) } }
        ] });
        if (blocked) return ack({ error: 'Messaging is unavailable because one participant has blocked the other.' });
        const message = await Message.findOneAndUpdate(
          { conversation: convo._id, sender: socket.data.user.id, clientMessageId },
          { $setOnInsert: { conversation: convo._id, sender: socket.data.user.id, senderAlias: socket.data.user.alias, body: checked.value, clientMessageId } },
          { upsert: true, new: true, runValidators: true }
        );
        convo.lastMessageAt = message.createdAt;
        await convo.save();
        const event = {
          id: String(message._id), conversationId, senderId: String(message.sender),
          senderAlias: message.senderAlias, body: message.body, createdAt: message.createdAt,
          clientMessageId: message.clientMessageId
        };
        // Do not broadcast to a stale conversation room: a user removed from a group may still
        // have an old socket subscription. Deliver only to members in the current DB record.
        for (const memberId of convo.members) io.to(`user:${String(memberId)}`).emit('message:new', event);
        incrementMetric('messages_sent'); observeSocketEvent('message_send', elapsed(started), true); ack({ ok: true, messageId: String(message._id) });
      } catch (err) {
        observeSocketEvent('message_send', elapsed(started), false);
        if (err?.code === 11000) return ack({ ok: false, error: 'Duplicate message' });
        ack({ error: 'Message could not be sent' });
      }
    });
    socket.on('conversation:typing', async ({ conversationId, typing } = {}) => {
      if (typeof conversationId !== 'string' || conversationId.length > 100) return;
      try {
        const convo = await Conversation.findOne({ _id: conversationId, members: socket.data.user.id }).select('members');
        if (!convo) return;
        const event = { conversationId, alias: socket.data.user.alias, typing: Boolean(typing) };
        for (const memberId of convo.members) {
          if (String(memberId) !== socket.data.user.id) io.to(`user:${String(memberId)}`).emit('conversation:typing', event);
        }
      } catch { /* Typing indicators are best-effort and must not affect messaging. */ }
    });
  });
  return io;
}
