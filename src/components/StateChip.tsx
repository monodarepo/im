import { SEMANTIC, type SemanticTone } from '../design/tokens'

/**
 * Chip de estado da Decisão.
 *
 * O vocabulário de estados e as transições vivem em `domain/decision.ts`
 * (seção 8.1 do ESCOPO); este componente é a apresentação. Recebe rótulo e tom
 * já resolvidos para que a máquina de estados tenha um dono só.
 */

type StateChipProps = {
  label: string
  tone?: SemanticTone
  /** Estado terminal fica esmaecido: a decisão saiu da fila. */
  muted?: boolean
}

const SURFACE_ALPHA = '14'

export function StateChip({ label, tone = 'neutral', muted = false }: StateChipProps) {
  const color = SEMANTIC[tone]

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-control px-2 py-0.5 text-delta font-medium"
      style={{
        color,
        backgroundColor: `${color}${SURFACE_ALPHA}`,
        opacity: muted ? 0.6 : 1,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {label}
    </span>
  )
}
