import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

// DEMO_MODE is read once at import time, so enable it before loading the app modules.
process.env.DEMO_MODE = 'true';
process.env.DEMO_SESSION_MINUTES = '30';
const { createApp } = await import('./app.js');
const { blockDemo, signSession } = await import('./auth.js');
const { config } = await import('./config.js');
const { DEMO_ACCOUNTS } = await import('./demo.js');

async function withServer(run) {
  const server = createApp().listen(0);
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

async function csrfHeaders(base) {
  const res = await fetch(`${base}/api/v1/csrf`);
  const { csrfToken } = await res.json();
  const cookie = res.headers.get('set-cookie').split(';')[0];
  return { 'Content-Type': 'application/json', Origin: config.CLIENT_ORIGIN, Cookie: cookie, 'X-CSRF-Token': csrfToken };
}

test('demo config lists only the student and mentor accounts when DEMO_MODE is on', async () => {
  await withServer(async (base) => {
    const body = await (await fetch(`${base}/api/v1/auth/demo`)).json();
    assert.equal(body.enabled, true);
    assert.equal(body.sessionMinutes, 30);
    assert.deepEqual(body.accounts.map((a) => a.key).sort(), ['mentor', 'student']);
    assert.deepEqual(Object.keys(DEMO_ACCOUNTS).sort(), ['mentor', 'student']);
  });
});

test('demo sign-in rejects privileged or unknown roles before touching the database', async () => {
  await withServer(async (base) => {
    const headers = await csrfHeaders(base);
    for (const role of ['admin', 'moderator', 'institution_admin', '', undefined]) {
      const res = await fetch(`${base}/api/v1/auth/demo`, { method: 'POST', headers, body: JSON.stringify({ role }) });
      assert.equal(res.status, 400, `role ${String(role)} must be rejected`);
      assert.ok(!(res.headers.get('set-cookie') || '').includes('maskchat_session'), 'no session cookie may be issued');
    }
  });
});

test('demo sign-in still requires the CSRF token and allowed origin', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/v1/auth/demo`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: config.CLIENT_ORIGIN }, body: JSON.stringify({ role: 'student' }) });
    assert.equal(res.status, 403);
  });
});

test('demo session tokens carry a demo claim and a short expiry', () => {
  const user = { _id: '507f1f77bcf86cd799439011', role: 'student' };
  const demoPayload = jwt.verify(signSession(user, { demo: true }), config.COOKIE_SECRET, { issuer: 'maskchat' });
  assert.equal(demoPayload.demo, true);
  assert.equal(demoPayload.exp - demoPayload.iat, 30 * 60);
  const normalPayload = jwt.verify(signSession(user), config.COOKIE_SECRET, { issuer: 'maskchat' });
  assert.equal(normalPayload.demo, undefined);
  assert.equal(normalPayload.exp - normalPayload.iat, 12 * 60 * 60);
});

test('blockDemo stops demo users and lets everyone else through', () => {
  let status = null; let body = null; let called = false;
  const res = { status(code) { status = code; return this; }, json(payload) { body = payload; return this; } };
  blockDemo({ user: { isDemo: true } }, res, () => { called = true; });
  assert.equal(status, 403);
  assert.match(body.error, /demo/i);
  assert.equal(called, false);
  blockDemo({ user: { isDemo: false } }, res, () => { called = true; });
  assert.equal(called, true);
});
