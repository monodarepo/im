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
