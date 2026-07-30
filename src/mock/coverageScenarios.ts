import { combine, type Attestation, type Confidence } from '../domain/attestation'
import { DAY_SUMMARY, TEAM_PERFORMANCE, type TeamMetric } from './nba'
import { CRM_SFA, IQVIA, SAP, SCANNTECH } from './sources'

/**
 * Simulador de cobertura (GTM, módulo 2.10).
 *
 * A pergunta da tela é de alocação, não de esforço: com o mesmo dia útil, quanto
 * da carteira dá para cobrir mudando tamanho de equipe, frequência por segmento
 * e a fatia de capacidade que vai para os territórios prioritários. Cada cenário
 * é uma coluna e as métricas são linhas, para que a comparação seja de leitura
 * horizontal — o mesmo padrão do simulador de cenários do RGM.
 *
 * ## Ancoragem nos números canônicos
 *
 * O cenário Atual reproduz a seção 10.4 sem recálculo: cobertura de médicos 82%
 * (meta 90%), visitas produtivas 68% (meta 75%), conversão por visita 23%
 * (meta 25%) e sell-out incremental de R$ 1,2M. A capacidade do ciclo parte das
 * 18 visitas planejadas por dia e da aderência de 78% do resumo do dia.
 *
 * ## Calibração
 *
 * Nada de coeficiente digitado à mão sobre as saídas: o modelo se calibra nas
 * âncoras canônicas e, por isso, reproduz o Atual por construção.
 *
 * 1. **Painel de médicos.** Sai da identidade `visitas realizadas = painel ×
 *    cobertura × frequência média`. Com 24 representantes, 21 dias úteis, 18
 *    visitas planejadas por dia, aderência de 78% e frequência média de 1,95
 *    visita por médico no ciclo, a cobertura de 82% fixa o painel.
 * 2. **Valor por conversão.** Sai do sell-out incremental canônico dividido
 *    pelas conversões do ciclo base (visitas realizadas × produtivas ×
 *    conversão). Assim o Atual devolve exatamente R$ 1,2M.
 *
 * ## Efeitos simulados
 *
 * - **Cobertura** responde à razão entre capacidade realizada e demanda de
 *   visitas do painel. Subir frequência sem subir equipe cobre menos médicos.
 * - **Visitas produtivas** sobem com a concentração em territórios prioritários
 *   (alvo melhor escolhido) e caem com saturação de frequência (a enésima visita
 *   ao mesmo médico rende menos contato útil).
 * - **Conversão** sobe com frequência, com retorno decrescente, e com a mesma
 *   concentração em territórios prioritários.
 *
 * NOTA: não consta do ESCOPO — tamanho de equipe, dias úteis do ciclo, mix e
 * frequência por segmento, fatia de capacidade em território prioritário, custo
 * por visita, custo fixo por representante e as sensibilidades do modelo. Todos
 * ficam declarados abaixo, com a origem no nome da constante. As saídas dos três
 * cenários alternativos são projeções derivadas destas premissas, e por isso
 * carregam atestado de método extrapolado e confiança rebaixada.
 */

function teamMetric(id: string): TeamMetric {
  const metric = TEAM_PERFORMANCE.find((item) => item.id === id)
  if (!metric) throw new Error(`Métrica ausente em TEAM_PERFORMANCE: ${id}`)
  return metric
}

const COVERAGE_METRIC = teamMetric('coverage')
const PRODUCTIVE_METRIC = teamMetric('productive-visits')
const CONVERSION_METRIC = teamMetric('conversion')
const INCREMENTAL_METRIC = teamMetric('incremental-sellout')

/** Metas da semana, como o ESCOPO as fixa. */
export const COVERAGE_TARGETS = {
  coveragePercent: COVERAGE_METRIC.target,
  productiveVisitPercent: PRODUCTIVE_METRIC.target,
  conversionPercent: CONVERSION_METRIC.target,
} as const

const CANONICAL_COVERAGE_PERCENT = COVERAGE_METRIC.value
const CANONICAL_PRODUCTIVE_PERCENT = PRODUCTIVE_METRIC.value
const CANONICAL_CONVERSION_PERCENT = CONVERSION_METRIC.value
const CANONICAL_INCREMENTAL_SELLOUT_BRL = INCREMENTAL_METRIC.value

