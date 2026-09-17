export const CATEGORY_WEIGHTS = {
  crawlability: 18,
  onPage: 15,
  content: 10,
  links: 10,
  media: 8,
  schema: 10,
  performance: 8,
  security: 8,
  international: 5,
  aiSearch: 8
};

const severityPenalty = { critical: 16, high: 10, medium: 5, low: 2, info: 0 };

export function calculateScores(issues) {
  const byCategory = {};
  for (const category of Object.keys(CATEGORY_WEIGHTS)) byCategory[category] = 100;

  for (const issue of issues) {
    if (!Object.prototype.hasOwnProperty.call(byCategory, issue.category)) continue;
    byCategory[issue.category] = Math.max(0, byCategory[issue.category] - severityPenalty[issue.severity]);
  }

  const overall = Math.round(
    Object.entries(CATEGORY_WEIGHTS).reduce(
      (sum, [category, weight]) => sum + byCategory[category] * (weight / 100),
      0
    )
  );

  return { overall, categories: byCategory };
}
