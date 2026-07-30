import { combine, type Attestation } from '../domain/attestation'
import type { Decision, DecisionParcel } from '../domain/decision'
import { PERSONAS, type Persona } from '../domain/persona'
import { daysAgo, daysFromNow, HOJE, type IsoDate } from '../domain/today'
import type { SemanticTone } from '../design/tokens'
import { LOTS, UNIT_COST_BRL, VIRTUAL_STOCK, type VirtualStock } from './agInventory'
import { findDecision } from './decisions'
import { DOCTORS, SPECIALTY_LABEL, type Doctor } from './doctors'
import { ROUTE_ALERTS } from './routing'
import {
  ALLOCATION_DECISION_ID,
  DOCTOR_ALLOCATIONS,
  STOCKOUT_BLOCK,
  type DoctorAllocation,
} from './sampleAllocation'
import { CRM_SFA, IQVIA, NEOGRID, NEOGRID_DISTRIBUIDORES, SAP } from './sources'

/**
 * Execução em Campo (AG, módulo 4.6).
 *
 * A amostra só existe como investimento depois que chega ao médico — e o que
 * prova essa chegada é o registro de entrega com aceite. O que a operação de
 * hoje não tem é o **motivo**: a entrega que não aconteceu some do sistema sem
 * explicação, e a amostra fica em poder do representante como estoque virtual,
 * viva no papel e ausente do consultório.
 *
 * Por isso a tela trata motivo como campo obrigatório, não como observação:
 * entrega não concluída sem motivo é buraco de rastreabilidade, e aparece como
 * tal — contada, medida e endereçada a uma decisão.
 */

/* -------------------------------------------------------------------------- */
/* Atestados                                                                   */
/* -------------------------------------------------------------------------- */

/** Entrega registrada no app de campo, conciliada com a baixa de estoque. */
export const DELIVERY_ATTESTATION: Attestation = combine([CRM_SFA, SAP])

/** O aceite nasce inteiro no app: é assinatura de campo, não conciliação. */
export const ACCEPTANCE_ATTESTATION: Attestation = combine([CRM_SFA])

/** Cobertura cruza a carteira do representante com o painel médico. */
export const COVERAGE_ATTESTATION: Attestation = combine([CRM_SFA, IQVIA])

/** Estoque em poder do representante: saldo do ERP mais o giro do distribuidor. */
export const LOCAL_STOCK_ATTESTATION: Attestation = combine([SAP, NEOGRID])

/** Disponibilidade do produto na praça — a mesma leitura que sustenta o bloqueio. */
export const AVAILABILITY_ATTESTATION: Attestation = combine([NEOGRID, NEOGRID_DISTRIBUIDORES])

/** Motivo de não entrega é declarado em campo e conferido contra o plano. */
export const REASON_ATTESTATION: Attestation = combine([CRM_SFA, SAP])

/** O copiloto junta propensão, plano, estoque e disponibilidade — elo mais fraco manda. */
export const RECOMMENDATION_ATTESTATION: Attestation = combine([IQVIA, CRM_SFA, SAP, NEOGRID])

/** Atestados que a tela vigia para o aviso de fonte atrasada. */
export const FIELD_ATTESTATIONS: readonly Attestation[] = [
  DELIVERY_ATTESTATION,
  ACCEPTANCE_ATTESTATION,
  COVERAGE_ATTESTATION,
  LOCAL_STOCK_ATTESTATION,
  AVAILABILITY_ATTESTATION,
  RECOMMENDATION_ATTESTATION,
]

/* -------------------------------------------------------------------------- */
/* Ciclo e responsável                                                         */
/* -------------------------------------------------------------------------- */

function personaNamed(name: string): Persona {
  const persona = PERSONAS.find((item) => item.name === name)
  if (!persona) throw new Error(`Persona ausente: ${name}`)
  return persona
}

/**
 * NOTA: não consta do ESCOPO — o recorte do ciclo de entrega. Catorze dias,
 * com nove já vencidos, para que a fila tenha entregas fechadas, uma entrega do
 * dia e uma agendada. Toda data deriva de `HOJE`.
 */
export const CYCLE = {
  label: 'Ciclo de entrega em curso',
  startsOn: daysAgo(9) as IsoDate,
  endsOn: daysFromNow(4) as IsoDate,
  lengthDays: 14,
  elapsedDays: 9,
} as const

/** Representante dono da fila exibida. Persona fictícia, como manda a regra. */
export const FIELD_REP = personaNamed('Fernanda Lima')

/** NOTA: não consta do ESCOPO — o território da fila exibida. */
export const FIELD_REP_TERRITORY = 'Sudeste — carteira médica'

