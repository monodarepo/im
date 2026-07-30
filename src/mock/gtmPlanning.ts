import { combine, type Attestation } from '../domain/attestation'
import { formatDecimal, formatInteger, formatPercent } from '../domain/format'
import { formatMoney, formatMoneyFull } from '../domain/money'
import { daysAgo, daysFromNow, HOJE, type IsoDate } from '../domain/today'
import { findDecision, type DecisionRef } from './decisions'
import {
  DOCTOR_SEGMENTS,
  doctorTotals,
  POTENTIAL_TIER_LABEL,
  REGION_LABEL,
  REGION_ORDER,
  type PotentialTier,
  type RegionId,
} from './doctors'
import { DAY_SUMMARY, SUGGESTED_ACTIONS, TEAM_PERFORMANCE, type TeamMetric } from './nba'
import { createRandom, MOCK_SEED } from './random'
import { CRM_SFA, IQVIA, SAP, SCANNTECH } from './sources'

/**
 * Planejamento GTM (módulo 2.2).
 *
 * O ciclo comercial vai do objetivo do período à alocação de esforço de campo.
 * Três coisas precisam estar na tela ao mesmo tempo para que o plano seja
 * revisável: em que estágio ele está e quem responde por cada um, quanto de
 * visita e de verba cada território recebe *e sob que critério*, e o que o plano
 * assume. Plano sem premissa explícita não é discutível — vira número imposto.
 *
 * Ancoragem nos números canônicos:
 *
 * - **Cobertura alvo** é a meta de cobertura da equipe (90%), e a cobertura
 *   atual (82%) é o ponto de partida — ambas de `nba.ts`.
 * - **Capacidade** nasce das 18 visitas planejadas por dia e da aderência de
 *   78% ao roteiro, também de `nba.ts`.
 * - **Universo médico e potencial não coberto** vêm de `doctors.ts`, que já está
 *   calibrado pela oportunidade canônica D-2026-0003.
 */

function requireMetric(id: string): TeamMetric {
  const metric = TEAM_PERFORMANCE.find((item) => item.id === id)
  if (!metric) throw new Error(`Métrica ausente em TEAM_PERFORMANCE: ${id}`)
  return metric
}

function requireDecision(id: string): DecisionRef {
  const decision = findDecision(id)
  if (!decision) throw new Error(`Decisão canônica ausente: ${id}`)
  return decision
}

const COVERAGE_METRIC = requireMetric('coverage')
const PRODUCTIVE_METRIC = requireMetric('productive-visits')
const CONVERSION_METRIC = requireMetric('conversion')

export const CURRENT_COVERAGE_PERCENT = COVERAGE_METRIC.value
export const TARGET_COVERAGE_PERCENT = COVERAGE_METRIC.target ?? COVERAGE_METRIC.value

/** Decisão que este ciclo endereça: cobertura de médicos em Cardiologia RJ. */
export const CYCLE_DECISION = requireDecision('D-2026-0003')

export const UNIVERSE_ATTESTATION = combine([IQVIA, CRM_SFA])
export const CAPACITY_ATTESTATION: Attestation = CRM_SFA
export const UNCOVERED_POTENTIAL_ATTESTATION = combine([IQVIA, SCANNTECH])
export const BUDGET_ATTESTATION = combine([SAP, CRM_SFA])

/** Atestado do plano inteiro: herda o elo mais fraco das três parcelas. */
export const PLANNING_ATTESTATION = combine([
  UNIVERSE_ATTESTATION,
  UNCOVERED_POTENTIAL_ATTESTATION,
  BUDGET_ATTESTATION,
])

/* -------------------------------------------------------------------------- */
/* NOTA: não consta do ESCOPO — a moldura do ciclo.                            */
/* Duração, dias úteis e datas de início e fim são declarados. Todas as datas   */
/* derivam de `HOJE`.                                                          */
/* -------------------------------------------------------------------------- */

export const PLANNING_CYCLE = {
  id: 'C3-2026',
  label: 'Ciclo 3 · 2026',
  weeks: 4,
  workingDays: 20,
  startsOn: daysFromNow(3) as IsoDate,
  endsOn: daysFromNow(30) as IsoDate,
} as const

/* -------------------------------------------------------------------------- */
/* Estágios do ciclo de planejamento                                           */
/* -------------------------------------------------------------------------- */

export type PlanningStageId =
  | 'objective'
  | 'resource_allocation'
  | 'territory_breakdown'
  | 'approval'
  | 'field_publication'

export type PlanningStageStatus = 'done' | 'active' | 'pending' | 'at_risk'

