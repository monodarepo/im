import { combine, isStale, type Attestation } from '../domain/attestation'
import { addDays, daysAgo, daysBetween, formatMonth, HOJE, type IsoDate } from '../domain/today'
import {
  BLOCKED_LOT,
  HOLDER_KIND_LABEL,
  LOTS,
  lotStatus,
  TOTAL_UNITS,
  TOTAL_UNITS_AT_RISK,
  TOTAL_VIRTUAL_ON_HAND,
  UNIT_COST_BRL,
  unitsAtRisk,
  VIRTUAL_STOCK,
  type HolderKind,
  type Lot,
  type LotStatus,
} from './agInventory'
import { CRM_SFA, NEOGRID_DISTRIBUIDORES, SAP } from './sources'

/**
 * Fluxo logístico da amostra (AG, módulo 4.5).
 *
 * Complementa `agInventory.ts`: os lotes dizem onde a amostra está parada, este
 * módulo diz como ela se move — o que está em trânsito, quanto tempo cada
 * trecho leva contra o prazo acordado e como o saldo veio caindo ciclo a ciclo.
 * Nada aqui pertence à Redistribuição: a proposta de transferência é decisão da
 * outra tela, esta só mostra o estado que a torna necessária.
 */

/** Ordem de leitura da carteira de lotes: o mais perto de virar perda primeiro. */
const STATUS_RANK: Record<LotStatus, number> = { at_risk: 0, watch: 1, healthy: 2 }

export const CRITICAL_LOTS: readonly Lot[] = [...LOTS].sort((a, b) => {
  const byStatus = STATUS_RANK[lotStatus(a)] - STATUS_RANK[lotStatus(b)]
  if (byStatus !== 0) return byStatus
  const byRisk = unitsAtRisk(b) - unitsAtRisk(a)
  if (byRisk !== 0) return byRisk
  return daysBetween(HOJE, a.expiresOn) - daysBetween(HOJE, b.expiresOn)
})

export type HolderKindBalance = {
  readonly kind: HolderKind
  readonly label: string
  readonly holders: number
  readonly units: number
  readonly unitsAtRisk: number
  readonly sharePercent: number
  readonly regions: readonly string[]
}

const HOLDER_KIND_ORDER: readonly HolderKind[] = ['branch', 'operator', 'rep']

export const BALANCE_BY_HOLDER_KIND: readonly HolderKindBalance[] = HOLDER_KIND_ORDER.map((kind) => {
  const lots = LOTS.filter((lot) => lot.holderKind === kind)
  const units = lots.reduce((sum, lot) => sum + lot.units, 0)
  return {
    kind,
    label: HOLDER_KIND_LABEL[kind],
    holders: new Set(lots.map((lot) => lot.holderId)).size,
    units,
    unitsAtRisk: lots.reduce((sum, lot) => sum + unitsAtRisk(lot), 0),
    sharePercent: Math.round((units / TOTAL_UNITS) * 1000) / 10,
    regions: [...new Set(lots.map((lot) => lot.region))],
  }
})

export type RegionBalance = {
  readonly region: string
  readonly units: number
  readonly unitsAtRisk: number
}

export const BALANCE_BY_REGION: readonly RegionBalance[] = [...new Set(LOTS.map((lot) => lot.region))]
  .map((region) => {
    const lots = LOTS.filter((lot) => lot.region === region)
    return {
      region,
      units: lots.reduce((sum, lot) => sum + lot.units, 0),
      unitsAtRisk: lots.reduce((sum, lot) => sum + unitsAtRisk(lot), 0),
    }
  })
  .sort((a, b) => b.units - a.units)

export type BalancePoint = {
  readonly id: string
  readonly cycleStart: IsoDate
  readonly label: string
  readonly units: number
  readonly unitsAtRisk: number
}

/**
 * NOTA: não consta do ESCOPO — a série histórica de saldo por ciclo.
 * Os cinco ciclos anteriores são declarados; o ciclo corrente não é digitado,
 * sai da soma dos lotes, para que gráfico e tabela nunca divirjam.
 */
const PREVIOUS_CYCLES: readonly { readonly daysBack: number; readonly units: number; readonly unitsAtRisk: number }[] = [
  { daysBack: 152, units: 71_200, unitsAtRisk: 9_400 },
  { daysBack: 122, units: 68_400, unitsAtRisk: 11_200 },
  { daysBack: 91, units: 64_900, unitsAtRisk: 12_900 },
  { daysBack: 61, units: 61_300, unitsAtRisk: 14_600 },
  { daysBack: 30, units: 57_400, unitsAtRisk: 16_300 },
]

