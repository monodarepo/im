import { combine, type Attestation } from '../domain/attestation'
import { CONVERSION_FUNNEL, ALLOCATION_KPIS, REGION_TOTAL } from './sampleAllocation'
import { CRM_SFA, IQVIA, SAP, SCANNTECH } from './sources'

/**
 * Conversão e ROI (AG, módulo 4.7).
 *
 * É a tela que responde ao CFO. A cadeia amostra → visita → prescrição →
 * sell-out → retorno mostra correlação; o que separa correlação de impacto é o
 * braço de controle. Sem grupo de controle, todo ROI de amostra grátis é a
 * soma do que teria acontecido de qualquer jeito com o que a amostra causou —
 * e é exatamente essa distinção que a incrementalidade isola.
 */

const CHAIN_ATTESTATION = combine([IQVIA, SCANNTECH, CRM_SFA])
const EXPERIMENT_ATTESTATION = combine([IQVIA, SCANNTECH])
const COST_ATTESTATION = combine([SAP, CRM_SFA])

const campaignCost = ALLOCATION_KPIS.find((kpi) => kpi.id === 'cost')?.value ?? 0

export type ChainStep = {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly unitLabel: string
  /** Conversão contra o passo anterior. `null` no primeiro. */
  readonly conversionPercent: number | null
}

/**
 * Cadeia completa. Os quatro primeiros passos são os da seção 10.5; a visita
 * entra entre a amostra e a prescrição porque é onde a amostra é entregue.
 *
 * NOTA: não consta do ESCOPO — o passo de visita e o valor de retorno em reais.
 */
export const CONVERSION_CHAIN: readonly ChainStep[] = [
  {
    id: 'samples',
    label: 'Amostras distribuídas',
    value: CONVERSION_FUNNEL[0]?.value ?? 0,
    unitLabel: 'amostras',
    conversionPercent: null,
  },
  {
    id: 'visits',
    label: 'Visitas com entrega registrada',
    value: 41_320,
    unitLabel: 'visitas',
    conversionPercent: null,
  },
  {
    id: 'used',
    label: 'Amostras utilizadas',
    value: CONVERSION_FUNNEL[1]?.value ?? 0,
    unitLabel: 'amostras',
    conversionPercent: CONVERSION_FUNNEL[1]?.conversionPercent ?? null,
  },
  {
    id: 'prescriptions',
    label: 'Prescrições estimadas',
    value: CONVERSION_FUNNEL[2]?.value ?? 0,
    unitLabel: 'prescrições',
    conversionPercent: CONVERSION_FUNNEL[2]?.conversionPercent ?? null,
  },
  {
    id: 'sellout',
    label: 'Sell-out incremental',
    value: CONVERSION_FUNNEL[3]?.value ?? 0,
    unitLabel: 'unidades',
    conversionPercent: null,
  },
]

export const CHAIN_ATTESTATION_EXPORT = CHAIN_ATTESTATION

/**
 * Teste × controle.
 *
 * NOTA: não consta do ESCOPO — o desenho do experimento e seus resultados.
 * A leitura de incrementalidade é do módulo 4.7; os números que a instanciam
 * são declarados e devem vir da apuração real quando ela existir.
 */
export type ExperimentArm = {
  readonly id: 'test' | 'control'
  readonly label: string
  readonly doctors: number
  /** Prescrições por médico no período. */
  readonly prescriptionsPerDoctor: number
  readonly description: string
}

export const EXPERIMENT_ARMS: readonly ExperimentArm[] = [
  {
    id: 'test',
    label: 'Grupo teste',
    doctors: 1_240,
    prescriptionsPerDoctor: 28.4,
    description: 'Médicos que receberam amostra na campanha.',
  },
  {
    id: 'control',
    label: 'Grupo controle',
    doctors: 1_240,
    prescriptionsPerDoctor: 19.7,
    description: 'Médicos de perfil equivalente que não receberam amostra.',
  },
]

const test = EXPERIMENT_ARMS[0] as ExperimentArm
const control = EXPERIMENT_ARMS[1] as ExperimentArm

/** Diferença entre os braços — o que a amostra causou, não o que ela acompanhou. */
export const INCREMENTAL_PER_DOCTOR =
  Math.round((test.prescriptionsPerDoctor - control.prescriptionsPerDoctor) * 10) / 10

