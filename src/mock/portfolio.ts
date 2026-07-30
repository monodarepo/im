import { combine, type Attestation } from '../domain/attestation'
import { MARKET } from '../domain/elasticity'
import { formatPercent } from '../domain/format'
import { findDecision } from './decisions'
import { findSku } from './products'
import { createRandom, MOCK_SEED } from './random'
import { IQVIA, NEOGRID_DISTRIBUIDORES, SAP, SCANNTECH } from './sources'

/**
 * Arquitetura de portfólio (RGM, módulo 3.6).
 *
 * Duas perguntas em uma tela. A primeira é de papel: cada SKU existe para fazer
 * uma coisa — ancorar volume, defender preço, abrir a porta, sustentar prêmio ou
 * apenas ocupar a cauda — e o papel é tipo fechado, não rótulo livre, porque é
 * ele que decide o que pode ser feito com o preço da linha. A segunda é de
 * sobreposição: quando duas apresentações disputam o mesmo consumidor, crescer
 * uma custa a outra, e o ganho aparente do portfólio é menor do que a soma das
 * partes.
 *
 * NOTA: não consta do ESCOPO — papéis, métricas por SKU fora de Losartana 50mg
 * e toda a matriz de canibalização. O canônico usado como âncora é a linha de
 * Losartana 50mg c/30 (preço R$ 12,90, margem de contribuição 45,5%, volume
 * 1.250.000, da seção 10.3) e os ids e nomes dos três SKUs já declarados em
 * `products.ts`. Os três SKUs adicionais entram marcados como declarados e
 * carregam atestado mais fraco que os canônicos.
 */

export type PortfolioRole = 'volume-anchor' | 'price-defense' | 'entry' | 'premium' | 'tail'

export const ROLE_ORDER: readonly PortfolioRole[] = [
  'volume-anchor',
  'price-defense',
  'entry',
  'premium',
  'tail',
]

export const ROLE_LABEL: Record<PortfolioRole, string> = {
  'volume-anchor': 'Âncora de volume',
  'price-defense': 'Defesa de preço',
  entry: 'Entrada',
  premium: 'Premium',
  tail: 'Cauda',
}

export const ROLE_DESCRIPTION: Record<PortfolioRole, string> = {
  'volume-anchor': 'Sustenta giro e presença. Preço não se mexe sem revisar o portfólio inteiro.',
  'price-defense': 'Segura o preço da linha contra o genérico concorrente. Margem cede, share não.',
  entry: 'Abre a porta do consumidor com o menor tíquete. Serve de degrau, não de destino.',
  premium: 'Sustenta prêmio de preço e margem. Volume menor, contribuição por unidade maior.',
  tail: 'Baixo giro e alta complexidade. Candidato natural a racionalização.',
}

type SkuSeed = {
  readonly id: string
  /** Só para SKU que não existe em `products.ts`. */
  readonly declaredName?: string
  readonly shortName: string
  readonly moleculeId: string
  readonly classId: string
  readonly therapeuticClass: string
  readonly role: PortfolioRole
  readonly priceBrl: number
  readonly contributionMarginRate: number
  readonly volume: number
  readonly volumeDeltaPercent: number
}

