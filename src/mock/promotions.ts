import type { SemanticTone } from '../design/tokens'
import { combine, type Attestation } from '../domain/attestation'
import { MARKET } from '../domain/elasticity'
import { daysAgo, daysFromNow, type IsoDate } from '../domain/today'
import { createRandom, MOCK_SEED } from './random'
import { buildWaterfallSteps, type WaterfallStep } from './rootCause'
import { RECOMMENDED, RECOMMENDED_IMPACT } from './scenarios'
import { CRM_SFA, NEOGRID_DISTRIBUIDORES, SAP, SCANNTECH } from './sources'

/**
 * Monitor de promoções (RGM, módulo 3.8).
 *
 * Duas leituras que a tela precisa sustentar:
 *
 * 1. **Uplift contra canibalização.** O uplift de volume da promoção é bruto por
 *    natureza: parte dele é volume que sairia de outro SKU da própria casa. O
 *    ROI só é honesto depois de descontar a margem canibalizada — e é aí que
 *    promoções aparentemente boas viram destruição de valor.
 * 2. **Funil de verba.** O que foi planejado quase nunca é o que foi comprovado.
 *    Quatro estágios, e a perda entre cada par é o vazamento com dono.
 *
 * ## Ancoragem canônica
 *
 * A primeira promoção é o Cenário 3 da seção 10.3 do ESCOPO, lido de
 * `scenarios.ts` e não redigitado: 8% de desconto sobre Losartana 50mg c/30,
 * +360.000 unidades, +R$ 1,9M de receita líquida e ROI de 25,6%. Preço de
 * tabela, volume de base e margem de contribuição vêm de `MARKET`.
 *
 * O impacto de receita do Cenário 3 é **fixado**, não recalculado: como já
 * registrado em `scenarios.ts`, as linhas monetárias daquele cenário não fecham
 * por nenhuma fórmula compatível com os demais. As outras cinco promoções
 * derivam o impacto de receita pela fórmula declarada em `revenueImpactOf()`.
 */

/**
 * NOTA: não consta do ESCOPO — todas as promoções fora do Cenário 3, seus
 * upliftes, canibalizações, descontos, contas e ROI bruto. Declarados aqui com
 * nomes de rede fictícios. Preços de lista reproduzem as linhas do cockpit de
 * preço (Losartana R$ 12,90 e R$ 11,60 no atacado, Dipirona R$ 9,80,
 * Paracetamol R$ 10,70); a margem de contribuição é a canônica de 45,5%.
 */

export type PromotionStatus = 'running' | 'closed'

export const STATUS_LABEL: Record<PromotionStatus, string> = {
  running: 'Em execução',
  closed: 'Encerrada',
}

export const STATUS_TONE: Record<PromotionStatus, SemanticTone> = {
  running: 'attention',
  closed: 'neutral',
}

/** Concordância do rótulo de fim de período com o estado da promoção. */
export const END_LABEL: Record<PromotionStatus, string> = {
  running: 'encerra',
  closed: 'encerrada',
}

/** Veredito da promoção depois de descontada a margem canibalizada. */
export type PromotionVerdict = 'healthy' | 'watch' | 'eroded'

export const VERDICT_LABEL: Record<PromotionVerdict, string> = {
  healthy: 'Uplift preservado',
  watch: 'Canibalização relevante',
  eroded: 'Canibalização consome o uplift',
}

export const VERDICT_TONE: Record<PromotionVerdict, SemanticTone> = {
  healthy: 'positive',
  watch: 'attention',
  eroded: 'negative',
}

/** Acima disto, a canibalização já come metade do ganho de margem da promoção. */
export const EROSION_WATCH_THRESHOLD_PERCENT = 50

