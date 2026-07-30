import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BRAZIL_UF_TILES, BRAZIL_VIEWBOX, type UfCode } from '../assets/brazil-uf'
import { SEMANTIC } from '../design/tokens'
import { formatDecimal, formatInteger, formatPercent } from '../domain/format'
import { formatMoney } from '../domain/money'
import {
  DEFAULT_LAYER,
  DRILL_LABEL,
  DRILL_ORDER,
  drillInto,
  findLayer,
  layerExtent,
  layerValue,
  MAP_LAYERS,
  rootNode,
  type DrillNode,
  type MapLayerId,
} from '../mock/mapLayers'
import { DataBadge } from './DataBadge'
import { ProductBadge } from './ProductBadge'

/**
 * Mapa inteligente da Torre.
 *
 * Nove camadas sobre a mesma geografia e um drill de seis níveis. A rampa de
 * cor é de matiz única e sempre normalizada pelos extremos da camada ativa:
 * a leitura é de intensidade, não de categoria, e trocar de camada não faz o
 * mapa mentir sobre a escala anterior.
 *
 * Em camada invertida — ruptura, preço relativo — o mais escuro é o pior, não
 * o maior. A legenda diz isso em palavras, porque a cor sozinha não diz.
 */

const RAMP = ['#EEF2F7', '#CBD9EA', '#9DBBDC', '#6795CB', '#2E6DB4'] as const

function formatByUnit(unit: string, value: number): string {
  if (unit === 'money') return formatMoney(value)
  if (unit === 'percent') return formatPercent(value)
  if (unit === 'integer') return formatInteger(value)
  return formatDecimal(value, 1)
}

type HoverState = { code: UfCode; name: string; x: number; y: number }

