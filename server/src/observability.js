import { monitorEventLoopDelay, performance } from 'node:perf_hooks';

const windowMs = Number(process.env.OBSERVABILITY_WINDOW_MS || 60000);
const maxSamples = Number(process.env.OBSERVABILITY_MAX_SAMPLES || 10000);
const requests = [];
const socketEvents = [];
const counters = new Map();
const eventLoop = monitorEventLoopDelay({ resolution: 20 });
eventLoop.enable();
function prune(now = Date.now()) {
  const cutoff = now - windowMs;
  while (requests.length && requests[0].at < cutoff) requests.shift();
  while (socketEvents.length && socketEvents[0].at < cutoff) socketEvents.shift();
  if (requests.length > maxSamples) requests.splice(0, requests.length - maxSamples);
  if (socketEvents.length > maxSamples) socketEvents.splice(0, socketEvents.length - maxSamples);
}
export function incrementMetric(name, by = 1) { counters.set(name, (counters.get(name) || 0) + by); }
export function observeHttp({ method, route, status, durationMs }) {
  const now = Date.now(); requests.push({ at: now, method, route, status, durationMs });
  incrementMetric('http_requests_total');
  if (status >= 500) incrementMetric('http_5xx_total'); else if (status >= 400) incrementMetric('http_4xx_total');
  prune(now);
}
export function observeSocketEvent(event, durationMs = 0, ok = true) {
  socketEvents.push({ at: Date.now(), event, durationMs, ok: Boolean(ok) });
  incrementMetric(`socket_${event}_total`); if (!ok) incrementMetric(`socket_${event}_errors_total`); prune();
}
function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return Number(sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))].toFixed(2));
}
export function snapshot() {
  prune(); const durations = requests.map(x => x.durationMs); const total = requests.length;
  const errors = requests.filter(x => x.status >= 500).length; const socketDurations = socketEvents.map(x => x.durationMs); const memory = process.memoryUsage();
  return { windowMs, capturedAt: new Date().toISOString(), http: { requests: total, errors5xx: errors, errorRate5xx: total ? Number((errors / total).toFixed(4)) : 0, status4xx: requests.filter(x => x.status >= 400 && x.status < 500).length, latencyMs: { p50: percentile(durations, 50), p95: percentile(durations, 95), p99: percentile(durations, 99) } }, socket: { events: socketEvents.length, errors: socketEvents.filter(x => !x.ok).length, latencyMs: { p50: percentile(socketDurations, 50), p95: percentile(socketDurations, 95), p99: percentile(socketDurations, 99) } }, process: { uptimeSeconds: Math.round(process.uptime()), rssBytes: memory.rss, heapUsedBytes: memory.heapUsed, heapTotalBytes: memory.heapTotal, eventLoopLagMs: Number((eventLoop.mean / 1e6).toFixed(2)), eventLoopP99Ms: Number((eventLoop.percentile(99) / 1e6).toFixed(2)) }, counters: Object.fromEntries(counters) };
}
export function evaluateAlerts(data = snapshot()) {
  const alerts = []; const errorThreshold = Number(process.env.ERROR_RATE_ALERT || 0.1); const latencyThreshold = Number(process.env.HTTP_P95_ALERT_MS || 1500); const loopThreshold = Number(process.env.EVENT_LOOP_P99_ALERT_MS || 250);
  if (data.http.errorRate5xx >= errorThreshold && data.http.requests >= 10) alerts.push({ type: 'http_error_rate', severity: 'critical', value: data.http.errorRate5xx, threshold: errorThreshold });
  if (data.http.latencyMs.p95 !== null && data.http.latencyMs.p95 >= latencyThreshold) alerts.push({ type: 'http_latency_p95', severity: 'high', value: data.http.latencyMs.p95, threshold: latencyThreshold });
  if (data.process.eventLoopP99Ms >= loopThreshold) alerts.push({ type: 'event_loop_lag', severity: 'high', value: data.process.eventLoopP99Ms, threshold: loopThreshold });
  return alerts;
}
export function timed() { return performance.now(); }
export function elapsed(start) { return Number((performance.now() - start).toFixed(2)); }
export function resetObservabilityForTests() { requests.length = 0; socketEvents.length = 0; counters.clear(); eventLoop.reset(); }
