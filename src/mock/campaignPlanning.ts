import { combine, type Attestation } from '../domain/attestation'
import { addDays, daysBetween, formatMonth, HOJE, type IsoDate } from '../domain/today'
import {
  ALLOCATION_DECISION_ID,
  ALLOCATION_KPIS,
  BLOCKED_SAMPLES,
  CAMPAIGNS,
  REGION_ALLOCATIONS,
  REGION_TOTAL,
  SPECIALTY_DISTRIBUTION,
  STOCKOUT_BLOCK,
} from './sampleAllocation'
import { CRM_SFA, IQVIA, NEOGRID, SAP, SCANNTECH } from './sources'

/**
 * Planejamento de Campanhas de amostra grátis (AG, módulo 4.2).
 *
 * O Otimizador (4.4) responde para quem a amostra vai dentro de um ciclo. Esta
 * tela é o passo anterior: quanta amostra cada ciclo vai pedir, em que produto,
 * em que território e em que especialidade — e o que a verba, o estoque e o
 * bloqueio de ruptura permitem prometer.
 *
 * Duas regras organizam o mock:
 *
 * 1. **Nada é redigitado.** O ciclo em execução herda o plano canônico da seção
 *    10.5 (`REGION_TOTAL`, `ALLOCATION_KPIS`) e o volume retido pelo bloqueio
 *    (`BLOCKED_SAMPLES`). A demanda prevista do ciclo é a soma dos dois: o que
 *    o plano libera mais o que o Nordeste pediria se não estivesse bloqueado.
 * 2. **Todo desdobramento fecha.** As tabelas por produto × território e por
 *    especialidade são repartições da mesma previsão, alocadas por maior resto,
 *    então a soma das linhas é exatamente o total.
 */

const PLAN_ATTESTATION = combine([CRM_SFA, SAP])
const STOCK_ATTESTATION = combine([SAP, NEOGRID])
const DEMAND_ATTESTATION = combine([CRM_SFA, IQVIA, SAP])

/**
 * Previsão é extrapolação: mesmo com as fontes em dia, o número de um ciclo
 * futuro não é observado. O atestado da previsão nasce do elo mais fraco das
 * fontes e é rebaixado mais um grau no método.
 */
export const FORECAST_ATTESTATION: Attestation = {
  ...combine([CRM_SFA, IQVIA, SCANNTECH]),
  quality: 'partial',
  method: 'extrapolated',
}

export const TERRITORY_DEMAND_ATTESTATION = DEMAND_ATTESTATION
export const SPECIALTY_DEMAND_ATTESTATION = combine([IQVIA, CRM_SFA])
export const CYCLE_ATTESTATION = PLAN_ATTESTATION

/** Decisão que o plano de ciclo alimenta — a mesma que o Otimizador movimenta. */
export const PLANNING_DECISION_ID = ALLOCATION_DECISION_ID

/**
 * Demanda prevista do ciclo em execução: o que o plano libera somado ao que o
 * bloqueio de ruptura retém. Nenhum dos dois é digitado aqui.
 */
export const FORECAST_TOTAL_SAMPLES = REGION_TOTAL.recommendedSamples + BLOCKED_SAMPLES

/** Amostras que o plano do ciclo libera para entrega. */
export const PLANNED_SAMPLES = REGION_TOTAL.recommendedSamples

/** Custo estimado do plano do ciclo — canônico, vem do KPI de custo da seção 10.5. */
export const CYCLE_COST_BRL = ALLOCATION_KPIS.find((kpi) => kpi.id === 'cost')?.value ?? 0

/**
 * NOTA: não consta do ESCOPO — a grade de ciclos mensais do plano.
 * Seis ciclos de mês civil, ancorados em `HOJE`: dois encerrados, o corrente em
 * execução e três planejados. Os comprimentos são os dos meses de mai/26 a
 * out/26, e a primeira abertura fica 90 dias antes de `HOJE`.
 */
const CYCLE_MONTH_DAYS: readonly number[] = [31, 30, 31, 31, 30, 31]
const FIRST_CYCLE_START_OFFSET = -90

/** NOTA: não consta do ESCOPO — o plano fecha 10 dias antes da abertura do ciclo. */
export const PLAN_LOCK_DAYS = 10

type CycleWindow = { readonly startsOn: IsoDate; readonly endsOn: IsoDate }

