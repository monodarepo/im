import { describeAttestation, type Attestation } from '../domain/attestation'
import { DataBadge } from './DataBadge'
import { PerimeterMark } from './PerimeterNote'
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
  /** Marca o valor com o asterisco de perímetro em validação (RGM, seção 6). */
  perimeter?: boolean
}

/**
 * Cartão de indicador no registro de instrumento: micro-rótulo em caixa alta,
 * valor em metric com numeral tabular, delta subordinado com cor semântica e
 * o atestado ao pé. Sem ícone decorativo, sem sombra, sem gradiente — a
 * hierarquia é tipográfica.
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
  perimeter = false,
}: KpiCardProps) {
  return (
    <article className="rounded-card border border-surface-border bg-surface-card p-4">
      <h3 className="text-micro uppercase text-neutral" title={describeAttestation(attestation)}>
        {label}
      </h3>

      <p
        className={`mt-1.5 font-mono tabular-nums text-slate-900 ${
          size === 'lg' ? 'text-metric-lg' : 'text-metric'
        }`}
      >
        {value}
        {perimeter ? <PerimeterMark /> : null}
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

      <footer className="mt-3 border-t border-surface-border pt-2.5">
        <DataBadge attestation={attestation} />
      </footer>
    </article>
  )
}
