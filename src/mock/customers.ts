import type { UfCode } from '../assets/brazil-uf'
import { combine, isStale, type Attestation } from '../domain/attestation'
import { daysAgo } from '../domain/today'
import { SELLOUT_TOTAL_BRL } from './kpis'
import { NEOGRID, NEOGRID_DISTRIBUIDORES, SAP, SCANNTECH } from './sources'

/**
 * Cliente e Canal 360° (módulo 1.4 do ESCOPO).
 *
 * A tela existe para um contraste só: o estoque parece confortável no centro de
 * distribuição enquanto a ponta está em ruptura. O mesmo produto, a mesma conta,
 * duas leituras que nunca são olhadas juntas — e é do vão entre elas que saem a
 * reconciliação sell-in × sell-out × estoque e o alerta de canal paralelo.
 *
 * Origem dos números: o sell-out do período e a ruptura estimada são canônicos
 * (seção 10 do ESCOPO). Os valores por conta, os dias de estoque e o sell-in
 * faturado não constam do ESCOPO e estão marcados um a um com `NOTA:` abaixo.
 * Todo agregado desta tela é calculado a partir dessas parcelas — nenhum total
 * é digitado à mão.
 */

/**
 * NOTA: não consta do ESCOPO — recorte de grandes redes com a leitura de ponta
 * parada. Espelha o estado bloqueado já registrado em `dataQuality.ts`: mesma
 * fonte, mesma data de captura, mesma confiança rebaixada. É essa parcela que
 * degrada a leitura de loja sem derrubar a tela.
 */
const GRANDES_REDES_STORE: Attestation = {
  source: ['grandes_redes'],
  asOf: daysAgo(12),
  lagDays: 5,
  confidence: 'low',
  quality: 'degraded',
  method: 'reprocessed',
}

/** Estoque no CD: faturamento do ERP conferido contra a posição do distribuidor. */
export const DC_ATTESTATION: Attestation = combine([SAP, NEOGRID])

/**
 * Estoque na ponta: depende da leitura de loja das grandes redes, que está
 * parada. O elo mais fraco desce a confiança do lado direito da tela — de
 * propósito, porque é exatamente o lado que sustenta a acusação de ruptura.
 */
export const STORE_ATTESTATION: Attestation = combine([
  NEOGRID,
  NEOGRID_DISTRIBUIDORES,
  GRANDES_REDES_STORE,
])

// ---------------------------------------------------------------------------
// 1. Cruzamento CD × loja
// ---------------------------------------------------------------------------

export type AccountKind = 'rede' | 'distribuidor'

export const ACCOUNT_KIND_LABEL: Record<AccountKind, string> = {
  rede: 'Rede',
  distribuidor: 'Distribuidor',
}

export type Account = {
  readonly id: string
  readonly name: string
  readonly kind: AccountKind
  readonly uf: UfCode
  /** Pontos de venda atendidos pela conta. Pondera todos os agregados. */
  readonly pointsOfSale: number
  /** Dias de estoque (DDE) no centro de distribuição da conta. */
  readonly dcCoverageDays: number
  /** Dias de estoque (DDE) na ponta, medidos na gôndola. */
  readonly storeCoverageDays: number
  readonly storeStockoutPercent: number
  /** Variação da ruptura na ponta, em pontos percentuais. */
  readonly storeStockoutDeltaPoints: number
  /** `true` quando a conta entra no recorte de ruptura acima de 10%. */
  readonly inStockoutAlert: boolean
}

/**
 * NOTA: não consta do ESCOPO — carteira de contas do recorte, com nomes
 * fictícios. Os pontos de venda, o DDE de CD e de loja e a ruptura por conta
 * foram declarados aqui para tornar o cruzamento demonstrável.
 *
 * As três contas do Nordeste reproduzem o diagnóstico canônico — ruptura acima
 * de 10% em três estados da região; as duas do Sul e do Centro-Oeste ficam
 * abaixo da ruptura estimada nacional e servem de linha de base.
 */
