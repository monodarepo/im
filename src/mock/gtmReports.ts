import type { SemanticTone } from '../design/tokens'
import { combine, type Attestation } from '../domain/attestation'
import { formatInteger, formatPercent, formatPointsDelta } from '../domain/format'
import { formatMoney } from '../domain/money'
import { CURRENT_PERSONA, PERSONAS, type Persona } from '../domain/persona'
import { daysAgo, daysFromNow, formatMonth, HOJE, type IsoDate } from '../domain/today'
import { findDecision } from './decisions'
import { DOCTORS, SPECIALTY_LABEL, type Doctor } from './doctors'
import {
  DAY_SUMMARY,
  NBA_ATTESTATION,
  NBA_FILTERS,
  PRIORITY_LABEL,
  PRIORITY_ORDER,
  PRIORITY_PINS,
  RECOMMENDATIONS,
  TEAM_PERFORMANCE,
  type Priority,
  type PriorityPin,
  type Recommendation,
  type TeamMetric,
} from './nba'
import { createRandom, MOCK_SEED } from './random'
import { BASE_ROUTE, ROUTE_ALERTS, ROUTING_ATTESTATION, type RouteAlert } from './routing'
import { CRM_SFA } from './sources'

/**
 * Relatórios (GTM, módulo 2.11).
 *
 * A tela não entrega uma lista de relatórios: entrega dois documentos prontos.
 * A pauta da reunião de ciclo e o relatório de desempenho do representante
 * nascem do que a plataforma já apurou — fila de Next Best Action, metas da
 * equipe, alertas de roteirização e execução do dia. Por isso este módulo não
 * redigita número: lê as origens canônicas e monta o documento em cima delas.
 *
 * O que não vem dessas origens está marcado item a item com `NOTA:`.
 */

// ---------------------------------------------------------------------------
// Leitores das origens canônicas
// ---------------------------------------------------------------------------

function personaNamed(name: string): Persona {
  const found = PERSONAS.find((persona) => persona.name === name)
  if (!found) throw new Error(`Persona inexistente: ${name}`)
  return found
}

function doctorOfId(id: string): Doctor {
  const found = DOCTORS.find((doctor) => doctor.id === id)
  if (!found) throw new Error(`Médico inexistente: ${id}`)
  return found
}

function recommendationOfDoctor(doctorId: string): Recommendation {
  const found = RECOMMENDATIONS.find((recommendation) => recommendation.doctorId === doctorId)
  if (!found) throw new Error(`Recomendação inexistente para o médico: ${doctorId}`)
  return found
}

function metricOf(id: string): TeamMetric {
  const found = TEAM_PERFORMANCE.find((metric) => metric.id === id)
  if (!found) throw new Error(`Indicador de equipe inexistente: ${id}`)
  return found
}

function alertOf(id: string): RouteAlert {
  const found = ROUTE_ALERTS.find((alert) => alert.id === id)
  if (!found) throw new Error(`Alerta de roteiro inexistente: ${id}`)
  return found
}

function pinOfDoctor(doctorId: string): PriorityPin {
  const found = PRIORITY_PINS.find((pin) => pin.doctorId === doctorId)
  if (!found) throw new Error(`Praça inexistente para o médico: ${doctorId}`)
  return found
}

function filterValue(label: string): string {
  const found = NBA_FILTERS.find((filter) => filter.label === label)
  if (!found) throw new Error(`Filtro inexistente no Next Best Action: ${label}`)
  return found.value
}

/** Meta de um indicador de equipe que a seção 10.4 fixa com alvo. */
function targetOf(metric: TeamMetric): number {
  if (metric.target === null) throw new Error(`Indicador sem meta: ${metric.id}`)
  return metric.target
}

const TERRITORY_SCOPE = filterValue('Território')
const SPECIALTY_SCOPE = filterValue('Especialidade')
const PRODUCT_SCOPE = filterValue('Produto')

const FIELD_REP = personaNamed('Fernanda Lima')
const DISTRICT_MANAGER = personaNamed('João Pedro')

/** NOTA: não consta do ESCOPO — duração do ciclo comercial, em dias. */
const CYCLE_LENGTH_DAYS = 14

