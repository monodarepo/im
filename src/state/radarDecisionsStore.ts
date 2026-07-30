import { create } from 'zustand'
import { HOJE, type IsoDate } from '../domain/today'
import type { DecisionRef } from '../mock/decisions'
import { nextDecisionId } from '../mock/radar'

/**
 * Decisões criadas a partir do Radar.
 *
 * Transformar uma oportunidade em Decisão não abre tela nova: mina o próximo
 * identificador da série e guarda título e impacto junto, para que a decisão
 * recém-criada seja navegável como qualquer outra. Sem isso o botão levaria a
 * uma tela de "decisão não encontrada", e a conversão pareceria ter funcionado
 * sem ter funcionado.
 *
 * Isto é distinto de `decisionsStore`, que registra encaminhamento de fator de
 * causa-raiz entre produtos. Criar uma decisão e encaminhá-la a um time são
 * eventos diferentes e não devem compartilhar o mesmo vínculo.
 */

export type CreatedDecision = DecisionRef & {
  /** Linha do radar que originou a decisão. */
  readonly radarId: string
  readonly createdOn: IsoDate
}

type RadarDecisionsState = {
  readonly created: readonly CreatedDecision[]
  /** Cria a decisão da oportunidade e devolve o identificador; idempotente. */
  convert: (radarId: string, title: string, impactBrl: number) => string
  decisionOf: (radarId: string) => CreatedDecision | undefined
  findCreated: (decisionId: string) => CreatedDecision | undefined
  reset: () => void
}

export const useRadarDecisions = create<RadarDecisionsState>((set, get) => ({
  created: [],

  convert: (radarId, title, impactBrl) => {
    const existing = get().created.find((item) => item.radarId === radarId)
    if (existing) return existing.id

    const id = nextDecisionId(get().created.length)
    set((state) => ({
      created: [...state.created, { id, radarId, title, impactBrl, product: 'hub', createdOn: HOJE }],
    }))
    return id
  },

  decisionOf: (radarId) => get().created.find((item) => item.radarId === radarId),

  findCreated: (decisionId) => get().created.find((item) => item.id === decisionId),

  reset: () => set({ created: [] }),
}))
