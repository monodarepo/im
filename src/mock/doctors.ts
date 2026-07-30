import type { UfCode } from '../assets/brazil-uf'
import { combine, type Attestation } from '../domain/attestation'
import { OPPORTUNITIES, type Opportunity } from './opportunities'
import { createRandom, MOCK_SEED } from './random'
import { CRM_SFA, IQVIA } from './sources'

/**
 * Médico 360° (módulo 1.6 do ESCOPO).
 *
 * A leitura primária da tela é agregada: especialidade no eixo, região como
 * corte. A lista nominal existe para dar concretude ao agregado, não para virar
 * prontuário comercial de um profissional.
 *
 * Duas fontes sustentam o módulo, com defasagens diferentes: IQVIA responde por
 * prescrição (semanas de atraso) e CRM/SFA por cobertura e visita (dias). O
 * potencial nasce das duas, então herda o elo mais fraco.
 */

export type RegionId = 'norte' | 'nordeste' | 'centro-oeste' | 'sudeste' | 'sul'

/** Recorte regional ativo. `brasil` é o agregado nacional. */
export type RegionScope = 'brasil' | RegionId

export type SpecialtyId =
  | 'cardiologia'
  | 'clinica-geral'
  | 'endocrinologia'
  | 'ginecologia'
  | 'pediatria'

export const REGION_LABEL: Record<RegionId, string> = {
  norte: 'Norte',
  nordeste: 'Nordeste',
  'centro-oeste': 'Centro-Oeste',
  sudeste: 'Sudeste',
  sul: 'Sul',
}

export const REGION_ORDER: readonly RegionId[] = [
  'sudeste',
  'nordeste',
  'sul',
  'centro-oeste',
  'norte',
]

export const REGION_SCOPES: readonly RegionScope[] = ['brasil', ...REGION_ORDER]

export const REGION_SCOPE_LABEL: Record<RegionScope, string> = {
  brasil: 'Brasil',
  ...REGION_LABEL,
}

/** Divisão regional oficial do IBGE — geografia, não dado de mercado. */
export const UF_REGION: Record<UfCode, RegionId> = {
  AC: 'norte',
  AM: 'norte',
  AP: 'norte',
  PA: 'norte',
  RO: 'norte',
  RR: 'norte',
  TO: 'norte',
  AL: 'nordeste',
  BA: 'nordeste',
  CE: 'nordeste',
  MA: 'nordeste',
  PB: 'nordeste',
  PE: 'nordeste',
  PI: 'nordeste',
  RN: 'nordeste',
  SE: 'nordeste',
  DF: 'centro-oeste',
  GO: 'centro-oeste',
  MS: 'centro-oeste',
  MT: 'centro-oeste',
  ES: 'sudeste',
  MG: 'sudeste',
  RJ: 'sudeste',
  SP: 'sudeste',
  PR: 'sul',
  RS: 'sul',
  SC: 'sul',
}

export const SPECIALTY_LABEL: Record<SpecialtyId, string> = {
  cardiologia: 'Cardiologia',
  'clinica-geral': 'Clínica Geral',
  endocrinologia: 'Endocrinologia',
  ginecologia: 'Ginecologia',
  pediatria: 'Pediatria',
}

export const SPECIALTY_ORDER: readonly SpecialtyId[] = [
  'clinica-geral',
  'cardiologia',
  'pediatria',
  'ginecologia',
  'endocrinologia',
]

/** Prescrição vem do painel médico; cobertura e visita, da força de vendas. */
export const PRESCRIPTION_ATTESTATION: Attestation = IQVIA
export const COVERAGE_ATTESTATION: Attestation = CRM_SFA
export const POTENTIAL_ATTESTATION: Attestation = combine([IQVIA, CRM_SFA])

function requireOpportunity(decisionId: string): Opportunity {
  const found = OPPORTUNITIES.find((opportunity) => opportunity.decisionId === decisionId)
  if (!found) throw new Error(`Oportunidade canônica ausente: ${decisionId}`)
  return found
}

/**
 * Oportunidade canônica que esta tela dimensiona: "Aumentar cobertura de
 * médicos, Cardiologia RJ" (seção 10.2 do ESCOPO). O valor não é redigitado
 * aqui — vem do registro de oportunidades, para que exista um dono só.
 */
export const DOCTOR_COVERAGE_OPPORTUNITY = requireOpportunity('D-2026-0003')