type PromotionSeed = {
  readonly id: string
  readonly name: string
  readonly mechanic: string
  readonly molecule: string
  readonly presentation: string
  readonly account: string
  readonly channel: string
  readonly region: string
  readonly status: PromotionStatus
  readonly startDate: IsoDate
  readonly endDate: IsoDate
  readonly discountRate: number
  readonly listPriceBrl: number
  /** Volume que o SKU venderia sem a promoção, em unidades. */
  readonly baselineUnits: number
  /** Volume incremental do SKU promovido, em unidades. */
  readonly upliftUnits: number
  /** Volume retirado de outros SKUs da própria casa, em unidades. */
  readonly cannibalizedUnits: number
  readonly cannibalizedFrom: string
  /** ROI antes de descontar a canibalização, em percentual do investimento. */
  readonly grossRoiPercent: number
  /** Impacto de receita fixado pelo ESCOPO. `null` quando é derivado. */
  readonly pinnedRevenueImpactBrl: number | null
  readonly decisionId: string | null
  readonly attestation: Attestation
}

export type Promotion = PromotionSeed & {
  readonly netPriceBrl: number
  /** Unidades vendidas sob a mecânica: base mais uplift. */
  readonly promotedUnits: number
  /** Uplift depois de devolver o volume canibalizado. */
  readonly netUpliftUnits: number
  /** Preço abdicado por unidade aplicado a todo o volume promovido. */
  readonly investmentBrl: number
  readonly grossMarginGainBrl: number
  readonly cannibalizedRevenueBrl: number
  readonly cannibalizedMarginBrl: number
  readonly netMarginGainBrl: number
  readonly grossRevenueImpactBrl: number
  readonly netRevenueImpactBrl: number
  readonly netRoiPercent: number
  /** Canibalização como percentual do uplift bruto, em unidades. */
  readonly cannibalizationRatePercent: number
  /** Quanto da margem ganha a canibalização devolve, em percentual. */
  readonly marginErosionPercent: number
  readonly verdict: PromotionVerdict
}

const CANONICAL = {
  discountRate: RECOMMENDED.canonical.discountRate,
  upliftUnits: RECOMMENDED_IMPACT.volume,
  revenueImpactBrl: RECOMMENDED_IMPACT.netRevenueBrl,
  roiPercent: RECOMMENDED.canonical.promoRoiPercent ?? 0,
} as const

const SELLOUT_AND_BILLING = combine([SCANNTECH, SAP])
const SELLOUT_AND_DISTRIBUTION = combine([SCANNTECH, NEOGRID_DISTRIBUIDORES])
const DISTRIBUTION_AND_BILLING = combine([NEOGRID_DISTRIBUIDORES, SAP])

