import { combine, type Attestation } from '../domain/attestation'
import { daysAgo, type IsoDate } from '../domain/today'
import { IQVIA, NEOGRID_DISTRIBUIDORES, SAP, SCANNTECH } from './sources'

/**
 * Gross-to-Net e Price Waterfall (RGM, módulo 3.5).
 *
 * A entrevista de RGM apontou cerca de **R$ 400 milhões de desconto comercial
 * sem visibilidade**. Esta tela é a resposta direta a isso: abre a distância
 * entre o preço de lista e a receita líquida em cada degrau, e separa o que é
 * condição negociada do que é vazamento.
 *
 * A régua de leitura: um degrau grande não é problema em si — desconto é
 * ferramenta. Problema é degrau que ninguém consegue explicar, que está fora de
 * política ou que não devolve retorno. É isso que o painel de vazamento isola.
 */

/** Desconto comercial sob o perímetro, apontado na entrevista de RGM. */
export const COMMERCIAL_DISCOUNT_BRL = 400_000_000

/**
 * NOTA: não consta do ESCOPO — os demais degraus do gross-to-net.
 *
 * Só o degrau de desconto comercial (R$ 400M) vem da entrevista. Receita bruta
 * e os outros cinco degraus são declarados para que a cascata feche, e devem
 * ser substituídos pelos valores reais do perímetro quando ele for validado.
 */
export const GROSS_REVENUE_BRL = 2_480_000_000

export type WaterfallLeg = {
  readonly id: string
  readonly label: string
  /** Negativo em toda dedução; a receita bruta e a líquida são marcos. */
  readonly amountBrl: number
  readonly kind: 'anchor' | 'deduction' | 'total'
  readonly description: string
  readonly attestation: Attestation
}

const COMMERCIAL = combine([SAP, SCANNTECH])
const LOGISTICS = combine([SAP, NEOGRID_DISTRIBUIDORES])
const TRADE = combine([SAP, IQVIA])

const DEDUCTIONS: readonly Omit<WaterfallLeg, 'kind'>[] = [
  {
    id: 'discounts',
    label: 'Descontos',
    amountBrl: -COMMERCIAL_DISCOUNT_BRL,
    description: 'Desconto comercial concedido em pedido, por cliente e canal.',
    attestation: COMMERCIAL,
  },
  {
    id: 'free-goods',
    label: 'Bonificações',
    amountBrl: -118_000_000,
    description: 'Produto entregue sem cobrança, convertido a preço de lista.',
    attestation: COMMERCIAL,
  },
  {
    id: 'trade-funds',
    label: 'Verbas',
    amountBrl: -96_000_000,
    description: 'Verba de trade contratada com contrapartida de execução.',
    attestation: TRADE,
  },
  {
    id: 'rebates',
    label: 'Rebates',
    amountBrl: -72_000_000,
    description: 'Devolução por atingimento de meta, apurada no fechamento.',
    attestation: TRADE,
  },
  {
    id: 'returns',
    label: 'Devoluções',
    amountBrl: -41_000_000,
    description: 'Retorno de mercadoria por avaria, validade ou acordo.',
    attestation: LOGISTICS,
  },
  {
    id: 'logistics',
    label: 'Logística',
    amountBrl: -63_000_000,
    description: 'Frete, armazenagem e custo de entrega absorvidos na condição.',
    attestation: LOGISTICS,
  },
]

export const TOTAL_DEDUCTIONS_BRL = DEDUCTIONS.reduce((sum, leg) => sum + leg.amountBrl, 0)

export const NET_REVENUE_BRL = GROSS_REVENUE_BRL + TOTAL_DEDUCTIONS_BRL

export const GROSS_TO_NET: readonly WaterfallLeg[] = [
  {
    id: 'gross',
    label: 'Preço de lista',
    amountBrl: GROSS_REVENUE_BRL,
    kind: 'anchor',
    description: 'Receita bruta a preço de tabela, antes de qualquer condição.',
    attestation: SAP,
  },
  ...DEDUCTIONS.map((leg) => ({ ...leg, kind: 'deduction' as const })),
  {
    id: 'net',
    label: 'Receita líquida',
    amountBrl: NET_REVENUE_BRL,
    kind: 'total',
    description: 'O que sobra depois de todas as condições comerciais.',
    attestation: combine([SAP, SCANNTECH, IQVIA, NEOGRID_DISTRIBUIDORES]),
  },
]

