import { combine, type Attestation } from '../domain/attestation'
import {
  CALIBRATION_ANCHORS,
  estimateVolume,
  MARKET,
  PRICE_ELASTICITY,
  promoLift,
  simulate,
} from '../domain/elasticity'
import { SCENARIOS } from './scenarios'
import { IQVIA, SAP, SCANNTECH } from './sources'

/**
 * Curva contínua de preço × volume (RGM, módulo 3.3).
 *
 * O simulador de cenários (3.4) mostra quatro colunas discretas; esta tela
 * mostra a mesma coisa varrida ponto a ponto. Por isso nada aqui reimplementa o
 * modelo: volume, receita e margem saem de `simulate()`, calibrado nas âncoras
 * da seção 10.3. As duas telas não podem discordar — e não discordam, porque
 * leem o mesmo domínio.
 */

const roundCents = (value: number) => Math.round(value * 100) / 100

/** Faixa em que as âncoras canônicas foram observadas: R$ 11,90 a R$ 12,90. */
export const OBSERVED_PRICE_RANGE = {
  minPriceBrl: roundCents(Math.min(...CALIBRATION_ANCHORS.map((anchor) => anchor.priceBrl))),
  maxPriceBrl: roundCents(Math.max(...CALIBRATION_ANCHORS.map((anchor) => anchor.priceBrl))),
} as const

/**
 * NOTA: não consta do ESCOPO — alcance da extrapolação e passo da varredura.
 *
 * Meio real para cada lado da faixa observada, de cinco em cinco centavos. O
 * passo é escolhido para que a grade caia exatamente sobre R$ 11,90, R$ 12,40 e
 * R$ 12,90: os preços das âncoras são pontos da curva, não vizinhos dela.
 */
export const EXTRAPOLATION_REACH_BRL = 0.5
export const PRICE_STEP_BRL = 0.05

export const PRICE_SWEEP = {
  minPriceBrl: roundCents(OBSERVED_PRICE_RANGE.minPriceBrl - EXTRAPOLATION_REACH_BRL),
  maxPriceBrl: roundCents(OBSERVED_PRICE_RANGE.maxPriceBrl + EXTRAPOLATION_REACH_BRL),
  stepBrl: PRICE_STEP_BRL,
} as const

/**
 * NOTA: não consta do ESCOPO — meia-largura da banda de confiança.
 *
 * Dentro da faixa observada a banda vale 3,5% do volume; fora dela abre mais 9
 * pontos por real de afastamento, até o teto de 20%. A curva é a mesma em toda
 * a extensão, mas a confiança não: perto das âncoras é interpolação, longe
 * delas é extrapolação. A banda é o que diz isso na tela — sem ela, um preço a
 * meio real da última observação pareceria tão firme quanto o preço de tabela.
 */
export const CONFIDENCE_BAND = {
  observedHalfWidthRate: 0.035,
  widenPerBrl: 0.09,
  maxHalfWidthRate: 0.2,
} as const

/** Distância do preço até a faixa observada. Zero quando está dentro dela. */
export function priceDistanceFromObserved(priceBrl: number): number {
  return Math.max(
    OBSERVED_PRICE_RANGE.minPriceBrl - priceBrl,
    priceBrl - OBSERVED_PRICE_RANGE.maxPriceBrl,
    0,
  )
}

export function isExtrapolated(priceBrl: number): boolean {
  return priceDistanceFromObserved(priceBrl) > 0
}

export function bandHalfWidthRate(priceBrl: number): number {
  return Math.min(
    CONFIDENCE_BAND.maxHalfWidthRate,
    CONFIDENCE_BAND.observedHalfWidthRate +
      CONFIDENCE_BAND.widenPerBrl * priceDistanceFromObserved(priceBrl),
  )
}

