import { Link } from 'react-router-dom'
import { ConfidenceMeter } from '../../components/ConfidenceMeter'
import { DataBadge } from '../../components/DataBadge'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { PerimeterMark, PerimeterNote } from '../../components/PerimeterNote'
import { SemanticDelta } from '../../components/SemanticDelta'
import { StateChip } from '../../components/StateChip'
import { formatInteger, formatPointsDelta } from '../../domain/format'
import { formatMoney } from '../../domain/money'
import { formatDate, formatRelative } from '../../domain/today'
import { MOVE_KIND_LABEL } from '../../mock/competitive'
import {
  ADDRESSED_IMPACT_BRL,
  formatMoveCount,
  MEASURED_SHARE_LOSS_PP,
  MOLECULE_STANCES,
  MOVES_UNDER_REVIEW,
  STANCE_DESCRIPTION,
  STANCE_LABEL,
  STANCE_SUMMARY,
  STANCE_TONE,
  WAR_ROOM_ATTESTATION,
  WAR_ROOM_ENTRIES,
  WAR_ROOM_FEED,
  WAR_ROOM_WINDOW_DAYS,
  type MoveEvidence,
  type StanceRationale,
  type WarRoomEntry,
} from '../../mock/warRoom'

function StanceSummary() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {STANCE_SUMMARY.map((item) => (
        <div key={item.stance} className="rounded-card border border-surface-border p-4">
          <p className="text-kpi tabular-nums text-slate-900">{formatInteger(item.count)}</p>
          <p className="mt-1">
            <StateChip label={STANCE_LABEL[item.stance]} tone={STANCE_TONE[item.stance]} />
          </p>
          <p className="mt-2 text-delta text-neutral">{STANCE_DESCRIPTION[item.stance]}</p>
        </div>
      ))}
    </div>
  )
}