export const INCREMENTAL_LIFT_PERCENT =
  Math.round((test.prescriptionsPerDoctor / control.prescriptionsPerDoctor - 1) * 100 * 10) / 10

/**
 * Fatia da prescrição do grupo teste que teria acontecido sem a amostra —
 * o que um ROI sem controle contaria como resultado da campanha.
 */
export const BASELINE_SHARE_PERCENT =
  Math.round((control.prescriptionsPerDoctor / test.prescriptionsPerDoctor) * 100 * 10) / 10

/** NOTA: não consta do ESCOPO — intervalo de confiança do experimento. */
export const CONFIDENCE_INTERVAL = { lowPercent: 34.9, highPercent: 53.4, level: 95 }

export type CostMetric = {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly format: 'money' | 'integer'
  readonly note: string
}

/** NOTA: não consta do ESCOPO — a contagem de médicos ativados. */
export const ACTIVATED_DOCTORS = 6_578

export const COST_METRICS: readonly CostMetric[] = [
  {
    id: 'campaign-cost',
    label: 'Custo da campanha',
    value: campaignCost,
    format: 'money',
    note: 'Seção 10.5.',
  },
  {
    id: 'activated',
    label: 'Médicos ativados',
    value: ACTIVATED_DOCTORS,
    format: 'integer',
    note: 'Receberam amostra e registraram prescrição no período.',
  },
  {
    id: 'cost-per-activated',
    label: 'Custo por médico ativado',
    value: Math.round((campaignCost / ACTIVATED_DOCTORS) * 100) / 100,
    format: 'money',
    note: 'Custo da campanha dividido pelos médicos ativados.',
  },
  {
    id: 'samples-per-activated',
    label: 'Amostras por médico ativado',
    value: Math.round(REGION_TOTAL.recommendedSamples / ACTIVATED_DOCTORS),
    format: 'integer',
    note: 'Quantas amostras foram necessárias para ativar um médico.',
  },
]

export type SaturationPoint = {
  readonly samplesPerDoctor: number
  readonly cardiology: number
  readonly generalPractice: number
  readonly familyMedicine: number
}

/**
 * Curva de saturação por segmento.
 *
 * NOTA: não consta do ESCOPO — a curva inteira. O formato é o ponto: a
 * conversão marginal cai conforme o volume por médico sobe, e cada segmento
 * satura em um ponto diferente. Distribuir mais não é distribuir melhor.
 */
export const SATURATION_CURVE: readonly SaturationPoint[] = [
  { samplesPerDoctor: 5, cardiology: 18.2, generalPractice: 14.6, familyMedicine: 12.1 },
  { samplesPerDoctor: 10, cardiology: 31.4, generalPractice: 24.8, familyMedicine: 20.3 },
  { samplesPerDoctor: 15, cardiology: 41.0, generalPractice: 31.2, familyMedicine: 25.4 },
  { samplesPerDoctor: 20, cardiology: 47.3, generalPractice: 34.9, familyMedicine: 28.1 },
  { samplesPerDoctor: 25, cardiology: 50.8, generalPractice: 36.6, familyMedicine: 29.3 },
  { samplesPerDoctor: 30, cardiology: 52.4, generalPractice: 37.3, familyMedicine: 29.8 },
  { samplesPerDoctor: 35, cardiology: 53.1, generalPractice: 37.6, familyMedicine: 30.0 },
]

export const SATURATION_SERIES = [
  { key: 'cardiology', label: 'Cardiologia', color: '#334155' },
  { key: 'generalPractice', label: 'Clínico Geral', color: '#0E7490' },
  { key: 'familyMedicine', label: 'Medicina de Família', color: '#B45309' },
] as const

/** NOTA: não consta do ESCOPO — o ponto de saturação recomendado por segmento. */
export const SATURATION_RECOMMENDATION = [
  { segment: 'Cardiologia', samplesPerDoctor: 20, rationale: 'Depois de 20, cada amostra adicional rende menos de 1 pp de conversão.' },
  { segment: 'Clínico Geral', samplesPerDoctor: 15, rationale: 'A curva achata mais cedo; volume acima disso vira estoque parado no consultório.' },
  { segment: 'Medicina de Família', samplesPerDoctor: 15, rationale: 'Menor teto de conversão da carteira — concentrar em quem converte mais.' },
]

export {
  CHAIN_ATTESTATION,
  COST_ATTESTATION,
  EXPERIMENT_ATTESTATION,
  type Attestation as ConversionAttestation,
}
