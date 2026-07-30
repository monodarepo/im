import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { combine, isStale, type Attestation } from '../domain/attestation'
import { addDays, ageInDays, daysBetween, formatDate, formatMonth, HOJE } from '../domain/today'
import { PRODUCTS, PRODUCT_ORDER, SEMANTIC, toneForDelta } from '../design/tokens'
import { createRandom, MOCK_SEED } from './random'

const SRC = fileURLToPath(new URL('..', import.meta.url))
const SELF = 'mock/validateMock.test.ts'

function sourceFiles(): string[] {
  const found: string[] = []
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) walk(full)
      else if (/\.tsx?$/.test(entry)) found.push(full)
    }
  }
  walk(SRC)
  return found.filter((file) => relative(SRC, file) !== SELF)
}

function readAllSources(): { file: string; text: string }[] {
  return sourceFiles().map((file) => ({ file: relative(SRC, file), text: readFileSync(file, 'utf8') }))
}

/** Comentários citam regras; código as cumpre. As checagens de uso olham só o código. */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

function readAllCode(): { file: string; text: string }[] {
  return readAllSources().map(({ file, text }) => ({ file, text: stripComments(text) }))
}

const attestation = (over: Partial<Attestation> = {}): Attestation => ({
  source: ['scanntech'],
  asOf: '2026-07-20',
  lagDays: 15,
  confidence: 'high',
  quality: 'complete',
  method: 'measured',
  ...over,
})

describe('proibições invioláveis', () => {
  const FORBIDDEN_TECH = [
    'BigQuery',
    'Vertex',
    'Gemini',
    'Looker',
    'Dataflow',
    'Dataplex',
    'Pub/Sub',
    'Apigee',
    'AppSheet',
    'Maps Platform',
  ]

  it.each(FORBIDDEN_TECH)('não menciona o produto técnico "%s"', (term) => {
    const offenders = readAllSources()
      .filter(({ text }) => text.toLowerCase().includes(term.toLowerCase()))
      .map(({ file }) => file)
    expect(offenders).toEqual([])
  })

  it('não cita Close-Up como fonte', () => {
    const offenders = readAllSources()
      .filter(({ text }) => /close[\s-]?up/i.test(text))
      .map(({ file }) => file)
    expect(offenders).toEqual([])
  })

  it('não usa armazenamento de navegador nem relógio do sistema no domínio ou no mock', () => {
    const offenders = readAllCode()
      .filter(({ file }) => file.startsWith('domain/') || file.startsWith('mock/'))
      .filter(({ text }) => /localStorage|sessionStorage|Date\.now\(\)|new Date\(/.test(text))
      .map(({ file }) => file)
    expect(offenders).toEqual([])
  })

  it('não usa Math.random() em lugar nenhum', () => {
    const offenders = readAllCode()
      .filter(({ text }) => text.includes('Math.random('))
      .map(({ file }) => file)
    expect(offenders).toEqual([])
  })
})

describe('âncora temporal', () => {
  it('HOJE é a única data literal do domínio', () => {
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

  it('mede idade da informação a partir de HOJE', () => {
    expect(ageInDays('2026-07-20')).toBe(10)
    expect(ageInDays(HOJE)).toBe(0)
  })

  it('formata em pt-BR', () => {
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
        method: 'modeled',
      }),
    ])

    expect(combined.confidence).toBe('low')
    expect(combined.quality).toBe('partial')
    expect(combined.method).toBe('modeled')
    expect(combined.lagDays).toBe(45)
    expect(combined.asOf).toBe('2026-06-30')
    expect(combined.source).toEqual(['iqvia', 'scanntech'])
  })

  it('não repete fontes ao combinar', () => {
    const combined = combine([attestation(), attestation({ asOf: '2026-07-01' })])
    expect(combined.source).toEqual(['scanntech'])
  })

  it('exige ao menos um atestado', () => {
    expect(() => combine([])).toThrow()
  })

  it('marca atraso quando a idade ultrapassa o lag da fonte', () => {
    expect(isStale(attestation({ asOf: '2026-07-20', lagDays: 15 }))).toBe(false)
    expect(isStale(attestation({ asOf: '2026-06-01', lagDays: 15 }))).toBe(true)
  })
})

describe('design system', () => {
  it('mantém a paleta semântica do ESCOPO', () => {
    expect(SEMANTIC).toEqual({
      positive: '#16A34A',
      negative: '#DC2626',
      attention: '#F59E0B',
      neutral: '#64748B',
    })
  })

  it('mantém a cor de identidade de cada produto', () => {
    expect(PRODUCT_ORDER.map((id) => PRODUCTS[id].accent)).toEqual([
      '#1E4FD8',
      '#0F766E',
      '#7C3AED',
      '#EA7317',
    ])
  })

  it('escolhe o tom pelo sinal, respeitando métricas invertidas', () => {
    expect(toneForDelta(3.2)).toBe('positive')
    expect(toneForDelta(-3.2)).toBe('negative')
    expect(toneForDelta(0)).toBe('neutral')
    expect(toneForDelta(-3.2, { inverted: true })).toBe('positive')
    expect(toneForDelta(3.2, { inverted: true })).toBe('negative')
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