function buildCycleWindows(): readonly CycleWindow[] {
  const windows: CycleWindow[] = []
  let offset = FIRST_CYCLE_START_OFFSET
  for (const days of CYCLE_MONTH_DAYS) {
    windows.push({ startsOn: addDays(HOJE, offset), endsOn: addDays(HOJE, offset + days - 1) })
    offset += days
  }
  return windows
}

const CYCLE_WINDOWS = buildCycleWindows()

export type CycleState = 'closed' | 'running' | 'planned'

export const CYCLE_STATE_LABEL: Record<CycleState, string> = {
  closed: 'Encerrado',
  running: 'Em execução',
  planned: 'Planejado',
}

type CycleSeed = {
  readonly id: string
  /** Demanda prevista de amostras no ciclo. */
  readonly forecastSamples: number
  /** Metade da faixa de incerteza, em porcentagem da previsão. */
  readonly bandPercent: number
  /** Amostras efetivamente entregues. `null` enquanto o ciclo não fecha. */
  readonly actualSamples: number | null
}

/**
 * NOTA: não consta do ESCOPO — a série de demanda por ciclo e a largura da
 * faixa de incerteza. Só o ciclo em execução tem número canônico (10.5); os
 * demais são declarados para que a previsão tenha história e horizonte. A faixa
 * abre com a distância: 4% no ciclo já encerrado, 17% no último planejado.
 */
const CYCLE_SEEDS: readonly CycleSeed[] = [
  { id: 'cycle-1', forecastSamples: 92_400, bandPercent: 4, actualSamples: 89_600 },
  { id: 'cycle-2', forecastSamples: 96_800, bandPercent: 5, actualSamples: 94_300 },
  { id: 'cycle-3', forecastSamples: FORECAST_TOTAL_SAMPLES, bandPercent: 6, actualSamples: null },
  { id: 'cycle-4', forecastSamples: 108_400, bandPercent: 9, actualSamples: null },
  { id: 'cycle-5', forecastSamples: 112_900, bandPercent: 13, actualSamples: null },
  { id: 'cycle-6', forecastSamples: 118_600, bandPercent: 17, actualSamples: null },
]

export type PlanningCycle = {
  readonly id: string
  readonly label: string
  readonly startsOn: IsoDate
  readonly endsOn: IsoDate
  /** Data de fechamento do plano do ciclo. */
  readonly lockOn: IsoDate
  readonly forecastSamples: number
  readonly bandLow: number
  readonly bandHigh: number
  readonly bandPercent: number
  readonly actualSamples: number | null
}

export const PLANNING_CYCLES: readonly PlanningCycle[] = CYCLE_SEEDS.map((seed, index) => {
  const window = CYCLE_WINDOWS[index]
  if (!window) throw new Error(`Ciclo sem janela de datas: ${seed.id}`)

  const halfBand = Math.round((seed.forecastSamples * seed.bandPercent) / 100)

  return {
    id: seed.id,
    label: formatMonth(window.startsOn),
    startsOn: window.startsOn,
    endsOn: window.endsOn,
    lockOn: addDays(window.startsOn, -PLAN_LOCK_DAYS),
    forecastSamples: seed.forecastSamples,
    bandLow: seed.forecastSamples - halfBand,
    bandHigh: seed.forecastSamples + halfBand,
    bandPercent: seed.bandPercent,
    actualSamples: seed.actualSamples,
  }
})

export function cycleState(cycle: PlanningCycle): CycleState {
  if (daysBetween(cycle.endsOn, HOJE) > 0) return 'closed'
  if (daysBetween(HOJE, cycle.startsOn) > 0) return 'planned'
  return 'running'
}

export const CURRENT_CYCLE =
  PLANNING_CYCLES.find((cycle) => cycleState(cycle) === 'running') ?? PLANNING_CYCLES[0]

export const PLANNED_CYCLES_AHEAD = PLANNING_CYCLES.filter(
  (cycle) => cycleState(cycle) === 'planned',
).length

export type ForecastPoint = {
  readonly label: string
  readonly forecast: number
  /** Faixa de incerteza como par `[mínimo, máximo]`, para a área do gráfico. */
  readonly band: readonly [number, number]
  readonly actual: number | null
}

export const FORECAST_SERIES: readonly ForecastPoint[] = PLANNING_CYCLES.map((cycle) => ({
  label: cycle.label,
  forecast: cycle.forecastSamples,
  band: [cycle.bandLow, cycle.bandHigh] as const,
  actual: cycle.actualSamples,
}))