const SKU_SEEDS: readonly SkuSeed[] = [
  {
    id: 'losartana-50-30',
    shortName: 'Los 50',
    moleculeId: 'losartana',
    classId: 'antihypertensive',
    therapeuticClass: 'Anti-hipertensivo',
    role: 'volume-anchor',
    priceBrl: MARKET.basePriceBrl,
    contributionMarginRate: MARKET.contributionMarginRate,
    volume: MARKET.baseVolume,
    volumeDeltaPercent: 2.4,
  },
  {
    id: 'dipirona-500-20',
    shortName: 'Dip 500',
    moleculeId: 'dipirona',
    classId: 'analgesic',
    therapeuticClass: 'Analgésico',
    role: 'price-defense',
    priceBrl: 9.8,
    contributionMarginRate: 0.382,
    volume: 980_000,
    volumeDeltaPercent: 1.1,
  },
  {
    id: 'paracetamol-750-20',
    shortName: 'Par 750',
    moleculeId: 'paracetamol',
    classId: 'analgesic',
    therapeuticClass: 'Analgésico',
    role: 'entry',
    priceBrl: 10.7,
    contributionMarginRate: 0.336,
    volume: 640_000,
    volumeDeltaPercent: -0.9,
  },
  {
    id: 'losartana-100-30',
    declaredName: 'Losartana 100mg c/30',
    shortName: 'Los 100',
    moleculeId: 'losartana',
    classId: 'antihypertensive',
    therapeuticClass: 'Anti-hipertensivo',
    role: 'premium',
    priceBrl: 18.2,
    contributionMarginRate: 0.478,
    volume: 410_000,
    volumeDeltaPercent: 6.8,
  },
  {
    id: 'ibuprofeno-600-20',
    declaredName: 'Ibuprofeno 600mg c/20',
    shortName: 'Ibu 600',
    moleculeId: 'ibuprofeno',
    classId: 'analgesic',
    therapeuticClass: 'Analgésico',
    role: 'price-defense',
    priceBrl: 16.4,
    contributionMarginRate: 0.521,
    volume: 295_000,
    volumeDeltaPercent: 4.2,
  },
  {
    id: 'dipirona-1000-10',
    declaredName: 'Dipirona 1g c/10',
    shortName: 'Dip 1g',
    moleculeId: 'dipirona',
    classId: 'analgesic',
    therapeuticClass: 'Analgésico',
    role: 'tail',
    priceBrl: 11.6,
    contributionMarginRate: 0.294,
    volume: 88_000,
    volumeDeltaPercent: -7.5,
  },
]

/** SKU canônico: preço e volume auditáveis em SAP e Scanntech. */
const CANONICAL_ATTESTATION = combine([SCANNTECH, SAP])

/** SKU declarado: a linha existe no mock, o número ainda é estimativa. */
const DECLARED_ATTESTATION = combine([SCANNTECH, NEOGRID_DISTRIBUIDORES, SAP])

/** Sobreposição é sempre modelada, nunca observada: herda o elo mais fraco. */
export const CANNIBALIZATION_ATTESTATION = combine([SCANNTECH, IQVIA, NEOGRID_DISTRIBUIDORES])

export type PortfolioSku = {
  readonly id: string
  readonly name: string
  readonly shortName: string
  readonly moleculeId: string
  readonly classId: string
  readonly therapeuticClass: string
  readonly role: PortfolioRole
  readonly priceBrl: number
  readonly contributionMarginRate: number
  readonly volume: number
  readonly volumeDeltaPercent: number
  readonly selloutBrl: number
  readonly contributionBrl: number
  /** Participação no sell-out do perímetro coberto por esta tela. */
  readonly portfolioSharePercent: number
  /** `true` quando o SKU não está declarado em `products.ts`. */
  readonly declared: boolean
  readonly attestation: Attestation
}

const SELLOUT_BY_SEED = SKU_SEEDS.map((seed) => Math.round(seed.volume * seed.priceBrl))

const PERIMETER_SELLOUT_BRL = SELLOUT_BY_SEED.reduce((sum, value) => sum + value, 0)

export const PORTFOLIO_SKUS: readonly PortfolioSku[] = SKU_SEEDS.map((seed, index) => {
  const catalogued = findSku(seed.id)
  const selloutBrl = SELLOUT_BY_SEED[index] ?? 0

  return {
    id: seed.id,
    name: catalogued?.name ?? seed.declaredName ?? seed.id,
    shortName: seed.shortName,
    moleculeId: seed.moleculeId,
    classId: seed.classId,
    therapeuticClass: seed.therapeuticClass,
    role: seed.role,
    priceBrl: seed.priceBrl,
    contributionMarginRate: seed.contributionMarginRate,
    volume: seed.volume,
    volumeDeltaPercent: seed.volumeDeltaPercent,
    selloutBrl,
    contributionBrl: Math.round(selloutBrl * seed.contributionMarginRate),
    portfolioSharePercent: Math.round((selloutBrl / PERIMETER_SELLOUT_BRL) * 1000) / 10,
    declared: catalogued === undefined,
    attestation: catalogued === undefined ? DECLARED_ATTESTATION : CANONICAL_ATTESTATION,
  }
})

/** Sell-out do perímetro desta tela — não é o sell-out total do mercado. */
export const PORTFOLIO_SELLOUT_BRL = PERIMETER_SELLOUT_BRL

export const PORTFOLIO_CONTRIBUTION_BRL = PORTFOLIO_SKUS.reduce(
  (sum, sku) => sum + sku.contributionBrl,
  0,
)

