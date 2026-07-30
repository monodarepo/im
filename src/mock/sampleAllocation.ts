import { combine, type Attestation } from '../domain/attestation'
import { DIAGNOSTICS } from './diagnostics'
import { DOCTORS, type Doctor } from './doctors'
import { CRM_SFA, IQVIA, NEOGRID, NEOGRID_DISTRIBUIDORES, SAP, SCANNTECH } from './sources'

/**
 * Otimizador de Alocação de amostras (AG, módulo 4.4) — seção 10.5 do ESCOPO.
 *
 * É a tela de governança de cerca de R$ 700 milhões por ano em amostra grátis.
 * O que ela decide não é quantas amostras existem, e sim para quem vão — e,
 * principalmente, para quem **não** vão.
 *
 * O princípio inviolável do módulo: não estimular demanda onde o produto não
 * está disponível. Território com ruptura detectada pelo HUB entra bloqueado,
 * com o motivo escrito e o link para a tela que originou o bloqueio. Amostra
 * distribuída numa praça em ruptura vira prescrição que a farmácia não atende.
 */

/** Verba anual de amostra grátis sob governança, apontada na entrevista de AG. */
export const ANNUAL_SAMPLE_BUDGET_BRL = 700_000_000

export type CampaignId = 'losartana-plus' | 'hydraserum-fps'

export type Campaign = {
  readonly id: CampaignId
  readonly name: string
  readonly product: string
  readonly businessUnit: string
  /** `false` enquanto o plano da campanha não foi dimensionado. */
  readonly planned: boolean
  readonly note: string
}

export const CAMPAIGNS: readonly Campaign[] = [
  {
    id: 'losartana-plus',
    name: 'Losartana Plus',
    product: 'Losartana 50mg',
    businessUnit: 'Genéricos',
    planned: true,
    note: 'Plano dimensionado para o período.',
  },
  {
    id: 'hydraserum-fps',
    name: 'Hydraserum FPS',
    product: 'Hydraserum FPS 50',
    businessUnit: 'Skincare',
    planned: false,
    note: 'Piloto de Skincare — é por aqui que a implantação começa. O plano está em dimensionamento; a seção 10.5 fixa os números da campanha de Genéricos.',
  },
]

export const DEFAULT_CAMPAIGN_ID: CampaignId = 'losartana-plus'

export const ALLOCATION_FILTERS = [
  { label: 'Campanha', value: 'Losartana Plus' },
  { label: 'Produto', value: 'Losartana 50mg' },
  { label: 'Período', value: 'Mai' },
  { label: 'Região', value: 'Sudeste' },
] as const

const PLAN_ATTESTATION = combine([CRM_SFA, IQVIA, SAP])
const STOCK_ATTESTATION = combine([SAP, NEOGRID])
const PRESCRIPTION_ATTESTATION = combine([IQVIA, SCANNTECH])

export type AllocationKpi = {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly format: 'integer' | 'percent' | 'money' | 'money_full' | 'multiple'
  readonly attestation: Attestation
}

/** Os seis indicadores de topo (seção 10.5). */
export const ALLOCATION_KPIS: readonly AllocationKpi[] = [
  {
    id: 'stock',
    label: 'Estoque disponível',
    value: 125_000,
    format: 'integer',
    attestation: STOCK_ATTESTATION,
  },
  {
    id: 'target-doctors',
    label: 'Médicos-alvo',
    value: 8_430,
    format: 'integer',
    attestation: PLAN_ATTESTATION,
  },
  {
    id: 'recommended',
    label: 'Amostras recomendadas',
    value: 98_750,
    format: 'integer',
    attestation: PLAN_ATTESTATION,
  },
  {
    id: 'coverage',
    label: 'Cobertura de médicos-alvo',
    value: 78,
    format: 'percent',
    attestation: PLAN_ATTESTATION,
  },
  {
    id: 'cost',
    label: 'Custo estimado',
    value: 247_875,
    format: 'money_full',
    attestation: combine([SAP, CRM_SFA]),
  },
  {
    id: 'roi',
    label: 'ROI estimado',
    value: 4.3,
    format: 'multiple',
    attestation: combine([IQVIA, SCANNTECH, SAP]),
  },
]

