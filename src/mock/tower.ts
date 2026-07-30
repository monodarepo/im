import { combine, type Attestation } from '../domain/attestation'
import type { ProductId } from '../design/tokens'
import { TOTAL_BUDGET_BRL, TOTAL_COMMITTED_BRL, TOTAL_EXPIRY_COST_BRL } from './agOverview'
import { NATIONAL_STOCKOUT_PERCENT, SELL_IN_BRL } from './customers'
import { DECISION_RECORDS, TOTAL_DECISION_IMPACT_BRL } from './decisionRecords'
import {
  COMMERCIAL_DISCOUNT_BRL,
  GROSS_REVENUE_BRL,
  NET_REVENUE_BRL,
  TOTAL_LEAKAGE_BRL,
} from './grossToNet'
import { CURRENT_COVERAGE_PERCENT } from './gtmPlanning'
import { MARKET_KPIS, type Kpi } from './kpis'
import { OPPORTUNITIES, TOTAL_OPPORTUNITY_BRL } from './opportunities'
import { LINES_OUTSIDE_CORRIDOR, TOTAL_CAPTURE_BRL } from './pricing'
import { ROLLUP_GAP_BRL } from './quotas'
import { ALLOCATION_KPIS } from './sampleAllocation'
import { CRM_SFA, IQVIA, NEOGRID, SAP, SCANNTECH } from './sources'
import { MEASURED_SHARE_LOSS_PP } from './warRoom'

/**
 * Torre Integrada (seção 2, S1) — a camada que transforma quatro produtos em
 * uma plataforma.
 *
 * Regra desta tela: ela não apura nada. Todo indicador aqui é o mesmo número
 * que já vive na tela do produto que o apurou, importado e não redigitado. Se
 * a Torre discordasse de um produto, a plataforma teria duas verdades — e a
 * primeira pergunta do CEO seria qual das duas está certa.
 */

const roi = ALLOCATION_KPIS.find((kpi) => kpi.id === 'roi')?.value ?? 0

const VS_PREVIOUS_WEEK = 'vs. 7 dias anteriores'

export type TowerKpi = Kpi & {
  /** Produto que apura o número, e para onde a Torre devolve o clique. */
  readonly product: ProductId
  readonly route: string
}

/**
 * Dez indicadores principais.
 *
 * Os cinco primeiros são os canônicos da seção 10.1, na ordem em que ela os
 * fixa. Os cinco seguintes trazem cada produto para a linha de topo, sempre
 * com o valor que a tela de origem já publica.
 *
 * NOTA: não constam do ESCOPO — as variações dos cinco indicadores derivados.
 */
export const TOWER_PRIMARY_KPIS: readonly TowerKpi[] = [
  ...MARKET_KPIS.map((kpi) => ({
    ...kpi,
    product: 'hub' as const,
    route: '/hub',
  })),
  {
    id: 'gross-revenue',
    label: 'Receita Bruta',
    value: GROSS_REVENUE_BRL,
    format: 'money',
    delta: 4.2,
    deltaUnit: 'percent',
    inverted: false,
    comparison: VS_PREVIOUS_WEEK,
    attestation: SAP,
    product: 'rgm',
    route: '/rgm/gross-to-net',
  },
  {
    id: 'net-revenue',
    label: 'Receita Líquida',
    value: NET_REVENUE_BRL,
    format: 'money',
    delta: 2.6,
    deltaUnit: 'percent',
    inverted: false,
    comparison: VS_PREVIOUS_WEEK,
    attestation: combine([SAP, SCANNTECH]),
    product: 'rgm',
    route: '/rgm/gross-to-net',
  },
  {
    id: 'commercial-discount',
    label: 'Desconto Comercial',
    value: COMMERCIAL_DISCOUNT_BRL,
    format: 'money',
    delta: 3.1,
    deltaUnit: 'percent',
    inverted: true,
    comparison: VS_PREVIOUS_WEEK,
    attestation: combine([SAP, CRM_SFA]),
    product: 'rgm',
    route: '/rgm/gross-to-net',
  },
  {
    id: 'doctor-coverage',
    label: 'Cobertura de Médicos-Alvo',
    value: CURRENT_COVERAGE_PERCENT,
    format: 'percent',
    delta: 1.4,
    deltaUnit: 'points',
    inverted: false,
    comparison: VS_PREVIOUS_WEEK,
    attestation: combine([CRM_SFA, IQVIA]),
    product: 'gtm',
    route: '/gtm/territorios',
  },
  {
    id: 'sample-roi',
    label: 'ROI de Amostra',
    value: roi,
    format: 'index',
    delta: 0.2,
    deltaUnit: 'points',
    inverted: false,
    comparison: VS_PREVIOUS_WEEK,
    attestation: combine([IQVIA, SCANNTECH, SAP]),
    product: 'ag',
    route: '/ag/conversao-roi',
  },
]

