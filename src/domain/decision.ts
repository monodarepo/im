import type { ProductId } from '../design/tokens'
import type { SemanticTone } from '../design/tokens'
import type { Attestation, Confidence } from './attestation'
import type { IsoDate } from './today'

/**
 * Objeto Decisão (seção 8.1 do ESCOPO).
 *
 * Do vocabulário de estados, o ESCOPO fixou até aqui `EM_APROVACAO`, usado pelo
 * envio do simulador de cenários. Os demais estados abaixo completam o ciclo
 * mínimo para que a máquina seja utilizável — proposta, aprovação, execução,
 * conclusão — e são substituíveis assim que a 8.1 estiver disponível.
 *
 * NOTA: só `in_approval` tem token confirmado pelo ESCOPO. Os outros seis
 * tokens são o preenchimento provisório do ciclo.
 *
 * Identificadores em inglês, como manda a regra de engenharia; o token canônico
 * do ESCOPO fica preservado em `DECISION_STATE_TOKEN`, que é o que atravessa
 * fronteira de sistema.
 */

export type DecisionState =
  | 'draft'
  | 'proposed'
  | 'in_approval'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'concluded'
  | 'learned'

export const DECISION_STATE_TOKEN: Record<DecisionState, string> = {
  draft: 'RASCUNHO',
  proposed: 'PROPOSTA',
  in_approval: 'EM_APROVACAO',
  approved: 'APROVADA',
  rejected: 'REJEITADA',
  executing: 'EM_EXECUCAO',
  concluded: 'CONCLUIDA',
  learned: 'APRENDIDA',
}

export const DECISION_STATE_LABEL: Record<DecisionState, string> = {
  draft: 'Rascunho',
  proposed: 'Proposta',
  in_approval: 'Em aprovação',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
  executing: 'Em execução',
  concluded: 'Concluída',
  learned: 'Aprendida',
}

export const DECISION_STATE_TONE: Record<DecisionState, SemanticTone> = {
  draft: 'neutral',
  proposed: 'neutral',
  in_approval: 'attention',
  approved: 'positive',
  rejected: 'negative',
  executing: 'attention',
  concluded: 'positive',
  learned: 'positive',
}

/**
 * Transições permitidas, declaradas como mapa explícito.
 *
 * Estado terminal tem lista vazia — não é caso especial espalhado em `if`, é
 * a ausência de saída no próprio mapa.
 */
export const DECISION_TRANSITIONS: Record<DecisionState, readonly DecisionState[]> = {
  draft: ['proposed'],
  proposed: ['in_approval', 'rejected'],
  in_approval: ['approved', 'rejected', 'proposed'],
  approved: ['executing'],
  rejected: [],
  executing: ['concluded'],
  /**
   * Concluir não encerra o ciclo — aprender encerra. `APRENDIDA` (seção 8.3)
   * marca que o resultado medido virou regra: a decisão deixou de ser um caso
   * e passou a calibrar as próximas.
   */
  concluded: ['learned'],
  learned: [],
}

export function canTransition(from: DecisionState, to: DecisionState): boolean {
  return DECISION_TRANSITIONS[from].includes(to)
}

export function isTerminal(state: DecisionState): boolean {
  return DECISION_TRANSITIONS[state].length === 0
}

/** Aplica a transição ou recusa, para que estado inválido nunca seja gravado. */
export function transition(from: DecisionState, to: DecisionState): DecisionState {
  if (!canTransition(from, to)) {
    throw new Error(
      `Transição inválida: ${DECISION_STATE_TOKEN[from]} → ${DECISION_STATE_TOKEN[to]}`,
    )
  }
  return to
}

/**
 * Parcela de impacto atribuída a uma decisão por um produto.
 *
 * Uma decisão soma parcelas de origens diferentes: o simulador do RGM contribui
 * com o ganho de receita do cenário aprovado, o HUB com a recuperação de
 * distribuição, e assim por diante.
 */
export type DecisionParcel = {
  readonly id: string
  readonly source: ProductId
  readonly label: string
  readonly amountBrl: number
  readonly createdOn: IsoDate
  readonly attestation: Attestation
}