/** Gestor que recebe a exceção de rastreabilidade. */
export const FIELD_MANAGER = personaNamed('João Pedro')

/* -------------------------------------------------------------------------- */
/* Vocabulário de estado e de motivo                                           */
/* -------------------------------------------------------------------------- */

export type DeliveryStatus = 'accepted' | 'delivered' | 'refused' | 'pending'

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  accepted: 'Aceite registrado',
  delivered: 'Entregue',
  refused: 'Não entregue',
  pending: 'Pendente',
}

export const DELIVERY_STATUS_TONE: Record<DeliveryStatus, SemanticTone> = {
  accepted: 'positive',
  delivered: 'attention',
  refused: 'negative',
  pending: 'neutral',
}

export const DELIVERY_STATUS_ORDER: readonly DeliveryStatus[] = [
  'accepted',
  'delivered',
  'refused',
  'pending',
]

export const DELIVERY_STATUS_DESCRIPTION: Record<DeliveryStatus, string> = {
  accepted: 'Amostra entregue e aceite do médico capturado na mesma visita.',
  delivered: 'Amostra entregue, aceite ainda não registrado. A entrega existe, o comprovante não.',
  refused: 'Entrega não concluída. Só entra na fila com motivo escrito.',
  pending: 'Entrega prevista no ciclo, ainda não executada.',
}

export type NonDeliveryReason =
  | 'doctor_absent'
  | 'cycle_limit'
  | 'consent_pending'
  | 'territory_blocked'

export const REASON_LABEL: Record<NonDeliveryReason, string> = {
  doctor_absent: 'Médico ausente',
  cycle_limit: 'Limite do ciclo atingido',
  consent_pending: 'Consentimento pendente',
  territory_blocked: 'Território bloqueado por ruptura',
}

export const REASON_ORDER: readonly NonDeliveryReason[] = [
  'doctor_absent',
  'cycle_limit',
  'consent_pending',
  'territory_blocked',
]

const STOCKOUT_ALERT = ROUTE_ALERTS.find((alert) => alert.kind === 'stockout')

export const REASON_DETAIL: Record<NonDeliveryReason, string> = {
  doctor_absent:
    'O médico não estava no consultório na janela combinada. A visita volta para a fila do ciclo com a janela em aberto.',
  cycle_limit:
    'O teto de amostras do médico no ciclo já está comprometido. Entregar acima do teto é gasto sem plano, não é cobertura.',
  consent_pending:
    'O termo de consentimento do médico não está vigente. Sem consentimento não há entrega — e não há registro de aceite para sustentá-la.',
  territory_blocked: `${STOCKOUT_BLOCK.principle} ${STOCKOUT_ALERT?.title ?? 'Ruptura detectada na praça.'}`,
}

/** Rótulo da entrega que ficou sem motivo — o buraco que a tela mede. */
export const UNRECORDED_REASON_LABEL = 'Sem motivo registrado'

export const UNRECORDED_REASON_DETAIL =
  'Entrega não concluída e sem motivo escrito. É o único caso em que a plataforma não sabe dizer o que aconteceu com a amostra — e é o que precisa chegar a zero.'

/* -------------------------------------------------------------------------- */
/* Fila de entregas do ciclo                                                   */
/* -------------------------------------------------------------------------- */

function allocationOf(doctorId: string): DoctorAllocation {
  const allocation = DOCTOR_ALLOCATIONS.find((item) => item.doctorId === doctorId)
  if (!allocation) throw new Error(`Alocação canônica ausente: ${doctorId}`)
  return allocation
}

/** Saldo do ciclo do médico: o que o plano da seção 10.5 ainda comporta. */
export function cycleBalance(doctorId: string): number {
  const allocation = allocationOf(doctorId)
  return allocation.recommendedSamples - allocation.samplesDelivered
}

export type Delivery = {
  readonly id: string
  readonly doctorId: string
  readonly skuName: string
  readonly quantity: number
  readonly date: IsoDate
  readonly status: DeliveryStatus
  /** Motivo da não conclusão. `null` em entrega concluída — ou no buraco. */
  readonly reason: NonDeliveryReason | null
  readonly note: string
}

const LOSARTANA = 'Losartana 50mg c/30'
const DIPIRONA = 'Dipirona 500mg c/20'

/* -------------------------------------------------------------------------- */
/* NOTA: não consta do ESCOPO — a fila de entregas.                            */
/*                                                                             */
/* Os cinco médicos são os canônicos da seção 10.4. A quantidade de cada        */
/* entrega concluída reproduz `samplesDelivered` da seção 10.5, e a das         */
/* entregas em aberto é o saldo do ciclo (`recommendedSamples` menos           */
/* `samplesDelivered`) — nenhuma delas é redigitada aqui. Só duas quantidades  */
/* são declaradas: as 6 amostras da tentativa acima do teto do ciclo e as 6    */
/* da entrega que ficou sem motivo. Datas, horários e notas são declarados.    */
/* -------------------------------------------------------------------------- */

