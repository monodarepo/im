import { DIAGNOSTICS } from '../mock/diagnostics'
import { DataBadge } from './DataBadge'

/** Diagnóstico rápido: o que mudou e a leitura que o time já tem sobre isso. */
export function DiagnosticList() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {DIAGNOSTICS.map((diagnostic) => (
        <article
          key={diagnostic.id}
          className="flex flex-col rounded-card border border-surface-border bg-surface-card p-4"
        >
          <p className="text-delta-lg font-medium text-slate-900">{diagnostic.finding}</p>

          <p className="mt-3 text-delta text-neutral">{diagnostic.readingLabel}</p>
          <p className="text-delta-lg font-semibold tabular-nums text-slate-900">
            {diagnostic.reading}
          </p>

          <div className="mt-auto border-t border-surface-border pt-3">
            <DataBadge attestation={diagnostic.attestation} />
          </div>
        </article>
      ))}
    </div>
  )
}
