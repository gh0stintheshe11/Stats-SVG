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
      rankProgressBar: "#00f0ff"
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
    }
  }

  export default config;