const OVER_LIMIT_ATTEMPT = 6
const UNRECORDED_ATTEMPT = 6

export const DELIVERY_QUEUE: readonly Delivery[] = [
  {
    id: 'ENT-2026-0131',
    doctorId: 'MD-001',
    skuName: LOSARTANA,
    quantity: allocationOf('MD-001').samplesDelivered,
    date: daysAgo(6),
    status: 'accepted',
    reason: null,
    note: 'Aceite eletrônico capturado no consultório, com o médico presente.',
  },
  {
    id: 'ENT-2026-0133',
    doctorId: 'MD-003',
    skuName: LOSARTANA,
    quantity: allocationOf('MD-003').samplesDelivered,
    date: daysAgo(5),
    status: 'accepted',
    reason: null,
    note: 'Entrega no hospital, dentro da janela confirmada pela secretaria.',
  },
  {
    id: 'ENT-2026-0134',
    doctorId: 'MD-004',
    skuName: LOSARTANA,
    quantity: allocationOf('MD-004').samplesDelivered,
    date: daysAgo(5),
    status: 'accepted',
    reason: null,
    note: 'Aceite registrado junto com a atualização do termo de consentimento.',
  },
  {
    id: 'ENT-2026-0136',
    doctorId: 'MD-005',
    skuName: LOSARTANA,
    quantity: allocationOf('MD-005').samplesDelivered,
    date: daysAgo(3),
    status: 'accepted',
    reason: null,
    note: 'Entrega de maior volume do ciclo na carteira de Cardiologia.',
  },
  {
    id: 'ENT-2026-0137',
    doctorId: 'MD-002',
    skuName: DIPIRONA,
    quantity: allocationOf('MD-002').samplesDelivered,
    date: daysAgo(3),
    status: 'delivered',
    reason: null,
    note: 'Amostra entregue no balcão da clínica; o médico saiu antes de confirmar o aceite.',
  },
  {
    id: 'ENT-2026-0138',
    doctorId: 'MD-001',
    skuName: LOSARTANA,
    quantity: cycleBalance('MD-001'),
    date: daysAgo(2),
    status: 'refused',
    reason: 'territory_blocked',
    note: 'Praça do Centro com ruptura ativa do produto. A entrega volta ao plano quando a reposição for confirmada.',
  },
  {
    id: 'ENT-2026-0139',
    doctorId: 'MD-002',
    skuName: LOSARTANA,
    quantity: cycleBalance('MD-002'),
    date: daysAgo(2),
    status: 'refused',
    reason: 'doctor_absent',
    note: 'Agenda remarcada pela clínica na véspera. Nova janela ainda não confirmada.',
  },
  {
    id: 'ENT-2026-0140',
    doctorId: 'MD-005',
    skuName: DIPIRONA,
    quantity: OVER_LIMIT_ATTEMPT,
    date: daysAgo(1),
    status: 'refused',
    reason: 'cycle_limit',
    note: 'Teto do ciclo do médico já comprometido pelas amostras de Losartana, incluindo a entrega de hoje.',
  },
  {
    id: 'ENT-2026-0141',
    doctorId: 'MD-004',
    skuName: DIPIRONA,
    quantity: UNRECORDED_ATTEMPT,
    date: daysAgo(1),
    status: 'refused',
    reason: null,
    note: 'Entrega fechada como não concluída sem motivo escrito. A amostra continua em poder do representante.',
  },
  {
    id: 'ENT-2026-0142',
    doctorId: 'MD-003',
    skuName: DIPIRONA,
    quantity: cycleBalance('MD-003'),
    date: daysFromNow(1),
    status: 'pending',
    reason: 'consent_pending',
    note: 'Entrega presa até a renovação do termo de consentimento do médico.',
  },
  {
    id: 'ENT-2026-0143',
    doctorId: 'MD-005',
    skuName: LOSARTANA,
    quantity: cycleBalance('MD-005'),
    date: HOJE,
    status: 'pending',
    reason: null,
    note: 'Visita do dia. É a entrega que o copiloto dimensiona.',
  },
]

export function doctorOfDelivery(delivery: Delivery): Doctor | undefined {
  return DOCTORS.find((doctor) => doctor.id === delivery.doctorId)
}

export function isConcluded(delivery: Delivery): boolean {
  return delivery.status === 'accepted' || delivery.status === 'delivered'
}

