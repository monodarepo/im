import { useState } from 'react'
import { DataBadge } from '../../components/DataBadge'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { StateChip } from '../../components/StateChip'
import { formatInteger, formatPercent } from '../../domain/format'
import { formatMoney } from '../../domain/money'
import { SEMANTIC } from '../../design/tokens'
import { PRIORITY_COLOR, PRIORITY_LABEL } from '../../mock/nba'
import {
  BASE_ROUTE,
  REPLANNED_ROUTE,
  ROUTE_ALERTS,
  ROUTE_FACTORS,
  ROUTING_ATTESTATION,
  TRAVEL_SAVED_MINUTES,
  type Route,
  type Stop,
} from '../../mock/routing'

function StopRow({ stop, position, moved }: { stop: Stop; position: number; moved: boolean }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <span className="flex flex-col items-center">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full text-delta font-semibold text-white"
          style={{ backgroundColor: PRIORITY_COLOR[stop.priority] }}
        >
          {position}
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-delta-lg font-medium text-slate-900">{stop.label}</span>
          {moved ? <StateChip label="Reposicionada" tone="attention" /> : null}
        </span>
        <span className="mt-0.5 block text-delta text-neutral">{stop.sublabel}</span>
        <span className="mt-1 block text-delta tabular-nums text-neutral">
          Janela {stop.window} · chegada {stop.arrival} · {formatInteger(stop.durationMinutes)} min
          no local
        </span>
      </span>

      <span className="shrink-0 text-right">
        <span className="block text-delta-lg font-semibold tabular-nums text-slate-900">
          {stop.travelMinutes === 0 ? '—' : `${formatInteger(stop.travelMinutes)} min`}
        </span>
        <span className="block text-delta text-neutral">deslocamento</span>
      </span>
    </li>
  )
}

function RouteList({ route, reference }: { route: Route; reference: Route }) {
  const referenceOrder = reference.stops.map((stop) => stop.id)

  return (
    <ol className="divide-y divide-surface-border">
      {route.stops.map((stop, index) => (
        <StopRow
          key={stop.id}
          stop={stop}
          position={index + 1}
          moved={route.id !== reference.id && referenceOrder[index] !== stop.id}
        />
      ))}
    </ol>
  )
}

export function SmartRouting() {
  const [replanned, setReplanned] = useState(false)
  const route = replanned ? REPLANNED_ROUTE : BASE_ROUTE

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Roteirização inteligente
          </h1>
          <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
            A sequência que cabe no dia, não a lista ordenada por potencial
          </p>
        </div>

        <button
          type="button"
          onClick={() => setReplanned((value) => !value)}
          className={`rounded-control px-3 py-2 text-delta-lg font-medium transition-colors ${
            replanned
              ? 'border border-surface-border bg-surface-card text-slate-700 hover:bg-slate-50'
              : 'text-white'
          }`}
          style={replanned ? undefined : { backgroundColor: 'var(--product-accent)' }}
        >
          {replanned ? 'Voltar ao roteiro planejado' : 'Replanejar com os alertas'}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Paradas no dia"
          value={formatInteger(route.stops.length)}
          attestation={ROUTING_ATTESTATION}
        />
        <KpiCard
          label="Deslocamento total"
          value={`${formatInteger(route.totalTravelMinutes)} min`}
          {...(replanned
            ? { delta: -TRAVEL_SAVED_MINUTES, deltaUnit: 'points' as const, deltaInverted: true, comparison: 'vs. planejado' }
            : {})}
          attestation={ROUTING_ATTESTATION}
        />
        <KpiCard
          label="Potencial coberto"
          value={formatMoney(route.coveredPotentialBrl)}
          attestation={ROUTING_ATTESTATION}
        />
        <KpiCard
          label="Alertas abertos"
          value={formatInteger(replanned ? 0 : ROUTE_ALERTS.length)}
          attestation={ROUTING_ATTESTATION}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel
            title={route.label}
            description={
              replanned
                ? 'Ruptura e janela confirmada reordenaram a fila'
                : 'Ordenado por potencial, distância, trânsito e janela'
            }
            footer={<DataBadge attestation={ROUTING_ATTESTATION} variant="full" />}
          >
            <RouteList route={route} reference={BASE_ROUTE} />
          </Panel>
        </div>

        <div className="space-y-5 lg:col-span-5">
          <Panel
            title="Alertas do dia"
            description={
              replanned ? 'Absorvidos pelo replanejamento' : 'Ainda não incorporados ao roteiro'
            }
          >
            <ul className="space-y-3">
              {ROUTE_ALERTS.map((alert) => (
                <li
                  key={alert.id}
                  className="rounded-card border border-surface-border p-3"
                  style={{
                    borderLeftWidth: 3,
                    borderLeftColor:
                      alert.kind === 'stockout' ? SEMANTIC.negative : SEMANTIC.attention,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-delta-lg font-medium text-slate-900">{alert.title}</p>
                    <StateChip
                      label={replanned ? 'Absorvido' : 'Aberto'}
                      tone={replanned ? 'positive' : alert.kind === 'stockout' ? 'negative' : 'attention'}
                    />
                  </div>
                  <p className="mt-1 text-delta-lg text-slate-700">{alert.detail}</p>
                  <div className="mt-2 border-t border-surface-border pt-2">
                    <DataBadge attestation={alert.attestation} />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Como a fila é ordenada">
            <ul className="space-y-2.5">
              {ROUTE_FACTORS.map((factor) => (
                <li key={factor.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-delta-lg font-medium text-slate-900">{factor.label}</span>
                    <span className="text-delta-lg font-semibold tabular-nums text-slate-900">
                      {formatPercent(factor.weightPercent, 0)}
                    </span>
                  </div>
                  <span className="mt-1 block h-1.5 w-full rounded-full bg-slate-100">
                    <span
                      className="block h-1.5 rounded-full bg-slate-400"
                      style={{ width: `${factor.weightPercent}%` }}
                    />
                  </span>
                  <p className="mt-1 text-delta text-neutral">{factor.description}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <p className="text-delta text-neutral">
        Legenda de prioridade: {PRIORITY_LABEL.very_high}, {PRIORITY_LABEL.high},{' '}
        {PRIORITY_LABEL.medium}, {PRIORITY_LABEL.low}.
      </p>
    </div>
  )
}