/** Margem de contribuição média ponderada pelo sell-out, em fração. */
export const PORTFOLIO_MARGIN_RATE = PORTFOLIO_CONTRIBUTION_BRL / PORTFOLIO_SELLOUT_BRL

export const PORTFOLIO_ATTESTATION = combine(PORTFOLIO_SKUS.map((sku) => sku.attestation))

export type RoleSummary = {
  readonly role: PortfolioRole
  readonly skuCount: number
  readonly selloutBrl: number
  readonly sharePercent: number
  readonly marginRate: number
}

export const ROLE_SUMMARY: readonly RoleSummary[] = ROLE_ORDER.map((role) => {
  const members = PORTFOLIO_SKUS.filter((sku) => sku.role === role)
  const selloutBrl = members.reduce((sum, sku) => sum + sku.selloutBrl, 0)
  const contributionBrl = members.reduce((sum, sku) => sum + sku.contributionBrl, 0)

  return {
    role,
    skuCount: members.length,
    selloutBrl,
    sharePercent: Math.round((selloutBrl / PORTFOLIO_SELLOUT_BRL) * 1000) / 10,
    marginRate: selloutBrl === 0 ? 0 : contributionBrl / selloutBrl,
  }
})

/**
 * NOTA: não consta do ESCOPO — limiares de canibalização.
 * Abaixo de `watch` a sobreposição é ruído de categoria; acima de `critical` a
 * dupla deixa de ser portfólio e vira concorrência interna.
 */
export const CANNIBALIZATION_THRESHOLD = { watch: 5, critical: 10 } as const

export type CannibalizationLevel = 'low' | 'watch' | 'critical'

export const CANNIBALIZATION_LEVEL_LABEL: Record<CannibalizationLevel, string> = {
  low: 'Sobreposição baixa',
  watch: 'Sobreposição em observação',
  critical: 'Canibalização crítica',
}

export function cannibalizationLevel(percent: number): CannibalizationLevel {
  if (percent >= CANNIBALIZATION_THRESHOLD.critical) return 'critical'
  if (percent >= CANNIBALIZATION_THRESHOLD.watch) return 'watch'
  return 'low'
}

/**
 * Faixas de sobreposição por proximidade. Mesma molécula em apresentações
 * diferentes disputa o mesmo consumidor de frente; mesma classe disputa de
 * lado; classes distintas quase não se tocam.
 */
type Band = { readonly min: number; readonly max: number }

const SAME_MOLECULE_BAND: Band = { min: 8, max: 16 }
const SAME_CLASS_BAND: Band = { min: 3, max: 9 }
const CROSS_CLASS_BAND: Band = { min: 0.2, max: 2.4 }

function bandFor(captor: PortfolioSku, prey: PortfolioSku): Band {
  if (captor.moleculeId === prey.moleculeId) return SAME_MOLECULE_BAND
  if (captor.classId === prey.classId) return SAME_CLASS_BAND
  return CROSS_CLASS_BAND
}

export type CannibalizationCell = {
  readonly id: string
  /** SKU que captura volume. */
  readonly captorId: string
  readonly captorName: string
  readonly captorShortName: string
  /** SKU que perde volume. */
  readonly preyId: string
  readonly preyName: string
  readonly preyShortName: string
  /** Percentual do volume do canibalizado absorvido pelo captor. */
  readonly percent: number
  readonly level: CannibalizationLevel
  /** Sell-out do canibalizado que a sobreposição coloca em disputa. */
  readonly overlapBrl: number
}

const CANNIBALIZATION_SEED_OFFSET = 41

const cannibalizationRandom = createRandom(MOCK_SEED + CANNIBALIZATION_SEED_OFFSET)

export const CANNIBALIZATION: readonly CannibalizationCell[] = PORTFOLIO_SKUS.flatMap((captor) =>
  PORTFOLIO_SKUS.filter((prey) => prey.id !== captor.id).map((prey) => {
    const band = bandFor(captor, prey)
    const percent = Math.round((band.min + cannibalizationRandom() * (band.max - band.min)) * 10) / 10

    return {
      id: `${captor.id}>${prey.id}`,
      captorId: captor.id,
      captorName: captor.name,
      captorShortName: captor.shortName,
      preyId: prey.id,
      preyName: prey.name,
      preyShortName: prey.shortName,
      percent,
      level: cannibalizationLevel(percent),
      overlapBrl: Math.round((prey.selloutBrl * percent) / 100),
    }
  }),
)