export type Decision = {
  readonly id: string
  readonly title: string
  readonly state: DecisionState
  readonly product: ProductId
  readonly impactBrl: number
  readonly parcels: readonly DecisionParcel[]
}

export function parcelTotal(parcels: readonly DecisionParcel[]): number {
  return parcels.reduce((sum, parcel) => sum + parcel.amountBrl, 0)
}

/** Quanto tempo resta antes de a janela da decisão fechar. */
export type Urgency = 'low' | 'medium' | 'high' | 'critical'

export const URGENCY_LABEL: Record<Urgency, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
}

export const URGENCY_TONE: Record<Urgency, SemanticTone> = {
  low: 'neutral',
  medium: 'neutral',
  high: 'attention',
  critical: 'negative',
}

/** Esforço de execução — quanto custa mover, não quanto vale mover. */
export type Effort = 'low' | 'medium' | 'high'

export const EFFORT_LABEL: Record<Effort, string> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
}

/**
 * Nível de autonomia da plataforma sobre a decisão.
 *
 * A escala é deliberadamente conservadora: a plataforma recomenda e o humano
 * decide. `assisted` é o teto desta fase — nada executa sozinho, e é isso que
 * o badge comunica na tela.
 */
export type AutonomyLevel = 'informative' | 'recommended' | 'assisted' | 'automatic'

export const AUTONOMY_LABEL: Record<AutonomyLevel, string> = {
  informative: 'Informativo',
  recommended: 'Recomendação',
  assisted: 'Execução assistida',
  automatic: 'Execução automática',
}

export const AUTONOMY_DESCRIPTION: Record<AutonomyLevel, string> = {
  informative: 'A plataforma mostra o número. A leitura é do time.',
  recommended: 'A plataforma propõe a ação e sustenta o porquê. Aprovar é humano.',
  assisted: 'A plataforma prepara a execução e acompanha o resultado. Disparar é humano.',
  automatic: 'A plataforma executa dentro da alçada configurada, sem confirmação.',
}

/** Alçada necessária para aprovar. */
export type AuthorityLevel = 'manager' | 'director' | 'vp' | 'committee'

export const AUTHORITY_LABEL: Record<AuthorityLevel, string> = {
  manager: 'Gerência',
  director: 'Diretoria',
  vp: 'Vice-presidência',
  committee: 'Comitê executivo',
}

/**
 * Entrada da trilha de auditoria.
 *
 * `from` nulo marca a abertura da decisão — não existe transição para o
 * primeiro estado, e fingir uma tornaria a trilha mentirosa.
 */
export type AuditEntry = {
  readonly id: string
  readonly on: IsoDate
  readonly actor: string
  readonly role: string
  readonly from: DecisionState | null
  readonly to: DecisionState
  readonly note: string
}

/** Decisão completa da seção 8.1, com o que o detalhe precisa mostrar. */
export type DecisionRecord = Decision & {
  readonly summary: string
  readonly probableCause: string
  readonly recommendation: string
  readonly confidence: Confidence
  readonly urgency: Urgency
  readonly effort: Effort
  readonly owner: string
  readonly ownerRole: string
  readonly dueOn: IsoDate
  readonly authority: AuthorityLevel
  readonly autonomy: AutonomyLevel
  readonly evidence: readonly DecisionEvidence[]
  readonly audit: readonly AuditEntry[]
  readonly attestation: Attestation
}

/** Evidência que sustenta a decisão, sempre com atestado e tela de origem. */
export type DecisionEvidence = {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly reading: string
  readonly route: string
  readonly routeLabel: string
  readonly attestation: Attestation
}

/**
 * A trilha só é confiável se cada elo continuar o anterior e respeitar o mapa
 * de transições. Uma trilha que salta estado é uma trilha que não aconteceu.
 */
export function isAuditTrailConsistent(audit: readonly AuditEntry[]): boolean {
  return audit.every((entry, index) => {
    const previous = audit[index - 1]
    if (!previous) return entry.from === null
    return entry.from === previous.to && canTransition(entry.from, entry.to)
  })
}

/** Estado corrente segundo a trilha — o último elo, não um campo à parte. */
export function stateFromAudit(audit: readonly AuditEntry[], fallback: DecisionState): DecisionState {
  return audit[audit.length - 1]?.to ?? fallback
}
