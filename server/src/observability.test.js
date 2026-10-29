import test from 'node:test';
import assert from 'node:assert/strict';
import { observeHttp, observeSocketEvent, snapshot, evaluateAlerts, resetObservabilityForTests } from './observability.js';

test('observability records request, socket, latency, and process metrics', () => {
  resetObservabilityForTests();
  observeHttp({ method: 'GET', route: '/health', status: 200, durationMs: 12 });
  observeHttp({ method: 'POST', route: '/api/test', status: 503, durationMs: 1800 });
  observeSocketEvent('message_send', 30, true);
  const data = snapshot();
  assert.equal(data.http.requests, 2);
  assert.equal(data.http.errors5xx, 1);
  assert.equal(data.socket.events, 1);
  assert.equal(data.counters.http_requests_total, 2);
  assert.ok(data.process.rssBytes > 0);
});

test('alert evaluation triggers only after request volume threshold', () => {
  resetObservabilityForTests();
  for (let i = 0; i < 10; i++) observeHttp({ method: 'GET', route: '/x', status: i < 2 ? 500 : 200, durationMs: 2000 });
  const alerts = evaluateAlerts(snapshot());
  assert.ok(alerts.some(a => a.type === 'http_error_rate'));
  assert.ok(alerts.some(a => a.type === 'http_latency_p95'));
});
