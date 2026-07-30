import { SEMANTIC } from '../design/tokens'
import { combine, type Attestation } from '../domain/attestation'
import {
  DOCTOR_COVERAGE_OPPORTUNITY,
  DOCTORS,
  doctorTotals,
  type Doctor,
  type PotentialTier,
} from './doctors'
import { TEAM_PERFORMANCE, type TeamMetric } from './nba'
import { createRandom, MOCK_SEED } from './random'
import { CRM_SFA, IQVIA } from './sources'

/**
 * Segmentação e targeting (GTM, módulo 2.3).
 *
 * A matriz potencial × propensão só vale se o usuário souber por que cada
 * médico caiu naquele quadrante. Por isso o score não é um número opaco: ele é
 * a soma explícita das contribuições de cada fator, e a decomposição é o
 * produto da tela — a posição no gráfico é apenas o resumo dela.
 *
 * Duas fontes sustentam o módulo. Prescrição vem do painel médico (IQVIA,
 * semanas de defasagem); visita, frequência e resposta a amostra vêm do CRM/SFA
 * (dias). Todo score composto herda o elo mais fraco entre elas.
 */

/* -------------------------------------------------------------------------- */
/* NOTA: não consta do ESCOPO — eixo de propensão, fatores e seus pesos.       */
/*                                                                             */
/* A seção 10.4 fixa os três médicos canônicos e sua faixa de potencial; a     */
/* 10.2 fixa a oportunidade de cobertura em Cardiologia RJ. Propensão, lista   */
/* de fatores, pesos, cortes dos quadrantes e a distribuição da carteira pelos */
/* segmentos são derivados com semente fixa (`MOCK_SEED`), de modo que a       */
/* demonstração saia idêntica em qualquer máquina.                             */
/*                                                                             */
/* O eixo de potencial NÃO é livre: a âncora de cada médico vem da faixa       */
/* canônica (`potentialTier`) e os fatores só modulam em torno dela, dentro de */
/* uma banda estreita o bastante para que alto potencial jamais atravesse o    */
/* corte para baixo — e vice-versa.                                            */
/* -------------------------------------------------------------------------- */

export const SCORE_MIN = 0
export const SCORE_MAX = 100

/** Corte de potencial da matriz. Acima dele, o médico é alvo de investimento. */
export const POTENTIAL_THRESHOLD = 65

/** Corte de propensão. Acima dele, a carteira responde à abordagem atual. */
export const PROPENSITY_THRESHOLD = 52

/** Âncora do eixo de potencial, por faixa canônica da seção 10.4. */
const TIER_ANCHOR: Record<PotentialTier, number> = { high: 80, medium: 48, low: 26 }

/** Amplitude máxima que os fatores podem mover o potencial em torno da âncora. */
const POTENTIAL_MODULATION_SPAN = 14

const PROPENSITY_BASE = 50
const PROPENSITY_SPAN = 40

/** Faixa dos fatores sem lastro em dado nominal do médico. */
const SOFT_LEVEL_RANGE = 0.55

const SEGMENTATION_SEED_OFFSET = 900

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step
}

function between(random: () => number, min: number, max: number): number {
  return min + random() * (max - min)
}

/* -------------------------------------------------------------------------- */
/* Quadrantes                                                                  */
/* -------------------------------------------------------------------------- */

export type QuadrantId = 'priority' | 'develop' | 'maintain' | 'low'

export const QUADRANT_ORDER: readonly QuadrantId[] = ['priority', 'develop', 'maintain', 'low']

export const QUADRANT_LABEL: Record<QuadrantId, string> = {
  priority: 'Prioridade máxima',
  develop: 'Desenvolver',
  maintain: 'Manter',
  low: 'Baixa prioridade',
}

export const QUADRANT_DESCRIPTION: Record<QuadrantId, string> = {
  priority: 'Alto potencial e alta propensão',
  develop: 'Alto potencial, propensão ainda baixa',
  maintain: 'Alta propensão sobre potencial menor',
  low: 'Potencial e propensão baixos',
}

