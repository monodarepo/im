/**
 * Modelo de elasticidade do simulador de cenários (RGM, módulo 3.4).
 *
 * ## Calibração
 *
 * O modelo não traz coeficiente digitado à mão: ele se calibra a partir das
 * âncoras canônicas da seção 10.3 do ESCOPO, de modo que os cenários canônicos
 * são reproduzidos por construção, não por coincidência numérica.
 *
 * 1. **Elasticidade-preço.** Sai do par Atual → Cenário 1, que compartilham
 *    desconto zero e por isso isolam o efeito de preço:
 *
 *        e = ln(1.340.000 / 1.250.000) / ln(12,40 / 12,90) ≈ −1,7589
 *
 *    Volume responde por lei de potência: `V = V0 · (P/P0)^e`.
 *
 * 2. **Lift promocional.** O que sobra do volume depois de descontado o efeito
 *    de preço é atribuído ao desconto. Nos cenários 2 e 3:
 *
 *        lift(5%) = 1.520.000 / (1.250.000 · (11,90/12,90)^e) ≈ 1,0552
 *        lift(8%) = 1.610.000 / (1.250.000 · (12,90/12,90)^e) = 1,2880
 *
 *    O lift é superlinear de propósito: o Cenário 3 mantém o preço de tabela e
 *    ainda assim vende mais que o Cenário 2, que cortou preço. Um desconto mais
 *    fundo destrava execução no ponto de venda que o desconto raso não paga —
 *    e é isso que a curva registra. Entre as âncoras, interpolação linear.
 *
 * 3. **Share.** Interpolação linear sobre o volume, ancorada nos quatro pontos
 *    canônicos. A relação não é proporcional: cada unidade adicional compra
 *    menos ponto de share conforme a base cresce.
 *
 * ## Linhas monetárias
 *
 * `sellOut = volume · preço de tabela` e `receita líquida = sell-out · (1 − d)`
 * reproduzem Atual, Cenário 1 e Cenário 2. **O Cenário 3 não fecha por nenhuma
 * fórmula compatível com os outros três** — ver `scenarios.ts`. Por isso as
 * linhas canônicas são fixadas como dado e o modelo só governa o que o usuário
 * editar; voltando aos parâmetros canônicos, os números canônicos voltam
 * exatos.
 */

export const MARKET = {
  /** Preço de tabela atual, em reais. */
  basePriceBrl: 12.9,
  /** Preço médio do concorrente, em reais. */
  competitorPriceBrl: 12.5,
  /** Margem de contribuição sobre a receita líquida. */
  contributionMarginRate: 0.455,
  baseVolume: 1_250_000,
  baseSharePercent: 18.7,
} as const

type VolumeAnchor = {
  readonly priceBrl: number
  readonly discountRate: number
  readonly volume: number
  readonly sharePercent: number
}

/** Âncoras da seção 10.3: os quatro cenários canônicos. */
export const CALIBRATION_ANCHORS: readonly VolumeAnchor[] = [
  { priceBrl: 12.9, discountRate: 0, volume: 1_250_000, sharePercent: 18.7 },
  { priceBrl: 12.4, discountRate: 0, volume: 1_340_000, sharePercent: 19.2 },
  { priceBrl: 11.9, discountRate: 0.05, volume: 1_520_000, sharePercent: 20.8 },
  { priceBrl: 12.9, discountRate: 0.08, volume: 1_610_000, sharePercent: 21.9 },
]

const [BASE_ANCHOR, PRICE_ANCHOR] = CALIBRATION_ANCHORS as unknown as [VolumeAnchor, VolumeAnchor]

/** Elasticidade-preço isolada pelo par de desconto zero. */
export const PRICE_ELASTICITY =
  Math.log(PRICE_ANCHOR.volume / BASE_ANCHOR.volume) /
  Math.log(PRICE_ANCHOR.priceBrl / BASE_ANCHOR.priceBrl)

function priceFactor(priceBrl: number): number {
  return (priceBrl / MARKET.basePriceBrl) ** PRICE_ELASTICITY
}

type Point = { readonly x: number; readonly y: number }

