import {
  describeAttestation,
  isStale,
  QUALITY_LABEL,
  SOURCE_LABEL,
  type Attestation,
} from '../domain/attestation'
import { ageInDays, formatDate, formatRelative } from '../domain/today'
import { SEMANTIC } from '../design/tokens'
import { ConfidenceMeter } from './ConfidenceMeter'

type DataBadgeProps = {
  attestation: Attestation
  /** `full` acrescenta a data de referência por extenso. */
  variant?: 'compact' | 'full'
}

/**
 * Procedência visível de um número: fonte, defasagem e confiança.
 *
 * Todo número relevante da plataforma carrega um destes. Quando a fonte está
 * atrasada, a defasagem vai para âmbar — o número segue na tela, apenas deixa
 * de se apresentar como fresco.
 */
export function DataBadge({ attestation, variant = 'compact' }: DataBadgeProps) {
  const stale = isStale(attestation)
  const age = ageInDays(attestation.asOf)
  const sources = attestation.source.map((source) => SOURCE_LABEL[source]).join(' + ')

  return (
    <span
      className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-delta text-neutral"
      title={`${describeAttestation(attestation)} · ${QUALITY_LABEL[attestation.quality]} · referência ${formatDate(attestation.asOf)}`}
    >
      <span className="font-medium text-slate-600">{sources}</span>

      <span aria-hidden>·</span>

      <span style={stale ? { color: SEMANTIC.attention, fontWeight: 500 } : undefined}>
        {age === 0 ? 'sem defasagem' : `${formatRelative(attestation.asOf)}`}
      </span>

      <ConfidenceMeter confidence={attestation.confidence} />

      {variant === 'full' ? (
        <>
          <span aria-hidden>·</span>
          <span>ref. {formatDate(attestation.asOf)}</span>
        </>
      ) : null}
    </span>
  )
}
