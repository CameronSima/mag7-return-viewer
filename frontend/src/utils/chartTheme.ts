/**
 * Plotly color tokens, kept in sync with the CSS design tokens in index.css.
 * Plotly renders to canvas/SVG and can't read CSS variables at layout time, so
 * the chart components import these constants instead of a theme hook.
 */
export const CHART_THEME = {
  text: "#f7f8f8", // --foreground
  grid: "#202124", // --border
  paper: "#0e0f11", // --card
  accent: "#5e6ad2", // --primary
  success: "#4cb782", // --success
  destructive: "#eb5757", // --destructive
  fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
} as const;
