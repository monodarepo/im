import type { ReactNode } from 'react'

type PanelProps = {
  title: string
  description?: string
  /** Ação do canto superior direito: link, botão, seletor. */
  action?: ReactNode
  footer?: ReactNode
  children?: ReactNode
}

/** Cartão base da plataforma. Título, ação opcional, conteúdo, rodapé opcional. */
export function Panel({ title, description, action, footer, children }: PanelProps) {
  return (
    <section className="rounded-card border border-surface-border bg-surface-card">
      <header className="flex items-start justify-between gap-4 px-5 pt-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description ? <p className="mt-0.5 text-delta-lg text-neutral">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>

      {children ? <div className="px-5 py-4">{children}</div> : <div className="pb-4" />}

      {footer ? (
        <footer className="border-t border-surface-border px-5 py-3 text-delta text-neutral">
          {footer}
        </footer>
      ) : null}
    </section>
  )
}