/** Visitas planejadas por dia e aderência ao roteiro, do resumo do dia (10.4). */
const PLANNED_VISITS_PER_DAY = DAY_SUMMARY.plannedVisits
const ROUTE_ADHERENCE = DAY_SUMMARY.routeAdherencePercent / 100

/** NOTA: não consta do ESCOPO — dias úteis do ciclo de visitação. */
export const WORKING_DAYS_PER_CYCLE = 21

/** NOTA: não consta do ESCOPO — tamanho atual da equipe de campo do território. */
export const BASE_TEAM_SIZE = 24

/** NOTA: não consta do ESCOPO — custo variável por visita realizada, em reais. */
export const COST_PER_VISIT_BRL = 42

/** NOTA: não consta do ESCOPO — custo fixo por representante no ciclo, em reais. */
export const COST_PER_REP_CYCLE_BRL = 9_800

export type SegmentId = 'high' | 'medium' | 'low'

export type Segment = {
  readonly id: SegmentId
  readonly label: string
  /** Fatia do painel de médicos que o segmento representa. */
  readonly panelShare: number
}

/** NOTA: não consta do ESCOPO — a segmentação do painel e o peso de cada faixa. */
export const SEGMENTS: readonly Segment[] = [
  { id: 'high', label: 'Alto potencial', panelShare: 0.2 },
  { id: 'medium', label: 'Médio potencial', panelShare: 0.35 },
  { id: 'low', label: 'Baixo potencial', panelShare: 0.45 },
]

export type VisitFrequency = Record<SegmentId, number>

/** NOTA: não consta do ESCOPO — a frequência atual por segmento, em visitas/ciclo. */
const BASE_VISIT_FREQUENCY: VisitFrequency = { high: 4, medium: 2, low: 1 }

/** NOTA: não consta do ESCOPO — fatia atual da capacidade em territórios prioritários. */
const BASE_PRIORITY_SHARE_PERCENT = 60

export type CoverageInputs = {
  readonly fieldTeamSize: number
  readonly visitFrequency: VisitFrequency
  /** Fatia da capacidade dirigida aos territórios prioritários, em percentual. */
  readonly priorityTerritorySharePercent: number
}

const CURRENT_INPUTS: CoverageInputs = {
  fieldTeamSize: BASE_TEAM_SIZE,
  visitFrequency: BASE_VISIT_FREQUENCY,
  priorityTerritorySharePercent: BASE_PRIORITY_SHARE_PERCENT,
}

function averageFrequencyOf(frequency: VisitFrequency): number {
  return SEGMENTS.reduce((sum, segment) => sum + segment.panelShare * frequency[segment.id], 0)
}

function completedVisitsOf(fieldTeamSize: number): number {
  return fieldTeamSize * WORKING_DAYS_PER_CYCLE * PLANNED_VISITS_PER_DAY * ROUTE_ADHERENCE
}

const BASE_AVERAGE_FREQUENCY = averageFrequencyOf(BASE_VISIT_FREQUENCY)
const BASE_COMPLETED_VISITS = completedVisitsOf(BASE_TEAM_SIZE)

/** Painel de médicos do território, resolvido pela cobertura canônica de 82%. */
export const DOCTOR_PANEL = Math.round(
  BASE_COMPLETED_VISITS / ((CANONICAL_COVERAGE_PERCENT / 100) * BASE_AVERAGE_FREQUENCY),
)

const BASE_CONVERSIONS =
  BASE_COMPLETED_VISITS *
  (CANONICAL_PRODUCTIVE_PERCENT / 100) *
  (CANONICAL_CONVERSION_PERCENT / 100)

/** Sell-out incremental por conversão, resolvido pelo R$ 1,2M canônico. */
export const VALUE_PER_CONVERSION_BRL = CANONICAL_INCREMENTAL_SELLOUT_BRL / BASE_CONVERSIONS

/**
 * Sensibilidades do modelo.
 *
 * NOTA: não consta do ESCOPO — os quatro coeficientes abaixo. Sinal e ordem de
 * grandeza vêm do comportamento esperado de campo, não de medição.
 */
