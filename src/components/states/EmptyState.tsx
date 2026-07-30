import type { ReactNode } from 'react'

/**
 * Estado vazio. Convida a agir — diz o que colocar aqui e como. Centralizado
 * de propósito: é a exceção prevista pelo padrão visual.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <p className="text-body-lg font-medium text-slate-900">{title}</p>
      <p className="max-w-sm text-body text-neutral">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
