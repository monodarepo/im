import { create } from 'zustand'
import { daysAgo, HOJE, type IsoDate } from '../domain/today'

/**
 * Filtros globais da plataforma.
 *
 * Vivem acima das rotas: atravessam a navegação entre produtos sem serem
 * remontados. Cada tela declara o que consome (ver `routes/registry.ts`); o que
 * não é declarado some do header em vez de aparecer desabilitado — filtro
 * cinza sugere que existe algo a destravar, e não existe.
 *
 * Nada é persistido em disco: `localStorage` é proibido e a demonstração
 * precisa começar sempre do mesmo estado.
 */

export type FilterId =
  | 'period'
  | 'bu'
  | 'brand'
  | 'product'
  | 'molecule'
  | 'channel'
  | 'customer'
  | 'region'
  | 'territory'
  | 'team'
  | 'specialty'
  | 'campaign'

export const FILTER_LABEL: Record<FilterId, string> = {
  period: 'Período',
  bu: 'BU',
  brand: 'Marca',
  product: 'Produto',
  molecule: 'Molécula',
  channel: 'Canal',
  customer: 'Cliente',
  region: 'Região/UF',
  territory: 'Território',
  team: 'Equipe',
  specialty: 'Especialidade',
  campaign: 'Campanha',
}

export const FILTER_ORDER: readonly FilterId[] = [
  'period',
  'bu',
  'brand',
  'product',
  'molecule',
  'channel',
  'customer',
  'region',
  'territory',
  'team',
  'specialty',
  'campaign',
]

export type Period = {
  readonly from: IsoDate
  readonly to: IsoDate
  readonly label: string
}

/** Período padrão: os 90 dias encerrados em `HOJE`. */
export const DEFAULT_PERIOD: Period = {
  from: daysAgo(90),
  to: HOJE,
  label: 'Últimos 90 dias',
}

/** Filtros de seleção múltipla: guardam ids, nunca rótulos. */
export type MultiFilterId = Exclude<FilterId, 'period'>

export type FilterState = {
  readonly period: Period
  readonly selections: Readonly<Record<MultiFilterId, readonly string[]>>
}

const EMPTY_SELECTIONS: Record<MultiFilterId, readonly string[]> = {
  bu: [],
  brand: [],
  product: [],
  molecule: [],
  channel: [],
  customer: [],
  region: [],
  territory: [],
  team: [],
  specialty: [],
  campaign: [],
}

type FilterActions = {
  setPeriod: (period: Period) => void
  toggle: (filter: MultiFilterId, value: string) => void
  setSelection: (filter: MultiFilterId, values: readonly string[]) => void
  clear: (filter: MultiFilterId) => void
  clearAll: () => void
}

export const useFilters = create<FilterState & FilterActions>((set) => ({
  period: DEFAULT_PERIOD,
  selections: EMPTY_SELECTIONS,

  setPeriod: (period) => set({ period }),

  toggle: (filter, value) =>
    set((state) => {
      const current = state.selections[filter]
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
      return { selections: { ...state.selections, [filter]: next } }
    }),

  setSelection: (filter, values) =>
    set((state) => ({ selections: { ...state.selections, [filter]: [...values] } })),

  clear: (filter) =>
    set((state) => ({ selections: { ...state.selections, [filter]: [] } })),

  clearAll: () => set({ period: DEFAULT_PERIOD, selections: EMPTY_SELECTIONS }),
}))

/** Filtros com valor ativo, na ordem canônica, restritos ao que a tela declara. */
export function activeFilters(
  state: FilterState,
  declared: readonly FilterId[],
): { id: FilterId; summary: string }[] {
  const active: { id: FilterId; summary: string }[] = []

  for (const id of FILTER_ORDER) {
    if (!declared.includes(id)) continue

    if (id === 'period') {
      active.push({ id, summary: state.period.label })
      continue
    }

    const values = state.selections[id]
    if (values.length === 0) continue
    active.push({
      id,
      summary: values.length === 1 ? (values[0] ?? '') : `${values.length} selecionados`,
    })
  }

  return active
}
