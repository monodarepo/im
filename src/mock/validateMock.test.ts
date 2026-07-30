import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
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
