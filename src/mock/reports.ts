import { combine, type Attestation } from '../domain/attestation'
import { formatDecimal, formatInteger, formatPercent, formatPointsDelta } from '../domain/format'
import { PERSONAS, type Persona } from '../domain/persona'
import { daysFromNow, formatDate, HOJE, type IsoDate } from '../domain/today'
import type { SemanticTone } from '../design/tokens'
import { DIAGNOSTICS, type Diagnostic } from './diagnostics'
import { MARKET_KPIS, type Kpi } from './kpis'
import { OPPORTUNITIES, type Opportunity } from './opportunities'
import {
  CORRIDOR_LABEL,
  corridorStatus,
  PRICE_CORRIDOR,
  PRICE_LINES,
  type CorridorStatus,
  type PriceLine,
} from './pricing'
import { createRandom, MOCK_SEED } from './random'
import { BASELINE, RECOMMENDED, RECOMMENDED_IMPACT, SCENARIO_ATTESTATION } from './scenarios'
import { CRM_SFA, NEOGRID, SCANNTECH } from './sources'

/**
 * Relatórios (RGM, módulo 3.10).
 *
 * A tela não entrega uma lista de relatórios: entrega dois documentos prontos.
 * A pauta do PDV Scanner e a proposta comercial nascem do que a plataforma já
 * apurou — nenhum campo é digitado. Por isso este módulo não redigita número:
 * ele lê os diagnósticos, as oportunidades priorizadas, as linhas de preço e o
 * cenário recomendado e monta o documento em cima deles.
 *
 * O que não vem dessas origens está marcado item a item com `NOTA:`.
 */

// ---------------------------------------------------------------------------
// Leitores das origens canônicas
// ---------------------------------------------------------------------------

function diagnosticOf(id: string): Diagnostic {
  const found = DIAGNOSTICS.find((diagnostic) => diagnostic.id === id)
  if (!found) throw new Error(`Diagnóstico inexistente: ${id}`)
  return found
}

function opportunityOf(decisionId: string): Opportunity {
  const found = OPPORTUNITIES.find((opportunity) => opportunity.decisionId === decisionId)
  if (!found) throw new Error(`Oportunidade inexistente: ${decisionId}`)
  return found
}

function priceLineOf(id: string): PriceLine {
  const found = PRICE_LINES.find((line) => line.id === id)
  if (!found) throw new Error(`Linha de preço inexistente: ${id}`)
  return found
}

function kpiOf(id: string): Kpi {
  const found = MARKET_KPIS.find((kpi) => kpi.id === id)
  if (!found) throw new Error(`Indicador inexistente: ${id}`)
  return found
}

function personaNamed(name: string): Persona {
  const found = PERSONAS.find((persona) => persona.name === name)
  if (!found) throw new Error(`Persona inexistente: ${name}`)
  return found
}

const NUMERIC_DISTRIBUTION = kpiOf('numeric-distribution')
const STOCKOUT = kpiOf('stockout')

const LOSARTANA_LINE = priceLineOf('losartana-farma-sudeste')
const DIPIRONA_LINE = priceLineOf('dipirona-farma-sudeste')

/**
 * Grandezas do roteiro que não existem em nenhuma outra origem — quantos pontos
 * de venda o ciclo cobre e quanto tempo cada pauta consome na loja. Derivadas da
 * semente do mock para que o roteiro seja idêntico em qualquer máquina.
 */
function seeded(index: number, min: number, max: number): number {
  const random = createRandom(MOCK_SEED + 71 + index)
  return min + Math.round(random() * (max - min))
}

// ---------------------------------------------------------------------------
// 1. Pauta do PDV Scanner
// ---------------------------------------------------------------------------

export type CheckKind = 'shelf_price' | 'competitor_price' | 'presence' | 'stockout'

export const CHECK_LABEL: Record<CheckKind, string> = {
  shelf_price: 'Preço de gôndola',
  competitor_price: 'Preço do concorrente',
  presence: 'Presença em gôndola',
  stockout: 'Ruptura',
}