/**
 * Cor do quadrante é leitura de dado, não de produto: verde onde está o valor
 * conversível, âmbar onde há valor mas falta relacionamento, cinza onde a
 * carteira apenas se mantém.
 */
export const QUADRANT_COLOR: Record<QuadrantId, string> = {
  priority: SEMANTIC.positive,
  develop: SEMANTIC.attention,
  maintain: SEMANTIC.neutral,
  low: '#CBD5E1',
}

export const AXIS_LABEL: Record<'potential' | 'propensity', string> = {
  potential: 'Potencial',
  propensity: 'Propensão',
}

export function quadrantOf(potentialScore: number, propensityScore: number): QuadrantId {
  const highPotential = potentialScore >= POTENTIAL_THRESHOLD
  const highPropensity = propensityScore >= PROPENSITY_THRESHOLD
  if (highPotential && highPropensity) return 'priority'
  if (highPotential) return 'develop'
  if (highPropensity) return 'maintain'
  return 'low'
}

/* -------------------------------------------------------------------------- */
/* Fatores                                                                     */
/* -------------------------------------------------------------------------- */

export type FactorAxis = 'potential' | 'propensity'

export type FactorDefinition = {
  readonly id: string
  readonly label: string
  readonly axis: FactorAxis
  /** Peso do fator no eixo. Os pesos de cada eixo somam 1. */
  readonly weight: number
  readonly attestation: Attestation
  /** O que faz o fator subir, em uma frase. */
  readonly meaning: string
}

export const POTENTIAL_FACTORS: readonly FactorDefinition[] = [
  {
    id: 'patient-volume',
    label: 'Volume de pacientes na agenda',
    axis: 'potential',
    weight: 0.3,
    attestation: CRM_SFA,
    meaning: 'Quantos pacientes da classe terapêutica passam pelo consultório no mês.',
  },
  {
    id: 'category-prescription',
    label: 'Prescrição na categoria',
    axis: 'potential',
    weight: 0.26,
    attestation: IQVIA,
    meaning: 'Volume prescrito na categoria, comparado ao resto da carteira.',
  },
  {
    id: 'therapeutic-fit',
    label: 'Aderência ao portfólio',
    axis: 'potential',
    weight: 0.18,
    attestation: IQVIA,
    meaning: 'Quanto do que ele prescreve tem equivalente no portfólio Hypera.',
  },
  {
    id: 'market-weight',
    label: 'Peso da praça',
    axis: 'potential',
    weight: 0.14,
    attestation: CRM_SFA,
    meaning: 'Tamanho do universo médico da praça onde ele atende.',
  },
  {
    id: 'institutional-influence',
    label: 'Influência institucional',
    axis: 'potential',
    weight: 0.12,
    attestation: CRM_SFA,
    meaning: 'Vínculo com hospital, sociedade ou grupo que multiplica a prescrição.',
  },
]

export const PROPENSITY_FACTORS: readonly FactorDefinition[] = [
  {
    id: 'visit-recency',
    label: 'Recência da última visita',
    axis: 'propensity',
    weight: 0.28,
    attestation: CRM_SFA,
    meaning: 'Quanto mais recente o último contato, maior a chance de conversão agora.',
  },
  {
    id: 'visit-frequency',
    label: 'Frequência de visita no ciclo',
    axis: 'propensity',
    weight: 0.24,
    attestation: CRM_SFA,
    meaning: 'Número de visitas registradas no ciclo, contra o padrão da carteira.',
  },
  {
    id: 'hypera-share',
    label: 'Participação Hypera na prescrição',
    axis: 'propensity',
    weight: 0.22,
    attestation: IQVIA,
    meaning: 'Fatia da Hypera no que ele já prescreve — relação existente, não potencial.',
  },
  {
    id: 'sample-response',
    label: 'Resposta histórica a amostra',
    axis: 'propensity',
    weight: 0.16,
    attestation: CRM_SFA,
    meaning: 'Prescrição observada depois da entrega de amostra em ciclos anteriores.',
  },
  {
    id: 'campaign-engagement',
    label: 'Engajamento com campanha',
    axis: 'propensity',
    weight: 0.1,
    attestation: CRM_SFA,
    meaning: 'Retorno a material, evento e contato remoto no ciclo.',
  },
]

