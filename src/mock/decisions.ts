import type { ProductId } from '../design/tokens'

/**
 * Decisões referenciadas pelas oportunidades do HUB.
 *
 * O objeto `Decision` completo — estados, transições, atestado, dono, prazo —
 * é a seção 8.1 do ESCOPO. Aqui fica só a referência que a Visão Geral precisa
 * para linkar cada oportunidade à sua decisão, sem antecipar o schema.
 */

export type DecisionRef = {
  readonly id: string
  readonly title: string
  readonly impactBrl: number
  readonly product: ProductId
}

export const DECISIONS: readonly DecisionRef[] = [
  {
    id: 'D-2026-0001',
    title: 'Recuperar distribuição de Losartana em SP',
    impactBrl: 4_800_000,
    product: 'hub',
  },
  {
    id: 'D-2026-0002',
    title: 'Revisar preço de Dipirona em MG',
    impactBrl: 3_200_000,
    product: 'rgm',
  },
  {
    id: 'D-2026-0003',
    title: 'Aumentar cobertura de médicos, Cardiologia RJ',
    impactBrl: 2_700_000,
    product: 'gtm',
  },
  {
    id: 'D-2026-0004',
    title: 'Redistribuir amostras, Região Sul',
    impactBrl: 1_900_000,
    product: 'ag',
  },
  {
    id: 'D-2026-0005',
    title: 'Reduzir ruptura de Paracetamol no NE',
    impactBrl: 1_600_000,
    product: 'hub',
  },
]

const BY_ID = new Map(DECISIONS.map((decision) => [decision.id, decision]))

export function findDecision(id: string): DecisionRef | undefined {
  return BY_ID.get(id)
}