export type ReferenceFormat = 'price' | 'percent' | 'index'

export type AgendaCheck = {
  readonly id: string
  readonly kind: CheckKind
  /** O que o promotor faz na loja, em uma frase. */
  readonly instruction: string
  /** Contra o que a leitura de campo será conferida. */
  readonly referenceLabel: string
  readonly referenceValue: number
  readonly referenceFormat: ReferenceFormat
  readonly attestation: Attestation
}

export function formatReference(check: AgendaCheck): string {
  if (check.referenceFormat === 'price') return `R$ ${formatDecimal(check.referenceValue, 2)}`
  if (check.referenceFormat === 'percent') return formatPercent(check.referenceValue)
  return formatDecimal(check.referenceValue, 1)
}

/** Origem que colocou o item na pauta. Sem ela, o item não entra. */
export type AgendaEvidence = {
  readonly id: string
  readonly kindLabel: string
  readonly finding: string
  readonly readingLabel: string | null
  readonly reading: string | null
  /** `true` quando a leitura termina em valor financeiro e pede marca de perímetro. */
  readonly readingIsMoney: boolean
  readonly decisionId: string | null
  readonly impactBrl: number | null
  readonly attestation: Attestation
}

export type AgendaItem = {
  readonly id: string
  readonly skuName: string
  readonly presentation: string
  readonly molecule: string
  /** Ordenação da pauta: quem tem mais impacto em R$ é conferido primeiro. */
  readonly impactBrl: number
  readonly decisionId: string
  readonly corridor: CorridorStatus | null
  readonly pointsOfSale: number
  readonly estimatedMinutes: number
  readonly checks: readonly AgendaCheck[]
  readonly evidence: readonly AgendaEvidence[]
  readonly attestation: Attestation
}

const LOSARTANA_DIAGNOSTIC = diagnosticOf('losartana-sp')
const DIPIRONA_DIAGNOSTIC = diagnosticOf('dipirona-mg')
const STOCKOUT_DIAGNOSTIC = diagnosticOf('ruptura-ne')

const LOSARTANA_OPPORTUNITY = opportunityOf('D-2026-0001')
const DIPIRONA_OPPORTUNITY = opportunityOf('D-2026-0002')
const STOCKOUT_OPPORTUNITY = opportunityOf('D-2026-0005')

function fromDiagnostic(diagnostic: Diagnostic, readingIsMoney: boolean): AgendaEvidence {
  return {
    id: `diagnostico-${diagnostic.id}`,
    kindLabel: 'Diagnóstico',
    finding: diagnostic.finding,
    readingLabel: diagnostic.readingLabel,
    reading: diagnostic.reading,
    readingIsMoney,
    decisionId: null,
    impactBrl: null,
    attestation: diagnostic.attestation,
  }
}

function fromOpportunity(opportunity: Opportunity): AgendaEvidence {
  return {
    id: `oportunidade-${opportunity.decisionId}`,
    kindLabel: 'Oportunidade priorizada',
    finding: opportunity.title,
    readingLabel: null,
    reading: null,
    readingIsMoney: false,
    decisionId: opportunity.decisionId,
    impactBrl: opportunity.impactBrl,
    attestation: opportunity.attestation,
  }
}

function fromCorridor(line: PriceLine): AgendaEvidence {
  const status = corridorStatus(line.relativePriceIndex)
  return {
    id: `corredor-${line.id}`,
    kindLabel: 'Corredor de preço',
    finding: `${line.molecule} ${line.presentation} em ${CORRIDOR_LABEL[status].toLowerCase()} no canal ${line.channel}`,
    readingLabel: 'Preço relativo (IPR)',
    reading: formatDecimal(line.relativePriceIndex, 1),
    readingIsMoney: false,
    decisionId: line.decisionId,
    impactBrl: null,
    attestation: line.attestation,
  }
}

