import { combine, type Attestation } from '../domain/attestation'
import { formatInteger } from '../domain/format'
import { PERSONAS, type Persona } from '../domain/persona'
import {
  addDays,
  daysAgo,
  daysBetween,
  formatMonth,
  HOJE,
  type IsoDate,
} from '../domain/today'
import {
  BLOCKED_LOT,
  daysToExpiry,
  EXPIRY_WINDOWS,
  LOTS,
  VIRTUAL_STOCK,
  type Lot,
} from './agInventory'
import { DOCTORS, SPECIALTY_LABEL, type Doctor } from './doctors'
import { ALLOCATION_KPIS } from './sampleAllocation'
import { CRM_SFA, NEOGRID, SAP } from './sources'

/**
 * Compliance e Rastreabilidade (AG, módulo 4.9).
 *
 * A amostra grátis é o único item que sai da companhia sem nota de venda e sem
 * contrapartida financeira. O que sustenta esse trânsito é a política interna:
 * cada elo entre o recebimento do lote e o aceite do médico precisa estar
 * registrado, com data e responsável. Um elo em branco não é falha de relatório
 * — é a amostra que não se sabe onde parou.
 *
 * A tela lê os mesmos lotes do módulo de estoque (4.5). A trilha não é uma
 * narrativa paralela: é o histórico de custódia do lote que já existe lá.
 */

const PERSONA_BY_NAME = new Map(PERSONAS.map((persona) => [persona.name, persona]))

function requirePersona(name: string): Persona {
  const found = PERSONA_BY_NAME.get(name)
  if (!found) throw new Error(`Persona fictícia ausente: ${name}`)
  return found
}

/** Responsável pelos elos de logística e campo. */
export const FIELD_OWNER = requirePersona('João Pedro')

/** Responsável pela regularização dos desvios e pelo consentimento. */
export const COMPLIANCE_OWNER = requirePersona('Fernanda Lima')

function requireLot(id: string): Lot {
  const found = LOTS.find((lot) => lot.id === id)
  if (!found) throw new Error(`Lote ausente no estoque de amostras: ${id}`)
  return found
}

function requireDoctor(id: string): Doctor {
  const found = DOCTORS.find((doctor) => doctor.id === id)
  if (!found) throw new Error(`Médico canônico ausente: ${id}`)
  return found
}

function requireBlockedLot(): Lot {
  if (!BLOCKED_LOT) throw new Error('Lote retido pelo bloqueio de ruptura ausente')
  return BLOCKED_LOT
}

/** Lote retido pelo bloqueio de ruptura do HUB — o caso crítico da fila. */
export const RETAINED_LOT = requireBlockedLot()

function staleSamplesOf(holderId: string): number {
  return VIRTUAL_STOCK.find((item) => item.holderId === holderId)?.stale ?? 0
}

/* -------------------------------------------------------------------------- */
/* Trilha ponta a ponta                                                        */
/* -------------------------------------------------------------------------- */

export type TraceStage = 'receipt' | 'branch' | 'rep' | 'delivery' | 'acceptance'

export const TRACE_STAGE_LABEL: Record<TraceStage, string> = {
  receipt: 'Recebimento do lote',
  branch: 'Entrada na filial',
  rep: 'Retirada pelo representante',
  delivery: 'Entrega ao médico',
  acceptance: 'Aceite registrado',
}

export const TRACE_STAGE_ORDER: readonly TraceStage[] = [
  'receipt',
  'branch',
  'rep',
  'delivery',
  'acceptance',
]

export type TraceStepStatus = 'registered' | 'pending' | 'divergent'

export const TRACE_STEP_STATUS_LABEL: Record<TraceStepStatus, string> = {
  registered: 'Registrado',
  pending: 'Pendente',
  divergent: 'Divergente',
}

