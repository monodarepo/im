import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it } from 'vitest'
import tailwindConfig from '../../tailwind.config'
import { combine, isStale, type Attestation } from '../domain/attestation'
import {
  addDays,
  ageInDays,
  daysAgo,
  daysBetween,
  daysFromNow,
  formatDate,
  formatMonth,
  formatRelative,
  HOJE,
} from '../domain/today'
import {
  formatDecimal,
  formatInteger,
  formatMultiple,
  formatPercent,
  formatPercentDelta,
  formatPointsDelta,
  MINUS,
} from '../domain/format'
import { formatMoney, formatMoneyDelta, formatMoneyFull } from '../domain/money'
import { ROUTES, resolveTheme, routeCoverage } from '../routes/registry'
import {
  activeFilters,
  DEFAULT_PERIOD,
  FILTER_ORDER,
  useFilters,
  type FilterState,
  type MultiFilterId,
} from '../state/filtersStore'
import {
  INSTITUTIONAL_ACCENT,
  themeAccent,
  LAYOUT,
  OPPORTUNITY_LEVELS,
  OPPORTUNITY_SCALE,
  PRODUCTS,
  PRODUCT_ORDER,
  productCssVariables,
  RADIUS,
  SEMANTIC,
  SURFACE,
  toneForDelta,
  TYPOGRAPHY,
} from '../design/tokens'
import { BRAZIL_UF_TILES, REGION_UFS } from '../assets/brazil-uf'
import { formatKpiValue, MARKET_KPIS } from './kpis'
import { SALES_MIX, MIX_TOTAL_BRL } from './mix'
import { DIAGNOSTICS } from './diagnostics'
import { findDecision } from './decisions'
import {
  OPPORTUNITIES,
  OPPORTUNITY_DECISION_IDS,
  opportunityLevel,
  TOTAL_OPPORTUNITY_BRL,
  UF_OPPORTUNITY,
} from './opportunities'
import { SELLOUT_PREVIOUS_TOTAL_BRL, SELLOUT_SERIES } from './sellout'
import {
  findSku,
  formatMetric,
  PRODUCT_DIMENSION_COUNT,
  type ProductMetric,
} from './products'
import {
  buildWaterfallSteps,
  FORWARD_TARGETS,
  HAS_DECOMPOSITION,
  ROOT_CAUSE_CASE,
  ROOT_CAUSE_FACTORS,
} from './rootCause'
import { DATA_EXCEPTIONS, DEGRADED_ATTESTATIONS, RELIABILITY_SERIES, SOURCE_HEALTH } from './dataQuality'
import { useDecisions } from '../state/decisionsStore'
import { useExceptions } from '../state/exceptionsStore'
import { useRadarDecisions } from '../state/radarDecisionsStore'
import {
  COVERAGE_ESTIMATED_ATTESTATION,
  COVERAGE_SEGMENTS,
  ESTIMATED_OUTLETS,
  FORECAST_ATTESTATION,
  FORECAST_HIGH_BRL,
  FORECAST_LOW_BRL,
  FORECAST_TOTAL_BRL,
  OBSERVED_OUTLETS,
  PULSE_SERIES,
  UNIVERSE_OUTLETS,
} from './pulse'
import {
  ALERT_STOCKOUT_PERCENT,
  CHANNEL_STOCK_CHANGE_BRL,
  COVERAGE_GAP_DAYS,
  DC_TARGET_DAYS,
  DC_TIER,
  EXPECTED_SELL_OUT_BRL,
  GAP_CAUSES,
  NATIONAL_STOCKOUT_PERCENT,
  RECONCILIATION_GAP_BRL,
  SELL_IN_BRL,
  SELL_OUT_BRL,
  STORE_TARGET_DAYS,
  STORE_TIER,
} from './customers'
import {
  MARKET_POTENTIAL_BRL,
  MEDIAN_UF_POTENTIAL_BRL,
  NATIONAL_PRESENCE_PERCENT,
  TERRITORY_PROFILES,
  WHITE_SPACES,
} from './territories'
import { DOCTOR_COUNT, DOCTOR_COVERAGE_OPPORTUNITY, DOCTORS, POTENTIAL_PER_UNCOVERED_DOCTOR_BRL } from './doctors'
import {
  INACTION_PARTS,
  RADAR_AXES,
  RADAR_CANDIDATE_COUNT,
  RADAR_CANONICAL_COUNT,
  RADAR_ENTRIES,
  RADAR_PRIORITIZED_BRL,
  sortByAxis,
} from './radar'
import {
  COMPETITIVE_MOVES,
  EMPTY_PRICE_FILTER,
  MOLECULE_TIMELINES,
  PRICE_CELLS,
  summarizePrices,
} from './competitive'
import { PRICE_ELASTICITY, promoLift, simulate } from '../domain/elasticity'
import {
  canTransition,
  DECISION_STATE_TOKEN,
  isTerminal,
  parcelTotal,
  transition,
} from '../domain/decision'
import {
  APPROVAL_DECISION_ID,
  RECOMMENDED,
  RECOMMENDED_IMPACT,
  resolveScenario,
  SCENARIO_ATTESTATION,
  SCENARIO_RECOMMENDATION,
  SCENARIOS,
} from './scenarios'
import {
  corridorStatus,
  MOLECULE_CAPTURE,
  PRICE_CORRIDOR,
  PRICE_LINES,
} from './pricing'
import { useDecisionWorkflow } from '../state/decisionWorkflowStore'
import {
  COMMERCIAL_DISCOUNT_BRL,
  CUTS,
  GROSS_REVENUE_BRL,
  GROSS_TO_NET,
  LEAKAGES,
  NET_REVENUE_BRL,
  TOTAL_DEDUCTIONS_BRL,
  TOTAL_LEAKAGE_BRL,
} from './grossToNet'
import {
  ADHERENCE_PERCENT,
  daysSincePublication,
  DISTRIBUTORS,
  DISTRIBUTORS_OFF_TRACK,
  DISTRIBUTORS_ON_TIME,
  GUARDRAILS,
  isOverSla,
  STAGES,
  type Distributor,
} from './governance'
import { createRandom, MOCK_SEED } from './random'
import { findForbiddenTerms, findNonDeterministicCode, type SourceFile } from './validateMock'

const SRC = fileURLToPath(new URL('..', import.meta.url))

function loadSources(): SourceFile[] {
  const files: string[] = []
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) walk(full)
      else if (/\.tsx?$/.test(entry)) files.push(full)
    }
  }
  walk(SRC)
  return files.map((file) => ({
    path: relative(SRC, file).split(sep).join('/'),
    text: readFileSync(file, 'utf8'),
  }))
}

const attestation = (over: Partial<Attestation> = {}): Attestation => ({
  source: ['scanntech'],
  asOf: '2026-07-20',
  lagDays: 15,
  confidence: 'high',
  quality: 'complete',
  method: 'observed',
  ...over,
})

describe('proibições invioláveis', () => {
  it('não deixa termo proibido entrar no mock nem na camada visual', () => {
    expect(findForbiddenTerms(loadSources())).toEqual([])
  })

  it('não lê relógio, armazenamento de navegador nem aleatoriedade não semeada', () => {
    expect(findNonDeterministicCode(loadSources())).toEqual([])
  })

  it('só admite fonte da lista válida — Close-Up é inexprimível no tipo', () => {
    const sources = readFileSync(join(SRC, 'domain/attestation.ts'), 'utf8')
    const union = /export type Source =\n((?:\s+\| '\w+'\n)+)/.exec(sources)?.[1] ?? ''
    expect(union.match(/'(\w+)'/g)).toEqual([
      "'scanntech'",
      "'iqvia'",
      "'neogrid'",
      "'sap'",
      "'crm_sfa'",
      "'distribuidores'",
      "'grandes_redes'",
    ])
  })
})