/** Entrega não concluída e sem motivo: o buraco de rastreabilidade. */
export function isTraceabilityGap(delivery: Delivery): boolean {
  return delivery.status === 'refused' && delivery.reason === null
}

/** Entrega feita cujo comprovante não existe. */
export function isAcceptanceGap(delivery: Delivery): boolean {
  return delivery.status === 'delivered'
}

/**
 * Guarda do mock: a soma das entregas concluídas de cada médico tem de bater
 * com `samplesDelivered` da seção 10.5. Se alguém redigitar uma quantidade
 * aqui, a demonstração quebra na carga em vez de mentir na tela.
 */
function assertQueueMatchesPlan(): void {
  for (const allocation of DOCTOR_ALLOCATIONS) {
    const registered = DELIVERY_QUEUE.filter(
      (delivery) => delivery.doctorId === allocation.doctorId && isConcluded(delivery),
    ).reduce((sum, delivery) => sum + delivery.quantity, 0)

    if (registered !== allocation.samplesDelivered) {
      throw new Error(
        `Fila divergente do plano em ${allocation.doctorId}: ${registered} contra ${allocation.samplesDelivered}`,
      )
    }
  }
}

assertQueueMatchesPlan()

export type QueueSummary = {
  readonly total: number
  readonly byStatus: Record<DeliveryStatus, number>
  readonly concludedSamples: number
  readonly acceptedSamples: number
  readonly openSamples: number
  readonly traceabilityGaps: number
  readonly acceptanceGaps: number
}

function countByStatus(status: DeliveryStatus): number {
  return DELIVERY_QUEUE.filter((delivery) => delivery.status === status).length
}

function sumSamples(select: (delivery: Delivery) => boolean): number {
  return DELIVERY_QUEUE.filter(select).reduce((sum, delivery) => sum + delivery.quantity, 0)
}

export const QUEUE_SUMMARY: QueueSummary = {
  total: DELIVERY_QUEUE.length,
  byStatus: {
    accepted: countByStatus('accepted'),
    delivered: countByStatus('delivered'),
    refused: countByStatus('refused'),
    pending: countByStatus('pending'),
  },
  concludedSamples: sumSamples(isConcluded),
  acceptedSamples: sumSamples((delivery) => delivery.status === 'accepted'),
  openSamples: sumSamples((delivery) => !isConcluded(delivery)),
  traceabilityGaps: DELIVERY_QUEUE.filter(isTraceabilityGap).length,
  acceptanceGaps: DELIVERY_QUEUE.filter(isAcceptanceGap).length,
}

export const QUEUE_NOTE =
  'A fila é a carteira de um representante no ciclo. Toda linha não concluída carrega motivo; a que não carrega aparece em âmbar, porque é dela que a plataforma não consegue prestar contas.'

/* -------------------------------------------------------------------------- */
/* Execução por representante                                                  */
/* -------------------------------------------------------------------------- */

export type RepExecution = {
  readonly holderId: string
  readonly holderName: string
  readonly region: string
  /** Entregas registradas no ciclo. */
  readonly deliveries: number
  /** Amostras entregues, do estoque virtual do módulo 4.5. */
  readonly samples: number
  readonly acceptedDeliveries: number
  readonly doctorsVisited: number
  readonly doctorsTarget: number
  /** Amostras em poder do representante sem baixa de entrega. */
  readonly samplesWithoutReceipt: number
}

/* -------------------------------------------------------------------------- */
/* NOTA: não consta do ESCOPO — a execução por representante.                  */
/*                                                                             */
/* As amostras entregues e as amostras sem baixa vêm do estoque virtual do      */
/* módulo 4.5 (`VIRTUAL_STOCK`), não são redigitadas. São declarados aqui, por  */
/* representante, o número de entregas, o de aceites registrados e a carteira   */
/* de médicos visitados contra a de médicos-alvo.                               */
/* -------------------------------------------------------------------------- */

type RepSeed = {
  readonly holderId: string
  readonly deliveries: number
  readonly acceptedDeliveries: number
  readonly doctorsVisited: number
  readonly doctorsTarget: number
}

const REP_SEEDS: readonly RepSeed[] = [
  { holderId: 'rep-sul-04', deliveries: 62, acceptedDeliveries: 52, doctorsVisited: 38, doctorsTarget: 62 },
  { holderId: 'rep-mg-11', deliveries: 96, acceptedDeliveries: 88, doctorsVisited: 71, doctorsTarget: 84 },
  { holderId: 'rep-sp-02', deliveries: 214, acceptedDeliveries: 191, doctorsVisited: 156, doctorsTarget: 196 },
  { holderId: 'rep-rj-07', deliveries: 118, acceptedDeliveries: 99, doctorsVisited: 89, doctorsTarget: 112 },
]