export type TraceStep = {
  readonly stage: TraceStage
  readonly status: TraceStepStatus
  /** Quem responde pelo elo: persona da operação, detentor do lote ou médico. */
  readonly owner: string
  readonly place: string
  /** `null` quando o elo não foi registrado. */
  readonly date: IsoDate | null
  /** Unidades movimentadas no elo. `null` quando não houve movimento registrado. */
  readonly units: number | null
  readonly note: string
}

export type TraceIntegrity = 'complete' | 'gap' | 'divergent' | 'blocked'

export const TRACE_INTEGRITY_LABEL: Record<TraceIntegrity, string> = {
  complete: 'Trilha íntegra',
  gap: 'Elo pendente',
  divergent: 'Elo divergente',
  blocked: 'Trilha interrompida por bloqueio',
}

export type LotTrace = {
  readonly lot: Lot
  readonly integrity: TraceIntegrity
  /** A leitura da trilha em uma frase. */
  readonly headline: string
  readonly steps: readonly TraceStep[]
}

/**
 * NOTA: não consta do ESCOPO — os elos de cada trilha, suas datas e volumes.
 *
 * Os lotes, os detentores e as validades vêm do estoque de amostras; o que
 * está declarado aqui é o histórico de custódia de cada um. Quatro casos, de
 * propósito: uma trilha íntegra, uma com elo pendente, uma com divergência
 * entre saída e aceite, e uma interrompida por bloqueio de ruptura.
 */

/** Dias desde a retirada do lote pelo Representante Sul 04 sem baixa de entrega. */
const SUL_DAYS_WITHOUT_WRITE_OFF = 34

/** Prazo interno para a baixa de entrega, em dias. NOTA: não consta do ESCOPO. */
export const WRITE_OFF_SLA_DAYS = 15

/** Teto de amostras por médico e ciclo. NOTA: não consta do ESCOPO. */
export const SAMPLES_PER_DOCTOR_CAP = 20

/** Saída da Filial Rio de Janeiro e aceites registrados no lote LT-2026-0377. */
const RJ_BRANCH_OUTFLOW = 1_200
const RJ_REGISTERED_ACCEPTANCE = 1_140

/** Baixa e aceite do caso nominal do Rio de Janeiro. */
const RJ_DOCTOR_WRITE_OFF = 20
const RJ_DOCTOR_ACCEPTANCE = 14

/** Amostras entregues fora do território de origem no lote do Centro-Oeste. */
const OFF_TERRITORY_SAMPLES = 48

/** Médicos acima do teto por ciclo e o maior caso do ciclo. */
const DOCTORS_OVER_CAP = 14
const LARGEST_OVER_CAP = 32

const REP_SUL_LOT = requireLot('lot-rep-sul')
const REP_MG_LOT = requireLot('lot-rep-mg')
const RJ_LOT = requireLot('lot-rj')
const OPERATOR_LOT = requireLot('lot-operator')

const ALENCAR = requireDoctor('MD-001')
const VIEIRA = requireDoctor('MD-003')

const REP_SUL_STALE = staleSamplesOf(REP_SUL_LOT.holderId)

type TraceSeed = Omit<LotTrace, 'lot'> & { readonly lotId: string }

