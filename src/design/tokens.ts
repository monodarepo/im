/**
 * Cor significa dado.
 *
 * A paleta semântica pertence ao número: verde é resultado positivo, vermelho é
 * negativo, âmbar é atenção, cinza é neutro. A cor de identidade do produto vive
 * apenas no chrome — sidebar, header, botão primário, badge — e nunca é usada
 * em série de dado.
 */

export const SEMANTIC = {
  positive: '#16A34A',
  negative: '#DC2626',
  attention: '#F59E0B',
  neutral: '#64748B',
} as const

export type SemanticTone = keyof typeof SEMANTIC

/** Os quatro produtos da plataforma. */
export type ProductId = 'hub' | 'gtm' | 'rgm' | 'ag'

type ProductIdentity = {
  readonly id: ProductId
  readonly name: string
  readonly accent: string
}

export const PRODUCTS: Record<ProductId, ProductIdentity> = {
  hub: { id: 'hub', name: 'HUB Inteligência de Mercado', accent: '#1E4FD8' },
  gtm: { id: 'gtm', name: 'GTM', accent: '#0F766E' },
  rgm: { id: 'rgm', name: 'RGM Genéricos', accent: '#7C3AED' },
  ag: { id: 'ag', name: 'Amostra Grátis', accent: '#EA7317' },
}

export const PRODUCT_ORDER: readonly ProductId[] = ['hub', 'gtm', 'rgm', 'ag']

/**
 * Tom semântico de uma variação numérica. `inverted` cobre métricas em que cair
 * é bom — ruptura, devolução, custo.
 */
export function toneForDelta(delta: number, options?: { inverted?: boolean }): SemanticTone {
  if (delta === 0) return 'neutral'
  const favorable = options?.inverted === true ? delta < 0 : delta > 0
  return favorable ? 'positive' : 'negative'
}

export function semanticColor(tone: SemanticTone): string {
  return SEMANTIC[tone]
}