/**
 * Repartição de um total por participações, com sobra distribuída por maior
 * resto: a soma das parcelas é sempre exatamente o total, sem linha órfã de
 * arredondamento.
 */
function allocateByShare(total: number, shares: readonly number[]): readonly number[] {
  const sum = shares.reduce((acc, share) => acc + share, 0)
  if (sum <= 0) return shares.map(() => 0)

  const exact = shares.map((share) => (total * share) / sum)
  const parcels = exact.map((value) => Math.floor(value))
  let remainder = total - parcels.reduce((acc, value) => acc + value, 0)

  const byFraction = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)

  for (const { index } of byFraction) {
    if (remainder <= 0) break
    parcels[index] = (parcels[index] ?? 0) + 1
    remainder -= 1
  }

  return parcels
}

export type CampaignProduct = {
  readonly id: string
  readonly label: string
  /** Participação do produto na demanda do ciclo, em porcentagem. */
  readonly share: number
}

/**
 * NOTA: não consta do ESCOPO — as apresentações da campanha Losartana Plus e a
 * participação de cada uma na demanda. O ESCOPO fixa o produto da campanha; a
 * quebra por apresentação é declarada para que a previsão tenha eixo de produto.
 */
export const CAMPAIGN_PRODUCTS: readonly CampaignProduct[] = [
  { id: 'losartana-50-30', label: 'Losartana 50mg c/30', share: 46 },
  { id: 'losartana-hctz-30', label: 'Losartana 50/12,5mg c/30', share: 32 },
  { id: 'losartana-50-60', label: 'Losartana 50mg c/60', share: 22 },
]

const PRODUCT_SHARES = CAMPAIGN_PRODUCTS.map((product) => product.share)

export type TerritoryDemand = {
  readonly id: string
  readonly territory: string
  /** Demanda por produto, na ordem de `CAMPAIGN_PRODUCTS`. */
  readonly byProduct: readonly number[]
  readonly total: number
  /** `true` quando o território está retido pelo bloqueio de ruptura do HUB. */
  readonly blocked: boolean
}

/**
 * Demanda por produto × território.
 *
 * Os territórios liberados repetem a alocação canônica da seção 10.5, e o
 * Nordeste entra com o volume retido pelo bloqueio: o plano continua prevendo a
 * demanda da praça, ele apenas não a libera.
 */
export const TERRITORY_DEMAND: readonly TerritoryDemand[] = [
  ...REGION_ALLOCATIONS.map((region) => ({
    id: region.id,
    territory: region.region,
    byProduct: allocateByShare(region.recommendedSamples, PRODUCT_SHARES),
    total: region.recommendedSamples,
    blocked: false,
  })),
  {
    id: 'nordeste',
    territory: STOCKOUT_BLOCK.region,
    byProduct: allocateByShare(BLOCKED_SAMPLES, PRODUCT_SHARES),
    total: BLOCKED_SAMPLES,
    blocked: true,
  },
]

export const PRODUCT_TOTALS: readonly number[] = CAMPAIGN_PRODUCTS.map((_, index) =>
  TERRITORY_DEMAND.reduce((sum, row) => sum + (row.byProduct[index] ?? 0), 0),
)

export const TERRITORY_DEMAND_TOTAL = TERRITORY_DEMAND.reduce((sum, row) => sum + row.total, 0)

export type SpecialtyDemand = {
  readonly id: string
  readonly label: string
  readonly share: number
  readonly targetDoctors: number
  readonly samples: number
  readonly samplesPerDoctor: number
}

const SPECIALTY_SHARES = SPECIALTY_DISTRIBUTION.map((slice) => slice.share)
const SPECIALTY_SAMPLES = allocateByShare(PLANNED_SAMPLES, SPECIALTY_SHARES)
const SPECIALTY_DOCTORS = allocateByShare(REGION_TOTAL.targetDoctors, SPECIALTY_SHARES)

/**
 * Demanda por especialidade: a mesma previsão liberada, repartida pelo outro
 * eixo. A participação vem da distribuição canônica da seção 10.5.
 */
export const SPECIALTY_DEMAND: readonly SpecialtyDemand[] = SPECIALTY_DISTRIBUTION.map(
  (slice, index) => {
    const samples = SPECIALTY_SAMPLES[index] ?? 0
    const targetDoctors = SPECIALTY_DOCTORS[index] ?? 0
    return {
      id: slice.id,
      label: slice.label,
      share: slice.share,
      targetDoctors,
      samples,
      samplesPerDoctor: targetDoctors > 0 ? samples / targetDoctors : 0,
    }
  },
)