export const FACTOR_AXIS_LABEL: Record<FactorAxis, string> = AXIS_LABEL

/* -------------------------------------------------------------------------- */
/* Derivação dos níveis                                                        */
/* -------------------------------------------------------------------------- */

type Spread = { readonly min: number; readonly max: number }

function spreadOf(values: readonly number[]): Spread {
  return { min: Math.min(...values), max: Math.max(...values) }
}

/** Posição relativa dentro da carteira, normalizada em `[-1, 1]`. */
function relativeLevel(value: number, spread: Spread): number {
  if (spread.max === spread.min) return 0
  return roundOneDecimal(((value - spread.min) / (spread.max - spread.min)) * 2 - 1)
}

const PRESCRIPTION_SPREAD = spreadOf(DOCTORS.map((doctor) => doctor.prescriptions))
const VISIT_SPREAD = spreadOf(DOCTORS.map((doctor) => doctor.visits))
const LAST_VISIT_SPREAD = spreadOf(DOCTORS.map((doctor) => doctor.lastVisitDaysAgo))

/**
 * Fatores com lastro em dado nominal do médico. Os demais são derivados da
 * semente fixa — nenhum deles inventa um número exibido isoladamente na tela.
 */
const DERIVED_LEVEL: Readonly<Record<string, (doctor: Doctor) => number>> = {
  'category-prescription': (doctor) => relativeLevel(doctor.prescriptions, PRESCRIPTION_SPREAD),
  'visit-frequency': (doctor) => relativeLevel(doctor.visits, VISIT_SPREAD),
  'visit-recency': (doctor) => -relativeLevel(doctor.lastVisitDaysAgo, LAST_VISIT_SPREAD),
}

export type FactorScore = {
  readonly factor: FactorDefinition
  /** Intensidade do fator neste médico, em `[-1, 1]`. */
  readonly level: number
  /** Quanto o fator soma (ou tira) do score, em pontos. */
  readonly contributionPoints: number
}

type AxisScore = {
  readonly score: number
  readonly factors: readonly FactorScore[]
}

function scoreAxis(
  doctor: Doctor,
  factors: readonly FactorDefinition[],
  base: number,
  span: number,
  random: () => number,
): AxisScore {
  const scored = factors.map((factor) => {
    const derive = DERIVED_LEVEL[factor.id]
    const level = derive
      ? derive(doctor)
      : roundOneDecimal(between(random, -SOFT_LEVEL_RANGE, SOFT_LEVEL_RANGE))

    return {
      factor,
      level,
      contributionPoints: roundOneDecimal(factor.weight * level * span),
    }
  })

  return {
    score: roundOneDecimal(
      scored.reduce((sum, item) => sum + item.contributionPoints, base),
    ),
    factors: scored,
  }
}

export type DoctorSegmentation = {
  readonly doctor: Doctor
  /** Sobrenome, para rótulo curto no gráfico. */
  readonly shortName: string
  readonly potentialScore: number
  readonly propensityScore: number
  /** Ponto de partida do potencial, dado pela faixa canônica. */
  readonly potentialAnchor: number
  readonly propensityBase: number
  readonly potentialFactors: readonly FactorScore[]
  readonly propensityFactors: readonly FactorScore[]
  readonly quadrant: QuadrantId
  readonly attestation: Attestation
}

export const POTENTIAL_SCORE_ATTESTATION: Attestation = combine([IQVIA, CRM_SFA])
export const PROPENSITY_SCORE_ATTESTATION: Attestation = combine([CRM_SFA, IQVIA])
export const MATRIX_ATTESTATION: Attestation = combine([IQVIA, CRM_SFA])
export const COVERAGE_ATTESTATION: Attestation = CRM_SFA

function lastName(name: string): string {
  const parts = name.split(' ')
  return parts[parts.length - 1] ?? name
}

