/**
 * Calculates the k-metric and percentage for each language.
 *
 * @param {object} languages An object where keys are language names and values are objects containing size and count.
 * @returns {object} An object with language names as keys and their percentage as values.
 */
function calculateLanguagePercentage(languages) {
    const languageMetrics = {};

    // Step 1: Calculate k-metric for each language
    for (const [language, { size, count }] of Object.entries(languages)) {
        const k = Math.sqrt(size * count);
        languageMetrics[language] = { k, size, count };
    }

    // Step 2: Calculate total k-metric
    const totalK = Object.values(languageMetrics).reduce((sum, { k }) => sum + k, 0);

    // Step 3: Calculate percentage based on k-metric
    const languagePercentages = {};
    for (const [language, { k }] of Object.entries(languageMetrics)) {
        languagePercentages[language] = (k / totalK) * 100;
    }

    return languagePercentages;
}

module.exports = { calculateLanguagePercentage };