/**
 * Oito indicadores da linha secundária, colapsável.
 *
 * São os números que explicam os dez de cima quando alguém pergunta "por quê".
 * Ficam recolhidos por padrão: a linha de topo responde, a segunda sustenta.
 */
export const TOWER_SECONDARY_KPIS: readonly TowerKpi[] = [
  {
    id: 'sell-in',
    label: 'Sell-in (R$)',
    value: SELL_IN_BRL,
    format: 'money',
    delta: 5.4,
    deltaUnit: 'percent',
    inverted: false,
    comparison: VS_PREVIOUS_WEEK,
    attestation: SAP,
    product: 'hub',
    route: '/hub/cliente',
  },
  {
    id: 'prioritized-opportunity',
    label: 'Oportunidades Priorizadas',
    value: TOTAL_OPPORTUNITY_BRL,
    format: 'money',
    delta: 6.8,
    deltaUnit: 'percent',
    inverted: false,
    comparison: VS_PREVIOUS_WEEK,
    attestation: combine([SCANNTECH, NEOGRID, IQVIA]),
    product: 'hub',
    route: '/hub/radar',
  },
  {
    id: 'quota-gap',
    label: 'Gap de Quota',
    value: ROLLUP_GAP_BRL,
    format: 'money',
    delta: -2.9,
    deltaUnit: 'percent',
    inverted: true,
    comparison: VS_PREVIOUS_WEEK,
    attestation: combine([CRM_SFA, SAP]),
    product: 'gtm',
    route: '/gtm/metas',
  },
  {
    id: 'price-capture',
    label: 'Captura de Preço',
    value: TOTAL_CAPTURE_BRL,
    format: 'money',
    delta: 3.7,
    deltaUnit: 'percent',
    inverted: false,
    comparison: VS_PREVIOUS_WEEK,
    attestation: SCANNTECH,
    product: 'rgm',
    route: '/rgm',
  },
  {
    id: 'gtn-leakage',
    label: 'Vazamento de Gross-to-Net',
    value: TOTAL_LEAKAGE_BRL,
    format: 'money',
    delta: 1.8,
    deltaUnit: 'percent',
    inverted: true,
    comparison: VS_PREVIOUS_WEEK,
    attestation: combine([SAP, CRM_SFA]),
    product: 'rgm',
    route: '/rgm/gross-to-net',
  },
  {
    id: 'lines-outside-corridor',
    label: 'Linhas Fora do Corredor',
    value: LINES_OUTSIDE_CORRIDOR,
    format: 'index',
    delta: -1,
    deltaUnit: 'points',
    inverted: true,
    comparison: VS_PREVIOUS_WEEK,
    attestation: SCANNTECH,
    product: 'rgm',
    route: '/rgm/governanca',
  },
  {
    id: 'sample-committed',
    label: 'Verba de Amostra Comprometida',
    value: TOTAL_COMMITTED_BRL,
    format: 'money',
    delta: 4.9,
    deltaUnit: 'percent',
    inverted: false,
    comparison: VS_PREVIOUS_WEEK,
    attestation: combine([SAP, CRM_SFA]),
    product: 'ag',
    route: '/ag',
  },
  {
    id: 'expiry-loss',
    label: 'Perda por Vencimento',
    value: TOTAL_EXPIRY_COST_BRL,
    format: 'money',
    delta: 8.3,
    deltaUnit: 'percent',
    inverted: true,
    comparison: VS_PREVIOUS_WEEK,
    attestation: combine([SAP, NEOGRID]),
    product: 'ag',
    route: '/ag/redistribuicao',
  },
]

