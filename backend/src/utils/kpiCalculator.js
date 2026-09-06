const { KPI_DIRECTION } = require('../constants/kpi');

/**
 * KPI achievement & weighted score formulas.
 *
 * These are intentionally kept simple and transparent (per project
 * requirement #14: "easy to explain in a university viva") rather than
 * hidden behind generic/abstracted math.
 *
 *   HIGHER_IS_BETTER:  achievement% = (actual / target) * 100
 *   LOWER_IS_BETTER:   achievement% = (target / actual) * 100
 *
 *   weighted_score = achievement% * (weight / 100)
 *
 * Achievement is capped at a configurable ceiling (default 150%) so a
 * single wildly over-performing KPI cannot dominate an employee's overall
 * score; this cap is applied to the *achievement percentage*, not to the
 * raw actual value.
 */

const DEFAULT_ACHIEVEMENT_CAP = 150;

/**
 * Calculates achievement percentage for a single KPI measurement.
 *
 * Zero-value handling:
 * - If target is 0 or missing, achievement cannot be meaningfully computed
 *   as a ratio, so we return 0 (HIGHER_IS_BETTER) or 100 (LOWER_IS_BETTER,
 *   since "no target to exceed" is treated as fully met) — this keeps the
 *   result deterministic instead of throwing/NaN/Infinity.
 * - If actual is 0:
 *     - HIGHER_IS_BETTER -> 0% (nothing achieved)
 *     - LOWER_IS_BETTER  -> capped at the ceiling (division by zero would
 *       otherwise be Infinity; a lower-is-better metric hitting exactly
 *       zero, e.g. zero defects, is the best possible outcome)
 */
function calculateAchievementPercentage({
  actualValue,
  targetValue,
  direction,
  cap = DEFAULT_ACHIEVEMENT_CAP,
}) {
  const actual = Number(actualValue) || 0;
  const target = Number(targetValue) || 0;

  let achievement;

  if (direction === KPI_DIRECTION.LOWER_IS_BETTER) {
    if (actual === 0) {
      achievement = cap; // best possible outcome (e.g. zero defects)
    } else if (target === 0) {
      achievement = 100; // no target set to be "worse than" - treat as met
    } else {
      achievement = (target / actual) * 100;
    }
  } else {
    // HIGHER_IS_BETTER (default)
    if (target === 0) {
      achievement = 0;
    } else {
      achievement = (actual / target) * 100;
    }
  }

  achievement = Math.max(0, achievement);
  achievement = Math.min(achievement, cap);

  return Math.round(achievement * 100) / 100; // 2dp
}

/**
 * weighted_score = achievement_percentage * weight / 100
 * `weight` is expressed as a percentage point value (e.g. 25 for 25%).
 */
function calculateWeightedScore({ achievementPercentage, weight }) {
  const score = (Number(achievementPercentage) || 0) * (Number(weight) || 0) / 100;
  return Math.round(score * 100) / 100;
}

/**
 * Convenience wrapper combining both steps for one KPI measurement.
 */
function calculateKpiResult({ actualValue, targetValue, direction, weight, cap }) {
  const achievementPercentage = calculateAchievementPercentage({
    actualValue,
    targetValue,
    direction,
    cap,
  });
  const weightedScore = calculateWeightedScore({ achievementPercentage, weight });
  return { achievementPercentage, weightedScore };
}

/**
 * Sums weighted scores across a set of KPI results to produce an overall
 * KPI score for an employee/evaluation. Also validates that the supplied
 * weights sum to (approximately) 100, as required by the spec, and
 * returns a warning flag rather than throwing, so callers can decide how
 * strict to be (e.g. UI warning vs hard validation error).
 */
function aggregateKpiScore(results) {
  const totalWeight = results.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
  const totalWeightedScore = results.reduce(
    (sum, r) => sum + (Number(r.weightedScore) || 0),
    0
  );
  const weightsValid = Math.abs(totalWeight - 100) < 0.5; // tolerate rounding

  return {
    overallKpiScore: Math.round(totalWeightedScore * 100) / 100,
    totalWeight,
    weightsValid,
  };
}

/**
 * Maps a final numeric score (0-100) to a rating using rating-scale rows
 * pulled from the database (performance_rating_scales), NOT hardcoded
 * thresholds, per the spec. `scales` must be sorted descending by min_score.
 */
function resolveRating(score, scales) {
  const sorted = [...scales].sort((a, b) => b.min_score - a.min_score);
  const match = sorted.find((s) => score >= s.min_score && score <= s.max_score);
  return match || null;
}

module.exports = {
  DEFAULT_ACHIEVEMENT_CAP,
  calculateAchievementPercentage,
  calculateWeightedScore,
  calculateKpiResult,
  aggregateKpiScore,
  resolveRating,
};