import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BRAZIL_UF_TILES, BRAZIL_VIEWBOX, type UfCode } from '../assets/brazil-uf'
import { OPPORTUNITY_LEVELS, OPPORTUNITY_SCALE } from '../design/tokens'
import { formatMoney } from '../domain/money'
import { opportunityLevel, UF_OPPORTUNITY } from '../mock/opportunities'
import { useFilters } from '../state/filtersStore'

/**
 * Mapa de oportunidades por UF.
 *
 * O preenchimento vem da escala de 5 níveis; clicar numa UF aplica o filtro de
 * região e leva ao Território 360°, para que a leitura do mapa continue na tela
 * de detalhe sem refazer a seleção.
 */

type Granularity = 'estado' | 'municipio' | 'territorio'

const GRANULARITIES: readonly { id: Granularity; label: string; phase?: string }[] = [
  { id: 'estado', label: 'Estado' },
  { id: 'municipio', label: 'Município', phase: 'Fase 2' },
  { id: 'territorio', label: 'Território', phase: 'Fase 2' },
]

const ZOOM_STEP = 0.25
const ZOOM_MIN = 1
const ZOOM_MAX = 2

type HoverState = { code: UfCode; name: string; x: number; y: number }

export function OpportunityMap() {
  const navigate = useNavigate()
  const setSelection = useFilters((state) => state.setSelection)

  const [granularity, setGranularity] = useState<Granularity>('estado')
  const [zoom, setZoom] = useState(ZOOM_MIN)
  const [hover, setHover] = useState<HoverState | null>(null)

  const openTerritory = (uf: UfCode) => {
    setSelection('region', [uf])
    navigate('/hub/territorio-360')
  }

  const width = BRAZIL_VIEWBOX.width / zoom
  const height = BRAZIL_VIEWBOX.height / zoom
  const offsetX = (BRAZIL_VIEWBOX.width - width) / 2
  const offsetY = (BRAZIL_VIEWBOX.height - height) / 2

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex rounded-control border border-surface-border p-0.5"
          role="group"
          aria-label="Granularidade do mapa"
        >
          {GRANULARITIES.map((option) => {
            const isActive = option.id === granularity
            const isDisabled = option.phase !== undefined
            return (
              <button
                key={option.id}
                type="button"
                disabled={isDisabled}
                onClick={() => setGranularity(option.id)}
                title={isDisabled ? `${option.label} — ${option.phase}` : option.label}
                className={`rounded-[10px] px-3 py-1 text-delta font-medium transition-colors ${
                  isDisabled ? 'cursor-not-allowed text-slate-300' : 'text-slate-600 hover:bg-slate-50'
                }`}
                style={isActive ? { backgroundColor: 'var(--product-accent)', color: '#FFFFFF' } : undefined}
              >
                {option.label}
                {option.phase ? <span className="ml-1 text-[10px]">{option.phase}</span> : null}
              </button>
            )
          })}
        </div>

        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            aria-label="Diminuir zoom"
            disabled={zoom <= ZOOM_MIN}
            onClick={() => setZoom((value) => Math.max(ZOOM_MIN, value - ZOOM_STEP))}
            className="flex h-7 w-7 items-center justify-center rounded-control border border-surface-border text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            <span aria-hidden>−</span>
          </button>
          <span className="w-10 text-center text-delta tabular-nums text-neutral">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            aria-label="Aumentar zoom"
            disabled={zoom >= ZOOM_MAX}
            onClick={() => setZoom((value) => Math.min(ZOOM_MAX, value + ZOOM_STEP))}
            className="flex h-7 w-7 items-center justify-center rounded-control border border-surface-border text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            <span aria-hidden>+</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`${offsetX} ${offsetY} ${width} ${height}`}
          className="mx-auto block h-[380px] w-full"
          role="img"
          aria-label="Mapa de oportunidades por unidade federativa"
        >
          {BRAZIL_UF_TILES.map((tile) => {
            const opportunity = UF_OPPORTUNITY[tile.code]
            const level = opportunityLevel(opportunity?.impactBrl)
            const isHovered = hover?.code === tile.code
            const clickable = opportunity !== undefined

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
                onClick={clickable ? () => openTerritory(tile.code) : undefined}
                className={clickable ? 'cursor-pointer' : 'cursor-default'}
              >
                <path
                  d={tile.path}
                  fill={OPPORTUNITY_SCALE[level].color}
                  stroke={isHovered ? '#0F172A' : '#FFFFFF'}
                  strokeWidth={isHovered ? 3 : 2}
                />
                <text
                  x={tile.cx}
                  y={tile.cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={32}
                  fontWeight={600}
                  fill={level >= 4 ? '#FFFFFF' : '#334155'}
                  pointerEvents="none"
                >
                  {tile.code}
                </text>
              </g>
            )
          })}
        </svg>

        {hover ? <MapTooltip hover={hover} /> : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-delta font-medium text-slate-700">Oportunidade (impacto R$)</span>
        <span className="inline-flex items-center gap-1">
          <span className="text-delta text-neutral">menor</span>
          {OPPORTUNITY_LEVELS.map((level) => (
            <span
              key={level}
              title={OPPORTUNITY_SCALE[level].label}
              className="h-3 w-7 rounded-sm border border-slate-200"
              style={{ backgroundColor: OPPORTUNITY_SCALE[level].color }}
            />
          ))}
          <span className="text-delta text-neutral">maior</span>
        </span>
      </div>
    </div>
  )
}

function MapTooltip({ hover }: { hover: HoverState }) {
  const opportunity = UF_OPPORTUNITY[hover.code]

  return (
    <div
      className="pointer-events-none absolute z-10 w-56 rounded-control border border-surface-border bg-surface-card px-3 py-2 shadow-md"
      style={{ left: Math.min(hover.x + 12, 320), top: hover.y + 12 }}
    >
      <p className="text-delta font-semibold text-slate-900">
        {hover.code} · {hover.name}
      </p>
      {opportunity ? (
        <>
          <p className="mt-1 text-delta-lg font-semibold tabular-nums text-slate-900">
            {formatMoney(opportunity.impactBrl)}
          </p>
          <p className="mt-0.5 text-delta text-neutral">
            {opportunity.regional ? `Agregado — ${opportunity.label}` : opportunity.label}
          </p>
        </>
      ) : (
        <p className="mt-1 text-delta text-neutral">Sem oportunidade priorizada</p>
      )}
    </div>
  )
}
