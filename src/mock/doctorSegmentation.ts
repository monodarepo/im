import type { UfCode } from '../assets/brazil-uf'
import { SEMANTIC, type SemanticTone } from '../design/tokens'
import { combine, type Attestation } from '../domain/attestation'
import { daysFromNow, type IsoDate } from '../domain/today'
import {
  DOCTORS,
  REGION_LABEL,
  SPECIALTY_LABEL,
  UF_REGION,
  type PotentialTier,
  type RegionId,
  type SpecialtyId,
} from './doctors'
import { createRandom, MOCK_SEED } from './random'
import {
  ALLOCATION_DECISION_ID,
  ALLOCATION_KPIS,
  DOCTOR_ALLOCATIONS,
  REGION_ALLOCATIONS,
  STOCKOUT_BLOCK,
} from './sampleAllocation'
import { CRM_SFA, IQVIA, SAP, SCANNTECH } from './sources'

/**
 * Segmentação de Médicos (AG, módulo 4.3) — o HCP 360° do ponto de vista da
 * amostra grátis.
 *
 * Não é a segmentação comercial da carteira, que o GTM 2.3 já faz. A pergunta
 * aqui é outra e mais estreita: **este médico converte amostra em prescrição —
 * e a plataforma pode entregar amostra a ele?** São duas perguntas encadeadas,
 * e a segunda cancela a primeira. Um médico de propensão altíssima com
 * consentimento pendente, limite de ciclo esgotado ou território em ruptura não
 * recebe amostra, por mais bem colocado que esteja na matriz.
 *
 * Por isso a elegibilidade não é um filtro escondido: ela viaja junto com o
 * score, no mesmo objeto, e aparece na mesma linha da tabela. O score diz para
 * quem vale a pena; a elegibilidade diz para quem é permitido.
 *
 * O score de propensão é a soma explícita das contribuições dos cinco fatores
 * sobre a base da carteira. Cada contribuição já sai arredondada, e o score é o
 * total dessas parcelas — a conta que a tela mostra é a conta que o mock faz.
 */

/* -------------------------------------------------------------------------- */
/* NOTA: não consta do ESCOPO — eixo de propensão a converter amostra, seus     */
/* fatores e pesos, as faixas de referência da carteira, o limite de amostras   */
/* por ciclo e a repartição da carteira pelos quatro segmentos.                 */
/*                                                                             */
/* O ESCOPO fixa, na seção 10.5, os cinco médicos da recomendação por médico    */
/* (prescrição mensal, frequência de visita, amostras entregues, recomendadas   */
/* e conversão estimada) e, na 10.4, a faixa de potencial de cada um. Todo o    */
/* resto desta tela é derivado desses valores: o eixo de potencial é ancorado   */
/* na faixa canônica, e os cinco fatores de propensão leem os números da 10.5 — */
/* nenhum deles inventa uma medição nova para o médico canônico.                */
/* -------------------------------------------------------------------------- */

export const SCORE_MIN = 0
export const SCORE_MAX = 100

/** Corte de potencial de prescrição. Acima dele, o médico paga a amostra. */
export const POTENTIAL_THRESHOLD = 62

/** Corte de propensão. Acima dele, a amostra entregue vira prescrição. */
export const PROPENSITY_THRESHOLD = 60

/** Base da carteira: o ponto de partida de todo médico antes dos fatores. */
export const PROPENSITY_BASE = 50

/** Amplitude total que os cinco fatores podem mover a propensão. */
const PROPENSITY_SPAN = 44

/** Âncora do eixo de potencial, por faixa canônica da seção 10.4. */
const TIER_ANCHOR: Record<PotentialTier, number> = { high: 78, medium: 46, low: 24 }

/** Quanto a prescrição observada modula o potencial em torno da âncora. */
const POTENTIAL_MODULATION_SPAN = 8

export const AXIS_LABEL = {
  potential: 'Potencial de prescrição',
  propensity: 'Propensão a converter amostra',
} as const

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function between(random: () => number, min: number, max: number): number {
  return min + random() * (max - min)
}

/* -------------------------------------------------------------------------- */
/* Segmentos                                                                   */
/* -------------------------------------------------------------------------- */