const TARGETING_PRODUCTIVITY_SENSITIVITY = 0.45
const TARGETING_CONVERSION_SENSITIVITY = 0.35
const FREQUENCY_SATURATION_EXPONENT = 0.18
const FREQUENCY_CONVERSION_ELASTICITY = 0.35
const TRAVEL_COST_SENSITIVITY = 0.12

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

export type CoverageOutcome = {
  readonly fieldTeamSize: number
  readonly averageFrequency: number
  readonly priorityTerritorySharePercent: number
  readonly plannedVisits: number
  readonly completedVisits: number
  readonly coveredDoctors: number
  readonly coveragePercent: number
  readonly productiveVisitPercent: number
  readonly conversionPercent: number
  readonly conversions: number
  readonly incrementalSellOutBrl: number
  readonly cycleCostBrl: number
  readonly costPerCoveredDoctorBrl: number
  /** Reais de sell-out incremental por real de custo de cobertura. */
  readonly sellOutPerCostBrl: number
}

/** Simula um cenário de cobertura. Determinístico e puro. */
export function simulateCoverage(inputs: CoverageInputs): CoverageOutcome {
  const averageFrequency = averageFrequencyOf(inputs.visitFrequency)
  const plannedVisits = inputs.fieldTeamSize * WORKING_DAYS_PER_CYCLE * PLANNED_VISITS_PER_DAY
  const completedVisits = completedVisitsOf(inputs.fieldTeamSize)

  const reachableShare = SEGMENTS.reduce(
    (sum, segment) => sum + (inputs.visitFrequency[segment.id] > 0 ? segment.panelShare : 0),
    0,
  )
  const visitDemand = DOCTOR_PANEL * averageFrequency
  const fillRate = visitDemand > 0 ? Math.min(1, completedVisits / visitDemand) : 0
  const coveredDoctors = DOCTOR_PANEL * reachableShare * fillRate
  const coveragePercent = round1((coveredDoctors / DOCTOR_PANEL) * 100)

  const priorityDelta =
    (inputs.priorityTerritorySharePercent - BASE_PRIORITY_SHARE_PERCENT) / 100

  const saturation =
    averageFrequency > 0
      ? (BASE_AVERAGE_FREQUENCY / averageFrequency) ** FREQUENCY_SATURATION_EXPONENT
      : 0
  const productiveVisitPercent = round1(
    CANONICAL_PRODUCTIVE_PERCENT *
      (1 + TARGETING_PRODUCTIVITY_SENSITIVITY * priorityDelta) *
      saturation,
  )

  const frequencyGain =
    averageFrequency > 0
      ? (averageFrequency / BASE_AVERAGE_FREQUENCY) ** FREQUENCY_CONVERSION_ELASTICITY
      : 0
  const conversionPercent = round1(
    CANONICAL_CONVERSION_PERCENT *
      frequencyGain *
      (1 + TARGETING_CONVERSION_SENSITIVITY * priorityDelta),
  )

  const productiveVisits = completedVisits * (productiveVisitPercent / 100)
  const conversions = productiveVisits * (conversionPercent / 100)
  const incrementalSellOutBrl = Math.round(conversions * VALUE_PER_CONVERSION_BRL)

  const costPerVisitBrl = COST_PER_VISIT_BRL * (1 + TRAVEL_COST_SENSITIVITY * priorityDelta)
  const cycleCostBrl = Math.round(
    completedVisits * costPerVisitBrl + inputs.fieldTeamSize * COST_PER_REP_CYCLE_BRL,
  )

  return {
    fieldTeamSize: inputs.fieldTeamSize,
    averageFrequency,
    priorityTerritorySharePercent: inputs.priorityTerritorySharePercent,
    plannedVisits: Math.round(plannedVisits),
    completedVisits: Math.round(completedVisits),
    coveredDoctors: Math.round(coveredDoctors),
    coveragePercent,
    productiveVisitPercent,
    conversionPercent,
    conversions: Math.round(conversions),
    incrementalSellOutBrl,
    cycleCostBrl,
    costPerCoveredDoctorBrl: coveredDoctors > 0 ? cycleCostBrl / coveredDoctors : 0,
    sellOutPerCostBrl: cycleCostBrl > 0 ? incrementalSellOutBrl / cycleCostBrl : 0,
  }
}

