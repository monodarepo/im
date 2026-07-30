import { BRAZIL_UF_TILES, UF_NAME, type UfCode } from '../assets/brazil-uf'
import type { OpportunityLevel } from '../design/tokens'
import { combine, type Attestation } from '../domain/attestation'
import { formatDecimal, formatPercent } from '../domain/format'
import { formatMoney } from '../domain/money'
import { MARKET_KPIS, SELLOUT_TOTAL_BRL, type Kpi } from './kpis'
import {
  OPPORTUNITIES,
  opportunityLevel,
  TOTAL_OPPORTUNITY_BRL,
  UF_OPPORTUNITY,
} from './opportunities'
import { createRandom, MOCK_SEED } from './random'
import { IQVIA, NEOGRID, SCANNTECH } from './sources'

/**
 * Território 360° (módulo 1.5 do ESCOPO).
 *
 * Duas leituras sobre a mesma base: a tabela ranqueada de white spaces e o mapa
 * de calor por camada. White space é a interseção de duas condições — potencial
 * acima da mediana das UFs e presença abaixo da referência nacional. Uma sozinha
 * não qualifica: mercado grande onde já estamos presentes não é espaço em
 * branco, e cobertura baixa em mercado pequeno não paga a ida.
 *
 * Ancoragem nos números canônicos:
 *
 * - **Potencial nacional** = sell-out (R$ 256,4M) ÷ market share (18,7%). O que
 *   a Hypera vende dividido pela fatia que detém é o mercado endereçável.
 * - **Presença** = distribuição numérica. A média simples das 27 UFs fecha
 *   exatamente na referência nacional de 76,2%.
 * - **Oportunidade em R$** nunca é derivada: vem inteira das cinco
 *   oportunidades priorizadas (`opportunities.ts`), com o mesmo `decisionId`.
 */

function findKpi(id: string): Kpi {
  const kpi = MARKET_KPIS.find((item) => item.id === id)
  if (!kpi) throw new Error(`KPI ausente em MARKET_KPIS: ${id}`)
  return kpi
}

const MARKET_SHARE_KPI = findKpi('market-share')
const PRESENCE_KPI = findKpi('numeric-distribution')

/** Referência nacional de presença: a distribuição numérica da seção 10. */
export const NATIONAL_PRESENCE_PERCENT = PRESENCE_KPI.value

/** Mercado endereçável total, derivado do sell-out e do market share. */
export const MARKET_POTENTIAL_BRL = Math.round(
  SELLOUT_TOTAL_BRL / (MARKET_SHARE_KPI.value / 100),
)

const UF_CODES: readonly UfCode[] = BRAZIL_UF_TILES.map((tile) => tile.code)

export const EVALUATED_UF_COUNT = UF_CODES.length

/**
 * NOTA: não consta do ESCOPO — ordem relativa de tamanho de mercado entre as
 * UFs. Serve apenas para repartir o potencial nacional em uma curva plausível
 * (São Paulo à frente, Roraima ao fim); nenhum valor por UF vem do documento.
 */
const MARKET_SIZE_ORDER: readonly UfCode[] = [
  'SP', 'MG', 'RJ', 'BA', 'RS', 'PR', 'PE', 'CE', 'PA', 'SC',
  'GO', 'MA', 'AM', 'ES', 'PB', 'RN', 'MT', 'AL', 'PI', 'DF',
  'MS', 'SE', 'RO', 'TO', 'AC', 'AP', 'RR',
]

/** Expoente da lei de potência que reparte o potencial entre as UFs. */
const SIZE_DECAY = 1.1

function potentialByUf(): Map<UfCode, number> {
  const random = createRandom(MOCK_SEED + 11)
  const weights = MARKET_SIZE_ORDER.map((code, index) => ({
    code,
    weight: Math.pow(index + 1, -SIZE_DECAY) * (0.94 + 0.12 * random()),
  }))

  const total = weights.reduce((sum, entry) => sum + entry.weight, 0)
  const values = weights.map((entry) => ({
    code: entry.code,
    value: Math.round((MARKET_POTENTIAL_BRL * entry.weight) / total),
  }))

  const drift = MARKET_POTENTIAL_BRL - values.reduce((sum, entry) => sum + entry.value, 0)
  const first = values[0]
  if (first) first.value += drift

  return new Map(values.map((entry) => [entry.code, entry.value]))
}

const POTENTIAL_BY_UF = potentialByUf()

/** UFs cobertas por alguma das cinco oportunidades priorizadas. */
const WHITE_SPACE_UFS: ReadonlySet<UfCode> = new Set(
  OPPORTUNITIES.flatMap((opportunity) =>
    opportunity.scope.kind === 'uf' ? [opportunity.scope.uf] : [...opportunity.scope.ufs],
  ),
)