function fromKpi(kpi: Kpi, finding: string): AgendaEvidence {
  return {
    id: `indicador-${kpi.id}`,
    kindLabel: 'Indicador do período',
    finding,
    readingLabel: kpi.label,
    reading: `${formatPercent(kpi.value)} (${formatPointsDelta(kpi.delta)})`,
    readingIsMoney: false,
    decisionId: null,
    impactBrl: null,
    attestation: kpi.attestation,
  }
}

/**
 * NOTA: não consta do ESCOPO — o roteiro de campo do ciclo: praça, canal, data
 * da visita e quem executa. A praça é o Sudeste porque é onde estão as duas
 * linhas de preço fora do corredor e a queda de sell-out de Losartana; o número
 * de pontos de venda é derivado da semente do mock.
 */
export const AGENDA_ROUTE = {
  id: 'roteiro-grande-sao-paulo-farma',
  label: 'Grande São Paulo — canal Farma',
  channel: 'Farma',
  region: 'Sudeste',
  uf: 'SP',
  generatedOn: HOJE as IsoDate,
  visitOn: daysFromNow(2),
  rep: personaNamed('João Pedro'),
  pointsOfSale: seeded(0, 14, 22),
} as const

function subsetOfRoute(index: number, min: number, max: number): number {
  const random = createRandom(MOCK_SEED + 91 + index)
  const fraction = min + random() * (max - min)
  return Math.max(1, Math.round(AGENDA_ROUTE.pointsOfSale * fraction))
}