export function IntelligentMap() {
  const [layerId, setLayerId] = useState<MapLayerId>(DEFAULT_LAYER)
  const [path, setPath] = useState<readonly DrillNode[]>([])
  const [hover, setHover] = useState<HoverState | null>(null)

  const layer = findLayer(layerId)
  const extent = layerExtent(layerId)
  const current = path[path.length - 1]
  const children = current ? drillInto(current) : []

  const shadeOf = (value: number | undefined): string => {
    if (value === undefined) return '#F8FAFC'
    const span = extent.max - extent.min
    const normalized = span === 0 ? 0.5 : (value - extent.min) / span
    const oriented = layer.inverted ? 1 - normalized : normalized
    const index = Math.min(RAMP.length - 1, Math.max(0, Math.round(oriented * (RAMP.length - 1))))
    return RAMP[index] as string
  }

  const openUf = (code: UfCode, name: string) => {
    setPath([rootNode(code, layerId, name)])
  }

  const selectLayer = (next: MapLayerId) => {
    setLayerId(next)
    setPath([])
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1" role="group" aria-label="Camada do mapa">
        {MAP_LAYERS.map((option) => {
          const isActive = option.id === layerId
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => selectLayer(option.id)}
              aria-pressed={isActive}
              title={option.question}
              className="rounded-control border px-2.5 py-1 text-delta font-medium transition-colors"
              style={
                isActive
                  ? {
                      backgroundColor: 'var(--product-accent)',
                      borderColor: 'var(--product-accent)',
                      color: '#FFFFFF',
                    }
                  : { borderColor: '#E2E8F0', color: '#475569' }
              }
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-delta-lg text-slate-700">
          <ProductBadge product={layer.product} /> <span className="ml-1">{layer.question}</span>
        </p>
        <Link
          to={layer.route}
          className="text-delta font-medium underline"
          style={{ color: 'var(--product-accent)' }}
        >
          Abrir a tela que apura
        </Link>
      </div>

      {path.length > 0 ? <DrillBreadcrumb path={path} onNavigate={setPath} /> : null}

      {path.length === 0 ? (
        <div className="relative">
          <svg
            viewBox={`0 0 ${BRAZIL_VIEWBOX.width} ${BRAZIL_VIEWBOX.height}`}
            className="mx-auto block h-[360px] w-full"
            role="img"
            aria-label={`Mapa por unidade federativa — ${layer.label}`}
          >
            {BRAZIL_UF_TILES.map((tile) => {
              const value = layerValue(layerId, tile.code)
              const isHovered = hover?.code === tile.code
              const clickable = value !== undefined

              return (
                <g
                  key={tile.code}
                  onMouseEnter={(event) =>
                    setHover({
                      code: tile.code,
                      name: tile.name,
                      x: event.nativeEvent.offsetX,
                      y: event.nativeEvent.offsetY,
                    })
                  }
                  onMouseLeave={() => setHover(null)}
                  onClick={clickable ? () => openUf(tile.code, tile.name) : undefined}
                  className={clickable ? 'cursor-pointer' : 'cursor-default'}
                >
                  <path
                    d={tile.path}
                    fill={shadeOf(value)}
                    stroke={isHovered ? '#0F172A' : '#FFFFFF'}
                    strokeWidth={isHovered ? 3 : 2}
                  />
                  <text
                    x={tile.cx}
                    y={tile.cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={tile.small ? 17 : 26}
                    fontWeight={600}
                    fill="#334155"
                    stroke="#FFFFFF"
                    strokeWidth={4}
                    strokeLinejoin="round"
                    paintOrder="stroke"
                    pointerEvents="none"
                  >
                    {tile.code}
                  </text>
                </g>
              )
            })}
          </svg>

          {hover ? (
            <MapTooltip hover={hover} layerId={layerId} unit={layer.unit} label={layer.label} />
          ) : null}
        </div>
      ) : (
        <DrillTable
          parent={current as DrillNode}
          children={children}
          unit={layer.unit}
          onDrill={(node) => setPath([...path, node])}
        />
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-surface-border pt-3">
        <span className="text-delta font-medium text-slate-700">{layer.label}</span>
        <span className="inline-flex items-center gap-1">
          <span className="text-delta text-neutral">
            {layer.inverted ? 'melhor' : 'menor'}
          </span>
          {RAMP.map((color) => (
            <span
              key={color}
              className="h-3 w-7 rounded-sm border border-slate-200"
              style={{ backgroundColor: color }}
            />
          ))}
          <span className="text-delta text-neutral">{layer.inverted ? 'pior' : 'maior'}</span>
        </span>
        <DataBadge attestation={layer.attestation} />
      </div>
    </div>
  )
}

function DrillBreadcrumb({
  path,
  onNavigate,
}: {
  path: readonly DrillNode[]
  onNavigate: (path: readonly DrillNode[]) => void
}) {
  return (
    <nav aria-label="Navegação do drill" className="mb-3 flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onNavigate([])}
        className="rounded-control px-2 py-0.5 text-delta font-medium underline"
        style={{ color: 'var(--product-accent)' }}
      >
        Brasil
      </button>
      {path.map((node, index) => (
        <span key={node.id} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="text-neutral">
            ›
          </span>
          {index === path.length - 1 ? (
            <span className="text-delta font-semibold text-slate-900">
              {node.name}
              <span className="ml-1 font-normal text-neutral">({DRILL_LABEL[node.level]})</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate(path.slice(0, index + 1))}
              className="text-delta font-medium underline"
              style={{ color: 'var(--product-accent)' }}
            >
              {node.name}
            </button>
          )}
        </span>
      ))}
    </nav>
  )
}

function DrillTable({
  parent,
  children,
  unit,
  onDrill,
}: {
  parent: DrillNode
  children: readonly DrillNode[]
  unit: string
  onDrill: (node: DrillNode) => void
}) {
  const nextLevel = DRILL_ORDER[DRILL_ORDER.indexOf(parent.level) + 1]
  const total = children.reduce((sum, node) => sum + node.value, 0)

  if (children.length === 0) {
    return (
      <div className="rounded-control border border-surface-border bg-slate-50 px-4 py-6 text-center">
        <p className="text-delta-lg font-medium text-slate-900">{parent.name}</p>
        <p className="mt-1 text-delta-lg tabular-nums text-slate-700">
          {formatByUnit(unit, parent.value)}
        </p>
        <p className="mt-2 text-delta text-neutral">
          Último nível do drill. Abaixo de produto não há decomposição.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left">
        <caption className="sr-only">
          Decomposição de {parent.name} por {nextLevel ? DRILL_LABEL[nextLevel] : 'nível seguinte'}
        </caption>
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 font-medium">{nextLevel ? DRILL_LABEL[nextLevel] : 'Item'}</th>
            <th className="pb-2 text-right font-medium">Valor</th>
            <th className="pb-2 text-right font-medium">Participação</th>
            <th className="pb-2 text-right font-medium">Abrir</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {children.map((node) => (
            <tr key={node.id} className="text-delta-lg transition-colors hover:bg-slate-50">
              <td className="py-2.5 text-slate-900">{node.name}</td>
              <td className="py-2.5 text-right font-medium tabular-nums text-slate-900">
                {formatByUnit(unit, node.value)}
              </td>
              <td className="py-2.5 text-right tabular-nums text-slate-600">
                {formatPercent(node.sharePercent, 1)}
              </td>
              <td className="py-2.5 text-right">
                {node.level === 'produto' ? (
                  <span className="text-delta text-neutral">—</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onDrill(node)}
                    className="text-delta font-medium underline"
                    style={{ color: 'var(--product-accent)' }}
                  >
                    Descer
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-surface-border text-delta-lg font-semibold">
            <td className="pt-2.5 text-slate-900">Total</td>
            <td className="pt-2.5 text-right tabular-nums text-slate-900">
              {formatByUnit(unit, total)}
            </td>
            <td className="pt-2.5 text-right tabular-nums text-slate-600">
              {formatPercent(100, 1)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>

      <p className="mt-2 text-delta text-neutral">
        A soma dos itens fecha o valor de {parent.name}: decomposição, não amostra.
      </p>
    </div>
  )
}

function MapTooltip({
  hover,
  layerId,
  unit,
  label,
}: {
  hover: HoverState
  layerId: MapLayerId
  unit: string
  label: string
}) {
  const value = layerValue(layerId, hover.code)

  return (
    <div
      className="pointer-events-none absolute z-10 w-56 rounded-control border border-surface-border bg-surface-card px-3 py-2 shadow-md"
      style={{ left: Math.min(hover.x + 12, 320), top: hover.y + 12 }}
    >
      <p className="text-delta font-semibold text-slate-900">
        {hover.code} · {hover.name}
      </p>
      {value === undefined ? (
        <p className="mt-1 text-delta text-neutral">Sem valor priorizado nesta camada</p>
      ) : (
        <>
          <p className="mt-1 text-delta-lg font-semibold tabular-nums text-slate-900">
            {formatByUnit(unit, value)}
          </p>
          <p className="mt-0.5 text-delta text-neutral">{label}</p>
          <p className="mt-1 text-delta" style={{ color: SEMANTIC.neutral }}>
            Clique para descer ao município
          </p>
        </>
      )}
    </div>
  )
}