export type SegmentId = 'convert' | 'cultivate' | 'sustain' | 'withhold'

export const SEGMENT_ORDER: readonly SegmentId[] = ['convert', 'cultivate', 'sustain', 'withhold']

export const SEGMENT_LABEL: Record<SegmentId, string> = {
  convert: 'Converter agora',
  cultivate: 'Cultivar antes de amostrar',
  sustain: 'Sustentar com cota mínima',
  withhold: 'Não amostrar no ciclo',
}

export const SEGMENT_DESCRIPTION: Record<SegmentId, string> = {
  convert: 'Alto potencial de prescrição e alta propensão a converter a amostra',
  cultivate: 'Alto potencial, propensão ainda baixa',
  sustain: 'Propensão alta sobre potencial menor',
  withhold: 'Potencial e propensão baixos',
}

/**
 * A cor do segmento é leitura de dado, não de produto: verde onde a amostra
 * converte, âmbar onde falta relacionamento antes do investimento, cinza onde a
 * carteira apenas se mantém.
 */
export const SEGMENT_COLOR: Record<SegmentId, string> = {
  convert: SEMANTIC.positive,
  cultivate: SEMANTIC.attention,
  sustain: SEMANTIC.neutral,
  withhold: '#CBD5E1',
}

/** Leitura de ação de cada quadrante — o que o segmento manda fazer com a cota. */
export const SEGMENT_ACTION: Record<SegmentId, string> = {
  convert: 'Entregar a cota cheia do ciclo e medir a prescrição na visita seguinte.',
  cultivate: 'Visitar antes de investir amostra: sem relacionamento, a amostra vira perda.',
  sustain: 'Manter cota mínima e migrar parte do contato para canal remoto.',
  withhold: 'Sem amostra no ciclo — a cota retida aqui financia os dois segmentos de cima.',
}

/** Segmento que executa o plano de alocação; os demais são política de cota. */
export const SEGMENT_DECISION: Record<SegmentId, string | null> = {
  convert: ALLOCATION_DECISION_ID,
  cultivate: ALLOCATION_DECISION_ID,
  sustain: null,
  withhold: null,
}

export function segmentOf(potentialScore: number, propensityScore: number): SegmentId {
  const highPotential = potentialScore >= POTENTIAL_THRESHOLD
  const highPropensity = propensityScore >= PROPENSITY_THRESHOLD
  if (highPotential && highPropensity) return 'convert'
  if (highPotential) return 'cultivate'
  if (highPropensity) return 'sustain'
  return 'withhold'
}

/* -------------------------------------------------------------------------- */
/* Fatores da propensão                                                        */
/* -------------------------------------------------------------------------- */

export type PropensityFactorId =
  | 'prescription-history'
  | 'sample-response'
  | 'visit-frequency'
  | 'specialty-fit'
  | 'territory-potential'

export type PropensityFactor = {
  readonly id: PropensityFactorId
  readonly label: string
  /** Peso do fator. Os cinco pesos somam 1. */
  readonly weight: number
  readonly attestation: Attestation
  /** O que faz o fator subir, em uma frase. */
  readonly meaning: string
  /** De onde sai o nível do fator neste médico. */
  readonly basis: string
}

export const PROPENSITY_FACTORS: readonly PropensityFactor[] = [
  {
    id: 'prescription-history',
    label: 'Prescrição histórica',
    weight: 0.3,
    attestation: IQVIA,
    meaning: 'Quem já prescreve muito converte amostra em receita com menos atrito.',
    basis: 'Prescrição mensal observada, contra a faixa da carteira.',
  },
  {
    id: 'sample-response',
    label: 'Resposta a amostras anteriores',
    weight: 0.24,
    attestation: CRM_SFA,
    meaning: 'Unidades convertidas por amostra entregue nos ciclos anteriores.',
    basis: 'Conversão estimada dividida pelas amostras já entregues.',
  },
  {
    id: 'visit-frequency',
    label: 'Frequência de visita',
    weight: 0.2,
    attestation: CRM_SFA,
    meaning: 'Intervalo curto entre visitas mantém a amostra acompanhada até a prescrição.',
    basis: 'Dias entre visitas registrados na força de vendas — quanto menor, maior o nível.',
  },
  {
    id: 'specialty-fit',
    label: 'Aderência de especialidade',
    weight: 0.14,
    attestation: IQVIA,
    meaning: 'Quanto a especialidade responde pela indicação do produto da campanha.',
    basis: 'Aderência da especialidade à campanha cardiovascular em curso.',
  },
  {
    id: 'territory-potential',
    label: 'Potencial do território',
    weight: 0.12,
    attestation: SCANNTECH,
    meaning: 'Praça com retorno maior devolve mais sell-out por amostra distribuída.',
    basis: 'Retorno estimado da praça na alocação por região.',
  },
]