const AGENDA_DRAFT: readonly AgendaItem[] = [
  {
    id: 'pauta-losartana',
    skuName: 'Losartana 50mg c/30',
    molecule: LOSARTANA_LINE.molecule,
    presentation: LOSARTANA_LINE.presentation,
    impactBrl: LOSARTANA_OPPORTUNITY.impactBrl,
    decisionId: LOSARTANA_OPPORTUNITY.decisionId,
    corridor: corridorStatus(LOSARTANA_LINE.relativePriceIndex),
    pointsOfSale: subsetOfRoute(0, 0.85, 1),
    estimatedMinutes: seeded(1, 8, 12),
    checks: [
      {
        id: 'losartana-preco',
        kind: 'shelf_price',
        instruction: 'Fotografar a etiqueta e anotar o preço praticado na gôndola.',
        referenceLabel: 'Preço de tabela apurado',
        referenceValue: LOSARTANA_LINE.ownPriceBrl,
        referenceFormat: 'price',
        attestation: LOSARTANA_LINE.attestation,
      },
      {
        id: 'losartana-concorrente',
        kind: 'competitor_price',
        instruction: 'Anotar o preço do genérico concorrente exposto ao lado.',
        referenceLabel: 'Preço médio do concorrente',
        referenceValue: LOSARTANA_LINE.competitorPriceBrl,
        referenceFormat: 'price',
        attestation: LOSARTANA_LINE.attestation,
      },
      {
        id: 'losartana-presenca',
        kind: 'presence',
        instruction: 'Confirmar exposição do SKU e contar as frentes ocupadas.',
        referenceLabel: 'Distribuição numérica apurada',
        referenceValue: NUMERIC_DISTRIBUTION.value,
        referenceFormat: 'percent',
        attestation: NUMERIC_DISTRIBUTION.attestation,
      },
    ],
    evidence: [
      fromDiagnostic(LOSARTANA_DIAGNOSTIC, false),
      fromOpportunity(LOSARTANA_OPPORTUNITY),
      fromCorridor(LOSARTANA_LINE),
    ],
    attestation: combine([
      LOSARTANA_LINE.attestation,
      LOSARTANA_OPPORTUNITY.attestation,
      NUMERIC_DISTRIBUTION.attestation,
    ]),
  },
  {
    id: 'pauta-dipirona',
    skuName: 'Dipirona 500mg c/20',
    molecule: DIPIRONA_LINE.molecule,
    presentation: DIPIRONA_LINE.presentation,
    impactBrl: DIPIRONA_OPPORTUNITY.impactBrl,
    decisionId: DIPIRONA_OPPORTUNITY.decisionId,
    corridor: corridorStatus(DIPIRONA_LINE.relativePriceIndex),
    pointsOfSale: subsetOfRoute(1, 0.6, 0.85),
    estimatedMinutes: seeded(2, 6, 10),
    checks: [
      {
        id: 'dipirona-concorrente',
        kind: 'competitor_price',
        instruction:
          'Anotar o preço do concorrente: confirmar se o corte praticado em MG já chegou à praça.',
        referenceLabel: 'Preço médio do concorrente',
        referenceValue: DIPIRONA_LINE.competitorPriceBrl,
        referenceFormat: 'price',
        attestation: DIPIRONA_LINE.attestation,
      },
      {
        id: 'dipirona-preco',
        kind: 'shelf_price',
        instruction: 'Anotar o preço praticado na gôndola e o desconto de bandeira, se houver.',
        referenceLabel: 'Preço de tabela apurado',
        referenceValue: DIPIRONA_LINE.ownPriceBrl,
        referenceFormat: 'price',
        attestation: DIPIRONA_LINE.attestation,
      },
    ],
    evidence: [
      fromDiagnostic(DIPIRONA_DIAGNOSTIC, false),
      fromOpportunity(DIPIRONA_OPPORTUNITY),
      fromCorridor(DIPIRONA_LINE),
    ],
    attestation: combine([DIPIRONA_LINE.attestation, DIPIRONA_OPPORTUNITY.attestation]),
  },
  {
    id: 'pauta-paracetamol',
    skuName: 'Paracetamol 750mg c/20',
    molecule: 'Paracetamol',
    presentation: '750mg c/20',
    impactBrl: STOCKOUT_OPPORTUNITY.impactBrl,
    decisionId: STOCKOUT_OPPORTUNITY.decisionId,
    corridor: null,
    pointsOfSale: subsetOfRoute(2, 0.5, 0.75),
    estimatedMinutes: seeded(3, 5, 8),
    checks: [
      {
        id: 'paracetamol-ruptura',
        kind: 'stockout',
        instruction: 'Registrar ausência do SKU na gôndola e conferir se há reposição no estoque.',
        referenceLabel: 'Ruptura estimada do período',
        referenceValue: STOCKOUT.value,
        referenceFormat: 'percent',
        attestation: STOCKOUT.attestation,
      },
      {
        id: 'paracetamol-presenca',
        kind: 'presence',
        instruction: 'Confirmar exposição do SKU e a validade do lote em gôndola.',
        referenceLabel: 'Distribuição numérica apurada',
        referenceValue: NUMERIC_DISTRIBUTION.value,
        referenceFormat: 'percent',
        attestation: NUMERIC_DISTRIBUTION.attestation,
      },
    ],
    evidence: [
      fromDiagnostic(STOCKOUT_DIAGNOSTIC, true),
      fromOpportunity(STOCKOUT_OPPORTUNITY),
      fromKpi(
        STOCKOUT,
        'Pauta replicada fora do Nordeste para separar padrão regional de padrão nacional',
      ),
    ],
    attestation: combine([
      STOCKOUT_DIAGNOSTIC.attestation,
      STOCKOUT_OPPORTUNITY.attestation,
      STOCKOUT.attestation,
    ]),
  },
]

/** A pauta é ordenada pelo impacto em R$ da oportunidade que gerou cada item. */
export const AGENDA_ITEMS: readonly AgendaItem[] = [...AGENDA_DRAFT].sort(
  (a, b) => b.impactBrl - a.impactBrl,
)

export const AGENDA_CHECK_COUNT = AGENDA_ITEMS.reduce(
  (total, item) => total + item.checks.length,
  0,
)

export const AGENDA_MINUTES = AGENDA_ITEMS.reduce(
  (total, item) => total + item.estimatedMinutes,
  0,
)

export const AGENDA_IMPACT_BRL = AGENDA_ITEMS.reduce((total, item) => total + item.impactBrl, 0)