const CELL_BY_PAIR = new Map(CANNIBALIZATION.map((cell) => [cell.id, cell]))

/** Célula da matriz: quanto `captorId` tira de `preyId`. `null` na diagonal. */
export function cannibalizationBetween(
  captorId: string,
  preyId: string,
): CannibalizationCell | null {
  return CELL_BY_PAIR.get(`${captorId}>${preyId}`) ?? null
}

export const MAX_CANNIBALIZATION_PERCENT = CANNIBALIZATION.reduce(
  (max, cell) => Math.max(max, cell.percent),
  0,
)

export type PortfolioPressure = {
  readonly skuId: string
  readonly skuName: string
  /** Soma do que os demais SKUs tiram deste. */
  readonly pressurePercent: number
  readonly pressureBrl: number
  readonly level: CannibalizationLevel
}

export const PORTFOLIO_PRESSURE: readonly PortfolioPressure[] = PORTFOLIO_SKUS.map((sku) => {
  const incoming = CANNIBALIZATION.filter((cell) => cell.preyId === sku.id)
  const pressurePercent =
    Math.round(incoming.reduce((sum, cell) => sum + cell.percent, 0) * 10) / 10

  return {
    skuId: sku.id,
    skuName: sku.name,
    pressurePercent,
    pressureBrl: incoming.reduce((sum, cell) => sum + cell.overlapBrl, 0),
    level: cannibalizationLevel(incoming.length === 0 ? 0 : pressurePercent / incoming.length),
  }
})

const PRESSURE_BY_SKU = new Map(PORTFOLIO_PRESSURE.map((item) => [item.skuId, item]))

export function pressureOf(skuId: string): PortfolioPressure | null {
  return PRESSURE_BY_SKU.get(skuId) ?? null
}

/** Sell-out do perímetro que duas apresentações próprias disputam entre si. */
export const TOTAL_OVERLAP_BRL = CANNIBALIZATION.reduce((sum, cell) => sum + cell.overlapBrl, 0)

export const CRITICAL_PAIR_COUNT = CANNIBALIZATION.filter(
  (cell) => cell.level === 'critical',
).length

/** Pares ordenados pelo sell-out em disputa, do maior para o menor. */
export const CRITICAL_PAIRS: readonly CannibalizationCell[] = [...CANNIBALIZATION]
  .sort((a, b) => b.overlapBrl - a.overlapBrl)
  .slice(0, 6)

/**
 * Decisão em que a recomendação de portfólio se anexa, por molécula do SKU
 * canibalizado. Nenhuma recomendação anda solta: ou referencia uma decisão
 * existente, ou não vai para a tela.
 */
const MOLECULE_DECISION: Record<string, string> = {
  losartana: 'D-2026-0001',
  dipirona: 'D-2026-0002',
  paracetamol: 'D-2026-0005',
}

export type PortfolioRecommendation = {
  readonly pairId: string
  readonly decisionId: string | null
  readonly decisionTitle: string | null
  readonly headline: string
  readonly rationale: string
  readonly attestation: Attestation
}

function buildRecommendation(): PortfolioRecommendation | null {
  const [top] = CRITICAL_PAIRS
  if (!top) return null

  const preySku = PORTFOLIO_SKUS.find((sku) => sku.id === top.preyId)
  const decisionId = preySku ? (MOLECULE_DECISION[preySku.moleculeId] ?? null) : null
  const decision = decisionId ? findDecision(decisionId) : undefined

  return {
    pairId: top.id,
    decisionId: decision?.id ?? null,
    decisionTitle: decision?.title ?? null,
    headline: `Revisar a régua de preço entre ${top.captorName} e ${top.preyName}`,
    rationale: `${top.captorName} absorve ${formatPercent(top.percent)} do volume de ${top.preyName}. Enquanto as duas apresentações ficarem a menos de um degrau de preço uma da outra, o ganho de uma continua saindo do bolso da outra e o portfólio cresce menos do que a soma das linhas sugere.`,
    attestation: CANNIBALIZATION_ATTESTATION,
  }
}

export const PORTFOLIO_RECOMMENDATION = buildRecommendation()
