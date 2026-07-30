import { create } from 'zustand'

/**
 * Densidade global de tabela: compacta (36px) por padrão — densidade é
 * credibilidade neste público — com alternância para confortável (44px) no
 * header, pensada para projeção em sala.
 */
export type Density = 'compact' | 'comfortable'

export const DENSITY_LABEL: Record<Density, string> = {
  compact: 'Compacta',
  comfortable: 'Confortável',
}

type DensityState = {
  readonly density: Density
  toggle: () => void
}

export const useDensity = create<DensityState>((set) => ({
  density: 'compact',
  toggle: () =>
    set((state) => ({ density: state.density === 'compact' ? 'comfortable' : 'compact' })),
}))