function EvidenceList({ evidence }: { evidence: readonly MoveEvidence[] }) {
  return (
    <ul className="divide-y divide-surface-border">
      {evidence.map((item) => (
        <li key={item.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 first:pt-0">
          <span className="min-w-0 flex-1 text-delta-lg text-slate-700">{item.label}</span>
          {item.reading === null ? null : (
            <span className="text-delta-lg font-semibold tabular-nums text-slate-900">
              {item.reading}
            </span>
          )}
          <span className="w-full">
            <DataBadge attestation={item.attestation} />
          </span>
        </li>
      ))}
    </ul>
  )
}

function Rationale({ rationale }: { rationale: StanceRationale }) {
  return (
    <div className="space-y-3">
      <p className="text-delta-lg font-medium text-slate-900">{rationale.headline}</p>

      <ul className="space-y-1.5">
        {rationale.drivers.map((driver) => (
          <li key={driver.slice(0, 48)} className="flex gap-2 text-delta-lg text-slate-700">
            <span aria-hidden className="text-neutral">
              ·
            </span>
            <span className="min-w-0 flex-1 leading-relaxed">{driver}</span>
          </li>
        ))}
      </ul>

      <div className="rounded-control border border-surface-border bg-slate-50 p-3">
        <p className="text-delta font-medium uppercase tracking-wide text-neutral">
          Posturas descartadas
        </p>
        <ul className="mt-2 space-y-2">
          {rationale.discarded.map((option) => (
            <li key={option.stance} className="text-delta-lg text-slate-700">
              <span className="mr-2 font-semibold text-slate-900">
                {STANCE_LABEL[option.stance]}
              </span>
              <span className="leading-relaxed">{option.why}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function EntryFooter({ entry }: { entry: WarRoomEntry }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-surface-border pt-3">
      {entry.decision === null ? (
        <span className="text-delta text-neutral">{entry.decisionNote}</span>
      ) : (
        <Link
          to={`/decisoes/${entry.decision.id}`}
          className="text-delta-lg font-medium underline"
          style={{ color: 'var(--product-accent)' }}
        >
          {entry.decision.id} · {entry.decision.title} ·{' '}
          <span className="tabular-nums">
            {formatMoney(entry.decision.impactBrl)}
            <PerimeterMark />
          </span>{' '}
          →
        </Link>
      )}

      <span className="text-delta text-neutral">
        Revisão da postura em {formatDate(entry.reviewDate)} ({formatRelative(entry.reviewDate)})
      </span>
    </div>
  )
}

function EntryCard({ entry }: { entry: WarRoomEntry }) {
  const { move } = entry

  return (
    <article
      className={`space-y-3 rounded-card border p-4 ${
        entry.isPriority ? 'border-slate-300 bg-slate-50' : 'border-surface-border bg-surface-card'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StateChip label={MOVE_KIND_LABEL[move.kind]} />
        <span className="text-delta text-neutral">{move.competitor}</span>
        <span aria-hidden className="text-neutral">
          ·
        </span>
        <span className="text-delta text-neutral">{move.molecule}</span>
        <span aria-hidden className="text-neutral">
          ·
        </span>
        <span className="text-delta text-neutral">{move.scope}</span>
        {entry.isPriority ? (
          <span
            className="rounded-control px-2 py-0.5 text-delta font-medium text-white"
            style={{ backgroundColor: 'var(--product-accent)' }}
          >
            Pauta do dia
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <p className="text-delta-lg font-semibold text-slate-900">{move.description}</p>
        {move.impactPp === null ? (
          <span className="text-delta text-slate-400">{move.impactLabel}</span>
        ) : (
          <span className="text-delta-lg">
            <span className="mr-1.5 text-neutral">{move.impactLabel}</span>
            <SemanticDelta value={move.impactPp} unit="points" size="sm" />
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-delta uppercase tracking-wide text-neutral">Resposta recomendada</span>
        <StateChip label={STANCE_LABEL[entry.stance]} tone={STANCE_TONE[entry.stance]} />
      </div>

      <Rationale rationale={entry.rationale} />

      <div>
        <p className="text-delta font-medium uppercase tracking-wide text-neutral">
          Evidência do movimento
        </p>
        <div className="mt-2">
          <EvidenceList evidence={entry.evidence} />
        </div>
      </div>

      <EntryFooter entry={entry} />
    </article>
  )
}

function Feed() {
  return (
    <div className="space-y-5">
      {WAR_ROOM_FEED.map((day) => (
        <section key={day.date}>
          <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-surface-border pb-2">
            <h3 className="text-delta-lg font-semibold tabular-nums text-slate-900">
              {formatDate(day.date)}
            </h3>
            <span className="text-delta text-neutral">{formatRelative(day.date)}</span>
            <span className="ml-auto text-delta tabular-nums text-neutral">
              {formatMoveCount(day.entries.length)}
            </span>
          </header>

          <div className="mt-3 space-y-3">
            {day.entries.map((entry) => (
              <EntryCard key={entry.move.id} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function MoleculeStanceTable() {
  return (
    <ul className="divide-y divide-surface-border">
      {MOLECULE_STANCES.map((item) => (
        <li key={item.molecule} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
          <span className="text-delta-lg font-medium text-slate-900">{item.molecule}</span>
          <span className="text-delta tabular-nums text-neutral">
            {formatMoveCount(item.entries.length)}
          </span>

          <span className="flex flex-wrap items-center gap-2">
            {item.counts
              .filter((count) => count.count > 0)
              .map((count) => (
                <StateChip
                  key={count.stance}
                  label={`${STANCE_LABEL[count.stance]} · ${formatInteger(count.count)}`}
                  tone={STANCE_TONE[count.stance]}
                />
              ))}
          </span>

          <span className="ml-auto">
            <ConfidenceMeter confidence={item.attestation.confidence} showLabel />
          </span>
        </li>
      ))}
    </ul>
  )
}

export function GenericsWarRoom() {
  return (
    <div className="space-y-5">
      <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        War room de genéricos
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label={`Movimentos detectados em ${formatInteger(WAR_ROOM_WINDOW_DAYS)} dias`}
          value={formatInteger(WAR_ROOM_ENTRIES.length)}
          attestation={WAR_ROOM_ATTESTATION}
        />
        <KpiCard
          label="Perda de share apurada na janela"
          value={formatPointsDelta(MEASURED_SHARE_LOSS_PP)}
          attestation={WAR_ROOM_ATTESTATION}
        />
        <KpiCard
          label="Movimentos com impacto em apuração"
          value={`${formatInteger(MOVES_UNDER_REVIEW)} de ${formatInteger(WAR_ROOM_ENTRIES.length)}`}
          attestation={WAR_ROOM_ATTESTATION}
        />
      </div>

      <Panel
        title="Postura recomendada na janela"
        description="Cada movimento recebe uma das três posturas. A contagem mostra onde o time precisa decidir hoje."
        footer={<DataBadge attestation={WAR_ROOM_ATTESTATION} variant="full" />}
      >
        <StanceSummary />

        <p className="mt-4 text-delta-lg text-slate-700">
          Exposição financeira já endereçada por decisão aberta:{' '}
          <span className="font-semibold tabular-nums text-slate-900">
            {formatMoney(ADDRESSED_IMPACT_BRL)}
            <PerimeterMark />
          </span>
          . Os demais movimentos seguem com o impacto em apuração e não recebem valor.
        </p>
      </Panel>

      <Panel
        title="Feed de movimentos do concorrente"
        description="Ordem cronológica, do mais recente para o mais antigo, com escopo, evidência e resposta recomendada."
        action={<FutureButton label="Abrir decisão a partir do movimento" phase="Fase 2" />}
      >
        <Feed />
      </Panel>

      <Panel
        title="Postura por molécula"
        description="A mesma quebra da inteligência competitiva, agora com a resposta recomendada ao lado."
        footer={<DataBadge attestation={WAR_ROOM_ATTESTATION} />}
      >
        <MoleculeStanceTable />
      </Panel>

      <PerimeterNote />
    </div>
  )
}