export const SPECIALTY_DEMAND_TOTAL = {
  targetDoctors: SPECIALTY_DEMAND.reduce((sum, row) => sum + row.targetDoctors, 0),
  samples: SPECIALTY_DEMAND.reduce((sum, row) => sum + row.samples, 0),
  share: SPECIALTY_DEMAND.reduce((sum, row) => sum + row.share, 0),
}

/**
 * NOTA: não consta do ESCOPO — a verba do ciclo da campanha. O custo do plano é
 * canônico (10.5); o teto é declarado para que a restrição tenha borda.
 */
export const CYCLE_BUDGET_BRL = 265_000

export const BUDGET_USE_PERCENT = (CYCLE_COST_BRL / CYCLE_BUDGET_BRL) * 100

export type ConstraintStatus = 'ok' | 'tight' | 'blocked'

export type PlanConstraint = {
  readonly id: string
  readonly label: string
  readonly used: number
  readonly limit: number
  readonly unit: 'samples' | 'money'
  readonly status: ConstraintStatus
  readonly note: string
  readonly attestation: Attestation
}

/** Restrições que o plano do ciclo tem de respeitar antes de virar entrega. */
export const PLAN_CONSTRAINTS: readonly PlanConstraint[] = [
  {
    id: 'budget',
    label: 'Verba do ciclo',
    used: CYCLE_COST_BRL,
    limit: CYCLE_BUDGET_BRL,
    unit: 'money',
    status: 'tight',
    note: 'Custo estimado do plano contra a verba aprovada para o ciclo.',
    attestation: combine([SAP, CRM_SFA]),
  },
  {
    id: 'stock',
    label: 'Estoque disponível',
    used: FORECAST_TOTAL_SAMPLES,
    limit: REGION_TOTAL.availableStock,
    unit: 'samples',
    status: 'ok',
    note: 'Demanda prevista contra o estoque de amostras em condição de expedição.',
    attestation: STOCK_ATTESTATION,
  },
  {
    id: 'stockout',
    label: 'Retido por ruptura',
    used: BLOCKED_SAMPLES,
    limit: FORECAST_TOTAL_SAMPLES,
    unit: 'samples',
    status: 'blocked',
    note: `${STOCKOUT_BLOCK.territories} territórios do ${STOCKOUT_BLOCK.region} fora do plano até a reposição. ${STOCKOUT_BLOCK.principle}`,
    attestation: STOCKOUT_BLOCK.attestation,
  },
]

export type PlanningKpi = {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly format: 'integer' | 'percent' | 'money_full'
  readonly attestation: Attestation
}

export const PLANNING_KPIS: readonly PlanningKpi[] = [
  {
    id: 'campaigns',
    label: 'Campanhas no plano',
    value: CAMPAIGNS.length,
    format: 'integer',
    attestation: CRM_SFA,
  },
  {
    id: 'planned-samples',
    label: 'Amostras planejadas no ciclo',
    value: PLANNED_SAMPLES,
    format: 'integer',
    attestation: PLAN_ATTESTATION,
  },
  {
    id: 'target-doctors',
    label: 'Médicos-alvo no plano',
    value: REGION_TOTAL.targetDoctors,
    format: 'integer',
    attestation: PLAN_ATTESTATION,
  },
  {
    id: 'coverage',
    label: 'Cobertura do plano',
    value: REGION_TOTAL.coveragePercent,
    format: 'percent',
    attestation: PLAN_ATTESTATION,
  },
  {
    id: 'cost',
    label: 'Custo estimado do ciclo',
    value: CYCLE_COST_BRL,
    format: 'money_full',
    attestation: combine([SAP, CRM_SFA]),
  },
]

/** Atestados desta tela, para o aviso de fonte atrasada. */
export const PLANNING_ATTESTATIONS: readonly Attestation[] = [
  PLAN_ATTESTATION,
  STOCK_ATTESTATION,
  DEMAND_ATTESTATION,
  FORECAST_ATTESTATION,
  SPECIALTY_DEMAND_ATTESTATION,
]

export { PLAN_ATTESTATION as PLANNING_PLAN_ATTESTATION, STOCK_ATTESTATION as PLANNING_STOCK_ATTESTATION }
