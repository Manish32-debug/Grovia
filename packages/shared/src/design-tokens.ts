/**
 * Grovia design tokens — canonical values.
 *
 * apps/web/src/styles/index.css mirrors this block inside Tailwind's `@theme`.
 * Consume THIS file from TypeScript (Recharts series colours, email templates,
 * canvas/QR rendering); consume the CSS variables from markup.
 */

export const color = {
  ink: '#0B1220',
  inkSoft: '#1A2432',
  canvas: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceSunken: '#EFF1F4',
  line: '#E8EAEE',
  grove50: '#E7F7EE',
  grove500: '#2FBF6B',
  grove600: '#27A85D',
  sand100: '#EDE7DA',
  text1: '#0B1220',
  text2: '#5A6474',
  text3: '#8B94A3',
  danger: '#E23D3D',
  amber: '#E0A415',
} as const;

/** Ordered palette for charts. Green stays first — it is the brand's state colour. */
export const chartPalette = [
  color.grove500,
  color.ink,
  color.amber,
  color.text3,
  color.danger,
  color.grove600,
] as const;

export const radius = {
  tile: '14px',
  card: '20px',
  sheet: '28px',
  pill: '999px',
} as const;

export const shadow = {
  card: '0 1px 2px rgba(11,18,32,.04), 0 10px 28px -12px rgba(11,18,32,.12)',
  lifted: '0 2px 4px rgba(11,18,32,.05), 0 18px 40px -14px rgba(11,18,32,.18)',
} as const;

export const font = {
  sans: "'Plus Jakarta Sans Variable', ui-sans-serif, system-ui, sans-serif",
} as const;

/** Weight-driven scale: [size, lineHeight, weight, letterSpacing] */
export const type = {
  display: ['28px', '34px', 800, '-0.02em'],
  h2: ['20px', '26px', 700, '-0.01em'],
  h3: ['17px', '22px', 700, '-0.01em'],
  body: ['15px', '22px', 400, '0'],
  caption: ['13px', '18px', 500, '0'],
  price: ['17px', '22px', 700, '-0.01em'],
} as const;

export const layout = {
  gutter: '20px',
  maxContent: '1200px',
  bottomNavHeight: '64px',
} as const;