function virtualStockOf(holderId: string): VirtualStock {
  const holder = VIRTUAL_STOCK.find((item) => item.holderId === holderId)
  if (!holder) throw new Error(`Estoque virtual ausente: ${holderId}`)
  return holder
}

export const REP_EXECUTIONS: readonly RepExecution[] = REP_SEEDS.map((seed) => {
  const holder = virtualStockOf(seed.holderId)
  return {
    holderId: seed.holderId,
    holderName: holder.holderName,
    region: holder.region,
    deliveries: seed.deliveries,
    samples: holder.delivered,
    acceptedDeliveries: seed.acceptedDeliveries,
    doctorsVisited: seed.doctorsVisited,
    doctorsTarget: seed.doctorsTarget,
    samplesWithoutReceipt: holder.stale,
  }
})

export function acceptanceRateOf(rep: RepExecution): number {
  if (rep.deliveries === 0) return 0
  return Math.round((rep.acceptedDeliveries / rep.deliveries) * 100 * 10) / 10
}

export function coverageOf(rep: RepExecution): number {
  if (rep.doctorsTarget === 0) return 0
  return Math.round((rep.doctorsVisited / rep.doctorsTarget) * 100 * 10) / 10
}

function totalOf(select: (rep: RepExecution) => number): number {
  return REP_EXECUTIONS.reduce((sum, rep) => sum + select(rep), 0)
}

export type TeamExecution = {
  readonly reps: number
  readonly deliveries: number
  readonly samples: number
  readonly acceptedDeliveries: number
  readonly acceptanceRatePercent: number
  readonly doctorsVisited: number
  readonly doctorsTarget: number
  readonly coveragePercent: number
  readonly samplesWithoutReceipt: number
}

const TEAM_DELIVERIES = totalOf((rep) => rep.deliveries)
const TEAM_ACCEPTED = totalOf((rep) => rep.acceptedDeliveries)
const TEAM_VISITED = totalOf((rep) => rep.doctorsVisited)
const TEAM_TARGET = totalOf((rep) => rep.doctorsTarget)

export const TEAM_EXECUTION: TeamExecution = {
  reps: REP_EXECUTIONS.length,
  deliveries: TEAM_DELIVERIES,
  samples: totalOf((rep) => rep.samples),
  acceptedDeliveries: TEAM_ACCEPTED,
  acceptanceRatePercent: Math.round((TEAM_ACCEPTED / TEAM_DELIVERIES) * 100 * 10) / 10,
  doctorsVisited: TEAM_VISITED,
  doctorsTarget: TEAM_TARGET,
  coveragePercent: Math.round((TEAM_VISITED / TEAM_TARGET) * 100 * 10) / 10,
  samplesWithoutReceipt: totalOf((rep) => rep.samplesWithoutReceipt),
}

/** Custo das amostras entregues sem baixa — o que não tem lastro documental. */
export const UNTRACED_VALUE_BRL = Math.round(TEAM_EXECUTION.samplesWithoutReceipt * UNIT_COST_BRL)

export const REP_TABLE_NOTE =
  'Amostras entregues e amostras sem baixa vêm do estoque virtual do módulo de Estoque: enquanto não há registro de entrega, a amostra existe no sistema e não no consultório.'

/* -------------------------------------------------------------------------- */
/* Não entregas por motivo                                                     */
/* -------------------------------------------------------------------------- */

export type ReasonBar = {
  readonly id: string
  readonly label: string
  readonly deliveries: number
  readonly detail: string
  /** `true` na barra que representa a ausência de motivo. */
  readonly gap: boolean
}

/* -------------------------------------------------------------------------- */
/* NOTA: não consta do ESCOPO — a contagem de não entregas por motivo no ciclo. */
/* -------------------------------------------------------------------------- */

const REASON_COUNT: Record<NonDeliveryReason, number> = {
  doctor_absent: 62,
  cycle_limit: 34,
  consent_pending: 21,
  territory_blocked: 18,
}

/** Entregas fechadas sem motivo escrito no ciclo. */
export const UNRECORDED_DELIVERIES = 11

export const NON_DELIVERY_BY_REASON: readonly ReasonBar[] = [
  ...REASON_ORDER.map((reason) => ({
    id: reason,
    label: REASON_LABEL[reason],
    deliveries: REASON_COUNT[reason],
    detail: REASON_DETAIL[reason],
    gap: false,
  })),
  {
    id: 'unrecorded',
    label: UNRECORDED_REASON_LABEL,
    deliveries: UNRECORDED_DELIVERIES,
    detail: UNRECORDED_REASON_DETAIL,
    gap: true,
  },
]

