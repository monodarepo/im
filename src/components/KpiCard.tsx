import { describeAttestation, type Attestation } from '../domain/attestation'
import { DataBadge } from './DataBadge'
import { SemanticDelta, type DeltaUnit } from './SemanticDelta'

type KpiCardProps = {
  label: string
  /** Valor já formatado pelo domínio (`money.ts` / `format.ts`). */
  value: string
  delta?: number
  deltaUnit?: DeltaUnit
  deltaInverted?: boolean
  comparison?: string
  attestation: Attestation
  size?: 'md' | 'lg'
}

/**
 * Cartão de indicador: valor em destaque, variação subordinada e atestado ao pé.
 *
 * O atestado não é opcional — um KPI sem procedência não vai para a tela.
 */
export function KpiCard({
  label,
  value,
  delta,
  deltaUnit = 'percent',
  deltaInverted = false,
  comparison,
  attestation,
  size = 'md',
}: KpiCardProps) {
  return (
    <article className="rounded-card border border-surface-border bg-surface-card p-5">
      <h3 className="text-delta-lg font-medium text-neutral">{label}</h3>

      <p
        className={`mt-2 tabular-nums text-slate-900 ${size === 'lg' ? 'text-kpi-lg' : 'text-kpi'}`}
        title={describeAttestation(attestation)}
      >
        {value}
      </p>

      {delta !== undefined ? (
        <p className="mt-1">
          <SemanticDelta
            value={delta}
            unit={deltaUnit}
            inverted={deltaInverted}
            {...(comparison ? { comparison } : {})}
          />
        </p>
      ) : null}

      <div className="mt-3 border-t border-surface-border pt-3">
        <DataBadge attestation={attestation} />
      </div>
    </article>
  )
}