export const PLANNING_STAGE_STATUS_LABEL: Record<PlanningStageStatus, string> = {
  done: 'Concluído',
  active: 'Em andamento',
  pending: 'Pendente',
  at_risk: 'Em risco',
}

export type PlanningStage = {
  readonly id: PlanningStageId
  readonly order: number
  readonly label: string
  readonly description: string
  /** O que o estágio entrega — sem entregável, estágio é reunião. */
  readonly output: string
  readonly status: PlanningStageStatus
  readonly owner: string
  readonly date: IsoDate
  readonly attestation: Attestation
}

/**
 * NOTA: não consta do ESCOPO — datas, responsáveis, status e entregáveis de
 * cada estágio. A sequência dos cinco estágios é a do ciclo comercial; a
 * instância abaixo é declarada. Responsáveis usam as personas fictícias da
 * plataforma.
 */
export const PLANNING_STAGES: readonly PlanningStage[] = [
  {
    id: 'objective',
    order: 1,
    label: 'Definição do objetivo',
    description:
      'Objetivo do período traduzido em meta de cobertura, com a decisão priorizada que ele endereça.',
    output: 'Meta de cobertura e decisão âncora do ciclo',
    status: 'done',
    owner: 'Carla Mendes',
    date: daysAgo(18),
    attestation: UNIVERSE_ATTESTATION,
  },
  {
    id: 'resource_allocation',
    order: 2,
    label: 'Alocação de recurso',
    description:
      'Capacidade de visita e verba de campo do ciclo dimensionadas a partir da equipe instalada.',
    output: 'Capacidade em visitas e verba variável do ciclo',
    status: 'done',
    owner: 'João Pedro',
    date: daysAgo(11),
    attestation: BUDGET_ATTESTATION,
  },
  {
    id: 'territory_breakdown',
    order: 3,
    label: 'Desdobramento por território',
    description:
      'Esforço repartido entre os territórios pelo critério declarado, e não pela distribuição do ciclo anterior.',
    output: 'Visitas, representantes e verba por território',
    status: 'active',
    owner: 'João Pedro',
    date: HOJE,
    attestation: UNCOVERED_POTENTIAL_ATTESTATION,
  },
  {
    id: 'approval',
    order: 4,
    label: 'Aprovação',
    description:
      'Plano confrontado com a capacidade realizável. O déficit apurado precisa de decisão antes de descer ao campo.',
    output: 'Plano aprovado ou premissa revista',
    status: 'at_risk',
    owner: 'Mariana Santos',
    date: daysFromNow(2),
    attestation: CAPACITY_ATTESTATION,
  },
  {
    id: 'field_publication',
    order: 5,
    label: 'Publicação ao campo',
    description:
      'Plano vira roteiro e fila de recomendação no aplicativo do representante, com as prioridades do ciclo.',
    output: 'Roteiro e prioridades na mão do representante',
    status: 'pending',
    owner: 'Fernanda Lima',
    date: daysFromNow(3),
    attestation: CAPACITY_ATTESTATION,
  },
]

/* -------------------------------------------------------------------------- */
/* Universo-alvo e segmentação                                                 */
/* -------------------------------------------------------------------------- */

const TOTALS = doctorTotals('brasil')

export const TARGET_DOCTORS = TOTALS.targetDoctors
export const COVERED_DOCTORS = TOTALS.coveredDoctors

/** Médicos que o ciclo precisa cobrir para atingir a meta de cobertura. */
export const DOCTORS_TO_COVER = Math.round((TARGET_DOCTORS * TARGET_COVERAGE_PERCENT) / 100)

export const SEGMENT_ORDER: readonly PotentialTier[] = ['high', 'medium', 'low']

/**
 * NOTA: não consta do ESCOPO — a repartição do universo-alvo por faixa de
 * potencial e a frequência de visita que cada faixa recebe no ciclo. São as
 * duas premissas que mais mexem no tamanho do plano, por isso vão visíveis na
 * tela em vez de ficarem enterradas no cálculo.
 */
const SEGMENT_MIX_PERCENT: Record<PotentialTier, number> = { high: 22, medium: 46, low: 32 }
const SEGMENT_FREQUENCY_PER_CYCLE: Record<PotentialTier, number> = { high: 2, medium: 1, low: 0.5 }

export type SegmentPlan = {
  readonly tier: PotentialTier
  readonly label: string
  readonly mixPercent: number
  readonly doctorsToCover: number
  readonly frequencyPerCycle: number
  readonly requiredVisits: number
}

