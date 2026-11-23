// The legend has two columns of 10 entries.
const MAX_LANGUAGES = 20;

/**
 * Calculates the k-metric and percentage for each language, including color.
 *
 * Only the top 20 languages (by k-metric) are kept, and percentages are taken over those,
 * so the language ring always adds up to 100% with no gap.
 *
 * @param {object} languages An object where keys are language names and values are objects containing size, count, and color.
 * @returns {array} An array of objects, each containing language name, percentage and color, sorted by percentage.
 */
export function calculateLanguagePercentage(languages) {
  // Step 1: Calculate k-metric for each language and keep the top ones
  const topLanguages = Object.entries(languages)
    .map(([name, { size, count, color }]) => ({ name, k: Math.sqrt(size * count), color }))
    .filter(({ k }) => k > 0)
    .sort((a, b) => b.k - a.k)
    .slice(0, MAX_LANGUAGES);

  // Step 2: Calculate total k-metric of the languages that will be shown
  const totalK = topLanguages.reduce((sum, { k }) => sum + k, 0);
  if (totalK === 0) return [];

  // Step 3: Calculate percentage based on k-metric
  return topLanguages.map(({ name, k, color }) => ({
    name: name === 'Jupyter Notebook' ? 'Jupyter' : name,
    percentage: (k / totalK) * 100,
    color,
  }));
}