const PROMOTION_SEEDS: readonly PromotionSeed[] = [
  {
    id: 'promo-losartana-desconto-8',
    name: 'Desconto de 8% em Losartana',
    mechanic: 'Desconto de tabela',
    molecule: 'Losartana',
    presentation: '50mg c/30',
    account: 'Todas as redes',
    channel: 'Farma',
    region: 'Sudeste',
    status: 'running',
    startDate: daysAgo(24),
    endDate: daysFromNow(6),
    discountRate: CANONICAL.discountRate,
    listPriceBrl: MARKET.basePriceBrl,
    baselineUnits: MARKET.baseVolume,
    upliftUnits: CANONICAL.upliftUnits,
    cannibalizedUnits: 26_000,
    cannibalizedFrom: 'Losartana 50mg c/60',
    grossRoiPercent: CANONICAL.roiPercent,
    pinnedRevenueImpactBrl: CANONICAL.revenueImpactBrl,
    decisionId: 'D-2026-0001',
    attestation: SELLOUT_AND_BILLING,
  },
  {
    id: 'promo-dipirona-leve-3-pague-2',
    name: 'Leve 3, pague 2 — Dipirona',
    mechanic: 'Pacote promocional',
    molecule: 'Dipirona',
    presentation: '500mg c/20',
    account: 'Rede Farma Aurora',
    channel: 'Farma',
    region: 'Sudeste',
    status: 'closed',
    startDate: daysAgo(96),
    endDate: daysAgo(66),
    discountRate: 0.22,
    listPriceBrl: 9.8,
    baselineUnits: 320_000,
    upliftUnits: 210_000,
    cannibalizedUnits: 168_000,
    cannibalizedFrom: 'Dipirona 500mg c/10 e c/30',
    grossRoiPercent: 9.4,
    pinnedRevenueImpactBrl: null,
    decisionId: 'D-2026-0002',
    attestation: SELLOUT_AND_DISTRIBUTION,
  },
  {
    id: 'promo-paracetamol-encarte',
    name: 'Encarte regional — Paracetamol',
    mechanic: 'Encarte com desconto',
    molecule: 'Paracetamol',
    presentation: '750mg c/20',
    account: 'Rede Popular do Litoral',
    channel: 'Farma',
    region: 'Nordeste',
    status: 'closed',
    startDate: daysAgo(72),
    endDate: daysAgo(42),
    discountRate: 0.12,
    listPriceBrl: 10.7,
    baselineUnits: 240_000,
    upliftUnits: 96_000,
    cannibalizedUnits: 12_000,
    cannibalizedFrom: 'Paracetamol 500mg c/20',
    grossRoiPercent: 24,
    pinnedRevenueImpactBrl: null,
    decisionId: null,
    attestation: SELLOUT_AND_BILLING,
  },
  {
    id: 'promo-losartana-escala-atacado',
    name: 'Escala de volume — Losartana atacado',
    mechanic: 'Desconto progressivo',
    molecule: 'Losartana',
    presentation: '50mg c/30',
    account: 'Distribuidor Vertente Sul',
    channel: 'Atacado',
    region: 'Sul',
    status: 'running',
    startDate: daysAgo(15),
    endDate: daysFromNow(15),
    discountRate: 0.1,
    listPriceBrl: 11.6,
    baselineUnits: 180_000,
    upliftUnits: 54_000,
    cannibalizedUnits: 7_400,
    cannibalizedFrom: 'Losartana 50mg c/30 no canal farma',
    grossRoiPercent: 18,
    pinnedRevenueImpactBrl: null,
    decisionId: null,
    attestation: DISTRIBUTION_AND_BILLING,
  },
  {
    id: 'promo-losartana-combo',
    name: 'Combo cardiologia — Losartana',
    mechanic: 'Combo com desconto',
    molecule: 'Losartana',
    presentation: '50mg c/30',
    account: 'Rede Farma Alvorada',
    channel: 'Farma',
    region: 'Centro-Oeste',
    status: 'running',
    startDate: daysAgo(9),
    endDate: daysFromNow(21),
    discountRate: 0.06,
    listPriceBrl: MARKET.basePriceBrl,
    baselineUnits: 150_000,
    upliftUnits: 36_000,
    cannibalizedUnits: 2_000,
    cannibalizedFrom: 'Losartana 50mg c/60',
    grossRoiPercent: 21.1,
    pinnedRevenueImpactBrl: null,
    decisionId: null,
    attestation: SELLOUT_AND_BILLING,
  },
  {
    id: 'promo-dipirona-ponta-gondola',
    name: 'Ponta de gôndola — Dipirona',
    mechanic: 'Espaço extra com desconto',
    molecule: 'Dipirona',
    presentation: '500mg c/20',
    account: 'Rede Popular Cordilheira',
    channel: 'Farma',
    region: 'Sul',
    status: 'closed',
    startDate: daysAgo(58),
    endDate: daysAgo(30),
    discountRate: 0.15,
    listPriceBrl: 9.8,
    baselineUnits: 210_000,
    upliftUnits: 62_000,
    cannibalizedUnits: 51_000,
    cannibalizedFrom: 'Dipirona 500mg c/20 a preço cheio',
    grossRoiPercent: 7,
    pinnedRevenueImpactBrl: null,
    decisionId: null,
    attestation: SELLOUT_AND_DISTRIBUTION,
  },
]

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step
}

/**
 * Impacto de receita líquida da mecânica: o que o volume incremental traz a
 * preço líquido, menos o desconto concedido sobre o volume que já viria sem a
 * promoção. É o que separa uplift de subsídio à base.
 */