export const ACCOUNTS: readonly Account[] = [
  {
    id: 'rede-farma-nordeste',
    name: 'Rede Farma Nordeste',
    kind: 'rede',
    uf: 'BA',
    pointsOfSale: 412,
    dcCoverageDays: 36,
    storeCoverageDays: 3.4,
    storeStockoutPercent: 13.8,
    storeStockoutDeltaPoints: 4.9,
    inStockoutAlert: true,
  },
  {
    id: 'rede-popular-agreste',
    name: 'Rede Popular do Agreste',
    kind: 'rede',
    uf: 'PE',
    pointsOfSale: 268,
    dcCoverageDays: 33,
    storeCoverageDays: 4.1,
    storeStockoutPercent: 12.1,
    storeStockoutDeltaPoints: 3.6,
    inStockoutAlert: true,
  },
  {
    id: 'distribuidor-norte-nordeste',
    name: 'Distribuidor Norte-Nordeste',
    kind: 'distribuidor',
    uf: 'CE',
    pointsOfSale: 194,
    dcCoverageDays: 41,
    storeCoverageDays: 2.8,
    storeStockoutPercent: 11.4,
    storeStockoutDeltaPoints: 3.1,
    inStockoutAlert: true,
  },
  {
    id: 'rede-farma-sul',
    name: 'Rede Farma Sul',
    kind: 'rede',
    uf: 'RS',
    pointsOfSale: 356,
    dcCoverageDays: 29,
    storeCoverageDays: 14.2,
    storeStockoutPercent: 5.6,
    storeStockoutDeltaPoints: -1.4,
    inStockoutAlert: false,
  },
  {
    id: 'distribuidor-centro-oeste',
    name: 'Distribuidor Centro-Oeste',
    kind: 'distribuidor',
    uf: 'GO',
    pointsOfSale: 221,
    dcCoverageDays: 31,
    storeCoverageDays: 12.7,
    storeStockoutPercent: 6.2,
    storeStockoutDeltaPoints: -0.9,
    inStockoutAlert: false,
  },
]

/**
 * NOTA: não consta do ESCOPO — faixas operacionais de dias de estoque. O CD
 * trabalha com um mês de cobertura; a gôndola, com duas a três semanas. São as
 * faixas que dizem se um DDE é saudável, e sem elas o número não tem leitura.
 */
export const DC_TARGET_DAYS = { min: 21, max: 45 } as const
export const STORE_TARGET_DAYS = { min: 12, max: 20 } as const

/**
 * NOTA: não consta do ESCOPO — variação do DDE contra o período anterior, em
 * cada elo. O CD ganhou cobertura enquanto a ponta perdeu quase um quarto da
 * dela: é essa tesoura que a tela precisa mostrar.
 */
export const DC_COVERAGE_DELTA_PERCENT = 2.4
export const STORE_COVERAGE_DELTA_PERCENT = -23.6

/** Ruptura estimada nacional (seção 10 do ESCOPO), linha de base do recorte. */
export const NATIONAL_STOCKOUT_PERCENT = 7.3
export const NATIONAL_STOCKOUT_DELTA_POINTS = -1.2

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function weightedBy(
  accounts: readonly Account[],
  metric: (account: Account) => number,
  decimals: number,
): number {
  const weight = accounts.reduce((sum, account) => sum + account.pointsOfSale, 0)
  if (weight === 0) return 0
  const total = accounts.reduce(
    (sum, account) => sum + metric(account) * account.pointsOfSale,
    0,
  )
  return round(total / weight, decimals)
}

export const ALERT_ACCOUNTS: readonly Account[] = ACCOUNTS.filter(
  (account) => account.inStockoutAlert,
)

export const TOTAL_POINTS_OF_SALE = ACCOUNTS.reduce(
  (sum, account) => sum + account.pointsOfSale,
  0,
)

export const ALERT_POINTS_OF_SALE = ALERT_ACCOUNTS.reduce(
  (sum, account) => sum + account.pointsOfSale,
  0,
)

/** Lado do cruzamento: o mesmo estoque visto no CD e visto na gôndola. */
export type ChannelTier = {
  readonly id: 'dc' | 'store'
  readonly label: string
  readonly description: string
  readonly coverageDays: number
  readonly coverageDeltaPercent: number
  readonly targetMinDays: number
  readonly targetMaxDays: number
  readonly statusLabel: string
  readonly healthy: boolean
  readonly attestation: Attestation
}

const DC_COVERAGE_DAYS = weightedBy(ACCOUNTS, (account) => account.dcCoverageDays, 1)
const STORE_COVERAGE_DAYS = weightedBy(ACCOUNTS, (account) => account.storeCoverageDays, 1)

export const DC_TIER: ChannelTier = {
  id: 'dc',
  label: 'Centro de distribuição',
  description: 'Cobertura média ponderada pelos pontos de venda atendidos',
  coverageDays: DC_COVERAGE_DAYS,
  coverageDeltaPercent: DC_COVERAGE_DELTA_PERCENT,
  targetMinDays: DC_TARGET_DAYS.min,
  targetMaxDays: DC_TARGET_DAYS.max,
  statusLabel: 'Dentro da faixa',
  healthy: DC_COVERAGE_DAYS >= DC_TARGET_DAYS.min && DC_COVERAGE_DAYS <= DC_TARGET_DAYS.max,
  attestation: DC_ATTESTATION,
}