/** Perda de share medida no war room, usada no briefing. */
export const SHARE_LOSS_PP = MEASURED_SHARE_LOSS_PP

/* ------------------------------------------------------------------ */
/* Funil de impacto financeiro                                         */
/* ------------------------------------------------------------------ */

export type FunnelStageId =
  | 'identified'
  | 'approved'
  | 'executing'
  | 'realized'
  | 'validated'

export const FUNNEL_STAGE_ORDER: readonly FunnelStageId[] = [
  'identified',
  'approved',
  'executing',
  'realized',
  'validated',
]

export const FUNNEL_STAGE_LABEL: Record<FunnelStageId, string> = {
  identified: 'Identificado',
  approved: 'Aprovado',
  executing: 'Em execução',
  realized: 'Realizado',
  validated: 'Validado por Finanças',
}

export const FUNNEL_STAGE_MEANING: Record<FunnelStageId, string> = {
  identified: 'A plataforma apurou a oportunidade e a decompôs em decisão.',
  approved: 'A alçada aprovou. O valor deixou de ser hipótese e virou compromisso.',
  executing: 'A ação está em campo. O valor ainda não apareceu no resultado.',
  realized: 'O efeito apareceu na apuração comercial.',
  validated: 'Finanças reconheceu o valor no fechamento. É o único número auditável.',
}

export type FunnelViewId =
  | 'gross_revenue'
  | 'net_revenue'
  | 'gross_margin'
  | 'contribution_margin'
  | 'commercial_investment'
  | 'sample_expense'
  | 'roi'

export const FUNNEL_VIEW_ORDER: readonly FunnelViewId[] = [
  'gross_revenue',
  'net_revenue',
  'gross_margin',
  'contribution_margin',
  'commercial_investment',
  'sample_expense',
  'roi',
]

export const FUNNEL_VIEW_LABEL: Record<FunnelViewId, string> = {
  gross_revenue: 'Receita bruta',
  net_revenue: 'Receita líquida',
  gross_margin: 'Margem bruta',
  contribution_margin: 'Margem de contribuição',
  commercial_investment: 'Investimento comercial',
  sample_expense: 'Despesa com amostras',
  roi: 'ROI',
}

/**
 * Taxa de sobrevivência de cada estágio contra o anterior.
 *
 * NOTA: não consta do ESCOPO — a cascata do funil. Ela é declarada uma vez e
 * vale para todas as visões, em vez de trinta e cinco números soltos: o que
 * muda entre visões é a âncora do topo, não o formato do funil. A queda mais
 * dura é de Realizado para Validado, porque é onde Finanças corta o que não
 * consegue reconhecer no fechamento.
 */
const STAGE_SURVIVAL: Record<FunnelStageId, number> = {
  identified: 1,
  approved: 0.72,
  executing: 0.58,
  realized: 0.41,
  validated: 0.34,
}

/**
 * Âncora de cada visão no topo do funil — o valor identificado.
 *
 * Receita bruta e líquida saem do total sob decisão. As margens aplicam as
 * taxas do gross-to-net. Investimento comercial e despesa com amostras são o
 * que se gasta para capturar, não o que se captura.
 *
 * NOTA: não constam do ESCOPO — as taxas de margem e as âncoras de custo.
 */
