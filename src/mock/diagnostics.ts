import type { Attestation } from '../domain/attestation'
import { combine } from '../domain/attestation'
import { IQVIA, NEOGRID, NEOGRID_DISTRIBUIDORES, SCANNTECH } from './sources'

/** Diagnóstico rápido da Visão Geral (seção 10.1 do ESCOPO). */

export type Diagnostic = {
  readonly id: string
  readonly finding: string
  /** Rótulo da leitura: causa provável, impacto, perda estimada. */
  readonly readingLabel: string
  readonly reading: string
  readonly attestation: Attestation
}

export const DIAGNOSTICS: readonly Diagnostic[] = [
  {
    id: 'losartana-sp',
    finding: 'Queda de 12% no sell-out de Losartana em SP',
    readingLabel: 'Causa provável',
    reading: 'Preço e distribuição',
    attestation: combine([SCANNTECH, NEOGRID]),
  },
  {
    id: 'ruptura-ne',
    finding: 'Ruptura acima de 10% em 3 estados do NE',
    readingLabel: 'Impacto estimado',
    reading: 'R$ 2,1M',
    attestation: NEOGRID_DISTRIBUIDORES,
  },
  {
    id: 'dipirona-mg',
    finding: 'Concorrente reduziu preço de Dipirona em MG',
    readingLabel: 'Perda estimada de share',
    reading: '−1,3 pp',
    attestation: combine([SCANNTECH, IQVIA]),
  },
]
