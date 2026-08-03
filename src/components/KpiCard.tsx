import { describeAttestation, type Attestation } from '../domain/attestation'
import { DataBadge } from './DataBadge'
import { PerimeterMark } from './PerimeterNote'
import { SemanticDelta, type DeltaUnit } from './SemanticDelta'

import type { ReactNode } from 'react'

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
  /** Selo no canto do cabeçalho (ex.: badge de produto). Em flex, nunca sobreposto. */
  corner?: ReactNode
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
  corner,
}: KpiCardProps) {
  return (
    <article className="rounded-card border border-surface-border bg-surface-card p-4">
      {/* Zona do rótulo com altura de duas linhas: card não muda de altura
          quando um rótulo longo quebra e o vizinho não. */}
      <header className="flex min-h-[27px] items-start justify-between gap-2">
        <h3
          className="min-w-0 text-micro uppercase text-neutral"
          title={describeAttestation(attestation)}
        >
          {label}
        </h3>
        {corner ? <span className="shrink-0">{corner}</span> : null}
      </header>

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

      <footer className="mt-3 flex min-h-[34px] items-center border-t border-surface-border pt-2.5">
        <DataBadge attestation={attestation} oneLine />
      </footer>
    </article>
  )
}
