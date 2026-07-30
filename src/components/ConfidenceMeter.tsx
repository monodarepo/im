import { CONFIDENCE_LABEL, type Confidence } from '../domain/attestation'
import { SEMANTIC } from '../design/tokens'

const FILLED_BARS: Record<Confidence, number> = { low: 1, medium: 2, high: 3 }

const BAR_COLOR: Record<Confidence, string> = {
  low: SEMANTIC.negative,
  medium: SEMANTIC.attention,
  high: SEMANTIC.positive,
}

type ConfidenceMeterProps = {
  confidence: Confidence
  showLabel?: boolean
}

/**
 * Confiança em três barras. É leitura de qualidade do dado, então usa a paleta
 * semântica — nunca a cor do produto.
 */
export function ConfidenceMeter({ confidence, showLabel = false }: ConfidenceMeterProps) {
  const filled = FILLED_BARS[confidence]

  return (
    <span className="inline-flex items-center gap-1.5" title={CONFIDENCE_LABEL[confidence]}>
      <span className="inline-flex items-end gap-0.5" aria-hidden>
        {[1, 2, 3].map((bar) => (
          <span
            key={bar}
            className="w-1 rounded-sm"
            style={{
              height: `${4 + bar * 2}px`,
              backgroundColor: bar <= filled ? BAR_COLOR[confidence] : '#CBD5E1',
            }}
          />
        ))}
      </span>
      {showLabel ? <span className="text-delta text-neutral">{CONFIDENCE_LABEL[confidence]}</span> : null}
      <span className="sr-only">{CONFIDENCE_LABEL[confidence]}</span>
    </span>
  )
}