/** Faixas de referência da carteira, usadas para normalizar cada fator. */
const PRESCRIPTION_BAND = { min: 80, max: 360 } as const
const RESPONSE_BAND = { min: 2, max: 5 } as const
const VISIT_BAND = { min: 18, max: 48 } as const
const TERRITORY_ROI_BAND = { min: 3.9, max: 4.7 } as const

/** Aderência de cada especialidade à campanha cardiovascular do ciclo. */
const SPECIALTY_FIT_LEVEL: Record<SpecialtyId, number> = {
  cardiologia: 0.9,
  'clinica-geral': 0.2,
  endocrinologia: -0.2,
  ginecologia: -0.7,
  pediatria: -0.9,
}

type Band = { readonly min: number; readonly max: number }

/** Posição dentro da faixa da carteira, normalizada em `[-1, 1]`. */
function levelIn(value: number, band: Band): number {
  const normalized = ((value - band.min) / (band.max - band.min)) * 2 - 1
  return roundOneDecimal(clamp(normalized, -1, 1))
}

/** UF do médico mapeada na praça da alocação por região (seção 10.5). */
const UF_ALLOCATION_REGION: Partial<Record<UfCode, string>> = {
  SP: 'sp-capital',
  RJ: 'rj',
  MG: 'mg',
}

function territoryLevel(uf: UfCode): number {
  const regionId = UF_ALLOCATION_REGION[uf] ?? 'outros'
  const row = REGION_ALLOCATIONS.find((allocation) => allocation.id === regionId)
  if (!row) throw new Error(`Praça de alocação ausente: ${regionId}`)
  return levelIn(row.estimatedRoi, TERRITORY_ROI_BAND)
}

/* -------------------------------------------------------------------------- */
/* Carteira nominal                                                            */
/* -------------------------------------------------------------------------- */

export type HcpProfile = {
  readonly id: string
  readonly name: string
  /** Sobrenome, para rótulo curto na matriz. */
  readonly shortName: string
  readonly specialty: SpecialtyId
  readonly specialtyLabel: string
  readonly uf: UfCode
  readonly region: RegionId
  readonly regionLabel: string
  readonly potentialTier: PotentialTier
  /** `true` para os cinco médicos fixados no ESCOPO. */
  readonly canonical: boolean
  readonly monthlyPrescriptions: number
  readonly visitFrequencyDays: number
  readonly samplesDelivered: number
  readonly recommendedSamples: number
  readonly estimatedConversionUnits: number
  /** Consentimento de contato ainda não registrado no ciclo. */
  readonly consentPending: boolean
}

/**
 * NOTA: não consta do ESCOPO — o consentimento pendente de Dra. Juliana Costa.
 * O caso existe para que a regra de compliance apareça sobre um médico que a
 * demonstração já conhece, em vez de sobre uma linha anônima.
 */
const CONSENT_PENDING_IDS: readonly string[] = ['MD-004']

function lastName(name: string): string {
  const parts = name.split(' ')
  return parts[parts.length - 1] ?? name
}

function buildProfile(input: {
  readonly id: string
  readonly name: string
  readonly specialty: SpecialtyId
  readonly uf: UfCode
  readonly potentialTier: PotentialTier
  readonly canonical: boolean
  readonly monthlyPrescriptions: number
  readonly visitFrequencyDays: number
  readonly samplesDelivered: number
  readonly recommendedSamples: number
  readonly estimatedConversionUnits: number
  readonly consentPending: boolean
}): HcpProfile {
  const region = UF_REGION[input.uf]
  return {
    ...input,
    shortName: lastName(input.name),
    specialtyLabel: SPECIALTY_LABEL[input.specialty],
    region,
    regionLabel: REGION_LABEL[region],
  }
}

