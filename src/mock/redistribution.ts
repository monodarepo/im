import { combine, type Attestation } from '../domain/attestation'
import { formatInteger } from '../domain/format'
import { addDays, formatMonth, HOJE, type IsoDate } from '../domain/today'
import {
  AT_RISK_LOTS,
  daysToExpiry,
  LOTS,
  STOCKOUT_SOURCE_ROUTE,
  UNIT_COST_BRL,
  unitsAtRisk,
  type Lot,
} from './agInventory'
import { TOTAL_EXPIRY_COST_BRL } from './agOverview'
import { ALLOCATION_DECISION_ID, STOCKOUT_BLOCK } from './sampleAllocation'
import { CRM_SFA, NEOGRID_DISTRIBUIDORES, SAP } from './sources'

/**
 * Redistribuição Inteligente (AG, módulo 4.8).
 *
 * A fila não é uma lista de perdas apuradas: é o que ainda dá para recuperar.
 * Cada sugestão nasce de um lote de `agInventory` — os mesmos lotes que a tela
 * de Estoque e Logística mostra — e propõe mandá-lo para quem tem giro para
 * consumi-lo antes do vencimento. Preventivo quer dizer isto: a sugestão sai
 * enquanto o lote ainda vale alguma coisa.
 *
 * A sugestão de maior valor recuperado é o lote que o bloqueio de ruptura
 * deixou parado no Nordeste. Ela não está no topo por redação: está no topo
 * porque o destino com maior giro da rede é justamente o de Losartana, e é o
 * que absorve mais unidades dentro da janela que sobra.
 */

/** Rota da tela de Estoque e Logística, onde o mesmo lote é listado. */
export const INVENTORY_ROUTE = '/ag/estoque'

// ---------------------------------------------------------------------------
// Alçada
// ---------------------------------------------------------------------------

export type AuthorityLevel = 'branch_manager' | 'regional_operations' | 'operations_director'

export const AUTHORITY_ORDER: readonly AuthorityLevel[] = [
  'branch_manager',
  'regional_operations',
  'operations_director',
]

export const AUTHORITY_LABEL: Record<AuthorityLevel, string> = {
  branch_manager: 'Gerência de filial',
  regional_operations: 'Gerência regional de operações',
  operations_director: 'Diretoria de operações',
}

/** Aprovador de cada nível. Personas fictícias, como manda a regra da demonstração. */
export const AUTHORITY_APPROVER: Record<AuthorityLevel, string> = {
  branch_manager: 'Fernanda Lima',
  regional_operations: 'João Pedro',
  operations_director: 'Mariana Santos',
}

/**
 * NOTA: não consta do ESCOPO — os tetos de alçada por valor recuperado.
 * O esquema é o mesmo da governança de preço do RGM: a faixa do valor define
 * quem aprova. Os limites abaixo são declarados e devem vir da política de
 * operações vigente.
 */
export const AUTHORITY_CEILING_BRL: Record<AuthorityLevel, number | null> = {
  branch_manager: 3_000,
  regional_operations: 10_000,
  operations_director: null,
}

export function authorityFor(recoveredValueBrl: number): AuthorityLevel {
  for (const level of AUTHORITY_ORDER) {
    const ceiling = AUTHORITY_CEILING_BRL[level]
    if (ceiling === null || recoveredValueBrl <= ceiling) return level
  }
  return 'operations_director'
}

/**
 * Alçada de quem está operando a tela na demonstração. Acima dela a sugestão
 * não é aprovada aqui: é encaminhada, e a tela diz para quem.
 */
export const USER_AUTHORITY: AuthorityLevel = 'regional_operations'

export function isWithinUserAuthority(level: AuthorityLevel): boolean {
  return AUTHORITY_ORDER.indexOf(level) <= AUTHORITY_ORDER.indexOf(USER_AUTHORITY)
}

// ---------------------------------------------------------------------------
// Destinos
// ---------------------------------------------------------------------------

export type TransferDestination = {
  readonly holderId: string
  readonly holderName: string
  readonly region: string
  /** Giro mensal do mesmo SKU na praça de destino, em unidades por mês. */
  readonly monthlyOutflow: number
  /** Médicos-alvo da praça ainda sem amostra no ciclo corrente. */
  readonly uncoveredTargetDoctors: number
  /** Produto disponível na praça: sem ruptura ativa, a prescrição é atendível. */
  readonly productAvailable: boolean
  /** Prazo de trânsito da origem até o destino, em dias. */
  readonly transitDays: number
  /**
   * Validade do estoque local do mesmo SKU no destino, em dias. Quando existe,
   * é o que garante o FEFO: o lote transferido vence antes e sai antes.
   */
  readonly localStockDaysToExpiry: number | null
}

