import { create } from 'zustand'
import type { Attestation } from '../domain/attestation'
import {
  canTransition,
  transition,
  type DecisionParcel,
  type DecisionState,
} from '../domain/decision'
import type { ProductId } from '../design/tokens'
import { HOJE } from '../domain/today'

/**
 * Estado das decisões na Central.
 *
 * Decisão que ninguém moveu está em `proposed`; enviar um cenário para
 * aprovação a leva a `in_approval` e anexa a parcela de impacto daquele
 * produto. A transição passa por `transition()`, então estado inválido não
 * chega a ser gravado.
 */

const INITIAL_STATE: DecisionState = 'proposed'

type Submission = {
  readonly decisionId: string
  readonly parcel: DecisionParcel
}

type DecisionWorkflowState = {
  readonly states: Readonly<Record<string, DecisionState>>
  readonly parcels: readonly Submission[]
  stateOf: (decisionId: string) => DecisionState
  parcelsOf: (decisionId: string) => readonly DecisionParcel[]
  /** Envia para aprovação anexando a parcela. Idempotente por origem. */
  submitForApproval: (
    decisionId: string,
    parcel: {
      id: string
      source: ProductId
      label: string
      amountBrl: number
      attestation: Attestation
    },
  ) => void
  moveTo: (decisionId: string, next: DecisionState) => void
  reset: () => void
}

export const useDecisionWorkflow = create<DecisionWorkflowState>((set, get) => ({
  states: {},
  parcels: [],

  stateOf: (decisionId) => get().states[decisionId] ?? INITIAL_STATE,

  parcelsOf: (decisionId) =>
    get()
      .parcels.filter((entry) => entry.decisionId === decisionId)
      .map((entry) => entry.parcel),

  submitForApproval: (decisionId, parcel) =>
    set((state) => {
      const current = state.states[decisionId] ?? INITIAL_STATE
      const alreadySubmitted = state.parcels.some(
        (entry) => entry.decisionId === decisionId && entry.parcel.id === parcel.id,
      )
      if (alreadySubmitted) return state

      const next = canTransition(current, 'in_approval')
        ? transition(current, 'in_approval')
        : current

      return {
        states: { ...state.states, [decisionId]: next },
        parcels: [
          ...state.parcels,
          { decisionId, parcel: { ...parcel, createdOn: HOJE } },
        ],
      }
    }),

  moveTo: (decisionId, next) =>
    set((state) => {
      const current = state.states[decisionId] ?? INITIAL_STATE
      return { states: { ...state.states, [decisionId]: transition(current, next) } }
    }),

  reset: () => set({ states: {}, parcels: [] }),
}))
