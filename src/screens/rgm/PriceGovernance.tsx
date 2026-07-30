import { DataBadge } from '../../components/DataBadge'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { PerimeterNote } from '../../components/PerimeterNote'
import { StateChip } from '../../components/StateChip'
import { formatInteger, formatPercent } from '../../domain/format'
import { formatDate, formatRelative } from '../../domain/today'
import type { SemanticTone } from '../../design/tokens'
import { SEMANTIC } from '../../design/tokens'
import {
  ADHERENCE_PERCENT,
  daysSincePublication,
  DISTRIBUTOR_STATUS_LABEL,
  DISTRIBUTORS,
  DISTRIBUTORS_OFF_TRACK,
  DISTRIBUTORS_ON_TIME,
  GOVERNANCE_ATTESTATION,
  GUARDRAILS,
  isOverSla,
  STAGE_STATUS_LABEL,
  STAGES,
  type DistributorStatus,
  type GuardrailStatus,
  type StageStatus,
} from '../../mock/governance'

const STAGE_TONE: Record<StageStatus, SemanticTone> = {
  done: 'positive',
  active: 'attention',
  pending: 'neutral',
  at_risk: 'negative',
}

const GUARDRAIL_TONE: Record<GuardrailStatus, SemanticTone> = {
  ok: 'positive',
  attention: 'attention',
  blocked: 'negative',
}

const DISTRIBUTOR_TONE: Record<DistributorStatus, SemanticTone> = {
  published: 'positive',
  late: 'attention',
  not_loaded: 'negative',
}

function StageTrack() {
  return (
    <ol className="grid gap-3 lg:grid-cols-5">
      {STAGES.map((stage) => (
        <li
          key={stage.id}
          className="rounded-card border border-surface-border p-4"
          style={{ borderTopWidth: 3, borderTopColor: SEMANTIC[STAGE_TONE[stage.status]] }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-delta font-semibold tabular-nums text-slate-600">
              {stage.order}
            </span>
            <StateChip label={STAGE_STATUS_LABEL[stage.status]} tone={STAGE_TONE[stage.status]} />
          </div>

          <p className="mt-2 text-delta-lg font-semibold text-slate-900">{stage.label}</p>
          <p className="mt-1 text-delta text-slate-600">{stage.description}</p>

          <div className="mt-3 border-t border-surface-border pt-2">
            <p className="text-delta text-neutral">{stage.owner}</p>
            <p className="text-delta tabular-nums text-neutral">
              {formatDate(stage.date)} · {formatRelative(stage.date)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function Guardrails() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {GUARDRAILS.map((guardrail) => (
        <li key={guardrail.id} className="rounded-card border border-surface-border p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-delta-lg font-semibold text-slate-900">{guardrail.label}</span>
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: SEMANTIC[GUARDRAIL_TONE[guardrail.status]] }}
              aria-hidden
            />
          </div>
          <p className="mt-1.5 text-delta text-slate-600">{guardrail.rule}</p>
          <p
            className="mt-2 text-delta-lg font-medium"
            style={{ color: SEMANTIC[GUARDRAIL_TONE[guardrail.status]] }}
          >
            {guardrail.reading}
          </p>
        </li>
      ))}
    </ul>
  )
}

function DistributorTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 font-medium">Distribuidor</th>
            <th className="pb-2 font-medium">Região</th>
            <th className="pb-2 font-medium">Preço publicado</th>
            <th className="pb-2 font-medium">Atualizado</th>
            <th className="pb-2 text-right font-medium">SLA</th>
            <th className="pb-2 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {DISTRIBUTORS.map((distributor) => {
            const elapsed = daysSincePublication(distributor)
            const over = isOverSla(distributor)
            return (
              <tr
                key={distributor.id}
                className="text-delta-lg transition-colors hover:bg-slate-50"
              >
                <td className="py-2.5 font-medium text-slate-900">{distributor.name}</td>
                <td className="py-2.5 text-slate-600">{distributor.region}</td>
                <td className="py-2.5 tabular-nums text-slate-600">
                  {formatDate(distributor.publishedOn)}
                  <span className="ml-2 text-delta text-neutral">
                    {formatRelative(distributor.publishedOn)}
                  </span>
                </td>
                <td className="py-2.5 tabular-nums text-slate-600">
                  {distributor.updatedOn ? (
                    <>
                      {formatDate(distributor.updatedOn)}
                      <span className="ml-2 text-delta text-neutral">
                        {formatRelative(distributor.updatedOn)}
                      </span>
                    </>
                  ) : (
                    <span className="text-neutral">não carregado</span>
                  )}
                </td>
                <td
                  className="py-2.5 text-right font-medium tabular-nums"
                  style={over ? { color: SEMANTIC.negative } : undefined}
                >
                  {formatInteger(elapsed)} / {formatInteger(distributor.slaDays)} dias
                </td>
                <td className="py-2.5 text-right">
                  <StateChip
                    label={DISTRIBUTOR_STATUS_LABEL[distributor.status]}
                    tone={DISTRIBUTOR_TONE[distributor.status]}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function PriceGovernance() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Governança de preços
        </h1>
        <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
          Da recomendação ao preço praticado na ponta
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Aderência na ponta"
          value={formatPercent(ADHERENCE_PERCENT)}
          attestation={GOVERNANCE_ATTESTATION}
          size="lg"
        />
        <KpiCard
          label="Distribuidores no prazo"
          value={`${formatInteger(DISTRIBUTORS_ON_TIME)} de ${formatInteger(DISTRIBUTORS.length)}`}
          attestation={GOVERNANCE_ATTESTATION}
        />
        <KpiCard
          label="Fora do prazo"
          value={formatInteger(DISTRIBUTORS_OFF_TRACK)}
          attestation={GOVERNANCE_ATTESTATION}
        />
        <KpiCard
          label="Guardrails em atenção"
          value={formatInteger(GUARDRAILS.filter((rail) => rail.status !== 'ok').length)}
          attestation={GOVERNANCE_ATTESTATION}
        />
      </div>

      <Panel
        title="Workflow de preço"
        description="Cinco estágios entre recomendar e praticar"
      >
        <StageTrack />
      </Panel>

      <Panel
        title="Guardrails"
        description="Limites que a decisão de preço não pode atravessar"
      >
        <Guardrails />
      </Panel>

      <Panel
        title="Publicação e aderência por distribuidor"
        description="Preço publicado não é preço praticado enquanto a tabela não for carregada"
        footer={<DataBadge attestation={GOVERNANCE_ATTESTATION} variant="full" />}
      >
        <DistributorTable />
      </Panel>

      <PerimeterNote />
    </div>
  )
}
