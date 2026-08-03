import { ThreadRibbon } from '../../components/ThreadRibbon'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DataBadge } from '../../components/DataBadge'
import { Panel } from '../../components/Panel'
import { SemanticDelta } from '../../components/SemanticDelta'
import { StateChip } from '../../components/StateChip'
import { formatInteger, formatPercent } from '../../domain/format'
import { formatMoney } from '../../domain/money'
import { ICON_SIZE, ICON_STROKE, iconUi } from '../../design/icons'
import { SEMANTIC, semanticColor } from '../../design/tokens'
import type { SemanticTone } from '../../design/tokens'
import { POTENTIAL_TIER_LABEL, SPECIALTY_LABEL, type Doctor } from '../../mock/doctors'
import {
  DAY_SUMMARY,
  doctorOf,
  NBA_ATTESTATION,
  NBA_FILTERS,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  PRIORITY_ORDER,
  PRIORITY_PINS,
  RECOMMENDATIONS,
  SAMPLE_ALLOCATION_ROUTE,
  SUGGESTED_ACTIONS,
  TEAM_PERFORMANCE,
  type Recommendation,
} from '../../mock/nba'

const POTENTIAL_TONE: Record<Doctor['potentialTier'], SemanticTone> = {
  high: 'positive',
  medium: 'attention',
  low: 'neutral',
}

function initials(name: string): string {
  return name
    .replace(/^Dra?\.\s*/, '')
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
}

function RecommendationCard({
  recommendation,
  onOpen,
}: {
  recommendation: Recommendation
  onOpen: () => void
}) {
  const doctor = doctorOf(recommendation)
  if (!doctor) return null

  return (
    <article className="rounded-card border border-surface-border bg-surface-card p-4">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-delta-lg font-semibold text-white"
          style={{ backgroundColor: PRIORITY_COLOR[recommendation.priority] }}
          aria-hidden
        >
          {initials(doctor.name)}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-delta-lg font-semibold text-slate-900">{doctor.name}</p>
          <p className="text-delta text-neutral">{SPECIALTY_LABEL[doctor.specialty]}</p>
        </div>

        <StateChip
          label={POTENTIAL_TIER_LABEL[doctor.potentialTier]}
          tone={POTENTIAL_TONE[doctor.potentialTier]}
        />
      </div>

      <div className="mt-3 space-y-0.5">
        {recommendation.reason.map((line) => (
          <p key={line} className="text-delta-lg text-slate-700">
            {line}
          </p>
        ))}
      </div>

      <div className="mt-3 rounded-control bg-slate-50 px-3 py-2">
        <p className="text-delta text-neutral">Ação recomendada</p>
        <p className="text-delta-lg font-semibold text-slate-900">{recommendation.action}</p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <DataBadge attestation={recommendation.attestation} />
        <button
          type="button"
          onClick={onOpen}
          className="shrink-0 rounded-control px-3 py-1.5 text-delta-lg font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--product-accent)' }}
        >
          Ver detalhe
        </button>
      </div>
    </article>
  )
}