function buildSegmentPlans(): readonly SegmentPlan[] {
  return SEGMENT_ORDER.map((tier) => {
    const doctorsToCover = Math.round((DOCTORS_TO_COVER * SEGMENT_MIX_PERCENT[tier]) / 100)
    return {
      tier,
      label: POTENTIAL_TIER_LABEL[tier],
      mixPercent: SEGMENT_MIX_PERCENT[tier],
      doctorsToCover,
      frequencyPerCycle: SEGMENT_FREQUENCY_PER_CYCLE[tier],
      requiredVisits: Math.round(doctorsToCover * SEGMENT_FREQUENCY_PER_CYCLE[tier]),
    }
  })
}

export const SEGMENT_PLANS: readonly SegmentPlan[] = buildSegmentPlans()

/** Visitas que o plano exige para cumprir cobertura e frequência declaradas. */
export const REQUIRED_VISITS = SEGMENT_PLANS.reduce((sum, plan) => sum + plan.requiredVisits, 0)

/* -------------------------------------------------------------------------- */
/* Capacidade da equipe                                                        */
/* -------------------------------------------------------------------------- */

export const VISITS_PER_REP_DAY = DAY_SUMMARY.plannedVisits
export const ROUTE_ADHERENCE_PERCENT = DAY_SUMMARY.routeAdherencePercent

/** O que o representante planeja no ciclo, antes de qualquer perda. */
export const PLANNED_CAPACITY_PER_REP = VISITS_PER_REP_DAY * PLANNING_CYCLE.workingDays

/** O que a aderência histórica ao roteiro sustenta de fato. */
export const REALIZABLE_CAPACITY_PER_REP = Math.round(
  (PLANNED_CAPACITY_PER_REP * ROUTE_ADHERENCE_PERCENT) / 100,
)

/** NOTA: não consta do ESCOPO — o tamanho da equipe de campo. */
export const FIELD_TEAM_SIZE = 260

export const TEAM_CAPACITY_VISITS = FIELD_TEAM_SIZE * REALIZABLE_CAPACITY_PER_REP

/** Negativo quando o plano pede mais do que a equipe entrega. */
export const CAPACITY_GAP_VISITS = TEAM_CAPACITY_VISITS - REQUIRED_VISITS

export const CAPACITY_COVERAGE_PERCENT =
  REQUIRED_VISITS === 0 ? 0 : (TEAM_CAPACITY_VISITS / REQUIRED_VISITS) * 100

/**
 * NOTA: não consta do ESCOPO — o custo variável por visita. Cobre material e
 * deslocamento; não inclui custo de equipe.
 */
export const VARIABLE_COST_PER_VISIT_BRL = 40

export const ALLOCATED_BUDGET_BRL = TEAM_CAPACITY_VISITS * VARIABLE_COST_PER_VISIT_BRL

/* -------------------------------------------------------------------------- */
/* Alocação de esforço por território                                          */
/* -------------------------------------------------------------------------- */

/** NOTA: não consta do ESCOPO — os pesos do critério de alocação. */
const ALLOCATION_WEIGHTS = { coverageBase: 60, uncoveredPotential: 40 } as const

/** NOTA: não consta do ESCOPO — a dispersão da aderência entre territórios. */
const ADHERENCE_SPREAD_PP = 7

export type TerritoryAllocation = {
  readonly region: RegionId
  readonly label: string
  readonly doctorsToCover: number
  readonly uncoveredPotentialBrl: number
  /** Peso do território no critério declarado, em porcentagem. */
  readonly weightPercent: number
  readonly visits: number
  readonly reps: number
  readonly budgetBrl: number
  /** Visitas por médico a cobrir que a alocação sustenta no ciclo. */
  readonly frequencyPerDoctor: number
  /** Aderência histórica ao roteiro no território, em porcentagem. */
  readonly adherencePercent: number
}

function regionAggregate(region: RegionId): {
  targetDoctors: number
  uncoveredPotentialBrl: number
} {
  const cells = DOCTOR_SEGMENTS.filter((segment) => segment.region === region)
  return {
    targetDoctors: cells.reduce((sum, cell) => sum + cell.targetDoctors, 0),
    uncoveredPotentialBrl: cells.reduce((sum, cell) => sum + cell.potentialBrl, 0),
  }
}