const CANONICAL_PROFILES: readonly HcpProfile[] = DOCTOR_ALLOCATIONS.map((allocation) => {
  const doctor = DOCTORS.find((item) => item.id === allocation.doctorId)
  if (!doctor) throw new Error(`Médico canônico ausente: ${allocation.doctorId}`)

  return buildProfile({
    id: doctor.id,
    name: doctor.name,
    specialty: doctor.specialty,
    uf: doctor.uf,
    potentialTier: doctor.potentialTier,
    canonical: true,
    monthlyPrescriptions: allocation.monthlyPrescriptions,
    visitFrequencyDays: allocation.visitFrequencyDays,
    samplesDelivered: allocation.samplesDelivered,
    recommendedSamples: allocation.recommendedSamples,
    estimatedConversionUnits: allocation.estimatedConversionUnits,
    consentPending: CONSENT_PENDING_IDS.includes(doctor.id),
  })
})

/* -------------------------------------------------------------------------- */
/* NOTA: não consta do ESCOPO — os três médicos de apoio da carteira nominal.  */
/*                                                                             */
/* Os cinco canônicos não instanciam duas das três causas de inelegibilidade:  */
/* nenhum deles atende em território bloqueado por ruptura, e nenhum esgotou a */
/* cota do ciclo. Estes três existem só para que essas regras apareçam sobre   */
/* um caso concreto — nunca como protagonistas. Prescrição, intervalo de       */
/* visita, resposta a amostra e recomendação saem do PRNG de semente fixa      */
/* dentro das faixas declaradas; as amostras já entregues são fato do ciclo e  */
/* ficam declaradas na semente.                                                */
/* -------------------------------------------------------------------------- */

type PortfolioSeed = {
  readonly id: string
  readonly name: string
  readonly specialty: SpecialtyId
  readonly uf: UfCode
  readonly potentialTier: PotentialTier
  readonly samplesDelivered: number
  readonly consentPending: boolean
  readonly prescriptionRange: Band
  readonly visitRange: Band
  /** Unidades convertidas por amostra entregue nos ciclos anteriores. */
  readonly responseRange: Band
  readonly recommendedRange: Band
}

const PORTFOLIO_SEEDS: readonly PortfolioSeed[] = [
  {
    id: 'MD-101',
    name: 'Dra. Renata Aguiar',
    specialty: 'cardiologia',
    uf: 'CE',
    potentialTier: 'high',
    samplesDelivered: 6,
    consentPending: false,
    prescriptionRange: { min: 230, max: 300 },
    visitRange: { min: 42, max: 48 },
    responseRange: { min: 2, max: 2.6 },
    recommendedRange: { min: 15, max: 25 },
  },
  {
    id: 'MD-102',
    name: 'Dr. Otávio Serra',
    specialty: 'clinica-geral',
    uf: 'SP',
    potentialTier: 'medium',
    samplesDelivered: 9,
    consentPending: false,
    prescriptionRange: { min: 100, max: 150 },
    visitRange: { min: 18, max: 22 },
    responseRange: { min: 4.6, max: 5 },
    recommendedRange: { min: 8, max: 12 },
  },
  {
    id: 'MD-103',
    name: 'Dra. Helena Prado',
    specialty: 'pediatria',
    uf: 'MG',
    potentialTier: 'low',
    samplesDelivered: 12,
    consentPending: false,
    prescriptionRange: { min: 60, max: 95 },
    visitRange: { min: 38, max: 46 },
    responseRange: { min: 2.2, max: 3 },
    recommendedRange: { min: 4, max: 8 },
  },
]

const PORTFOLIO_SEED_OFFSET = 4300