const MARGIN_RATE = { gross: 0.42, contribution: 0.28 } as const
const INVESTMENT_RATE = { commercial: 0.11, sample: 0.04 } as const

const VIEW_ANCHOR: Record<Exclude<FunnelViewId, 'roi'>, number> = {
  gross_revenue: TOTAL_DECISION_IMPACT_BRL,
  net_revenue: Math.round(
    TOTAL_DECISION_IMPACT_BRL * (NET_REVENUE_BRL / GROSS_REVENUE_BRL),
  ),
  gross_margin: Math.round(TOTAL_DECISION_IMPACT_BRL * MARGIN_RATE.gross),
  contribution_margin: Math.round(TOTAL_DECISION_IMPACT_BRL * MARGIN_RATE.contribution),
  commercial_investment: Math.round(TOTAL_DECISION_IMPACT_BRL * INVESTMENT_RATE.commercial),
  sample_expense: Math.round(TOTAL_DECISION_IMPACT_BRL * INVESTMENT_RATE.sample),
}

export type FunnelPoint = {
  readonly stage: FunnelStageId
  readonly label: string
  readonly value: number
  /** Conversão contra o estágio anterior, em porcentagem. `null` no topo. */
  readonly conversionPercent: number | null
  /** Conversão contra o topo do funil. */
  readonly shareOfIdentifiedPercent: number
}

export const FUNNEL_VIEW_FORMAT: Record<FunnelViewId, 'money' | 'multiple'> = {
  gross_revenue: 'money',
  net_revenue: 'money',
  gross_margin: 'money',
  contribution_margin: 'money',
  commercial_investment: 'money',
  sample_expense: 'money',
  roi: 'multiple',
}

function stageValue(view: Exclude<FunnelViewId, 'roi'>, stage: FunnelStageId): number {
  return Math.round(VIEW_ANCHOR[view] * STAGE_SURVIVAL[stage])
}

/**
 * ROI por estágio: o retorno dividido pelo que se investiu para obtê-lo.
 *
 * Investimento e retorno caem na mesma cascata, então o ROI não é constante —
 * ele melhora conforme o funil avança, porque o investimento é comprometido
 * cedo e o retorno só aparece depois. É a leitura que o CFO procura.
 */
function roiAt(stage: FunnelStageId): number {
  const investment =
    stageValue('commercial_investment', 'identified') + stageValue('sample_expense', 'identified')
  const returned = stageValue('contribution_margin', stage)
  return Math.round((returned / investment) * 100) / 100
}

export function funnelOf(view: FunnelViewId): readonly FunnelPoint[] {
  return FUNNEL_STAGE_ORDER.map((stage, index) => {
    const value = view === 'roi' ? roiAt(stage) : stageValue(view, stage)
    const previousStage = FUNNEL_STAGE_ORDER[index - 1]
    const previous =
      previousStage === undefined
        ? null
        : view === 'roi'
          ? roiAt(previousStage)
          : stageValue(view, previousStage)
    const top = view === 'roi' ? roiAt('identified') : stageValue(view, 'identified')

    return {
      stage,
      label: FUNNEL_STAGE_LABEL[stage],
      value,
      conversionPercent:
        previous === null || previous === 0 ? null : Math.round((value / previous) * 1000) / 10,
      shareOfIdentifiedPercent: top === 0 ? 0 : Math.round((value / top) * 1000) / 10,
    }
  })
}

export const FUNNEL_ATTESTATION: Attestation = combine([SAP, SCANNTECH, CRM_SFA])

export const DEFAULT_FUNNEL_VIEW: FunnelViewId = 'gross_revenue'

/* ------------------------------------------------------------------ */
/* Briefing diário                                                     */
/* ------------------------------------------------------------------ */