export const TOTAL_NON_DELIVERIES = NON_DELIVERY_BY_REASON.reduce(
  (sum, bar) => sum + bar.deliveries,
  0,
)

export const UNRECORDED_SHARE_PERCENT =
  Math.round((UNRECORDED_DELIVERIES / TOTAL_NON_DELIVERIES) * 100 * 10) / 10

export const REASON_CHART_NOTE =
  'Quatro motivos explicam a não entrega e um deles não explica nada. A barra em âmbar é a fila que nenhum relatório consegue auditar depois.'

/* -------------------------------------------------------------------------- */
/* Aceite do médico                                                            */
/* -------------------------------------------------------------------------- */

export type AcceptanceState = 'registered' | 'awaiting' | 'not_applicable'

export const ACCEPTANCE_STATE_LABEL: Record<AcceptanceState, string> = {
  registered: 'Aceite registrado',
  awaiting: 'Aguardando aceite',
  not_applicable: 'Sem entrega a aceitar',
}

export const ACCEPTANCE_STATE_TONE: Record<AcceptanceState, SemanticTone> = {
  registered: 'positive',
  awaiting: 'attention',
  not_applicable: 'neutral',
}

export function acceptanceStateOf(delivery: Delivery): AcceptanceState {
  if (delivery.status === 'accepted') return 'registered'
  if (delivery.status === 'delivered') return 'awaiting'
  return 'not_applicable'
}

function deliveryById(id: string): Delivery {
  const delivery = DELIVERY_QUEUE.find((item) => item.id === id)
  if (!delivery) throw new Error(`Entrega ausente na fila: ${id}`)
  return delivery
}

function doctorById(id: string): Doctor {
  const doctor = DOCTORS.find((item) => item.id === id)
  if (!doctor) throw new Error(`Médico canônico ausente: ${id}`)
  return doctor
}

/** Lote do Rio de Janeiro, de onde saiu a entrega com aceite registrado. */
function lotOfRio(): string {
  const lot = LOTS.find((item) => item.holderId === 'filial-rj')
  if (!lot) throw new Error('Lote canônico do Rio de Janeiro ausente')
  return lot.batchCode
}

export type AcceptanceField = {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly origin: string
}

const ACCEPTED_DELIVERY = deliveryById('ENT-2026-0136')
const ACCEPTED_DOCTOR = doctorById(ACCEPTED_DELIVERY.doctorId)

/**
 * NOTA: não consta do ESCOPO — o conteúdo do comprovante de aceite. O médico, o
 * produto e a quantidade vêm da fila; o lote vem do estoque do módulo 4.5. O
 * horário é fixo para que a demonstração não dependa do relógio da máquina.
 */
const ACCEPTANCE_CLOCK = '16:24'

export const ACCEPTANCE_RECORD = {
  deliveryId: ACCEPTED_DELIVERY.id,
  doctorId: ACCEPTED_DELIVERY.doctorId,
  state: 'registered' as AcceptanceState,
  registeredOn: ACCEPTED_DELIVERY.date,
  capturedAt: ACCEPTANCE_CLOCK,
  method: 'Confirmação eletrônica no app de campo, com o médico presente na entrega.',
  note: 'O comprovante fecha em campo. Sem ele, a entrega é declaração do representante — e amostra sem comprovante não sustenta auditoria nem cálculo de retorno.',
} as const

export const ACCEPTANCE_FIELDS: readonly AcceptanceField[] = [
  {
    id: 'doctor',
    label: 'Médico',
    value: `${ACCEPTED_DOCTOR.name} · ${SPECIALTY_LABEL[ACCEPTED_DOCTOR.specialty]}`,
    origin: 'Carteira do representante, sem digitação em campo.',
  },
  {
    id: 'product',
    label: 'Produto e quantidade',
    value: `${ACCEPTED_DELIVERY.skuName} · ${ACCEPTED_DELIVERY.quantity} amostras`,
    origin: 'Plano de alocação do ciclo.',
  },
  {
    id: 'lot',
    label: 'Lote',
    value: lotOfRio(),
    origin: 'Baixa de estoque do lote em poder da filial.',
  },
  {
    id: 'consent',
    label: 'Termo de consentimento',
    value: 'Vigente na data da entrega',
    origin: 'Conferido pelo app antes de liberar o registro.',
  },
  {
    id: 'signature',
    label: 'Confirmação eletrônica',
    value: `Capturada às ${ACCEPTANCE_CLOCK}`,
    origin: 'Assinada pelo médico na tela do representante.',
  },
]

/** Entregas feitas cujo aceite ainda não existe — a fila do painel de aceite. */
export const AWAITING_ACCEPTANCE: readonly Delivery[] = DELIVERY_QUEUE.filter(isAcceptanceGap)