export type CurvePoint = {
  readonly priceBrl: number
  readonly discountRate: number
  readonly volume: number
  readonly volumeLow: number
  readonly volumeHigh: number
  /** Altura da banda empilhada sobre `volumeLow`, para a área do gráfico. */
  readonly bandSpan: number
  readonly bandHalfWidthRate: number
  readonly netRevenueBrl: number
  readonly contributionBrl: number
  readonly sharePercent: number
  readonly relativePriceIndex: number
  readonly extrapolated: boolean
}

/** Um ponto da curva. A mediana é o modelo; a banda é a incerteza em volta. */
export function pointAt(priceBrl: number, discountRate: number): CurvePoint {
  const outcome = simulate({ priceBrl, discountRate })
  const halfWidthRate = bandHalfWidthRate(priceBrl)
  const volumeLow = Math.round(outcome.volume * (1 - halfWidthRate))
  const volumeHigh = Math.round(outcome.volume * (1 + halfWidthRate))

  return {
    priceBrl,
    discountRate,
    volume: outcome.volume,
    volumeLow,
    volumeHigh,
    bandSpan: volumeHigh - volumeLow,
    bandHalfWidthRate: halfWidthRate,
    netRevenueBrl: outcome.netRevenueBrl,
    contributionBrl: outcome.contributionBrl,
    sharePercent: outcome.sharePercent,
    relativePriceIndex: outcome.relativePriceIndex,
    extrapolated: isExtrapolated(priceBrl),
  }
}

const SWEEP_STEPS = Math.round(
  (PRICE_SWEEP.maxPriceBrl - PRICE_SWEEP.minPriceBrl) / PRICE_SWEEP.stepBrl,
)

export const SWEEP_PRICES: readonly number[] = Array.from({ length: SWEEP_STEPS + 1 }, (_, index) =>
  roundCents(PRICE_SWEEP.minPriceBrl + index * PRICE_SWEEP.stepBrl),
)

/** Marcas do eixo de preço: as pontas da varredura e os preços das âncoras. */
export const PRICE_TICKS: readonly number[] = [
  ...new Set([
    PRICE_SWEEP.minPriceBrl,
    ...CALIBRATION_ANCHORS.map((anchor) => anchor.priceBrl),
    PRICE_SWEEP.maxPriceBrl,
  ]),
].sort((a, b) => a - b)

export function buildCurve(discountRate: number): readonly CurvePoint[] {
  return SWEEP_PRICES.map((priceBrl) => pointAt(priceBrl, discountRate))
}

/** Níveis de desconto que as âncoras cobrem — fora deles não há observação. */
export const DISCOUNT_LEVELS: readonly number[] = [
  ...new Set(CALIBRATION_ANCHORS.map((anchor) => anchor.discountRate)),
].sort((a, b) => a - b)

export const DEFAULT_DISCOUNT_RATE = DISCOUNT_LEVELS[0] ?? 0
export const DEFAULT_PRICE_BRL = MARKET.basePriceBrl

/** Lift promocional em cada nível canônico, resolvido pelo domínio. */
export const PROMO_LIFT_BY_LEVEL: readonly {
  readonly discountRate: number
  readonly lift: number
}[] = DISCOUNT_LEVELS.map((discountRate) => ({ discountRate, lift: promoLift(discountRate) }))

export type CanonicalPoint = {
  readonly id: string
  readonly label: string
  readonly priceBrl: number
  readonly discountRate: number
  /** Volume da âncora, seção 10.3 do ESCOPO. */
  readonly volume: number
  readonly sharePercent: number
  /** Volume que o modelo devolve nos parâmetros da âncora. */
  readonly modelVolume: number
  /** Verdadeiro quando o modelo reproduz a âncora exatamente. */
  readonly onCurve: boolean
}

function scenarioAt(priceBrl: number, discountRate: number) {
  return SCENARIOS.find(
    (scenario) =>
      Math.abs(scenario.inputs.priceBrl - priceBrl) < 0.005 &&
      Math.abs(scenario.inputs.discountRate - discountRate) < 0.0005,
  )
}

