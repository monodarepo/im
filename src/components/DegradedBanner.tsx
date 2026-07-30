import { SOURCE_LABEL, type Attestation } from '../domain/attestation'
import { formatRelative } from '../domain/today'
import { SEMANTIC } from '../design/tokens'

type DegradedBannerProps = {
  /** Atestados atrasados que motivaram o aviso. */
  attestations: readonly Attestation[]
  /** O que muda na tela por conta do atraso. */
  consequence?: string
}

/**
 * Aviso de fonte atrasada.
 *
 * Estado degradado nunca bloqueia: a tela segue operável e o banner explica o
 * que ficou velho e o que isso custa na leitura.
 */
export function DegradedBanner({ attestations, consequence }: DegradedBannerProps) {
  if (attestations.length === 0) return null

  const names = [...new Set(attestations.flatMap((a) => a.source))]
    .map((source) => SOURCE_LABEL[source])
    .join(', ')

  const oldest = attestations.reduce((worst, a) => (a.asOf < worst.asOf ? a : worst))

  return (
    <div
      role="status"
      className="rounded-card border px-4 py-3 text-delta-lg"
      style={{ borderColor: `${SEMANTIC.attention}66`, backgroundColor: `${SEMANTIC.attention}0F` }}
    >
      <p className="font-medium text-slate-900">
        Fonte atrasada: {names} — atualizada {formatRelative(oldest.asOf)}
      </p>
      <p className="mt-0.5 text-neutral">
        {consequence ?? 'Os números seguem disponíveis com confiança reduzida.'}
      </p>
    </div>
  )
}