/**
 * Linha do Atual, fixada como dado.
 *
 * O modelo já devolve estes valores nos parâmetros canônicos; a fixação garante
 * que arredondamento nenhum se interponha entre a seção 10.4 e a tela.
 */
function pinCurrent(): CoverageOutcome {
  const modelled = simulateCoverage(CURRENT_INPUTS)
  const coveredDoctors = Math.round(DOCTOR_PANEL * (CANONICAL_COVERAGE_PERCENT / 100))
  const conversions =
    modelled.completedVisits *
    (CANONICAL_PRODUCTIVE_PERCENT / 100) *
    (CANONICAL_CONVERSION_PERCENT / 100)

  return {
    ...modelled,
    coveredDoctors,
    coveragePercent: CANONICAL_COVERAGE_PERCENT,
    productiveVisitPercent: CANONICAL_PRODUCTIVE_PERCENT,
    conversionPercent: CANONICAL_CONVERSION_PERCENT,
    conversions: Math.round(conversions),
    incrementalSellOutBrl: CANONICAL_INCREMENTAL_SELLOUT_BRL,
    costPerCoveredDoctorBrl: modelled.cycleCostBrl / coveredDoctors,
    sellOutPerCostBrl: CANONICAL_INCREMENTAL_SELLOUT_BRL / modelled.cycleCostBrl,
  }
}

export type CoverageScenarioId = 'current' | 'coverage-1' | 'coverage-2' | 'coverage-3'

export type CoverageScenario = {
  readonly id: CoverageScenarioId
  readonly label: string
  /** Frase curta que diz o que o cenário muda. */
  readonly premise: string
  readonly inputs: CoverageInputs
  /** Linha fixada, exibida enquanto o cenário não for editado. */
  readonly canonical: CoverageOutcome
  readonly editable: boolean
}

function scenario(
  id: CoverageScenarioId,
  label: string,
  premise: string,
  inputs: CoverageInputs,
): CoverageScenario {
  return { id, label, premise, inputs, canonical: simulateCoverage(inputs), editable: true }
}

export const COVERAGE_SCENARIOS: readonly CoverageScenario[] = [
  {
    id: 'current',
    label: 'Atual',
    premise: 'Equipe, frequência e alocação como estão hoje',
    inputs: CURRENT_INPUTS,
    canonical: pinCurrent(),
    editable: false,
  },
  scenario(
    'coverage-1',
    'Cenário 1',
    'Mesma equipe, capacidade concentrada nos territórios prioritários',
    {
      fieldTeamSize: BASE_TEAM_SIZE,
      visitFrequency: BASE_VISIT_FREQUENCY,
      priorityTerritorySharePercent: 78,
    },
  ),
  scenario('coverage-2', 'Cenário 2', 'Frequência dirigida ao alto potencial, equipe intacta', {
    fieldTeamSize: BASE_TEAM_SIZE,
    visitFrequency: { high: 5, medium: 2, low: 1 },
    priorityTerritorySharePercent: 72,
  }),
  scenario('coverage-3', 'Cenário 3', 'Três representantes a mais e realocação de território', {
    fieldTeamSize: 27,
    visitFrequency: BASE_VISIT_FREQUENCY,
    priorityTerritorySharePercent: 75,
  }),
]

export const COVERAGE_BASELINE = COVERAGE_SCENARIOS[0] as CoverageScenario

const FREQUENCY_TOLERANCE = 0.005

function sameInputs(a: CoverageInputs, b: CoverageInputs): boolean {
  return (
    a.fieldTeamSize === b.fieldTeamSize &&
    Math.abs(a.priorityTerritorySharePercent - b.priorityTerritorySharePercent) <
      FREQUENCY_TOLERANCE &&
    SEGMENTS.every(
      (segment) =>
        Math.abs(a.visitFrequency[segment.id] - b.visitFrequency[segment.id]) <
        FREQUENCY_TOLERANCE,
    )
  )
}

/**
 * Resolve o que a coluna exibe.
 *
 * Nos parâmetros do cenário devolve a linha fixada — é o que garante que mexer e
 * voltar reponha exatamente os números de origem, inclusive os canônicos do
 * Atual. Fora deles, entrega a simulação.
 */
