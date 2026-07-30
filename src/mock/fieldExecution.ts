import { combine, type Attestation } from '../domain/attestation'
import type { SemanticTone } from '../design/tokens'
import { HOJE, type IsoDate } from '../domain/today'
import { DAY_SUMMARY } from './nba'
import { SKUS } from './products'
import { createRandom, MOCK_SEED } from './random'
import { BASE_ROUTE, type Stop } from './routing'
import { CRM_SFA, NEOGRID, SAP } from './sources'

/**
 * Execução comercial (GTM, módulo 2.8).
 *
 * A força de campo é a maior operação da companhia e a menos visível ao
 * software: o CRM de hoje é declaratório — o representante digita de memória o
 * que diz ter feito, e nada disso é verificável depois. A tela troca a
 * declaração pelo **registro assistido**: a visita chega ao sistema com
 * evidência de chegada, de permanência e do que foi efetivamente checado no
 * ponto de venda.
 *
 * O contraste entre *declarado* e *comprovado* é o argumento da tela, então ele
 * é o dado mais destacado — não um detalhe de rodapé.
 */

/* -------------------------------------------------------------------------- */
/* Contexto da força de campo                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Dimensão da força de campo. Não vem da seção 10 do ESCOPO: foi declarada na
 * entrevista de GTM, e a tela cita a origem em vez de atribuí-la a uma fonte de
 * dados da plataforma.
 */
export const FIELD_FORCE = {
  peopleInField: 5_000,
  headline: 'pessoas em campo hoje, invisíveis ao software',
  originLabel: 'Entrevista de GTM',
  originNote:
    'Número declarado na entrevista de GTM. Não é apuração de fonte de dados — é o tamanho da operação que hoje entra no sistema apenas pela digitação do representante.',
} as const

export const CURRENT_MODEL_NOTE =
  'CRM atual: o representante digita a visita de memória, depois do fato. O sistema registra a declaração, não a visita.'

export const ASSISTED_MODEL_NOTE =
  'Registro assistido: chegada, permanência e checagem de SKU chegam do próprio app de campo. O representante escreve só o que é julgamento — o resto já vem preenchido.'

/* -------------------------------------------------------------------------- */
/* Atestados                                                                   */
/* -------------------------------------------------------------------------- */

/** Visita, aderência e tempo em loja nascem do CRM/SFA. */
export const VISIT_ATTESTATION: Attestation = CRM_SFA

/** A evidência de campo é observada pelo app e conciliada com o roteiro. */
export const EVIDENCE_ATTESTATION: Attestation = CRM_SFA

/** O registro do PDV cruza a checagem de gôndola com o estoque do ponto. */
export const REGISTRATION_ATTESTATION: Attestation = combine([CRM_SFA, NEOGRID])

/** A conciliação do roteiro executado com a carteira do território. */
export const EXECUTION_ATTESTATION: Attestation = combine([CRM_SFA, NEOGRID, SAP])

export const EXECUTION_DATE: IsoDate = HOJE

/* -------------------------------------------------------------------------- */
/* Relógio da demonstração                                                     */
/* -------------------------------------------------------------------------- */

function clockToMinutes(time: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!match) throw new Error(`Horário inválido: ${time}`)
  return Number(match[1]) * 60 + Number(match[2])
}

