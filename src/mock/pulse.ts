import { combine, type Attestation } from '../domain/attestation'
import { formatDecimal, formatPercent, formatPointsDelta } from '../domain/format'
import { formatMoney } from '../domain/money'
import { daysFromNow, formatDate, HOJE, type IsoDate } from '../domain/today'
import { MARKET_KPIS, SELLOUT_GROWTH_PERCENT, SELLOUT_TOTAL_BRL, type Kpi } from './kpis'
import { createRandom, MOCK_SEED } from './random'
import { SELLOUT_SERIES } from './sellout'
import { IQVIA, NEOGRID, NEOGRID_DISTRIBUIDORES, SCANNTECH } from './sources'

/**
 * Market Pulse (módulo 1.2 do ESCOPO).
 *
 * O argumento da tela é a separação entre o que foi medido e o que foi
 * extrapolado. A cobertura declara essa fronteira em número de PDVs, o feed de
 * variações carrega o atestado de cada leitura e a projeção só existe adiante
 * de `HOJE`, sempre com faixa — nunca como linha única.
 */

function kpiOf(id: string): Kpi {
  const found = MARKET_KPIS.find((candidate) => candidate.id === id)
  if (!found) throw new Error(`KPI ausente em MARKET_KPIS: ${id}`)
  return found
}

/* ------------------------------------------------------------------ */
/* 1. Cobertura: observado x estimado                                   */
/* ------------------------------------------------------------------ */

/** Lojas com leitura direta de cupom fiscal. */
export const OBSERVED_OUTLETS = 15_000

/** Universo indireto atendido via distribuidores. */
export const UNIVERSE_OUTLETS = 70_000

/** PDVs sem leitura direta — chegam ao número por extrapolação. */
export const ESTIMATED_OUTLETS = UNIVERSE_OUTLETS - OBSERVED_OUTLETS

/**
 * NOTA: não consta do ESCOPO — o atestado da parcela extrapolada é derivado do
 * atestado da Scanntech rebaixando método, confiança e qualidade. A parcela sem
 * leitura direta não pode se apresentar com a firmeza da parcela observada.
 */
export const COVERAGE_ESTIMATED_ATTESTATION: Attestation = {
  ...SCANNTECH,
  source: ['scanntech', 'distribuidores'],
  confidence: 'medium',
  quality: 'partial',
  method: 'extrapolated',
}

export const COVERAGE_OBSERVED_ATTESTATION: Attestation = SCANNTECH

export const COVERAGE_ATTESTATION: Attestation = combine([
  COVERAGE_OBSERVED_ATTESTATION,
  COVERAGE_ESTIMATED_ATTESTATION,
])

export type CoverageSegment = {
  readonly id: 'observed' | 'estimated'
  readonly label: string
  readonly description: string
  readonly outlets: number
  /** Participação no universo indireto, em pontos percentuais. */
  readonly share: number
  readonly attestation: Attestation
}

function shareOfUniverse(outlets: number): number {
  return (outlets / UNIVERSE_OUTLETS) * 100
}

export const COVERAGE_SEGMENTS: readonly CoverageSegment[] = [
  {
    id: 'observed',
    label: 'Observado',
    description: 'leitura direta de sell-out, loja a loja',
    outlets: OBSERVED_OUTLETS,
    share: shareOfUniverse(OBSERVED_OUTLETS),
    attestation: COVERAGE_OBSERVED_ATTESTATION,
  },
  {
    id: 'estimated',
    label: 'Estimado',
    description: 'extrapolado a partir da base observada e dos distribuidores',
    outlets: ESTIMATED_OUTLETS,
    share: shareOfUniverse(ESTIMATED_OUTLETS),
    attestation: COVERAGE_ESTIMATED_ATTESTATION,
  },
]

export const COVERAGE_OBSERVED_SHARE_PERCENT = shareOfUniverse(OBSERVED_OUTLETS)

/* ------------------------------------------------------------------ */
/* 2. Feed de variações                                                 */
/* ------------------------------------------------------------------ */

/** Limiar de ruptura do diagnóstico do Nordeste (seção 10 do ESCOPO). */
const NE_STOCKOUT_THRESHOLD_PERCENT = 10

/** Queda de sell-out de Losartana em SP. */
const LOSARTANA_SP_DROP_PERCENT = -12

/** Impacto financeiro da ruptura no Nordeste. */
const NE_STOCKOUT_IMPACT_BRL = -2_100_000

/** Perda de share de Dipirona em MG após movimento de preço da concorrência. */
const DIPIRONA_MG_SHARE_LOSS_POINTS = -1.3