/**
 * Os quatro cenários canônicos como pontos de referência sobre a curva.
 *
 * `onCurve` não é decoração: é a verificação de que a varredura passa pelas
 * âncoras. Se algum dia deixar de passar, a tela mostra isso em vez de esconder.
 */
export const CANONICAL_POINTS: readonly CanonicalPoint[] = CALIBRATION_ANCHORS.map(
  (anchor, index) => {
    const scenario = scenarioAt(anchor.priceBrl, anchor.discountRate)
    const modelVolume = estimateVolume(anchor.priceBrl, anchor.discountRate)

    return {
      id: scenario?.id ?? `anchor-${index + 1}`,
      label: scenario?.label ?? `Âncora ${index + 1}`,
      priceBrl: anchor.priceBrl,
      discountRate: anchor.discountRate,
      volume: anchor.volume,
      sharePercent: anchor.sharePercent,
      modelVolume,
      onCurve: modelVolume === anchor.volume,
    }
  },
)

export const CANONICAL_ADHERENCE = {
  matched: CANONICAL_POINTS.filter((point) => point.onCurve).length,
  total: CANONICAL_POINTS.length,
} as const

export function canonicalPointsAt(discountRate: number): readonly CanonicalPoint[] {
  return CANONICAL_POINTS.filter((point) => Math.abs(point.discountRate - discountRate) < 0.0005)
}

export type RevenuePeak = {
  readonly point: CurvePoint
  /**
   * O máximo caiu na borda da faixa varrida em vez de num ponto interior — com
   * demanda elástica a receita não vira, só cresce enquanto o preço cai.
   */
  readonly atSweepEdge: boolean
}

export function revenuePeak(curve: readonly CurvePoint[]): RevenuePeak | null {
  const [first] = curve
  if (!first) return null

  const point = curve.reduce(
    (best, candidate) => (candidate.netRevenueBrl > best.netRevenueBrl ? candidate : best),
    first,
  )

  return {
    point,
    atSweepEdge:
      point.priceBrl <= PRICE_SWEEP.minPriceBrl || point.priceBrl >= PRICE_SWEEP.maxPriceBrl,
  }
}

/** Leitura da elasticidade calculada pelo domínio. Nada digitado à mão. */
export const ELASTICITY_READING = {
  value: PRICE_ELASTICITY,
  magnitude: Math.abs(PRICE_ELASTICITY),
  elastic: Math.abs(PRICE_ELASTICITY) > 1,
} as const

export const ELASTICITY_LABEL = ELASTICITY_READING.elastic
  ? 'Demanda elástica'
  : 'Demanda inelástica'

export const ELASTICITY_NOTE = ELASTICITY_READING.elastic
  ? 'Volume responde mais que proporcionalmente ao preço: cada ponto de corte devolve mais de um ponto de volume, e a receita líquida cresce enquanto o preço cai. O limite passa a ser comercial, não matemático.'
  : 'Volume responde menos que proporcionalmente ao preço: cortar preço não se paga em volume, e a receita líquida cai junto.'

export const ELASTICITY_ATTESTATION: Attestation = combine([SCANNTECH, IQVIA, SAP])

/**
 * Fora da faixa observada o número deixa de ser interpolação e vira
 * extrapolação. O atestado desce junto — o valor segue na tela, apenas para de
 * se apresentar como firme.
 */
export const EXTRAPOLATION_ATTESTATION: Attestation = {
  ...ELASTICITY_ATTESTATION,
  confidence: 'low',
  quality: 'partial',
  method: 'extrapolated',
}

export function attestationFor(priceBrl: number): Attestation {
  return isExtrapolated(priceBrl) ? EXTRAPOLATION_ATTESTATION : ELASTICITY_ATTESTATION
}

export const CURVE_CAPTION =
  'Mediana do modelo calibrado nas âncoras canônicas; a faixa em volta é o intervalo de confiança, que abre conforme o preço se afasta do trecho observado.'