/** Interpolação linear com extrapolação pela inclinação das pontas. */
function interpolate(points: readonly Point[], x: number): number {
  const first = points[0]
  const last = points[points.length - 1]
  if (!first || !last) throw new Error('interpolate() exige ao menos um ponto')
  if (points.length === 1) return first.y

  if (x <= first.x) {
    const next = points[1] as Point
    const slope = (next.y - first.y) / (next.x - first.x)
    return first.y + slope * (x - first.x)
  }
  if (x >= last.x) {
    const previous = points[points.length - 2] as Point
    const slope = (last.y - previous.y) / (last.x - previous.x)
    return last.y + slope * (x - last.x)
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index] as Point
    const b = points[index + 1] as Point
    if (x >= a.x && x <= b.x) {
      if (b.x === a.x) return a.y
      return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x)
    }
  }
  return last.y
}

function dedupeByX(points: readonly Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a.x - b.x)
  return sorted.filter((point, index) => index === 0 || point.x !== sorted[index - 1]?.x)
}

/** Lift promocional por nível de desconto, resolvido a partir das âncoras. */
export const PROMO_LIFT_CURVE: readonly Point[] = dedupeByX(
  CALIBRATION_ANCHORS.map((anchor) => ({
    x: anchor.discountRate,
    y: anchor.volume / (MARKET.baseVolume * priceFactor(anchor.priceBrl)),
  })),
)

export function promoLift(discountRate: number): number {
  return interpolate(PROMO_LIFT_CURVE, discountRate)
}

/** Share por volume, ancorado nos quatro cenários. */
const SHARE_CURVE: readonly Point[] = dedupeByX(
  CALIBRATION_ANCHORS.map((anchor) => ({ x: anchor.volume, y: anchor.sharePercent })),
)

export function estimateVolume(priceBrl: number, discountRate: number): number {
  const raw = MARKET.baseVolume * priceFactor(priceBrl) * promoLift(discountRate)
  return Math.max(0, Math.round(raw / 1000) * 1000)
}

export function estimateSharePercent(volume: number): number {
  return Math.round(interpolate(SHARE_CURVE, volume) * 10) / 10
}

/** Índice de preço relativo, sobre o preço de tabela contra o concorrente. */
export function relativePriceIndex(priceBrl: number): number {
  return Math.round((priceBrl / MARKET.competitorPriceBrl) * 100 * 10) / 10
}

export type ScenarioInputs = {
  readonly priceBrl: number
  /** Desconto em fração, ex.: `0.05` para 5%. */
  readonly discountRate: number
}

export type ScenarioOutcome = {
  readonly priceBrl: number
  readonly discountRate: number
  readonly netPriceBrl: number
  readonly relativePriceIndex: number
  readonly volume: number
  readonly sellOutBrl: number
  readonly netRevenueBrl: number
  readonly contributionBrl: number
  readonly sharePercent: number
  /** `null` quando não há investimento promocional que justifique o cálculo. */
  readonly promoRoiPercent: number | null
}

const BASE_CONTRIBUTION_BRL =
  MARKET.baseVolume * MARKET.basePriceBrl * MARKET.contributionMarginRate

/**
 * ROI promocional: ganho de margem sobre o investimento, onde o investimento é
 * o que se abriu mão por unidade — corte de tabela mais desconto — aplicado ao
 * volume do cenário. Sem abrir mão de preço não há investimento, e o ROI não é
 * definido.
 */
function promoRoi(netPriceBrl: number, volume: number, contributionBrl: number): number | null {
  const givenUpPerUnit = MARKET.basePriceBrl - netPriceBrl
  if (givenUpPerUnit <= 0) return null

  const investment = givenUpPerUnit * volume
  if (investment <= 0) return null

  return Math.round(((contributionBrl - BASE_CONTRIBUTION_BRL) / investment) * 100 * 10) / 10
}

/** Simula um cenário a partir de preço e desconto. Determinístico e puro. */
export function simulate({ priceBrl, discountRate }: ScenarioInputs): ScenarioOutcome {
  const netPriceBrl = priceBrl * (1 - discountRate)
  const volume = estimateVolume(priceBrl, discountRate)
  const sellOutBrl = Math.round(volume * priceBrl)
  const netRevenueBrl = Math.round(sellOutBrl * (1 - discountRate))
  const contributionBrl = Math.round(netRevenueBrl * MARKET.contributionMarginRate)

  return {
    priceBrl,
    discountRate,
    netPriceBrl,
    relativePriceIndex: relativePriceIndex(priceBrl),
    volume,
    sellOutBrl,
    netRevenueBrl,
    contributionBrl,
    sharePercent: estimateSharePercent(volume),
    promoRoiPercent: promoRoi(netPriceBrl, volume, contributionBrl),
  }
}