const PORTFOLIO_PROFILES: readonly HcpProfile[] = PORTFOLIO_SEEDS.map((seed, index) => {
  const random = createRandom(MOCK_SEED + PORTFOLIO_SEED_OFFSET + index)
  const monthlyPrescriptions = Math.round(
    between(random, seed.prescriptionRange.min, seed.prescriptionRange.max),
  )
  const visitFrequencyDays = Math.round(between(random, seed.visitRange.min, seed.visitRange.max))
  const responseRatio = between(random, seed.responseRange.min, seed.responseRange.max)
  const recommendedSamples = Math.max(
    5,
    roundTo(between(random, seed.recommendedRange.min, seed.recommendedRange.max), 5),
  )

  return buildProfile({
    id: seed.id,
    name: seed.name,
    specialty: seed.specialty,
    uf: seed.uf,
    potentialTier: seed.potentialTier,
    canonical: false,
    monthlyPrescriptions,
    visitFrequencyDays,
    samplesDelivered: seed.samplesDelivered,
    recommendedSamples,
    estimatedConversionUnits: Math.round(responseRatio * seed.samplesDelivered),
    consentPending: seed.consentPending,
  })
})

export const HCP_PROFILES: readonly HcpProfile[] = [...CANONICAL_PROFILES, ...PORTFOLIO_PROFILES]

/* -------------------------------------------------------------------------- */
/* Elegibilidade e limites                                                     */
/* -------------------------------------------------------------------------- */

/**
 * NOTA: não consta do ESCOPO — o limite de amostras por ciclo, por faixa de
 * potencial. É o teto de compliance da entrega: acima dele, nenhuma
 * recomendação do modelo é executável.
 */
export const CYCLE_LIMIT_BY_TIER: Record<PotentialTier, number> = { high: 30, medium: 20, low: 12 }

/** NOTA: não consta do ESCOPO — o encerramento do ciclo corrente. */
export const CYCLE_ENDS_ON: IsoDate = daysFromNow(18)

export const CYCLE_LABEL = 'Ciclo corrente'

export type EligibilityStatus = 'eligible' | 'restricted' | 'blocked'

export const ELIGIBILITY_STATUS_LABEL: Record<EligibilityStatus, string> = {
  eligible: 'Elegível',
  restricted: 'Elegível com restrição',
  blocked: 'Inelegível',
}

export const ELIGIBILITY_STATUS_TONE: Record<EligibilityStatus, SemanticTone> = {
  eligible: 'positive',
  restricted: 'attention',
  blocked: 'negative',
}

export type EligibilityReasonId = 'consent_pending' | 'cycle_limit' | 'territory_blocked'

export const ELIGIBILITY_REASON_LABEL: Record<EligibilityReasonId, string> = {
  consent_pending: 'Consentimento de contato pendente',
  cycle_limit: 'Limite do ciclo',
  territory_blocked: 'Território bloqueado por ruptura',
}

export type EligibilityReason = {
  readonly id: EligibilityReasonId
  readonly label: string
  readonly detail: string
  /** `true` quando o motivo zera a entrega; `false` quando apenas a limita. */
  readonly blocking: boolean
  /** Tela que originou a restrição, quando ela vem de outro produto. */
  readonly route: string | null
  readonly routeLabel: string | null
  readonly attestation: Attestation
}

export type Eligibility = {
  readonly status: EligibilityStatus
  readonly cycleLimit: number
  readonly delivered: number
  readonly balance: number
  readonly recommended: number
  /** O que a plataforma libera de fato depois de limite e bloqueio. */
  readonly releasable: number
  readonly reasons: readonly EligibilityReason[]
}

/**
 * Região bloqueada pelo princípio inviolável do módulo: o AG não distribui onde
 * o HUB apurou ruptura. A origem do bloqueio é `STOCKOUT_BLOCK`, não uma regra
 * escrita aqui.
 */
const BLOCKED_REGION: RegionId = 'nordeste'

export const ELIGIBILITY_ATTESTATION: Attestation = combine([CRM_SFA, SAP])