/**
 * NOTA: não consta do ESCOPO — faixas de distribuição numérica por UF. As UFs
 * sob oportunidade priorizada ficam na faixa baixa, as demais na faixa alta, e
 * um deslocamento uniforme fecha a média simples das 27 UFs em 76,2%.
 */
const WHITE_SPACE_PRESENCE_BAND = { min: 58, max: 73 } as const
const COVERED_PRESENCE_BAND = { min: 84, max: 96 } as const

function presenceByUf(): Map<UfCode, number> {
  const random = createRandom(MOCK_SEED + 23)
  const raw = UF_CODES.map((code) => {
    const band = WHITE_SPACE_UFS.has(code) ? WHITE_SPACE_PRESENCE_BAND : COVERED_PRESENCE_BAND
    return { code, value: band.min + (band.max - band.min) * random() }
  })

  const mean = raw.reduce((sum, entry) => sum + entry.value, 0) / raw.length
  const shift = NATIONAL_PRESENCE_PERCENT - mean

  return new Map(raw.map((entry) => [entry.code, entry.value + shift]))
}

const PRESENCE_BY_UF = presenceByUf()

export type TerritoryProfile = {
  readonly uf: UfCode
  readonly name: string
  /** Mercado endereçável da UF, em reais. */
  readonly potentialBrl: number
  /** Posição da UF no ranking de potencial, 1 é a maior. */
  readonly potentialRank: number
  /** Distribuição numérica na UF, em percentual. */
  readonly presencePercent: number
  /** Distância até a referência nacional, em pontos percentuais. Negativo = abaixo. */
  readonly gapPoints: number
  /** `true` quando a UF atende às duas condições de white space. */
  readonly whiteSpace: boolean
}

function buildProfiles(): readonly TerritoryProfile[] {
  const ranked = [...UF_CODES].sort(
    (a, b) => (POTENTIAL_BY_UF.get(b) ?? 0) - (POTENTIAL_BY_UF.get(a) ?? 0),
  )
  const rankOf = new Map(ranked.map((code, index) => [code, index + 1]))

  const potentials = ranked.map((code) => POTENTIAL_BY_UF.get(code) ?? 0)
  const median = potentials[Math.floor(potentials.length / 2)] ?? 0

  return UF_CODES.map((uf) => {
    const potentialBrl = POTENTIAL_BY_UF.get(uf) ?? 0
    const presencePercent = PRESENCE_BY_UF.get(uf) ?? 0
    return {
      uf,
      name: UF_NAME[uf],
      potentialBrl,
      potentialRank: rankOf.get(uf) ?? UF_CODES.length,
      presencePercent,
      gapPoints: presencePercent - NATIONAL_PRESENCE_PERCENT,
      whiteSpace: potentialBrl >= median && presencePercent < NATIONAL_PRESENCE_PERCENT,
    }
  })
}

export const TERRITORY_PROFILES: readonly TerritoryProfile[] = buildProfiles()

export const TERRITORY_BY_UF: Record<UfCode, TerritoryProfile> = Object.fromEntries(
  TERRITORY_PROFILES.map((profile) => [profile.uf, profile]),
) as Record<UfCode, TerritoryProfile>

/** Mediana do potencial entre as 27 UFs — o corte de "alto potencial". */
export const MEDIAN_UF_POTENTIAL_BRL =
  [...TERRITORY_PROFILES].sort((a, b) => a.potentialBrl - b.potentialBrl)[
    Math.floor(TERRITORY_PROFILES.length / 2)
  ]?.potentialBrl ?? 0

const POTENTIAL_ATTESTATION = combine([SCANNTECH, IQVIA])
const PRESENCE_ATTESTATION = NEOGRID

/** Atestado do cruzamento potencial × presença: herda o elo mais fraco dos dois. */
export const TERRITORY_ATTESTATION = combine([POTENTIAL_ATTESTATION, PRESENCE_ATTESTATION])

export const OPPORTUNITY_ATTESTATION = combine(
  OPPORTUNITIES.map((opportunity) => opportunity.attestation),
)

export type WhiteSpace = {
  readonly rank: number
  /** Rótulo do território: `SP · São Paulo` ou `Região Sul`. */
  readonly label: string
  /** Natureza do recorte, para a coluna de território. */
  readonly scopeLabel: string
  readonly ufs: readonly UfCode[]
  readonly potentialBrl: number
  readonly presencePercent: number
  readonly gapPoints: number
  /** Impacto priorizado, sempre canônico. */
  readonly opportunityBrl: number
  readonly decisionId: string
  readonly action: string
  readonly attestation: Attestation
}