export const ACCEPTANCE_FUTURE: readonly { readonly label: string; readonly phase: string }[] = [
  { label: 'Assinatura digital certificada do médico', phase: 'Fase 3' },
  { label: 'Write-back do aceite ao ERP', phase: 'Fase 3' },
  { label: 'Exportar comprovantes do ciclo', phase: 'Fase 2' },
]

/* -------------------------------------------------------------------------- */
/* Copiloto — Next Best Sample                                                 */
/* -------------------------------------------------------------------------- */

export type SampleFactor = {
  readonly id: string
  readonly label: string
  /** Leitura do fator, já em linguagem de campo. */
  readonly reading: string
  readonly detail: string
  readonly tone: SemanticTone
  /** Peso do fator no escore, em porcentagem. Os quatro somam 100. */
  readonly weightPercent: number
  readonly scorePercent: number
}

const TARGET_DOCTOR = doctorById('MD-005')
const TARGET_ALLOCATION = allocationOf(TARGET_DOCTOR.id)
const TARGET_DELIVERY = deliveryById('ENT-2026-0143')
const TARGET_STOCK = virtualStockOf('rep-rj-07')

/* -------------------------------------------------------------------------- */
/* NOTA: não consta do ESCOPO — os pesos e os escores dos quatro fatores.       */
/*                                                                             */
/* As leituras que os fatores citam são canônicas: prescrição mensal,          */
/* conversão estimada e saldo do ciclo vêm da seção 10.5; o estoque em poder    */
/* do representante vem do módulo 4.5; a disponibilidade na praça vem do       */
/* alerta de ruptura já declarado na roteirização. O que é declarado aqui é     */
/* quanto cada fator pesa e quanto cada um pontua.                              */
/* -------------------------------------------------------------------------- */

export const SAMPLE_FACTORS: readonly SampleFactor[] = [
  {
    id: 'propensity',
    label: 'Propensão de conversão',
    reading: `${TARGET_ALLOCATION.estimatedConversionUnits} unidades estimadas`,
    detail: `Cardiologista de alto potencial, com ${TARGET_ALLOCATION.monthlyPrescriptions} prescrições por mês e a maior conversão estimada da carteira no ciclo.`,
    tone: 'positive',
    weightPercent: 40,
    scorePercent: 88,
  },
  {
    id: 'cycle-balance',
    label: 'Saldo do ciclo',
    reading: `${cycleBalance(TARGET_DOCTOR.id)} de ${TARGET_ALLOCATION.recommendedSamples} amostras`,
    detail: `Já foram entregues ${TARGET_ALLOCATION.samplesDelivered} amostras ao médico neste ciclo. O saldo é o teto: acima dele a entrega vira gasto fora do plano.`,
    tone: 'neutral',
    weightPercent: 25,
    scorePercent: 72,
  },
  {
    id: 'local-stock',
    label: 'Estoque local do representante',
    reading: `${TARGET_STOCK.onHand} amostras em mãos`,
    detail: 'O representante tem saldo suficiente na praça. A entrega não depende de nova expedição da filial.',
    tone: 'positive',
    weightPercent: 20,
    scorePercent: 95,
  },
  {
    id: 'availability',
    label: 'Disponibilidade no território',
    reading: 'Praça sem ruptura',
    detail: `${STOCKOUT_BLOCK.principle} A ruptura ativa do produto está na praça do Centro, não na do médico — mas o território segue em observação até a reposição.`,
    tone: 'attention',
    weightPercent: 15,
    scorePercent: 64,
  },
]

/** Escore do copiloto: média dos fatores ponderada pelos pesos declarados. */
export const RECOMMENDATION_SCORE_PERCENT = Math.round(
  SAMPLE_FACTORS.reduce((sum, factor) => sum + factor.weightPercent * factor.scorePercent, 0) / 100,
)

export type SampleRecommendation = {
  readonly id: string
  readonly doctorId: string
  readonly skuName: string
  readonly quantity: number
  readonly headline: string
  /** Motivo em duas linhas, como o copiloto do GTM o apresenta. */
  readonly reason: readonly [string, string]
  readonly action: string
  /** O que zeraria a recomendação — a recusa é tão explicável quanto a entrega. */
  readonly blocker: string
  readonly scorePercent: number
  /** Decisão que a recomendação executa. Recomendação solta não existe. */
  readonly decisionId: string
  readonly attestation: Attestation
}