export const AGENDA_EVIDENCE_COUNT = AGENDA_ITEMS.reduce(
  (total, item) => total + item.evidence.length,
  0,
)

export const AGENDA_ATTESTATION: Attestation = combine(AGENDA_ITEMS.map((item) => item.attestation))

export const AGENDA_ORIGIN_NOTE =
  'Nenhum item foi digitado: cada linha da pauta nasce de um diagnóstico, de uma oportunidade priorizada ou de uma linha de preço fora do corredor, e carrega a evidência que a colocou ali.'

// ---------------------------------------------------------------------------
// 2. Proposta comercial pré-preenchida
// ---------------------------------------------------------------------------

/**
 * NOTA: não consta do ESCOPO — a conta da proposta. Nome fictício da mesma
 * família já usada no mock de clientes, na praça do roteiro acima. Os pontos de
 * venda atendidos são derivados da semente.
 */
export const PROPOSAL_CLIENT = {
  id: 'rede-farma-sudeste',
  name: 'Rede Farma Sudeste',
  kind: 'Rede regional',
  region: AGENDA_ROUTE.region,
  uf: AGENDA_ROUTE.uf,
  pointsOfSale: seeded(4, 180, 260),
} as const

/** NOTA: não consta do ESCOPO — prazo de vigência proposto, em dias. */
const PROPOSAL_TERM_DAYS = 90

export const PROPOSAL_HEADER = {
  reference: 'PROP-RGM-2026-0001',
  title: 'Proposta comercial — condição de Losartana 50mg c/30',
  issuedOn: HOJE as IsoDate,
  validUntil: daysFromNow(PROPOSAL_TERM_DAYS),
  owner: personaNamed('Mariana Santos'),
  statusLabel: 'Rascunho gerado pela plataforma',
  decisionId: LOSARTANA_OPPORTUNITY.decisionId,
} as const

export type ProposalField = {
  readonly id: string
  readonly label: string
  /** `null` marca campo em branco: a plataforma não tem o dado. */
  readonly value: string | null
  /** De onde o valor veio. `null` nos campos em branco. */
  readonly origin: string | null
  readonly note: string | null
  readonly noteTone: SemanticTone | null
}

export type ProposalSection = {
  readonly id: string
  readonly title: string
  readonly fields: readonly ProposalField[]
  readonly attestation: Attestation
}

const filled = (
  id: string,
  label: string,
  value: string,
  origin: string,
  note: string | null = null,
  noteTone: SemanticTone | null = null,
): ProposalField => ({ id, label, value, origin, note, noteTone })

const blank = (id: string, label: string, note: string): ProposalField => ({
  id,
  label,
  value: null,
  origin: null,
  note,
  noteTone: null,
})

const CORRIDOR_RANGE = `${formatDecimal(PRICE_CORRIDOR.floor, 0)} a ${formatDecimal(PRICE_CORRIDOR.ceiling, 0)}`

export const CORRIDOR_TONE: Record<CorridorStatus, SemanticTone> = {
  below: 'attention',
  inside: 'positive',
  above: 'negative',
}

const CURRENT = BASELINE.canonical
const PROPOSED = RECOMMENDED.canonical

const CURRENT_CORRIDOR = corridorStatus(CURRENT.relativePriceIndex)
const PROPOSED_CORRIDOR = corridorStatus(PROPOSED.relativePriceIndex)

const price = (value: number) => `R$ ${formatDecimal(value, 2)}`

