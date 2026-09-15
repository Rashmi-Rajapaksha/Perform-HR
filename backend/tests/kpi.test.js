const {
  calculateAchievementPercentage,
  calculateWeightedScore,
  aggregateKpiScore,
  resolveRating,
} = require('../src/utils/kpiCalculator');

describe('kpiCalculator - achievement percentage', () => {
  test('HIGHER_IS_BETTER: actual meets target exactly -> 100%', () => {
    const result = calculateAchievementPercentage({ actualValue: 100, targetValue: 100, direction: 'HIGHER_IS_BETTER' });
    expect(result).toBe(100);
  });

  test('HIGHER_IS_BETTER: actual below target -> proportional %', () => {
    const result = calculateAchievementPercentage({ actualValue: 80, targetValue: 100, direction: 'HIGHER_IS_BETTER' });
    expect(result).toBe(80);
  });

  test('HIGHER_IS_BETTER: actual is zero -> 0%', () => {
    const result = calculateAchievementPercentage({ actualValue: 0, targetValue: 100, direction: 'HIGHER_IS_BETTER' });
    expect(result).toBe(0);
  });

  test('HIGHER_IS_BETTER: target is zero -> 0% (avoids division by zero)', () => {
    const result = calculateAchievementPercentage({ actualValue: 50, targetValue: 0, direction: 'HIGHER_IS_BETTER' });
    expect(result).toBe(0);
  });

  test('LOWER_IS_BETTER: actual below target -> >100%, capped', () => {
    const result = calculateAchievementPercentage({ actualValue: 1, targetValue: 2, direction: 'LOWER_IS_BETTER' });
    expect(result).toBe(150); // (2/1)*100 = 200, capped at default 150
  });

  test('LOWER_IS_BETTER: actual is zero (e.g. zero defects) -> capped best score', () => {
    const result = calculateAchievementPercentage({ actualValue: 0, targetValue: 2, direction: 'LOWER_IS_BETTER' });
    expect(result).toBe(150);
  });

  test('LOWER_IS_BETTER: actual exceeds target -> proportionally penalized', () => {
    const result = calculateAchievementPercentage({ actualValue: 4, targetValue: 2, direction: 'LOWER_IS_BETTER' });
    expect(result).toBe(50); // (2/4)*100 = 50
  });

  test('achievement is never negative', () => {
    const result = calculateAchievementPercentage({ actualValue: -10, targetValue: 100, direction: 'HIGHER_IS_BETTER' });
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

describe('kpiCalculator - weighted score', () => {
  test('weighted score = achievement * weight / 100', () => {
    const result = calculateWeightedScore({ achievementPercentage: 80, weight: 25 });
    expect(result).toBe(20);
  });

  test('zero weight yields zero weighted score', () => {
    const result = calculateWeightedScore({ achievementPercentage: 95, weight: 0 });
    expect(result).toBe(0);
  });
});

describe('kpiCalculator - aggregateKpiScore', () => {
  test('sums weighted scores and validates weights total ~100', () => {
    const results = [
      { weight: 30, weightedScore: 27 },
      { weight: 30, weightedScore: 24 },
      { weight: 40, weightedScore: 38 },
    ];
    const agg = aggregateKpiScore(results);
    expect(agg.totalWeight).toBe(100);
    expect(agg.weightsValid).toBe(true);
    expect(agg.overallKpiScore).toBe(89);
  });

  test('flags invalid weight totals', () => {
    const results = [{ weight: 40, weightedScore: 40 }, { weight: 40, weightedScore: 40 }];
    const agg = aggregateKpiScore(results);
    expect(agg.weightsValid).toBe(false);
  });
});

describe('kpiCalculator - resolveRating', () => {
  const scales = [
    { id: 1, min_score: 90, max_score: 100, rating_label: 'Outstanding' },
    { id: 2, min_score: 80, max_score: 89.99, rating_label: 'Very Good' },
    { id: 3, min_score: 70, max_score: 79.99, rating_label: 'Good' },
    { id: 4, min_score: 60, max_score: 69.99, rating_label: 'Satisfactory' },
    { id: 5, min_score: 0, max_score: 59.99, rating_label: 'Needs Improvement' },
  ];

  test.each([
    [95, 'Outstanding'],
    [85, 'Very Good'],
    [75, 'Good'],
    [65, 'Satisfactory'],
    [40, 'Needs Improvement'],
  ])('score %d resolves to %s', (score, expectedLabel) => {
    expect(resolveRating(score, scales).rating_label).toBe(expectedLabel);
  });
});