export const SEGMENTATIONS: readonly DoctorSegmentation[] = DOCTORS.map((doctor, index) => {
  const random = createRandom(MOCK_SEED + SEGMENTATION_SEED_OFFSET + index)
  const anchor = TIER_ANCHOR[doctor.potentialTier]
  const potential = scoreAxis(doctor, POTENTIAL_FACTORS, anchor, POTENTIAL_MODULATION_SPAN, random)
  const propensity = scoreAxis(
    doctor,
    PROPENSITY_FACTORS,
    PROPENSITY_BASE,
    PROPENSITY_SPAN,
    random,
  )

  return {
    doctor,
    shortName: lastName(doctor.name),
    potentialScore: potential.score,
    propensityScore: propensity.score,
    potentialAnchor: anchor,
    propensityBase: PROPENSITY_BASE,
    potentialFactors: potential.factors,
    propensityFactors: propensity.factors,
    quadrant: quadrantOf(potential.score, propensity.score),
    attestation: MATRIX_ATTESTATION,
  }
})

export function findSegmentation(doctorId: string): DoctorSegmentation | undefined {
  return SEGMENTATIONS.find((item) => item.doctor.id === doctorId)
}

/**
 * Abre a tela no médico ligado à decisão canônica de cobertura; na falta dele,
 * no primeiro canônico da seção 10.4.
 */
export function defaultSelectedDoctorId(): string {
  const withDecision = SEGMENTATIONS.find((item) => item.doctor.decisionId !== undefined)
  const canonical = SEGMENTATIONS.find((item) => item.doctor.canonical)
  const chosen = withDecision ?? canonical ?? SEGMENTATIONS[0]
  if (!chosen) throw new Error('Carteira de segmentação vazia')
  return chosen.doctor.id
}

/** Fator de maior peso absoluto — o que explica a posição em uma frase. */
export function dominantFactor(scores: readonly FactorScore[]): FactorScore | undefined {
  return scores.reduce<FactorScore | undefined>(
    (best, item) =>
      best === undefined || Math.abs(item.contributionPoints) > Math.abs(best.contributionPoints)
        ? item
        : best,
    undefined,
  )
}

/* -------------------------------------------------------------------------- */
/* Segmentos resultantes                                                       */
/* -------------------------------------------------------------------------- */

const TOTALS = doctorTotals('brasil')

export const TARGET_DOCTORS = TOTALS.targetDoctors
export const TOTAL_POTENTIAL_BRL = TOTALS.potentialBrl

/**
 * NOTA: não consta do ESCOPO — a distribuição da carteira pelos quadrantes.
 * A cauda longa fica no quadrante de baixa prioridade e o valor se concentra
 * nos dois de alto potencial, que juntos respondem por menos de um terço dos
 * médicos e por quase três quartos do potencial.
 */
const SEGMENT_SHARE: Record<QuadrantId, { readonly doctors: number; readonly potential: number }> =
  {
    priority: { doctors: 0.14, potential: 0.38 },
    develop: { doctors: 0.21, potential: 0.34 },
    maintain: { doctors: 0.27, potential: 0.18 },
    low: { doctors: 0.38, potential: 0.1 },
  }

/** O último segmento absorve o resíduo de arredondamento: a tabela fecha o total. */
function distribute(total: number, shares: readonly number[], step: number): readonly number[] {
  const head = shares.slice(0, -1).map((share) => roundTo(total * share, step))
  const used = head.reduce((sum, value) => sum + value, 0)
  return [...head, total - used]
}

const DOCTOR_COUNTS = distribute(
  TARGET_DOCTORS,
  QUADRANT_ORDER.map((id) => SEGMENT_SHARE[id].doctors),
  1,
)

const POTENTIAL_VALUES = distribute(
  TOTAL_POTENTIAL_BRL,
  QUADRANT_ORDER.map((id) => SEGMENT_SHARE[id].potential),
  10_000,
)

/**
 * Ação de segmento é política de cobertura, não recomendação solta: os dois
 * quadrantes de alto potencial executam a decisão canônica de cobertura em
 * Cardiologia RJ; os demais são regra de frequência, sem decisão associada.
 */