export const BALANCE_SERIES: readonly BalancePoint[] = [
  ...PREVIOUS_CYCLES.map((cycle, index) => {
    const cycleStart = addDays(HOJE, -cycle.daysBack)
    return {
      id: `cycle-${index}`,
      cycleStart,
      label: formatMonth(cycleStart),
      units: cycle.units,
      unitsAtRisk: cycle.unitsAtRisk,
    }
  }),
  {
    id: 'cycle-current',
    cycleStart: HOJE,
    label: formatMonth(HOJE),
    units: TOTAL_UNITS,
    unitsAtRisk: TOTAL_UNITS_AT_RISK,
  },
]

const PREVIOUS_CYCLE = BALANCE_SERIES[BALANCE_SERIES.length - 2]

/** Variação percentual das unidades em risco contra o ciclo anterior. */
export const UNITS_AT_RISK_DELTA_PERCENT = PREVIOUS_CYCLE
  ? Math.round(((TOTAL_UNITS_AT_RISK / PREVIOUS_CYCLE.unitsAtRisk - 1) * 100) * 10) / 10
  : 0

export const VALUE_AT_RISK_DELTA_BRL = PREVIOUS_CYCLE
  ? Math.round((TOTAL_UNITS_AT_RISK - PREVIOUS_CYCLE.unitsAtRisk) * UNIT_COST_BRL)
  : 0

export const AT_RISK_SHARE_PERCENT = Math.round((TOTAL_UNITS_AT_RISK / TOTAL_UNITS) * 1000) / 10

/**
 * NOTA: não consta do ESCOPO — a duração do ciclo de campo.
 * É o prazo que separa "amostra a caminho do médico" de "amostra sem baixa":
 * passado um ciclo sem registro de entrega, o saldo virou pendência.
 */
export const FIELD_CYCLE_DAYS = 28

export const TOTAL_VIRTUAL_DELIVERED = VIRTUAL_STOCK.reduce((sum, item) => sum + item.delivered, 0)

/** Parcela do estoque em poder do representante que já passou de um ciclo sem baixa. */
export const VIRTUAL_STALE_SHARE_PERCENT =
  Math.round(
    (VIRTUAL_STOCK.reduce((sum, item) => sum + item.stale, 0) / TOTAL_VIRTUAL_ON_HAND) * 1000,
  ) / 10

export function staleSharePercent(holderId: string): number {
  const holder = VIRTUAL_STOCK.find((item) => item.holderId === holderId)
  if (!holder || holder.onHand === 0) return 0
  return Math.round((holder.stale / holder.onHand) * 1000) / 10
}

export type LaneStatus = 'on_time' | 'late' | 'held'

export const LANE_STATUS_LABEL: Record<LaneStatus, string> = {
  on_time: 'No prazo',
  late: 'Acima do prazo',
  held: 'Suspensa',
}

export type TransitLane = {
  readonly id: string
  readonly origin: string
  readonly destination: string
  readonly region: string
  readonly unitsInTransit: number
  /** Tempo médio observado no trecho, em dias. */
  readonly transitDays: number
  /** Prazo acordado com o operador, em dias. */
  readonly slaDays: number
  readonly lastDispatchOn: IsoDate
  readonly held: boolean
  readonly note: string | null
}

/**
 * NOTA: não consta do ESCOPO — os trechos logísticos, os volumes em trânsito e
 * os tempos por trecho. O trecho do Nordeste está suspenso por consequência do
 * bloqueio de ruptura, não por decisão logística.
 */
export const TRANSIT_LANES: readonly TransitLane[] = [
  {
    id: 'lane-cd-sp',
    origin: 'CD Anápolis',
    destination: 'Filial São Paulo',
    region: 'SP Capital',
    unitsInTransit: 4_200,
    transitDays: 3,
    slaDays: 4,
    lastDispatchOn: daysAgo(2),
    held: false,
    note: null,
  },
  {
    id: 'lane-cd-ne',
    origin: 'CD Anápolis',
    destination: 'Filial Nordeste',
    region: 'Nordeste',
    unitsInTransit: 0,
    transitDays: 7,
    slaDays: 5,
    lastDispatchOn: daysAgo(23),
    held: true,
    note: 'Expedição suspensa desde o bloqueio de ruptura — nada entra e nada sai da filial.',
  },
  {
    id: 'lane-cd-operador',
    origin: 'CD Anápolis',
    destination: 'Operador Centro-Oeste',
    region: 'Centro-Oeste',
    unitsInTransit: 2_600,
    transitDays: 5,
    slaDays: 4,
    lastDispatchOn: daysAgo(4),
    held: false,
    note: 'Trecho acima do prazo há três expedições seguidas.',
  },
  {
    id: 'lane-sp-reps',
    origin: 'Filial São Paulo',
    destination: 'Representantes SP',
    region: 'SP Capital',
    unitsInTransit: 1_900,
    transitDays: 2,
    slaDays: 3,
    lastDispatchOn: daysAgo(1),
    held: false,
    note: null,
  },
  {
    id: 'lane-rj-reps',
    origin: 'Filial Rio de Janeiro',
    destination: 'Representantes RJ',
    region: 'RJ',
    unitsInTransit: 780,
    transitDays: 3,
    slaDays: 3,
    lastDispatchOn: daysAgo(3),
    held: false,
    note: null,
  },
]