const TRACE_SEEDS: readonly TraceSeed[] = [
  {
    lotId: REP_SUL_LOT.id,
    integrity: 'gap',
    headline:
      'A trilha para no representante: a retirada está registrada, a entrega ao médico não. Sem baixa não há médico, e sem médico não há aceite.',
    steps: [
      {
        stage: 'receipt',
        status: 'registered',
        owner: FIELD_OWNER.name,
        place: 'Centro de distribuição nacional',
        date: daysAgo(96),
        units: REP_SUL_LOT.units,
        note: 'Lote conferido contra a nota de transferência na entrada.',
      },
      {
        stage: 'branch',
        status: 'registered',
        owner: FIELD_OWNER.name,
        place: 'Filial Sul',
        date: daysAgo(74),
        units: REP_SUL_LOT.units,
        note: 'Recebimento na filial com conferência de quantidade e validade.',
      },
      {
        stage: 'rep',
        status: 'registered',
        owner: REP_SUL_LOT.holderName,
        place: `Território ${REP_SUL_LOT.region} 04`,
        date: daysAgo(SUL_DAYS_WITHOUT_WRITE_OFF),
        units: REP_SUL_LOT.units,
        note: 'Retirada registrada no aplicativo de campo. É o último elo com registro.',
      },
      {
        stage: 'delivery',
        status: 'pending',
        owner: 'Não identificado',
        place: `Território ${REP_SUL_LOT.region} 04`,
        date: null,
        units: REP_SUL_STALE,
        note: `Sem baixa de entrega há ${SUL_DAYS_WITHOUT_WRITE_OFF} dias: ${formatInteger(REP_SUL_STALE)} amostras seguem no estoque virtual do representante, sem médico associado.`,
      },
      {
        stage: 'acceptance',
        status: 'pending',
        owner: 'Não identificado',
        place: `Território ${REP_SUL_LOT.region} 04`,
        date: null,
        units: null,
        note: 'O aceite depende do elo anterior. Enquanto a entrega não for registrada, não há o que aceitar.',
      },
    ],
  },
  {
    lotId: RJ_LOT.id,
    integrity: 'divergent',
    headline:
      'Todos os elos existem, mas a conta não fecha: a saída da filial é maior que o aceite registrado.',
    steps: [
      {
        stage: 'receipt',
        status: 'registered',
        owner: FIELD_OWNER.name,
        place: 'Centro de distribuição nacional',
        date: daysAgo(120),
        units: RJ_LOT.units,
        note: 'Lote conferido contra a nota de transferência na entrada.',
      },
      {
        stage: 'branch',
        status: 'registered',
        owner: FIELD_OWNER.name,
        place: RJ_LOT.holderName,
        date: daysAgo(103),
        units: RJ_LOT.units,
        note: 'Recebimento na filial com conferência de quantidade e validade.',
      },
      {
        stage: 'rep',
        status: 'registered',
        owner: 'Representante — RJ 07',
        place: 'Território RJ 07',
        date: daysAgo(45),
        units: RJ_BRANCH_OUTFLOW,
        note: `Saída da filial para o território: ${formatInteger(RJ_BRANCH_OUTFLOW)} amostras.`,
      },
      {
        stage: 'delivery',
        status: 'registered',
        owner: ALENCAR.name,
        place: 'Rio de Janeiro',
        date: daysAgo(12),
        units: RJ_DOCTOR_WRITE_OFF,
        note: `Baixa de ${formatInteger(RJ_DOCTOR_WRITE_OFF)} amostras registrada na visita.`,
      },
      {
        stage: 'acceptance',
        status: 'divergent',
        owner: ALENCAR.name,
        place: 'Rio de Janeiro',
        date: daysAgo(11),
        units: RJ_DOCTOR_ACCEPTANCE,
        note: `Aceite de ${formatInteger(RJ_DOCTOR_ACCEPTANCE)} amostras contra baixa de ${formatInteger(RJ_DOCTOR_WRITE_OFF)}. No lote inteiro, a diferença entre saída e aceite é de ${formatInteger(RJ_BRANCH_OUTFLOW - RJ_REGISTERED_ACCEPTANCE)} amostras.`,
      },
    ],
  },
  {
    lotId: REP_MG_LOT.id,
    integrity: 'complete',
    headline:
      'Trilha completa: cinco elos com data, responsável e volume, do recebimento ao aceite do médico.',
    steps: [
      {
        stage: 'receipt',
        status: 'registered',
        owner: FIELD_OWNER.name,
        place: 'Centro de distribuição nacional',
        date: daysAgo(88),
        units: REP_MG_LOT.units,
        note: 'Lote conferido contra a nota de transferência na entrada.',
      },
      {
        stage: 'branch',
        status: 'registered',
        owner: FIELD_OWNER.name,
        place: 'Filial Minas Gerais',
        date: daysAgo(70),
        units: REP_MG_LOT.units,
        note: 'Recebimento na filial com conferência de quantidade e validade.',
      },
      {
        stage: 'rep',
        status: 'registered',
        owner: REP_MG_LOT.holderName,
        place: `Território ${REP_MG_LOT.region} 11`,
        date: daysAgo(26),
        units: REP_MG_LOT.units,
        note: 'Retirada registrada no aplicativo de campo.',
      },
      {
        stage: 'delivery',
        status: 'registered',
        owner: VIEIRA.name,
        place: 'Belo Horizonte',
        date: daysAgo(9),
        units: SAMPLES_PER_DOCTOR_CAP,
        note: `Baixa de ${formatInteger(SAMPLES_PER_DOCTOR_CAP)} amostras registrada na visita, dentro do teto do ciclo.`,
      },
      {
        stage: 'acceptance',
        status: 'registered',
        owner: VIEIRA.name,
        place: 'Belo Horizonte',
        date: daysAgo(9),
        units: SAMPLES_PER_DOCTOR_CAP,
        note: 'Aceite do médico registrado no mesmo dia, com consentimento vigente.',
      },
    ],
  },
  {
    lotId: RETAINED_LOT.id,
    integrity: 'blocked',
    headline:
      'A trilha para na filial por decisão da plataforma: o território está bloqueado por ruptura e a amostra não pode sair. Buraco explicado não é buraco de registro.',
    steps: [
      {
        stage: 'receipt',
        status: 'registered',
        owner: FIELD_OWNER.name,
        place: 'Centro de distribuição nacional',
        date: daysAgo(112),
        units: RETAINED_LOT.units,
        note: 'Lote conferido contra a nota de transferência na entrada.',
      },
      {
        stage: 'branch',
        status: 'registered',
        owner: FIELD_OWNER.name,
        place: RETAINED_LOT.holderName,
        date: daysAgo(94),
        units: RETAINED_LOT.units,
        note: `Lote parado na filial: ${formatInteger(RETAINED_LOT.units)} amostras retidas pelo bloqueio de ruptura.`,
      },
      {
        stage: 'rep',
        status: 'pending',
        owner: 'Não iniciado',
        place: RETAINED_LOT.region,
        date: null,
        units: null,
        note: 'Nenhuma retirada autorizada enquanto o bloqueio estiver ativo.',
      },
      {
        stage: 'delivery',
        status: 'pending',
        owner: 'Não iniciado',
        place: RETAINED_LOT.region,
        date: null,
        units: null,
        note: 'Sem retirada não há entrega.',
      },
      {
        stage: 'acceptance',
        status: 'pending',
        owner: 'Não iniciado',
        place: RETAINED_LOT.region,
        date: null,
        units: null,
        note: 'Sem entrega não há aceite.',
      },
    ],
  },
]

