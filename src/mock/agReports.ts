import type { SemanticTone } from '../design/tokens'
import { combine, type Attestation } from '../domain/attestation'
import { formatInteger } from '../domain/format'
import { PERSONAS, type Persona } from '../domain/persona'
import { daysAgo, daysFromNow, type IsoDate } from '../domain/today'
import {
  AT_RISK_LOTS,
  INVENTORY_ATTESTATION,
  LOGISTICS_ATTESTATION,
  LOTS,
  VIRTUAL_STOCK,
} from './agInventory'
import { CAMPAIGN_ROWS } from './agOverview'
import { ACTIVATED_DOCTORS, CHAIN_ATTESTATION, CONVERSION_CHAIN } from './conversion'
import { findDecision } from './decisions'
import { ALLOCATION_ATTESTATION, ALLOCATION_DECISION_ID, REGION_TOTAL } from './sampleAllocation'
import { CRM_SFA, SAP } from './sources'

/**
 * Relatórios (AG, módulo 4.10).
 *
 * O AG não gera relatório novo: publica o que as outras telas do produto já
 * apuraram. Cada linha do catálogo tem uma tela de origem, uma periodicidade,
 * um público e um atestado — e o volume de linhas é lido da própria origem, não
 * redigitado aqui. Um relatório sem origem não entra no catálogo.
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

function chainStepValue(id: string): number {
  const found = CONVERSION_CHAIN.find((step) => step.id === id)
  if (!found) throw new Error(`Passo da cadeia de conversão inexistente: ${id}`)
  return found.value
}

const MARKET_INTELLIGENCE = personaNamed('Carla Mendes')
const GO_TO_MARKET = personaNamed('João Pedro')
const REVENUE = personaNamed('Mariana Santos')
const MEDICAL_RELATIONS = personaNamed('Fernanda Lima')

const TRACEABILITY_ATTESTATION: Attestation = combine([CRM_SFA, SAP])

// ---------------------------------------------------------------------------
// 1. Catálogo de relatórios
// ---------------------------------------------------------------------------

export type ReportCadence = 'daily' | 'weekly' | 'biweekly' | 'monthly'

export const CADENCE_LABEL: Record<ReportCadence, string> = {
  daily: 'Diária',
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
}

export type ReportAudience = 'field' | 'management' | 'board' | 'audit'

export const AUDIENCE_LABEL: Record<ReportAudience, string> = {
  field: 'Campo',
  management: 'Gerência',
  board: 'Diretoria',
  audit: 'Auditoria',
}

export type CatalogReport = {
  readonly id: string
  readonly title: string
  /** O que o relatório responde, em uma linha. */
  readonly purpose: string
  readonly cadence: ReportCadence
  readonly audience: ReportAudience
  /** Tela do AG que origina o relatório. */
  readonly originLabel: string
  readonly originRoute: string
  /** Quantas linhas o relatório publica e o que cada linha representa. */
  readonly rowCount: number
  readonly rowLabel: string
  readonly lastGeneratedOn: IsoDate
  readonly decisionId: string | null
  readonly attestation: Attestation
}

/** NOTA: não consta do ESCOPO — o número de desvios de compliance do período. */
const COMPLIANCE_DEVIATION_ROWS = 18

/**
 * NOTA: não consta do ESCOPO — a periodicidade, o público e o intervalo desde a
 * última geração de cada relatório. O volume de linhas vem das origens: médicos
 * -alvo do otimizador, visitas com entrega da cadeia de conversão, campanhas da
 * visão geral, lotes e posições de estoque, médicos ativados no período e lotes
 * propostos para redistribuição.
 */
type ReportSeed = {
  readonly id: string
  readonly title: string
  readonly purpose: string
  readonly cadence: ReportCadence
  readonly audience: ReportAudience
  readonly originLabel: string
  readonly originRoute: string
  readonly rowCount: number
  readonly rowLabel: string
  /** Última geração quando o histórico recente não tem execução concluída. */
  readonly fallbackDaysAgo: number
  readonly decisionId: string | null
  readonly attestation: Attestation
}

