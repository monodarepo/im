import { REGION_UFS, type UfCode } from '../assets/brazil-uf'
import type { OpportunityLevel } from '../design/tokens'
import type { Attestation } from '../domain/attestation'
import { combine } from '../domain/attestation'
import { DECISIONS } from './decisions'
import { IQVIA, NEOGRID, NEOGRID_DISTRIBUIDORES, SCANNTECH } from './sources'

/** Top oportunidades por impacto em R$ (seção 10.2 do ESCOPO). */

export type OpportunityScope =
  | { readonly kind: 'uf'; readonly uf: UfCode }
  | { readonly kind: 'region'; readonly label: string; readonly ufs: readonly UfCode[] }

export type Opportunity = {
  readonly rank: number
  readonly title: string
  readonly impactBrl: number
  readonly decisionId: string
  readonly scope: OpportunityScope
  readonly attestation: Attestation
}

export const OPPORTUNITIES: readonly Opportunity[] = [
  {
    rank: 1,
    title: 'Recuperar distribuição de Losartana em SP',
    impactBrl: 4_800_000,
    decisionId: 'D-2026-0001',
    scope: { kind: 'uf', uf: 'SP' },
    attestation: combine([SCANNTECH, NEOGRID]),
  },
  {
    rank: 2,
    title: 'Revisar preço de Dipirona em MG',
    impactBrl: 3_200_000,
    decisionId: 'D-2026-0002',
    scope: { kind: 'uf', uf: 'MG' },
    attestation: combine([SCANNTECH, IQVIA]),
  },
  {
    rank: 3,
    title: 'Aumentar cobertura de médicos, Cardiologia RJ',
    impactBrl: 2_700_000,
    decisionId: 'D-2026-0003',
    scope: { kind: 'uf', uf: 'RJ' },
    attestation: combine([IQVIA, NEOGRID]),
  },
  {
    rank: 4,
    title: 'Redistribuir amostras, Região Sul',
    impactBrl: 1_900_000,
    decisionId: 'D-2026-0004',
    scope: { kind: 'region', label: 'Região Sul', ufs: REGION_UFS.sul },
    attestation: NEOGRID,
  },
  {
    rank: 5,
    title: 'Reduzir ruptura de Paracetamol no NE',
    impactBrl: 1_600_000,
    decisionId: 'D-2026-0005',
    scope: { kind: 'region', label: 'Nordeste', ufs: REGION_UFS.nordeste },
    attestation: NEOGRID_DISTRIBUIDORES,
  },
]

/**
 * Nível de oportunidade de uma UF no mapa.
 *
 * Só as UFs cobertas por uma oportunidade priorizada carregam valor em R$. As
 * demais ficam no nível 1 sem número: o ESCOPO prioriza cinco oportunidades, e
 * atribuir um valor às outras 22 seria inventar dado.
 */
export type UfOpportunity = {
  readonly impactBrl: number
  readonly label: string
  readonly decisionId: string
  /** `true` quando o valor é do agregado regional, não da UF isolada. */
  readonly regional: boolean
}

const THRESHOLDS: readonly { min: number; level: OpportunityLevel }[] = [
  { min: 4_000_000, level: 5 },
  { min: 2_500_000, level: 4 },
  { min: 1_800_000, level: 3 },
  { min: 1_000_000, level: 2 },
]

export function opportunityLevel(impactBrl: number | undefined): OpportunityLevel {
  if (impactBrl === undefined) return 1
  return THRESHOLDS.find(({ min }) => impactBrl >= min)?.level ?? 1
}

function buildUfIndex(): Partial<Record<UfCode, UfOpportunity>> {
  const index: Partial<Record<UfCode, UfOpportunity>> = {}

  for (const opportunity of OPPORTUNITIES) {
    const entry = {
      impactBrl: opportunity.impactBrl,
      decisionId: opportunity.decisionId,
    }

    if (opportunity.scope.kind === 'uf') {
      index[opportunity.scope.uf] = { ...entry, label: opportunity.title, regional: false }
      continue
    }

    for (const uf of opportunity.scope.ufs) {
      index[uf] = { ...entry, label: opportunity.scope.label, regional: true }
    }
  }

  return index
}

export const UF_OPPORTUNITY: Partial<Record<UfCode, UfOpportunity>> = buildUfIndex()

export const TOTAL_OPPORTUNITY_BRL = OPPORTUNITIES.reduce(
  (sum, opportunity) => sum + opportunity.impactBrl,
  0,
)

/** Confere que cada oportunidade aponta para uma decisão existente. */
export const OPPORTUNITY_DECISION_IDS: readonly string[] = OPPORTUNITIES.map((o) => o.decisionId)

export const DECISION_IDS: readonly string[] = DECISIONS.map((decision) => decision.id)