export const LOT_TRACES: readonly LotTrace[] = TRACE_SEEDS.map((seed) => ({
  lot: requireLot(seed.lotId),
  integrity: seed.integrity,
  headline: seed.headline,
  steps: seed.steps,
}))

/** A trilha que abre a tela é a que tem elo pendente — o buraco é o que importa. */
export const DEFAULT_TRACE_LOT_ID = REP_SUL_LOT.id

export function traceOf(lotId: string): LotTrace | undefined {
  return LOT_TRACES.find((trace) => trace.lot.id === lotId)
}

export function missingSteps(trace: LotTrace): number {
  return trace.steps.filter((step) => step.status !== 'registered').length
}

export const TRACE_ATTESTATION = combine([SAP, CRM_SFA])

/* -------------------------------------------------------------------------- */
/* Consentimento do médico                                                     */
/* -------------------------------------------------------------------------- */

export type ConsentStatus = 'valid' | 'expiring' | 'expired' | 'missing'

export const CONSENT_STATUS_LABEL: Record<ConsentStatus, string> = {
  valid: 'Vigente',
  expiring: 'Vencendo',
  expired: 'Expirado',
  missing: 'Ausente',
}

/** Ordem da fila: o que exige ação primeiro. */
export const CONSENT_STATUS_ORDER: readonly ConsentStatus[] = [
  'missing',
  'expired',
  'expiring',
  'valid',
]

