import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

// Production-mode configuration so the institutional-verification gate is active.
Object.assign(process.env, {
  NODE_ENV: 'production', DEMO_MODE: 'true', ALLOW_DEV_AUTH: 'false', COOKIE_SECURE: 'true',
  COOKIE_SECRET: 'x'.repeat(48), CLIENT_ORIGIN: 'https://app.example.edu', INSTITUTION_DOMAINS: 'example.edu',
  REQUIRE_INSTITUTION_DOMAIN: 'true', MONGODB_URI: 'mongodb+srv://db.example.net/maskchat', PRIVATE_UPLOAD_DIR: '/var/private'
});
const { requireAuth, signSession } = await import('./auth.js');
const { config } = await import('./config.js');
const { User, MentorProfile, MentorApplication } = await import('./models.js');
const { ensureDemoUser } = await import('./demo.js');

const ID = '507f1f77bcf86cd799439011';
function run(token, user) {
  mock.method(User, 'findById', () => ({ select: async () => user }));
  const result = { status: null, called: false };
  const res = { status(code) { result.status = code; return this; }, json() { return this; } };
  return requireAuth({ cookies: { maskchat_session: token } }, res, () => { result.called = true; }).then(() => result);
}
test.afterEach(() => mock.restoreAll());

test('production still rejects unverified real users', async () => {
  const user = { _id: ID, role: 'student', isDemo: false, institutionVerifiedAt: null };
  const r = await run(signSession(user), user);
  assert.equal(r.called, false);
  assert.equal(r.status, 403);
});

test('production accepts a demo user holding a demo token while DEMO_MODE is on', async () => {
  const user = { _id: ID, role: 'student', isDemo: true, institutionVerifiedAt: null };
  const r = await run(signSession(user, { demo: true }), user);
  assert.equal(r.called, true);
});

test('a demo user cannot use a regular (non-demo) session token', async () => {
  const user = { _id: ID, role: 'student', isDemo: true, institutionVerifiedAt: null };
  const r = await run(signSession(user), user);
  assert.equal(r.called, false);
  assert.equal(r.status, 401);
});

test('turning DEMO_MODE off immediately invalidates existing demo sessions', async () => {
  const user = { _id: ID, role: 'student', isDemo: true, institutionVerifiedAt: null };
  const token = signSession(user, { demo: true });
  config.DEMO_MODE = false;
  try {
    const r = await run(token, user);
    assert.equal(r.called, false);
    assert.equal(r.status, 401);
  } finally { config.DEMO_MODE = true; }
});

test('ensureDemoUser creates a sandboxed, password-less demo account and a mentor profile', async () => {
  let created = null; const profileCalls = []; const appCalls = [];
  mock.method(User, 'findOne', async () => null);
  mock.method(User, 'create', async (doc) => { created = doc; return { _id: ID, ...doc }; });
  mock.method(MentorProfile, 'findOneAndUpdate', async (...args) => { profileCalls.push(args); return {}; });
  mock.method(MentorApplication, 'findOneAndUpdate', async (...args) => { appCalls.push(args); return {}; });
  const student = await ensureDemoUser('student');
  assert.equal(student.isDemo, true);
  assert.equal(created.institution, 'Demo University');
  assert.equal(created.role, 'student');
  assert.match(created.passwordHash, /^\$2[aby]\$12\$/);
  assert.equal(profileCalls.length, 0);
  await ensureDemoUser('mentor');
  assert.equal(created.role, 'mentor');
  assert.equal(profileCalls.length, 1);
  assert.equal(profileCalls[0][1].$set.available, true);
  assert.equal(appCalls[0][1].$setOnInsert.status, 'approved');
  assert.equal(await ensureDemoUser('admin'), null);
});

test('ensureDemoUser never adopts a non-demo account that shares the demo email', async () => {
  mock.method(User, 'findOne', async () => ({ _id: ID, isDemo: false, role: 'student' }));
  assert.equal(await ensureDemoUser('student'), null);
});