const SEGMENT_ACTION: Record<
  QuadrantId,
  { readonly action: string; readonly decisionId: string | null }
> = {
  priority: {
    action: 'Visitar no ciclo, com amostra e material de campanha',
    decisionId: DOCTOR_COVERAGE_OPPORTUNITY.decisionId,
  },
  develop: {
    action: 'Abrir relacionamento antes de investir amostra: frequência primeiro',
    decisionId: DOCTOR_COVERAGE_OPPORTUNITY.decisionId,
  },
  maintain: {
    action: 'Manter frequência atual e migrar parte do contato para canal remoto',
    decisionId: null,
  },
  low: {
    action: 'Cobrir por canal digital, sem visita dedicada',
    decisionId: null,
  },
}

export type Segment = {
  readonly id: QuadrantId
  readonly label: string
  readonly description: string
  readonly color: string
  readonly doctors: number
  readonly doctorShare: number
  readonly potentialBrl: number
  readonly potentialShare: number
  readonly action: string
  readonly decisionId: string | null
  readonly namedDoctors: readonly DoctorSegmentation[]
  readonly attestation: Attestation
}

export const SEGMENTS: readonly Segment[] = QUADRANT_ORDER.map((id, index) => ({
  id,
  label: QUADRANT_LABEL[id],
  description: QUADRANT_DESCRIPTION[id],
  color: QUADRANT_COLOR[id],
  doctors: DOCTOR_COUNTS[index] ?? 0,
  doctorShare: SEGMENT_SHARE[id].doctors,
  potentialBrl: POTENTIAL_VALUES[index] ?? 0,
  potentialShare: SEGMENT_SHARE[id].potential,
  action: SEGMENT_ACTION[id].action,
  decisionId: SEGMENT_ACTION[id].decisionId,
  namedDoctors: SEGMENTATIONS.filter((item) => item.quadrant === id),
  attestation: MATRIX_ATTESTATION,
}))

function requireSegment(id: QuadrantId): Segment {
  const found = SEGMENTS.find((segment) => segment.id === id)
  if (!found) throw new Error(`Segmento ausente: ${id}`)
  return found
}

export const PRIORITY_SEGMENT = requireSegment('priority')
export const DEVELOP_SEGMENT = requireSegment('develop')

/** Médicos de alto potencial nos dois quadrantes que a decisão canônica cobre. */
export const HIGH_POTENTIAL_DOCTORS = PRIORITY_SEGMENT.doctors + DEVELOP_SEGMENT.doctors
export const HIGH_POTENTIAL_BRL = PRIORITY_SEGMENT.potentialBrl + DEVELOP_SEGMENT.potentialBrl

/* -------------------------------------------------------------------------- */
/* Âncoras canônicas                                                           */
/* -------------------------------------------------------------------------- */

function requireTeamMetric(id: string): TeamMetric {
  const found = TEAM_PERFORMANCE.find((metric) => metric.id === id)
  if (!found) throw new Error(`Métrica canônica ausente: ${id}`)
  return found
}

/** Cobertura de médicos: 82% contra meta de 90% (seção 10.4). */
export const COVERAGE_METRIC = requireTeamMetric('coverage')

function requireTarget(metric: TeamMetric): number {
  if (metric.target === null) throw new Error(`Métrica sem meta canônica: ${metric.id}`)
  return metric.target
}

export const COVERAGE_PERCENT = COVERAGE_METRIC.value
export const COVERAGE_TARGET_PERCENT = requireTarget(COVERAGE_METRIC)
export const COVERAGE_GAP_PP = roundOneDecimal(COVERAGE_PERCENT - COVERAGE_TARGET_PERCENT)

/** Decisão que a segmentação executa: cobertura de médicos, Cardiologia RJ. */
export const SEGMENTATION_OPPORTUNITY = DOCTOR_COVERAGE_OPPORTUNITY

export const SEGMENTATION_FILTERS = [
  { label: 'Ciclo', value: 'Ciclo corrente' },
  { label: 'Território', value: 'Rio de Janeiro — Capital' },
  { label: 'Especialidade', value: 'Cardiologia e Clínica Geral' },
] as const
