import { create } from 'zustand'

type CopilotState = {
  readonly isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

/** Abertura do drawer do copiloto. Estado de chrome, sem conteúdo. */
export const useCopilot = create<CopilotState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}))