export function laneStatus(lane: TransitLane): LaneStatus {
  if (lane.held) return 'held'
  return lane.transitDays > lane.slaDays ? 'late' : 'on_time'
}

export const TOTAL_IN_TRANSIT_UNITS = TRANSIT_LANES.reduce(
  (sum, lane) => sum + lane.unitsInTransit,
  0,
)

const MOVING_LANES = TRANSIT_LANES.filter((lane) => lane.unitsInTransit > 0)

/** Tempo médio de trânsito ponderado pelo volume que passa em cada trecho. */
export const AVERAGE_TRANSIT_DAYS =
  Math.round(
    (MOVING_LANES.reduce((sum, lane) => sum + lane.transitDays * lane.unitsInTransit, 0) /
      (TOTAL_IN_TRANSIT_UNITS || 1)) *
      10,
  ) / 10

export const LANES_OVER_SLA = TRANSIT_LANES.filter((lane) => laneStatus(lane) === 'late').length

export type MovementKind = 'inbound' | 'transfer' | 'delivery' | 'block' | 'writeoff'

export const MOVEMENT_KIND_LABEL: Record<MovementKind, string> = {
  inbound: 'Entrada',
  transfer: 'Transferência',
  delivery: 'Baixa de entrega',
  block: 'Bloqueio',
  writeoff: 'Baixa por avaria',
}

export type Movement = {
  readonly id: string
  readonly kind: MovementKind
  readonly description: string
  readonly units: number
  readonly holderName: string
  readonly occurredOn: IsoDate
}

/** Dia em que o bloqueio de ruptura imobilizou o lote do Nordeste. */
export const BLOCKED_SINCE = daysAgo(23)

export const BLOCKED_HELD_DAYS = daysBetween(BLOCKED_SINCE, HOJE)

const BLOCKED_UNITS = BLOCKED_LOT?.units ?? 0

/**
 * NOTA: não consta do ESCOPO — o extrato de movimentações do ciclo.
 * As baixas de entrega não são redigitadas: somam o que os representantes já
 * registraram em `VIRTUAL_STOCK`.
 */
export const MOVEMENTS: readonly Movement[] = [
  {
    id: 'mov-delivery',
    kind: 'delivery',
    description: 'Entregas registradas por representantes no ciclo corrente',
    units: TOTAL_VIRTUAL_DELIVERED,
    holderName: 'Força de campo',
    occurredOn: daysAgo(1),
  },
  {
    id: 'mov-inbound-sp',
    kind: 'inbound',
    description: 'Recebimento de lote de produção na filial',
    units: 12_500,
    holderName: 'Filial São Paulo',
    occurredOn: daysAgo(6),
  },
  {
    id: 'mov-writeoff',
    kind: 'writeoff',
    description: 'Unidades avariadas no descarregamento, baixadas do saldo',
    units: 320,
    holderName: 'Operador Centro-Oeste',
    occurredOn: daysAgo(9),
  },
  {
    id: 'mov-transfer-co',
    kind: 'transfer',
    description: 'Transferência do CD para o operador logístico',
    units: 3_200,
    holderName: 'Operador Centro-Oeste',
    occurredOn: daysAgo(14),
  },
  {
    id: 'mov-block-ne',
    kind: 'block',
    description: 'Lote LT-2026-0412 imobilizado pelo bloqueio de ruptura do Nordeste',
    units: BLOCKED_UNITS,
    holderName: 'Filial Nordeste',
    occurredOn: BLOCKED_SINCE,
  },
]

/** Rota da Redistribuição Inteligente (AG 4.8), destino da sugestão de transferência. */
export const REDISTRIBUTION_ROUTE = '/ag/redistribuicao'

/** Decisão do AG que carrega a transferência proposta para o lote retido. */
export const TRANSFER_DECISION_ID = 'D-2026-0004'

/**
 * Leitura da fonte de trânsito.
 *
 * O arquivo de rastreamento dos distribuidores parou de chegar: o estoque
 * continua íntegro pelo SAP, mas o que está em estrada passa a ser estimativa.
 * A tela segue operável — só deixa de se apresentar como fresca no que depende
 * dessa fonte.
 */
export const TRANSIT_FEED: Attestation = {
  source: ['distribuidores'],
  asOf: daysAgo(9),
  lagDays: 4,
  confidence: 'low',
  quality: 'partial',
  method: 'estimated',
}

export const TRANSIT_ATTESTATION = combine([SAP, NEOGRID_DISTRIBUIDORES, TRANSIT_FEED])

export const MOVEMENT_ATTESTATION = combine([SAP, CRM_SFA])

export const FIELD_STOCK_ATTESTATION = combine([CRM_SFA, SAP])

export const DEGRADED_ATTESTATIONS: readonly Attestation[] = [TRANSIT_FEED].filter(isStale)
