import test from 'node:test';
import assert from 'node:assert/strict';
import { rankMentors, scoreMentor } from './matching.js';

const mentor = { user: { institution: 'Campus A' }, available: true, expertise: ['Data Structures'], sessionFormats: ['individual'], ratingAverage: 4.5, ratingCount: 20 };
test('matching ranks expertise fit and explains the reason', () => {
  const result = rankMentors([mentor], { topic: 'Data Structures', institution: 'Campus A', format: 'individual' });
  assert.equal(result.length, 1);
  assert.ok(result[0].score > 10);
  assert.ok(result[0].reasons.includes('Expertise matches your topic'));
});
test('matching excludes unavailable mentors and other institutions', () => {
  assert.equal(scoreMentor({ ...mentor, available: false }, { institution: 'Campus A' }), -Infinity);
  assert.equal(scoreMentor(mentor, { institution: 'Campus B' }), -Infinity);
});

test('matching boosts compatible language and preferred-time windows', () => {
  const flexible = { ...mentor, languages: ['English'], availabilityWindows: ['Weekday evenings'] };
  const result = rankMentors([mentor, flexible], { topic: 'Databases', institution: 'Campus A', format: 'individual', languages: ['English'], preferredTimes: ['Weekday evenings'] });
  assert.equal(result[0].mentor, flexible);
  assert.ok(result[0].reasons.includes('Language preference matches'));
  assert.ok(result[0].reasons.includes('Preferred time matches'));
});
