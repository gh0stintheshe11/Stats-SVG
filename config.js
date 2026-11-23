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
      // How long browsers, GitHub's image proxy and the Vercel CDN may reuse a response.
      // Repeat views are then served without calling the GitHub API again.
      max_age_seconds: 3600,
      // After max_age, the CDN may keep serving the old copy this long while it refreshes in the background.
      stale_while_revalidate_seconds: 86400
    }
  }

  export default config;