const SP_LOT = LOTS.find((lot) => lot.holderId === 'filial-sp')

type SuggestionSeed = {
  readonly id: string
  readonly lotId: string
  readonly destination: TransferDestination
}

/**
 * NOTA: não consta do ESCOPO — a praça de destino de cada transferência.
 * O giro de Losartana em São Paulo é o do próprio lote de `agInventory`, não é
 * redigitado. Os giros de Dipirona em MG e de Paracetamol no Sul, os médicos-alvo
 * descobertos e os prazos de trânsito são declarados.
 */
const SEEDS: readonly SuggestionSeed[] = [
  {
    id: 'transfer-ne-sp',
    lotId: 'lot-ne-blocked',
    destination: {
      holderId: 'filial-sp',
      holderName: 'Filial São Paulo',
      region: 'SP Capital',
      monthlyOutflow: SP_LOT?.monthlyOutflow ?? 0,
      uncoveredTargetDoctors: 1_240,
      productAvailable: true,
      transitDays: 3,
      localStockDaysToExpiry: SP_LOT ? daysToExpiry(SP_LOT) : null,
    },
  },
  {
    id: 'transfer-co-mg',
    lotId: 'lot-operator',
    destination: {
      holderId: 'filial-mg',
      holderName: 'Filial Minas Gerais',
      region: 'MG',
      monthlyOutflow: 3_400,
      uncoveredTargetDoctors: 780,
      productAvailable: true,
      transitDays: 5,
      localStockDaysToExpiry: null,
    },
  },
  {
    id: 'transfer-rep-sul',
    lotId: 'lot-rep-sul',
    destination: {
      holderId: 'filial-sul',
      holderName: 'Filial Sul',
      region: 'Sul',
      monthlyOutflow: 2_600,
      uncoveredTargetDoctors: 410,
      productAvailable: true,
      transitDays: 2,
      localStockDaysToExpiry: null,
    },
  },
]

// ---------------------------------------------------------------------------
// Sugestões
// ---------------------------------------------------------------------------

export type TransferSuggestion = {
  readonly id: string
  /** O lote de origem, o mesmo objeto que a tela de Estoque lista. */
  readonly lot: Lot
  readonly destination: TransferDestination
  readonly daysToExpiry: number
  /** Dias de venda no destino depois do trânsito. */
  readonly windowDays: number
  /** Unidades que o destino consome dentro da janela, no giro corrente. */
  readonly absorptionUnits: number
  readonly unitsAtRisk: number
  readonly unitsToTransfer: number
  readonly recoveredValueBrl: number
  /** O que sobra em risco mesmo com a transferência feita. */
  readonly residualUnitsAtRisk: number
  readonly residualValueBrl: number
  readonly authority: AuthorityLevel
  readonly blockedByStockout: boolean
  /** Rota do lote na tela de Estoque e Logística. */
  readonly inventoryRoute: string
  /** Rota do diagnóstico do HUB que originou o bloqueio; `null` sem bloqueio. */
  readonly stockoutSourceRoute: string | null
  readonly stockoutSourceLabel: string | null
  /** Por que este destino, e não outro. */
  readonly reasons: readonly string[]
  readonly decisionId: string
  readonly attestation: Attestation
}

const TRANSFER_ATTESTATION = combine([SAP, CRM_SFA])

/** O bloqueio traz junto o atestado do diagnóstico do HUB — o elo mais fraco. */
const BLOCKED_TRANSFER_ATTESTATION = combine([SAP, CRM_SFA, STOCKOUT_BLOCK.attestation])