export type BriefingAlert = {
  readonly id: string
  readonly headline: string
  readonly valueAtRiskBrl: number
  readonly evidence: string
  readonly product: ProductId
  readonly route: string
  readonly routeLabel: string
  readonly decisionId: string | null
  readonly attestation: Attestation
}

/**
 * Briefing do dia, ordenado por R$ em risco.
 *
 * Os valores vêm das decisões e das oportunidades já priorizadas — o briefing
 * não descobre nada novo, ele escolhe o que merece os primeiros cinco minutos
 * do dia entre o que a plataforma já sabe.
 */
export const DAILY_BRIEFING: readonly BriefingAlert[] = [
  {
    id: 'brief-share-sp',
    headline: 'Participação de Losartana em SP cai pela oitava semana',
    valueAtRiskBrl: DECISION_RECORDS[0]?.impactBrl ?? 0,
    evidence: 'Queda de 3,2 pp acumulada, com ruptura e preço fora do corredor no mesmo recorte.',
    product: 'hub',
    route: '/decisoes/D-2026-0001',
    routeLabel: 'Abrir a decisão',
    decisionId: 'D-2026-0001',
    attestation: combine([SCANNTECH, NEOGRID, IQVIA]),
  },
  {
    id: 'brief-price-mg',
    headline: 'Dipirona segue fora do corredor de preço em MG',
    valueAtRiskBrl: DECISION_RECORDS[1]?.impactBrl ?? 0,
    evidence: 'Quarta semana consecutiva acima do teto, no canal de maior elasticidade.',
    product: 'rgm',
    route: '/decisoes/D-2026-0002',
    routeLabel: 'Abrir a decisão',
    decisionId: 'D-2026-0002',
    attestation: SCANNTECH,
  },
  {
    id: 'brief-coverage-rj',
    headline: 'Cobertura de cardiologistas no RJ estacionada em 61%',
    valueAtRiskBrl: DECISION_RECORDS[2]?.impactBrl ?? 0,
    evidence: 'Meta de 80% no ciclo; três territórios seguem sem representante alocado.',
    product: 'gtm',
    route: '/decisoes/D-2026-0003',
    routeLabel: 'Abrir a decisão',
    decisionId: 'D-2026-0003',
    attestation: CRM_SFA,
  },
  {
    id: 'brief-stockout-ne',
    headline: 'Ruptura acima de 10% em três estados do Nordeste',
    valueAtRiskBrl: DECISION_RECORDS[4]?.impactBrl ?? 0,
    evidence: `Ruptura nacional em ${NATIONAL_STOCKOUT_PERCENT}%, mas concentrada acima do limite na região.`,
    product: 'hub',
    route: '/decisoes/D-2026-0005',
    routeLabel: 'Abrir a decisão',
    decisionId: 'D-2026-0005',
    attestation: combine([NEOGRID, SCANNTECH]),
  },
  {
    id: 'brief-expiry',
    headline: 'Amostras entrando na janela de vencimento sem giro que as absorva',
    valueAtRiskBrl: TOTAL_EXPIRY_COST_BRL,
    evidence: 'Lotes retidos por bloqueio de ruptura, com transferência já sugerida.',
    product: 'ag',
    route: '/ag/redistribuicao',
    routeLabel: 'Ver a redistribuição',
    decisionId: 'D-2026-0004',
    attestation: combine([SAP, NEOGRID]),
  },
]

export const BRIEFING_TOTAL_AT_RISK_BRL = DAILY_BRIEFING.reduce(
  (sum, alert) => sum + alert.valueAtRiskBrl,
  0,
)

/** Verba de amostra sob governança, usada no rodapé do briefing. */
export const SAMPLE_BUDGET_BRL = TOTAL_BUDGET_BRL

export const TOP_OPPORTUNITY_COUNT = OPPORTUNITIES.length

export const TOWER_ATTESTATION: Attestation = combine([
  SCANNTECH,
  IQVIA,
  NEOGRID,
  SAP,
  CRM_SFA,
])