function eligibilityOf(profile: HcpProfile): Eligibility {
  const cycleLimit = CYCLE_LIMIT_BY_TIER[profile.potentialTier]
  const delivered = profile.samplesDelivered
  const balance = Math.max(0, cycleLimit - delivered)
  const recommended = profile.recommendedSamples
  const reasons: EligibilityReason[] = []

  if (profile.consentPending) {
    reasons.push({
      id: 'consent_pending',
      label: ELIGIBILITY_REASON_LABEL.consent_pending,
      detail:
        'Sem consentimento de contato registrado no ciclo, não há entrega de amostra. A regra vem antes do plano.',
      blocking: true,
      route: null,
      routeLabel: null,
      attestation: CRM_SFA,
    })
  }

  if (profile.region === BLOCKED_REGION) {
    reasons.push({
      id: 'territory_blocked',
      label: ELIGIBILITY_REASON_LABEL.territory_blocked,
      detail: `${STOCKOUT_BLOCK.reason} ${STOCKOUT_BLOCK.principle}`,
      blocking: true,
      route: STOCKOUT_BLOCK.sourceRoute,
      routeLabel: STOCKOUT_BLOCK.sourceLabel,
      attestation: STOCKOUT_BLOCK.attestation,
    })
  }

  if (balance === 0) {
    reasons.push({
      id: 'cycle_limit',
      label: 'Limite do ciclo atingido',
      detail: `${cycleLimit} amostras por ciclo, ${delivered} já entregues. Saldo zero até a virada do ciclo.`,
      blocking: true,
      route: null,
      routeLabel: null,
      attestation: SAP,
    })
  } else if (balance < recommended) {
    reasons.push({
      id: 'cycle_limit',
      label: 'Saldo do ciclo abaixo da recomendação',
      detail: `Recomendação de ${recommended} amostras contra saldo de ${balance}. A entrega sai limitada ao saldo.`,
      blocking: false,
      route: null,
      routeLabel: null,
      attestation: SAP,
    })
  }

  const blocked = reasons.some((reason) => reason.blocking)
  const releasable = blocked ? 0 : Math.min(recommended, balance)

  return {
    status: blocked ? 'blocked' : releasable < recommended ? 'restricted' : 'eligible',
    cycleLimit,
    delivered,
    balance,
    recommended,
    releasable,
    reasons,
  }
}

/* -------------------------------------------------------------------------- */
/* Score                                                                       */
/* -------------------------------------------------------------------------- */

export type PropensityFactorScore = {
  readonly factor: PropensityFactor
  /** Intensidade do fator neste médico, em `[-1, 1]`. */
  readonly level: number
  /** Quanto o fator soma (ou tira) do score, em pontos. */
  readonly contributionPoints: number
}

export type HcpSegmentation = {
  readonly profile: HcpProfile
  readonly potentialScore: number
  /** Ponto de partida do potencial, dado pela faixa canônica. */
  readonly potentialAnchor: number
  /** Quanto a prescrição observada moveu o potencial em torno da âncora. */
  readonly potentialModulation: number
  readonly propensityScore: number
  readonly propensityBase: number
  readonly propensityFactors: readonly PropensityFactorScore[]
  /** Soma das contribuições dos cinco fatores, em pontos. */
  readonly factorsTotal: number
  /** Unidades convertidas por amostra entregue nos ciclos anteriores. */
  readonly responseRatio: number
  readonly segment: SegmentId
  readonly eligibility: Eligibility
  readonly attestation: Attestation
}

export const POTENTIAL_ATTESTATION: Attestation = combine([IQVIA, SCANNTECH])
export const PROPENSITY_ATTESTATION: Attestation = combine([IQVIA, CRM_SFA, SCANNTECH])
export const SEGMENT_ATTESTATION: Attestation = combine([IQVIA, CRM_SFA, SAP])
export const HCP_ATTESTATION: Attestation = combine([IQVIA, CRM_SFA, SAP, SCANNTECH])

function responseRatioOf(profile: HcpProfile): number {
  if (profile.samplesDelivered === 0) return 0
  return roundOneDecimal(profile.estimatedConversionUnits / profile.samplesDelivered)
}