function revenueImpactOf(seed: PromotionSeed, netPriceBrl: number): number {
  const givenUpPerUnit = seed.listPriceBrl - netPriceBrl
  return Math.round(seed.upliftUnits * netPriceBrl - givenUpPerUnit * seed.baselineUnits)
}

function verdictOf(netRoiPercent: number, marginErosionPercent: number): PromotionVerdict {
  if (netRoiPercent <= 0) return 'eroded'
  if (marginErosionPercent >= EROSION_WATCH_THRESHOLD_PERCENT) return 'watch'
  return 'healthy'
}

function enrich(seed: PromotionSeed): Promotion {
  const netPriceBrl = round(seed.listPriceBrl * (1 - seed.discountRate), 4)
  const promotedUnits = seed.baselineUnits + seed.upliftUnits
  const investmentBrl = Math.round((seed.listPriceBrl - netPriceBrl) * promotedUnits)

  const grossMarginGainBrl = Math.round(investmentBrl * (seed.grossRoiPercent / 100))
  const cannibalizedRevenueBrl = Math.round(seed.cannibalizedUnits * seed.listPriceBrl)
  const cannibalizedMarginBrl = Math.round(
    cannibalizedRevenueBrl * MARKET.contributionMarginRate,
  )
  const netMarginGainBrl = grossMarginGainBrl - cannibalizedMarginBrl

  const grossRevenueImpactBrl = seed.pinnedRevenueImpactBrl ?? revenueImpactOf(seed, netPriceBrl)

  const netRoiPercent = investmentBrl > 0 ? round((netMarginGainBrl / investmentBrl) * 100) : 0
  const cannibalizationRatePercent =
    seed.upliftUnits > 0 ? round((seed.cannibalizedUnits / seed.upliftUnits) * 100) : 0
  const marginErosionPercent =
    grossMarginGainBrl > 0 ? round((cannibalizedMarginBrl / grossMarginGainBrl) * 100) : 0

  return {
    ...seed,
    netPriceBrl,
    promotedUnits,
    netUpliftUnits: seed.upliftUnits - seed.cannibalizedUnits,
    investmentBrl,
    grossMarginGainBrl,
    cannibalizedRevenueBrl,
    cannibalizedMarginBrl,
    netMarginGainBrl,
    grossRevenueImpactBrl,
    netRevenueImpactBrl: grossRevenueImpactBrl - cannibalizedRevenueBrl,
    netRoiPercent,
    cannibalizationRatePercent,
    marginErosionPercent,
    verdict: verdictOf(netRoiPercent, marginErosionPercent),
  }
}

export const PROMOTIONS: readonly Promotion[] = PROMOTION_SEEDS.map(enrich)

const sumBy = (metric: (promotion: Promotion) => number): number =>
  PROMOTIONS.reduce((total, promotion) => total + metric(promotion), 0)

export const TOTAL_UPLIFT_UNITS = sumBy((promotion) => promotion.upliftUnits)
export const TOTAL_CANNIBALIZED_UNITS = sumBy((promotion) => promotion.cannibalizedUnits)
export const TOTAL_NET_UPLIFT_UNITS = TOTAL_UPLIFT_UNITS - TOTAL_CANNIBALIZED_UNITS
export const TOTAL_INVESTMENT_BRL = sumBy((promotion) => promotion.investmentBrl)
export const TOTAL_GROSS_MARGIN_GAIN_BRL = sumBy((promotion) => promotion.grossMarginGainBrl)
export const TOTAL_CANNIBALIZED_MARGIN_BRL = sumBy((promotion) => promotion.cannibalizedMarginBrl)
export const TOTAL_NET_MARGIN_GAIN_BRL =
  TOTAL_GROSS_MARGIN_GAIN_BRL - TOTAL_CANNIBALIZED_MARGIN_BRL

export const PORTFOLIO_CANNIBALIZATION_RATE_PERCENT = round(
  (TOTAL_CANNIBALIZED_UNITS / TOTAL_UPLIFT_UNITS) * 100,
)

