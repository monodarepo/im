import { formatPercentDelta, formatPointsDelta } from '../domain/format'
import { formatMoneyDelta } from '../domain/money'
import { semanticColor, toneForDelta } from '../design/tokens'

export type DeltaUnit = 'percent' | 'points' | 'money'

type SemanticDeltaProps = {
  value: number
  unit?: DeltaUnit
  /** Métricas em que cair é bom: ruptura, devolução, custo, prazo. */
  inverted?: boolean
  size?: 'sm' | 'md'
  /** Contra o que a variação é medida, ex.: `vs. mês anterior`. */
  comparison?: string
}

function render(value: number, unit: DeltaUnit): string {
  if (unit === 'points') return formatPointsDelta(value)
  if (unit === 'money') return formatMoneyDelta(value)
  return formatPercentDelta(value)
}

/**
 * Variação com cor semântica. A cor vem do significado do número, nunca do
 * produto: verde é bom, vermelho é ruim, cinza é estável.
 */
export function SemanticDelta({
  value,
  unit = 'percent',
  inverted = false,
  size = 'md',
  comparison,
}: SemanticDeltaProps) {
  const tone = toneForDelta(value, { inverted })

  return (
    <span className={size === 'sm' ? 'text-delta' : 'text-delta-lg'}>
      <span className="font-medium tabular-nums" style={{ color: semanticColor(tone) }}>
        {render(value, unit)}
      </span>
      {comparison ? <span className="ml-1 text-neutral">{comparison}</span> : null}
    </span>
  )
}
