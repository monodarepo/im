import type { ProductId } from '../design/tokens'
import type { SemanticTone } from '../design/tokens'
import type { Attestation } from './attestation'
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

export const DECISION_STATE_TOKEN: Record<DecisionState, string> = {
  draft: 'RASCUNHO',
  proposed: 'PROPOSTA',
  in_approval: 'EM_APROVACAO',
  approved: 'APROVADA',
  rejected: 'REJEITADA',
  executing: 'EM_EXECUCAO',
  concluded: 'CONCLUIDA',
}

export const DECISION_STATE_LABEL: Record<DecisionState, string> = {
  draft: 'Rascunho',
  proposed: 'Proposta',
  in_approval: 'Em aprovação',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
  executing: 'Em execução',
  concluded: 'Concluída',
}

export const DECISION_STATE_TONE: Record<DecisionState, SemanticTone> = {
  draft: 'neutral',
  proposed: 'neutral',
  in_approval: 'attention',
  approved: 'positive',
  rejected: 'negative',
  executing: 'attention',
  concluded: 'positive',
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
  concluded: [],
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
