const config = {
    svg: {
      width: 1100,
      height: 600
    },
    title: {
      // The title is typed like a command in a terminal: the prompt ">" flickers in, a cursor "_"
      // appears behind it and types the username, blinks once, and goes as if Enter was pressed.
      // Only then does the rest of the card start. In seconds:
      cursor_appears: 1.8, // the prompt has faded in by then
      typing_starts: 2.2,
      typing_interval: 0.06, // per character
      cursor_blink: 0.3 // after the last character the cursor stays on, goes off, and comes on again for this long each; then Enter
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
      ringThickness: 34, // the brackets on both sides of the ring are ringRadius + ringThickness from its center
      progressBarThickness: 28, // how long a lit tick is, from the inner to the outer edge of the ring
      progressSegments: 40, // the ring is divided into this many ticks
      progressSegmentWidth: 0.6, // how much of each tick's slot is tick (the rest is the gap)
      progressSegmentUnlitLength: 0.33, // an unlit tick is this share of a lit one, at the inner edge
      progressSegmentCornerRadius: 2 // rounds the corners of the ticks, in px
    },
    language: {
      ringRadius: 80,
      ringThickness: 34
    },
    contribution_distribution: {
      days_to_show: 60, // best to set to 60 days, if more than 60 days, the chart will be too crowded
      border_color: "#00f0ff",
      bar_color_up: "#32cd32", // a day with at least as many contributions as the day before
      bar_color_down: "#c5003c", // a day with fewer contributions than the day before
      global_display_time_delay: 0.5,
      bar_display_time_delay: 1,
      bar_display_time_interval: 0.02, // each bar starts rising this much later than the one before
      bar_display_time_duration: 0.5, // how long a bar takes to rise from zero to its height
      // Background grid. With 60 days, a column every day and 30 rows make square cells.
      grid_days: 1, // a vertical line every this many days
      grid_rows: 30, // horizontal lines split the chart into this many rows
      grid_opacity: 0.2
    },
    cache: {
      // How long card data counts as fresh after it was fetched (from GitHub etc.). Until then
      // Vercel's CDN answers with the same card, and nothing is fetched again. (Browsers always
      // ask again, so that the card's animation plays from the start on every page view.)
      max_age_seconds: 3600,
      // Older data is still shown right away while fresh data is fetched in the background. A card
      // built from such data is kept by the CDN only this long, so the next view shows the fresh data.
      stale_max_age_seconds: 60,
      // How long old data and old cards may still be shown: while a refresh is running, and when
      // the upstream API or the function fails.
      keep_stale_seconds: 604800
    }
  }

  export default config;