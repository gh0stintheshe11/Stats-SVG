const config = {
    svg: {
      width: 1100,
      height: 600
    },
    colors: {
      icon: "#00f0ff",
      textTitle: "#00f0ff",
      textLabel: "#00f0ff",
      textValue: "#f8e602",
      rankLetter: "#c5003c",
      rankPercentage: "#c5003c",
      rankProgressBar: "#00f0ff",
      // Border of a stat row whose value is above / not above its threshold
      thresholdPass: "#32cd32",
      thresholdFail: "#c5003c"
    },
    rank: {
      ringBgDarkLevel: 30,
      ringRadius: 80,
      ringThickness: 34,
      progressBarThickness: 28
    },
    language: {
      ringRadius: 80,
      ringThickness: 34
    },
    contribution_distribution: {
      days_to_show: 60, // best to set to 60 days, if more than 60 days, the chart will be too crowded
      border_color: "#00f0ff",
      bullish_color: "#32cd32",
      bearish_color: "#c5003c",
      neutral_color: "#f8e602",
      global_display_time_delay: 0.5,
      bar_display_time_delay: 1,
      bar_display_time_interval: 0.02,
      bar_display_time_duration: 0.2
    },
    cache: {
      // How long card data counts as fresh after it was fetched (from GitHub etc.). Until then
      // browsers, GitHub's image proxy and the Vercel CDN reuse the card, and nothing is fetched again.
      max_age_seconds: 3600,
      // Older data is still shown right away while fresh data is fetched in the background. A card
      // built from such data is cached only this long, so the next view shows the fresh data.
      stale_max_age_seconds: 60,
      // How long old data and old cards may still be shown: while a refresh is running, and when
      // the upstream API or the function fails.
      keep_stale_seconds: 604800
    }
  }

  export default config;