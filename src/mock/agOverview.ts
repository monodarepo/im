import { combine } from '../domain/attestation'
import { daysAgo, type IsoDate } from '../domain/today'
import { createRandom, MOCK_SEED } from './random'
import {
  ALLOCATION_KPIS,
  ANNUAL_SAMPLE_BUDGET_BRL,
  CONVERSION_FUNNEL,
  REGION_TOTAL,
} from './sampleAllocation'
import { CRM_SFA, IQVIA, NEOGRID, SAP, SCANNTECH } from './sources'

/**
 * Visão Geral do Amostra Grátis (AG, módulo 4.1).
 *
 * Cockpit do investimento: para onde vai a verba, quanto dela vira cobertura,
 * quanto vira prescrição, e quanto se perde antes de chegar ao médico. A perda
 * por vencimento é a linha que costuma faltar — amostra vencida no estoque é
 * verba gasta sem nenhuma chance de retorno.
 */

const PLAN_ATTESTATION = combine([CRM_SFA, SAP])
const RESULT_ATTESTATION = combine([IQVIA, SCANNTECH, CRM_SFA])
const STOCK_ATTESTATION = combine([SAP, NEOGRID])

const campaignCost = ALLOCATION_KPIS.find((kpi) => kpi.id === 'cost')?.value ?? 0
const campaignRoi = ALLOCATION_KPIS.find((kpi) => kpi.id === 'roi')?.value ?? 0

/**
 * NOTA: não consta do ESCOPO — a repartição da verba anual por BU e as demais
 * campanhas. Só a campanha Losartana Plus tem números na seção 10.5; o resto
 * da carteira é declarado para que o cockpit tenha o que somar.
 */
export type BusinessUnitBudget = {
  readonly id: string
  readonly name: string
  readonly budgetBrl: number
  readonly committedBrl: number
  readonly campaigns: number
}

export const BUSINESS_UNITS: readonly BusinessUnitBudget[] = [
  {
    id: 'genericos',
    name: 'Genéricos',
    budgetBrl: 268_000_000,
    committedBrl: 214_400_000,
    campaigns: 14,
  },
  {
    id: 'similares',
    name: 'Similares',
    budgetBrl: 182_000_000,
    committedBrl: 131_040_000,
    campaigns: 11,
  },
  { id: 'mip', name: 'MIP', budgetBrl: 154_000_000, committedBrl: 129_360_000, campaigns: 9 },
  {
    id: 'skincare',
    name: 'Skincare',
    budgetBrl: 96_000_000,
    committedBrl: 38_400_000,
    campaigns: 4,
  },
]

export const TOTAL_BUDGET_BRL = BUSINESS_UNITS.reduce((sum, unit) => sum + unit.budgetBrl, 0)
export const TOTAL_COMMITTED_BRL = BUSINESS_UNITS.reduce((sum, unit) => sum + unit.committedBrl, 0)
export const COMMITTED_SHARE_PERCENT =
  Math.round((TOTAL_COMMITTED_BRL / TOTAL_BUDGET_BRL) * 100 * 10) / 10

export type CampaignRow = {
  readonly id: string
  readonly name: string
  readonly businessUnit: string
  readonly samples: number
  readonly costBrl: number
  readonly coveragePercent: number
  /** Conversão esperada e realizada, em unidades de sell-out. */
  readonly expectedUnits: number
  readonly realizedUnits: number | null
  readonly roi: number | null
}

const random = createRandom(MOCK_SEED + 410)
const between = (min: number, max: number) => min + random() * (max - min)

/**
 * NOTA: não consta do ESCOPO — as campanhas além de Losartana Plus.
 * A linha de Losartana Plus reproduz 10.5 sem redigitar: amostras, custo,
 * cobertura, conversão esperada e ROI vêm de `sampleAllocation.ts`.
 */
export const CAMPAIGN_ROWS: readonly CampaignRow[] = [
  {
    id: 'losartana-plus',
    name: 'Losartana Plus',
    businessUnit: 'Genéricos',
    samples: REGION_TOTAL.recommendedSamples,
    costBrl: campaignCost,
    coveragePercent: REGION_TOTAL.coveragePercent,
    expectedUnits: CONVERSION_FUNNEL[3]?.value ?? 0,
    realizedUnits: null,
    roi: campaignRoi,
  },
  ...['Dipirona Dia a Dia', 'Paracetamol Família', 'Vitamina Complexo B', 'Hydraserum FPS'].map(
    (name, index) => {
      const samples = Math.round(between(28_000, 86_000) / 500) * 500
      const costBrl = Math.round(samples * between(2.2, 3.1))
      const expectedUnits = Math.round(samples * between(0.2, 0.3))
      const realized = index === 3 ? null : Math.round(expectedUnits * between(0.78, 1.06))
      return {
        id: `campaign-${index}`,
        name,
        businessUnit: index === 3 ? 'Skincare' : index === 0 ? 'Genéricos' : 'MIP',
        samples,
        costBrl,
        coveragePercent: Math.round(between(64, 84)),
        expectedUnits,
        realizedUnits: realized,
        roi: realized === null ? null : Math.round(between(3.1, 4.8) * 10) / 10,
      }
    },
  ),
]

export type ExpiryLoss = {
  readonly id: string
  readonly reason: string
  readonly units: number
  readonly costBrl: number
  readonly detectedOn: IsoDate
}

/**
 * NOTA: não consta do ESCOPO — as perdas por vencimento.
 * A leitura é do ESCOPO; os casos que a instanciam são declarados.
 */
export const EXPIRY_LOSSES: readonly ExpiryLoss[] = [
  {
    id: 'loss-warehouse',
    reason: 'Lote vencido em centro de distribuição antes da expedição',
    units: 12_400,
    costBrl: 31_124,
    detectedOn: daysAgo(11),
  },
  {
    id: 'loss-field',
    reason: 'Amostra vencida em poder do representante, sem entrega registrada',
    units: 6_850,
    costBrl: 17_193,
    detectedOn: daysAgo(6),
  },
  {
    id: 'loss-blocked',
    reason: 'Retida por bloqueio de ruptura e vencida antes da reposição',
    units: 2_180,
    costBrl: 5_472,
    detectedOn: daysAgo(3),
  },
]

export const TOTAL_EXPIRY_UNITS = EXPIRY_LOSSES.reduce((sum, loss) => sum + loss.units, 0)
export const TOTAL_EXPIRY_COST_BRL = EXPIRY_LOSSES.reduce((sum, loss) => sum + loss.costBrl, 0)

export const AG_OVERVIEW_ATTESTATION = combine([CRM_SFA, IQVIA, SAP, NEOGRID])

export {
  ANNUAL_SAMPLE_BUDGET_BRL,
  PLAN_ATTESTATION as AG_PLAN_ATTESTATION,
  RESULT_ATTESTATION as AG_RESULT_ATTESTATION,
  STOCK_ATTESTATION as AG_STOCK_ATTESTATION,
}