const REPORT_SEEDS: readonly ReportSeed[] = [
  {
    id: 'alocacao-campanha',
    title: 'Alocação por campanha',
    purpose: 'Para quem a amostra foi dirigida na campanha — e para quem não foi, com o motivo.',
    cadence: 'weekly',
    audience: 'management',
    originLabel: 'Otimizador de alocação',
    originRoute: '/ag/otimizador',
    rowCount: REGION_TOTAL.targetDoctors,
    rowLabel: 'médicos-alvo',
    fallbackDaysAgo: 9,
    decisionId: ALLOCATION_DECISION_ID,
    attestation: ALLOCATION_ATTESTATION,
  },
  {
    id: 'entregas-representante',
    title: 'Entregas por representante',
    purpose: 'O que saiu da filial, o que chegou ao consultório e o que ficou em poder do campo.',
    cadence: 'daily',
    audience: 'field',
    originLabel: 'Execução em campo',
    originRoute: '/ag/campo',
    rowCount: chainStepValue('visits'),
    rowLabel: 'entregas registradas',
    fallbackDaysAgo: 2,
    decisionId: null,
    attestation: CRM_SFA,
  },
  {
    id: 'conversao-roi-campanha',
    title: 'Conversão e ROI por campanha',
    purpose: 'Da amostra ao sell-out incremental, com o braço de controle separando o que a amostra causou.',
    cadence: 'monthly',
    audience: 'board',
    originLabel: 'Conversão e ROI',
    originRoute: '/ag/conversao-roi',
    rowCount: CAMPAIGN_ROWS.length,
    rowLabel: 'campanhas',
    fallbackDaysAgo: 38,
    decisionId: null,
    attestation: CHAIN_ATTESTATION,
  },
  {
    id: 'estoque-validade',
    title: 'Estoque e validade',
    purpose: 'Lotes por detentor, dias até o vencimento e o que não será consumido no ritmo atual.',
    cadence: 'weekly',
    audience: 'management',
    originLabel: 'Estoque e logística',
    originRoute: '/ag/estoque',
    rowCount: LOTS.length + VIRTUAL_STOCK.length,
    rowLabel: 'lotes e posições de estoque virtual',
    fallbackDaysAgo: 10,
    decisionId: null,
    attestation: INVENTORY_ATTESTATION,
  },
  {
    id: 'rastreabilidade-consentimentos',
    title: 'Rastreabilidade e consentimentos',
    purpose: 'Cadeia lote → representante → médico, com o consentimento registrado em cada entrega.',
    cadence: 'monthly',
    audience: 'audit',
    originLabel: 'Compliance e rastreabilidade',
    originRoute: '/ag/compliance',
    rowCount: ACTIVATED_DOCTORS,
    rowLabel: 'consentimentos',
    fallbackDaysAgo: 34,
    decisionId: null,
    attestation: TRACEABILITY_ATTESTATION,
  },
  {
    id: 'desvios-compliance',
    title: 'Desvios de compliance',
    purpose: 'Entrega sem consentimento, sem baixa ou fora da campanha autorizada, com o responsável.',
    cadence: 'weekly',
    audience: 'audit',
    originLabel: 'Compliance e rastreabilidade',
    originRoute: '/ag/compliance',
    rowCount: COMPLIANCE_DEVIATION_ROWS,
    rowLabel: 'desvios abertos',
    fallbackDaysAgo: 7,
    decisionId: null,
    attestation: TRACEABILITY_ATTESTATION,
  },
  {
    id: 'redistribuicoes-aprovadas',
    title: 'Redistribuições aprovadas',
    purpose: 'Lotes transferidos antes do vencimento, com origem, destino e o que a transferência recuperou.',
    cadence: 'biweekly',
    audience: 'management',
    originLabel: 'Redistribuição inteligente',
    originRoute: '/ag/redistribuicao',
    rowCount: AT_RISK_LOTS.length,
    rowLabel: 'lotes propostos',
    fallbackDaysAgo: 4,
    decisionId: ALLOCATION_DECISION_ID,
    attestation: LOGISTICS_ATTESTATION,
  },
]

