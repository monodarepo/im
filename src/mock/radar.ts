import { combine, type Attestation, type Confidence } from '../domain/attestation'
import { daysAgo, daysFromNow, type IsoDate } from '../domain/today'
import { DECISIONS } from './decisions'
import { OPPORTUNITIES, TOTAL_OPPORTUNITY_BRL, type Opportunity } from './opportunities'
import { createRandom, MOCK_SEED } from './random'
import { IQVIA, NEOGRID_DISTRIBUIDORES, SCANNTECH } from './sources'

/**
 * Radar de Oportunidades (módulo 1.7 do ESCOPO).
 *
 * O ranking cruza quatro eixos: valor, urgência, confiança e esforço. Valor e
 * confiança são canônicos — vêm de `OPPORTUNITIES` e do atestado de cada
 * oportunidade, sem reinterpretação.
 *
 * NOTA: não consta do ESCOPO — urgência, esforço e custo da não ação. A seção
 * 10 fixa apenas título, impacto em reais e decisão de cada oportunidade. Os
 * três eixos restantes são derivados de `createRandom(MOCK_SEED + n)`, com
 * semente fixa por posição, para que o radar seja idêntico em qualquer máquina.
 * Nenhum deles altera valor, título ou identificador de decisão.
 */

export type Urgency = 'critical' | 'high' | 'medium' | 'low'
export type Effort = 'low' | 'medium' | 'high'

export const URGENCY_LABEL: Record<Urgency, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
}

export const EFFORT_LABEL: Record<Effort, string> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
}

/**
 * Custo de deixar a oportunidade parada, decomposto nas três parcelas que a
 * operação consegue enxergar em sistema: venda que não acontece, frete que
 * precisa ser emergencial para repor e estoque que vence antes de girar.
 *
 * NOTA: não consta do ESCOPO — parcelas e total derivados do impacto canônico.
 */
export type InactionCost = {
  readonly lostSalesBrl: number
  readonly emergencyFreightBrl: number
  readonly obsolescenceBrl: number
  readonly totalBrl: number
  readonly attestation: Attestation
}

export type RadarEntry = {
  readonly id: string
  readonly rank: number
  readonly title: string
  readonly impactBrl: number
  /** Recorte da oportunidade: UF isolada ou agregado regional. */
  readonly scopeLabel: string
  /** `null` enquanto a oportunidade não virou Decisão. */
  readonly decisionId: string | null
  /** `true` para as cinco oportunidades priorizadas da seção 10.2. */
  readonly canonical: boolean
  readonly urgency: Urgency
  /** Prazo em que a janela de ação se fecha. */
  readonly deadline: IsoDate
  readonly daysToDeadline: number
  readonly effort: Effort
  readonly effortWeeks: number
  readonly confidence: Confidence
  readonly attestation: Attestation
  readonly inactionCost: InactionCost
}

/**
 * Horizonte da projeção de custo da não ação, em dias.
 *
 * NOTA: não consta do ESCOPO.
 */
export const INACTION_HORIZON_DAYS = 90

/**
 * Atestado do modelo de custo da não ação. Declarado à mão em vez de combinar
 * SAP com Neogrid: as duas fontes são observadas, e o custo projetado é
 * estimado — herdar `observed` faria o número parecer mais firme do que é.
 *
 * NOTA: não consta do ESCOPO.
 */
const INACTION_MODEL: Attestation = {
  source: ['sap', 'neogrid'],
  asOf: daysAgo(4),
  lagDays: 7,
  confidence: 'medium',
  quality: 'partial',
  method: 'estimated',
}

type RadarSeed = {
  readonly title: string
  readonly impactBrl: number
  readonly scopeLabel: string
  readonly decisionId: string | null
  readonly canonical: boolean
  readonly attestation: Attestation
}

function scopeLabelOf(opportunity: Opportunity): string {
  return opportunity.scope.kind === 'uf' ? opportunity.scope.uf : opportunity.scope.label
}

const CANONICAL_SEEDS: readonly RadarSeed[] = OPPORTUNITIES.map((opportunity) => ({
  title: opportunity.title,
  impactBrl: opportunity.impactBrl,
  scopeLabel: scopeLabelOf(opportunity),
  decisionId: opportunity.decisionId,
  canonical: true,
  attestation: opportunity.attestation,
}))