/**
 * Validade do consentimento e janela de aviso.
 * NOTA: não consta do ESCOPO — parâmetros da política interna de consentimento.
 */
export const CONSENT_VALIDITY_DAYS = 730
export const CONSENT_EXPIRING_WINDOW_DAYS = 60

/** Sem consentimento vigente, o médico não é elegível a receber amostra. */
export function isEligible(status: ConsentStatus): boolean {
  return status === 'valid' || status === 'expiring'
}

function consentStatusOf(validUntil: IsoDate | null): ConsentStatus {
  if (!validUntil) return 'missing'
  const remaining = daysBetween(HOJE, validUntil)
  if (remaining < 0) return 'expired'
  if (remaining <= CONSENT_EXPIRING_WINDOW_DAYS) return 'expiring'
  return 'valid'
}

export type ConsentBucket = {
  readonly status: ConsentStatus
  readonly doctors: number
  readonly note: string
}

/**
 * NOTA: não consta do ESCOPO — a repartição do consentimento na base médica.
 * O universo é o dos médicos-alvo da campanha canônica (8.430), não um total
 * novo: a base que a alocação usa é a mesma que o consentimento governa.
 */
export const CONSENT_TARGET_DOCTORS =
  ALLOCATION_KPIS.find((kpi) => kpi.id === 'target-doctors')?.value ?? 0

export const CONSENT_BUCKETS: readonly ConsentBucket[] = [
  {
    status: 'valid',
    doctors: 7_060,
    note: 'Termo assinado e dentro da validade de 24 meses.',
  },
  {
    status: 'expiring',
    doctors: 640,
    note: `Vencem nos próximos ${CONSENT_EXPIRING_WINDOW_DAYS} dias — renovar na próxima visita.`,
  },
  {
    status: 'expired',
    doctors: 410,
    note: 'Fora da validade: o médico deixa de ser elegível até renovar.',
  },
  {
    status: 'missing',
    doctors: 320,
    note: 'Nunca registrado: a alocação não libera amostra para estes médicos.',
  },
]

function bucketCount(status: ConsentStatus): number {
  return CONSENT_BUCKETS.find((bucket) => bucket.status === status)?.doctors ?? 0
}

export const CONSENT_VALID_DOCTORS = bucketCount('valid')
export const CONSENT_INELIGIBLE_DOCTORS = bucketCount('expired') + bucketCount('missing')
export const CONSENT_VALID_PERCENT =
  Math.round((CONSENT_VALID_DOCTORS / CONSENT_TARGET_DOCTORS) * 1_000) / 10

export type DoctorConsent = {
  readonly doctorId: string
  readonly doctorName: string
  readonly specialtyLabel: string
  readonly uf: string
  readonly signedOn: IsoDate | null
  readonly validUntil: IsoDate | null
  readonly status: ConsentStatus
  readonly eligible: boolean
  readonly channel: string
  readonly requiredAction: string
}

type ConsentSeed = {
  readonly doctorId: string
  /** `null` quando não há termo assinado. */
  readonly signedOnDaysAgo: number | null
  readonly channel: string
  readonly requiredAction: string
}

/**
 * NOTA: não consta do ESCOPO — a situação de consentimento de cada médico.
 * Os cinco são os médicos canônicos da base; as datas de assinatura são
 * declaradas aqui e a situação é derivada delas, não digitada.
 */