function buildReasons(
  lot: Lot,
  destination: TransferDestination,
  unitsToTransfer: number,
  windowDays: number,
): readonly string[] {
  const consumptionDays =
    destination.monthlyOutflow > 0
      ? Math.ceil((unitsToTransfer / destination.monthlyOutflow) * 30)
      : windowDays

  const reasons: string[] = [
    `Giro de ${formatInteger(destination.monthlyOutflow)} unid./mês no destino: consome as ${formatInteger(unitsToTransfer)} unidades em ${formatInteger(consumptionDays)} dias, dentro da janela de ${formatInteger(windowDays)}.`,
    `${formatInteger(destination.uncoveredTargetDoctors)} médicos-alvo da praça ainda sem amostra no ciclo — a transferência vira cobertura, não estoque parado.`,
  ]

  if (destination.productAvailable) {
    reasons.push(
      'Produto disponível na praça de destino: sem ruptura ativa, a prescrição gerada é atendível na farmácia.',
    )
  }

  if (destination.localStockDaysToExpiry !== null) {
    reasons.push(
      `O estoque local do mesmo produto só vence em ${formatInteger(destination.localStockDaysToExpiry)} dias; por FEFO o lote transferido sai primeiro e o risco não é apenas mudado de lugar.`,
    )
  }

  if (lot.blockedByStockout) {
    reasons.push(
      `Origem bloqueada — ${STOCKOUT_BLOCK.reason} O lote não volta a girar no ${lot.region} enquanto a reposição não acontecer.`,
    )
  }

  return reasons
}

function buildSuggestion(seed: SuggestionSeed, lot: Lot): TransferSuggestion {
  const { destination } = seed
  const expiry = daysToExpiry(lot)
  const windowDays = expiry - destination.transitDays
  const absorptionUnits = Math.round((destination.monthlyOutflow * windowDays) / 30)
  const atRisk = unitsAtRisk(lot)
  const unitsToTransfer = Math.max(0, Math.min(atRisk, absorptionUnits))
  const recoveredValueBrl = Math.round(unitsToTransfer * UNIT_COST_BRL)
  const residualUnitsAtRisk = atRisk - unitsToTransfer

  return {
    id: seed.id,
    lot,
    destination,
    daysToExpiry: expiry,
    windowDays,
    absorptionUnits,
    unitsAtRisk: atRisk,
    unitsToTransfer,
    recoveredValueBrl,
    residualUnitsAtRisk,
    residualValueBrl: Math.round(residualUnitsAtRisk * UNIT_COST_BRL),
    authority: authorityFor(recoveredValueBrl),
    blockedByStockout: lot.blockedByStockout,
    inventoryRoute: INVENTORY_ROUTE,
    stockoutSourceRoute: lot.blockedByStockout ? STOCKOUT_SOURCE_ROUTE : null,
    stockoutSourceLabel: lot.blockedByStockout ? STOCKOUT_BLOCK.sourceLabel : null,
    reasons: buildReasons(lot, destination, unitsToTransfer, windowDays),
    decisionId: ALLOCATION_DECISION_ID,
    attestation: lot.blockedByStockout ? BLOCKED_TRANSFER_ATTESTATION : TRANSFER_ATTESTATION,
  }
}

const DRAFT: readonly TransferSuggestion[] = SEEDS.flatMap((seed) => {
  const lot = AT_RISK_LOTS.find((candidate) => candidate.id === seed.lotId)
  return lot ? [buildSuggestion(seed, lot)] : []
})

/** A fila é ordenada por valor recuperado — é a única ordem que a tela usa. */
export const TRANSFER_SUGGESTIONS: readonly TransferSuggestion[] = [...DRAFT].sort(
  (a, b) => b.recoveredValueBrl - a.recoveredValueBrl,
)

/**
 * A sugestão de maior valor recuperado da fila. O vínculo com o lote parado
 * pelo bloqueio de ruptura é o campo `lot`: é o mesmo objeto de `BLOCKED_LOT`.
 */
export const TOP_SUGGESTION: TransferSuggestion | undefined = TRANSFER_SUGGESTIONS[0]

/** A sugestão que nasce do bloqueio de ruptura, achada pelo dado e não pela posição. */
export const BLOCKED_LOT_SUGGESTION: TransferSuggestion | undefined = TRANSFER_SUGGESTIONS.find(
  (suggestion) => suggestion.blockedByStockout,
)

export const OPEN_SUGGESTIONS = TRANSFER_SUGGESTIONS.length

export const RECOVERABLE_UNITS = TRANSFER_SUGGESTIONS.reduce(
  (sum, suggestion) => sum + suggestion.unitsToTransfer,
  0,
)

