/**
 * Design tokens da plataforma.
 *
 * Duas famílias de cor que nunca se misturam:
 *
 * - **Semântica de dado** — pertence ao número. Verde é resultado positivo,
 *   vermelho é negativo, âmbar é atenção, cinza é neutro.
 * - **Identidade de produto** — pertence ao chrome. Sidebar, header, botão
 *   primário, badge. Nunca entra em série de dado.
 *
 * A identidade é publicada como custom property (`--product-accent`), então o
 * mesmo botão primário assume a cor do produto ativo sem receber prop.
 */

export const SEMANTIC = {
  positive: '#16A34A',
  negative: '#DC2626',
  attention: '#F59E0B',
  neutral: '#64748B',
} as const

export type SemanticTone = keyof typeof SEMANTIC

export function semanticColor(tone: SemanticTone): string {
  return SEMANTIC[tone]
}

/**
 * Tom de uma variação numérica. `inverted` cobre métricas em que cair é bom —
 * ruptura, devolução, custo, prazo.
 */
export function toneForDelta(delta: number, options?: { inverted?: boolean }): SemanticTone {
  if (delta === 0) return 'neutral'
  const favorable = options?.inverted === true ? delta < 0 : delta > 0
  return favorable ? 'positive' : 'negative'
}

export type ProductId = 'hub' | 'gtm' | 'rgm' | 'ag'

export type ProductIdentity = {
  readonly id: ProductId
  readonly name: string
  readonly shortName: string
  readonly accent: string
}

export const PRODUCTS: Record<ProductId, ProductIdentity> = {
  hub: {
    id: 'hub',
    name: 'HUB Inteligência de Mercado',
    shortName: 'HUB',
    accent: '#1E4FD8',
  },
  gtm: {
    id: 'gtm',
    name: 'GTM',
    shortName: 'GTM',
    accent: '#0F766E',
  },
  rgm: {
    id: 'rgm',
    name: 'RGM Genéricos',
    shortName: 'RGM',
    accent: '#7C3AED',
  },
  ag: {
    id: 'ag',
    name: 'Amostra Grátis',
    shortName: 'AG',
    accent: '#EA7317',
  },
}

export const PRODUCT_ORDER: readonly ProductId[] = ['hub', 'gtm', 'rgm', 'ag']

/**
 * Escala de oportunidade do mapa, do menor ao maior potencial.
 *
 * Rampa sequencial de matiz única, ancorada no verde semântico no nível máximo:
 * a leitura do mapa é de intensidade, não de categoria.
 */
export type OpportunityLevel = 1 | 2 | 3 | 4 | 5

export const OPPORTUNITY_LEVELS: readonly OpportunityLevel[] = [1, 2, 3, 4, 5]

export const OPPORTUNITY_SCALE: Record<OpportunityLevel, { color: string; label: string }> = {
  1: { color: '#ECFDF3', label: 'Muito baixa' },
  2: { color: '#BBF0CE', label: 'Baixa' },
  3: { color: '#7BDCA0', label: 'Média' },
  4: { color: '#3DBB6E', label: 'Alta' },
  5: { color: '#16A34A', label: 'Muito alta' },
}

/** Superfícies e chrome. */
export const SURFACE = {
  app: '#F6F7FB',
  card: '#FFFFFF',
  border: '#E2E8F0',
} as const

/** Raio: cartão no topo da faixa, controle na base. */
export const RADIUS = {
  card: '16px',
  control: '12px',
} as const

export const LAYOUT = {
  sidebarWidth: '256px',
} as const

/**
 * Tipografia. O KPI domina o cartão; o delta é subordinado e sempre menor,
 * para que a leitura vá do valor para a variação, nunca ao contrário.
 */
export const TYPOGRAPHY = {
  kpi: '28px',
  kpiLarge: '32px',
  delta: '12px',
  deltaLarge: '13px',
} as const

/** Custom properties de identidade, aplicadas no escopo do produto ativo. */
export function productCssVariables(product: ProductId): Record<string, string> {
  return {
    '--product-accent': PRODUCTS[product].accent,
  }
}