function minutesToClock(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440
  const hours = Math.floor(normalized / 60)
  const rest = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export function addMinutes(time: string, minutes: number): string {
  return minutesToClock(clockToMinutes(time) + minutes)
}

/* -------------------------------------------------------------------------- */
/* Cockpit de visitas e aderência                                              */
/* -------------------------------------------------------------------------- */

export type FieldRep = {
  readonly id: string
  readonly name: string
  readonly territory: string
  readonly plannedVisits: number
  readonly completedVisits: number
  readonly routeAdherencePercent: number
  /** Minutos médios de permanência nas visitas concluídas. */
  readonly averageVisitMinutes: number
  /** Visitas concluídas com evidência de campo capturada. */
  readonly evidenceVisits: number
  /** `true` no representante cujos números são canônicos da seção 10.4. */
  readonly anchored: boolean
}

/**
 * Permanência média prevista no roteiro canônico. Não é um número novo: é a
 * média das paradas do `BASE_ROUTE`, e serve de referência ao tempo medido.
 */
export const PLANNED_VISIT_MINUTES: number = Math.round(
  BASE_ROUTE.stops.reduce((sum, stop) => sum + stop.durationMinutes, 0) / BASE_ROUTE.stops.length,
)

/* -------------------------------------------------------------------------- */
/* NOTA: não consta do ESCOPO — as bandas de derivação da equipe.              */
/*                                                                             */
/* A seção 10.4 fixa apenas o dia do representante âncora: 18 visitas          */
/* planejadas, 7 concluídas e 78% de aderência ao roteiro. As linhas dos       */
/* demais representantes são derivadas das bandas abaixo com semente fixa      */
/* (`MOCK_SEED`), de modo que a demonstração saia idêntica em qualquer         */
/* máquina. Nomes de representantes são fictícios.                             */
/* -------------------------------------------------------------------------- */

const PLANNED_MIN = 14
const PLANNED_MAX = 21
const COMPLETION_RATE_MIN = 0.32
const COMPLETION_RATE_MAX = 0.58
const ADHERENCE_MIN = 61
const ADHERENCE_MAX = 92
const VISIT_MINUTES_MIN = 17
const VISIT_MINUTES_MAX = 33
const EVIDENCE_RATE_MIN = 0.42
const EVIDENCE_RATE_MAX = 0.82

const FIELD_SEED_OFFSET = 820

type RepSeed = {
  readonly id: string
  readonly name: string
  readonly territory: string
  readonly anchored: boolean
}

const REP_SEEDS: readonly RepSeed[] = [
  { id: 'rep-01', name: 'João Pedro', territory: 'Rio de Janeiro — Capital', anchored: true },
  { id: 'rep-02', name: 'Rodrigo Salles', territory: 'Rio de Janeiro — Interior', anchored: false },
  { id: 'rep-03', name: 'Patrícia Nogueira', territory: 'São Paulo — Capital', anchored: false },
  { id: 'rep-04', name: 'Elias Monteiro', territory: 'Minas Gerais — Triângulo', anchored: false },
  { id: 'rep-05', name: 'Beatriz Aguiar', territory: 'São Paulo — Interior', anchored: false },
]

function between(random: () => number, min: number, max: number): number {
  return min + random() * (max - min)
}

export const FIELD_REPS: readonly FieldRep[] = REP_SEEDS.map((seed, index) => {
  const random = createRandom(MOCK_SEED + FIELD_SEED_OFFSET + index)

  const plannedVisits = seed.anchored
    ? DAY_SUMMARY.plannedVisits
    : Math.round(between(random, PLANNED_MIN, PLANNED_MAX))

  const completedVisits = seed.anchored
    ? DAY_SUMMARY.completedVisits
    : Math.round(plannedVisits * between(random, COMPLETION_RATE_MIN, COMPLETION_RATE_MAX))

  const routeAdherencePercent = seed.anchored
    ? DAY_SUMMARY.routeAdherencePercent
    : Math.round(between(random, ADHERENCE_MIN, ADHERENCE_MAX))

  const averageVisitMinutes = seed.anchored
    ? PLANNED_VISIT_MINUTES
    : Math.round(between(random, VISIT_MINUTES_MIN, VISIT_MINUTES_MAX))

  const evidenceVisits = Math.round(
    completedVisits * between(random, EVIDENCE_RATE_MIN, EVIDENCE_RATE_MAX),
  )

  return {
    id: seed.id,
    name: seed.name,
    territory: seed.territory,
    plannedVisits,
    completedVisits,
    routeAdherencePercent,
    averageVisitMinutes,
    evidenceVisits,
    anchored: seed.anchored,
  }
})

/** Visitas que existem apenas na declaração do representante. */
export function declaredOnlyVisits(rep: FieldRep): number {
  return rep.completedVisits - rep.evidenceVisits
}

export function evidenceSharePercent(rep: FieldRep): number {
  if (rep.completedVisits === 0) return 0
  return Math.round((rep.evidenceVisits / rep.completedVisits) * 100)
}

export function completionPercent(rep: FieldRep): number {
  if (rep.plannedVisits === 0) return 0
  return Math.round((rep.completedVisits / rep.plannedVisits) * 100)
}

function sumOf(select: (rep: FieldRep) => number): number {
  return FIELD_REPS.reduce((total, rep) => total + select(rep), 0)
}

function weightedAverage(
  value: (rep: FieldRep) => number,
  weight: (rep: FieldRep) => number,
): number {
  const totalWeight = sumOf(weight)
  if (totalWeight === 0) return 0
  return Math.round(sumOf((rep) => value(rep) * weight(rep)) / totalWeight)
}

export type TeamExecution = {
  readonly plannedVisits: number
  readonly completedVisits: number
  readonly routeAdherencePercent: number
  readonly averageVisitMinutes: number
  readonly evidenceVisits: number
  readonly declaredOnlyVisits: number
  readonly evidenceSharePercent: number
  readonly declaredOnlySharePercent: number
  readonly repCount: number
}

const TEAM_COMPLETED = sumOf((rep) => rep.completedVisits)
const TEAM_EVIDENCE = sumOf((rep) => rep.evidenceVisits)
const TEAM_EVIDENCE_SHARE =
  TEAM_COMPLETED === 0 ? 0 : Math.round((TEAM_EVIDENCE / TEAM_COMPLETED) * 100)

/** Consolidado da equipe no dia corrente. */
export const TEAM_EXECUTION: TeamExecution = {
  plannedVisits: sumOf((rep) => rep.plannedVisits),
  completedVisits: TEAM_COMPLETED,
  routeAdherencePercent: weightedAverage(
    (rep) => rep.routeAdherencePercent,
    (rep) => rep.plannedVisits,
  ),
  averageVisitMinutes: weightedAverage(
    (rep) => rep.averageVisitMinutes,
    (rep) => rep.completedVisits,
  ),
  evidenceVisits: TEAM_EVIDENCE,
  declaredOnlyVisits: TEAM_COMPLETED - TEAM_EVIDENCE,
  evidenceSharePercent: TEAM_EVIDENCE_SHARE,
  declaredOnlySharePercent: 100 - TEAM_EVIDENCE_SHARE,
  repCount: FIELD_REPS.length,
}

/** Diferença entre o tempo medido em loja e o previsto no roteiro, em minutos. */
export const VISIT_MINUTES_DELTA: number =
  TEAM_EXECUTION.averageVisitMinutes - PLANNED_VISIT_MINUTES

export type EvidenceBucket = 'proven' | 'declared'

export const EVIDENCE_BUCKET_LABEL: Record<EvidenceBucket, string> = {
  proven: 'Comprovada',
  declared: 'Só declarada',
}

export const EVIDENCE_BUCKET_TONE: Record<EvidenceBucket, SemanticTone> = {
  proven: 'positive',
  declared: 'attention',
}

export const EVIDENCE_BUCKET_ORDER: readonly EvidenceBucket[] = ['proven', 'declared']

export const EVIDENCE_BUCKET_DESCRIPTION: Record<EvidenceBucket, string> = {
  proven:
    'Chegada, permanência e checagem capturadas pelo app. A visita pode ser reconstituída depois.',
  declared:
    'Existe só como texto digitado pelo representante. Nada nela é verificável fora da palavra dele.',
}

export const EVIDENCE_CONTRAST_NOTE =
  'A coluna “só declarada” não acusa ninguém: mede o quanto da operação de campo ainda entra no sistema sem lastro. É esse pedaço que o registro assistido elimina.'

/* -------------------------------------------------------------------------- */
/* Registro assistido de uma visita                                            */
/* -------------------------------------------------------------------------- */

function requireStop(id: string): Stop {
  const stop = BASE_ROUTE.stops.find((item) => item.id === id)
  if (!stop) throw new Error(`Parada canônica ausente: ${id}`)
  return stop
}

/** A visita registrada é a parada de ponto de venda do roteiro canônico. */
const POINT_OF_SALE_STOP = requireStop('stop-3')

const POINT_OF_SALE_POSITION =
  BASE_ROUTE.stops.findIndex((stop) => stop.id === POINT_OF_SALE_STOP.id) + 1

export type CaptureMode = 'auto' | 'manual'

export type VisitField = {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly mode: CaptureMode
  /** Como o campo chegou ao registro. */
  readonly origin: string
}

export type SkuCheckStatus = 'ok' | 'attention' | 'stockout'

export const SKU_CHECK_LABEL: Record<SkuCheckStatus, string> = {
  ok: 'Conforme',
  attention: 'Fora do padrão',
  stockout: 'Ruptura',
}

export const SKU_CHECK_TONE: Record<SkuCheckStatus, SemanticTone> = {
  ok: 'positive',
  attention: 'attention',
  stockout: 'negative',
}

export type SkuCheck = {
  readonly id: string
  readonly name: string
  readonly presentation: string
  readonly status: SkuCheckStatus
  readonly finding: string
  readonly checkedAt: string
}

/* -------------------------------------------------------------------------- */
/* NOTA: não consta do ESCOPO — o conteúdo do registro assistido.              */
/*                                                                             */
/* A parada, o horário de chegada e a permanência vêm do roteiro canônico       */
/* (`BASE_ROUTE`, parada 3) e os SKUs vêm do catálogo canônico (`SKUS`). A      */
/* ruptura de Losartana na Rede Aurora — Centro repete o alerta já declarado    */
/* em `routing.ts`. Os achados de gôndola, os campos manuais e os horários de   */
/* leitura de cada SKU são declarados aqui.                                     */
/* -------------------------------------------------------------------------- */

const SKU_CHECK_SEEDS: readonly {
  readonly status: SkuCheckStatus
  readonly finding: string
  readonly offsetMinutes: number
}[] = [
  {
    status: 'stockout',
    finding: 'Sem estoque em gôndola e sem lastro no depósito da loja.',
    offsetMinutes: 3,
  },
  {
    status: 'ok',
    finding: 'Bloco completo, preço de gôndola igual ao acordado com a rede.',
    offsetMinutes: 7,
  },
  {
    status: 'attention',
    finding: 'Frente de gôndola abaixo do espaço acordado, deslocada para a prateleira baixa.',
    offsetMinutes: 11,
  },
]

export const SKU_CHECKS: readonly SkuCheck[] = SKUS.map((sku, index) => {
  const seed = SKU_CHECK_SEEDS[index]
  if (!seed) throw new Error(`Checagem ausente para o SKU ${sku.id}`)
  return {
    id: sku.id,
    name: sku.name,
    presentation: sku.presentation,
    status: seed.status,
    finding: seed.finding,
    checkedAt: addMinutes(POINT_OF_SALE_STOP.arrival, seed.offsetMinutes),
  }
})

const DEPARTURE_TIME = addMinutes(
  POINT_OF_SALE_STOP.arrival,
  POINT_OF_SALE_STOP.durationMinutes,
)

const ANCHOR_REP = FIELD_REPS.find((rep) => rep.anchored) ?? FIELD_REPS[0]

export const VISIT_RECORD_HEADER = {
  reference: 'Visita VF-2026-0148',
  pointOfSale: POINT_OF_SALE_STOP.label,
  purpose: POINT_OF_SALE_STOP.sublabel,
  repName: ANCHOR_REP?.name ?? 'João Pedro',
  territory: ANCHOR_REP?.territory ?? 'Rio de Janeiro — Capital',
  visitedOn: EXECUTION_DATE,
  statusLabel: 'Registro fechado em campo',
} as const

export const AUTO_FIELDS: readonly VisitField[] = [
  {
    id: 'arrival',
    label: 'Chegada',
    value: POINT_OF_SALE_STOP.arrival,
    mode: 'auto',
    origin: 'Marcada pelo app ao entrar no perímetro do ponto de venda.',
  },
  {
    id: 'departure',
    label: 'Saída',
    value: DEPARTURE_TIME,
    mode: 'auto',
    origin: 'Marcada pelo app ao sair do perímetro.',
  },
  {
    id: 'dwell',
    label: 'Permanência em loja',
    value: `${POINT_OF_SALE_STOP.durationMinutes} min`,
    mode: 'auto',
    origin: 'Medida entre chegada e saída — não é digitada.',
  },
  {
    id: 'point-of-sale',
    label: 'Ponto de venda',
    value: POINT_OF_SALE_STOP.label,
    mode: 'auto',
    origin: 'Identificado pelo cadastro do território, sem busca manual.',
  },
  {
    id: 'route-stop',
    label: 'Parada do roteiro',
    value: `${POINT_OF_SALE_POSITION} de ${BASE_ROUTE.stops.length} · ${BASE_ROUTE.label}`,
    mode: 'auto',
    origin: 'Conciliada com o roteiro do dia, o que fecha a aderência.',
  },
  {
    id: 'travel',
    label: 'Deslocamento desde a parada anterior',
    value: `${POINT_OF_SALE_STOP.travelMinutes} min`,
    mode: 'auto',
    origin: 'Tempo entre a saída da parada anterior e esta chegada.',
  },
  {
    id: 'sku-checks',
    label: 'SKUs checados',
    value: `${SKU_CHECKS.length} de ${SKUS.length}`,
    mode: 'auto',
    origin: 'Leitura do código de cada item na gôndola, com horário por item.',
  },
  {
    id: 'photo',
    label: 'Foto da gôndola',
    value: '1 anexo',
    mode: 'auto',
    origin: 'Anexada ao registro com a parada e o horário da captura.',
  },
]

export const MANUAL_FIELDS: readonly VisitField[] = [
  {
    id: 'shelf-situation',
    label: 'Situação da gôndola',
    value: 'Bloco Hypera reduzido a uma prateleira; concorrente ocupou o nível dos olhos.',
    mode: 'manual',
    origin: 'Leitura do representante — julgamento, não medição.',
  },
  {
    id: 'stockout-reason',
    label: 'Motivo informado para a ruptura',
    value: 'Pedido de reposição não faturado na semana, segundo o gerente da loja.',
    mode: 'manual',
    origin: 'Relato colhido no balcão.',
  },
  {
    id: 'commitment',
    label: 'Compromisso do gerente',
    value: 'Recompor o bloco na reposição de quinta-feira.',
    mode: 'manual',
    origin: 'Acordo verbal registrado pelo representante.',
  },
  {
    id: 'next-step',
    label: 'Próximo passo',
    value: 'Reapresentar o plano de espaço com o dado de giro da praça.',
    mode: 'manual',
    origin: 'Definido pelo representante ao fechar a visita.',
  },
]

export const VISIT_FIELDS: readonly VisitField[] = [...AUTO_FIELDS, ...MANUAL_FIELDS]

export const AUTO_FIELD_SHARE_PERCENT = Math.round(
  (AUTO_FIELDS.length / VISIT_FIELDS.length) * 100,
)

export const REGISTRATION_GROUPS: readonly {
  readonly id: CaptureMode
  readonly title: string
  readonly description: string
  readonly fields: readonly VisitField[]
}[] = [
  {
    id: 'auto',
    title: 'Preenchido pela plataforma',
    description: 'Capturado pelo app de campo durante a visita. O representante não digita nada aqui.',
    fields: AUTO_FIELDS,
  },
  {
    id: 'manual',
    title: 'Preenchido pelo representante',
    description: 'O que continua sendo julgamento humano: o que ele viu, ouviu e combinou na loja.',
    fields: MANUAL_FIELDS,
  },
]

export type EvidenceKind = {
  readonly id: string
  readonly label: string
  readonly detail: string
}

export const EVIDENCE_KINDS: readonly EvidenceKind[] = [
  {
    id: 'arrival',
    label: 'Chegada',
    detail: 'Entrada no perímetro do ponto de venda, com horário e local do aparelho.',
  },
  {
    id: 'dwell',
    label: 'Permanência',
    detail: 'Tempo em loja medido pelo app, não informado depois.',
  },
  {
    id: 'checklist',
    label: 'Checagem de SKU',
    detail: 'Leitura do código de cada item conferido, com horário por item.',
  },
  {
    id: 'photo',
    label: 'Foto da gôndola',
    detail: 'Imagem anexada ao registro, amarrada à parada do roteiro.',
  },
]

export const REGISTRATION_NOTE =
  'O registro fecha em campo, com o representante ainda na loja. Nada é reconstituído de memória no fim do dia.'

export const FUTURE_ACTIONS: readonly { readonly label: string; readonly phase: string }[] = [
  { label: 'Exportar visitas comprovadas ao CRM', phase: 'Fase 2' },
  { label: 'Auditoria de evidência por amostragem', phase: 'Fase 3' },
  { label: 'Write-back da checagem de gôndola ao ERP', phase: 'Fase 3' },
]

/* -------------------------------------------------------------------------- */
/* Frame do app de campo — somente leitura                                     */
/* -------------------------------------------------------------------------- */

/**
 * NOTA: não consta do ESCOPO — o conteúdo do app de campo. A próxima visita e a
 * janela vêm do roteiro canônico; o horário do frame é fixo para que a
 * demonstração não dependa do relógio da máquina.
 */
const APP_CLOCK = addMinutes(POINT_OF_SALE_STOP.arrival, -6)

export type ChecklistItem = {
  readonly id: string
  readonly label: string
  readonly done: boolean
}

const MOBILE_CHECKLIST: readonly ChecklistItem[] = [
  ...SKU_CHECKS.map((check, index) => ({
    id: `check-${check.id}`,
    label: `Conferir ${check.name}`,
    done: index < 2,
  })),
  { id: 'check-photo', label: 'Fotografar a gôndola', done: false },
  { id: 'check-commitment', label: 'Registrar compromisso do gerente', done: false },
]

export const MOBILE_APP = {
  appName: 'Hypera Campo',
  screenTitle: 'Próxima visita',
  statusTime: APP_CLOCK,
  batteryLabel: '82%',
  networkLabel: '4G',
  repName: VISIT_RECORD_HEADER.repName,
  nextVisit: {
    title: POINT_OF_SALE_STOP.label,
    subtitle: POINT_OF_SALE_STOP.sublabel,
    windowLabel: `Janela ${POINT_OF_SALE_STOP.window}`,
    etaLabel: `Chegada prevista ${POINT_OF_SALE_STOP.arrival}`,
    travelLabel: `${POINT_OF_SALE_STOP.travelMinutes} min de deslocamento`,
    positionLabel: `Parada ${POINT_OF_SALE_POSITION} de ${BASE_ROUTE.stops.length}`,
  },
  checklistTitle: 'Checklist do PDV',
  checklist: MOBILE_CHECKLIST,
  primaryActionLabel: 'Registrar visita',
  secondaryActionLabel: 'Abrir roteiro do dia',
  captureHint: 'Chegada e permanência são marcadas sozinhas.',
  readOnlyLabel: 'Somente leitura',
  readOnlyNote:
    'Representação estática do app de campo. Nenhum controle dentro do frame é clicável nesta demonstração.',
} as const

export const MOBILE_CHECKLIST_DONE = MOBILE_CHECKLIST.filter((item) => item.done).length

export const MOBILE_CHECKLIST_TOTAL = MOBILE_CHECKLIST.length