// ---------------------------------------------------------------------------
// 2. Histórico de execuções
// ---------------------------------------------------------------------------

export type RunStatus = 'done' | 'processing' | 'failed'

export const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  done: 'Concluído',
  processing: 'Em processamento',
  failed: 'Falhou',
}

export const RUN_STATUS_TONE: Record<RunStatus, SemanticTone> = {
  done: 'positive',
  processing: 'attention',
  failed: 'negative',
}

/**
 * NOTA: não consta do ESCOPO — o histórico de execuções da janela recente.
 *
 * A execução que falhou está aqui de propósito: fonte incompleta no fechamento
 * degrada o relatório, não bloqueia a tela — a geração anterior segue publicada
 * e a fila é reprocessada.
 */
type RunSeed = {
  readonly id: string
  readonly reportId: string
  readonly ranDaysAgo: number
  readonly status: RunStatus
  readonly note: string
}

const RUN_SEEDS: readonly RunSeed[] = [
  {
    id: 'run-desvios',
    reportId: 'desvios-compliance',
    ranDaysAgo: 0,
    status: 'processing',
    note: 'Consolidação da semana em curso; a versão anterior segue publicada para a auditoria.',
  },
  {
    id: 'run-entregas',
    reportId: 'entregas-representante',
    ranDaysAgo: 1,
    status: 'done',
    note: 'Fechamento do dia com as baixas de entrega já conciliadas.',
  },
  {
    id: 'run-alocacao',
    reportId: 'alocacao-campanha',
    ranDaysAgo: 2,
    status: 'done',
    note: 'Inclui os territórios bloqueados por ruptura, com o motivo do bloqueio em cada linha.',
  },
  {
    id: 'run-estoque',
    reportId: 'estoque-validade',
    ranDaysAgo: 3,
    status: 'done',
    note: 'Lotes em risco de perda destacados para a pauta da redistribuição.',
  },
  {
    id: 'run-rastreabilidade',
    reportId: 'rastreabilidade-consentimentos',
    ranDaysAgo: 6,
    status: 'failed',
    note: 'Base de consentimento chegou incompleta no fechamento: execução reenfileirada, geração anterior mantida.',
  },
  {
    id: 'run-conversao',
    reportId: 'conversao-roi-campanha',
    ranDaysAgo: 9,
    status: 'done',
    note: 'Fechamento mensal com o braço de controle pareado do período.',
  },
]

function lastDoneDaysAgo(reportId: string): number | null {
  const runs = RUN_SEEDS.filter((run) => run.reportId === reportId && run.status === 'done')
  if (runs.length === 0) return null
  return runs.reduce((closest, run) => Math.min(closest, run.ranDaysAgo), Number.MAX_SAFE_INTEGER)
}

/** A última geração é a execução concluída mais recente; sem ela, o intervalo declarado. */
export const REPORT_CATALOG: readonly CatalogReport[] = REPORT_SEEDS.map((seed) => ({
  id: seed.id,
  title: seed.title,
  purpose: seed.purpose,
  cadence: seed.cadence,
  audience: seed.audience,
  originLabel: seed.originLabel,
  originRoute: seed.originRoute,
  rowCount: seed.rowCount,
  rowLabel: seed.rowLabel,
  lastGeneratedOn: daysAgo(lastDoneDaysAgo(seed.id) ?? seed.fallbackDaysAgo),
  decisionId: seed.decisionId,
  attestation: seed.attestation,
}))

export function reportOf(id: string): CatalogReport {
  const found = REPORT_CATALOG.find((report) => report.id === id)
  if (!found) throw new Error(`Relatório inexistente no catálogo: ${id}`)
  return found
}

export const CATALOG_ATTESTATION: Attestation = combine(
  REPORT_CATALOG.map((report) => report.attestation),
)

export const AUDIT_REPORT_COUNT = REPORT_CATALOG.filter(
  (report) => report.audience === 'audit',
).length

export const CATALOG_ORIGIN_NOTE =
  'Nenhum relatório é montado aqui: cada linha do catálogo é a publicação de uma tela do AG, com o mesmo número, o mesmo atestado e o link para a origem que o produziu.'