export function resolveCoverageScenario(
  target: CoverageScenario,
  inputs: CoverageInputs,
): CoverageOutcome {
  return sameInputs(inputs, target.inputs) ? target.canonical : simulateCoverage(inputs)
}

/** Limites dos campos editáveis, para que a simulação não saia da faixa operável. */
export const INPUT_BOUNDS = {
  fieldTeamSize: { min: 12, max: 48, step: 1 },
  priorityTerritorySharePercent: { min: 30, max: 95, step: 1 },
} as const

const FIELD_ATTESTATION = combine([CRM_SFA, IQVIA])
const SELLOUT_ATTESTATION = combine([CRM_SFA, SCANNTECH])
const COST_ATTESTATION = combine([CRM_SFA, SAP])

/** Atestado do plano observado: o que o CRM, o sell-out e o ERP já registraram. */
export const COVERAGE_ATTESTATION: Attestation = combine([
  FIELD_ATTESTATION,
  SELLOUT_ATTESTATION,
  COST_ATTESTATION,
])

/**
 * Atestado das colunas simuladas. Projeção não se apresenta com a firmeza do
 * observado: método extrapolado e qualidade parcial rebaixam o elo mais fraco.
 */
export const COVERAGE_SIMULATION_ATTESTATION: Attestation = {
  ...COVERAGE_ATTESTATION,
  confidence: 'medium',
  quality: 'partial',
  method: 'extrapolated',
}

export const COVERAGE_FILTERS = [
  { label: 'Ciclo', value: 'Ciclo atual — 21 dias úteis' },
  { label: 'Território', value: 'Rio de Janeiro — Capital' },
  { label: 'Especialidade', value: 'Cardiologia' },
  { label: 'Produto', value: 'Losartana 50mg c/30' },
] as const

export type ParameterFormat = 'integer' | 'percent' | 'currency' | 'decimal'

export type CoverageParameter = {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly format: ParameterFormat
  /** Origem do número: canônico da seção 10.4 ou premissa declarada. */
  readonly canonical: boolean
}

export const COVERAGE_PARAMETERS: readonly CoverageParameter[] = [
  {
    id: 'team',
    label: 'Representantes em campo',
    value: BASE_TEAM_SIZE,
    format: 'integer',
    canonical: false,
  },
  {
    id: 'working-days',
    label: 'Dias úteis no ciclo',
    value: WORKING_DAYS_PER_CYCLE,
    format: 'integer',
    canonical: false,
  },
  {
    id: 'planned-per-day',
    label: 'Visitas planejadas por dia',
    value: PLANNED_VISITS_PER_DAY,
    format: 'integer',
    canonical: true,
  },
  {
    id: 'adherence',
    label: 'Aderência ao roteiro',
    value: DAY_SUMMARY.routeAdherencePercent,
    format: 'percent',
    canonical: true,
  },
  {
    id: 'panel',
    label: 'Painel de médicos',
    value: DOCTOR_PANEL,
    format: 'integer',
    canonical: false,
  },
  {
    id: 'frequency',
    label: 'Frequência média por médico',
    value: BASE_AVERAGE_FREQUENCY,
    format: 'decimal',
    canonical: false,
  },
  {
    id: 'priority-share',
    label: 'Capacidade em território prioritário',
    value: BASE_PRIORITY_SHARE_PERCENT,
    format: 'percent',
    canonical: false,
  },
  {
    id: 'cost-visit',
    label: 'Custo por visita',
    value: COST_PER_VISIT_BRL,
    format: 'currency',
    canonical: false,
  },
  {
    id: 'cost-rep',
    label: 'Custo fixo por representante no ciclo',
    value: COST_PER_REP_CYCLE_BRL,
    format: 'currency',
    canonical: false,
  },
]

export type SegmentPlanRow = {
  readonly id: SegmentId
  readonly label: string
  readonly panelSharePercent: number
  readonly doctors: number
  readonly frequency: number
}

