import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Panel } from '../components/Panel'
import { ProductBadge, ProductBadges } from '../components/ProductBadge'
import { StateChip } from '../components/StateChip'
import { CURRENT_PERSONA } from '../domain/persona'
import {
  AUTHORITY_LABEL,
  DECISION_STATE_LABEL,
  DECISION_STATE_TONE,
  URGENCY_LABEL,
  URGENCY_TONE,
  type DecisionState,
} from '../domain/decision'
import { formatInteger } from '../domain/format'
import { formatMoney } from '../domain/money'
import { formatRelative } from '../domain/today'
import { DECISION_RECORDS } from '../mock/decisionRecords'
import { useDecisionWorkflow } from '../state/decisionWorkflowStore'
import { useRadarDecisions } from '../state/radarDecisionsStore'
import type { DecisionRecord } from '../domain/decision'

/**
 * Central de Decisões (seção 2, S2).
 *
 * Quatro visões da mesma fila, porque quatro perguntas diferentes chegam a
 * ela: como está o fluxo (kanban), o que vale mais (lista por valor), o que é
 * meu (por dono) e o que exatamente aconteceu (detalhe, em rota própria).
 */

type ViewId = 'kanban' | 'value' | 'mine'

const VIEWS: readonly { id: ViewId; label: string; description: string }[] = [
  { id: 'kanban', label: 'Kanban por estado', description: 'Onde cada decisão está no fluxo' },
  { id: 'value', label: 'Lista por valor', description: 'O que vale mais, primeiro' },
  { id: 'mine', label: 'Minhas decisões', description: 'O que está sob a sua responsabilidade' },
]

const KANBAN_COLUMNS: readonly DecisionState[] = [
  'proposed',
  'in_approval',
  'approved',
  'executing',
  'concluded',
  'learned',
]