function factorLevel(factor: PropensityFactor, profile: HcpProfile, ratio: number): number {
  switch (factor.id) {
    case 'prescription-history':
      return levelIn(profile.monthlyPrescriptions, PRESCRIPTION_BAND)
    case 'sample-response':
      return levelIn(ratio, RESPONSE_BAND)
    case 'visit-frequency':
      return roundOneDecimal(-levelIn(profile.visitFrequencyDays, VISIT_BAND))
    case 'specialty-fit':
      return SPECIALTY_FIT_LEVEL[profile.specialty]
    case 'territory-potential':
      return territoryLevel(profile.uf)
  }
}

function segmentationOf(profile: HcpProfile): HcpSegmentation {
  const responseRatio = responseRatioOf(profile)

  const propensityFactors = PROPENSITY_FACTORS.map((factor) => {
    const level = factorLevel(factor, profile, responseRatio)
    return {
      factor,
      level,
      contributionPoints: roundOneDecimal(factor.weight * level * PROPENSITY_SPAN),
    }
  })

  const factorsTotal = roundOneDecimal(
    propensityFactors.reduce((sum, item) => sum + item.contributionPoints, 0),
  )
  const propensityScore = roundOneDecimal(PROPENSITY_BASE + factorsTotal)

  const potentialAnchor = TIER_ANCHOR[profile.potentialTier]
  const potentialModulation = roundOneDecimal(
    levelIn(profile.monthlyPrescriptions, PRESCRIPTION_BAND) * POTENTIAL_MODULATION_SPAN,
  )
  const potentialScore = roundOneDecimal(potentialAnchor + potentialModulation)

  return {
    profile,
    potentialScore,
    potentialAnchor,
    potentialModulation,
    propensityScore,
    propensityBase: PROPENSITY_BASE,
    propensityFactors,
    factorsTotal,
    responseRatio,
    segment: segmentOf(potentialScore, propensityScore),
    eligibility: eligibilityOf(profile),
    attestation: HCP_ATTESTATION,
  }
}

export const HCP_SEGMENTATIONS: readonly HcpSegmentation[] = HCP_PROFILES.map(segmentationOf)

export function findHcp(id: string): HcpSegmentation | undefined {
  return HCP_SEGMENTATIONS.find((item) => item.profile.id === id)
}

/** A tela abre no primeiro canônico da seção 10.4. */
export const DEFAULT_HCP_ID: string = (() => {
  const canonical = HCP_SEGMENTATIONS.find((item) => item.profile.canonical)
  const chosen = canonical ?? HCP_SEGMENTATIONS[0]
  if (!chosen) throw new Error('Carteira nominal de segmentação vazia')
  return chosen.profile.id
})()

/** Fator de maior peso absoluto — o que explica o score em uma frase. */
export function dominantFactor(
  scores: readonly PropensityFactorScore[],
): PropensityFactorScore | undefined {
  return scores.reduce<PropensityFactorScore | undefined>(
    (best, item) =>
      best === undefined || Math.abs(item.contributionPoints) > Math.abs(best.contributionPoints)
        ? item
        : best,
    undefined,
  )
}

export const NOMINAL_RELEASABLE_SAMPLES = HCP_SEGMENTATIONS.reduce(
  (sum, item) => sum + item.eligibility.releasable,
  0,
)

export const AVERAGE_PROPENSITY = roundOneDecimal(
  HCP_SEGMENTATIONS.reduce((sum, item) => sum + item.propensityScore, 0) /
    HCP_SEGMENTATIONS.length,
)

/* -------------------------------------------------------------------------- */
/* Carteira agregada                                                           */
/* -------------------------------------------------------------------------- */

/** Médicos-alvo da campanha, sem redigitar: vem do KPI da seção 10.5. */
export const PORTFOLIO_TARGET_DOCTORS =
  ALLOCATION_KPIS.find((kpi) => kpi.id === 'target-doctors')?.value ?? 0

/**
 * NOTA: não consta do ESCOPO — a repartição da carteira pelos quatro segmentos.
 * A cauda longa fica em "não amostrar" e a prioridade de conversão é minoria:
 * menos de um quinto dos médicos-alvo recebe a cota cheia do ciclo.
 */
const SEGMENT_SHARE: Record<SegmentId, number> = {
  convert: 0.17,
  cultivate: 0.24,
  sustain: 0.29,
  withhold: 0.3,
}