/** Plano de frequência por segmento no cenário atual. */
export const SEGMENT_PLAN: readonly SegmentPlanRow[] = SEGMENTS.map((segment) => ({
  id: segment.id,
  label: segment.label,
  panelSharePercent: round1(segment.panelShare * 100),
  doctors: Math.round(DOCTOR_PANEL * segment.panelShare),
  frequency: BASE_VISIT_FREQUENCY[segment.id],
}))

export type CoverageKpi = {
  readonly id: string
  readonly label: string
  /** Valor já formatado pelo domínio. */
  readonly value: string
  readonly comparison?: string
  readonly delta?: number
  readonly attestation: Attestation
}

export const CURRENT_KPI_SOURCE: readonly {
  readonly id: string
  readonly metric: TeamMetric
  readonly attestation: Attestation
}[] = [
  { id: 'coverage', metric: COVERAGE_METRIC, attestation: FIELD_ATTESTATION },
  { id: 'productive-visits', metric: PRODUCTIVE_METRIC, attestation: FIELD_ATTESTATION },
  { id: 'conversion', metric: CONVERSION_METRIC, attestation: FIELD_ATTESTATION },
  { id: 'incremental-sellout', metric: INCREMENTAL_METRIC, attestation: SELLOUT_ATTESTATION },
]

/** Decisão do GTM a que a recomendação se prende. Nenhuma recomendação fica solta. */
export const COVERAGE_DECISION_ID = 'D-2026-0003'

export type CoverageRecommendation = {
  readonly scenarioId: CoverageScenarioId
  readonly headline: string
  readonly rationale: string
  readonly alternative: string
  readonly confidence: Confidence
  readonly confidencePercent: number
  readonly decisionId: string
  readonly attestation: Attestation
}

export const COVERAGE_RECOMMENDATION: CoverageRecommendation = {
  scenarioId: 'coverage-3',
  headline: 'Adotar o Cenário 3',
  rationale:
    'É o único cenário que leva a cobertura acima da meta de 90% e o de maior sell-out incremental do ciclo. O retorno por real de custo fica praticamente empatado com o Cenário 1, de modo que a equipe adicional se paga na mesma eficiência de hoje.',
  alternative:
    'Se a ampliação de equipe não for aprovada, o Cenário 1 entrega quase o mesmo retorno por real sem custo de estrutura — mas mantém a cobertura em 82% e deixa a lacuna contra a meta aberta.',
  confidence: 'medium',
  confidencePercent: 72,
  decisionId: COVERAGE_DECISION_ID,
  attestation: COVERAGE_SIMULATION_ATTESTATION,
}

function findScenario(id: CoverageScenarioId): CoverageScenario {
  const found = COVERAGE_SCENARIOS.find((item) => item.id === id)
  if (!found) throw new Error(`Cenário de cobertura desconhecido: ${id}`)
  return found
}

export const RECOMMENDED_SCENARIO = findScenario(COVERAGE_RECOMMENDATION.scenarioId)

/** Impacto do cenário recomendado contra o Atual, derivado das linhas fixadas. */
export const RECOMMENDED_COVERAGE_IMPACT = {
  coveragePoints: round1(
    RECOMMENDED_SCENARIO.canonical.coveragePercent - COVERAGE_BASELINE.canonical.coveragePercent,
  ),
  conversionPoints: round1(
    RECOMMENDED_SCENARIO.canonical.conversionPercent -
      COVERAGE_BASELINE.canonical.conversionPercent,
  ),
  doctorsReached:
    RECOMMENDED_SCENARIO.canonical.coveredDoctors - COVERAGE_BASELINE.canonical.coveredDoctors,
  incrementalSellOutBrl:
    RECOMMENDED_SCENARIO.canonical.incrementalSellOutBrl -
    COVERAGE_BASELINE.canonical.incrementalSellOutBrl,
  cycleCostBrl:
    RECOMMENDED_SCENARIO.canonical.cycleCostBrl - COVERAGE_BASELINE.canonical.cycleCostBrl,
} as const

/** Fases das ações ainda não disponíveis nesta tela. */
export const COVERAGE_FUTURE_ACTIONS = [
  { label: 'Salvar plano de cobertura', phase: 'Fase 2' },
  { label: 'Write-back ao CRM/SFA', phase: 'Fase 3' },
] as const
