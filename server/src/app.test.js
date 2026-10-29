import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp, publicApplication, adminApplication } from './app.js';

test('public mentor application responses hide internal reviewer notes', () => {
  const application = {
    _id: '507f1f77bcf86cd799439011',
    pathway: 'senior',
    skills: ['Python'],
    evidence: 'Academic experience',
    academicYear: 'third',
    cohortYear: 2024,
    identityStatus: 'verified',
    status: 'eligibility_review',
    recommendationCount: 0,
    reviewerNotes: 'Internal concern: verify the submitted document.',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const publicResponse = publicApplication(application);
  const adminResponse = adminApplication(application);

  assert.equal(
    Object.hasOwn(publicResponse, 'reviewerNotes'),
    false,
    'Public responses must not expose internal reviewer notes'
  );

  assert.equal(
    adminResponse.reviewerNotes,
    'Internal concern: verify the submitted document.',
    'Administrative responses must retain reviewer notes'
  );
});

async function withServer(run) {
  const app = createApp();
  const server = app.listen(0);
  try {
    const address = server.address();
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('health endpoint responds without a database connection', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/v1/health`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, 'ok');
  });
});

test('protected endpoints reject anonymous users', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/v1/mentors`);
    assert.equal(response.status, 401);
  });
});

test('state-changing requests reject missing CSRF token and origin', async () => {
  await withServer(async (base) => {
    const missingToken = await fetch(`${base}/api/v1/auth/logout`, {
      method: 'POST', headers: { Origin: 'http://localhost:5173' }
    });
    assert.equal(missingToken.status, 403);
    assert.match((await missingToken.json()).error, /CSRF/i);

    const wrongOrigin = await fetch(`${base}/api/v1/auth/logout`, {
      method: 'POST', headers: { Origin: 'https://attacker.example', 'X-CSRF-Token': 'x' }
    });
    assert.equal(wrongOrigin.status, 403);
    assert.match((await wrongOrigin.json()).error, /origin/i);
  });
});

test('CSRF endpoint issues a token and state-changing request accepts matching cookie/header', async () => {
  await withServer(async (base) => {
    const tokenResponse = await fetch(`${base}/api/v1/csrf`);
    assert.equal(tokenResponse.status, 200);
    const { csrfToken } = await tokenResponse.json();
    assert.equal(typeof csrfToken, 'string');
    assert.ok(csrfToken.length >= 32);
    const cookie = tokenResponse.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie?.startsWith('maskchat_csrf='));

    const response = await fetch(`${base}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Origin: 'http://localhost:5173', Cookie: cookie, 'X-CSRF-Token': csrfToken }
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  });
});

test('new mentor, forum, and AI surfaces reject anonymous requests', async () => {
  await withServer(async (base) => {
    for (const route of [
      '/api/v1/mentor-applications/me',
      '/api/v1/mentor-applications/recommendable',
      '/api/v1/admin/mentor-applications',
      '/api/v1/forum/categories',
      '/api/v1/forum/posts',
      '/api/v1/matching/queue/me',
      '/api/v1/matching/queue/inbox',
      '/api/v1/group-sessions',
      '/api/v1/admin/ops/metrics',
      '/api/v1/admin/ops/alerts',
      '/api/v1/admin/ops/incidents',
      '/api/v1/admin/ops/pilot-readiness'
    ]) {
      const response = await fetch(`${base}${route}`);
      assert.equal(response.status, 401, `${route} should require authentication`);
    }
  });
});