function buildAllocations(): readonly TerritoryAllocation[] {
  const aggregates = REGION_ORDER.map((region) => ({ region, ...regionAggregate(region) }))
  const totalDoctors = aggregates.reduce((sum, entry) => sum + entry.targetDoctors, 0)
  const totalPotential = aggregates.reduce((sum, entry) => sum + entry.uncoveredPotentialBrl, 0)

  const drafts = aggregates.map((entry) => {
    const weight =
      (ALLOCATION_WEIGHTS.coverageBase / 100) * (entry.targetDoctors / totalDoctors) +
      (ALLOCATION_WEIGHTS.uncoveredPotential / 100) * (entry.uncoveredPotentialBrl / totalPotential)
    return { ...entry, weight, visits: Math.round(TEAM_CAPACITY_VISITS * weight) }
  })

  // O arredondamento por território não fecha na capacidade: a sobra vai para o
  // maior, para que a soma da coluna seja exatamente a capacidade da equipe.
  const drift = TEAM_CAPACITY_VISITS - drafts.reduce((sum, entry) => sum + entry.visits, 0)
  const largest = drafts[0]
  if (largest) largest.visits += drift

  const random = createRandom(MOCK_SEED + 41)
  const withAdherence = drafts.map((entry) => ({
    ...entry,
    adherence: ROUTE_ADHERENCE_PERCENT + (random() - 0.5) * 2 * ADHERENCE_SPREAD_PP,
  }))

  // A média ponderada por visitas fecha na aderência canônica de 78%.
  const visitTotal = withAdherence.reduce((sum, entry) => sum + entry.visits, 0)
  const mean =
    visitTotal === 0
      ? ROUTE_ADHERENCE_PERCENT
      : withAdherence.reduce((sum, entry) => sum + entry.adherence * entry.visits, 0) / visitTotal
  const shift = ROUTE_ADHERENCE_PERCENT - mean

  return withAdherence.map((entry) => {
    const doctorsToCover = Math.round((entry.targetDoctors * TARGET_COVERAGE_PERCENT) / 100)
    return {
      region: entry.region,
      label: REGION_LABEL[entry.region],
      doctorsToCover,
      uncoveredPotentialBrl: entry.uncoveredPotentialBrl,
      weightPercent: entry.weight * 100,
      visits: entry.visits,
      reps: Math.round(entry.visits / REALIZABLE_CAPACITY_PER_REP),
      budgetBrl: entry.visits * VARIABLE_COST_PER_VISIT_BRL,
      frequencyPerDoctor: doctorsToCover === 0 ? 0 : entry.visits / doctorsToCover,
      adherencePercent: entry.adherence + shift,
    }
  })
}

export const TERRITORY_ALLOCATIONS: readonly TerritoryAllocation[] = buildAllocations()

export const ALLOCATED_VISITS = TERRITORY_ALLOCATIONS.reduce(
  (sum, allocation) => sum + allocation.visits,
  0,
)

/** Critério declarado da alocação. Sem ele a tabela é opinião com números. */
export const ALLOCATION_CRITERION = {
  title: 'Base de cobertura + potencial não coberto',
  rules: [
    `${formatPercent(ALLOCATION_WEIGHTS.coverageBase, 0)} pela base de médicos a cobrir no território`,
    `${formatPercent(ALLOCATION_WEIGHTS.uncoveredPotential, 0)} pelo potencial ainda não coberto, em reais`,
  ],
  note: 'Alocar só por tamanho de base perpetua a cobertura de hoje; alocar só por potencial abandona território grande já atendido. Os dois pesos juntos, declarados, é o que torna o plano discutível.',
  budgetRule: `Verba de campo proporcional às visitas, a ${formatMoneyFull(VARIABLE_COST_PER_VISIT_BRL)} por visita — material e deslocamento, sem custo de equipe.`,
} as const

/* -------------------------------------------------------------------------- */
/* Premissas do plano                                                          */
/* -------------------------------------------------------------------------- */

export type Premise = {
  readonly id: string
  readonly label: string
  /** Valor já formatado pelo domínio. */
  readonly value: string
  /** De onde a premissa vem — número canônico ou parâmetro declarado. */
  readonly basis: string
  /** `true` quando o valor é canônico da plataforma. */
  readonly canonical: boolean
  readonly attestation: Attestation
}

function segmentFrequencyLabel(): string {
  return SEGMENT_PLANS.map(
    (plan) => `${plan.label.toLowerCase()} ${formatDecimal(plan.frequencyPerCycle, 1)}`,
  ).join(' · ')
}

function segmentMixLabel(): string {
  return SEGMENT_PLANS.map((plan) => formatPercent(plan.mixPercent, 0)).join(' · ')
}