/** Quanto da receita bruta se perde no caminho, em pontos percentuais. */
export const DEDUCTION_RATE_PERCENT =
  Math.round((Math.abs(TOTAL_DEDUCTIONS_BRL) / GROSS_REVENUE_BRL) * 100 * 10) / 10

export type LeakageSeverity = 'out_of_policy' | 'low_return' | 'review'

export const LEAKAGE_LABEL: Record<LeakageSeverity, string> = {
  out_of_policy: 'Fora de política',
  low_return: 'Baixo retorno',
  review: 'Em revisão',
}

export type Leakage = {
  readonly id: string
  readonly title: string
  readonly severity: LeakageSeverity
  /** Degrau do gross-to-net em que o vazamento ocorre. */
  readonly legId: string
  readonly amountBrl: number
  readonly accounts: number
  readonly evidence: string
  readonly detectedOn: IsoDate
  readonly attestation: Attestation
}

/**
 * NOTA: não consta do ESCOPO — as condições apontadas como vazamento e seus
 * valores. A regra de leitura é do ESCOPO (fora de política ou de baixo
 * retorno); os casos abaixo instanciam essa regra.
 */
export const LEAKAGES: readonly Leakage[] = [
  {
    id: 'discount-above-authority',
    title: 'Desconto acima da alçada aprovada',
    severity: 'out_of_policy',
    legId: 'discounts',
    amountBrl: 47_300_000,
    accounts: 38,
    evidence: 'Condição praticada acima do teto da alçada do aprovador registrado no pedido.',
    detectedOn: daysAgo(4),
    attestation: COMMERCIAL,
  },
  {
    id: 'funds-without-proof',
    title: 'Verba sem contrapartida comprovada',
    severity: 'out_of_policy',
    legId: 'trade-funds',
    amountBrl: 28_900_000,
    accounts: 21,
    evidence: 'Verba liquidada sem evidência de execução no ponto de venda no período contratado.',
    detectedOn: daysAgo(6),
    attestation: TRADE,
  },
  {
    id: 'rebate-negative-roi',
    title: 'Rebate com retorno abaixo do custo',
    severity: 'low_return',
    legId: 'rebates',
    amountBrl: 19_400_000,
    accounts: 14,
    evidence: 'Meta atingida sem crescimento de sell-out acima da média do canal.',
    detectedOn: daysAgo(9),
    attestation: TRADE,
  },
  {
    id: 'free-goods-overlap',
    title: 'Bonificação sobreposta a desconto na mesma nota',
    severity: 'out_of_policy',
    legId: 'free-goods',
    amountBrl: 15_100_000,
    accounts: 27,
    evidence: 'Bonificação concedida em pedido que já recebia desconto comercial cheio.',
    detectedOn: daysAgo(11),
    attestation: COMMERCIAL,
  },
  {
    id: 'logistics-absorbed',
    title: 'Frete absorvido fora da política de canal',
    severity: 'review',
    legId: 'logistics',
    amountBrl: 8_600_000,
    accounts: 52,
    evidence: 'Entrega abaixo do pedido mínimo com frete absorvido pela indústria.',
    detectedOn: daysAgo(3),
    attestation: LOGISTICS,
  },
]

export const TOTAL_LEAKAGE_BRL = LEAKAGES.reduce((sum, leakage) => sum + leakage.amountBrl, 0)

export const LEAKAGE_SHARE_OF_DEDUCTIONS_PERCENT =
  Math.round((TOTAL_LEAKAGE_BRL / Math.abs(TOTAL_DEDUCTIONS_BRL)) * 100 * 10) / 10

export type GrossToNetCut = 'product' | 'customer' | 'channel'

