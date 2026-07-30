import type { Config } from 'tailwindcss'
import { FONT_MONO, FONT_SANS } from './src/design/type'
import {
  LAYOUT,
  OPPORTUNITY_LEVELS,
  OPPORTUNITY_SCALE,
  PRODUCTS,
  PRODUCT_ORDER,
  RADIUS,
  SEMANTIC,
  SURFACE,
  TYPOGRAPHY,
  type OpportunityLevel,
  type ProductId,
} from './src/design/tokens'

const productColors = Object.fromEntries(
  PRODUCT_ORDER.map((id) => [id, PRODUCTS[id].accent]),
) as Record<ProductId, string>

const opportunityColors = Object.fromEntries(
  OPPORTUNITY_LEVELS.map((level) => [level, OPPORTUNITY_SCALE[level].color]),
) as Record<OpportunityLevel, string>

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ...SEMANTIC,
        ...productColors,

        /** Identidade do produto ativo, trocada por `ProductTheme`. */
        product: 'var(--product-accent)',

        surface: SURFACE,
        opportunity: opportunityColors,
      },
      borderRadius: {
        card: RADIUS.card,
        control: RADIUS.control,
      },
      spacing: {
        sidebar: LAYOUT.sidebarWidth,
      },
      fontSize: {
        /* Papéis novos da escala PD1 (src/design/type.ts). */
        micro: ['11px', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '0.06em' }],
        label: ['12px', { lineHeight: '1.3' }],
        body: ['13px', { lineHeight: '1.45' }],
        'body-lg': ['14px', { lineHeight: '1.5' }],
        metric: ['28px', { lineHeight: '1.1', fontWeight: '600', letterSpacing: '-0.02em' }],
        'metric-lg': ['32px', { lineHeight: '1.1', fontWeight: '600', letterSpacing: '-0.02em' }],
        section: ['15px', { lineHeight: '1.3', fontWeight: '600' }],
        screen: ['18px', { lineHeight: '1.25', fontWeight: '600', letterSpacing: '-0.01em' }],
        /* Aliases legados das telas P2–P12, mapeados para a mesma escala. */
        kpi: [TYPOGRAPHY.kpi, { lineHeight: '1.1', fontWeight: '600', letterSpacing: '-0.02em' }],
        'kpi-lg': [
          TYPOGRAPHY.kpiLarge,
          { lineHeight: '1.1', fontWeight: '600', letterSpacing: '-0.02em' },
        ],
        delta: [TYPOGRAPHY.delta, { lineHeight: '1.3' }],
        'delta-lg': [TYPOGRAPHY.deltaLarge, { lineHeight: '1.3' }],
      },
      fontFamily: {
        sans: FONT_SANS.split(',').map((f) => f.trim().replace(/^'|'$/g, '')),
        mono: FONT_MONO.split(',').map((f) => f.trim().replace(/^'|'$/g, '')),
      },
    },
  },
  plugins: [],
} satisfies Config