export type ReportRun = {
  readonly id: string
  readonly reportId: string
  readonly reportTitle: string
  readonly ranOn: IsoDate
  readonly status: RunStatus
  /** `null` enquanto a execução não concluiu: não há volume a declarar. */
  readonly rowCount: number | null
  readonly rowLabel: string
  readonly note: string
  readonly attestation: Attestation
}

export const RECENT_RUNS: readonly ReportRun[] = [...RUN_SEEDS]
  .sort((a, b) => a.ranDaysAgo - b.ranDaysAgo)
  .map((seed) => {
    const report = reportOf(seed.reportId)
    return {
      id: seed.id,
      reportId: report.id,
      reportTitle: report.title,
      ranOn: daysAgo(seed.ranDaysAgo),
      status: seed.status,
      rowCount: seed.status === 'done' ? report.rowCount : null,
      rowLabel: report.rowLabel,
      note: seed.note,
      attestation: report.attestation,
    }
  })

export const DONE_RUN_COUNT = RECENT_RUNS.filter((run) => run.status === 'done').length
export const PROCESSING_RUN_COUNT = RECENT_RUNS.filter((run) => run.status === 'processing').length
export const FAILED_RUN_COUNT = RECENT_RUNS.filter((run) => run.status === 'failed').length

export const TOTAL_ROWS_GENERATED = RECENT_RUNS.reduce(
  (total, run) => total + (run.rowCount ?? 0),
  0,
)

export const RUNS_ATTESTATION: Attestation = combine(RECENT_RUNS.map((run) => run.attestation))

function pluralCount(count: number, singular: string, plural: string): string {
  return `${formatInteger(count)} ${count === 1 ? singular : plural}`
}

export const RUNS_SUMMARY = `${pluralCount(FAILED_RUN_COUNT, 'falhou', 'falharam')} · ${pluralCount(PROCESSING_RUN_COUNT, 'em processamento', 'em processamento')}`

export const RUNS_ORIGIN_NOTE =
  'Execução que falha não derruba o relatório: a geração anterior segue publicada, a fila é reprocessada e o estado fica visível em vez de silencioso.'

// ---------------------------------------------------------------------------
// 3. Relatórios agendados
// ---------------------------------------------------------------------------

export type ScheduleState = 'active' | 'pending_approval' | 'paused'

export const SCHEDULE_STATE_LABEL: Record<ScheduleState, string> = {
  active: 'Ativo',
  pending_approval: 'Aguarda aprovação',
  paused: 'Pausado',
}

export const SCHEDULE_STATE_TONE: Record<ScheduleState, SemanticTone> = {
  active: 'positive',
  pending_approval: 'attention',
  paused: 'neutral',
}

export type ScheduledReport = {
  readonly id: string
  readonly reportId: string
  readonly reportTitle: string
  readonly cadence: ReportCadence
  readonly audience: ReportAudience
  readonly nextRunOn: IsoDate
  readonly recipients: readonly Persona[]
  readonly state: ScheduleState
  readonly note: string
  readonly attestation: Attestation
}

/**
 * NOTA: não consta do ESCOPO — os agendamentos, seus destinatários e o intervalo
 * até a próxima execução. Os destinatários são as personas fictícias da
 * plataforma; a periodicidade e o público vêm do catálogo acima.
 */
type ScheduleSeed = {
  readonly id: string
  readonly reportId: string
  readonly nextRunInDays: number
  readonly recipients: readonly Persona[]
  readonly state: ScheduleState
  readonly note: string
}