function RationaleDrawer({
  recommendation,
  onClose,
}: {
  recommendation: Recommendation
  onClose: () => void
}) {
  const doctor = doctorOf(recommendation)

  const blocks: readonly { label: string; text: string }[] = [
    { label: 'Por que este médico', text: recommendation.rationale.whyDoctor },
    { label: 'Por que agora', text: recommendation.rationale.whyNow },
    { label: 'Qual evidência', text: recommendation.rationale.evidence },
    { label: 'Objeção provável', text: recommendation.rationale.likelyObjection },
    { label: 'Mensagem', text: recommendation.rationale.message },
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="flex-1 bg-slate-900/30" onClick={onClose} role="presentation" aria-hidden />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Racional da recomendação para ${doctor?.name ?? ''}`}
        className="flex w-full max-w-md flex-col overflow-y-auto border-l border-surface-border bg-surface-card shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-surface-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{doctor?.name}</h2>
            <p className="mt-0.5 text-delta text-neutral">
              {doctor ? SPECIALTY_LABEL[doctor.specialty] : null} ·{' '}
              {PRIORITY_LABEL[recommendation.priority]}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhe"
            className="flex h-8 w-8 items-center justify-center rounded-control text-neutral hover:bg-slate-50"
          >
            <iconUi.close size={ICON_SIZE.md} strokeWidth={ICON_STROKE} aria-hidden />
          </button>
        </header>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-control bg-slate-50 px-3 py-2">
            <p className="text-delta text-neutral">Ação recomendada</p>
            <p className="text-delta-lg font-semibold text-slate-900">{recommendation.action}</p>
          </div>

          {blocks.map((block) => (
            <div key={block.label}>
              <p className="text-delta font-semibold uppercase tracking-wide text-neutral">
                {block.label}
              </p>
              <p className="mt-1 text-delta-lg leading-relaxed text-slate-700">{block.text}</p>
            </div>
          ))}
        </div>

        <footer className="mt-auto border-t border-surface-border px-5 py-4">
          <DataBadge attestation={recommendation.attestation} variant="full" />
        </footer>
      </aside>
    </div>
  )
}

function PriorityMap() {
  return (
    <div>
      <div className="relative h-72 w-full overflow-hidden rounded-control bg-slate-50">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <path
            d="M8,64 C22,50 30,70 44,58 C58,46 66,62 80,50 C88,44 94,52 98,48"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth={0.6}
          />
          <path
            d="M14,20 C30,30 40,16 56,26 C70,34 82,22 96,30"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={0.6}
          />
        </svg>

        {PRIORITY_PINS.map((pin) => (
          <span
            key={pin.id}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5"
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            title={`${pin.label} · ${PRIORITY_LABEL[pin.priority]}`}
          >
            <span
              className="block h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: PRIORITY_COLOR[pin.priority] }}
            />
            <span className="whitespace-nowrap text-delta font-medium text-slate-600">
              {pin.label}
            </span>
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-delta font-medium text-slate-700">Prioridade</span>
        {PRIORITY_ORDER.map((priority) => (
          <span key={priority} className="inline-flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: PRIORITY_COLOR[priority] }}
              aria-hidden
            />
            <span className="text-delta text-neutral">{PRIORITY_LABEL[priority]}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function DaySummary() {
  const rows: readonly { label: string; value: string; to?: string }[] = [
    { label: 'Visitas planejadas', value: formatInteger(DAY_SUMMARY.plannedVisits) },
    { label: 'Visitas concluídas', value: formatInteger(DAY_SUMMARY.completedVisits) },
    { label: 'Aderência ao roteiro', value: formatPercent(DAY_SUMMARY.routeAdherencePercent, 0) },
    { label: 'Médicos abordados', value: formatInteger(DAY_SUMMARY.doctorsReached) },
    {
      label: 'Amostras a entregar',
      value: formatInteger(DAY_SUMMARY.samplesToDeliver),
      to: SAMPLE_ALLOCATION_ROUTE,
    },
  ]

  return (
    <div>
      <dl className="divide-y divide-surface-border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="text-delta-lg text-slate-600">{row.label}</dt>
            <dd className="text-delta-lg font-semibold tabular-nums text-slate-900">
              {row.to ? (
                <Link
                  to={row.to}
                  className="underline"
                  style={{ color: 'var(--product-accent)' }}
                  title="Abrir o Otimizador de Alocação no Amostra Grátis"
                >
                  {row.value} →
                </Link>
              ) : (
                row.value
              )}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 border-t border-surface-border pt-3 text-delta text-neutral">
        Próxima melhor ação atualizada às {DAY_SUMMARY.updatedAt}.
      </p>
    </div>
  )
}

function TeamPerformance() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {TEAM_PERFORMANCE.map((metric) => {
        const value =
          metric.format === 'money' ? formatMoney(metric.value) : formatPercent(metric.value, 0)
        const belowTarget = metric.target !== null && metric.value < metric.target

        return (
          <div key={metric.id} className="rounded-card border border-surface-border p-4">
            <p className="text-delta text-neutral">{metric.label}</p>
            <p
              className="mt-1 text-kpi tabular-nums"
              style={{ color: belowTarget ? SEMANTIC.attention : semanticColor('positive') }}
            >
              {value}
            </p>

            {metric.target !== null ? (
              <>
                <span className="mt-2 block h-1.5 w-full rounded-full bg-slate-100">
                  <span
                    className="block h-1.5 rounded-full"
                    style={{
                      width: `${Math.min(100, (metric.value / metric.target) * 100)}%`,
                      backgroundColor: belowTarget ? SEMANTIC.attention : SEMANTIC.positive,
                    }}
                  />
                </span>
                <p className="mt-1.5 text-delta tabular-nums text-neutral">
                  Meta {formatPercent(metric.target, 0)}
                </p>
              </>
            ) : null}

            {metric.delta !== null ? (
              <p className="mt-1.5">
                <SemanticDelta
                  value={metric.delta}
                  size="sm"
                  {...(metric.comparison ? { comparison: metric.comparison } : {})}
                />
              </p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export function NextBestAction() {
  const [openId, setOpenId] = useState<string | null>(null)
  const open = RECOMMENDATIONS.find((item) => item.id === openId)

  return (
    <div className="space-y-5">
      <ThreadRibbon step="plan" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Next best action
          </h1>
          <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
            Próximas ações do dia
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {NBA_FILTERS.map((filter) => (
            <span
              key={filter.label}
              className="inline-flex items-center gap-1.5 rounded-control border border-surface-border bg-surface-card px-2.5 py-1 text-delta"
            >
              <span className="text-neutral">{filter.label}:</span>
              <span className="font-medium text-slate-900">{filter.value}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-4">
          <h2 className="text-delta font-semibold uppercase tracking-wide text-neutral">
            Minhas recomendações (hoje)
          </h2>
          {RECOMMENDATIONS.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              onOpen={() => setOpenId(recommendation.id)}
            />
          ))}
        </div>

        <div className="xl:col-span-5">
          <Panel
            title="Mapa de prioridades"
            footer={<DataBadge attestation={NBA_ATTESTATION} />}
          >
            <PriorityMap />
          </Panel>
        </div>

        <div className="xl:col-span-3">
          <Panel title="Resumo do dia" footer={<DataBadge attestation={NBA_ATTESTATION} />}>
            <DaySummary />
          </Panel>
        </div>
      </div>

      <Panel title="Desempenho da equipe" description="Semana corrente contra a meta">
        <TeamPerformance />
      </Panel>

      <Panel title="Próximas ações sugeridas">
        <ul className="grid gap-2 sm:grid-cols-2">
          {SUGGESTED_ACTIONS.map((action) => (
            <li
              key={action}
              className="flex items-start gap-2 rounded-control border border-surface-border px-3 py-2 text-delta-lg text-slate-700"
            >
              <span className="text-neutral" aria-hidden>
                —
              </span>
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </Panel>

      {open ? <RationaleDrawer recommendation={open} onClose={() => setOpenId(null)} /> : null}
    </div>
  )
}
