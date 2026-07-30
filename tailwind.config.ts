import type { Config } from 'tailwindcss'
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
        kpi: [TYPOGRAPHY.kpi, { lineHeight: '1.1', fontWeight: '600', letterSpacing: '-0.02em' }],
        'kpi-lg': [
          TYPOGRAPHY.kpiLarge,
          { lineHeight: '1.1', fontWeight: '600', letterSpacing: '-0.02em' },
        ],
        delta: [TYPOGRAPHY.delta, { lineHeight: '1.3' }],
        'delta-lg': [TYPOGRAPHY.deltaLarge, { lineHeight: '1.3' }],
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