export type DoctorAllocation = {
  readonly doctorId: string
  /** Prescrição histórica, em unidades por mês. */
  readonly monthlyPrescriptions: number
  /** Frequência de visita, em dias entre visitas. */
  readonly visitFrequencyDays: number
  readonly samplesDelivered: number
  /** Amostras que o modelo recomenda entregar. */
  readonly recommendedSamples: number
  /** Conversão estimada, em unidades. */
  readonly estimatedConversionUnits: number
}

/** Recomendação por médico (seção 10.5), na ordem em que o ESCOPO a fixa. */
export const DOCTOR_ALLOCATIONS: readonly DoctorAllocation[] = [
  {
    doctorId: 'MD-001',
    monthlyPrescriptions: 320,
    visitFrequencyDays: 21,
    samplesDelivered: 10,
    recommendedSamples: 20,
    estimatedConversionUnits: 48,
  },
  {
    doctorId: 'MD-002',
    monthlyPrescriptions: 120,
    visitFrequencyDays: 30,
    samplesDelivered: 5,
    recommendedSamples: 15,
    estimatedConversionUnits: 22,
  },
  {
    doctorId: 'MD-003',
    monthlyPrescriptions: 280,
    visitFrequencyDays: 28,
    samplesDelivered: 8,
    recommendedSamples: 20,
    estimatedConversionUnits: 40,
  },
  {
    doctorId: 'MD-004',
    monthlyPrescriptions: 90,
    visitFrequencyDays: 45,
    samplesDelivered: 5,
    recommendedSamples: 10,
    estimatedConversionUnits: 15,
  },
  {
    doctorId: 'MD-005',
    monthlyPrescriptions: 350,
    visitFrequencyDays: 20,
    samplesDelivered: 12,
    recommendedSamples: 20,
    estimatedConversionUnits: 52,
  },
]

export function doctorOfAllocation(allocation: DoctorAllocation): Doctor | undefined {
  return DOCTORS.find((doctor) => doctor.id === allocation.doctorId)
}

export const DOCTOR_ALLOCATION_ATTESTATION = combine([IQVIA, CRM_SFA, SAP])

export type RegionAllocation = {
  readonly id: string
  readonly region: string
  readonly targetDoctors: number
  readonly availableStock: number
  readonly recommendedSamples: number
  readonly coveragePercent: number
  readonly estimatedRoi: number
}

/** Alocação por região (seção 10.5). */
export const REGION_ALLOCATIONS: readonly RegionAllocation[] = [
  {
    id: 'sp-capital',
    region: 'SP Capital',
    targetDoctors: 2_450,
    availableStock: 38_000,
    recommendedSamples: 29_500,
    coveragePercent: 82,
    estimatedRoi: 4.6,
  },
  {
    id: 'sp-interior',
    region: 'SP Interior',
    targetDoctors: 1_980,
    availableStock: 26_000,
    recommendedSamples: 20_400,
    coveragePercent: 76,
    estimatedRoi: 4.1,
  },
  {
    id: 'rj',
    region: 'RJ',
    targetDoctors: 1_320,
    availableStock: 18_000,
    recommendedSamples: 14_200,
    coveragePercent: 78,
    estimatedRoi: 4.3,
  },
  {
    id: 'mg',
    region: 'MG',
    targetDoctors: 1_890,
    availableStock: 25_000,
    recommendedSamples: 19_800,
    coveragePercent: 79,
    estimatedRoi: 4.2,
  },
  {
    id: 'outros',
    region: 'Outros',
    targetDoctors: 790,
    availableStock: 18_000,
    recommendedSamples: 14_850,
    coveragePercent: 72,
    estimatedRoi: 4.0,
  },
]

/** Linha de total da tabela por região (seção 10.5). */
export const REGION_TOTAL = {
  region: 'Total',
  targetDoctors: 8_430,
  availableStock: 125_000,
  recommendedSamples: 98_750,
  coveragePercent: 78,
  estimatedRoi: 4.3,
}