/** ROI ponderado pelo investimento, antes e depois da canibalização. */
export const PORTFOLIO_GROSS_ROI_PERCENT = round(
  (TOTAL_GROSS_MARGIN_GAIN_BRL / TOTAL_INVESTMENT_BRL) * 100,
)
export const PORTFOLIO_NET_ROI_PERCENT = round(
  (TOTAL_NET_MARGIN_GAIN_BRL / TOTAL_INVESTMENT_BRL) * 100,
)
export const PORTFOLIO_ROI_GAP_POINTS = round(
  PORTFOLIO_NET_ROI_PERCENT - PORTFOLIO_GROSS_ROI_PERCENT,
)

/** Escala comum das barras de erosão: a maior parcela de margem da carteira. */
export const MARGIN_SCALE_BRL = PROMOTIONS.reduce(
  (max, promotion) =>
    Math.max(max, promotion.grossMarginGainBrl, promotion.cannibalizedMarginBrl),
  0,
)

export const ERODING_PROMOTIONS = PROMOTIONS.filter(
  (promotion) => promotion.verdict === 'eroded',
)

export const PROMOTION_ATTESTATION: Attestation = combine(
  PROMOTIONS.map((promotion) => promotion.attestation),
)

/* --------------------------------------------------------------------------
 * Funil de verba: planejado → negociado → executado → comprovado
 * ------------------------------------------------------------------------ */

export type FunnelStageId = 'planned' | 'negotiated' | 'executed' | 'proven'

export type FunnelStage = {
  readonly id: FunnelStageId
  readonly label: string
  readonly valueBrl: number
  /** O que o estágio significa na operação. */
  readonly description: string
  /** Onde o valor vaza na passagem do estágio anterior para este. */
  readonly leakReason: string
  /** Perda contra o estágio anterior. Zero no primeiro. */
  readonly lossFromPreviousBrl: number
  /** Retenção contra o planejado, em percentual. */
  readonly retentionPercent: number
  readonly attestation: Attestation
}

/**
 * NOTA: não consta do ESCOPO — os valores do funil de verba promocional.
 *
 * O estágio executado é ancorado na carteira acima: é a soma do investimento
 * das seis promoções. Negociado e planejado são reconstruídos acima dele, e o
 * comprovado abaixo, por taxas de retenção de `createRandom(MOCK_SEED + 33)`.
 * Determinístico por construção — a demonstração sai igual em qualquer máquina.
 */
const funnelRandom = createRandom(MOCK_SEED + 33)

const EXECUTED_BRL = roundTo(TOTAL_INVESTMENT_BRL, 10_000)
const NEGOTIATED_BRL = roundTo(EXECUTED_BRL / (0.84 + funnelRandom() * 0.06), 10_000)
const PLANNED_BRL = roundTo(NEGOTIATED_BRL / (0.88 + funnelRandom() * 0.06), 10_000)
const PROVEN_BRL = roundTo(EXECUTED_BRL * (0.7 + funnelRandom() * 0.1), 10_000)

type FunnelDraft = {
  readonly id: FunnelStageId
  readonly label: string
  readonly valueBrl: number
  readonly description: string
  readonly leakReason: string
  readonly attestation: Attestation
}

const FUNNEL_DRAFTS: readonly FunnelDraft[] = [
  {
    id: 'planned',
    label: 'Planejado',
    valueBrl: PLANNED_BRL,
    description: 'Verba promocional aprovada no plano do ciclo, por conta e mecânica',
    leakReason: 'Ponto de partida do ciclo',
    attestation: SAP,
  },
  {
    id: 'negotiated',
    label: 'Negociado',
    valueBrl: NEGOTIATED_BRL,
    description: 'O que virou acordo assinado com as contas',
    leakReason: 'Mecânicas reduzidas ou não aceitas na negociação com a conta',
    attestation: CRM_SFA,
  },
  {
    id: 'executed',
    label: 'Executado',
    valueBrl: EXECUTED_BRL,
    description: 'O que chegou ao ponto de venda e virou volume promovido',
    leakReason: 'Material que não subiu na data, ruptura no período e cobertura parcial de lojas',
    attestation: DISTRIBUTION_AND_BILLING,
  },
  {
    id: 'proven',
    label: 'Comprovado',
    valueBrl: PROVEN_BRL,
    description: 'O que voltou com evidência de execução e leitura de sell-out',
    leakReason: 'Execução sem evidência aceita: foto ausente, nota fora do prazo, sell-out sem rastro',
    attestation: combine([SCANNTECH, NEOGRID_DISTRIBUIDORES, CRM_SFA]),
  },
]