const SCHEDULE_SEEDS: readonly ScheduleSeed[] = [
  {
    id: 'agenda-entregas',
    reportId: 'entregas-representante',
    nextRunInDays: 1,
    recipients: [MEDICAL_RELATIONS, GO_TO_MARKET],
    state: 'active',
    note: 'Sai antes da primeira visita do dia, com o saldo em poder de cada representante.',
  },
  {
    id: 'agenda-estoque',
    reportId: 'estoque-validade',
    nextRunInDays: 3,
    recipients: [GO_TO_MARKET],
    state: 'active',
    note: 'Antecede a reunião de logística: lote em risco entra na pauta com dias até o vencimento.',
  },
  {
    id: 'agenda-alocacao',
    reportId: 'alocacao-campanha',
    nextRunInDays: 5,
    recipients: [MARKET_INTELLIGENCE, GO_TO_MARKET],
    state: 'active',
    note: 'Acompanha a decisão do plano de alocação e repete o motivo de cada território bloqueado.',
  },
  {
    id: 'agenda-desvios',
    reportId: 'desvios-compliance',
    nextRunInDays: 6,
    recipients: [MARKET_INTELLIGENCE],
    state: 'active',
    note: 'Vai à auditoria mesmo quando não há desvio no período — ausência de desvio também é resultado.',
  },
  {
    id: 'agenda-conversao',
    reportId: 'conversao-roi-campanha',
    nextRunInDays: 21,
    recipients: [REVENUE, MARKET_INTELLIGENCE],
    state: 'pending_approval',
    note: 'Aguarda o aceite da diretoria para publicar a leitura de incrementalidade junto do ROI.',
  },
  {
    id: 'agenda-rastreabilidade',
    reportId: 'rastreabilidade-consentimentos',
    nextRunInDays: 12,
    recipients: [MARKET_INTELLIGENCE, REVENUE],
    state: 'paused',
    note: 'Pausado até a execução reenfileirada concluir: a auditoria recebe a geração anterior nesse intervalo.',
  },
]

export const SCHEDULED_REPORTS: readonly ScheduledReport[] = SCHEDULE_SEEDS.map((seed) => {
  const report = reportOf(seed.reportId)
  return {
    id: seed.id,
    reportId: report.id,
    reportTitle: report.title,
    cadence: report.cadence,
    audience: report.audience,
    nextRunOn: daysFromNow(seed.nextRunInDays),
    recipients: seed.recipients,
    state: seed.state,
    note: seed.note,
    attestation: report.attestation,
  }
})

export const ACTIVE_SCHEDULE_COUNT = SCHEDULED_REPORTS.filter(
  (schedule) => schedule.state === 'active',
).length

export const RECIPIENT_COUNT = new Set(
  SCHEDULED_REPORTS.flatMap((schedule) => schedule.recipients.map((persona) => persona.name)),
).size

export const SCHEDULE_ATTESTATION: Attestation = combine(
  SCHEDULED_REPORTS.map((schedule) => schedule.attestation),
)

export const SCHEDULE_ORIGIN_NOTE =
  'O agendamento não escolhe conteúdo: escolhe quando o relatório da origem é publicado e para quem. Estado do agendamento fica visível — pausado e aguardando aprovação não viram entrega silenciosa.'

// ---------------------------------------------------------------------------
// 4. Ações de exportação
// ---------------------------------------------------------------------------

export type ExportAction = {
  readonly id: string
  readonly label: string
  readonly phase: string
}

/** Toda exportação é de fase futura: nesta fase o relatório é lido na tela. */
export const EXPORT_ACTIONS: readonly ExportAction[] = [
  { id: 'pdf', label: 'Exportar catálogo em PDF', phase: 'Fase 2' },
  { id: 'sheet', label: 'Exportar relatório em planilha', phase: 'Fase 2' },
  { id: 'email', label: 'Enviar aos destinatários por e-mail', phase: 'Fase 3' },
  { id: 'archive', label: 'Publicar no repositório de auditoria', phase: 'Fase 3' },
]

export const SCHEDULE_ACTIONS: readonly ExportAction[] = [
  { id: 'edit-schedule', label: 'Editar agendamento', phase: 'Fase 2' },
  { id: 'new-recipient', label: 'Incluir destinatário', phase: 'Fase 2' },
]

/** A decisão que os relatórios de alocação e redistribuição acompanham. */
export const CATALOG_DECISION = findDecision(ALLOCATION_DECISION_ID) ?? null

export const CATALOG_FOOTER_NOTE =
  'Relatório publicado carrega o mesmo atestado do número que o originou: se a fonte está atrasada, o relatório sai com a defasagem escrita em vez de sair sem ela.'
