import { useState } from 'react'
import { DataBadge } from '../../components/DataBadge'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { SemanticDelta } from '../../components/SemanticDelta'
import { StateChip } from '../../components/StateChip'
import { BRAZIL_UF_TILES, BRAZIL_VIEWBOX, type UfCode } from '../../assets/brazil-uf'
import { OPPORTUNITY_LEVELS, OPPORTUNITY_SCALE } from '../../design/tokens'
import { formatPercent } from '../../domain/format'
import { formatMoney, formatMoneyFull } from '../../domain/money'
import {
  DEFAULT_MAP_LAYER,
  EVALUATED_UF_COUNT,
  findMapLayer,
  layerLevel,
  layerValueLabel,
  MAP_LAYERS,
  opportunityLabelFor,
  TERRITORY_ATTESTATION,
  TERRITORY_BY_UF,
  TERRITORY_KPIS,
  TERRITORY_PROFILES,
  WHITE_SPACE_CRITERION,
  WHITE_SPACE_TOTAL_BRL,
  WHITE_SPACES,
  type MapLayerId,
} from '../../mock/territories'
import { useFilters } from '../../state/filtersStore'

/**
 * Território 360° (módulo 1.5 do ESCOPO).
 *
 * A tabela ranqueia os espaços em branco pelo impacto em R$; o mapa mostra o
 * mesmo território por camada — potencial, presença, gap e oportunidade — para
 * que a leitura da linha e a leitura do mapa sejam a mesma leitura.
 *
 * A UF selecionada no filtro global de região chega destacada: a Visão Geral
 * navega para cá aplicando o filtro ao clicar no mapa de oportunidades.
 */

function selectedUfSet(region: readonly string[]): ReadonlySet<UfCode> {
  return new Set(TERRITORY_PROFILES.filter((profile) => region.includes(profile.uf)).map((p) => p.uf))
}

function CriterionCallout() {
  return (
    <div className="rounded-control border border-surface-border bg-slate-50 px-4 py-3">
      <p className="text-delta-lg font-semibold text-slate-900">
        Critério: {WHITE_SPACE_CRITERION.title}
      </p>
      <ul className="mt-2 space-y-1">
        <li className="flex gap-2 text-delta-lg text-slate-700">
          <span className="shrink-0 font-medium text-neutral">Alto potencial</span>
          <span aria-hidden className="text-neutral">
            ·
          </span>
          <span>{WHITE_SPACE_CRITERION.potential}</span>
        </li>
        <li className="flex gap-2 text-delta-lg text-slate-700">
          <span className="shrink-0 font-medium text-neutral">Baixa presença</span>
          <span aria-hidden className="text-neutral">
            ·
          </span>
          <span>{WHITE_SPACE_CRITERION.presence}</span>
        </li>
      </ul>
      <p className="mt-2 text-delta text-neutral">{WHITE_SPACE_CRITERION.note}</p>
      <p className="mt-1 text-delta text-neutral">{WHITE_SPACE_CRITERION.coverage}</p>
    </div>
  )
}

