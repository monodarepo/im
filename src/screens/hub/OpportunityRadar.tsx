import { useState } from 'react'
import { Link } from 'react-router-dom'
import { create } from 'zustand'
import { ConfidenceMeter } from '../../components/ConfidenceMeter'
import { DataBadge } from '../../components/DataBadge'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { StateChip } from '../../components/StateChip'
import type { SemanticTone } from '../../design/tokens'
import { formatInteger } from '../../domain/format'
import { formatMoney, formatMoneyFull } from '../../domain/money'
import { formatRelative, HOJE, type IsoDate } from '../../domain/today'
import {
  EFFORT_LABEL,
  INACTION_ATTESTATION,
  INACTION_HORIZON_DAYS,
  INACTION_PARTS,
  INACTION_TOTAL_BRL,
  nextDecisionId,
  RADAR_ATTESTATION,
  RADAR_AXES,
  RADAR_CANDIDATE_COUNT,
  RADAR_CANONICAL_COUNT,
  RADAR_ENTRIES,
  RADAR_PRIORITIZED_BRL,
  sortByAxis,
  URGENCY_LABEL,
  type Effort,
  type RadarAxis,
  type RadarEntry,
  type Urgency,
} from '../../mock/radar'
import { useDecisions } from '../../state/decisionsStore'

/**
 * Decisões criadas a partir do radar.
 *
 * Transformar uma oportunidade em Decisão não abre tela nova: grava o vínculo
 * entre a linha do radar e o identificador da decisão, e o mesmo clique
 * registra o encaminhamento no objeto de Decisão da plataforma.
 *
 * O store vive aqui só enquanto a fiação da tela não acontece — o destino é
 * `src/state/radarDecisionsStore.ts`, ao lado dos demais.
 */

export type RadarDecision = {
  readonly radarId: string
  readonly decisionId: string
  readonly createdOn: IsoDate
}

type RadarDecisionsState = {
  readonly created: readonly RadarDecision[]
  /** Cria a decisão da oportunidade e devolve o identificador; idempotente. */
  convert: (radarId: string) => string
  decisionOf: (radarId: string) => RadarDecision | undefined
  reset: () => void
}

export const useRadarDecisions = create<RadarDecisionsState>((set, get) => ({
  created: [],

  convert: (radarId) => {
    const existing = get().created.find((item) => item.radarId === radarId)
    if (existing) return existing.decisionId

    const decisionId = nextDecisionId(get().created.length)
    set((state) => ({
      created: [...state.created, { radarId, decisionId, createdOn: HOJE }],
    }))
    return decisionId
  },

  decisionOf: (radarId) => get().created.find((item) => item.radarId === radarId),

  reset: () => set({ created: [] }),
}))

const URGENCY_TONE: Record<Urgency, SemanticTone> = {
  critical: 'negative',
  high: 'attention',
  medium: 'neutral',
  low: 'neutral',
}

const EFFORT_TONE: Record<Effort, SemanticTone> = {
  low: 'positive',
  medium: 'attention',
  high: 'negative',
}

const COLUMNS: readonly { readonly label: string; readonly align: 'left' | 'right' }[] = [
  { label: '#', align: 'left' },
  { label: 'Oportunidade', align: 'left' },
  { label: 'Valor', align: 'right' },
  { label: 'Urgência', align: 'left' },
  { label: 'Confiança', align: 'left' },
  { label: 'Esforço', align: 'left' },
  { label: 'Custo da não ação', align: 'right' },
  { label: 'Decisão', align: 'right' },
]