const CONSENT_SEEDS: readonly ConsentSeed[] = [
  {
    doctorId: 'MD-002',
    signedOnDaysAgo: null,
    channel: 'Sem registro',
    requiredAction: 'Colher o termo na próxima visita. Até lá, o médico sai da alocação.',
  },
  {
    doctorId: 'MD-004',
    signedOnDaysAgo: 784,
    channel: 'Assinatura em visita',
    requiredAction: 'Renovar o termo antes de qualquer nova entrega — o registro venceu.',
  },
  {
    doctorId: 'MD-001',
    signedOnDaysAgo: 692,
    channel: 'Assinatura em visita',
    requiredAction: 'Renovar na visita já agendada do ciclo; ainda elegível até o vencimento.',
  },
  {
    doctorId: 'MD-003',
    signedOnDaysAgo: 210,
    channel: 'Portal do médico',
    requiredAction: 'Nenhuma ação no ciclo.',
  },
  {
    doctorId: 'MD-005',
    signedOnDaysAgo: 96,
    channel: 'Portal do médico',
    requiredAction: 'Nenhuma ação no ciclo.',
  },
]

export const DOCTOR_CONSENTS: readonly DoctorConsent[] = CONSENT_SEEDS.map((seed) => {
  const doctor = requireDoctor(seed.doctorId)
  const signedOn = seed.signedOnDaysAgo === null ? null : daysAgo(seed.signedOnDaysAgo)
  const validUntil = signedOn === null ? null : addDays(signedOn, CONSENT_VALIDITY_DAYS)
  const status = consentStatusOf(validUntil)

  return {
    doctorId: doctor.id,
    doctorName: doctor.name,
    specialtyLabel: SPECIALTY_LABEL[doctor.specialty],
    uf: doctor.uf,
    signedOn,
    validUntil,
    status,
    eligible: isEligible(status),
    channel: seed.channel,
    requiredAction: seed.requiredAction,
  }
})

export const CONSENTS_REQUIRING_ACTION = DOCTOR_CONSENTS.filter(
  (consent) => consent.status !== 'valid',
).length

export const CONSENT_ATTESTATION = CRM_SFA

/* -------------------------------------------------------------------------- */
/* Alertas de desvio                                                           */
/* -------------------------------------------------------------------------- */

export type DeviationSeverity = 'critical' | 'attention' | 'informative'

export const DEVIATION_SEVERITY_LABEL: Record<DeviationSeverity, string> = {
  critical: 'Crítico',
  attention: 'Atenção',
  informative: 'Informativo',
}

export type DeviationType =
  | 'no_write_off'
  | 'volume_cap'
  | 'off_territory'
  | 'near_expiry'
  | 'acceptance_mismatch'

export const DEVIATION_TYPE_LABEL: Record<DeviationType, string> = {
  no_write_off: 'Entrega sem baixa',
  volume_cap: 'Volume acima do limite',
  off_territory: 'Fora do território de origem',
  near_expiry: 'Validade próxima em campo',
  acceptance_mismatch: 'Saída sem aceite correspondente',
}

export type DeviationLink = {
  readonly route: string
  readonly label: string
}

export type DeviationAlert = {
  readonly id: string
  readonly type: DeviationType
  readonly severity: DeviationSeverity
  /** O que foi detectado, em uma frase. */
  readonly detected: string
  readonly detail: string
  readonly suggestedAction: string
  readonly holder: string
  readonly lotCode: string | null
  readonly detectedOn: IsoDate
  /** Tela que mostra o objeto do desvio, quando existe uma. */
  readonly link: DeviationLink | null
  /** Decisão que a ação sugerida movimenta, quando há uma. */
  readonly decisionId: string | null
  readonly attestation: Attestation
}

/**
 * NOTA: não consta do ESCOPO — a fila de desvios e seus volumes.
 *
 * A fila é priorizada por severidade e cada alerta aponta para o lote que o
 * originou. O primeiro e o segundo são críticos por motivos diferentes: um é
 * amostra sem destino conhecido, o outro é amostra com destino conhecido e sem
 * tempo de validade para chegar lá.
 */