export const STORE_TIER: ChannelTier = {
  id: 'store',
  label: 'Ponta (loja)',
  description: 'Cobertura média ponderada medida na gôndola',
  coverageDays: STORE_COVERAGE_DAYS,
  coverageDeltaPercent: STORE_COVERAGE_DELTA_PERCENT,
  targetMinDays: STORE_TARGET_DAYS.min,
  targetMaxDays: STORE_TARGET_DAYS.max,
  statusLabel: 'Abaixo da faixa',
  healthy:
    STORE_COVERAGE_DAYS >= STORE_TARGET_DAYS.min && STORE_COVERAGE_DAYS <= STORE_TARGET_DAYS.max,
  attestation: STORE_ATTESTATION,
}

export const CHANNEL_TIERS: readonly ChannelTier[] = [DC_TIER, STORE_TIER]

/** Vão entre os dois elos, em dias. É o número que resume o painel. */
export const COVERAGE_GAP_DAYS = round(DC_COVERAGE_DAYS - STORE_COVERAGE_DAYS, 1)

/** Ruptura na ponta dentro do recorte em alerta — os três estados do Nordeste. */
export const ALERT_STOCKOUT_PERCENT = weightedBy(
  ALERT_ACCOUNTS,
  (account) => account.storeStockoutPercent,
  1,
)

export const ALERT_STOCKOUT_DELTA_POINTS = weightedBy(
  ALERT_ACCOUNTS,
  (account) => account.storeStockoutDeltaPoints,
  1,
)

/** Distância entre a ruptura do recorte e a ruptura estimada nacional. */
export const ALERT_STOCKOUT_SPREAD_POINTS = round(
  ALERT_STOCKOUT_PERCENT - NATIONAL_STOCKOUT_PERCENT,
  1,
)

/**
 * Impacto financeiro da ruptura no Nordeste (seção 10 do ESCOPO) e a decisão
 * que já carrega o caso. O painel referencia a decisão existente em vez de
 * abrir uma paralela.
 */
export const STOCKOUT_IMPACT_BRL = 2_100_000
export const STOCKOUT_DECISION_ID = 'D-2026-0005'

export function accountCoverageGap(account: Account): number {
  return round(account.dcCoverageDays - account.storeCoverageDays, 1)
}

// ---------------------------------------------------------------------------
// 2. Reconciliação sell-in × sell-out × estoque
// ---------------------------------------------------------------------------

/**
 * NOTA: não consta do ESCOPO — sell-in faturado do período e variação de
 * estoque no canal. Os dois entram para que a reconciliação tenha as três
 * pernas; o sell-out apurado é o canônico da seção 10.
 */
export const SELL_IN_BRL = 271_900_000
export const CHANNEL_STOCK_CHANGE_BRL = 9_400_000

/** Sell-out apurado (seção 10 do ESCOPO). */
export const SELL_OUT_BRL = SELLOUT_TOTAL_BRL

/** O que o sell-in menos a retenção de estoque deveria ter virado em gôndola. */
export const EXPECTED_SELL_OUT_BRL = SELL_IN_BRL - CHANNEL_STOCK_CHANGE_BRL

/** Negativo: saiu mais do canal do que a leitura de sell-out encontrou. */
export const RECONCILIATION_GAP_BRL = SELL_OUT_BRL - EXPECTED_SELL_OUT_BRL

export const RECONCILIATION_GAP_PERCENT = round(
  (Math.abs(RECONCILIATION_GAP_BRL) / SELL_IN_BRL) * 100,
  1,
)

export type ReconciliationStep = {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly valueBrl: number
  /** `true` para linhas calculadas a partir das anteriores. */
  readonly derived: boolean
  /** Linha de fechamento do bloco: recebe destaque tipográfico. */
  readonly closing: boolean
  readonly attestation: Attestation
}