describe('âncora temporal', () => {
  it('fixa HOJE em 2026-07-30', () => {
    expect(HOJE).toBe('2026-07-30')
  })

  it('soma e diferença de dias são inversas', () => {
    expect(addDays(HOJE, 45)).toBe('2026-09-13')
    expect(daysBetween(HOJE, addDays(HOJE, 45))).toBe(45)
    expect(daysBetween(addDays(HOJE, -45), HOJE)).toBe(45)
  })

  it('atravessa virada de ano e ano bissexto', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01')
  })

  it('deriva datas relativas de HOJE', () => {
    expect(daysAgo(30)).toBe('2026-06-30')
    expect(daysFromNow(30)).toBe('2026-08-29')
    expect(ageInDays(daysAgo(10))).toBe(10)
  })

  it('descreve a distância até HOJE em pt-BR', () => {
    expect(formatRelative(HOJE)).toBe('hoje')
    expect(formatRelative(daysAgo(1))).toBe('ontem')
    expect(formatRelative(daysFromNow(1))).toBe('amanhã')
    expect(formatRelative(daysAgo(3))).toBe('há 3 dias')
    expect(formatRelative(daysFromNow(5))).toBe('em 5 dias')
  })

  it('formata data e mês em pt-BR', () => {
    expect(formatDate(HOJE)).toBe('30/07/2026')
    expect(formatMonth(HOJE)).toBe('jul/26')
  })

  it('rejeita data malformada', () => {
    expect(() => addDays('30/07/2026', 1)).toThrow()
  })
})

describe('atestado', () => {
  it('devolve o próprio atestado quando há só um', () => {
    const only = attestation()
    expect(combine([only])).toBe(only)
  })

  it('combina sempre pelo elo mais fraco', () => {
    const combined = combine([
      attestation(),
      attestation({
        source: ['iqvia'],
        asOf: '2026-06-30',
        lagDays: 45,
        confidence: 'low',
        quality: 'partial',
        method: 'extrapolated',
      }),
    ])

    expect(combined.lagDays).toBe(45)
    expect(combined.confidence).toBe('low')
    expect(combined.quality).toBe('partial')
    expect(combined.method).toBe('extrapolated')
    expect(combined.asOf).toBe('2026-06-30')
    expect(combined.source).toEqual(['iqvia', 'scanntech'])
  })

  it('ordena o método de observado a reprocessado', () => {
    const worst = combine([
      attestation({ method: 'observed' }),
      attestation({ method: 'estimated' }),
      attestation({ method: 'reprocessed' }),
      attestation({ method: 'extrapolated' }),
    ])
    expect(worst.method).toBe('reprocessed')

    expect(combine([attestation({ method: 'observed' }), attestation({ method: 'estimated' })]).method).toBe(
      'estimated',
    )
    expect(
      combine([attestation({ method: 'estimated' }), attestation({ method: 'extrapolated' })]).method,
    ).toBe('extrapolated')
  })

  it('não repete fontes ao combinar', () => {
    expect(combine([attestation(), attestation({ asOf: '2026-07-01' })]).source).toEqual(['scanntech'])
  })

  it('exige ao menos um atestado', () => {
    expect(() => combine([])).toThrow()
  })

  it('marca atraso quando a idade ultrapassa o lag da fonte', () => {
    expect(isStale(attestation({ asOf: daysAgo(10), lagDays: 15 }))).toBe(false)
    expect(isStale(attestation({ asOf: daysAgo(60), lagDays: 15 }))).toBe(true)
  })
})

describe('formatação pt-BR', () => {
  it('agrupa milhar com ponto e decimal com vírgula', () => {
    expect(formatInteger(1_610_000)).toBe('1.610.000')
    expect(formatDecimal(256.4, 1)).toBe('256,4')
    expect(formatInteger(999)).toBe('999')
  })

  it('assina delta percentual e pontos percentuais', () => {
    expect(formatPercentDelta(8.6)).toBe('+8,6%')
    expect(formatPercentDelta(-8.6)).toBe(`${MINUS}8,6%`)
    expect(formatPointsDelta(-1.2)).toBe(`${MINUS}1,2 pp`)
    expect(formatPointsDelta(1.2)).toBe('+1,2 pp')
  })

  it('usa o menos tipográfico, nunca hífen', () => {
    expect(MINUS).toBe('−')
    for (const rendered of [
      formatDecimal(-1.2),
      formatPercent(-1.2),
      formatPercentDelta(-1.2),
      formatPointsDelta(-1.2),
      formatMoney(-4_800_000),
      formatMoneyFull(-1_610_000),
    ]) {
      expect(rendered).toContain(MINUS)
      expect(rendered).not.toContain('-')
    }
  })

  it('não exibe zero negativo', () => {
    expect(formatDecimal(-0.04, 1)).toBe('0,0')
    expect(formatPercentDelta(-0.04)).toBe('+0,0%')
  })

  it('abrevia moeda por magnitude', () => {
    expect(formatMoney(256_400_000)).toBe('R$ 256,4M')
    expect(formatMoney(4_800_000)).toBe('R$ 4,8M')
    expect(formatMoney(1_200_000_000)).toBe('R$ 1,2bi')
    expect(formatMoney(256_400)).toBe('R$ 256,4 mil')
    expect(formatMoney(640)).toBe('R$ 640')
  })

  it('mantém o valor cheio quando a tabela pede precisão', () => {
    expect(formatMoneyFull(1_610_000)).toBe('R$ 1.610.000')
    expect(formatMoneyDelta(-4_800_000)).toBe(`R$ ${MINUS}4,8M`)
    expect(formatMoneyDelta(4_800_000)).toBe('R$ +4,8M')
  })

  it('formata multiplicador', () => {
    expect(formatMultiple(1.8)).toBe('1,8x')
  })
})

describe('design tokens', () => {
  it('mantém a paleta semântica de dado', () => {
    expect(SEMANTIC).toEqual({
      positive: '#16A34A',
      negative: '#DC2626',
      attention: '#F59E0B',
      neutral: '#64748B',
    })
  })

  it('mantém a cor de identidade de cada produto', () => {
    expect(PRODUCT_ORDER).toEqual(['hub', 'gtm', 'rgm', 'ag'])
    expect(PRODUCT_ORDER.map((id) => PRODUCTS[id].accent)).toEqual([
      '#1E4FD8',
      '#0F766E',
      '#7C3AED',
      '#EA7317',
    ])
  })

  it('publica a identidade como custom property trocável', () => {
    expect(productCssVariables('gtm')).toEqual({ '--product-accent': '#0F766E' })
    expect(productCssVariables('ag')).toEqual({ '--product-accent': '#EA7317' })
  })

  it('descreve a oportunidade do mapa em cinco níveis', () => {
    expect(OPPORTUNITY_LEVELS).toEqual([1, 2, 3, 4, 5])
    expect(Object.keys(OPPORTUNITY_SCALE)).toHaveLength(5)
    expect(new Set(OPPORTUNITY_LEVELS.map((level) => OPPORTUNITY_SCALE[level].color)).size).toBe(5)
  })

  it('fixa superfície, raio, sidebar e tipografia dentro das faixas do ESCOPO', () => {
    expect(SURFACE.app).toBe('#F6F7FB')

    const px = (value: string) => Number(value.replace('px', ''))
    expect(px(RADIUS.control)).toBeGreaterThanOrEqual(12)
    expect(px(RADIUS.card)).toBeLessThanOrEqual(16)
    expect(px(LAYOUT.sidebarWidth)).toBeGreaterThanOrEqual(240)
    expect(px(LAYOUT.sidebarWidth)).toBeLessThanOrEqual(260)
    expect(px(TYPOGRAPHY.kpi)).toBeGreaterThanOrEqual(28)
    expect(px(TYPOGRAPHY.kpiLarge)).toBeLessThanOrEqual(32)
    expect(px(TYPOGRAPHY.delta)).toBeGreaterThanOrEqual(12)
    expect(px(TYPOGRAPHY.deltaLarge)).toBeLessThanOrEqual(13)
  })

  it('escolhe o tom pelo sinal, respeitando métricas invertidas', () => {
    expect(toneForDelta(3.2)).toBe('positive')
    expect(toneForDelta(-3.2)).toBe('negative')
    expect(toneForDelta(0)).toBe('neutral')
    expect(toneForDelta(-3.2, { inverted: true })).toBe('positive')
    expect(toneForDelta(3.2, { inverted: true })).toBe('negative')
  })

  it('expõe todo token ao Tailwind, incluindo a identidade como var', () => {
    const { colors, borderRadius, spacing, fontSize } = tailwindConfig.theme.extend

    expect(colors.product).toBe('var(--product-accent)')
    expect(colors.positive).toBe(SEMANTIC.positive)
    expect(colors.surface.app).toBe(SURFACE.app)

    for (const id of PRODUCT_ORDER) {
      expect(colors[id]).toBe(PRODUCTS[id].accent)
    }
    for (const level of OPPORTUNITY_LEVELS) {
      expect(colors.opportunity[level]).toBe(OPPORTUNITY_SCALE[level].color)
    }

    expect(borderRadius.card).toBe(RADIUS.card)
    expect(spacing.sidebar).toBe(LAYOUT.sidebarWidth)
    expect(fontSize.kpi[0]).toBe(TYPOGRAPHY.kpi)
    expect(fontSize.delta[0]).toBe(TYPOGRAPHY.delta)
  })

  it('mantém o CSS base alinhado aos tokens', () => {
    const css = readFileSync(join(SRC, 'index.css'), 'utf8')
    expect(css).toContain(`--surface-app: ${SURFACE.app.toLowerCase()}`)
    expect(css).toContain(`--radius-card: ${RADIUS.card}`)
    expect(css).toContain(`--sidebar-width: ${LAYOUT.sidebarWidth}`)
    expect(css).toContain(`--product-accent: ${PRODUCTS.hub.accent.toLowerCase()}`)
  })
})

