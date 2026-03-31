/**
 * Shared utility functions for the Faithful Workflows rules engine.
 * Pure functions — no side effects, no imports from React.
 */

/**
 * Returns the most recent assessment matching the given inventory name.
 * @param {Array} assessments
 * @param {string} name — e.g. 'PHQ-9'
 */
export function getLatestAssessment(assessments, name) {
  if (!Array.isArray(assessments)) return null;
  const matching = assessments
    .filter((a) => (a.inventoryName ?? a.title ?? '').includes(name) && (a.scoredAt || a.completedAt))
    .sort((a, b) => new Date(b.scoredAt ?? b.completedAt) - new Date(a.scoredAt ?? a.completedAt));
  return matching[0] ?? null;
}

/**
 * Returns the numeric score for the most recent matching assessment, or null.
 * @param {Array} assessments
 * @param {string} name
 * @returns {number|null}
 */
export function getLatestAssessmentScore(assessments, name) {
  const a = getLatestAssessment(assessments, name);
  return a?.score ?? null;
}

/**
 * Returns all assessments matching the given name, sorted oldest-first.
 * @param {Array} assessments
 * @param {string} name
 * @returns {Array}
 */
export function getScoreHistory(assessments, name) {
  if (!Array.isArray(assessments)) return [];
  return assessments
    .filter((a) => (a.inventoryName ?? a.title ?? '').includes(name) && a.score != null && (a.scoredAt || a.completedAt))
    .sort((a, b) => new Date(a.scoredAt ?? a.completedAt) - new Date(b.scoredAt ?? b.completedAt));
}

/**
 * Returns true if an array of scores is consistently increasing (worsening).
 * Requires at least 2 values. All consecutive pairs must be non-decreasing,
 * and at least one pair must strictly increase.
 * @param {number[]} scores — oldest first
 * @returns {boolean}
 */
export function isWorseningTrend(scores) {
  if (scores.length < 2) return false;
  let strictlyIncreased = false;
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] < scores[i - 1]) return false;
    if (scores[i] > scores[i - 1]) strictlyIncreased = true;
  }
  return strictlyIncreased;
}

/**
 * Returns true if an array of scores is consistently decreasing (improving).
 * @param {number[]} scores — oldest first
 * @returns {boolean}
 */
export function isImprovingTrend(scores) {
  if (scores.length < 2) return false;
  let strictlyDecreased = false;
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > scores[i - 1]) return false;
    if (scores[i] < scores[i - 1]) strictlyDecreased = true;
  }
  return strictlyDecreased;
}

/**
 * Determines the overall score trend direction from a score history array.
 * @param {number[]} scores — oldest first
 * @returns {'improving'|'stable'|'declining'|'unknown'}
 */
export function scoreTrend(scores) {
  if (!scores || scores.length < 2) return 'unknown';
  if (isImprovingTrend(scores)) return 'improving';
  if (isWorseningTrend(scores)) return 'declining';
  return 'stable';
}

/**
 * Returns the number of consecutive no-show appointments at the end of the
 * appointments array (most recent appointments).
 * @param {Array} appointments
 * @returns {number}
 */
export function consecutiveNoShows(appointments) {
  if (!Array.isArray(appointments) || appointments.length === 0) return 0;
  const past = appointments
    .filter((a) => {
      const at = new Date(a.startsAt ?? a.scheduledAt ?? 0);
      return at <= new Date();
    })
    .sort((a, b) => new Date(b.startsAt ?? b.scheduledAt) - new Date(a.startsAt ?? a.scheduledAt));

  let count = 0;
  for (const appt of past) {
    if (appt.status === 'no_show') {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Returns the number of days since a given ISO date string.
 * Returns Infinity if date is invalid or null.
 * @param {string|null} dateStr
 * @returns {number}
 */
export function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return Infinity;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Returns the most recent date a client was "seen" (last completed appointment).
 * @param {Array} appointments
 * @returns {string|null} ISO date string or null
 */
export function lastSeenDate(appointments) {
  if (!Array.isArray(appointments)) return null;
  const completed = appointments
    .filter((a) => a.status === 'completed')
    .sort((a, b) => new Date(b.startsAt ?? b.scheduledAt) - new Date(a.startsAt ?? a.scheduledAt));
  const appt = completed[0];
  if (!appt) return null;
  return appt.startsAt ?? appt.scheduledAt ?? null;
}

/**
 * Returns the progress notes for the last N completed sessions (by appointment).
 * @param {Array} appointments
 * @param {Array} notes
 * @param {number} n
 * @returns {Array} notes (may have undefined entries if no note for that session)
 */
export function lastNCompletedSessions(appointments, notes, n) {
  if (!Array.isArray(appointments) || !Array.isArray(notes)) return [];
  const completed = appointments
    .filter((a) => a.status === 'completed')
    .sort((a, b) => new Date(b.startsAt ?? b.scheduledAt) - new Date(a.startsAt ?? a.scheduledAt))
    .slice(0, n);

  return completed.map((appt) =>
    notes.find((note) => note.appointmentId === appt.id) ?? null,
  );
}

/**
 * Compute the client-level trend from PHQ-9 score history.
 * @param {Array} assessments
 * @returns {'improving'|'stable'|'declining'|'unknown'}
 */
export function computeClientTrend(assessments) {
  const history = getScoreHistory(assessments, 'PHQ-9').map((h) => h.score);
  return scoreTrend(history);
}

/**
 * Format a relative date label (e.g. "3 days ago", "today").
 * @param {string|null} dateStr
 * @returns {string}
 */
export function formatRelativeDate(dateStr) {
  if (!dateStr) return 'never';
  const days = daysSince(dateStr);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