function aggregate(ufs: readonly UfCode[]): { potentialBrl: number; presencePercent: number } {
  const profiles = ufs.map((uf) => TERRITORY_BY_UF[uf])
  const potentialBrl = profiles.reduce((sum, profile) => sum + profile.potentialBrl, 0)
  const presencePercent =
    profiles.reduce((sum, profile) => sum + profile.presencePercent, 0) / profiles.length
  return { potentialBrl, presencePercent }
}

function buildWhiteSpaces(): readonly WhiteSpace[] {
  return [...OPPORTUNITIES]
    .sort((a, b) => b.impactBrl - a.impactBrl)
    .map((opportunity, index) => {
      const ufs =
        opportunity.scope.kind === 'uf' ? [opportunity.scope.uf] : [...opportunity.scope.ufs]
      const { potentialBrl, presencePercent } = aggregate(ufs)
      const isSingle = opportunity.scope.kind === 'uf'

      return {
        rank: index + 1,
        label: isSingle
          ? `${ufs[0] ?? ''} · ${UF_NAME[ufs[0] ?? 'SP']}`
          : opportunity.scope.kind === 'region'
            ? opportunity.scope.label
            : '',
        scopeLabel: isSingle ? 'UF' : `Agregado · ${ufs.length} UFs`,
        ufs,
        potentialBrl,
        presencePercent,
        gapPoints: presencePercent - NATIONAL_PRESENCE_PERCENT,
        opportunityBrl: opportunity.impactBrl,
        decisionId: opportunity.decisionId,
        action: opportunity.title,
        attestation: combine([opportunity.attestation, TERRITORY_ATTESTATION]),
      }
    })
}

export const WHITE_SPACES: readonly WhiteSpace[] = buildWhiteSpaces()

export const WHITE_SPACE_TOTAL_BRL = TOTAL_OPPORTUNITY_BRL

/** UFs que atendem isoladamente às duas condições do critério. */
export const WHITE_SPACE_UF_COUNT = TERRITORY_PROFILES.filter((profile) => profile.whiteSpace).length

/** Enunciado do critério, exibido junto da tabela. */
export const WHITE_SPACE_CRITERION = {
  title: 'Alto potencial + baixa presença',
  potential: `Potencial acima da mediana das ${EVALUATED_UF_COUNT} UFs (${formatMoney(MEDIAN_UF_POTENTIAL_BRL)})`,
  presence: `Distribuição numérica abaixo da referência nacional (${formatPercent(NATIONAL_PRESENCE_PERCENT)})`,
  note: 'As duas condições ao mesmo tempo. Mercado grande já coberto não é espaço em branco; cobertura baixa em mercado pequeno não paga a ida.',
  coverage: `${WHITE_SPACE_UF_COUNT} das ${EVALUATED_UF_COUNT} UFs atendem às duas condições, agrupadas em ${WHITE_SPACES.length} recortes priorizados`,
} as const

export type TerritoryKpi = {
  readonly id: string
  readonly label: string
  /** Valor já formatado pelo domínio. */
  readonly value: string
  readonly delta?: number
  readonly deltaUnit?: 'percent' | 'points'
  readonly comparison?: string
  readonly attestation: Attestation
}

export const TERRITORY_KPIS: readonly TerritoryKpi[] = [
  {
    id: 'potential',
    label: 'Potencial de mercado',
    value: formatMoney(MARKET_POTENTIAL_BRL),
    attestation: POTENTIAL_ATTESTATION,
  },
  {
    id: 'presence',
    label: 'Presença média (distribuição numérica)',
    value: formatPercent(NATIONAL_PRESENCE_PERCENT),
    delta: PRESENCE_KPI.delta,
    deltaUnit: PRESENCE_KPI.deltaUnit,
    comparison: PRESENCE_KPI.comparison,
    attestation: PRESENCE_ATTESTATION,
  },
  {
    id: 'white-spaces',
    label: 'Territórios white space',
    value: String(WHITE_SPACES.length),
    attestation: TERRITORY_ATTESTATION,
  },
  {
    id: 'mapped-opportunity',
    label: 'Oportunidade mapeada',
    value: formatMoney(WHITE_SPACE_TOTAL_BRL),
    attestation: OPPORTUNITY_ATTESTATION,
  },
]

/** Camadas do mapa de calor. Uma de cada vez preenche o cartograma. */
export type MapLayerId = 'potential' | 'presence' | 'gap' | 'opportunity'

