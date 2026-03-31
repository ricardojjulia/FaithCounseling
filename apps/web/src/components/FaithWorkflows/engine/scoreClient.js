/**
 * Client Urgency Scorer
 *
 * Computes a 0–100 urgency score and level from client workflow data.
 * This function runs AFTER the rules engine has produced recommendations.
 *
 * Score breakdown:
 *   +40 PHQ-9 severe (≥20)
 *   +35 PHQ-9 item 9 suicidal ideation (≥2)
 *   +25 PCL-5 ≥51
 *   +20 Consecutive no-shows (≥2 high-touchpoint, ≥3 others)
 *   +15 PHQ-9 worsening trend
 *   +12 No safety plan (when SI present)
 *   +10 No active treatment plan
 *   +8  Stale treatment plan (>90 days)
 *   +5  per safety recommendation (max 20)
 *   +2  per non-safety recommendation (max 10)
 *   → clamped to 0–100
 *
 * Urgency levels:
 *   70–100 → critical
 *   40–69  → high
 *   20–39  → moderate
 *   0–19   → routine
 */

import {
  getLatestAssessment,
  getScoreHistory,
  isWorseningTrend,
  consecutiveNoShows,
} from './utils.js';

/**
 * @param {import('./types.js').ClientWorkflowData} data
 * @param {import('./types.js').Recommendation[]} recommendations
 * @returns {{ urgencyScore: number, urgencyLevel: import('./types.js').UrgencyLevel, topReasonChips: string[], diagnosisSummary: string, trend: import('./types.js').TrendDirection }}
 */
export function scoreClient(data, recommendations) {
  let score = 0;
  const reasons = [];

  const phq9 = getLatestAssessment(data.assessments, 'PHQ-9');
  const pcl5 = getLatestAssessment(data.assessments, 'PCL-5');
  const phq9History = getScoreHistory(data.assessments, 'PHQ-9').map((h) => h.score);
  const noShows = consecutiveNoShows(data.appointments);
  const isHTP = Boolean(data.client?.highTouchpoint);

  // PHQ-9 severe
  if (phq9?.score >= 20) {
    score += 40;
    reasons.push('PHQ-9 severe');
  }

  // Suicidal ideation
  if (phq9?.item9Score >= 2) {
    score += 35;
    reasons.push('SI reported');
  }

  // PCL-5 crisis
  if (pcl5?.score >= 51) {
    score += 25;
    reasons.push('PCL-5 elevated');
  }

  // Consecutive no-shows
  const noShowThreshold = isHTP ? 2 : 3;
  if (noShows >= noShowThreshold) {
    score += 20;
    reasons.push(`${noShows} no-shows`);
  }

  // PHQ-9 worsening
  if (phq9History.length >= 2 && isWorseningTrend(phq9History.slice(-3))) {
    score += 15;
    reasons.push('PHQ-9 worsening');
  }

  // No treatment plan
  if (!data.treatmentPlan || !['active', 'draft'].includes(data.treatmentPlan?.status ?? '')) {
    score += 10;
    reasons.push('No treatment plan');
  }

  // Safety recs
  const safetyRecs = recommendations.filter((r) => r.category === 'safety');
  score += Math.min(safetyRecs.length * 5, 20);

  // Other recs
  const otherRecs = recommendations.filter((r) => r.category !== 'safety');
  score += Math.min(otherRecs.length * 2, 10);

  // Clamp
  score = Math.max(0, Math.min(100, score));

  const urgencyLevel = score >= 70 ? 'critical'
    : score >= 40 ? 'high'
    : score >= 20 ? 'moderate'
    : 'routine';

  // Top 3 chips from reasons
  const topReasonChips = reasons.slice(0, 3);

  // Diagnosis summary
  const diagnoses = data.diagnoses ?? [];
  const diagnosisSummary = diagnoses.length > 0
    ? diagnoses.map((dx) => dx.code ?? dx.description?.split(',')[0] ?? '').filter(Boolean).join(', ')
    : '';

  // Trend from PHQ-9
  let trend = 'unknown';
  if (phq9History.length >= 2) {
    if (isWorseningTrend(phq9History.slice(-3))) trend = 'declining';
    else {
      const improving = phq9History.slice(-3).every((v, i, arr) => i === 0 || v <= arr[i - 1]);
      const strictlyLower = phq9History[phq9History.length - 1] < phq9History[phq9History.length - 2];
      trend = (improving && strictlyLower) ? 'improving' : 'stable';
    }
  }

  return { urgencyScore: score, urgencyLevel, topReasonChips, diagnosisSummary, trend };
}