export const RECONCILIATION_STEPS: readonly ReconciliationStep[] = [
  {
    id: 'sell-in',
    label: 'Sell-in faturado',
    description: 'Notas emitidas para redes e distribuidores no período',
    valueBrl: SELL_IN_BRL,
    derived: false,
    closing: false,
    attestation: SAP,
  },
  {
    id: 'stock-change',
    label: 'Variação de estoque no canal',
    description: 'Posição retida em CD e em loja, que não chega à gôndola no período',
    valueBrl: -CHANNEL_STOCK_CHANGE_BRL,
    derived: false,
    closing: false,
    attestation: combine([NEOGRID, NEOGRID_DISTRIBUIDORES]),
  },
  {
    id: 'expected',
    label: 'Sell-out esperado',
    description: 'Sell-in menos a retenção de estoque',
    valueBrl: EXPECTED_SELL_OUT_BRL,
    derived: true,
    closing: true,
    attestation: combine([SAP, NEOGRID, NEOGRID_DISTRIBUIDORES]),
  },
  {
    id: 'observed',
    label: 'Sell-out apurado',
    description: 'Leitura de ponto de venda do período',
    valueBrl: SELL_OUT_BRL,
    derived: false,
    closing: false,
    attestation: SCANNTECH,
  },
  {
    id: 'gap',
    label: 'Diferença não explicada',
    description: 'Apurado menos esperado — o vão que a reconciliação abre',
    valueBrl: RECONCILIATION_GAP_BRL,
    derived: true,
    closing: true,
    attestation: combine([SAP, NEOGRID, NEOGRID_DISTRIBUIDORES, SCANNTECH]),
  },
]

export type GapCause = {
  readonly id: string
  readonly label: string
  readonly amountBrl: number
  readonly explained: boolean
  readonly note: string
  readonly attestation: Attestation
}

/**
 * NOTA: não consta do ESCOPO — as duas parcelas conhecidas do desvio. A
 * cobertura parcial do painel de leitura e a defasagem entre a captura de
 * estoque e a de sell-out são as explicações que a operação já conhece. O
 * resíduo não é declarado: sai por diferença, para que a conta sempre feche.
 */
const PARTIAL_COVERAGE_BRL = 2_800_000
const CAPTURE_LAG_BRL = 1_400_000

const EXPLAINED_BRL = PARTIAL_COVERAGE_BRL + CAPTURE_LAG_BRL

/** Sobra sem origem identificada. Sai por diferença, nunca digitado. */
export const UNEXPLAINED_RESIDUAL_BRL = Math.abs(RECONCILIATION_GAP_BRL) - EXPLAINED_BRL

export const UNEXPLAINED_RESIDUAL_PERCENT = round(
  (UNEXPLAINED_RESIDUAL_BRL / SELL_IN_BRL) * 100,
  1,
)

export const GAP_CAUSES: readonly GapCause[] = [
  {
    id: 'partial-coverage',
    label: 'Cobertura parcial do painel de leitura',
    amountBrl: PARTIAL_COVERAGE_BRL,
    explained: true,
    note: 'Pontos de venda fora do painel vendem sem aparecer na apuração.',
    attestation: SCANNTECH,
  },
  {
    id: 'capture-lag',
    label: 'Defasagem entre as capturas',
    amountBrl: CAPTURE_LAG_BRL,
    explained: true,
    note: 'A posição de estoque e a leitura de sell-out fecham em dias diferentes.',
    attestation: combine([NEOGRID, SCANNTECH]),
  },
  {
    id: 'residual',
    label: 'Resíduo sem origem identificada',
    amountBrl: UNEXPLAINED_RESIDUAL_BRL,
    explained: false,
    note: 'Produto que saiu do canal e não foi encontrado em nenhuma leitura de ponta.',
    attestation: combine([SAP, NEOGRID_DISTRIBUIDORES, SCANNTECH]),
  },
]

export const EXPLAINED_GAP_BRL = EXPLAINED_BRL

export const RECONCILIATION_ATTESTATION: Attestation = combine(
  RECONCILIATION_STEPS.map((step) => step.attestation),
)

// ---------------------------------------------------------------------------
// 3. Anomalia de canal paralelo
// ---------------------------------------------------------------------------

/**
 * NOTA: não consta do ESCOPO — o caso de canal paralelo. A conta é a mesma
 * `distribuidor-centro-oeste` do cruzamento acima, e é esse o ponto: a conta não
 * tem problema de ruptura, então o desvio não aparece em nenhum indicador de
 * disponibilidade. Só a reconciliação o encontra.
 */
const ANOMALY_ACCOUNT_ID = 'distribuidor-centro-oeste'

export const ANOMALY_ACCOUNT: Account | undefined = ACCOUNTS.find(
  (account) => account.id === ANOMALY_ACCOUNT_ID,
)

/** NOTA: não consta do ESCOPO — sell-in do período na conta sinalizada. */
export const ANOMALY_SELL_IN_BRL = 12_400_000

/** NOTA: não consta do ESCOPO — média de sell-in das 12 semanas anteriores. */
export const ANOMALY_BASELINE_SELL_IN_BRL = 3_900_000