export const PROPOSAL_SECTIONS: readonly ProposalSection[] = [
  {
    id: 'identificacao',
    title: 'Identificação',
    attestation: CRM_SFA,
    fields: [
      filled(
        'cliente',
        'Cliente',
        PROPOSAL_CLIENT.name,
        `${PROPOSAL_CLIENT.kind} · ${PROPOSAL_CLIENT.uf}`,
      ),
      filled(
        'pdvs',
        'Pontos de venda atendidos',
        formatInteger(PROPOSAL_CLIENT.pointsOfSale),
        'Cadastro de clientes',
      ),
      filled('praca', 'Praça e canal', `${PROPOSAL_CLIENT.region} · ${AGENDA_ROUTE.channel}`, 'Cobertura da conta'),
      filled('sku', 'Item em negociação', 'Losartana 50mg c/30', 'Cockpit de preço e margem'),
      filled('emissao', 'Emitida em', formatDate(PROPOSAL_HEADER.issuedOn), 'Data de referência da plataforma'),
      filled('vigencia', 'Vigência proposta', `até ${formatDate(PROPOSAL_HEADER.validUntil)}`, `${PROPOSAL_TERM_DAYS} dias a partir da emissão`),
      filled('responsavel', 'Responsável comercial', PROPOSAL_HEADER.owner.name, PROPOSAL_HEADER.owner.area),
      blank('comprador', 'Comprador responsável na rede', 'A preencher na negociação'),
    ],
  },
  {
    id: 'condicao-atual',
    title: 'Condição atual',
    attestation: SCENARIO_ATTESTATION,
    fields: [
      filled('preco-atual', 'Preço de tabela', price(CURRENT.priceBrl), 'Parâmetros atuais do simulador'),
      filled('desconto-atual', 'Desconto vigente', formatPercent(CURRENT.discountRate * 100, 0), 'Parâmetros atuais do simulador'),
      filled('liquido-atual', 'Preço líquido', price(CURRENT.netPriceBrl), 'Preço de tabela menos desconto'),
      filled(
        'ipr-atual',
        'Preço relativo (IPR)',
        formatDecimal(CURRENT.relativePriceIndex, 1),
        `Corredor de ${CORRIDOR_RANGE}`,
        CORRIDOR_LABEL[CURRENT_CORRIDOR],
        CORRIDOR_TONE[CURRENT_CORRIDOR],
      ),
      filled('volume-atual', 'Volume do período', `${formatInteger(CURRENT.volume)} unid.`, 'Sell-out apurado'),
      filled('share-atual', 'Market share', formatPercent(CURRENT.sharePercent), 'Participação de mercado em valor'),
    ],
  },
  {
    id: 'condicao-proposta',
    title: 'Condição proposta',
    attestation: SCENARIO_ATTESTATION,
    fields: [
      filled('preco-proposto', 'Preço de tabela', price(PROPOSED.priceBrl), `${RECOMMENDED.label} do simulador`),
      filled('desconto-proposto', 'Desconto negociado', formatPercent(PROPOSED.discountRate * 100, 0), `${RECOMMENDED.label} do simulador`),
      filled('liquido-proposto', 'Preço líquido', price(PROPOSED.netPriceBrl), 'Preço de tabela menos desconto'),
      filled(
        'ipr-proposto',
        'Preço relativo (IPR)',
        formatDecimal(PROPOSED.relativePriceIndex, 1),
        `Corredor de ${CORRIDOR_RANGE}`,
        CORRIDOR_LABEL[PROPOSED_CORRIDOR],
        CORRIDOR_TONE[PROPOSED_CORRIDOR],
      ),
      filled('volume-proposto', 'Volume estimado', `${formatInteger(PROPOSED.volume)} unid.`, `${RECOMMENDED.label} do simulador`),
      filled('share-proposto', 'Market share estimado', formatPercent(PROPOSED.sharePercent), `${RECOMMENDED.label} do simulador`),
      blank('prazo', 'Prazo de pagamento', 'A preencher na negociação'),
      blank('verba', 'Verba de trade adicional', 'A preencher na negociação'),
    ],
  },
]

export type ImpactFormat = 'money' | 'integer' | 'points' | 'percent'

export type ProposalImpact = {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly format: ImpactFormat
  /** `true` quando o valor é impacto financeiro em R$ e pede marca de perímetro. */
  readonly financial: boolean
  readonly origin: string
  readonly attestation: Attestation
}