/**
 * Candidatas em triagem: oportunidades detectadas que ainda não viraram
 * Decisão. Existem para demonstrar a conversão — o botão de transformar em
 * Decisão só tem o que fazer se houver oportunidade sem decisão.
 *
 * NOTA: não consta do ESCOPO — título, recorte e valor. Ficam propositalmente
 * abaixo da menor oportunidade priorizada (R$ 1,6M), então nunca deslocam o
 * ranking canônico nem entram no total de R$ 14,2M da seção 10.2.
 */
const CANDIDATE_DRAFTS: readonly { title: string; scopeLabel: string; attestation: Attestation }[] = [
  {
    title: 'Ampliar sortimento de Losartana em farmácias independentes no PR',
    scopeLabel: 'PR',
    attestation: combine([SCANNTECH, NEOGRID_DISTRIBUIDORES]),
  },
  {
    title: 'Corrigir preço relativo de Paracetamol em GO',
    scopeLabel: 'GO',
    attestation: combine([SCANNTECH, IQVIA]),
  },
  {
    title: 'Recompor estoque de Dipirona em PE',
    scopeLabel: 'PE',
    attestation: NEOGRID_DISTRIBUIDORES,
  },
]

const candidateRandom = createRandom(MOCK_SEED + 101)

const CANDIDATE_SEEDS: readonly RadarSeed[] = CANDIDATE_DRAFTS.map((draft) => ({
  ...draft,
  decisionId: null,
  canonical: false,
  impactBrl: 400_000 + Math.round(candidateRandom() * 10) * 100_000,
}))
  .slice()
  .sort((a, b) => b.impactBrl - a.impactBrl)

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step
}

const URGENCY_THRESHOLDS: readonly { maxDays: number; urgency: Urgency }[] = [
  { maxDays: 14, urgency: 'critical' },
  { maxDays: 21, urgency: 'high' },
  { maxDays: 35, urgency: 'medium' },
]

function urgencyOf(days: number): Urgency {
  return URGENCY_THRESHOLDS.find((threshold) => days <= threshold.maxDays)?.urgency ?? 'low'
}

const EFFORT_THRESHOLDS: readonly { maxWeeks: number; effort: Effort }[] = [
  { maxWeeks: 4, effort: 'low' },
  { maxWeeks: 7, effort: 'medium' },
]

function effortOf(weeks: number): Effort {
  return EFFORT_THRESHOLDS.find((threshold) => weeks <= threshold.maxWeeks)?.effort ?? 'high'
}

/**
 * Decompõe o custo da não ação. A obsolescência absorve o arredondamento, então
 * as três parcelas somam exatamente o total exibido.
 */
function buildInactionCost(
  impactBrl: number,
  random: () => number,
  attestation: Attestation,
): InactionCost {
  const totalBrl = roundTo(impactBrl * (0.28 + random() * 0.22), 10_000)
  const lostSalesBrl = roundTo(totalBrl * (0.56 + random() * 0.14), 10_000)
  const emergencyFreightBrl = roundTo(totalBrl * (0.12 + random() * 0.1), 10_000)

  return {
    lostSalesBrl,
    emergencyFreightBrl,
    obsolescenceBrl: totalBrl - lostSalesBrl - emergencyFreightBrl,
    totalBrl,
    attestation: combine([attestation, INACTION_MODEL]),
  }
}

/** Deslocamento de semente do eixo de esforço, para não correlacioná-lo ao prazo. */
const EFFORT_SEED_OFFSET = 200

function enrich(seed: RadarSeed, index: number): RadarEntry {
  const random = createRandom(MOCK_SEED + index + 1)
  const effortRandom = createRandom(MOCK_SEED + EFFORT_SEED_OFFSET + index + 1)

  const daysToDeadline = 7 + Math.round(random() * 38)
  const effortWeeks = 2 + Math.round(effortRandom() * 8)

  return {
    id: seed.decisionId ?? `radar-${index + 1}`,
    rank: index + 1,
    title: seed.title,
    impactBrl: seed.impactBrl,
    scopeLabel: seed.scopeLabel,
    decisionId: seed.decisionId,
    canonical: seed.canonical,
    urgency: urgencyOf(daysToDeadline),
    deadline: daysFromNow(daysToDeadline),
    daysToDeadline,
    effort: effortOf(effortWeeks),
    effortWeeks,
    confidence: seed.attestation.confidence,
    attestation: seed.attestation,
    inactionCost: buildInactionCost(seed.impactBrl, random, seed.attestation),
  }
}

