import { create } from 'zustand'
import type { ProductId } from '../design/tokens'
import { HOJE, type IsoDate } from '../domain/today'

/**
 * Vínculos criados a partir do diagnóstico.
 *
 * Encaminhar um fator de causa-raiz para outro produto não abre uma tela nova:
 * grava um vínculo na Decisão de origem. É o que sustenta a tese de plataforma
 * integrada — o diagnóstico do HUB vira trabalho no RGM, no GTM e no AG sem
 * sair do objeto de decisão.
 */

export type DecisionLink = {
  readonly decisionId: string
  readonly target: ProductId
  /** Fator de causa-raiz que motivou o encaminhamento. */
  readonly reason: string
  readonly createdOn: IsoDate
}

type DecisionsState = {
  readonly links: readonly DecisionLink[]
  forward: (decisionId: string, target: ProductId, reason: string) => void
  linksOf: (decisionId: string) => readonly DecisionLink[]
  isForwarded: (decisionId: string, target: ProductId) => boolean
}

export const useDecisions = create<DecisionsState>((set, get) => ({
  links: [],

  forward: (decisionId, target, reason) =>
    set((state) => {
      const exists = state.links.some(
        (link) => link.decisionId === decisionId && link.target === target,
      )
      if (exists) return state
      return {
        links: [...state.links, { decisionId, target, reason, createdOn: HOJE }],
      }
    }),

  linksOf: (decisionId) => get().links.filter((link) => link.decisionId === decisionId),

  isForwarded: (decisionId, target) =>
    get().links.some((link) => link.decisionId === decisionId && link.target === target),
}))