export type PulseSignal = {
  readonly id: string
  readonly metric: string
  /** Recorte da leitura: mercado total, praça, molécula. */
  readonly scope: string
  readonly delta: number
  readonly deltaUnit: 'percent' | 'points' | 'money'
  /** Métrica em que cair é bom. */
  readonly inverted: boolean
  /** Frase de explicação automática, montada sobre os próprios canônicos. */
  readonly explanation: string
  readonly attestation: Attestation
}

const VS_PREVIOUS_WEEK = 'vs. 7 dias anteriores'

export const PULSE_COMPARISON = VS_PREVIOUS_WEEK

export const PULSE_SIGNALS: readonly PulseSignal[] = [
  {
    id: 'sellout',
    metric: 'Sell-out (R$)',
    scope: 'Mercado total',
    delta: kpiOf('sellout').delta,
    deltaUnit: 'percent',
    inverted: false,
    explanation: `Alta sustentada pelo ganho de distribuição numérica (${formatPointsDelta(kpiOf('numeric-distribution').delta)}) e pela queda da ruptura (${formatPointsDelta(kpiOf('stockout').delta)}) no mesmo período.`,
    attestation: SCANNTECH,
  },
  {
    id: 'market-share',
    metric: 'Market share (valor)',
    scope: 'Mercado total',
    delta: kpiOf('market-share').delta,
    deltaUnit: 'points',
    inverted: false,
    explanation: `Share avança com o preço relativo em ${formatDecimal(kpiOf('relative-price').value, 1)}, abaixo de 100: o portfólio segue mais barato que a média do mercado.`,
    attestation: IQVIA,
  },
  {
    id: 'numeric-distribution',
    metric: 'Distribuição numérica',
    scope: 'Universo indireto',
    delta: kpiOf('numeric-distribution').delta,
    deltaUnit: 'points',
    inverted: false,
    explanation: `Mais PDVs com o portfólio ativo entre as lojas observadas; os ${formatPercent(shareOfUniverse(ESTIMATED_OUTLETS))} restantes do universo entram por extrapolação.`,
    attestation: NEOGRID,
  },
  {
    id: 'stockout',
    metric: 'Ruptura estimada',
    scope: 'Universo indireto',
    delta: kpiOf('stockout').delta,
    deltaUnit: 'points',
    inverted: true,
    explanation: `Reposição melhorou nos distribuidores, mas o número é estimado — a ruptura em três estados do Nordeste segue acima de ${formatPercent(NE_STOCKOUT_THRESHOLD_PERCENT, 0)}.`,
    attestation: NEOGRID_DISTRIBUIDORES,
  },
  {
    id: 'relative-price',
    metric: 'Preço relativo (IPR)',
    scope: 'Mercado total',
    delta: kpiOf('relative-price').delta,
    deltaUnit: 'points',
    inverted: false,
    explanation:
      'Preço relativo cede depois da redução de preço da concorrência em Dipirona em MG.',
    attestation: SCANNTECH,
  },
  {
    id: 'losartana-sp',
    metric: 'Sell-out de Losartana',
    scope: 'São Paulo',
    delta: LOSARTANA_SP_DROP_PERCENT,
    deltaUnit: 'percent',
    inverted: false,
    explanation:
      'Queda concentrada em SP, com preço e distribuição como causa provável do movimento.',
    attestation: combine([SCANNTECH, NEOGRID]),
  },
  {
    id: 'ruptura-ne',
    metric: 'Impacto de ruptura',
    scope: '3 estados do Nordeste',
    delta: NE_STOCKOUT_IMPACT_BRL,
    deltaUnit: 'money',
    inverted: false,
    explanation: `Ruptura acima de ${formatPercent(NE_STOCKOUT_THRESHOLD_PERCENT, 0)} nos três estados; o valor é estimado sobre a base de distribuidores, não medido em loja.`,
    attestation: NEOGRID_DISTRIBUIDORES,
  },
  {
    id: 'dipirona-mg',
    metric: 'Share de Dipirona',
    scope: 'Minas Gerais',
    delta: DIPIRONA_MG_SHARE_LOSS_POINTS,
    deltaUnit: 'points',
    inverted: false,
    explanation:
      'Concorrente reduziu preço em MG e a perda de share já aparece na leitura do período.',
    attestation: combine([SCANNTECH, IQVIA]),
  },
]

/* ------------------------------------------------------------------ */
/* 3. Projeção curta com intervalo de confiança                         */
/* ------------------------------------------------------------------ */

export const FORECAST_HORIZON_DAYS = 7

/**
 * NOTA: não consta do ESCOPO — meia-largura da faixa de confiança, em pontos
 * percentuais sobre a mediana. Abre linearmente de 3% no primeiro dia projetado
 * a 9% no último: quanto mais longe do último dado observado, mais larga a
 * faixa. Os valores são de apresentação, não de modelo estatístico.
 */