/** As cinco priorizadas primeiro, na ordem canônica; as candidatas depois. */
export const RADAR_ENTRIES: readonly RadarEntry[] = [...CANONICAL_SEEDS, ...CANDIDATE_SEEDS].map(
  enrich,
)

export const RADAR_CANONICAL_COUNT = CANONICAL_SEEDS.length
export const RADAR_CANDIDATE_COUNT = CANDIDATE_SEEDS.length

/** Impacto priorizado da seção 10.2 — só as cinco canônicas entram. */
export const RADAR_PRIORITIZED_BRL = TOTAL_OPPORTUNITY_BRL

export const INACTION_TOTAL_BRL = RADAR_ENTRIES.reduce(
  (sum, entry) => sum + entry.inactionCost.totalBrl,
  0,
)

/** Procedência do radar inteiro: o elo mais fraco entre as oportunidades. */
export const RADAR_ATTESTATION: Attestation = combine(
  RADAR_ENTRIES.map((entry) => entry.attestation),
)

export const INACTION_ATTESTATION: Attestation = combine(
  RADAR_ENTRIES.map((entry) => entry.inactionCost.attestation),
)

export type RadarAxis = 'value' | 'urgency' | 'confidence' | 'effort'

export const RADAR_AXES: readonly { id: RadarAxis; label: string; hint: string }[] = [
  { id: 'value', label: 'Valor', hint: 'Impacto em reais, do maior para o menor' },
  { id: 'urgency', label: 'Urgência', hint: 'Janela de ação mais curta primeiro' },
  { id: 'confidence', label: 'Confiança', hint: 'Atestado mais firme primeiro' },
  { id: 'effort', label: 'Esforço', hint: 'Menor esforço de execução primeiro' },
]

const URGENCY_RANK: Record<Urgency, number> = { critical: 3, high: 2, medium: 1, low: 0 }
const EFFORT_RANK: Record<Effort, number> = { low: 0, medium: 1, high: 2 }
const CONFIDENCE_RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 }

/**
 * Ordena pelo eixo escolhido, do melhor para o pior. Empate cai sempre no
 * impacto em reais: o valor é o único eixo canônico e serve de desempate
 * estável, então a tabela nunca troca de ordem entre renderizações.
 */
export function compareByAxis(a: RadarEntry, b: RadarEntry, axis: RadarAxis): number {
  const byImpact = b.impactBrl - a.impactBrl

  switch (axis) {
    case 'value':
      return byImpact
    case 'urgency':
      return URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency] ||
        a.daysToDeadline - b.daysToDeadline ||
        byImpact
    case 'confidence':
      return CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence] || byImpact
    case 'effort':
      return EFFORT_RANK[a.effort] - EFFORT_RANK[b.effort] ||
        a.effortWeeks - b.effortWeeks ||
        byImpact
  }
}

export function sortByAxis(
  entries: readonly RadarEntry[],
  axis: RadarAxis,
  descending: boolean,
): RadarEntry[] {
  const sorted = [...entries].sort((a, b) => compareByAxis(a, b, axis))
  return descending ? sorted : sorted.reverse()
}

/**
 * Próximo identificador da sequência de decisões, a partir do que já existe.
 * Determinístico: não depende de relógio nem de contador global.
 */
export function nextDecisionId(offset: number): string {
  const sequence = DECISIONS.length + offset + 1
  return `D-2026-${String(sequence).padStart(4, '0')}`
}

/** Parcelas do custo da não ação, na ordem em que a tela as decompõe. */
export const INACTION_PARTS: readonly {
  readonly id: keyof Omit<InactionCost, 'totalBrl' | 'attestation'>
  readonly label: string
}[] = [
  { id: 'lostSalesBrl', label: 'Venda perdida' },
  { id: 'emergencyFreightBrl', label: 'Frete emergencial' },
  { id: 'obsolescenceBrl', label: 'Obsolescência' },
]