export const RECOVERABLE_VALUE_BRL = TRANSFER_SUGGESTIONS.reduce(
  (sum, suggestion) => sum + suggestion.recoveredValueBrl,
  0,
)

export const SUGGESTIONS_ABOVE_USER_AUTHORITY = TRANSFER_SUGGESTIONS.filter(
  (suggestion) => !isWithinUserAuthority(suggestion.authority),
).length

export const RESIDUAL_VALUE_BRL = TRANSFER_SUGGESTIONS.reduce(
  (sum, suggestion) => sum + suggestion.residualValueBrl,
  0,
)

export const REDISTRIBUTION_DECISION_ID = ALLOCATION_DECISION_ID

export const REDISTRIBUTION_ATTESTATION = combine(
  TRANSFER_SUGGESTIONS.map((suggestion) => suggestion.attestation),
)

// ---------------------------------------------------------------------------
// Perda evitada × perda realizada
// ---------------------------------------------------------------------------

/**
 * NOTA: não consta do ESCOPO — a perda já evitada no ciclo corrente.
 * É o valor das transferências aprovadas e concluídas antes do vencimento;
 * distinto de `RECOVERABLE_VALUE_BRL`, que é a fila ainda em aberto.
 */
export const AVOIDED_LOSS_CYCLE_BRL = 19_460

/** Primeiro dia do mês da data, por aritmética de calendário — sem `Date`. */
function monthStart(date: IsoDate): IsoDate {
  let cursor = date
  while (formatMonth(addDays(cursor, -1)) === formatMonth(cursor)) {
    cursor = addDays(cursor, -1)
  }
  return cursor
}

function monthAnchors(count: number): readonly IsoDate[] {
  const anchors: IsoDate[] = [monthStart(HOJE)]
  while (anchors.length < count) {
    const oldest = anchors[0]
    if (oldest === undefined) break
    anchors.unshift(monthStart(addDays(oldest, -1)))
  }
  return anchors
}

export type LossPoint = {
  readonly month: IsoDate
  /** Rótulo do eixo, ex.: `jul/26`. */
  readonly label: string
  /** Perda evitada por redistribuição no mês, em reais. */
  readonly avoidedBrl: number
  /** Perda consumada por vencimento no mês, em reais. */
  readonly realizedBrl: number
}

/**
 * NOTA: não consta do ESCOPO — a série histórica dos cinco meses anteriores.
 * O mês corrente não é declarado: a perda realizada é o total apurado em
 * `agOverview`, e a evitada é o ciclo acima. O que a série mostra é a inversão
 * de curva — perda consumada caindo à medida que a fila preventiva cresce.
 */
const PREVIOUS_MONTHS: readonly { avoidedBrl: number; realizedBrl: number }[] = [
  { avoidedBrl: 0, realizedBrl: 88_600 },
  { avoidedBrl: 4_820, realizedBrl: 84_310 },
  { avoidedBrl: 9_360, realizedBrl: 77_950 },
  { avoidedBrl: 13_240, realizedBrl: 68_420 },
  { avoidedBrl: 16_705, realizedBrl: 61_180 },
]

const LOSS_MONTHS = monthAnchors(PREVIOUS_MONTHS.length + 1)

export const LOSS_SERIES: readonly LossPoint[] = LOSS_MONTHS.map((month, index) => {
  const previous = PREVIOUS_MONTHS[index]
  return {
    month,
    label: formatMonth(month),
    avoidedBrl: previous?.avoidedBrl ?? AVOIDED_LOSS_CYCLE_BRL,
    realizedBrl: previous?.realizedBrl ?? TOTAL_EXPIRY_COST_BRL,
  }
})

export const REALIZED_LOSS_CYCLE_BRL = TOTAL_EXPIRY_COST_BRL

const FIRST_POINT = LOSS_SERIES[0]
const LAST_POINT = LOSS_SERIES[LOSS_SERIES.length - 1]

/** Variação da perda consumada entre o primeiro e o último mês da série, em %. */
export const REALIZED_LOSS_TREND_PERCENT =
  FIRST_POINT && LAST_POINT && FIRST_POINT.realizedBrl > 0
    ? Math.round(((LAST_POINT.realizedBrl - FIRST_POINT.realizedBrl) / FIRST_POINT.realizedBrl) * 1000) /
      10
    : 0

export const LOSS_ATTESTATION = combine([SAP, CRM_SFA, NEOGRID_DISTRIBUIDORES])