/** O último segmento absorve o resíduo de arredondamento: a soma fecha o total. */
function distribute(total: number, shares: readonly number[]): readonly number[] {
  const head = shares.slice(0, -1).map((share) => Math.round(total * share))
  const used = head.reduce((sum, value) => sum + value, 0)
  return [...head, total - used]
}

const SEGMENT_COUNTS = distribute(
  PORTFOLIO_TARGET_DOCTORS,
  SEGMENT_ORDER.map((id) => SEGMENT_SHARE[id]),
)

export type PortfolioSegment = {
  readonly id: SegmentId
  readonly label: string
  readonly description: string
  readonly color: string
  readonly action: string
  readonly decisionId: string | null
  readonly doctors: number
  readonly share: number
  /** Médicos nominais da carteira em acompanhamento que caem no segmento. */
  readonly namedDoctors: readonly HcpSegmentation[]
  readonly attestation: Attestation
}

export const SEGMENT_DISTRIBUTION: readonly PortfolioSegment[] = SEGMENT_ORDER.map((id, index) => ({
  id,
  label: SEGMENT_LABEL[id],
  description: SEGMENT_DESCRIPTION[id],
  color: SEGMENT_COLOR[id],
  action: SEGMENT_ACTION[id],
  decisionId: SEGMENT_DECISION[id],
  doctors: SEGMENT_COUNTS[index] ?? 0,
  share: SEGMENT_SHARE[id],
  namedDoctors: HCP_SEGMENTATIONS.filter((item) => item.segment === id),
  attestation: SEGMENT_ATTESTATION,
}))

/**
 * NOTA: não consta do ESCOPO — os bloqueios de elegibilidade na carteira.
 * O total de médicos-alvo é canônico (seção 10.5); a repartição dos bloqueios
 * entre consentimento, limite de ciclo e ruptura é declarada para que o resumo
 * de elegibilidade tenha tamanho.
 */
const BLOCK_COUNTS: Record<EligibilityReasonId, number> = {
  consent_pending: 486,
  cycle_limit: 312,
  territory_blocked: 274,
}

export type EligibilityBlock = {
  readonly id: EligibilityReasonId
  readonly label: string
  readonly doctors: number
  readonly share: number
  readonly attestation: Attestation
}

const BLOCK_ORDER: readonly EligibilityReasonId[] = [
  'consent_pending',
  'cycle_limit',
  'territory_blocked',
]

export const BLOCKED_DOCTORS = BLOCK_ORDER.reduce((sum, id) => sum + BLOCK_COUNTS[id], 0)

export const ELIGIBLE_DOCTORS = PORTFOLIO_TARGET_DOCTORS - BLOCKED_DOCTORS

export const ELIGIBLE_SHARE_PERCENT = roundOneDecimal(
  (ELIGIBLE_DOCTORS / PORTFOLIO_TARGET_DOCTORS) * 100,
)

export const ELIGIBILITY_BLOCKS: readonly EligibilityBlock[] = BLOCK_ORDER.map((id) => ({
  id,
  label: ELIGIBILITY_REASON_LABEL[id],
  doctors: BLOCK_COUNTS[id],
  share: roundOneDecimal((BLOCK_COUNTS[id] / PORTFOLIO_TARGET_DOCTORS) * 100),
  attestation: id === 'territory_blocked' ? STOCKOUT_BLOCK.attestation : ELIGIBILITY_ATTESTATION,
}))

function requireSegment(id: SegmentId): PortfolioSegment {
  const found = SEGMENT_DISTRIBUTION.find((segment) => segment.id === id)
  if (!found) throw new Error(`Segmento ausente: ${id}`)
  return found
}

export const CONVERT_SEGMENT = requireSegment('convert')

/** Decisão que a segmentação alimenta: o plano de alocação do ciclo. */
export const HCP_SEGMENTATION_DECISION_ID = ALLOCATION_DECISION_ID

export const HCP_SEGMENTATION_FILTERS = [
  { label: 'Ciclo', value: CYCLE_LABEL },
  { label: 'Campanha', value: 'Losartana Plus — Genéricos' },
  { label: 'Especialidade', value: 'Todas' },
] as const