export type MapLayer = {
  readonly id: MapLayerId
  readonly label: string
  readonly description: string
  readonly legendTitle: string
  readonly legendLow: string
  readonly legendHigh: string
  readonly attestation: Attestation
}

export const MAP_LAYERS: readonly MapLayer[] = [
  {
    id: 'potential',
    label: 'Potencial',
    description: 'Mercado endereçável por UF, em quintis',
    legendTitle: 'Potencial de mercado (R$)',
    legendLow: 'menor',
    legendHigh: 'maior',
    attestation: POTENTIAL_ATTESTATION,
  },
  {
    id: 'presence',
    label: 'Presença',
    description: 'Distribuição numérica por UF',
    legendTitle: 'Presença (distribuição numérica)',
    legendLow: 'menor',
    legendHigh: 'maior',
    attestation: PRESENCE_ATTESTATION,
  },
  {
    id: 'gap',
    label: 'Gap',
    description: 'Quanto a presença da UF fica abaixo da referência nacional',
    legendTitle: 'Gap de presença (pp abaixo da referência)',
    legendLow: 'sem gap',
    legendHigh: 'maior gap',
    attestation: TERRITORY_ATTESTATION,
  },
  {
    id: 'opportunity',
    label: 'Oportunidade',
    description: 'Impacto priorizado das cinco oportunidades em aberto',
    legendTitle: 'Oportunidade (impacto R$)',
    legendLow: 'menor',
    legendHigh: 'maior',
    attestation: OPPORTUNITY_ATTESTATION,
  },
]

const POTENTIAL_RANK_CUTS: readonly { max: number; level: OpportunityLevel }[] = [
  { max: 5, level: 5 },
  { max: 11, level: 4 },
  { max: 16, level: 3 },
  { max: 21, level: 2 },
]

const PRESENCE_CUTS: readonly { min: number; level: OpportunityLevel }[] = [
  { min: 90, level: 5 },
  { min: 86, level: 4 },
  { min: NATIONAL_PRESENCE_PERCENT, level: 3 },
  { min: 66, level: 2 },
]

const GAP_CUTS: readonly { min: number; level: OpportunityLevel }[] = [
  { min: 15, level: 5 },
  { min: 11, level: 4 },
  { min: 7, level: 3 },
  { min: 0.1, level: 2 },
]

/** Déficit de presença em pontos percentuais. Zero quando a UF está na referência ou acima. */
export function presenceDeficit(profile: TerritoryProfile): number {
  return Math.max(0, -profile.gapPoints)
}

export function layerLevel(layer: MapLayerId, uf: UfCode): OpportunityLevel {
  const profile = TERRITORY_BY_UF[uf]

  switch (layer) {
    case 'potential':
      return POTENTIAL_RANK_CUTS.find(({ max }) => profile.potentialRank <= max)?.level ?? 1
    case 'presence':
      return PRESENCE_CUTS.find(({ min }) => profile.presencePercent >= min)?.level ?? 1
    case 'gap':
      return GAP_CUTS.find(({ min }) => presenceDeficit(profile) >= min)?.level ?? 1
    case 'opportunity':
      return opportunityLevel(UF_OPPORTUNITY[uf]?.impactBrl)
  }
}

/** Valor da camada, formatado para tooltip e legenda. */
export function layerValueLabel(layer: MapLayerId, uf: UfCode): string {
  const profile = TERRITORY_BY_UF[uf]

  switch (layer) {
    case 'potential':
      return formatMoney(profile.potentialBrl)
    case 'presence':
      return formatPercent(profile.presencePercent)
    case 'gap': {
      const deficit = presenceDeficit(profile)
      return deficit === 0 ? 'sem gap' : `${formatDecimal(deficit, 1)} pp abaixo`
    }
    case 'opportunity': {
      const opportunity = UF_OPPORTUNITY[uf]
      return opportunity ? formatMoney(opportunity.impactBrl) : 'sem oportunidade priorizada'
    }
  }
}

export function findMapLayer(id: MapLayerId): MapLayer {
  const layer = MAP_LAYERS.find((item) => item.id === id)
  if (!layer) throw new Error(`Camada de mapa desconhecida: ${id}`)
  return layer
}

export const DEFAULT_MAP_LAYER: MapLayerId = 'gap'

/** Rótulo curto da oportunidade que cobre a UF, quando existe. */
export function opportunityLabelFor(uf: UfCode): string | undefined {
  const opportunity = UF_OPPORTUNITY[uf]
  if (!opportunity) return undefined
  return opportunity.regional ? `Agregado — ${opportunity.label}` : opportunity.label
}