export const DEVIATION_ALERTS: readonly DeviationAlert[] = [
  {
    id: 'dev-write-off-sul',
    type: 'no_write_off',
    severity: 'critical',
    detected: `${formatInteger(REP_SUL_STALE)} amostras sem baixa de entrega há ${SUL_DAYS_WITHOUT_WRITE_OFF} dias, contra um prazo interno de ${WRITE_OFF_SLA_DAYS} dias.`,
    detail: `A trilha do lote ${REP_SUL_LOT.batchCode} para na retirada pelo representante. Sem baixa não há médico identificado e sem médico não há aceite: as amostras existem no sistema e não se sabe em que consultório estão.`,
    suggestedAction:
      'Suspender nova remessa ao território até a regularização e cobrar baixa retroativa com aceite registrado.',
    holder: REP_SUL_LOT.holderName,
    lotCode: REP_SUL_LOT.batchCode,
    detectedOn: daysAgo(19),
    link: null,
    decisionId: 'D-2026-0004',
    attestation: combine([CRM_SFA, SAP]),
  },
  {
    id: 'dev-expiry-retained',
    type: 'near_expiry',
    severity: 'critical',
    detected: `${formatInteger(RETAINED_LOT.units)} amostras retidas pelo bloqueio de ruptura vencem em ${daysToExpiry(RETAINED_LOT)} dias.`,
    detail: `O lote ${RETAINED_LOT.batchCode} entrou na janela de risco de validade (${EXPIRY_WINDOWS.riskDays} dias) parado na ${RETAINED_LOT.holderName}. A trilha está correta e é exatamente isso que a torna grave: sabe-se onde a amostra está e que ela não tem para onde ir.`,
    suggestedAction:
      'Levar o lote à redistribuição antes do fim da janela. Parado, ele vira perda com rastreabilidade completa e nenhuma conversão.',
    holder: RETAINED_LOT.holderName,
    lotCode: RETAINED_LOT.batchCode,
    detectedOn: daysAgo(6),
    link: { route: '/ag/estoque', label: 'Ver o lote no estoque' },
    decisionId: null,
    attestation: combine([SAP, NEOGRID]),
  },
  {
    id: 'dev-acceptance-rj',
    type: 'acceptance_mismatch',
    severity: 'attention',
    detected: `${formatInteger(RJ_BRANCH_OUTFLOW - RJ_REGISTERED_ACCEPTANCE)} amostras de diferença entre a saída da filial e os aceites registrados.`,
    detail: `Saíram ${formatInteger(RJ_BRANCH_OUTFLOW)} amostras do lote ${RJ_LOT.batchCode} pela ${RJ_LOT.holderName}; ${formatInteger(RJ_REGISTERED_ACCEPTANCE)} têm aceite. O caso nominal do ${ALENCAR.name} é um deles: baixa de ${formatInteger(RJ_DOCTOR_WRITE_OFF)}, aceite de ${formatInteger(RJ_DOCTOR_ACCEPTANCE)}.`,
    suggestedAction:
      'Reconciliar as baixas com a filial e reabrir o aceite dos médicos afetados antes do fechamento do ciclo.',
    holder: RJ_LOT.holderName,
    lotCode: RJ_LOT.batchCode,
    detectedOn: daysAgo(9),
    link: null,
    decisionId: null,
    attestation: combine([SAP, CRM_SFA]),
  },
  {
    id: 'dev-off-territory-co',
    type: 'off_territory',
    severity: 'attention',
    detected: `${formatInteger(OFF_TERRITORY_SAMPLES)} amostras entregues fora do território de origem do lote.`,
    detail: `O lote ${OPERATOR_LOT.batchCode} saiu do ${OPERATOR_LOT.holderName} e teve baixa em dois territórios de outra regional. Entrega fora do território de origem quebra a conferência de cobertura e distorce o retorno apurado por região.`,
    suggestedAction:
      'Confirmar a transferência com a filial de destino ou estornar as baixas fora do território de origem.',
    holder: OPERATOR_LOT.holderName,
    lotCode: OPERATOR_LOT.batchCode,
    detectedOn: daysAgo(13),
    link: null,
    decisionId: null,
    attestation: combine([CRM_SFA, NEOGRID]),
  },
  {
    id: 'dev-volume-cap',
    type: 'volume_cap',
    severity: 'attention',
    detected: `${formatInteger(DOCTORS_OVER_CAP)} médicos receberam acima do teto de ${formatInteger(SAMPLES_PER_DOCTOR_CAP)} amostras por ciclo.`,
    detail: `O maior caso do ciclo chegou a ${formatInteger(LARGEST_OVER_CAP)} amostras. Volume acima do teto sem justificativa registrada não entra no cálculo de conversão — é entrega que a plataforma não consegue defender.`,
    suggestedAction:
      'Exigir justificativa do representante e travar novas entregas a esses médicos até a aprovação do responsável.',
    holder: 'Diversos territórios',
    lotCode: null,
    detectedOn: daysAgo(4),
    link: null,
    decisionId: null,
    attestation: CRM_SFA,
  },
  {
    id: 'dev-expiry-rep-sul',
    type: 'near_expiry',
    severity: 'informative',
    detected: `${formatInteger(REP_SUL_LOT.units)} amostras em poder do representante vencem em ${daysToExpiry(REP_SUL_LOT)} dias.`,
    detail: `Mesmo lote do desvio de baixa: o prazo de validade corre enquanto a amostra está em campo, e o lote ${REP_SUL_LOT.batchCode} já está dentro da janela de risco.`,
    suggestedAction:
      'Priorizar a entrega nas visitas da semana ou recolher o saldo para redistribuição.',
    holder: REP_SUL_LOT.holderName,
    lotCode: REP_SUL_LOT.batchCode,
    detectedOn: daysAgo(2),
    link: null,
    decisionId: 'D-2026-0004',
    attestation: combine([SAP, CRM_SFA]),
  },
]