/** NOTA: não consta do ESCOPO — dias até a reunião de ciclo. */
const MEETING_IN_DAYS = 2

const EXECUTION_ATTESTATION = CRM_SFA

// ---------------------------------------------------------------------------
// 1. Pauta da reunião de ciclo
// ---------------------------------------------------------------------------

export type EvidenceEmphasis = 'numeric' | 'text'

/** Origem que colocou o território na pauta. Sem ela, o item não entra. */
export type AgendaEvidence = {
  readonly id: string
  readonly kindLabel: string
  readonly finding: string
  readonly readingLabel: string | null
  readonly reading: string | null
  readonly readingEmphasis: EvidenceEmphasis
  readonly decisionId: string | null
  readonly impactBrl: number | null
  readonly attestation: Attestation
}

export type AgendaTopic = {
  readonly id: string
  readonly territoryLabel: string
  readonly priority: Priority
  readonly priorityLabel: string
  readonly owner: Persona
  readonly doctorName: string
  readonly specialtyLabel: string
  /** O que este território precisa resolver até o fim do ciclo. */
  readonly issue: string
  /** O que sai fechado da reunião. */
  readonly commitment: string
  readonly estimatedMinutes: number
  readonly decisionId: string | null
  readonly evidence: readonly AgendaEvidence[]
  readonly attestation: Attestation
}

function fromRecommendation(recommendation: Recommendation, doctor: Doctor): AgendaEvidence {
  const decision = doctor.decisionId ? findDecision(doctor.decisionId) : undefined

  return {
    id: `recomendacao-${recommendation.id}`,
    kindLabel: 'Fila de Next Best Action',
    finding: `${recommendation.action} — ${doctor.name}`,
    readingLabel: 'Motivo na fila',
    reading: recommendation.reason.join(' '),
    readingEmphasis: 'text',
    decisionId: decision ? decision.id : null,
    impactBrl: decision ? decision.impactBrl : null,
    attestation: recommendation.attestation,
  }
}

function fromMetric(metric: TeamMetric): AgendaEvidence {
  const target = targetOf(metric)

  return {
    id: `meta-${metric.id}`,
    kindLabel: 'Meta do ciclo',
    finding: `${metric.label} da equipe em ${formatPercent(metric.value, 0)} contra meta de ${formatPercent(target, 0)}`,
    readingLabel: 'Distância da meta',
    reading: formatPointsDelta(metric.value - target),
    readingEmphasis: 'numeric',
    decisionId: null,
    impactBrl: null,
    attestation: NBA_ATTESTATION,
  }
}

function fromAlert(alert: RouteAlert): AgendaEvidence {
  return {
    id: `alerta-${alert.id}`,
    kindLabel: 'Alerta de roteirização',
    finding: alert.title,
    readingLabel: 'O que o alerta muda',
    reading: alert.detail,
    readingEmphasis: 'text',
    decisionId: null,
    impactBrl: null,
    attestation: alert.attestation,
  }
}

function fromDaySummary(): AgendaEvidence {
  return {
    id: 'execucao-dia',
    kindLabel: 'Execução registrada',
    finding: 'Amostras dirigidas a médicos-alvo ainda sem entrega no território',
    readingLabel: 'Amostras a entregar',
    reading: `${formatInteger(DAY_SUMMARY.samplesToDeliver)} para ${formatInteger(DAY_SUMMARY.doctorsReached)} médicos alcançados`,
    readingEmphasis: 'numeric',
    decisionId: null,
    impactBrl: null,
    attestation: EXECUTION_ATTESTATION,
  }
}

/** NOTA: não consta do ESCOPO — faixa de tempo de cada item da pauta, em minutos. */
const TOPIC_MINUTES_MIN = 10
const TOPIC_MINUTES_MAX = 20
const TOPIC_SEED_OFFSET = 640

function topicMinutes(index: number): number {
  const random = createRandom(MOCK_SEED + TOPIC_SEED_OFFSET + index)
  return TOPIC_MINUTES_MIN + Math.round(random() * (TOPIC_MINUTES_MAX - TOPIC_MINUTES_MIN))
}

