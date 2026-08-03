/**
 * Tema de gráfico (PD1). Recharts com estilo de fábrica — grade completa,
 * legenda em caixa, ponto em cada vértice — é assinatura de protótipo.
 *
 * Estas constantes são espalhadas nos componentes de gráfico via spread:
 * `<CartesianGrid {...CHART_GRID} />`, `<XAxis {...CHART_AXIS} />`. A regra
 * vive num lugar; a tela só consome.
 */
import { createElement } from 'react'
import type { CSSProperties } from 'react'

/** Grade: horizontal apenas, hairline pontilhado. */
export const CHART_GRID = {
  vertical: false,
  stroke: '#E2E8F0',
  strokeDasharray: '2 4',
} as const

/** Eixo em micro-rótulo, sem linha de eixo, ticks discretos. */
export const CHART_AXIS = {
  axisLine: false,
  tickLine: false,
  tick: { fontSize: 11, fill: '#64748B' },
  tickMargin: 8,
} as const

/** Linha: 2px, sem ponto por vértice — ponto no último valor e no hover. */
export const CHART_LINE = {
  strokeWidth: 2,
  dot: false,
  activeDot: { r: 3.5, strokeWidth: 0 },
} as const

type DotProps = { cx?: number; cy?: number; index?: number }

/**
 * Ponto de término da série (a promessa deste tema, cumprida): marca onde a
 * linha acaba, para o fim da série não parecer dado faltando. Quando
 * `lastIndex` fica antes do fim do eixo, acrescenta o rótulo "parcial".
 */
export function endpointDot(color: string, lastIndex: number, options?: { partial?: boolean }) {
  const render = (props: DotProps) => {
    if (props.index !== lastIndex || props.cx === undefined || props.cy === undefined) {
      return createElement('g', { key: `pt-${props.index ?? 'x'}` })
    }
    const children = [
      createElement('circle', { key: 'dot', cx: props.cx, cy: props.cy, r: 3.5, fill: color }),
    ]
    if (options?.partial) {
      children.push(
        createElement(
          'text',
          {
            key: 'label',
            x: props.cx + 8,
            y: props.cy + 4,
            fontSize: 11,
            fill: '#64748B',
          },
          'parcial',
        ),
      )
    }
    return createElement('g', { key: `pt-${props.index}` }, children)
  }
  return render
}

/** Área: preenchimento sólido de baixa opacidade. Nunca gradiente. */
export const CHART_AREA = {
  strokeWidth: 2,
  fillOpacity: 0.08,
  dot: false,
  activeDot: { r: 3.5, strokeWidth: 0 },
} as const

export const CHART_BAR = {
  radius: [2, 2, 0, 0] as [number, number, number, number],
  maxBarSize: 28,
} as const

/** Cursor do tooltip: linha fina, não bloco sombreado. */
export const CHART_CURSOR = { stroke: '#CBD5E1', strokeWidth: 1 } as const

export const CHART_TOOLTIP_STYLE: CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: 6,
  padding: '8px 10px',
  fontSize: 12,
  lineHeight: 1.4,
  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
}

/** Paleta de série: semântica ou neutra. Identidade de produto não entra em dado. */
export const SERIES_NEUTRALS = ['#334155', '#0E7490', '#B45309', '#64748B', '#7E22CE'] as const
