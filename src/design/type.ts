/**
 * Escala de tipo (PD1). Papéis nomeados pelo uso, não pelo tamanho.
 *
 * Par tipográfico: Geist Sans na interface, Geist Mono em numeral e código —
 * desenhadas para produto de dados, carregadas localmente via @fontsource.
 * O numeral tabular é global (body); a escala abaixo dá o resto da hierarquia:
 * micro-rótulo em caixa alta sobre todo KPI e coluna, valor em `metric`,
 * contexto subordinado em `label`.
 */

export const FONT_SANS = "'Geist Sans', system-ui, -apple-system, 'Segoe UI', sans-serif"
export const FONT_MONO = "'Geist Mono', ui-monospace, 'SFMono-Regular', monospace"

export type TypeRole = {
  readonly size: string
  readonly lineHeight: string
  readonly weight: string
  readonly tracking?: string
  readonly uppercase?: boolean
  readonly mono?: boolean
}

export const TYPE: Record<string, TypeRole> = {
  microLabel: { size: '11px', lineHeight: '1.2', weight: '600', tracking: '0.06em', uppercase: true },
  label: { size: '12px', lineHeight: '1.3', weight: '400' },
  body: { size: '13px', lineHeight: '1.45', weight: '400' },
  bodyLarge: { size: '14px', lineHeight: '1.5', weight: '400' },
  metric: { size: '28px', lineHeight: '1.1', weight: '600', tracking: '-0.02em', mono: true },
  metricLarge: { size: '32px', lineHeight: '1.1', weight: '600', tracking: '-0.02em', mono: true },
  sectionTitle: { size: '15px', lineHeight: '1.3', weight: '600' },
  screenTitle: { size: '18px', lineHeight: '1.25', weight: '600', tracking: '-0.01em' },
}