type TopicSeed = {
  readonly doctorId: string
  readonly ownerName: string
  readonly metricId: string
  readonly alertId: string | null
  readonly issue: string
  readonly commitment: string
}

/**
 * NOTA: não consta do ESCOPO — o recorte por praça, o responsável de cada
 * território e o texto do problema e do compromisso. As praças e a prioridade
 * vêm dos pins do Next Best Action; os médicos, a recomendação e as metas são
 * canônicos da seção 10.4.
 */
const TOPIC_SEEDS: readonly TopicSeed[] = [
  {
    doctorId: 'MD-001',
    ownerName: FIELD_REP.name,
    metricId: 'coverage',
    alertId: 'alert-stockout',
    issue:
      'Cardiologista de alto potencial sem visita há três semanas e ruptura confirmada na farmácia de maior giro da praça: a cobertura cai por ausência, não por preferência.',
    commitment:
      'Sair da reunião com a visita agendada dentro da semana e a reposição confirmada com o distribuidor.',
  },
  {
    doctorId: 'MD-003',
    ownerName: FIELD_REP.name,
    metricId: 'productive-visits',
    alertId: 'alert-opportunity',
    issue:
      'Maior distância entre potencial estimado e prescrição registrada da carteira, com janela de atendimento já confirmada pela secretaria.',
    commitment:
      'Fechar quem assume a janela antecipada e qual material de campanha entra, em uma página.',
  },
  {
    doctorId: 'MD-002',
    ownerName: DISTRICT_MANAGER.name,
    metricId: 'conversion',
    alertId: null,
    issue:
      'Volume de prescrição relevante concentrado no concorrente: a disputa é por início de tratamento, e a amostra é o instrumento que ainda não chegou ao consultório.',
    commitment:
      'Definir quantas amostras vão ao consultório nesta semana e qual caso clínico abre a conversa.',
  },
]

function buildTopic(seed: TopicSeed, index: number): AgendaTopic {
  const doctor = doctorOfId(seed.doctorId)
  const recommendation = recommendationOfDoctor(seed.doctorId)
  const pin = pinOfDoctor(seed.doctorId)
  const metric = metricOf(seed.metricId)

  const evidence: readonly AgendaEvidence[] = [
    fromRecommendation(recommendation, doctor),
    fromMetric(metric),
    seed.alertId ? fromAlert(alertOf(seed.alertId)) : fromDaySummary(),
  ]

  return {
    id: `pauta-${pin.id}`,
    territoryLabel: pin.label,
    priority: pin.priority,
    priorityLabel: PRIORITY_LABEL[pin.priority],
    owner: personaNamed(seed.ownerName),
    doctorName: doctor.name,
    specialtyLabel: SPECIALTY_LABEL[doctor.specialty],
    issue: seed.issue,
    commitment: seed.commitment,
    estimatedMinutes: topicMinutes(index),
    decisionId: doctor.decisionId ?? null,
    evidence,
    attestation: combine(evidence.map((item) => item.attestation)),
  }
}

const TOPIC_DRAFT: readonly AgendaTopic[] = TOPIC_SEEDS.map(buildTopic)

