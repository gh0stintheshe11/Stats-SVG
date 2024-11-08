/**
 * Calculates the k-metric and percentage for each language, including color.
 *
 * @param {object} languages An object where keys are language names and values are objects containing size, count, and color.
 * @returns {array} An array of objects, each containing language name, percentage, size, count, and color, sorted by percentage.
 */
export function calculateLanguagePercentage(languages) {
  const languageMetrics = [];

  // Step 1: Calculate k-metric for each language
  for (const [language, { size, count, color }] of Object.entries(languages)) {
    const k = Math.sqrt(size * count);
    languageMetrics.push({ name: language, k, size, count, color });
  }

  // Step 2: Calculate total k-metric
  const totalK = languageMetrics.reduce((sum, { k }) => sum + k, 0);

  // Step 3: Calculate percentage based on k-metric and sort
  let languagePercentages = languageMetrics.map(({ name, k, color }) => ({
    name: name === 'Jupyter Notebook' ? 'Jupyter' : name,
    percentage: (k / totalK) * 100,
    color
  })).sort((a, b) => b.percentage - a.percentage);

  // Step 4: Keep only top 20 languages
  if (languagePercentages.length > 20) {
    languagePercentages = languagePercentages.slice(0, 20);
  }

  return languagePercentages;
}