export const PREMISES: readonly Premise[] = [
  {
    id: 'target-coverage',
    label: 'Cobertura alvo',
    value: formatPercent(TARGET_COVERAGE_PERCENT, 0),
    basis: `Meta de cobertura da equipe, partindo de ${formatPercent(CURRENT_COVERAGE_PERCENT, 0)} hoje`,
    canonical: true,
    attestation: UNIVERSE_ATTESTATION,
  },
  {
    id: 'target-universe',
    label: 'Universo-alvo de médicos',
    value: formatInteger(TARGET_DOCTORS),
    basis: `Base mapeada, com ${formatInteger(COVERED_DOCTORS)} já cobertos`,
    canonical: false,
    attestation: UNIVERSE_ATTESTATION,
  },
  {
    id: 'segment-mix',
    label: 'Mix do universo por potencial',
    value: segmentMixLabel(),
    basis: 'Repartição declarada entre alto, médio e baixo potencial',
    canonical: false,
    attestation: UNCOVERED_POTENTIAL_ATTESTATION,
  },
  {
    id: 'segment-frequency',
    label: 'Frequência por segmento no ciclo',
    value: segmentFrequencyLabel(),
    basis: 'Visitas por médico coberto em cada faixa de potencial',
    canonical: false,
    attestation: CAPACITY_ATTESTATION,
  },
  {
    id: 'planned-capacity',
    label: 'Capacidade planejada por representante',
    value: `${formatInteger(PLANNED_CAPACITY_PER_REP)} visitas`,
    basis: `${formatInteger(VISITS_PER_REP_DAY)} visitas por dia em ${formatInteger(PLANNING_CYCLE.workingDays)} dias úteis`,
    canonical: true,
    attestation: CAPACITY_ATTESTATION,
  },
  {
    id: 'realizable-capacity',
    label: 'Capacidade realizável por representante',
    value: `${formatInteger(REALIZABLE_CAPACITY_PER_REP)} visitas`,
    basis: `Capacidade planejada corrigida pela aderência ao roteiro de ${formatPercent(ROUTE_ADHERENCE_PERCENT, 0)}`,
    canonical: true,
    attestation: CAPACITY_ATTESTATION,
  },
  {
    id: 'team-size',
    label: 'Equipe de campo',
    value: `${formatInteger(FIELD_TEAM_SIZE)} representantes`,
    basis: 'Quadro instalado no início do ciclo, sem contratação prevista',
    canonical: false,
    attestation: CAPACITY_ATTESTATION,
  },
  {
    id: 'productive-visits',
    label: 'Visitas produtivas',
    value: formatPercent(PRODUCTIVE_METRIC.value, 0),
    basis: `Base histórica da equipe, contra meta de ${formatPercent(PRODUCTIVE_METRIC.target ?? PRODUCTIVE_METRIC.value, 0)}`,
    canonical: true,
    attestation: CAPACITY_ATTESTATION,
  },
  {
    id: 'conversion',
    label: 'Conversão por visita',
    value: formatPercent(CONVERSION_METRIC.value, 0),
    basis: `Base histórica da equipe, contra meta de ${formatPercent(CONVERSION_METRIC.target ?? CONVERSION_METRIC.value, 0)}`,
    canonical: true,
    attestation: UNIVERSE_ATTESTATION,
  },
  {
    id: 'visit-cost',
    label: 'Custo variável por visita',
    value: formatMoneyFull(VARIABLE_COST_PER_VISIT_BRL),
    basis: `Material e deslocamento; verba total do ciclo em ${formatMoney(ALLOCATED_BUDGET_BRL)}`,
    canonical: false,
    attestation: BUDGET_ATTESTATION,
  },
]

/**
 * Leitura do confronto entre o que o plano pede e o que a equipe entrega.
 * É o que põe o estágio de aprovação em risco.
 */
export const CAPACITY_VERDICT = {
  headline:
    CAPACITY_GAP_VISITS < 0
      ? 'O plano pede mais visitas do que a equipe entrega no ciclo'
      : 'A capacidade da equipe cobre o plano do ciclo',
  detail:
    'O déficit não bloqueia a publicação: ou a frequência do segmento de baixo potencial cai, ou a meta de cobertura do ciclo é revista. A escolha é da aprovação, e fica registrada na decisão.',
  options: [
    'Reduzir a frequência do baixo potencial e preservar a meta de cobertura',
    'Manter a frequência e escalonar a meta de cobertura ao longo de dois ciclos',
    'Concentrar o déficit nos territórios de menor potencial não coberto',
  ],
} as const

/** O que desce ao campo na publicação — as mesmas prioridades do ciclo. */
export const FIELD_BRIEF: readonly string[] = SUGGESTED_ACTIONS
