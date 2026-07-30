import { create } from 'zustand'
import { HOJE, type IsoDate } from '../domain/today'

/**
 * Fila de exceções da ingestão.
 *
 * Aceitar uma correção não conserta só o lote atual: promove a correção a
 * regra permanente da fonte. É por isso que a fila encolhe com o uso em vez de
 * virar trabalho recorrente.
 */

export type AcceptedRule = {
  readonly exceptionId: string
  readonly rule: string
  readonly createdOn: IsoDate
}

type ExceptionsState = {
  readonly accepted: readonly AcceptedRule[]
  accept: (exceptionId: string, rule: string) => void
  isResolved: (exceptionId: string) => boolean
  ruleOf: (exceptionId: string) => AcceptedRule | undefined
  reset: () => void
}

export const useExceptions = create<ExceptionsState>((set, get) => ({
  accepted: [],

  accept: (exceptionId, rule) =>
    set((state) => {
      if (state.accepted.some((item) => item.exceptionId === exceptionId)) return state
      return { accepted: [...state.accepted, { exceptionId, rule, createdOn: HOJE }] }
    }),

  isResolved: (exceptionId) => get().accepted.some((item) => item.exceptionId === exceptionId),

  ruleOf: (exceptionId) => get().accepted.find((item) => item.exceptionId === exceptionId),

  reset: () => set({ accepted: [] }),
}))