/* -------------------------------------------------------------------------- */
/* NOTA: não consta do ESCOPO — parâmetros de derivação                        */
/*                                                                             */
/* A seção 10 fixa apenas o valor da oportunidade de cobertura em Cardiologia  */
/* RJ. Universo médico, taxa de cobertura e produtividade de prescrição são    */
/* derivados das bandas abaixo com semente fixa (`MOCK_SEED`), de modo que a   */
/* demonstração saia idêntica em qualquer máquina. Quando a seção 10.4 estiver */
/* disponível, estes parâmetros saem e os valores canônicos entram.            */
/* -------------------------------------------------------------------------- */

const NATIONAL_TARGET_DOCTORS: Record<SpecialtyId, number> = {
  'clinica-geral': 28_600,
  cardiologia: 12_400,
  pediatria: 15_800,
  ginecologia: 13_200,
  endocrinologia: 7_900,
}

const REGION_SHARE: Record<RegionId, number> = {
  sudeste: 0.42,
  nordeste: 0.21,
  sul: 0.17,
  'centro-oeste': 0.11,
  norte: 0.09,
}

const COVERAGE_RATE_MIN = 0.36
const COVERAGE_RATE_MAX = 0.74

const PRESCRIPTIONS_PER_DOCTOR_MIN = 42
const PRESCRIPTIONS_PER_DOCTOR_MAX = 96

const COVERAGE_DELTA_MIN_PP = -1.8
const COVERAGE_DELTA_MAX_PP = 2.6

/** Participação do Rio de Janeiro no universo médico do Sudeste. */
const RJ_SHARE_OF_SOUTHEAST = 0.26

const POTENTIAL_ROUNDING_BRL = 10_000

const DOCTOR_POTENTIAL_MULTIPLE_MIN = 2.5
const DOCTOR_POTENTIAL_MULTIPLE_MAX = 7.5
const DOCTOR_POTENTIAL_ROUNDING_BRL = 1_000

const DOCTOR_VISITS_MIN = 3
const DOCTOR_VISITS_MAX = 14
const DOCTOR_LAST_VISIT_MIN_DAYS = 4
const DOCTOR_LAST_VISIT_MAX_DAYS = 68