export const CUT_LABEL: Record<GrossToNetCut, string> = {
  product: 'Produto',
  customer: 'Cliente',
  channel: 'Canal',
}

export type CutRow = {
  readonly id: string
  readonly label: string
  readonly grossBrl: number
  readonly netBrl: number
  readonly leakageBrl: number
}

type CutSpec = {
  readonly label: string
  /** Fatia da receita bruta. */
  readonly weight: number
  /**
   * Quanto a conversão desta linha se afasta da média. Acima de 1 converte
   * melhor que a média; abaixo, pior. É o que faz a tabela responder à
   * pergunta que ela abre — onde a conversão de bruto para líquido se perde.
   */
  readonly conversionFactor: number
}

/**
 * NOTA: não consta do ESCOPO — a abertura por produto, cliente e canal.
 *
 * As linhas somam exatamente a receita bruta, a líquida e o vazamento da
 * cascata, para que trocar de corte nunca mude o total. A conversão varia por
 * linha: o atacado converte pior que a farmácia independente porque concentra
 * desconto e verba, e é isso que o corte precisa mostrar. O vazamento acompanha
 * o inverso da conversão — quem converte pior vaza mais.
 */
function buildCut(specs: readonly CutSpec[], prefix: string): CutRow[] {
  const totalWeight = specs.reduce((sum, spec) => sum + spec.weight, 0)
  const netMass = specs.reduce((sum, spec) => sum + spec.weight * spec.conversionFactor, 0)
  const leakMass = specs.reduce((sum, spec) => sum + spec.weight / spec.conversionFactor, 0)

  let grossLeft = GROSS_REVENUE_BRL
  let netLeft = NET_REVENUE_BRL
  let leakLeft = TOTAL_LEAKAGE_BRL

  return specs.map((spec, index) => {
    const last = index === specs.length - 1
    const grossBrl = last ? grossLeft : Math.round(GROSS_REVENUE_BRL * (spec.weight / totalWeight))
    const netBrl = last
      ? netLeft
      : Math.round(NET_REVENUE_BRL * ((spec.weight * spec.conversionFactor) / netMass))
    const leakageBrl = last
      ? leakLeft
      : Math.round(TOTAL_LEAKAGE_BRL * (spec.weight / spec.conversionFactor / leakMass))

    grossLeft -= grossBrl
    netLeft -= netBrl
    leakLeft -= leakageBrl
    return { id: `${prefix}-${index}`, label: spec.label, grossBrl, netBrl, leakageBrl }
  })
}

export const CUTS: Record<GrossToNetCut, readonly CutRow[]> = {
  product: buildCut(
    [
      { label: 'Losartana 50mg c/30', weight: 0.28, conversionFactor: 1.09 },
      { label: 'Dipirona 500mg c/20', weight: 0.24, conversionFactor: 0.93 },
      { label: 'Paracetamol 750mg c/20', weight: 0.18, conversionFactor: 1.02 },
      { label: 'Demais SKUs', weight: 0.3, conversionFactor: 0.97 },
    ],
    'product',
  ),
  customer: buildCut(
    [
      { label: 'Rede Farma Sul', weight: 0.22, conversionFactor: 1.05 },
      { label: 'Distribuidor Centro-Oeste', weight: 0.31, conversionFactor: 0.86 },
      { label: 'Rede Nordeste Saúde', weight: 0.17, conversionFactor: 1.12 },
      { label: 'Demais clientes', weight: 0.3, conversionFactor: 1.03 },
    ],
    'customer',
  ),
  channel: buildCut(
    [
      { label: 'Farmácias independentes', weight: 0.19, conversionFactor: 1.16 },
      { label: 'Redes regionais', weight: 0.26, conversionFactor: 1.04 },
      { label: 'Grandes redes', weight: 0.29, conversionFactor: 0.9 },
      { label: 'Atacado e distribuidores', weight: 0.26, conversionFactor: 0.84 },
    ],
    'channel',
  ),
}

export const GROSS_TO_NET_ATTESTATION = combine(GROSS_TO_NET.map((leg) => leg.attestation))