export const OPEN_DEVIATIONS = DEVIATION_ALERTS.length
export const CRITICAL_DEVIATIONS = DEVIATION_ALERTS.filter(
  (alert) => alert.severity === 'critical',
).length

/** Dias entre a detecção do desvio e a regularização. NOTA: não consta do ESCOPO. */
export const AVERAGE_REGULARIZATION_DAYS = 6.4

export const DEVIATION_ATTESTATION = combine([SAP, CRM_SFA, NEOGRID])

/* -------------------------------------------------------------------------- */
/* Rastreabilidade do ciclo                                                    */
/* -------------------------------------------------------------------------- */

/**
 * NOTA: não consta do ESCOPO — os lotes do ciclo e a evolução da
 * rastreabilidade. Um lote é íntegro quando os cinco elos têm registro; o
 * percentual é derivado da contagem, não digitado.
 */
export const LOTS_IN_CYCLE = 1_284
export const LOTS_WITH_GAP = 74

export const TRACEABILITY_PERCENT =
  Math.round(((LOTS_IN_CYCLE - LOTS_WITH_GAP) / LOTS_IN_CYCLE) * 1_000) / 10

export type CyclePoint = {
  readonly id: string
  readonly label: string
  readonly asOf: IsoDate
  readonly traceabilityPercent: number
}

const CYCLE_OFFSETS_DAYS: readonly number[] = [153, 122, 92, 61, 31, 0]
const CYCLE_VALUES: readonly number[] = [86.4, 88.1, 90.3, 91.7, 93.0, TRACEABILITY_PERCENT]

export const CYCLE_TRACEABILITY: readonly CyclePoint[] = CYCLE_OFFSETS_DAYS.map(
  (offset, index) => {
    const asOf = daysAgo(offset)
    return {
      id: `cycle-${index}`,
      label: formatMonth(asOf),
      asOf,
      traceabilityPercent: CYCLE_VALUES[index] ?? TRACEABILITY_PERCENT,
    }
  },
)

export const TRACEABILITY_ATTESTATION = combine([SAP, CRM_SFA])

export const COMPLIANCE_ATTESTATION = combine([SAP, CRM_SFA, NEOGRID])

/** Fase em que a exportação da trilha para auditoria entra. */
export const AUDIT_EXPORT_PHASE = 'Fase 2'