export const PROPOSAL_IMPACT: readonly ProposalImpact[] = [
  {
    id: 'receita',
    label: 'Receita líquida',
    value: RECOMMENDED_IMPACT.netRevenueBrl,
    format: 'money',
    financial: true,
    origin: `${RECOMMENDED.label} contra a condição atual`,
    attestation: SCENARIO_ATTESTATION,
  },
  {
    id: 'volume',
    label: 'Volume',
    value: RECOMMENDED_IMPACT.volume,
    format: 'integer',
    financial: false,
    origin: `${RECOMMENDED.label} contra a condição atual`,
    attestation: SCENARIO_ATTESTATION,
  },
  {
    id: 'share',
    label: 'Market share',
    value: RECOMMENDED_IMPACT.sharePoints,
    format: 'points',
    financial: false,
    origin: `${RECOMMENDED.label} contra a condição atual`,
    attestation: SCENARIO_ATTESTATION,
  },
  {
    id: 'roi',
    label: 'ROI promocional',
    value: PROPOSED.promoRoiPercent ?? 0,
    format: 'percent',
    financial: false,
    origin: 'Margem ganha sobre o preço de que se abriu mão',
    attestation: SCENARIO_ATTESTATION,
  },
]

export const PROPOSAL_IMPACT_ATTESTATION: Attestation = combine(
  PROPOSAL_IMPACT.map((impact) => impact.attestation),
)

/** NOTA: não consta do ESCOPO — frentes adicionais de gôndola pedidas em troca. */
const EXTRA_FACINGS = 2

export type Counterpart = {
  readonly id: string
  readonly label: string
  readonly target: string
  readonly origin: string
  readonly attestation: Attestation
}

export const PROPOSAL_COUNTERPARTS: readonly Counterpart[] = [
  {
    id: 'volume',
    label: 'Volume comprometido no ciclo',
    target: `+${formatInteger(RECOMMENDED_IMPACT.volume)} unid.`,
    origin: `Ganho de volume do ${RECOMMENDED.label}`,
    attestation: SCENARIO_ATTESTATION,
  },
  {
    id: 'corredor',
    label: 'Preço de gôndola dentro do corredor',
    target: `IPR de ${CORRIDOR_RANGE}`,
    origin: 'Corredor de preço do cockpit de preço e margem',
    attestation: LOSARTANA_LINE.attestation,
  },
  {
    id: 'distribuicao',
    label: 'Distribuição numérica do item na rede',
    target: `mínimo ${formatPercent(NUMERIC_DISTRIBUTION.value)}`,
    origin: 'Patamar apurado no período',
    attestation: NUMERIC_DISTRIBUTION.attestation,
  },
  {
    id: 'ruptura',
    label: 'Ruptura na ponta',
    target: `máximo ${formatPercent(STOCKOUT.value)}`,
    origin: 'Ruptura estimada do período',
    attestation: STOCKOUT.attestation,
  },
  {
    id: 'gondola',
    label: 'Espaço em gôndola',
    target: `+${formatInteger(EXTRA_FACINGS)} frentes`,
    origin: 'Contrapartida de execução, a validar com a rede',
    attestation: combine([SCANNTECH, NEOGRID]),
  },
]

export const PROPOSAL_FIELDS: readonly ProposalField[] = PROPOSAL_SECTIONS.flatMap(
  (section) => section.fields,
)

export const PROPOSAL_FILLED_COUNT = PROPOSAL_FIELDS.filter((field) => field.value !== null).length

export const PROPOSAL_BLANK_COUNT = PROPOSAL_FIELDS.length - PROPOSAL_FILLED_COUNT

export const PROPOSAL_ATTESTATION: Attestation = combine([
  ...PROPOSAL_SECTIONS.map((section) => section.attestation),
  ...PROPOSAL_COUNTERPARTS.map((counterpart) => counterpart.attestation),
])

export const PROPOSAL_ORIGIN_NOTE =
  'Os campos preenchidos vêm do cadastro do cliente, do cockpit de preço e do cenário recomendado no simulador. O que a plataforma não sabe fica em branco e é assumido na negociação — nada é estimado para completar o documento.'
