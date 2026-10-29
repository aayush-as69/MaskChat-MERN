export function scoreMentor(mentor, preferences = {}) {
  const { topic = '', institution = '', format = 'individual' } = preferences;
  if (!mentor?.user || !mentor.available) return -Infinity;
  if (institution && mentor.user.institution !== institution) return -Infinity;
  if (!(mentor.sessionFormats || []).includes(format)) return -Infinity;
  const wanted = String(topic).toLowerCase();
  const expertise = (mentor.expertise || []).map((x) => x.toLowerCase());
  const exact = wanted && expertise.some((x) => x === wanted) ? 50 : 0;
  const partial = wanted && expertise.some((x) => x.includes(wanted) || wanted.includes(x)) ? 20 : 0;
  const wantedLanguages = (preferences.languages || []).map(value => String(value).toLowerCase());
  const mentorLanguages = (mentor.languages || []).map(value => String(value).toLowerCase());
  const languageMatches = wantedLanguages.filter(value => mentorLanguages.includes(value)).length;
  const wantedTimes = (preferences.preferredTimes || []).map(value => String(value).toLowerCase());
  const mentorTimes = (mentor.availabilityWindows || []).map(value => String(value).toLowerCase());
  const timeMatches = wantedTimes.filter(value => mentorTimes.some(window => window.includes(value) || value.includes(window))).length;
  const timeMismatchPenalty = wantedTimes.length && mentorTimes.length && !timeMatches ? 4 : 0;
  return 10 + exact + partial + Math.min(6, languageMatches * 3) + Math.min(8, timeMatches * 4) - timeMismatchPenalty + Math.min(5, mentor.ratingAverage || 0) + Math.min(5, (mentor.ratingCount || 0) / 10);
}
export function rankMentors(mentors, preferences = {}) {
  return mentors.map((mentor) => ({ mentor, score: scoreMentor(mentor, preferences) }))
    .filter((item) => Number.isFinite(item.score))
    .sort((a, b) => b.score - a.score)
    .map(({ mentor, score }) => ({ mentor, score, reasons: matchReasons(mentor, preferences) }));
}
function matchReasons(mentor, preferences = {}) {
  const reasons = [];
  if ((mentor.expertise || []).some((tag) => String(preferences.topic || '').toLowerCase() === tag.toLowerCase())) reasons.push('Expertise matches your topic');
  if (mentor.available) reasons.push('Available for a session');
  if (mentor.user?.institution === preferences.institution) reasons.push('Same institution');
  if ((mentor.sessionFormats || []).includes(preferences.format || 'individual')) reasons.push('Supports your session format');
  const requestedLanguages = (preferences.languages || []).map(value => String(value).toLowerCase());
  if (requestedLanguages.some(value => (mentor.languages || []).some(language => String(language).toLowerCase() === value))) reasons.push('Language preference matches');
  const requestedTimes = (preferences.preferredTimes || []).map(value => String(value).toLowerCase());
  if (requestedTimes.some(value => (mentor.availabilityWindows || []).some(window => String(window).toLowerCase().includes(value) || value.includes(String(window).toLowerCase())))) reasons.push('Preferred time matches');
  return reasons;
}