export const FUNNEL_STAGES: readonly FunnelStage[] = FUNNEL_DRAFTS.map((draft, index) => {
  const previous = FUNNEL_DRAFTS[index - 1]
  return {
    ...draft,
    lossFromPreviousBrl: previous ? previous.valueBrl - draft.valueBrl : 0,
    retentionPercent: round((draft.valueBrl / PLANNED_BRL) * 100),
  }
})

export const FUNNEL_PLANNED_BRL = PLANNED_BRL
export const FUNNEL_PROVEN_BRL = PROVEN_BRL
export const FUNNEL_TOTAL_LEAK_BRL = PLANNED_BRL - PROVEN_BRL
export const FUNNEL_PROVEN_RATE_PERCENT = round((PROVEN_BRL / PLANNED_BRL) * 100)
export const FUNNEL_LEAK_RATE_PERCENT = round(100 - FUNNEL_PROVEN_RATE_PERCENT)

/** Maior vazamento isolado do funil, para nomear o gargalo do ciclo. */
export const FUNNEL_WORST_STAGE: FunnelStage = FUNNEL_STAGES.reduce(
  (worst, stage) => (stage.lossFromPreviousBrl > worst.lossFromPreviousBrl ? stage : worst),
  FUNNEL_STAGES[0] as FunnelStage,
)

const MILLION = 1_000_000

/** O waterfall lê em R$ milhões: o eixo do componente não formata moeda. */
export const FUNNEL_WATERFALL_UNIT_LABEL = 'Valores em R$ milhões'

export const FUNNEL_WATERFALL_STEPS: readonly WaterfallStep[] = buildWaterfallSteps(
  [
    { label: 'Planejado', value: PLANNED_BRL / MILLION },
    { label: 'Perda na negociação', value: -(PLANNED_BRL - NEGOTIATED_BRL) / MILLION },
    { label: 'Perda na execução', value: -(NEGOTIATED_BRL - EXECUTED_BRL) / MILLION },
    { label: 'Perda na comprovação', value: -(EXECUTED_BRL - PROVEN_BRL) / MILLION },
  ],
  'Comprovado',
)

export const FUNNEL_ATTESTATION: Attestation = combine(
  FUNNEL_STAGES.map((stage) => stage.attestation),
)

/* --------------------------------------------------------------------------
 * Recomendação
 * ------------------------------------------------------------------------ */

/**
 * A recomendação da tela referencia a decisão já aberta para Dipirona em vez de
 * criar uma decisão paralela — o objeto Decisão é o único lugar em que a
 * recomendação vira compromisso.
 */
export const PROMOTION_RECOMMENDATION = {
  promotionId: 'promo-dipirona-leve-3-pague-2',
  decisionId: 'D-2026-0002',
  title: 'Suspender a mecânica leve 3, pague 2 de Dipirona no próximo ciclo',
  rationale:
    'A mecânica entrega uplift, mas quatro de cada cinco unidades incrementais saem de outras apresentações da própria Dipirona. Descontada a margem canibalizada, o retorno fica negativo e a verba rende mais realocada para as mecânicas de encarte e combo.',
  confidencePercent: 74,
  attestation: SELLOUT_AND_DISTRIBUTION,
} as const

export function findPromotion(id: string): Promotion | undefined {
  return PROMOTIONS.find((promotion) => promotion.id === id)
}