export const REGION_ATTESTATION = combine([SAP, CRM_SFA, NEOGRID])

export type SpecialtySlice = {
  readonly id: string
  readonly label: string
  readonly share: number
}

/** Distribuição recomendada por especialidade (seção 10.5). */
export const SPECIALTY_DISTRIBUTION: readonly SpecialtySlice[] = [
  { id: 'cardiologia', label: 'Cardiologia', share: 48 },
  { id: 'clinica-geral', label: 'Clínico Geral', share: 32 },
  { id: 'medicina-familia', label: 'Medicina de Família', share: 12 },
  { id: 'outros', label: 'Outros', share: 8 },
]

export type FunnelStage = {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly unit: 'samples' | 'prescriptions' | 'units'
  /** Conversão contra o estágio anterior, em porcentagem. */
  readonly conversionPercent: number | null
  readonly basis: string | null
}

/** Conversão esperada da campanha (seção 10.5). */
export const CONVERSION_FUNNEL: readonly FunnelStage[] = [
  {
    id: 'to-distribute',
    label: 'Amostras a distribuir',
    value: 98_750,
    unit: 'samples',
    conversionPercent: null,
    basis: null,
  },
  {
    id: 'used',
    label: 'Amostras utilizadas',
    value: 72_100,
    unit: 'samples',
    conversionPercent: 73,
    basis: 'das distribuídas',
  },
  {
    id: 'prescriptions',
    label: 'Prescrições estimadas',
    value: 34_560,
    unit: 'prescriptions',
    conversionPercent: 48,
    basis: 'das utilizadas',
  },
  {
    id: 'sellout',
    label: 'Sell-out incremental',
    value: 24_150,
    unit: 'units',
    conversionPercent: null,
    basis: null,
  },
]

export const FUNNEL_ATTESTATION = combine([IQVIA, SCANNTECH, CRM_SFA])

/**
 * Bloqueio por ruptura — o princípio inviolável do módulo 4.4.
 *
 * A origem é o diagnóstico canônico do HUB: ruptura acima de 10% em três
 * estados do Nordeste. O bloqueio não é uma regra escrita nesta tela, é
 * consequência de um dado que outro produto da plataforma apurou — e por isso
 * carrega o link para lá.
 */
const NE_STOCKOUT = DIAGNOSTICS.find((diagnostic) => diagnostic.id === 'ruptura-ne')

export const STOCKOUT_BLOCK = {
  territories: 3,
  region: 'Nordeste',
  headline: '3 territórios do Nordeste bloqueados',
  reason: 'Ruptura acima de 10% detectada pelo HUB.',
  principle: 'Não estimular demanda onde o produto não está disponível.',
  /** Tela do HUB em que o diagnóstico que originou o bloqueio está publicado. */
  sourceRoute: '/hub',
  sourceLabel: 'Ver o diagnóstico no HUB',
  diagnosticFinding: NE_STOCKOUT?.finding ?? '',
  diagnosticReading: NE_STOCKOUT?.reading ?? '',
  attestation: NE_STOCKOUT?.attestation ?? NEOGRID_DISTRIBUIDORES,
}

/**
 * NOTA: não consta do ESCOPO — as amostras retidas pelo bloqueio.
 * O número de territórios é canônico; o volume retido é declarado para que a
 * consequência do bloqueio tenha tamanho na tela.
 */
export const BLOCKED_SAMPLES = 6_400

/** Decisão que o envio para aprovação movimenta. */
export const ALLOCATION_DECISION_ID = 'D-2026-0004'

export const COST_PER_SAMPLE_BRL =
  Math.round(((ALLOCATION_KPIS[4]?.value ?? 0) / (ALLOCATION_KPIS[2]?.value ?? 1)) * 100) / 100

export const ALLOCATION_ATTESTATION = combine([IQVIA, CRM_SFA, SAP, NEOGRID])

export { PRESCRIPTION_ATTESTATION as ALLOCATION_PRESCRIPTION_ATTESTATION }