export function DecisionCentral() {
  const [view, setView] = useState<ViewId>('kanban')
  const created = useRadarDecisions((state) => state.created)
  const stateOf = useDecisionWorkflow((state) => state.stateOf)

  /** O estado efetivo vem do workflow, que parte do estado do registro. */
  const records = DECISION_RECORDS.map((record) => ({ ...record, state: stateOf(record.id) }))

  const totalBrl = records.reduce((sum, record) => sum + record.impactBrl, 0)

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Central de decisões
          </h1>
          <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
            {formatInteger(records.length)} decisões abertas · {formatMoney(totalBrl)} em jogo
          </p>
        </div>

        <div className="inline-flex rounded-control border border-surface-border p-0.5" role="group">
          {VIEWS.map((option) => {
            const isActive = option.id === view
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setView(option.id)}
                aria-pressed={isActive}
                title={option.description}
                className="rounded-[10px] px-3 py-1.5 text-delta font-medium transition-colors"
                style={
                  isActive
                    ? { backgroundColor: 'var(--product-accent)', color: '#FFFFFF' }
                    : { color: '#475569' }
                }
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </header>

      {view === 'kanban' ? <KanbanView records={records} /> : null}
      {view === 'value' ? <ValueView records={records} /> : null}
      {view === 'mine' ? <MineView records={records} /> : null}

      {created.length > 0 ? (
        <Panel title="Criadas no Radar nesta sessão" description="Ainda sem registro completo">
          <ul className="divide-y divide-surface-border">
            {created.map((decision) => (
              <li key={decision.id} className="flex items-center gap-3 py-2.5">
                <Link
                  to={`/decisoes/${decision.id}`}
                  className="text-delta-lg font-medium tabular-nums underline"
                  style={{ color: 'var(--product-accent)' }}
                >
                  {decision.id}
                </Link>
                <span className="min-w-0 flex-1 text-delta-lg text-slate-800">
                  {decision.title}
                </span>
                <span className="shrink-0 text-delta-lg font-semibold tabular-nums text-slate-900">
                  {formatMoney(decision.impactBrl)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  )
}

function KanbanView({ records }: { records: readonly DecisionRecord[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {KANBAN_COLUMNS.map((state) => {
        const column = records.filter((record) => record.state === state)
        const total = column.reduce((sum, record) => sum + record.impactBrl, 0)

        return (
          <section
            key={state}
            className="flex flex-col rounded-card border border-surface-border bg-surface-card"
          >
            <header className="border-b border-surface-border px-4 py-3">
              <StateChip
                label={DECISION_STATE_LABEL[state]}
                tone={DECISION_STATE_TONE[state]}
              />
              <p className="mt-2 text-delta tabular-nums text-neutral">
                {formatInteger(column.length)} ·{' '}
                {column.length === 0 ? '—' : formatMoney(total)}
              </p>
            </header>

            <div className="flex-1 space-y-2 p-3">
              {column.length === 0 ? (
                <p className="px-1 py-2 text-delta text-neutral">Nenhuma decisão neste estado.</p>
              ) : (
                column.map((record) => (
                  <Link
                    key={record.id}
                    to={`/decisoes/${record.id}`}
                    className="block rounded-control border border-surface-border px-3 py-2.5 transition-colors hover:bg-slate-50"
                  >
                    <p className="text-delta font-medium tabular-nums text-neutral">{record.id}</p>
                    <p className="mt-0.5 text-delta-lg font-medium text-slate-900">
                      {record.title}
                    </p>
                    <p className="mt-1 text-delta-lg font-semibold tabular-nums text-slate-900">
                      {formatMoney(record.impactBrl)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <ProductBadges
                        products={[...new Set(record.parcels.map((parcel) => parcel.source))]}
                      />
                    </div>
                    <p className="mt-1.5 text-delta text-neutral">{record.owner}</p>
                  </Link>
                ))
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function ValueView({ records }: { records: readonly DecisionRecord[] }) {
  const ordered = [...records].sort((a, b) => b.impactBrl - a.impactBrl)

  return (
    <Panel title="Decisões por valor" description="Ordenadas por impacto estimado">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left">
          <thead>
            <tr className="border-b border-surface-border text-delta text-neutral">
              <th className="pb-2 font-medium">Identificador</th>
              <th className="pb-2 font-medium">Decisão</th>
              <th className="pb-2 font-medium">Produtos</th>
              <th className="pb-2 text-right font-medium">Impacto</th>
              <th className="pb-2 font-medium">Urgência</th>
              <th className="pb-2 font-medium">Alçada</th>
              <th className="pb-2 font-medium">Dono</th>
              <th className="pb-2 text-right font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {ordered.map((record) => (
              <tr key={record.id} className="text-delta-lg transition-colors hover:bg-slate-50">
                <td className="py-2.5">
                  <Link
                    to={`/decisoes/${record.id}`}
                    className="font-medium tabular-nums underline"
                    style={{ color: 'var(--product-accent)' }}
                  >
                    {record.id}
                  </Link>
                </td>
                <td className="py-2.5 text-slate-900">{record.title}</td>
                <td className="py-2.5">
                  <ProductBadges
                    products={[...new Set(record.parcels.map((parcel) => parcel.source))]}
                  />
                </td>
                <td className="py-2.5 text-right font-semibold tabular-nums text-slate-900">
                  {formatMoney(record.impactBrl)}
                </td>
                <td className="py-2.5">
                  <StateChip
                    label={URGENCY_LABEL[record.urgency]}
                    tone={URGENCY_TONE[record.urgency]}
                  />
                </td>
                <td className="py-2.5 text-delta text-slate-600">
                  {AUTHORITY_LABEL[record.authority]}
                </td>
                <td className="py-2.5 text-delta text-slate-600">{record.owner}</td>
                <td className="py-2.5 text-right">
                  <StateChip
                    label={DECISION_STATE_LABEL[record.state]}
                    tone={DECISION_STATE_TONE[record.state]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function MineView({ records }: { records: readonly DecisionRecord[] }) {
  const owners = [...new Set(records.map((record) => record.owner))]

  return (
    <div className="space-y-4">
      <p className="text-delta-lg text-neutral">
        Sessão aberta como <span className="font-medium text-slate-900">{CURRENT_PERSONA.name}</span>{' '}
        · {CURRENT_PERSONA.area}. As demais carteiras aparecem abaixo para leitura.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {owners.map((owner) => {
          const mine = records.filter((record) => record.owner === owner)
          const total = mine.reduce((sum, record) => sum + record.impactBrl, 0)
          const isCurrent = owner === CURRENT_PERSONA.name

          return (
            <Panel
              key={owner}
              title={owner}
              description={`${mine[0]?.ownerRole ?? ''} · ${formatInteger(mine.length)} ${
                mine.length === 1 ? 'decisão' : 'decisões'
              } · ${formatMoney(total)}`}
              action={isCurrent ? <StateChip label="Você" tone="positive" /> : undefined}
            >
              <ul className="divide-y divide-surface-border">
                {mine.map((record) => (
                  <li key={record.id} className="flex flex-wrap items-center gap-2 py-2.5">
                    <ProductBadge product={record.product} />
                    <Link
                      to={`/decisoes/${record.id}`}
                      className="min-w-0 flex-1 text-delta-lg text-slate-900 underline decoration-slate-300 underline-offset-2"
                    >
                      {record.title}
                    </Link>
                    <span className="shrink-0 text-delta-lg font-semibold tabular-nums text-slate-900">
                      {formatMoney(record.impactBrl)}
                    </span>
                    <span className="shrink-0 text-delta text-neutral">
                      prazo {formatRelative(record.dueOn)}
                    </span>
                    <StateChip
                      label={DECISION_STATE_LABEL[record.state]}
                      tone={DECISION_STATE_TONE[record.state]}
                    />
                  </li>
                ))}
              </ul>
            </Panel>
          )
        })}
      </div>
    </div>
  )
}