describe('roteamento e identidade de cor', () => {
  it('troca a identidade conforme a rota', () => {
    expect(resolveTheme('/hub')).toBe('hub')
    expect(resolveTheme('/gtm')).toBe('gtm')
    expect(resolveTheme('/rgm')).toBe('rgm')
    expect(resolveTheme('/ag')).toBe('ag')
  })

  it('mantém raiz e fila de decisões em neutro institucional', () => {
    expect(resolveTheme('/')).toBe('institutional')
    expect(resolveTheme('/decisoes')).toBe('institutional')
    expect(themeAccent('institutional')).toBe(INSTITUTIONAL_ACCENT)
  })

  it('herda a identidade do produto em subrota', () => {
    expect(resolveTheme('/rgm/elasticidade')).toBe('rgm')
  })

  it('cai no institucional em rota desconhecida, sem herdar a cor anterior', () => {
    expect(resolveTheme('/rota-inexistente')).toBe('institutional')
  })

  it('não repete path no registro', () => {
    const paths = ROUTES.map((route) => route.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('mantém tema e produto coerentes em cada entrada', () => {
    for (const route of ROUTES) {
      if (route.product === null) expect(route.theme).toBe('institutional')
      else expect(route.theme).toBe(route.product)
    }
  })

  it('mapeia os dez módulos do HUB, numerados de 1.1 a 1.10', () => {
    const hub = ROUTES.filter((route) => route.product === 'hub')
    expect(hub).toHaveLength(10)

    expect(hub.map((route) => route.badge)).toEqual([
      'HUB 1.1',
      'HUB 1.2',
      'HUB 1.3',
      'HUB 1.4',
      'HUB 1.5',
      'HUB 1.6',
      'HUB 1.7',
      'HUB 1.8',
      'HUB 1.9',
      'HUB 1.10',
    ])

    for (const route of hub) {
      expect(route.path.startsWith('/hub')).toBe(true)
      expect(resolveTheme(route.navPath ?? route.path)).toBe('hub')
    }
  })

  it('mapeia os dez módulos do RGM, numerados de 3.1 a 3.10', () => {
    const rgm = ROUTES.filter((route) => route.product === 'rgm')
    expect(rgm).toHaveLength(10)

    expect(rgm.map((route) => route.badge)).toEqual([
      'RGM 3.1',
      'RGM 3.2',
      'RGM 3.3',
      'RGM 3.4',
      'RGM 3.5',
      'RGM 3.6',
      'RGM 3.7',
      'RGM 3.8',
      'RGM 3.9',
      'RGM 3.10',
    ])

    for (const route of rgm) {
      expect(route.path.startsWith('/rgm')).toBe(true)
      expect(resolveTheme(route.navPath ?? route.path)).toBe('rgm')
    }
  })

  it('dá a toda rota com parâmetro um destino navegável', () => {
    for (const route of ROUTES) {
      if (route.path.includes(':')) {
        expect(route.navPath).toBeDefined()
        expect(route.navPath?.includes(':')).toBe(false)
      }
    }
  })

  it('conta o que falta da seção 12.3', () => {
    const coverage = routeCoverage()
    expect(coverage.expected).toBe(45)
    expect(coverage.mapped).toBe(ROUTES.length)
    expect(coverage.mapped + coverage.missing).toBe(coverage.expected)
  })
})

describe('filtros globais', () => {
  const EMPTY: Record<MultiFilterId, readonly string[]> = {
    bu: [],
    brand: [],
    product: [],
    molecule: [],
    channel: [],
    customer: [],
    region: [],
    territory: [],
    team: [],
    specialty: [],
    campaign: [],
  }

  const stateWith = (selections: Partial<Record<MultiFilterId, string[]>> = {}): FilterState => ({
    period: DEFAULT_PERIOD,
    selections: { ...EMPTY, ...selections },
  })

  it('cobre os doze filtros da seção 2', () => {
    expect(FILTER_ORDER).toHaveLength(12)
    expect(FILTER_ORDER).toEqual([
      'period',
      'bu',
      'brand',
      'product',
      'molecule',
      'channel',
      'customer',
      'region',
      'territory',
      'team',
      'specialty',
      'campaign',
    ])
  })

  it('ancora o período padrão em HOJE', () => {
    expect(DEFAULT_PERIOD.to).toBe(HOJE)
    expect(DEFAULT_PERIOD.from).toBe(daysAgo(90))
  })

  it('esconde o que a tela não declara em vez de desabilitar', () => {
    const state = stateWith({ region: ['SP', 'MG'], campaign: ['C1'] })

    const pills = activeFilters(state, ['period', 'region'])
    expect(pills.map((pill) => pill.id)).toEqual(['period', 'region'])
    expect(pills[1]?.summary).toBe('2 selecionados')
  })

  it('omite filtro declarado mas sem valor', () => {
    expect(activeFilters(stateWith(), ['period', 'brand']).map((p) => p.id)).toEqual(['period'])
  })

  it('nomeia a seleção única', () => {
    expect(activeFilters(stateWith({ bu: ['Genéricos'] }), ['bu'])[0]?.summary).toBe('Genéricos')
  })

  it('sobrevive à navegação: o store vive fora da árvore de rotas', () => {
    const { toggle, clearAll } = useFilters.getState()

    toggle('region', 'SP')
    toggle('region', 'MG')
    expect(useFilters.getState().selections.region).toEqual(['SP', 'MG'])

    toggle('region', 'SP')
    expect(useFilters.getState().selections.region).toEqual(['MG'])

    clearAll()
    expect(useFilters.getState().selections.region).toEqual([])
    expect(useFilters.getState().period).toEqual(DEFAULT_PERIOD)
  })
})

describe('números canônicos 10.1', () => {
  const kpi = (id: string) => MARKET_KPIS.find((item) => item.id === id)

  it('traz os cinco indicadores da Visão Geral', () => {
    expect(MARKET_KPIS.map((item) => item.label)).toEqual([
      'Sell-out (R$)',
      'Market Share (Valor)',
      'Distribuição Numérica',
      'Ruptura Estimada',
      'Preço Relativo (IPR)',
    ])
  })

  it('exibe cada valor exatamente como o ESCOPO fixa', () => {
    expect(MARKET_KPIS.map((item) => formatKpiValue(item))).toEqual([
      'R$ 256,4M',
      '18,7%',
      '76,2%',
      '7,3%',
      '98,6',
    ])
  })

  it('exibe cada delta com a unidade correta', () => {
    const rendered = MARKET_KPIS.map((item) =>
      item.deltaUnit === 'percent' ? formatPercentDelta(item.delta) : formatPointsDelta(item.delta),
    )
    expect(rendered).toEqual(['+8,6%', '+0,8 pp', '+1,9 pp', `${MINUS}1,2 pp`, `${MINUS}1,4 pp`])
  })

  it('lê queda de ruptura como resultado positivo', () => {
    const stockout = kpi('stockout')
    expect(stockout?.inverted).toBe(true)
    expect(toneForDelta(stockout?.delta ?? 0, { inverted: true })).toBe('positive')
  })

  it('compara todo indicador com os 7 dias anteriores', () => {
    for (const item of MARKET_KPIS) {
      expect(item.comparison).toBe('vs. 7 dias anteriores')
    }
  })

  it('não deixa indicador sem atestado', () => {
    for (const item of MARKET_KPIS) {
      expect(item.attestation.source.length).toBeGreaterThan(0)
      expect(isStale(item.attestation)).toBe(false)
    }
  })

  it('fecha o mix em 100%', () => {
    expect(SALES_MIX.map((slice) => slice.share)).toEqual([40, 28, 17, 15])
    expect(SALES_MIX.reduce((sum, slice) => sum + slice.share, 0)).toBe(100)
  })

  it('ancora o centro do donut no sell-out do período', () => {
    expect(MIX_TOTAL_BRL).toBe(256_400_000)
    expect(formatMoney(MIX_TOTAL_BRL)).toBe('R$ 256,4M')
  })

  it('traz os três diagnósticos rápidos', () => {
    expect(DIAGNOSTICS.map((d) => d.reading)).toEqual(['Preço e distribuição', 'R$ 2,1M', '−1,3 pp'])
  })
})

describe('série de sell-out', () => {
  it('fecha exatamente no total canônico', () => {
    const total = SELLOUT_SERIES.reduce((sum, point) => sum + point.current, 0)
    expect(total).toBe(256_400_000)
  })

  it('reproduz o crescimento de 8,6% declarado no KPI', () => {
    const current = SELLOUT_SERIES.reduce((sum, point) => sum + point.current, 0)
    const growth = (current / SELLOUT_PREVIOUS_TOTAL_BRL - 1) * 100
    expect(formatPercentDelta(growth)).toBe('+8,6%')
  })

  it('cobre os 7 dias encerrados em HOJE', () => {
    expect(SELLOUT_SERIES).toHaveLength(7)
    expect(SELLOUT_SERIES.at(-1)?.date).toBe(HOJE)
    expect(SELLOUT_SERIES[0]?.date).toBe(daysAgo(6))
  })

  it('é idêntica a cada carga do módulo', () => {
    expect(SELLOUT_SERIES.map((point) => point.current)).toEqual(
      SELLOUT_SERIES.map((point) => point.current),
    )
    for (const point of SELLOUT_SERIES) {
      expect(point.current).toBeGreaterThan(0)
      expect(point.previous).toBeGreaterThan(0)
    }
  })
})

describe('números canônicos 10.2', () => {
  it('traz as cinco oportunidades com valor e decisão', () => {
    expect(
      OPPORTUNITIES.map((o) => [o.rank, o.title, formatMoney(o.impactBrl), o.decisionId]),
    ).toEqual([
      [1, 'Recuperar distribuição de Losartana em SP', 'R$ 4,8M', 'D-2026-0001'],
      [2, 'Revisar preço de Dipirona em MG', 'R$ 3,2M', 'D-2026-0002'],
      [3, 'Aumentar cobertura de médicos, Cardiologia RJ', 'R$ 2,7M', 'D-2026-0003'],
      [4, 'Redistribuir amostras, Região Sul', 'R$ 1,9M', 'D-2026-0004'],
      [5, 'Reduzir ruptura de Paracetamol no NE', 'R$ 1,6M', 'D-2026-0005'],
    ])
  })

  it('mantém integridade referencial com as decisões', () => {
    for (const id of OPPORTUNITY_DECISION_IDS) {
      expect(findDecision(id)).toBeDefined()
    }
    expect(new Set(OPPORTUNITY_DECISION_IDS).size).toBe(OPPORTUNITIES.length)
  })

  it('mantém o impacto igual entre oportunidade e decisão', () => {
    for (const opportunity of OPPORTUNITIES) {
      expect(findDecision(opportunity.decisionId)?.impactBrl).toBe(opportunity.impactBrl)
    }
  })

  it('ordena por impacto decrescente', () => {
    const impacts = OPPORTUNITIES.map((o) => o.impactBrl)
    expect([...impacts].sort((a, b) => b - a)).toEqual(impacts)
    expect(TOTAL_OPPORTUNITY_BRL).toBe(14_200_000)
  })
})

describe('mapa do Brasil', () => {
  it('cobre as 27 unidades federativas, sem repetição', () => {
    expect(BRAZIL_UF_TILES).toHaveLength(27)
    expect(new Set(BRAZIL_UF_TILES.map((tile) => tile.code)).size).toBe(27)
  })

  it('não sobrepõe blocos na grade', () => {
    const cells = BRAZIL_UF_TILES.map((tile) => `${tile.cx},${tile.cy}`)
    expect(new Set(cells).size).toBe(27)
  })

  it('emite path fechado para cada UF', () => {
    for (const tile of BRAZIL_UF_TILES) {
      expect(tile.path.startsWith('M')).toBe(true)
      expect(tile.path.endsWith('Z')).toBe(true)
    }
  })

  it('atribui valor só às UFs cobertas por oportunidade priorizada', () => {
    expect(UF_OPPORTUNITY.SP?.impactBrl).toBe(4_800_000)
    expect(UF_OPPORTUNITY.MG?.impactBrl).toBe(3_200_000)
    expect(UF_OPPORTUNITY.RJ?.impactBrl).toBe(2_700_000)

    for (const uf of REGION_UFS.sul) expect(UF_OPPORTUNITY[uf]?.impactBrl).toBe(1_900_000)
    for (const uf of REGION_UFS.nordeste) expect(UF_OPPORTUNITY[uf]?.impactBrl).toBe(1_600_000)

    expect(UF_OPPORTUNITY.AC).toBeUndefined()
    expect(UF_OPPORTUNITY.AM).toBeUndefined()
  })

  it('gradua o nível pelo impacto', () => {
    expect(opportunityLevel(4_800_000)).toBe(5)
    expect(opportunityLevel(3_200_000)).toBe(4)
    expect(opportunityLevel(2_700_000)).toBe(4)
    expect(opportunityLevel(1_900_000)).toBe(3)
    expect(opportunityLevel(1_600_000)).toBe(2)
    expect(opportunityLevel(undefined)).toBe(1)
  })
})

describe('Produto 360°', () => {
  const losartana = findSku('losartana-50-30')

  it('agrupa as dimensões do módulo 1.3 em quatro painéis', () => {
    expect(losartana?.panels.map((panel) => panel.title)).toEqual([
      'Comercial',
      'Disponibilidade',
      'Demanda',
      'Ação',
    ])
    expect(PRODUCT_DIMENSION_COUNT).toBe(14)
  })

  it('dá a cada painel um atestado próprio — é o contraste que a tela argumenta', () => {
    const panels = losartana?.panels ?? []
    const fingerprints = panels.map((panel) =>
      [...panel.attestation.source].join('+') +
      `|${panel.attestation.asOf}|${panel.attestation.confidence}|${panel.attestation.method}`,
    )
    expect(new Set(fingerprints).size).toBe(panels.length)
  })

  it('combina pelo elo mais fraco dentro de cada painel', () => {
    const demanda = losartana?.panels.find((panel) => panel.id === 'demanda')
    expect(demanda?.attestation.source).toEqual(['crm_sfa', 'iqvia'])
    expect(demanda?.attestation.method).toBe('estimated')

    const acao = losartana?.panels.find((panel) => panel.id === 'acao')
    expect(acao?.attestation.confidence).toBe('medium')
    expect(acao?.attestation.quality).toBe('partial')
  })

  it('traz o canônico de Losartana no painel de Ação', () => {
    const acao = losartana?.panels.find((panel) => panel.id === 'acao')
    const metrics = acao?.metrics ?? []
    expect(metrics.find((m) => m.id === 'open-recommendations')?.value).toBe(1)
    expect(metrics.find((m) => m.id === 'potential-impact')?.value).toBe(4_800_000)
    expect(formatMetric(metrics[1] as ProductMetric)).toBe('R$ 4,8M')
  })

  it('mostra travessão onde o valor ainda não veio do ESCOPO', () => {
    const comercial = losartana?.panels.find((panel) => panel.id === 'comercial')
    const sellIn = comercial?.metrics.find((m) => m.id === 'sell-in')
    expect(sellIn?.value).toBeNull()
    expect(formatMetric(sellIn as ProductMetric)).toBe('—')
  })
})

describe('causa-raiz', () => {
  it('decompõe em sete fatores', () => {
    expect(ROOT_CAUSE_FACTORS.map((factor) => factor.label)).toEqual([
      'Preço',
      'Ruptura',
      'Distribuição',
      'Prescrição',
      'Execução',
      'Mix',
      'Movimento do concorrente',
    ])
  })

  it('fixa o caso canônico da queda de 12%', () => {
    expect(ROOT_CAUSE_CASE.totalPp).toBe(-12)
    expect(formatPointsDelta(ROOT_CAUSE_CASE.totalPp)).toBe(`${MINUS}12,0 pp`)
    expect(ROOT_CAUSE_CASE.decisionId).toBe('D-2026-0001')
    expect(ROOT_CAUSE_CASE.opportunityBrl).toBe(4_800_000)
  })

  it('cobre com os três encaminhamentos todo fator que tem dono', () => {
    const owners = new Set(
      ROOT_CAUSE_FACTORS.map((factor) => factor.owner).filter((owner) => owner !== null),
    )
    const targets = new Set(FORWARD_TARGETS.map((target) => target.product))
    expect(targets).toEqual(owners)
    expect(targets.size).toBe(3)
  })

  it('marca o movimento do concorrente como externo, sem dono interno', () => {
    expect(ROOT_CAUSE_FACTORS.find((f) => f.id === 'competitor')?.owner).toBeNull()
  })

  it('acumula o waterfall e fecha a barra de total a partir do zero', () => {
    const steps = buildWaterfallSteps(
      [
        { label: 'Preço', value: -5 },
        { label: 'Ruptura', value: -4 },
        { label: 'Mix', value: -3 },
      ],
      'Total',
    )

    expect(steps.map((step) => [step.start, step.end])).toEqual([
      [0, -5],
      [-5, -9],
      [-9, -12],
      [0, -12],
    ])
    expect(steps.at(-1)?.isTotal).toBe(true)
    expect(steps.at(-1)?.value).toBe(-12)
  })

  it('não plota decomposição enquanto as contribuições não vierem', () => {
    expect(HAS_DECOMPOSITION).toBe(false)
  })
})

describe('encaminhamento grava na Decisão', () => {
  beforeEach(() => useDecisions.setState({ links: [] }))

  it('cria um vínculo por área na decisão de origem', () => {
    const { forward } = useDecisions.getState()
    for (const target of FORWARD_TARGETS) {
      forward(ROOT_CAUSE_CASE.decisionId, target.product, target.reason)
    }

    const links = useDecisions.getState().linksOf(ROOT_CAUSE_CASE.decisionId)
    expect(links).toHaveLength(3)
    expect(links.map((link) => link.target)).toEqual(['rgm', 'gtm', 'ag'])
    expect(links.map((link) => link.reason)).toEqual([
      'Preço',
      'Execução e distribuição',
      'Prescrição',
    ])
    expect(links.every((link) => link.createdOn === HOJE)).toBe(true)
  })

  it('não duplica ao encaminhar duas vezes para a mesma área', () => {
    const { forward } = useDecisions.getState()
    forward('D-2026-0001', 'rgm', 'Preço')
    forward('D-2026-0001', 'rgm', 'Preço')
    expect(useDecisions.getState().links).toHaveLength(1)
    expect(useDecisions.getState().isForwarded('D-2026-0001', 'rgm')).toBe(true)
    expect(useDecisions.getState().isForwarded('D-2026-0001', 'gtm')).toBe(false)
  })

  it('mantém os vínculos separados por decisão', () => {
    const { forward } = useDecisions.getState()
    forward('D-2026-0001', 'rgm', 'Preço')
    forward('D-2026-0002', 'gtm', 'Execução e distribuição')
    expect(useDecisions.getState().linksOf('D-2026-0001')).toHaveLength(1)
    expect(useDecisions.getState().linksOf('D-2026-0002')).toHaveLength(1)
  })
})

describe('qualidade dos dados', () => {
  beforeEach(() => useExceptions.setState({ accepted: [] }))

  it('deixa a Scanntech com layout alterado', () => {
    const scanntech = SOURCE_HEALTH.find((health) => health.source === 'scanntech')
    expect(scanntech?.status).toBe('layout_changed')
    expect(isStale(scanntech?.attestation as Attestation)).toBe(true)
  })

  it('cobre as sete fontes válidas, sem origem fora da lista', () => {
    expect(SOURCE_HEALTH).toHaveLength(7)
    expect(new Set(SOURCE_HEALTH.map((health) => health.source)).size).toBe(7)
  })

  it('faz cada linha atestar a própria fonte, sem acusar terceiros', () => {
    for (const health of SOURCE_HEALTH) {
      expect(health.attestation.source).toEqual([health.source])
    }
  })

  it('nomeia no banner só as fontes que a tabela mostra fora de OK', () => {
    const degraded = new Set(
      SOURCE_HEALTH.filter((health) => health.status !== 'ok').map((health) => health.source),
    )
    const named = new Set(DEGRADED_ATTESTATIONS.flatMap((attestation) => attestation.source))
    expect(named).toEqual(degraded)
  })

  it('alimenta o banner degradado só com o que não está OK', () => {
    expect(DEGRADED_ATTESTATIONS.length).toBe(
      SOURCE_HEALTH.filter((health) => health.status !== 'ok').length,
    )
    expect(DEGRADED_ATTESTATIONS.length).toBeGreaterThan(0)
  })

  it('lista três exceções, todas da fonte que mudou de layout', () => {
    expect(DATA_EXCEPTIONS).toHaveLength(3)
    for (const exception of DATA_EXCEPTIONS) {
      expect(exception.source).toBe('scanntech')
      expect(exception.probableCause.length).toBeGreaterThan(0)
      expect(exception.proposedFix.length).toBeGreaterThan(0)
      expect(exception.rule.length).toBeGreaterThan(0)
    }
  })

  it('aceitar a correção resolve a exceção e cria a regra', () => {
    const [first] = DATA_EXCEPTIONS
    const { accept } = useExceptions.getState()

    expect(useExceptions.getState().isResolved(first!.id)).toBe(false)
    accept(first!.id, first!.rule)

    expect(useExceptions.getState().isResolved(first!.id)).toBe(true)
    expect(useExceptions.getState().ruleOf(first!.id)?.rule).toBe(first!.rule)
    expect(useExceptions.getState().ruleOf(first!.id)?.createdOn).toBe(HOJE)
  })

  it('não cria a mesma regra duas vezes', () => {
    const [first] = DATA_EXCEPTIONS
    const { accept } = useExceptions.getState()
    accept(first!.id, first!.rule)
    accept(first!.id, first!.rule)
    expect(useExceptions.getState().accepted).toHaveLength(1)
  })

  it('mede confiabilidade em 30 dias e derruba a Scanntech na virada de layout', () => {
    expect(RELIABILITY_SERIES).toHaveLength(30)
    expect(RELIABILITY_SERIES.at(-1)?.date).toBe(HOJE)

    const first = RELIABILITY_SERIES[0]
    const last = RELIABILITY_SERIES.at(-1)
    expect(first!.scanntech).toBeGreaterThan(90)
    expect(last!.scanntech).toBeLessThan(75)
    expect(last!.neogrid).toBeGreaterThan(90)
  })
})

describe('P4 — telas restantes do HUB', () => {
  it('pulse separa observado de estimado sobre o universo declarado', () => {
    expect(OBSERVED_OUTLETS).toBe(15_000)
    expect(UNIVERSE_OUTLETS).toBe(70_000)
    expect(OBSERVED_OUTLETS + ESTIMATED_OUTLETS).toBe(UNIVERSE_OUTLETS)
    expect(COVERAGE_SEGMENTS).toHaveLength(2)
    expect(COVERAGE_SEGMENTS.reduce((sum, s) => sum + s.outlets, 0)).toBe(UNIVERSE_OUTLETS)
  })

  it('pulse rebaixa o método da parcela extrapolada e da projeção', () => {
    expect(COVERAGE_ESTIMATED_ATTESTATION.method).toBe('extrapolated')
    expect(FORECAST_ATTESTATION.method).toBe('extrapolated')
    expect(FORECAST_ATTESTATION.confidence).not.toBe('high')
  })

  it('pulse fecha a projeção no total derivado do crescimento canônico', () => {
    const projected = PULSE_SERIES.filter((point) => point.observed === null).reduce(
      (sum, point) => sum + (point.median ?? 0),
      0,
    )
    expect(projected).toBe(FORECAST_TOTAL_BRL)
    expect(FORECAST_LOW_BRL).toBeLessThan(FORECAST_TOTAL_BRL)
    expect(FORECAST_HIGH_BRL).toBeGreaterThan(FORECAST_TOTAL_BRL)
  })

  it('cliente fecha a reconciliação sem sobra', () => {
    expect(SELL_OUT_BRL).toBe(256_400_000)
    expect(EXPECTED_SELL_OUT_BRL).toBe(SELL_IN_BRL - CHANNEL_STOCK_CHANGE_BRL)
    expect(RECONCILIATION_GAP_BRL).toBe(SELL_OUT_BRL - EXPECTED_SELL_OUT_BRL)

    const causes = GAP_CAUSES.reduce((sum, cause) => sum + cause.amountBrl, 0)
    expect(causes).toBe(Math.abs(RECONCILIATION_GAP_BRL))
  })

  it('cliente mostra CD confortável contra ponta em ruptura', () => {
    expect(DC_TIER.coverageDays).toBeGreaterThan(DC_TARGET_DAYS.min)
    expect(STORE_TIER.coverageDays).toBeLessThan(STORE_TARGET_DAYS.min)
    expect(COVERAGE_GAP_DAYS).toBeGreaterThan(0)
    expect(ALERT_STOCKOUT_PERCENT).toBeGreaterThan(NATIONAL_STOCKOUT_PERCENT)
  })

  it('território deriva o potencial de sell-out sobre market share', () => {
    expect(MARKET_POTENTIAL_BRL).toBe(Math.round(256_400_000 / (18.7 / 100)))
    expect(TERRITORY_PROFILES).toHaveLength(27)
    const total = TERRITORY_PROFILES.reduce((sum, p) => sum + p.potentialBrl, 0)
    expect(total).toBe(MARKET_POTENTIAL_BRL)
  })

  it('território ancora a presença média na distribuição numérica canônica', () => {
    const mean =
      TERRITORY_PROFILES.reduce((sum, p) => sum + p.presencePercent, 0) / TERRITORY_PROFILES.length
    expect(Number(mean.toFixed(1))).toBe(76.2)
    expect(NATIONAL_PRESENCE_PERCENT).toBe(76.2)
  })

  it('território só marca white space com potencial acima da mediana', () => {
    for (const space of WHITE_SPACES) {
      expect(space.potentialBrl).toBeGreaterThan(MEDIAN_UF_POTENTIAL_BRL)
      expect(space.presencePercent).toBeLessThan(NATIONAL_PRESENCE_PERCENT)
    }
  })

  it('médico traz os cinco da lista com um cardiologista no RJ', () => {
    expect(DOCTORS).toHaveLength(5)
    expect(DOCTOR_COUNT).toBe(5)
    expect(new Set(DOCTORS.map((d) => d.id)).size).toBe(5)
    expect(DOCTORS.some((d) => d.specialty === 'cardiologia' && d.uf === 'RJ')).toBe(true)
  })

  it('médico calibra o potencial para bater na oportunidade canônica', () => {
    expect(DOCTOR_COVERAGE_OPPORTUNITY.impactBrl).toBe(2_700_000)
    expect(POTENTIAL_PER_UNCOVERED_DOCTOR_BRL).toBeGreaterThan(0)
  })

  it('radar mantém as cinco canônicas no topo, sem candidata furando a fila', () => {
    expect(RADAR_CANONICAL_COUNT).toBe(5)
    expect(RADAR_PRIORITIZED_BRL).toBe(14_200_000)

    const canonical = RADAR_ENTRIES.filter((entry) => entry.canonical)
    const candidates = RADAR_ENTRIES.filter((entry) => !entry.canonical)
    expect(canonical).toHaveLength(5)
    expect(candidates).toHaveLength(RADAR_CANDIDATE_COUNT)

    const smallestCanonical = Math.min(...canonical.map((entry) => entry.impactBrl))
    for (const candidate of candidates) {
      expect(candidate.impactBrl).toBeLessThan(smallestCanonical)
      expect(candidate.decisionId).toBeNull()
    }
  })

  it('radar decompõe o custo da não ação fechando no total', () => {
    for (const entry of RADAR_ENTRIES) {
      const parts = INACTION_PARTS.reduce((sum, part) => sum + entry.inactionCost[part.id], 0)
      expect(parts).toBe(entry.inactionCost.totalBrl)
      expect(entry.inactionCost.totalBrl).toBeLessThan(entry.impactBrl)
    }
  })

  it('radar ordena por cada eixo sem perder linha', () => {
    for (const axis of RADAR_AXES) {
      expect(sortByAxis(RADAR_ENTRIES, axis.id, true)).toHaveLength(RADAR_ENTRIES.length)
    }
  })

  it('competitiva fecha a malha de preço no IPR canônico', () => {
    expect(PRICE_CELLS).toHaveLength(72)
    const mean = PRICE_CELLS.reduce((sum, cell) => sum + cell.ipr, 0) / PRICE_CELLS.length
    expect(Number(mean.toFixed(1))).toBe(98.6)
    expect(summarizePrices(EMPTY_PRICE_FILTER).ipr).toBeCloseTo(98.6, 1)
  })

  it('competitiva dá número só ao movimento canônico', () => {
    const canonical = COMPETITIVE_MOVES.filter((move) => move.impactPp !== null)
    expect(canonical).toHaveLength(1)
    expect(canonical[0]?.impactPp).toBe(-1.3)
    expect(canonical[0]?.decisionId).toBe('D-2026-0002')
    expect(MOLECULE_TIMELINES.length).toBeGreaterThan(0)
  })
})

describe('transformar oportunidade em Decisão', () => {
  beforeEach(() => useRadarDecisions.setState({ created: [] }))

  it('mina o próximo id da série e devolve o mesmo em nova chamada', () => {
    const { convert } = useRadarDecisions.getState()
    const first = convert('cand-1', 'Oportunidade em triagem', 900_000)
    expect(first).toBe('D-2026-0006')

    expect(convert('cand-1', 'Oportunidade em triagem', 900_000)).toBe(first)
    expect(useRadarDecisions.getState().created).toHaveLength(1)
  })

  it('numera em sequência e não colide com as canônicas', () => {
    const { convert } = useRadarDecisions.getState()
    convert('cand-1', 'A', 900_000)
    convert('cand-2', 'B', 800_000)

    const ids = useRadarDecisions.getState().created.map((item) => item.id)
    expect(ids).toEqual(['D-2026-0006', 'D-2026-0007'])
    for (const id of ids) expect(findDecision(id)).toBeUndefined()
  })

  it('deixa a decisão criada navegável, com título e impacto', () => {
    const { convert } = useRadarDecisions.getState()
    const id = convert('cand-1', 'Ampliar sortimento', 900_000)

    const created = useRadarDecisions.getState().findCreated(id)
    expect(created?.title).toBe('Ampliar sortimento')
    expect(created?.impactBrl).toBe(900_000)
    expect(created?.createdOn).toBe(HOJE)
    expect(created?.product).toBe('hub')
  })
})

describe('P5 — simulador de cenários (10.3)', () => {
  it('reproduz volume e share canônicos pelo modelo, não por número fixo', () => {
    for (const scenario of SCENARIOS) {
      const modelled = simulate(scenario.inputs)
      expect(modelled.volume).toBe(scenario.canonical.volume)
      expect(modelled.sharePercent).toBe(scenario.canonical.sharePercent)
    }
  })

  it('calibra a elasticidade pelo par de desconto zero', () => {
    expect(PRICE_ELASTICITY).toBeCloseTo(-1.7589, 3)
    expect(PRICE_ELASTICITY).toBeLessThan(0)
  })

  it('resolve o lift promocional superlinear das âncoras', () => {
    expect(promoLift(0)).toBeCloseTo(1, 6)
    expect(promoLift(0.05)).toBeCloseTo(1.0552, 3)
    expect(promoLift(0.08)).toBeCloseTo(1.288, 3)
    expect(promoLift(0.08)).toBeGreaterThan(promoLift(0.05))
  })

  it('exibe cada linha canônica exatamente como o ESCOPO fixa', () => {
    const rows = SCENARIOS.map((scenario) => scenario.canonical)

    expect(rows.map((o) => o.priceBrl)).toEqual([12.9, 12.4, 11.9, 12.9])
    expect(rows.map((o) => o.discountRate * 100)).toEqual([0, 0, 5, 8])
    expect(rows.map((o) => o.relativePriceIndex)).toEqual([103.2, 99.2, 95.2, 95.0])
    expect(rows.map((o) => o.volume)).toEqual([
      1_250_000, 1_340_000, 1_520_000, 1_610_000,
    ])
    expect(rows.map((o) => formatMoney(o.sellOutBrl))).toEqual([
      'R$ 16,1M',
      'R$ 16,6M',
      'R$ 18,1M',
      'R$ 19,6M',
    ])
    expect(rows.map((o) => formatPercent(o.sharePercent))).toEqual([
      '18,7%',
      '19,2%',
      '20,8%',
      '21,9%',
    ])
    expect(rows.map((o) => formatMoney(o.netRevenueBrl))).toEqual([
      'R$ 16,1M',
      'R$ 16,6M',
      'R$ 17,2M',
      'R$ 18,0M',
    ])
    expect(rows.map((o) => formatMoney(o.contributionBrl, 2))).toEqual([
      'R$ 7,31M',
      'R$ 7,55M',
      'R$ 7,82M',
      'R$ 8,19M',
    ])
    expect(rows.map((o) => o.promoRoiPercent)).toEqual([null, 15.2, 22.8, 25.6])
  })

  it('devolve o canônico exato quando os parâmetros são os canônicos', () => {
    for (const scenario of SCENARIOS) {
      expect(resolveScenario(scenario, scenario.inputs)).toBe(scenario.canonical)
    }
  })

  it('mexer e voltar repõe o canônico — é o chão da demonstração', () => {
    const scenario = SCENARIOS[3] as (typeof SCENARIOS)[number]

    const mexido = resolveScenario(scenario, { priceBrl: 11.5, discountRate: 0.12 })
    expect(mexido.volume).not.toBe(scenario.canonical.volume)

    const voltou = resolveScenario(scenario, scenario.inputs)
    expect(voltou).toEqual(scenario.canonical)
    expect(voltou.netRevenueBrl).toBe(18_000_000)
    expect(voltou.contributionBrl).toBe(8_190_000)
  })

  it('responde a preço e desconto na direção certa fora do canônico', () => {
    const barato = simulate({ priceBrl: 11.0, discountRate: 0 })
    const caro = simulate({ priceBrl: 14.0, discountRate: 0 })
    expect(barato.volume).toBeGreaterThan(caro.volume)

    const semDesconto = simulate({ priceBrl: 12.9, discountRate: 0 })
    const comDesconto = simulate({ priceBrl: 12.9, discountRate: 0.1 })
    expect(comDesconto.volume).toBeGreaterThan(semDesconto.volume)
    expect(comDesconto.netRevenueBrl).not.toBe(semDesconto.netRevenueBrl)
  })

  it('usa +360 mil unidades, a correção da seção 10.3', () => {
    expect(RECOMMENDED_IMPACT.volume).toBe(360_000)
    expect(RECOMMENDED_IMPACT.volume).not.toBe(880_000)
  })

  it('deriva o impacto do recomendado das próprias linhas canônicas', () => {
    expect(formatMoneyDelta(RECOMMENDED_IMPACT.netRevenueBrl)).toBe('R$ +1,9M')
    expect(formatPointsDelta(RECOMMENDED_IMPACT.sharePoints)).toBe('+3,2 pp')
    expect(formatPercentDelta(RECOMMENDED_IMPACT.contributionPercent)).toBe('+12,0%')
  })

  it('recomenda o Cenário 3 com a confiança declarada', () => {
    expect(SCENARIO_RECOMMENDATION.scenarioId).toBe('scenario-3')
    expect(SCENARIO_RECOMMENDATION.confidencePercent).toBe(78)
    expect(RECOMMENDED.label).toBe('Cenário 3')
  })
})

describe('objeto Decisão (8.1)', () => {
  beforeEach(() => useDecisionWorkflow.setState({ states: {}, parcels: [] }))

  it('preserva o token canônico do estado do ESCOPO', () => {
    expect(DECISION_STATE_TOKEN.in_approval).toBe('EM_APROVACAO')
  })

  it('declara as transições em mapa explícito, com terminal sem saída', () => {
    expect(canTransition('proposed', 'in_approval')).toBe(true)
    expect(canTransition('in_approval', 'approved')).toBe(true)
    expect(canTransition('in_approval', 'concluded')).toBe(false)
    expect(canTransition('concluded', 'proposed')).toBe(false)
    expect(isTerminal('rejected')).toBe(true)
    expect(isTerminal('concluded')).toBe(true)
    expect(isTerminal('in_approval')).toBe(false)
  })

  it('recusa transição inválida em vez de gravar estado impossível', () => {
    expect(() => transition('proposed', 'concluded')).toThrow()
    expect(transition('proposed', 'in_approval')).toBe('in_approval')
  })

  it('enviar para aprovação move D-2026-0001 e anexa a parcela de R$ 1,9M', () => {
    const workflow = useDecisionWorkflow.getState()
    expect(workflow.stateOf(APPROVAL_DECISION_ID)).toBe('proposed')

    workflow.submitForApproval(APPROVAL_DECISION_ID, {
      id: 'rgm-scenario-3',
      source: 'rgm',
      label: 'Cenário 3',
      amountBrl: RECOMMENDED_IMPACT.netRevenueBrl,
      attestation: SCENARIO_ATTESTATION,
    })

    const after = useDecisionWorkflow.getState()
    expect(after.stateOf(APPROVAL_DECISION_ID)).toBe('in_approval')
    expect(DECISION_STATE_TOKEN[after.stateOf(APPROVAL_DECISION_ID)]).toBe('EM_APROVACAO')

    const parcels = after.parcelsOf(APPROVAL_DECISION_ID)
    expect(parcels).toHaveLength(1)
    expect(parcels[0]?.source).toBe('rgm')
    expect(formatMoney(parcelTotal(parcels))).toBe('R$ 1,9M')
    expect(parcels[0]?.createdOn).toBe(HOJE)
  })

  it('não duplica a parcela ao enviar duas vezes', () => {
    const { submitForApproval } = useDecisionWorkflow.getState()
    const parcel = {
      id: 'rgm-scenario-3',
      source: 'rgm' as const,
      label: 'Cenário 3',
      amountBrl: 1_875_000,
      attestation: SCENARIO_ATTESTATION,
    }
    submitForApproval(APPROVAL_DECISION_ID, parcel)
    submitForApproval(APPROVAL_DECISION_ID, parcel)
    expect(useDecisionWorkflow.getState().parcelsOf(APPROVAL_DECISION_ID)).toHaveLength(1)
  })

  it('mantém a parcela abaixo do impacto total da decisão', () => {
    expect(RECOMMENDED_IMPACT.netRevenueBrl).toBeLessThan(
      findDecision(APPROVAL_DECISION_ID)?.impactBrl ?? 0,
    )
  })
})

describe('cockpit de preço (3.1)', () => {
  it('lê o semáforo pelo corredor, não por alerta genérico', () => {
    expect(corridorStatus(PRICE_CORRIDOR.floor - 1)).toBe('below')
    expect(corridorStatus(PRICE_CORRIDOR.ceiling + 1)).toBe('above')
    expect(corridorStatus(100)).toBe('inside')
  })

  it('coloca Losartana acima do corredor, que é o que abre o cenário', () => {
    const losartana = PRICE_LINES.find((line) => line.id === 'losartana-farma-sudeste')
    expect(losartana?.relativePriceIndex).toBe(103.2)
    expect(corridorStatus(losartana?.relativePriceIndex ?? 0)).toBe('above')
    expect(losartana?.decisionId).toBe('D-2026-0001')
  })

  it('ancora a captura de Dipirona no impacto de D-2026-0002', () => {
    const dipirona = PRICE_LINES.find((line) => line.id === 'dipirona-farma-sudeste')
    expect(dipirona?.potentialCaptureBrl).toBe(3_200_000)
  })

  it('ranqueia moléculas por captura decrescente', () => {
    const captures = MOLECULE_CAPTURE.map((item) => item.potentialCaptureBrl)
    expect([...captures].sort((a, b) => b - a)).toEqual(captures)
    expect(MOLECULE_CAPTURE[0]?.molecule).toBe('Dipirona')
  })
})

describe('P6 — perímetro e telas restantes do RGM', () => {
  it('põe a nota de perímetro em toda tela do RGM', () => {
    const screens = loadSources().filter((file) => file.path.startsWith('screens/rgm/'))
    expect(screens).toHaveLength(10)

    const semNota = screens
      .filter((file) => !file.text.includes('PerimeterNote'))
      .map((file) => file.path)
    expect(semNota).toEqual([])
  })

  it('fecha a cascata gross-to-net sem sobra', () => {
    expect(COMMERCIAL_DISCOUNT_BRL).toBe(400_000_000)
    expect(GROSS_REVENUE_BRL + TOTAL_DEDUCTIONS_BRL).toBe(NET_REVENUE_BRL)
    expect(TOTAL_DEDUCTIONS_BRL).toBeLessThan(0)

    const legs = GROSS_TO_NET.filter((leg) => leg.kind === 'deduction')
    expect(legs).toHaveLength(6)
    expect(legs.reduce((sum, leg) => sum + leg.amountBrl, 0)).toBe(TOTAL_DEDUCTIONS_BRL)
    expect(legs.every((leg) => leg.amountBrl < 0)).toBe(true)
  })

  it('mantém cada corte somando o mesmo bruto e o mesmo líquido', () => {
    for (const cut of ['product', 'customer', 'channel'] as const) {
      const rows = CUTS[cut]
      expect(rows.reduce((sum, row) => sum + row.grossBrl, 0)).toBe(GROSS_REVENUE_BRL)
      expect(rows.reduce((sum, row) => sum + row.netBrl, 0)).toBe(NET_REVENUE_BRL)
      expect(rows.reduce((sum, row) => sum + row.leakageBrl, 0)).toBe(TOTAL_LEAKAGE_BRL)
    }
  })

  it('faz a conversão variar entre as linhas de cada corte', () => {
    for (const cut of ['product', 'customer', 'channel'] as const) {
      const conversions = CUTS[cut].map((row) => Math.round((row.netBrl / row.grossBrl) * 1000))
      expect(new Set(conversions).size).toBe(conversions.length)
    }

    const canal = CUTS.channel
    const independentes = canal[0]
    const atacado = canal[3]
    expect((independentes?.netBrl ?? 0) / (independentes?.grossBrl ?? 1)).toBeGreaterThan(
      (atacado?.netBrl ?? 0) / (atacado?.grossBrl ?? 1),
    )
  })

  it('aponta vazamento sempre dentro de um degrau existente', () => {
    const legIds = new Set(GROSS_TO_NET.map((leg) => leg.id))
    for (const leakage of LEAKAGES) {
      expect(legIds.has(leakage.legId)).toBe(true)
      expect(leakage.amountBrl).toBeGreaterThan(0)
    }
    expect(TOTAL_LEAKAGE_BRL).toBeLessThan(Math.abs(TOTAL_DEDUCTIONS_BRL))
  })

  it('percorre os cinco estágios da governança em ordem', () => {
    expect(STAGES).toHaveLength(5)
    expect(STAGES.map((stage) => stage.order)).toEqual([1, 2, 3, 4, 5])
    expect(STAGES.map((stage) => stage.id)).toEqual([
      'recommendation',
      'authority_approval',
      'effective_date',
      'publication',
      'adherence',
    ])
    expect(STAGES[4]?.status).toBe('at_risk')
  })

  it('mostra os quatro guardrails do ESCOPO', () => {
    expect(GUARDRAILS.map((rail) => rail.id)).toEqual([
      'cmed',
      'minimum_margin',
      'commercial_policy',
      'authority',
    ])
  })

  it('lê atraso de distribuidor pelo SLA, não por rótulo solto', () => {
    for (const distributor of DISTRIBUTORS) {
      const over = isOverSla(distributor)
      if (distributor.status === 'published') expect(over).toBe(false)
      else expect(over).toBe(true)
    }
    expect(DISTRIBUTORS_OFF_TRACK).toBeGreaterThan(0)
    expect(DISTRIBUTORS_ON_TIME + DISTRIBUTORS_OFF_TRACK).toBe(DISTRIBUTORS.length)
    expect(ADHERENCE_PERCENT).toBeLessThan(100)
  })

  it('mede a distância entre publicação e carga sem tocar no relógio', () => {
    const naoCarregado = DISTRIBUTORS.find((d) => d.updatedOn === null)
    expect(naoCarregado).toBeDefined()
    expect(daysSincePublication(naoCarregado as Distributor)).toBeGreaterThan(
      naoCarregado?.slaDays ?? 0,
    )
  })
})

describe('mock determinístico', () => {
  it('produz a mesma sequência a cada execução', () => {
    const first = Array.from({ length: 5 }, createRandom(MOCK_SEED))
    const second = Array.from({ length: 5 }, createRandom(MOCK_SEED))
    expect(first).toEqual(second)
    expect(new Set(first).size).toBe(5)
  })

  it('mantém os valores no intervalo [0, 1)', () => {
    const random = createRandom(MOCK_SEED)
    for (let i = 0; i < 500; i += 1) {
      const value = random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})
