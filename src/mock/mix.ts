import type { Attestation } from '../domain/attestation'
import { SELLOUT_TOTAL_BRL } from './kpis'
import { SCANNTECH } from './sources'

/** Mix de vendas por marca (seção 10.1 do ESCOPO). */

export type MixSlice = {
  readonly id: string
  readonly label: string
  readonly share: number
}

export const SALES_MIX: readonly MixSlice[] = [
  { id: 'marca-a', label: 'Marca A', share: 40 },
  { id: 'marca-b', label: 'Marca B', share: 28 },
  { id: 'marca-c', label: 'Marca C', share: 17 },
  { id: 'outras', label: 'Outras', share: 15 },
]

export const MIX_TOTAL_BRL = SELLOUT_TOTAL_BRL

export const MIX_ATTESTATION: Attestation = SCANNTECH