function between(random: () => number, min: number, max: number): number {
  return min + random() * (max - min)
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

/** Célula do agregado: uma especialidade dentro de uma região. */
export type DoctorSegment = {
  readonly specialty: SpecialtyId
  readonly region: RegionId
  readonly targetDoctors: number
  readonly coveredDoctors: number
  readonly prescriptions: number
  readonly coverageDeltaPp: number
  readonly potentialBrl: number
}

type SegmentDraft = Omit<DoctorSegment, 'potentialBrl'>

function buildDrafts(): readonly SegmentDraft[] {
  return SPECIALTY_ORDER.flatMap((specialty, specialtyIndex) =>
    REGION_ORDER.map((region, regionIndex) => {
      const random = createRandom(
        MOCK_SEED + specialtyIndex * REGION_ORDER.length + regionIndex + 1,
      )
      const targetDoctors = Math.round(NATIONAL_TARGET_DOCTORS[specialty] * REGION_SHARE[region])
      const coveredDoctors = Math.round(
        targetDoctors * between(random, COVERAGE_RATE_MIN, COVERAGE_RATE_MAX),
      )
      const prescriptions = Math.round(
        coveredDoctors * between(random, PRESCRIPTIONS_PER_DOCTOR_MIN, PRESCRIPTIONS_PER_DOCTOR_MAX),
      )
      const coverageDeltaPp = roundOneDecimal(
        between(random, COVERAGE_DELTA_MIN_PP, COVERAGE_DELTA_MAX_PP),
      )
      return { specialty, region, targetDoctors, coveredDoctors, prescriptions, coverageDeltaPp }
    }),
  )
}

const DRAFTS = buildDrafts()

function uncovered(draft: SegmentDraft): number {
  return draft.targetDoctors - draft.coveredDoctors
}

/**
 * Valor de um médico não coberto, calibrado pelo canônico: a fatia do Rio de
 * Janeiro dentro de Cardiologia/Sudeste fecha exatamente nos R$ 2,7M de
 * D-2026-0003. Todas as demais células escalam a partir dessa mesma taxa, então
 * o agregado inteiro tem uma âncora só.
 */
function potentialPerUncoveredDoctor(): number {
  const anchor = DRAFTS.find(
    (draft) => draft.specialty === 'cardiologia' && draft.region === 'sudeste',
  )
  if (!anchor) throw new Error('Célula âncora Cardiologia/Sudeste ausente')
  return DOCTOR_COVERAGE_OPPORTUNITY.impactBrl / (uncovered(anchor) * RJ_SHARE_OF_SOUTHEAST)
}

export const POTENTIAL_PER_UNCOVERED_DOCTOR_BRL = potentialPerUncoveredDoctor()

export const DOCTOR_SEGMENTS: readonly DoctorSegment[] = DRAFTS.map((draft) => ({
  ...draft,
  potentialBrl: roundTo(
    uncovered(draft) * POTENTIAL_PER_UNCOVERED_DOCTOR_BRL,
    POTENTIAL_ROUNDING_BRL,
  ),
}))

/** Linha do agregado por especialidade, já resolvida para o recorte ativo. */
export type SpecialtyRow = {
  readonly specialty: SpecialtyId
  readonly label: string
  readonly targetDoctors: number
  readonly coveredDoctors: number
  readonly uncoveredDoctors: number
  readonly coveragePercent: number
  readonly coverageDeltaPp: number
  readonly prescriptions: number
  readonly potentialBrl: number
}

function segmentsOf(scope: RegionScope): readonly DoctorSegment[] {
  return scope === 'brasil'
    ? DOCTOR_SEGMENTS
    : DOCTOR_SEGMENTS.filter((segment) => segment.region === scope)
}

function coveragePercent(covered: number, target: number): number {
  return target === 0 ? 0 : roundOneDecimal((covered / target) * 100)
}

/** Média da variação ponderada pelo universo de cada célula. */
function weightedDelta(segments: readonly DoctorSegment[]): number {
  const weight = segments.reduce((sum, segment) => sum + segment.targetDoctors, 0)
  if (weight === 0) return 0
  const total = segments.reduce(
    (sum, segment) => sum + segment.coverageDeltaPp * segment.targetDoctors,
    0,
  )
  return roundOneDecimal(total / weight)
}

export function specialtyRows(scope: RegionScope): readonly SpecialtyRow[] {
  const scoped = segmentsOf(scope)

  return SPECIALTY_ORDER.map((specialty) => {
    const cells = scoped.filter((segment) => segment.specialty === specialty)
    const targetDoctors = cells.reduce((sum, cell) => sum + cell.targetDoctors, 0)
    const coveredDoctors = cells.reduce((sum, cell) => sum + cell.coveredDoctors, 0)

    return {
      specialty,
      label: SPECIALTY_LABEL[specialty],
      targetDoctors,
      coveredDoctors,
      uncoveredDoctors: targetDoctors - coveredDoctors,
      coveragePercent: coveragePercent(coveredDoctors, targetDoctors),
      coverageDeltaPp: weightedDelta(cells),
      prescriptions: cells.reduce((sum, cell) => sum + cell.prescriptions, 0),
      potentialBrl: cells.reduce((sum, cell) => sum + cell.potentialBrl, 0),
    }
  })
}

export type DoctorTotals = {
  readonly targetDoctors: number
  readonly coveredDoctors: number
  readonly uncoveredDoctors: number
  readonly coveragePercent: number
  readonly coverageDeltaPp: number
  readonly prescriptions: number
  readonly potentialBrl: number
}

export function doctorTotals(scope: RegionScope): DoctorTotals {
  const scoped = segmentsOf(scope)
  const targetDoctors = scoped.reduce((sum, segment) => sum + segment.targetDoctors, 0)
  const coveredDoctors = scoped.reduce((sum, segment) => sum + segment.coveredDoctors, 0)

  return {
    targetDoctors,
    coveredDoctors,
    uncoveredDoctors: targetDoctors - coveredDoctors,
    coveragePercent: coveragePercent(coveredDoctors, targetDoctors),
    coverageDeltaPp: weightedDelta(scoped),
    prescriptions: scoped.reduce((sum, segment) => sum + segment.prescriptions, 0),
    potentialBrl: scoped.reduce((sum, segment) => sum + segment.potentialBrl, 0),
  }
}

/* -------------------------------------------------------------------------- */
/* Os três primeiros médicos são canônicos da seção 10.4: nome, especialidade  */
/* e faixa de potencial vêm do ESCOPO, e a última visita de Alencar e Vieira   */
/* também. São os mesmos que abrem o Next Best Action do GTM.                  */
/*                                                                             */
/* NOTA: não consta do ESCOPO — os dois últimos médicos, e a UF dos três       */
/* canônicos. Nomes fictícios, sem correspondência com profissionais reais.    */
/* Alencar é cardiologista no Rio de Janeiro para a lista conversar com a      */
/* oportunidade canônica D-2026-0003.                                          */
/* -------------------------------------------------------------------------- */

/** Faixa de potencial do médico, como o ESCOPO a declara. */
export type PotentialTier = 'high' | 'medium' | 'low'

export const POTENTIAL_TIER_LABEL: Record<PotentialTier, string> = {
  high: 'Alto potencial',
  medium: 'Médio potencial',
  low: 'Baixo potencial',
}

export type Doctor = {
  readonly id: string
  readonly name: string
  readonly specialty: SpecialtyId
  readonly uf: UfCode
  readonly region: RegionId
  readonly prescriptions: number
  readonly visits: number
  /** Dias desde a última visita registrada, medidos de `HOJE`. */
  readonly lastVisitDaysAgo: number
  readonly potentialBrl: number
  readonly potentialTier: PotentialTier
  /** `true` para os médicos fixados na seção 10.4. */
  readonly canonical: boolean
  /** Decisão que endereça o médico, quando existe uma priorizada. */
  readonly decisionId?: string
}

type DoctorSeed = {
  readonly id: string
  readonly name: string
  readonly specialty: SpecialtyId
  readonly uf: UfCode
  readonly potentialTier: PotentialTier
  readonly canonical: boolean
  /** Sobrepõe a derivação quando o ESCOPO fixa a última visita. */
  readonly lastVisitDaysAgo?: number
  readonly decisionId?: string
}

const DOCTOR_SEEDS: readonly DoctorSeed[] = [
  {
    id: 'MD-001',
    name: 'Dr. Ricardo Alencar',
    specialty: 'cardiologia',
    uf: 'RJ',
    potentialTier: 'high',
    canonical: true,
    lastVisitDaysAgo: 21,
    decisionId: DOCTOR_COVERAGE_OPPORTUNITY.decisionId,
  },
  {
    id: 'MD-002',
    name: 'Dra. Camila Barros',
    specialty: 'clinica-geral',
    uf: 'SP',
    potentialTier: 'medium',
    canonical: true,
  },
  {
    id: 'MD-003',
    name: 'Dr. Marcelo Vieira',
    specialty: 'cardiologia',
    uf: 'MG',
    potentialTier: 'high',
    canonical: true,
    lastVisitDaysAgo: 35,
  },
  {
    id: 'MD-004',
    name: 'Dra. Luciana Peixoto',
    specialty: 'pediatria',
    uf: 'RS',
    potentialTier: 'medium',
    canonical: false,
  },
  {
    id: 'MD-005',
    name: 'Dr. Anselmo Tavares',
    specialty: 'ginecologia',
    uf: 'PE',
    potentialTier: 'low',
    canonical: false,
  },
]

const DOCTOR_SEED_OFFSET = 500

export const DOCTORS: readonly Doctor[] = DOCTOR_SEEDS.map((seed, index) => {
  const random = createRandom(MOCK_SEED + DOCTOR_SEED_OFFSET + index)
  const prescriptions = Math.round(
    between(random, PRESCRIPTIONS_PER_DOCTOR_MIN, PRESCRIPTIONS_PER_DOCTOR_MAX),
  )
  const visits = Math.round(between(random, DOCTOR_VISITS_MIN, DOCTOR_VISITS_MAX))
  const lastVisitDaysAgo =
    seed.lastVisitDaysAgo ??
    Math.round(between(random, DOCTOR_LAST_VISIT_MIN_DAYS, DOCTOR_LAST_VISIT_MAX_DAYS))
  const potentialBrl = roundTo(
    POTENTIAL_PER_UNCOVERED_DOCTOR_BRL *
      between(random, DOCTOR_POTENTIAL_MULTIPLE_MIN, DOCTOR_POTENTIAL_MULTIPLE_MAX),
    DOCTOR_POTENTIAL_ROUNDING_BRL,
  )

  return {
    id: seed.id,
    name: seed.name,
    specialty: seed.specialty,
    uf: seed.uf,
    region: UF_REGION[seed.uf],
    prescriptions,
    visits,
    lastVisitDaysAgo,
    potentialBrl,
    potentialTier: seed.potentialTier,
    canonical: seed.canonical,
    ...(seed.decisionId ? { decisionId: seed.decisionId } : {}),
  }
})

/** Total de médicos nominais listados — a lista é secundária ao agregado. */
export const DOCTOR_COUNT = DOCTORS.length