/** NOTA: não consta do ESCOPO — sell-out apurado na área contratada da conta. */
export const ANOMALY_AREA_SELL_OUT_BRL = 4_100_000
export const ANOMALY_AREA_SELL_OUT_DELTA_PERCENT = 2.1

/** NOTA: não consta do ESCOPO — reaparecimento do SKU fora da área contratada. */
export const ANOMALY_OUT_OF_AREA_UFS: readonly UfCode[] = ['SP', 'MG', 'PR', 'MS']
export const ANOMALY_OUT_OF_AREA_POS = 37

export const ANOMALY_SELL_IN_MULTIPLE = round(
  ANOMALY_SELL_IN_BRL / ANOMALY_BASELINE_SELL_IN_BRL,
  1,
)

export const ANOMALY_SELL_IN_DELTA_PERCENT = round(
  ((ANOMALY_SELL_IN_BRL - ANOMALY_BASELINE_SELL_IN_BRL) / ANOMALY_BASELINE_SELL_IN_BRL) * 100,
  1,
)

/** Excedente faturado que não encontrou sell-out correspondente na praça. */
export const ANOMALY_EXCESS_BRL = ANOMALY_SELL_IN_BRL - ANOMALY_BASELINE_SELL_IN_BRL

export type AnomalyEvidence = {
  readonly id: string
  readonly label: string
  /** Valor já formatado é decisão de tela; aqui circula o número e o formato. */
  readonly value: number
  readonly format: 'money' | 'percent' | 'days' | 'integer'
  readonly delta?: number
  readonly deltaUnit?: 'percent' | 'points'
  readonly deltaInverted?: boolean
  readonly detail: string
  readonly attestation: Attestation
}

export const ANOMALY_EVIDENCE: readonly AnomalyEvidence[] = [
  {
    id: 'sell-in-spike',
    label: 'Sell-in do período na conta',
    value: ANOMALY_SELL_IN_BRL,
    format: 'money',
    delta: ANOMALY_SELL_IN_DELTA_PERCENT,
    deltaUnit: 'percent',
    deltaInverted: true,
    detail: 'Contra a média das 12 semanas anteriores, sem alteração de mix nem de campanha.',
    attestation: SAP,
  },
  {
    id: 'area-sell-out',
    label: 'Sell-out apurado na área contratada',
    value: ANOMALY_AREA_SELL_OUT_BRL,
    format: 'money',
    delta: ANOMALY_AREA_SELL_OUT_DELTA_PERCENT,
    deltaUnit: 'percent',
    detail: 'A praça consumiu praticamente o mesmo volume do período anterior.',
    attestation: SCANNTECH,
  },
  {
    id: 'dc-coverage',
    label: 'Cobertura declarada no CD da conta',
    value: ANOMALY_ACCOUNT?.dcCoverageDays ?? 0,
    format: 'days',
    detail: 'O estoque não subiu: o volume faturado saiu do CD dentro do período.',
    attestation: DC_ATTESTATION,
  },
  {
    id: 'out-of-area',
    label: 'Pontos de venda fora da área contratada',
    value: ANOMALY_OUT_OF_AREA_POS,
    format: 'integer',
    detail: 'Lotes da conta identificados em quatro UFs que não pertencem ao contrato.',
    attestation: combine([NEOGRID, NEOGRID_DISTRIBUIDORES]),
  },
  {
    id: 'residual-link',
    label: 'Resíduo sem origem na reconciliação',
    value: UNEXPLAINED_RESIDUAL_BRL,
    format: 'money',
    detail: 'A mesma sobra que o bloco de reconciliação deixa em aberto no período.',
    attestation: combine([SAP, NEOGRID_DISTRIBUIDORES, SCANNTECH]),
  },
]

export const ANOMALY_ATTESTATION: Attestation = combine(
  ANOMALY_EVIDENCE.map((evidence) => evidence.attestation),
)

export const ANOMALY_SUMMARY =
  'Sell-in da conta saltou para um patamar que a praça não consome, sem retenção de estoque no CD e com lotes reaparecendo fora da área contratada. O padrão é compatível com revenda para fora do território, e não com aumento de demanda.'

/**
 * Todos os atestados que sustentam a tela. O banner de estado degradado se
 * alimenta dos que estiverem atrasados — se nenhum estiver, ele não aparece.
 */
export const CUSTOMER_ATTESTATIONS: readonly Attestation[] = [
  DC_ATTESTATION,
  STORE_ATTESTATION,
  RECONCILIATION_ATTESTATION,
  ANOMALY_ATTESTATION,
]

export const DEGRADED_ATTESTATIONS: readonly Attestation[] = [GRANDES_REDES_STORE].filter(isStale)
