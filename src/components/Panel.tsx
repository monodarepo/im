import type { ReactNode } from 'react'

type PanelProps = {
  title: string
  description?: string
  /** Ação do canto superior direito: link, botão, seletor. */
  action?: ReactNode
  footer?: ReactNode
  children?: ReactNode
}

/**
 * Cartão base da plataforma. Ocupa toda a altura da célula do grid para que
 * painéis lado a lado terminem alinhados, sem vão sob o mais curto.
 */
export function Panel({ title, description, action, footer, children }: PanelProps) {
  return (
    <section className="flex h-full flex-col rounded-card border border-surface-border bg-surface-card">
      <header className="flex items-start justify-between gap-4 px-4 pt-4">
        <div>
          <h2 className="text-section text-slate-900">{title}</h2>
          {description ? <p className="mt-0.5 text-body text-neutral">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>

      {children ? <div className="flex-1 px-4 py-4">{children}</div> : <div className="pb-4" />}

      {footer ? (
        <footer className="border-t border-surface-border px-4 py-3 text-label text-neutral">
          {footer}
        </footer>
      ) : null}
    </section>
  )
}