export const SAMPLE_RECOMMENDATION: SampleRecommendation = {
  id: 'nbs-001',
  doctorId: TARGET_DOCTOR.id,
  skuName: TARGET_DELIVERY.skuName,
  quantity: TARGET_DELIVERY.quantity,
  headline: `Entregar ${TARGET_DELIVERY.quantity} amostras de ${TARGET_DELIVERY.skuName}`,
  reason: [
    `Maior conversão estimada da carteira e ${TARGET_ALLOCATION.monthlyPrescriptions} prescrições por mês.`,
    `Fecha o saldo do ciclo do médico sem passar do teto de ${TARGET_ALLOCATION.recommendedSamples} amostras.`,
  ],
  action: 'Registrar a entrega com aceite na visita de hoje',
  blocker:
    'A recomendação vai a zero se a praça entrar em ruptura ou se o termo de consentimento vencer — nos dois casos com o motivo escrito na fila, não com a entrega sumindo do sistema.',
  scorePercent: RECOMMENDATION_SCORE_PERCENT,
  decisionId: ALLOCATION_DECISION_ID,
  attestation: RECOMMENDATION_ATTESTATION,
}

export function recommendationDoctor(): Doctor {
  return TARGET_DOCTOR
}

/* -------------------------------------------------------------------------- */
/* Decisão                                                                     */
/* -------------------------------------------------------------------------- */

function requireDecisionRef(id: string) {
  const decision = findDecision(id)
  if (!decision) throw new Error(`Decisão canônica ausente: ${id}`)
  return decision
}

const DECISION_REF = requireDecisionRef(ALLOCATION_DECISION_ID)

/** Parcela que a execução em campo anexa à decisão de amostras. */
export const TRACEABILITY_PARCEL: DecisionParcel = {
  id: 'ag-field-traceability',
  source: 'ag',
  label: `Rastreabilidade da execução em campo — ${TEAM_EXECUTION.samplesWithoutReceipt} amostras sem baixa`,
  amountBrl: UNTRACED_VALUE_BRL,
  createdOn: HOJE,
  attestation: DELIVERY_ATTESTATION,
}

/**
 * A decisão que a fila de entregas executa. O objeto é o do domínio (seção 8.1):
 * o estado corrente na demonstração é do fluxo de decisões, não deste mock.
 */
export const FIELD_DECISION: Decision = {
  id: DECISION_REF.id,
  title: DECISION_REF.title,
  state: 'proposed',
  product: DECISION_REF.product,
  impactBrl: DECISION_REF.impactBrl,
  parcels: [TRACEABILITY_PARCEL],
}

export const DECISION_NOTE =
  'A recomendação do copiloto não é sugestão solta: ela executa a decisão de amostras já em curso na plataforma, e a exceção de rastreabilidade do ciclo entra nela como parcela.'

/* -------------------------------------------------------------------------- */
/* Frame do app de campo — somente leitura                                     */
/* -------------------------------------------------------------------------- */

/**
 * NOTA: não consta do ESCOPO — o conteúdo do app de campo. O médico, o produto
 * e a quantidade vêm da fila; o horário do frame e a janela da visita são fixos
 * para que a demonstração não dependa do relógio da máquina.
 */
const APP_CLOCK = '10:12'

export const FIELD_APP = {
  appName: 'Hypera Campo',
  screenTitle: 'Entrega do dia',
  statusTime: APP_CLOCK,
  networkLabel: '4G',
  batteryLabel: '76%',
  repName: FIELD_REP.name,
  visit: {
    doctorName: TARGET_DOCTOR.name,
    specialtyLabel: SPECIALTY_LABEL[TARGET_DOCTOR.specialty],
    placeLabel: 'Clínica — Zona Sul',
    windowLabel: 'Janela 15:00 – 17:00',
    positionLabel: 'Visita 4 de 7',
  },
  recommendation: {
    title: TARGET_DELIVERY.skuName,
    quantityLabel: `${TARGET_DELIVERY.quantity} amostras`,
    reasonLabel: 'Fecha o saldo do ciclo do médico',
  },
  stockLabel: `${TARGET_STOCK.onHand} amostras em poder do representante`,
  primaryActionLabel: 'Registrar entrega',
  secondaryActionLabel: 'Registrar motivo de não entrega',
  captureHint: 'O aceite do médico é capturado nesta mesma tela, com data e hora.',
  readOnlyLabel: 'Somente leitura',
  readOnlyNote:
    'Representação estática do app de campo. Nenhum controle dentro do frame é clicável nesta demonstração.',
} as const

export const FUTURE_ACTIONS: readonly { readonly label: string; readonly phase: string }[] = [
  { label: 'Baixa automática de estoque na entrega', phase: 'Fase 2' },
  { label: 'Bloqueio de entrega sem motivo no app', phase: 'Fase 2' },
  { label: 'Write-back da entrega ao ERP', phase: 'Fase 3' },
]