const BAND_START_PERCENT = 3
const BAND_END_PERCENT = 9

/**
 * Total projetado para a janela seguinte: o sell-out do período corrente
 * mantendo a taxa de crescimento canônica. Nenhum ponto da projeção existe fora
 * desta âncora.
 */
export const FORECAST_TOTAL_BRL = Math.round(
  SELLOUT_TOTAL_BRL * (1 + SELLOUT_GROWTH_PERCENT / 100),
)

function forecastWeights(): number[] {
  const random = createRandom(MOCK_SEED + 2)
  const raw = Array.from(
    { length: FORECAST_HORIZON_DAYS },
    (_, day) => (1 + (0.1 * day) / (FORECAST_HORIZON_DAYS - 1)) * (0.94 + 0.12 * random()),
  )
  const total = raw.reduce((sum, weight) => sum + weight, 0)
  return raw.map((weight) => weight / total)
}

/** Distribui um total pelos pesos, absorvendo o arredondamento no último dia. */
function distribute(total: number, weights: readonly number[]): number[] {
  const values = weights.map((weight) => Math.round(total * weight))
  const drift = total - values.reduce((sum, value) => sum + value, 0)
  const last = values.length - 1
  values[last] = (values[last] ?? 0) + drift
  return values
}

function bandHalfWidth(dayIndex: number): number {
  const span = BAND_END_PERCENT - BAND_START_PERCENT
  const progress = dayIndex / (FORECAST_HORIZON_DAYS - 1)
  return (BAND_START_PERCENT + span * progress) / 100
}

export type PulsePoint = {
  readonly date: IsoDate
  readonly label: string
  /** Sell-out medido no dia, em reais. `null` adiante de `HOJE`. */
  readonly observed: number | null
  /** Mediana projetada, em reais. `null` antes do último dia observado. */
  readonly median: number | null
  /** Piso e teto da faixa de confiança, em reais. */
  readonly band: readonly [number, number] | null
}

const forecastValues = distribute(FORECAST_TOTAL_BRL, forecastWeights())

const observedPoints: readonly PulsePoint[] = SELLOUT_SERIES.map((point, index) => {
  // O último dia observado ancora a projeção: a linha tracejada e a faixa
  // nascem dele, sem salto visual na emenda.
  const isBoundary = index === SELLOUT_SERIES.length - 1
  return {
    date: point.date,
    label: point.label,
    observed: point.current,
    median: isBoundary ? point.current : null,
    band: isBoundary ? ([point.current, point.current] as const) : null,
  }
})

const forecastPoints: readonly PulsePoint[] = Array.from(
  { length: FORECAST_HORIZON_DAYS },
  (_, index) => {
    const date = daysFromNow(index + 1)
    const median = forecastValues[index] ?? 0
    const half = bandHalfWidth(index)
    return {
      date,
      label: formatDate(date).slice(0, 5),
      observed: null,
      median,
      band: [Math.round(median * (1 - half)), Math.round(median * (1 + half))] as const,
    }
  },
)

export const PULSE_SERIES: readonly PulsePoint[] = [...observedPoints, ...forecastPoints]

/** Rótulo do eixo onde o observado termina e a projeção começa. */
export const FORECAST_BOUNDARY_LABEL = formatDate(HOJE).slice(0, 5)

export const FORECAST_FIRST_LABEL = forecastPoints[0]?.label ?? FORECAST_BOUNDARY_LABEL

export const FORECAST_LAST_LABEL =
  forecastPoints[forecastPoints.length - 1]?.label ?? FORECAST_BOUNDARY_LABEL

export const FORECAST_LOW_BRL = forecastPoints.reduce((sum, point) => sum + (point.band?.[0] ?? 0), 0)

export const FORECAST_HIGH_BRL = forecastPoints.reduce(
  (sum, point) => sum + (point.band?.[1] ?? 0),
  0,
)

/**
 * NOTA: não consta do ESCOPO — o atestado da projeção é derivado das fontes que
 * a sustentam, rebaixado a `extrapolated` e confiança média. Projeção nunca
 * herda a confiança do dado observado que a alimenta.
 */
export const FORECAST_ATTESTATION: Attestation = {
  ...combine([SCANNTECH, NEOGRID]),
  confidence: 'medium',
  quality: 'partial',
  method: 'extrapolated',
}

export const FORECAST_SUMMARY = `Projeção de ${formatMoney(FORECAST_TOTAL_BRL)} para os próximos ${FORECAST_HORIZON_DAYS} dias, entre ${formatMoney(FORECAST_LOW_BRL)} e ${formatMoney(FORECAST_HIGH_BRL)}.`
