import type { ProductId } from '../design/tokens'
import { combine, type Attestation, type Confidence } from '../domain/attestation'
import { IQVIA, NEOGRID, NEOGRID_DISTRIBUIDORES, SCANNTECH } from './sources'

/**
 * Diagnóstico de causa-raiz (módulo 1.9 do ESCOPO).
 *
 * Caso pré-carregado: a queda de 12% no sell-out de Losartana em SP. A variação
 * é decomposta em sete fatores; cada fator tem um dono, e é esse dono que
 * recebe o encaminhamento quando a decisão é tomada.
 */

export type RootCauseFactor = {
  readonly id: string
  readonly label: string
  /** Produto que executa a correção. `null` quando o fator é externo. */
  readonly owner: ProductId | null
  /** Contribuição em pontos percentuais. `null` até a seção 10 do ESCOPO. */
  readonly contributionPp: number | null
  /** Contribuição em reais. `null` até a seção 10 do ESCOPO. */
  readonly contributionBrl: number | null
  readonly attestation: Attestation
}

export const ROOT_CAUSE_CASE = {
  title: 'Queda de 12% no sell-out de Losartana em SP',
  subject: 'Losartana 50mg c/30',
  region: 'SP',
  /** Variação total observada, em pontos percentuais. */
  totalPp: -12,
  decisionId: 'D-2026-0001',
  opportunityBrl: 4_800_000,
  confidence: 'medium' as Confidence,
}

export const ROOT_CAUSE_FACTORS: readonly RootCauseFactor[] = [
  {
    id: 'price',
    label: 'Preço',
    owner: 'rgm',
    contributionPp: null,
    contributionBrl: null,
    attestation: combine([SCANNTECH, IQVIA]),
  },
  {
    id: 'stockout',
    label: 'Ruptura',
    owner: 'gtm',
    contributionPp: null,
    contributionBrl: null,
    attestation: NEOGRID_DISTRIBUIDORES,
  },
  {
    id: 'distribution',
    label: 'Distribuição',
    owner: 'gtm',
    contributionPp: null,
    contributionBrl: null,
    attestation: NEOGRID,
  },
  {
    id: 'prescription',
    label: 'Prescrição',
    owner: 'ag',
    contributionPp: null,
    contributionBrl: null,
    attestation: IQVIA,
  },
  {
    id: 'execution',
    label: 'Execução',
    owner: 'gtm',
    contributionPp: null,
    contributionBrl: null,
    attestation: NEOGRID,
  },
  {
    id: 'mix',
    label: 'Mix',
    owner: 'rgm',
    contributionPp: null,
    contributionBrl: null,
    attestation: SCANNTECH,
  },
  {
    id: 'competitor',
    label: 'Movimento do concorrente',
    owner: null,
    contributionPp: null,
    contributionBrl: null,
    attestation: combine([SCANNTECH, IQVIA]),
  },
]

/** Procedência do diagnóstico inteiro: o elo mais fraco entre os sete fatores. */
export const ROOT_CAUSE_ATTESTATION: Attestation = combine(
  ROOT_CAUSE_FACTORS.map((factor) => factor.attestation),
)

/** `true` quando a decomposição já pode ser plotada. */
export const HAS_DECOMPOSITION = ROOT_CAUSE_FACTORS.every(
  (factor) => factor.contributionPp !== null,
)

export type WaterfallStep = {
  readonly label: string
  readonly value: number
  /** Base da barra flutuante. */
  readonly start: number
  readonly end: number
  readonly isTotal: boolean
}

/**
 * Converte contribuições em barras flutuantes acumuladas, fechando com a barra
 * de total. A última barra parte de zero: é o resultado, não mais um passo.
 */
export function buildWaterfallSteps(
  contributions: readonly { label: string; value: number }[],
  totalLabel: string,
): WaterfallStep[] {
  let cursor = 0
  const steps = contributions.map(({ label, value }) => {
    const start = cursor
    cursor += value
    return { label, value, start, end: cursor, isTotal: false }
  })

  return [...steps, { label: totalLabel, value: cursor, start: 0, end: cursor, isTotal: true }]
}

/**
 * Narrativa executiva. Escrita sobre as evidências canônicas do HUB — a queda
 * observada, a causa provável já registrada no diagnóstico rápido e a
 * oportunidade dimensionada em D-2026-0001.
 */
export const ROOT_CAUSE_NARRATIVE: readonly string[] = [
  'O sell-out de Losartana 50mg c/30 em São Paulo caiu 12% contra o período anterior. A leitura registrada no diagnóstico rápido aponta preço e distribuição como causa provável — os dois fatores aparecem juntos, e não isoladamente, o que afasta a hipótese de sazonalidade.',
  'Do lado do preço, o movimento do concorrente sobre Dipirona em Minas Gerais mostra que a categoria está sob pressão competitiva ativa, com perda estimada de 1,3 pp de share naquele recorte. Do lado da disponibilidade, a ruptura acima de 10% em três estados do Nordeste indica que a malha de abastecimento já opera no limite em outras praças.',
  'A recuperação de distribuição em São Paulo está dimensionada em R$ 4,8M na decisão D-2026-0001, o maior impacto isolado da carteira de oportunidades do período. O encaminhamento abaixo divide a execução entre os times responsáveis por cada fator, mantendo a rastreabilidade na mesma decisão.',
]

export type ForwardTarget = {
  readonly product: ProductId
  readonly label: string
  readonly reason: string
}

/** Encaminhamentos disponíveis, um por área responsável. */
export const FORWARD_TARGETS: readonly ForwardTarget[] = [
  { product: 'rgm', label: 'Encaminhar para RGM', reason: 'Preço' },
  { product: 'gtm', label: 'Encaminhar para GTM', reason: 'Execução e distribuição' },
  { product: 'ag', label: 'Encaminhar para Amostra Grátis', reason: 'Prescrição' },
]
