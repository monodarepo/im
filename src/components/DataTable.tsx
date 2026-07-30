import { useMemo, useState, type ReactNode } from 'react'
import { describeAttestation, type Attestation } from '../domain/attestation'
import { ICON_SIZE, ICON_STROKE, iconUi } from '../design/icons'
import { useDensity } from '../state/densityStore'
import { DataBadge } from './DataBadge'
import { EmptyState } from './states/EmptyState'
import { ErrorState } from './states/ErrorState'
import { SkeletonRows } from './states/Skeleton'

/**
 * Primitiva de tabela (PD1) — metade das telas deste produto são tabela, e é
 * aqui que a metade do acabamento mora.
 *
 * Regras que ela impõe sozinha, para nenhuma tela reinventar: micro-rótulo no
 * cabeçalho, coluna numérica à direita com numeral tabular, separador
 * hairline sem zebra, total distinto por borda de 2px, e os quatro estados
 * (carregando, vazio, erro, dado presente) decididos por prop — não por
 * `if` espalhado na tela.
 */

export type DataTableColumn<Row> = {
  readonly id: string
  readonly header: string
  readonly cell: (row: Row) => ReactNode
  /** Valor usado na ordenação. Sem ele, a coluna não ordena. */
  readonly sortValue?: (row: Row) => number | string
  readonly numeric?: boolean
  /** Fixa a coluna à esquerda em tabela larga. */
  readonly pinned?: boolean
  readonly attestation?: Attestation
  readonly widthClass?: string
}

type SortState = { columnId: string; direction: 'asc' | 'desc' } | null

type DataTableProps<Row> = {
  readonly columns: readonly DataTableColumn<Row>[]
  readonly rows: readonly Row[]
  readonly rowKey: (row: Row) => string
  readonly onRowClick?: (row: Row) => void
  /** Linha de total, renderizada por coluna. */
  readonly footer?: (columnId: string) => ReactNode
  readonly minWidthClass?: string
  readonly caption: string
  readonly state?: 'ready' | 'loading' | 'empty' | 'error'
  readonly emptyTitle?: string
  readonly emptyDescription?: string
  readonly emptyAction?: ReactNode
  readonly errorCause?: string
  readonly defaultSort?: { columnId: string; direction: 'asc' | 'desc' }
}

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  onRowClick,
  footer,
  minWidthClass = 'min-w-[640px]',
  caption,
  state = 'ready',
  emptyTitle = 'Nada por aqui',
  emptyDescription = 'Ajuste os filtros para trazer dados para esta tabela.',
  emptyAction,
  errorCause = 'A fonte não respondeu dentro do prazo. Recarregue a tela ou consulte a Qualidade dos Dados.',
  defaultSort,
}: DataTableProps<Row>) {
  const density = useDensity((store) => store.density)
  const [sort, setSort] = useState<SortState>(defaultSort ?? null)

  const rowHeight = density === 'compact' ? 36 : 44

  const sorted = useMemo(() => {
    if (!sort) return rows
    const column = columns.find((entry) => entry.id === sort.columnId)
    const value = column?.sortValue
    if (!value) return rows
    const factor = sort.direction === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const left = value(a)
      const right = value(b)
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * factor
      return String(left).localeCompare(String(right), 'pt-BR') * factor
    })
  }, [rows, sort, columns])

  const toggleSort = (columnId: string) => {
    setSort((current) => {
      if (current?.columnId !== columnId) return { columnId, direction: 'desc' }
      if (current.direction === 'desc') return { columnId, direction: 'asc' }
      return null
    })
  }

  if (state === 'loading') return <SkeletonRows rows={6} height={rowHeight} />
  if (state === 'error') return <ErrorState title="Não foi possível carregar" cause={errorCause} />
  if (state === 'empty' || rows.length === 0)
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
    )

  const ChevronUp = iconUi.chevronUp
  const ChevronDown = iconUi.chevronDown

  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${minWidthClass} text-left`}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-surface-border">
            {columns.map((column) => {
              const sortable = column.sortValue !== undefined
              const isSorted = sort?.columnId === column.id
              return (
                <th
                  key={column.id}
                  scope="col"
                  className={`sticky top-0 bg-surface-card pb-2 text-micro uppercase text-neutral ${
                    column.numeric ? 'text-right' : ''
                  } ${column.pinned ? 'left-0 z-10' : ''} ${column.widthClass ?? ''}`}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.id)}
                      aria-label={`Ordenar por ${column.header}`}
                      className={`inline-flex items-center gap-1 text-micro uppercase hover:text-slate-700 ${
                        isSorted ? 'text-slate-900' : 'text-neutral'
                      }`}
                    >
                      {column.header}
                      {isSorted ? (
                        sort?.direction === 'asc' ? (
                          <ChevronUp size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} aria-hidden />
                        ) : (
                          <ChevronDown size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} aria-hidden />
                        )
                      ) : null}
                    </button>
                  ) : (
                    column.header
                  )}
                  {column.attestation ? (
                    <span
                      className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-slate-300 align-middle"
                      title={describeAttestation(column.attestation)}
                    />
                  ) : null}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {sorted.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`text-body transition-colors ${
                onRowClick ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50/60'
              }`}
              style={{ height: rowHeight }}
            >
              {columns.map((column) => (
                <td
                  key={column.id}
                  className={`${column.numeric ? 'text-right tabular-nums' : ''} ${
                    column.pinned ? 'sticky left-0 bg-surface-card' : ''
                  }`}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer ? (
          <tfoot>
            <tr
              className="border-t-2 border-slate-300 text-body font-semibold"
              style={{ height: rowHeight }}
            >
              {columns.map((column) => (
                <td key={column.id} className={column.numeric ? 'text-right tabular-nums' : ''}>
                  {footer(column.id)}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  )
}

export { DataBadge }