function WhiteSpaceTable({ selected }: { selected: ReadonlySet<UfCode> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 font-medium">#</th>
            <th className="pb-2 font-medium">Território / UF</th>
            <th className="pb-2 text-right font-medium">Potencial</th>
            <th className="pb-2 text-right font-medium">Presença atual</th>
            <th className="pb-2 text-right font-medium">Gap</th>
            <th className="pb-2 text-right font-medium">Oportunidade (R$)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {WHITE_SPACES.map((space) => {
            const highlighted = space.ufs.some((uf) => selected.has(uf))

            return (
              <tr
                key={space.decisionId}
                className={`text-delta-lg transition-colors ${
                  highlighted ? 'bg-slate-100' : 'hover:bg-slate-50'
                }`}
              >
                <td className="py-2.5 pr-2 align-top tabular-nums text-neutral">{space.rank}</td>
                <td className="py-2.5 align-top">
                  <div className="flex items-center gap-2">
                    {highlighted ? (
                      <span
                        aria-hidden
                        className="h-4 w-1 rounded-full"
                        style={{ backgroundColor: 'var(--product-accent)' }}
                      />
                    ) : null}
                    <span className="font-medium text-slate-900">{space.label}</span>
                  </div>
                  <p className="mt-0.5 text-delta text-neutral">
                    {space.scopeLabel} · {space.action} · {space.decisionId}
                  </p>
                </td>
                <td
                  className="py-2.5 text-right align-top tabular-nums text-slate-700"
                  title={formatMoneyFull(space.potentialBrl)}
                >
                  {formatMoney(space.potentialBrl)}
                </td>
                <td className="py-2.5 text-right align-top tabular-nums text-slate-700">
                  {formatPercent(space.presencePercent)}
                </td>
                <td className="py-2.5 text-right align-top">
                  <SemanticDelta value={space.gapPoints} unit="points" size="sm" />
                </td>
                <td
                  className="py-2.5 text-right align-top font-semibold tabular-nums text-slate-900"
                  title={formatMoneyFull(space.opportunityBrl)}
                >
                  {formatMoney(space.opportunityBrl)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

type HoverState = { code: UfCode; name: string; x: number; y: number }

function HeatmapTooltip({ hover, layer }: { hover: HoverState; layer: MapLayerId }) {
  const profile = TERRITORY_BY_UF[hover.code]
  const action = opportunityLabelFor(hover.code)

  return (
    <div
      className="pointer-events-none absolute z-10 w-60 rounded-control border border-surface-border bg-surface-card px-3 py-2 shadow-md"
      style={{ left: Math.min(hover.x + 12, 300), top: hover.y + 12 }}
    >
      <p className="text-delta font-semibold text-slate-900">
        {hover.code} · {hover.name}
      </p>
      <p className="mt-1 text-delta-lg font-semibold tabular-nums text-slate-900">
        {layerValueLabel(layer, hover.code)}
      </p>
      <dl className="mt-1.5 space-y-0.5">
        <div className="flex justify-between gap-2 text-delta text-neutral">
          <dt>Potencial</dt>
          <dd className="tabular-nums text-slate-700">{formatMoney(profile.potentialBrl)}</dd>
        </div>
        <div className="flex justify-between gap-2 text-delta text-neutral">
          <dt>Presença</dt>
          <dd className="tabular-nums text-slate-700">{formatPercent(profile.presencePercent)}</dd>
        </div>
        <div className="flex justify-between gap-2 text-delta text-neutral">
          <dt>Gap</dt>
          <dd>
            <SemanticDelta value={profile.gapPoints} unit="points" size="sm" />
          </dd>
        </div>
      </dl>
      <p className="mt-1.5 text-delta text-neutral">
        {action ?? 'Sem oportunidade priorizada'}
      </p>
    </div>
  )
}

function TerritoryHeatmap({ selected }: { selected: ReadonlySet<UfCode> }) {
  const [layerId, setLayerId] = useState<MapLayerId>(DEFAULT_MAP_LAYER)
  const [hover, setHover] = useState<HoverState | null>(null)
  const layer = findMapLayer(layerId)

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex rounded-control border border-surface-border p-0.5"
          role="group"
          aria-label="Camada do mapa"
        >
          {MAP_LAYERS.map((option) => {
            const isActive = option.id === layerId
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setLayerId(option.id)}
                title={option.description}
                aria-pressed={isActive}
                className={`rounded-control px-3 py-1 text-delta font-medium transition-colors ${
                  isActive ? '' : 'text-slate-600 hover:bg-slate-50'
                }`}
                style={
                  isActive ? { backgroundColor: 'var(--product-accent)', color: '#FFFFFF' } : undefined
                }
              >
                {option.label}
              </button>
            )
          })}
        </div>
        <p className="text-delta text-neutral">{layer.description}</p>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${BRAZIL_VIEWBOX.width} ${BRAZIL_VIEWBOX.height}`}
          className="mx-auto block h-[380px] w-full"
          role="img"
          aria-label={`Mapa de calor por unidade federativa — camada ${layer.label}`}
        >
          {BRAZIL_UF_TILES.map((tile) => {
            const level = layerLevel(layerId, tile.code)
            const isHovered = hover?.code === tile.code
            const isSelected = selected.has(tile.code)

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
              >
                <path
                  d={tile.path}
                  fill={OPPORTUNITY_SCALE[level].color}
                  stroke={isHovered ? '#0F172A' : isSelected ? 'var(--product-accent)' : '#FFFFFF'}
                  strokeWidth={isHovered || isSelected ? 4 : 2}
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

        {hover ? <HeatmapTooltip hover={hover} layer={layerId} /> : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-delta font-medium text-slate-700">{layer.legendTitle}</span>
        <span className="inline-flex items-center gap-1">
          <span className="text-delta text-neutral">{layer.legendLow}</span>
          {OPPORTUNITY_LEVELS.map((level) => (
            <span
              key={level}
              title={OPPORTUNITY_SCALE[level].label}
              className="h-3 w-7 rounded-sm border border-slate-200"
              style={{ backgroundColor: OPPORTUNITY_SCALE[level].color }}
            />
          ))}
          <span className="text-delta text-neutral">{layer.legendHigh}</span>
        </span>
      </div>
    </div>
  )
}

function SelectionStrip({ selected }: { selected: ReadonlySet<UfCode> }) {
  const clear = useFilters((state) => state.clear)
  const profiles = TERRITORY_PROFILES.filter((profile) => selected.has(profile.uf))

  if (profiles.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-delta text-neutral">UF em destaque:</span>
      {profiles.map((profile) => (
        <StateChip
          key={profile.uf}
          label={`${profile.uf} · ${profile.name} — presença ${formatPercent(profile.presencePercent)}`}
          tone={profile.whiteSpace ? 'attention' : 'neutral'}
        />
      ))}
      <button
        type="button"
        onClick={() => clear('region')}
        className="rounded-control border border-surface-border px-2 py-0.5 text-delta font-medium text-slate-600 transition-colors hover:bg-slate-50"
      >
        Limpar destaque
      </button>
    </div>
  )
}

export function Territory360() {
  const region = useFilters((state) => state.selections.region)
  const selected = selectedUfSet(region)

  return (
    <div className="space-y-5">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Território 360°</h1>

      <SelectionStrip selected={selected} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TERRITORY_KPIS.map((kpi) => (
          <KpiCard
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            attestation={kpi.attestation}
            {...(kpi.delta !== undefined ? { delta: kpi.delta } : {})}
            {...(kpi.deltaUnit !== undefined ? { deltaUnit: kpi.deltaUnit } : {})}
            {...(kpi.comparison !== undefined ? { comparison: kpi.comparison } : {})}
          />
        ))}
      </div>

      <Panel
        title="White spaces"
        description={`Territórios ordenados por oportunidade em R$ — ${EVALUATED_UF_COUNT} UFs avaliadas, total priorizado de ${formatMoney(WHITE_SPACE_TOTAL_BRL)}`}
        action={<FutureButton label="Exportar plano de território" phase="Fase 2" />}
        footer={<DataBadge attestation={TERRITORY_ATTESTATION} variant="full" />}
      >
        <div className="space-y-4">
          <CriterionCallout />
          <WhiteSpaceTable selected={selected} />
        </div>
      </Panel>

      <Panel
        title="Mapa de calor por camada"
        description="A mesma malha de UFs lida por potencial, presença, gap e oportunidade"
        footer={<DataBadge attestation={TERRITORY_ATTESTATION} variant="full" />}
      >
        <TerritoryHeatmap selected={selected} />
      </Panel>
    </div>
  )
}