/** A pauta é ordenada pela prioridade da praça na fila de Next Best Action. */
export const AGENDA_TOPICS: readonly AgendaTopic[] = [...TOPIC_DRAFT].sort(
  (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
)

export const AGENDA_MINUTES = AGENDA_TOPICS.reduce(
  (total, topic) => total + topic.estimatedMinutes,
  0,
)

export const AGENDA_EVIDENCE_COUNT = AGENDA_TOPICS.reduce(
  (total, topic) => total + topic.evidence.length,
  0,
)

export const AGENDA_ATTESTATION: Attestation = combine(
  AGENDA_TOPICS.map((topic) => topic.attestation),
)

export const CYCLE_MEETING = {
  reference: 'PAUTA-GTM-2026-0001',
  title: 'Pauta da reunião de ciclo — equipe de campo',
  cycleLabel: `Ciclo de ${formatMonth(HOJE)}`,
  scopeLabel: TERRITORY_SCOPE,
  specialtyLabel: SPECIALTY_SCOPE,
  productLabel: PRODUCT_SCOPE,
  generatedOn: HOJE as IsoDate,
  heldOn: daysFromNow(MEETING_IN_DAYS),
  cycleStart: daysAgo(CYCLE_LENGTH_DAYS),
  facilitator: CURRENT_PERSONA,
  statusLabel: 'Rascunho gerado pela plataforma',
} as const

/** Quem senta na reunião: o distrito e a representante do território. */
export const MEETING_PARTICIPANTS: readonly Persona[] = [DISTRICT_MANAGER, FIELD_REP]

export const AGENDA_ORIGIN_NOTE =
  'Nenhum item foi digitado: cada território na pauta nasce da fila de Next Best Action, de uma meta do ciclo fora do alvo ou de um alerta de roteirização, e carrega a evidência que o colocou ali.'

// ---------------------------------------------------------------------------
// 2. Relatório de desempenho do representante
// ---------------------------------------------------------------------------

export type MetricStatus = 'above' | 'on' | 'watch' | 'below'

export const METRIC_STATUS_LABEL: Record<MetricStatus, string> = {
  above: 'Acima da meta',
  on: 'Na meta',
  watch: 'Perto da meta',
  below: 'Abaixo da meta',
}

export const METRIC_STATUS_TONE: Record<MetricStatus, SemanticTone> = {
  above: 'positive',
  on: 'neutral',
  watch: 'attention',
  below: 'negative',
}

/** NOTA: não consta do ESCOPO — distância em pp abaixo da meta ainda tratada como atenção. */
const WATCH_BAND_PP = 3

function statusOf(gapPp: number): MetricStatus {
  if (gapPp > 0) return 'above'
  if (gapPp === 0) return 'on'
  return gapPp >= -WATCH_BAND_PP ? 'watch' : 'below'
}

export type RepMetric = {
  readonly id: string
  readonly label: string
  /** Realizado da representante, em porcentagem. */
  readonly value: number
  readonly target: number
  /** Patamar da equipe no mesmo indicador, quando existe. */
  readonly teamValue: number | null
  readonly gapPp: number
  readonly status: MetricStatus
  readonly origin: string
  /** Frase pronta para a conversa de feedback. */
  readonly comment: string
  readonly attestation: Attestation
}

/**
 * NOTA: não consta do ESCOPO — o realizado individual. A seção 10.4 fixa o
 * patamar da equipe e a meta de cada indicador; o desvio individual é derivado
 * da semente do mock, dentro das bandas abaixo, para que a demonstração saia
 * idêntica em qualquer máquina.
 */
type RepBand = { readonly metricId: string; readonly min: number; readonly max: number }

const REP_BANDS: readonly RepBand[] = [
  { metricId: 'coverage', min: -6, max: 1 },
  { metricId: 'productive-visits', min: -4, max: 3 },
  { metricId: 'conversion', min: 1, max: 6 },
]

const REP_SEED_OFFSET = 610

function bandOf(metricId: string): RepBand {
  const found = REP_BANDS.find((band) => band.metricId === metricId)
  if (!found) throw new Error(`Banda de derivação inexistente: ${metricId}`)
  return found
}

function repValue(metric: TeamMetric, index: number): number {
  const band = bandOf(metric.id)
  const random = createRandom(MOCK_SEED + REP_SEED_OFFSET + index)
  return Math.round(metric.value + band.min + random() * (band.max - band.min))
}

/** NOTA: não consta do ESCOPO — faixas de tom do comentário sugerido, em pp. */
const SEVERE_GAP_PP = -10
const HEAVY_GAP_PP = -8

function feedbackLead(gapPp: number): string {
  if (gapPp > 0) return 'Reconhecer primeiro, sem diluir em ressalva.'
  if (gapPp === 0) return 'Confirmar o patamar e combinar como ele se sustenta no próximo ciclo.'
  if (gapPp >= -WATCH_BAND_PP) {
    return 'A diferença cabe em ajuste de agenda, não em mudança de abordagem.'
  }
  if (gapPp <= SEVERE_GAP_PP) return 'Entrar por aqui: é o que decide o ciclo.'
  if (gapPp <= HEAVY_GAP_PP) return 'Trazer com número e com prazo, não com adjetivo.'
  return 'Recuperável dentro do ciclo, se o ajuste começar nesta semana.'
}

function buildComment(
  label: string,
  value: number,
  target: number,
  gapPp: number,
  teamValue: number | null,
  focus: string,
): string {
  const team = teamValue === null ? '' : ` A equipe está em ${formatPercent(teamValue, 0)}.`

  return `${label} em ${formatPercent(value, 0)} contra meta de ${formatPercent(target, 0)} (${formatPointsDelta(gapPp)}).${team} ${feedbackLead(gapPp)} Fechar na conversa ${focus}.`
}

type RepFocus = { readonly metricId: string; readonly focus: string; readonly origin: string }

const REP_FOCUS: readonly RepFocus[] = [
  {
    metricId: 'coverage',
    focus: 'quais médicos de alto potencial entram na carteira do próximo ciclo',
    origin: 'Cobertura da equipe na semana, com o desvio da carteira dela',
  },
  {
    metricId: 'productive-visits',
    focus: 'o que caracteriza visita produtiva no território e o que a interrompe',
    origin: 'Visitas produtivas da equipe na semana, com o desvio da carteira dela',
  },
  {
    metricId: 'conversion',
    focus: 'o que funcionou na abordagem para replicar no restante da equipe',
    origin: 'Conversão por visita da equipe na semana, com o desvio da carteira dela',
  },
]

function focusOf(metricId: string): RepFocus {
  const found = REP_FOCUS.find((item) => item.metricId === metricId)
  if (!found) throw new Error(`Foco de feedback inexistente: ${metricId}`)
  return found
}

const TARGETED_METRICS: readonly TeamMetric[] = TEAM_PERFORMANCE.filter(
  (metric) => metric.target !== null && metric.format === 'percent',
)

const DERIVED_METRICS: readonly RepMetric[] = TARGETED_METRICS.map((metric, index) => {
  const target = targetOf(metric)
  const value = repValue(metric, index)
  const gapPp = value - target
  const { focus, origin } = focusOf(metric.id)

  return {
    id: metric.id,
    label: metric.label,
    value,
    target,
    teamValue: metric.value,
    gapPp,
    status: statusOf(gapPp),
    origin,
    comment: buildComment(metric.label, value, target, gapPp, metric.value, focus),
    attestation: NBA_ATTESTATION,
  }
})

/** NOTA: não consta do ESCOPO — meta de aderência ao roteiro do ciclo. */
const ROUTE_ADHERENCE_TARGET = 85

const ADHERENCE_METRIC: RepMetric = {
  id: 'route-adherence',
  label: 'Aderência ao roteiro',
  value: DAY_SUMMARY.routeAdherencePercent,
  target: ROUTE_ADHERENCE_TARGET,
  teamValue: null,
  gapPp: DAY_SUMMARY.routeAdherencePercent - ROUTE_ADHERENCE_TARGET,
  status: statusOf(DAY_SUMMARY.routeAdherencePercent - ROUTE_ADHERENCE_TARGET),
  origin: 'Roteiro planejado contra o roteiro efetivamente cumprido',
  comment: buildComment(
    'Aderência ao roteiro',
    DAY_SUMMARY.routeAdherencePercent,
    ROUTE_ADHERENCE_TARGET,
    DAY_SUMMARY.routeAdherencePercent - ROUTE_ADHERENCE_TARGET,
    null,
    'o que tira o roteiro do plano no meio do dia — janela, deslocamento ou alerta',
  ),
  attestation: combine([EXECUTION_ATTESTATION, ROUTING_ATTESTATION]),
}

export const REP_METRICS: readonly RepMetric[] = [...DERIVED_METRICS, ADHERENCE_METRIC]

export const REP_ABOVE_COUNT = REP_METRICS.filter((metric) => metric.status === 'above').length

export const REP_BELOW_COUNT = REP_METRICS.filter(
  (metric) => metric.status === 'below' || metric.status === 'watch',
).length

export const REP_METRICS_ATTESTATION: Attestation = combine(
  REP_METRICS.map((metric) => metric.attestation),
)

export type RepFact = {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly detail: string | null
  readonly attestation: Attestation
}

/** Execução do dia e do roteiro planejado, sem nenhum campo digitado. */
export const REP_FACTS: readonly RepFact[] = [
  {
    id: 'visits',
    label: 'Visitas do dia',
    value: `${formatInteger(DAY_SUMMARY.completedVisits)} de ${formatInteger(DAY_SUMMARY.plannedVisits)}`,
    detail: 'Concluídas sobre planejadas',
    attestation: EXECUTION_ATTESTATION,
  },
  {
    id: 'doctors',
    label: 'Médicos alcançados',
    value: formatInteger(DAY_SUMMARY.doctorsReached),
    detail: `Fila recomposta às ${DAY_SUMMARY.updatedAt}`,
    attestation: EXECUTION_ATTESTATION,
  },
  {
    id: 'samples',
    label: 'Amostras a entregar',
    value: formatInteger(DAY_SUMMARY.samplesToDeliver),
    detail: 'Dirigidas a médicos-alvo da carteira',
    attestation: EXECUTION_ATTESTATION,
  },
  {
    id: 'stops',
    label: 'Paradas no roteiro planejado',
    value: formatInteger(BASE_ROUTE.stops.length),
    detail: `${formatInteger(BASE_ROUTE.totalTravelMinutes)} min de deslocamento previsto`,
    attestation: ROUTING_ATTESTATION,
  },
]

export const REP_REPORT = {
  reference: 'REL-GTM-2026-0001',
  title: 'Relatório de desempenho do representante',
  rep: FIELD_REP,
  manager: DISTRICT_MANAGER,
  scopeLabel: TERRITORY_SCOPE,
  cycleLabel: CYCLE_MEETING.cycleLabel,
  periodStart: CYCLE_MEETING.cycleStart,
  periodEnd: HOJE as IsoDate,
  issuedOn: HOJE as IsoDate,
  statusLabel: 'Pré-preenchido pela plataforma',
  decisionId: 'D-2026-0003',
} as const

/** Territórios que a representante responde na pauta acima. */
export const REP_TERRITORIES: readonly string[] = AGENDA_TOPICS.filter(
  (topic) => topic.owner.name === FIELD_REP.name,
).map((topic) => topic.territoryLabel)

const REP_DECISION = findDecision(REP_REPORT.decisionId)

/** A decisão que o relatório endereça, com o impacto que ela carrega. */
export const REP_DECISION_LINE =
  REP_DECISION === undefined
    ? null
    : {
        id: REP_DECISION.id,
        title: REP_DECISION.title,
        impactLabel: formatMoney(REP_DECISION.impactBrl),
      }

export type OpenField = {
  readonly id: string
  readonly label: string
  readonly note: string
}

/** O que a plataforma não sabe: fica em branco e é assumido na conversa. */
export const REP_OPEN_FIELDS: readonly OpenField[] = [
  {
    id: 'manager-comment',
    label: 'Avaliação do gestor',
    note: 'A preencher na conversa de feedback',
  },
  {
    id: 'agreed-plan',
    label: 'Plano acordado para o próximo ciclo',
    note: 'A preencher na conversa de feedback',
  },
  {
    id: 'rep-comment',
    label: 'Comentário da representante',
    note: 'A preencher pela própria representante',
  },
]

export const REP_ORIGIN_NOTE =
  'Os indicadores, a execução do dia e o roteiro vêm da plataforma; o comentário sugerido é redigido a partir deles. O que a plataforma não sabe fica em branco e é assumido na conversa — nada é estimado para completar o documento.'

function pluralCount(count: number, singular: string, plural: string): string {
  return `${formatInteger(count)} ${count === 1 ? singular : plural}`
}

export const REP_SUMMARY_COMMENT = `Começar por ${pluralCount(REP_ABOVE_COUNT, 'indicador acima da meta', 'indicadores acima da meta')} e tratar ${pluralCount(REP_BELOW_COUNT, 'indicador abaixo', 'indicadores abaixo')} como plano do próximo ciclo — com número acordado na conversa, não repassado.`