function AxisSelector({
  axis,
  descending,
  onSelect,
}: {
  axis: RadarAxis
  descending: boolean
  onSelect: (next: RadarAxis) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-delta font-medium uppercase tracking-wide text-neutral">
        Ordenar por
      </span>
      {RADAR_AXES.map((option) => {
        const active = option.id === axis
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            title={option.hint}
            onClick={() => onSelect(option.id)}
            className={`rounded-control px-3 py-1.5 text-delta-lg font-medium transition-colors ${
              active
                ? 'text-white'
                : 'border border-surface-border bg-surface-card text-slate-600 hover:bg-slate-50'
            }`}
            style={active ? { backgroundColor: 'var(--product-accent)' } : undefined}
          >
            {option.label}
            {active ? (
              <span aria-hidden className="ml-1.5 text-[0.7em]">
                {descending ? '▼' : '▲'}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

function DecisionCell({ entry }: { entry: RadarEntry }) {
  const created = useRadarDecisions((state) =>
    state.created.find((item) => item.radarId === entry.id),
  )
  const convert = useRadarDecisions((state) => state.convert)
  const forward = useDecisions((state) => state.forward)

  if (entry.decisionId) {
    return (
      <div className="flex flex-col items-end gap-1">
        <StateChip label="Já é decisão" tone="neutral" muted />
        <Link
          to={`/decisoes/${entry.decisionId}`}
          className="text-delta font-medium tabular-nums underline"
          style={{ color: 'var(--product-accent)' }}
        >
          {entry.decisionId} →
        </Link>
      </div>
    )
  }

  if (created) {
    return (
      <div className="flex flex-col items-end gap-1">
        <StateChip label="Decisão criada" tone="positive" />
        <span className="text-delta font-medium tabular-nums text-neutral">
          {created.decisionId} · {formatRelative(created.createdOn)}
        </span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => forward(convert(entry.id), 'hub', entry.title)}
      className="rounded-control px-3 py-1.5 text-delta-lg font-medium text-white transition-opacity hover:opacity-90"
      style={{ backgroundColor: 'var(--product-accent)' }}
    >
      Transformar em Decisão
    </button>
  )
}

function InactionBreakdown({ entry }: { entry: RadarEntry }) {
  return (
    <div className="rounded-control bg-slate-50 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <ul className="min-w-0 flex-1 space-y-1.5">
          {INACTION_PARTS.map((part) => (
            <li key={part.id} className="flex items-baseline justify-between gap-6">
              <span className="text-delta-lg text-slate-700">{part.label}</span>
              <span className="text-delta-lg font-medium tabular-nums text-negative">
                {formatMoneyFull(entry.inactionCost[part.id])}
              </span>
            </li>
          ))}
          <li className="flex items-baseline justify-between gap-6 border-t border-surface-border pt-1.5">
            <span className="text-delta-lg font-semibold text-slate-900">
              Custo total em {formatInteger(INACTION_HORIZON_DAYS)} dias
            </span>
            <span className="text-delta-lg font-semibold tabular-nums text-negative">
              {formatMoneyFull(entry.inactionCost.totalBrl)}
            </span>
          </li>
        </ul>

        <div className="shrink-0">
          <DataBadge attestation={entry.inactionCost.attestation} variant="full" />
        </div>
      </div>
    </div>
  )
}

function RadarRow({
  entry,
  position,
  expanded,
  onToggle,
}: {
  entry: RadarEntry
  position: number
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <tbody className="border-t border-surface-border align-top">
      <tr>
        <td className="py-3 pr-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-delta font-semibold tabular-nums text-slate-600">
            {position}
          </span>
        </td>

        <td className="py-3 pr-4">
          <span className="block text-delta-lg font-medium text-slate-900">{entry.title}</span>
          <span className="mt-0.5 block text-delta text-neutral">
            {entry.scopeLabel}
            {entry.canonical ? null : ' · candidata em triagem'}
          </span>
          <span className="mt-1 block">
            <DataBadge attestation={entry.attestation} />
          </span>
        </td>

        <td className="py-3 pr-4 text-right">
          <span className="block text-delta-lg font-semibold tabular-nums text-slate-900">
            {formatMoney(entry.impactBrl)}
          </span>
          <span className="mt-0.5 block text-delta tabular-nums text-neutral">
            {formatMoneyFull(entry.impactBrl)}
          </span>
        </td>

        <td className="py-3 pr-4">
          <StateChip
            label={URGENCY_LABEL[entry.urgency]}
            tone={URGENCY_TONE[entry.urgency]}
            muted={entry.urgency === 'low'}
          />
          <span className="mt-1 block text-delta tabular-nums text-neutral">
            Janela fecha {formatRelative(entry.deadline)}
          </span>
        </td>

        <td className="py-3 pr-4">
          <ConfidenceMeter confidence={entry.confidence} showLabel />
        </td>

        <td className="py-3 pr-4">
          <StateChip label={EFFORT_LABEL[entry.effort]} tone={EFFORT_TONE[entry.effort]} />
          <span className="mt-1 block text-delta tabular-nums text-neutral">
            {formatInteger(entry.effortWeeks)} semanas
          </span>
        </td>

        <td className="py-3 pr-4 text-right">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={onToggle}
            className="rounded-control px-2 py-1 text-right transition-colors hover:bg-slate-50"
          >
            <span className="block text-delta-lg font-semibold tabular-nums text-negative">
              {formatMoney(entry.inactionCost.totalBrl)}
            </span>
            <span className="mt-0.5 block text-delta text-neutral">
              {expanded ? 'ocultar decomposição' : 'ver decomposição'}
              <span aria-hidden className="ml-1">
                {expanded ? '▲' : '▼'}
              </span>
            </span>
          </button>
        </td>

        <td className="py-3 text-right">
          <DecisionCell entry={entry} />
        </td>
      </tr>

      {expanded ? (
        <tr>
          <td className="pb-4" />
          <td className="pb-4" colSpan={COLUMNS.length - 1}>
            <InactionBreakdown entry={entry} />
          </td>
        </tr>
      ) : null}
    </tbody>
  )
}

export function OpportunityRadar() {
  const [axis, setAxis] = useState<RadarAxis>('value')
  const [descending, setDescending] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const entries = sortByAxis(RADAR_ENTRIES, axis, descending)

  const selectAxis = (next: RadarAxis): void => {
    if (next === axis) {
      setDescending(!descending)
      return
    }
    setAxis(next)
    setDescending(true)
  }

  return (
    <div className="space-y-5">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Radar de oportunidades
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Impacto priorizado"
          value={formatMoney(RADAR_PRIORITIZED_BRL)}
          attestation={RADAR_ATTESTATION}
        />
        <KpiCard
          label={`Custo da não ação (${formatInteger(INACTION_HORIZON_DAYS)} dias)`}
          value={formatMoney(INACTION_TOTAL_BRL)}
          attestation={INACTION_ATTESTATION}
        />
        <KpiCard
          label="Candidatas em triagem"
          value={formatInteger(RADAR_CANDIDATE_COUNT)}
          attestation={RADAR_ATTESTATION}
        />
      </div>

      <Panel
        title="Ranking por valor, urgência, confiança e esforço"
        description={`${formatInteger(RADAR_CANONICAL_COUNT)} oportunidades priorizadas e ${formatInteger(RADAR_CANDIDATE_COUNT)} candidatas ainda sem decisão`}
        action={<FutureButton label="Simular repriorização" phase="Fase 2" />}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DataBadge attestation={RADAR_ATTESTATION} variant="full" />
            <span>
              Valor e confiança vêm das fontes atestadas. Urgência, esforço e custo da não ação são
              estimativas do modelo de priorização.
            </span>
          </div>
        }
      >
        <div className="space-y-4">
          <AxisSelector axis={axis} descending={descending} onSelect={selectAxis} />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left">
              <thead>
                <tr>
                  {COLUMNS.map((column) => (
                    <th
                      key={column.label}
                      scope="col"
                      className={`pb-2 text-delta font-medium uppercase tracking-wide text-neutral ${
                        column.align === 'right' ? 'text-right' : ''
                      }`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>

              {entries.map((entry, index) => (
                <RadarRow
                  key={entry.id}
                  entry={entry}
                  position={index + 1}
                  expanded={expandedId === entry.id}
                  onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                />
              ))}
            </table>
          </div>
        </div>
      </Panel>

      <Panel
        title="Como o radar prioriza"
        description="Os quatro eixos entram na mesma tabela para que a escolha não dependa de um índice único"
      >
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {RADAR_AXES.map((option) => (
            <li key={option.id} className="rounded-control border border-surface-border px-3 py-2.5">
              <span className="block text-delta-lg font-medium text-slate-900">{option.label}</span>
              <span className="mt-0.5 block text-delta text-neutral">{option.hint}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
