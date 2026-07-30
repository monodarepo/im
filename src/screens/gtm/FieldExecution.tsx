import { ThreadRibbon } from '../../components/ThreadRibbon'
import { DataBadge } from '../../components/DataBadge'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { StateChip } from '../../components/StateChip'
import { semanticColor } from '../../design/tokens'
import { formatInteger, formatPercent } from '../../domain/format'
import { formatDate } from '../../domain/today'
import {
  ASSISTED_MODEL_NOTE,
  AUTO_FIELD_SHARE_PERCENT,
  completionPercent,
  CURRENT_MODEL_NOTE,
  declaredOnlyVisits,
  EVIDENCE_ATTESTATION,
  EVIDENCE_BUCKET_DESCRIPTION,
  EVIDENCE_BUCKET_LABEL,
  EVIDENCE_BUCKET_ORDER,
  EVIDENCE_BUCKET_TONE,
  EVIDENCE_CONTRAST_NOTE,
  EVIDENCE_KINDS,
  evidenceSharePercent,
  EXECUTION_ATTESTATION,
  EXECUTION_DATE,
  FIELD_FORCE,
  FIELD_REPS,
  FUTURE_ACTIONS,
  MOBILE_APP,
  MOBILE_CHECKLIST_DONE,
  MOBILE_CHECKLIST_TOTAL,
  PLANNED_VISIT_MINUTES,
  REGISTRATION_ATTESTATION,
  REGISTRATION_GROUPS,
  REGISTRATION_NOTE,
  SKU_CHECK_LABEL,
  SKU_CHECK_TONE,
  SKU_CHECKS,
  TEAM_EXECUTION,
  VISIT_ATTESTATION,
  VISIT_RECORD_HEADER,
  type FieldRep,
  type VisitField,
} from '../../mock/fieldExecution'

const PROVEN_COLOR = semanticColor(EVIDENCE_BUCKET_TONE.proven)
const DECLARED_COLOR = semanticColor(EVIDENCE_BUCKET_TONE.declared)

function EvidenceSplitBar({
  proven,
  declared,
  height,
}: {
  proven: number
  declared: number
  height: number
}) {
  const total = proven + declared
  const provenPercent = total === 0 ? 0 : (proven / total) * 100

  return (
    <span
      className="flex w-full overflow-hidden rounded-full bg-slate-100"
      style={{ height }}
      aria-hidden
    >
      <span style={{ width: `${provenPercent}%`, backgroundColor: PROVEN_COLOR }} />
      <span style={{ width: `${100 - provenPercent}%`, backgroundColor: DECLARED_COLOR }} />
    </span>
  )
}

function EvidenceLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {EVIDENCE_BUCKET_ORDER.map((bucket) => (
        <span key={bucket} className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: semanticColor(EVIDENCE_BUCKET_TONE[bucket]) }}
            aria-hidden
          />
          <span className="text-delta text-neutral">{EVIDENCE_BUCKET_LABEL[bucket]}</span>
        </span>
      ))}
    </div>
  )
}

function FieldForceContext() {
  return (
    <div className="rounded-card border border-surface-border bg-surface-card px-5 py-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-kpi tabular-nums text-slate-900">
          {formatInteger(FIELD_FORCE.peopleInField)}
        </span>
        <span className="text-delta-lg font-medium text-slate-700">{FIELD_FORCE.headline}</span>
        <span className="ml-auto text-delta text-neutral">
          Origem: {FIELD_FORCE.originLabel}
        </span>
      </div>
      <p className="mt-2 text-delta-lg leading-relaxed text-neutral">{FIELD_FORCE.originNote}</p>
    </div>
  )
}

function EvidenceContrast() {
  const buckets: Record<'proven' | 'declared', number> = {
    proven: TEAM_EXECUTION.evidenceVisits,
    declared: TEAM_EXECUTION.declaredOnlyVisits,
  }
  const shares: Record<'proven' | 'declared', number> = {
    proven: TEAM_EXECUTION.evidenceSharePercent,
    declared: TEAM_EXECUTION.declaredOnlySharePercent,
  }

  return (
    <div className="space-y-4">
      <EvidenceSplitBar
        proven={TEAM_EXECUTION.evidenceVisits}
        declared={TEAM_EXECUTION.declaredOnlyVisits}
        height={14}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {EVIDENCE_BUCKET_ORDER.map((bucket) => (
          <div
            key={bucket}
            className="rounded-card border border-surface-border p-4"
            style={{
              borderLeftWidth: 3,
              borderLeftColor: semanticColor(EVIDENCE_BUCKET_TONE[bucket]),
            }}
          >
            <p className="text-delta-lg font-medium text-neutral">
              {EVIDENCE_BUCKET_LABEL[bucket]}
            </p>
            <p
              className="mt-1 text-kpi tabular-nums"
              style={{ color: semanticColor(EVIDENCE_BUCKET_TONE[bucket]) }}
            >
              {formatInteger(buckets[bucket])}
            </p>
            <p className="mt-0.5 text-delta tabular-nums text-neutral">
              {formatPercent(shares[bucket], 0)} das visitas realizadas hoje
            </p>
            <p className="mt-2 text-delta-lg leading-relaxed text-slate-700">
              {EVIDENCE_BUCKET_DESCRIPTION[bucket]}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-control border border-dashed border-surface-border px-3 py-2.5">
          <p className="text-delta font-semibold uppercase tracking-wide text-neutral">Hoje</p>
          <p className="mt-1 text-delta-lg leading-relaxed text-slate-700">{CURRENT_MODEL_NOTE}</p>
        </div>
        <div className="rounded-control border border-surface-border bg-slate-50 px-3 py-2.5">
          <p className="text-delta font-semibold uppercase tracking-wide text-neutral">
            Com a plataforma
          </p>
          <p className="mt-1 text-delta-lg leading-relaxed text-slate-700">{ASSISTED_MODEL_NOTE}</p>
        </div>
      </div>

      <p className="text-delta leading-relaxed text-neutral">{EVIDENCE_CONTRAST_NOTE}</p>
    </div>
  )
}

function RepRow({ rep }: { rep: FieldRep }) {
  const declaredOnly = declaredOnlyVisits(rep)
  const share = evidenceSharePercent(rep)

  return (
    <tr className="text-delta-lg">
      <td className="py-3 pr-3">
        <span className="block font-medium text-slate-900">{rep.name}</span>
        <span className="block text-delta text-neutral">{rep.territory}</span>
      </td>
      <td className="py-3 px-3 text-right tabular-nums text-slate-700">
        {formatInteger(rep.plannedVisits)}
      </td>
      <td className="py-3 px-3 text-right tabular-nums text-slate-900">
        <span className="font-semibold">{formatInteger(rep.completedVisits)}</span>
        <span className="ml-1 text-delta text-neutral">
          {formatPercent(completionPercent(rep), 0)}
        </span>
      </td>
      <td className="py-3 px-3 text-right tabular-nums text-slate-700">
        {formatPercent(rep.routeAdherencePercent, 0)}
      </td>
      <td className="py-3 px-3 text-right tabular-nums text-slate-700">
        {formatInteger(rep.averageVisitMinutes)} min
      </td>
      <td
        className="py-3 px-3 text-right font-semibold tabular-nums"
        style={{ color: PROVEN_COLOR }}
      >
        {formatInteger(rep.evidenceVisits)}
      </td>
      <td
        className="py-3 px-3 text-right font-semibold tabular-nums"
        style={{ color: DECLARED_COLOR }}
      >
        {formatInteger(declaredOnly)}
      </td>
      <td className="py-3 pl-3">
        <span className="flex items-center gap-2">
          <EvidenceSplitBar proven={rep.evidenceVisits} declared={declaredOnly} height={8} />
          <span className="w-12 shrink-0 text-right text-delta tabular-nums text-neutral">
            {formatPercent(share, 0)}
          </span>
        </span>
      </td>
    </tr>
  )
}

function RepCockpit() {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left">
          <thead>
            <tr className="border-b border-surface-border text-delta text-neutral">
              <th className="pb-2 pr-3 font-medium">Representante</th>
              <th className="pb-2 px-3 text-right font-medium">Planejadas</th>
              <th className="pb-2 px-3 text-right font-medium">Realizadas</th>
              <th className="pb-2 px-3 text-right font-medium">Aderência ao roteiro</th>
              <th className="pb-2 px-3 text-right font-medium">Tempo médio em visita</th>
              <th className="pb-2 px-3 text-right font-medium">
                {EVIDENCE_BUCKET_LABEL.proven}
              </th>
              <th className="pb-2 px-3 text-right font-medium">
                {EVIDENCE_BUCKET_LABEL.declared}
              </th>
              <th className="pb-2 pl-3 font-medium">Composição</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {FIELD_REPS.map((rep) => (
              <RepRow key={rep.id} rep={rep} />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-surface-border text-delta-lg">
              <td className="py-3 pr-3 font-semibold text-slate-900">
                Equipe
                <span className="ml-1 text-delta font-normal text-neutral">
                  ({formatInteger(TEAM_EXECUTION.repCount)} representantes)
                </span>
              </td>
              <td className="py-3 px-3 text-right font-semibold tabular-nums text-slate-900">
                {formatInteger(TEAM_EXECUTION.plannedVisits)}
              </td>
              <td className="py-3 px-3 text-right font-semibold tabular-nums text-slate-900">
                {formatInteger(TEAM_EXECUTION.completedVisits)}
              </td>
              <td className="py-3 px-3 text-right font-semibold tabular-nums text-slate-900">
                {formatPercent(TEAM_EXECUTION.routeAdherencePercent, 0)}
              </td>
              <td className="py-3 px-3 text-right font-semibold tabular-nums text-slate-900">
                {formatInteger(TEAM_EXECUTION.averageVisitMinutes)} min
              </td>
              <td
                className="py-3 px-3 text-right font-semibold tabular-nums"
                style={{ color: PROVEN_COLOR }}
              >
                {formatInteger(TEAM_EXECUTION.evidenceVisits)}
              </td>
              <td
                className="py-3 px-3 text-right font-semibold tabular-nums"
                style={{ color: DECLARED_COLOR }}
              >
                {formatInteger(TEAM_EXECUTION.declaredOnlyVisits)}
              </td>
              <td className="py-3 pl-3">
                <span className="flex items-center gap-2">
                  <EvidenceSplitBar
                    proven={TEAM_EXECUTION.evidenceVisits}
                    declared={TEAM_EXECUTION.declaredOnlyVisits}
                    height={8}
                  />
                  <span className="w-12 shrink-0 text-right text-delta tabular-nums text-neutral">
                    {formatPercent(TEAM_EXECUTION.evidenceSharePercent, 0)}
                  </span>
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <EvidenceLegend />
    </div>
  )
}

function AutoSeal() {
  return (
    <span
      className="rounded-sm px-1 py-px text-delta font-semibold text-white"
      style={{ backgroundColor: 'var(--product-accent)' }}
      title="Campo capturado pela plataforma"
    >
      auto
    </span>
  )
}

function VisitFieldRow({ field }: { field: VisitField }) {
  const automatic = field.mode === 'auto'

  return (
    <div
      className={
        automatic
          ? 'rounded-control border border-surface-border bg-slate-50 px-3 py-2'
          : 'rounded-control border border-dashed border-surface-border px-3 py-2'
      }
    >
      <p className="flex items-center gap-1.5 text-delta text-neutral">
        {field.label}
        {automatic ? <AutoSeal /> : <span className="text-delta italic">manual</span>}
      </p>
      <p className="mt-1 text-delta-lg font-medium leading-relaxed text-slate-900">{field.value}</p>
      <p className="mt-0.5 text-delta text-neutral">{field.origin}</p>
    </div>
  )
}

function AssistedRegistration() {
  const facts: readonly { label: string; value: string }[] = [
    { label: 'Ponto de venda', value: VISIT_RECORD_HEADER.pointOfSale },
    { label: 'Objetivo da parada', value: VISIT_RECORD_HEADER.purpose },
    {
      label: 'Executa',
      value: `${VISIT_RECORD_HEADER.repName} · ${VISIT_RECORD_HEADER.territory}`,
    },
    { label: 'Visita', value: formatDate(VISIT_RECORD_HEADER.visitedOn) },
  ]

  return (
    <div className="space-y-5">
      <div className="rounded-card border border-surface-border bg-slate-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-delta font-semibold uppercase tracking-widest text-neutral">
            {VISIT_RECORD_HEADER.reference}
          </p>
          <StateChip label={VISIT_RECORD_HEADER.statusLabel} tone="positive" />
        </div>
        <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-delta text-neutral">{fact.label}</dt>
              <dd className="mt-0.5 text-delta-lg font-medium text-slate-900">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {REGISTRATION_GROUPS.map((group) => (
        <section key={group.id}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-delta font-semibold uppercase tracking-wide text-neutral">
              {group.title}
            </h3>
            <span className="text-delta tabular-nums text-neutral">
              {formatInteger(group.fields.length)} de {formatInteger(
                REGISTRATION_GROUPS.reduce((total, item) => total + item.fields.length, 0),
              )}{' '}
              campos
            </span>
          </div>
          <p className="mt-0.5 text-delta-lg text-neutral">{group.description}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {group.fields.map((field) => (
              <VisitFieldRow key={field.id} field={field} />
            ))}
          </div>
        </section>
      ))}

      <section>
        <h3 className="text-delta font-semibold uppercase tracking-wide text-neutral">
          O que foi checado na gôndola
        </h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-surface-border text-delta text-neutral">
                <th className="pb-2 pr-3 font-medium">SKU</th>
                <th className="pb-2 px-3 font-medium">Achado em loja</th>
                <th className="pb-2 px-3 text-right font-medium">Leitura</th>
                <th className="pb-2 pl-3 text-right font-medium">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {SKU_CHECKS.map((check) => (
                <tr key={check.id} className="text-delta-lg">
                  <td className="py-2.5 pr-3">
                    <span className="block font-medium text-slate-900">{check.name}</span>
                    <span className="block text-delta text-neutral">{check.presentation}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{check.finding}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-neutral">
                    {check.checkedAt}
                  </td>
                  <td className="py-2.5 pl-3 text-right">
                    <StateChip
                      label={SKU_CHECK_LABEL[check.status]}
                      tone={SKU_CHECK_TONE[check.status]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-delta font-semibold uppercase tracking-wide text-neutral">
          Evidência capturada na visita
        </h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {EVIDENCE_KINDS.map((kind) => (
            <li
              key={kind.id}
              className="rounded-control border border-surface-border px-3 py-2"
              style={{ borderLeftWidth: 3, borderLeftColor: PROVEN_COLOR }}
            >
              <p className="text-delta-lg font-medium text-slate-900">{kind.label}</p>
              <p className="mt-0.5 text-delta leading-relaxed text-neutral">{kind.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-delta leading-relaxed text-neutral">{REGISTRATION_NOTE}</p>
    </div>
  )
}

function FieldAppFrame() {
  return (
    <div>
      <div className="mx-auto w-[272px]">
        <div className="rounded-[2.4rem] border-[10px] border-slate-900 bg-slate-900 shadow-xl">
          <div
            className="pointer-events-none relative select-none overflow-hidden rounded-[1.7rem] bg-slate-50"
            aria-hidden
          >
            <span className="absolute left-1/2 top-0 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-slate-900" />

            <div className="flex items-center justify-between px-4 pb-1 pt-1.5 text-delta font-medium tabular-nums text-slate-900">
              <span>{MOBILE_APP.statusTime}</span>
              <span className="flex items-center gap-1.5">
                <span>{MOBILE_APP.networkLabel}</span>
                <span>{MOBILE_APP.batteryLabel}</span>
              </span>
            </div>

            <div className="px-4 py-3 text-white" style={{ backgroundColor: 'var(--product-accent)' }}>
              <p className="text-delta uppercase tracking-widest opacity-80">
                {MOBILE_APP.appName}
              </p>
              <p className="mt-0.5 text-sm font-semibold">{MOBILE_APP.screenTitle}</p>
              <p className="mt-0.5 text-delta opacity-90">{MOBILE_APP.repName}</p>
            </div>

            <div className="space-y-3 px-3 py-3">
              <div className="rounded-control border border-surface-border bg-surface-card p-3">
                <p className="text-delta tabular-nums text-neutral">
                  {MOBILE_APP.nextVisit.positionLabel}
                </p>
                <p className="mt-0.5 text-delta-lg font-semibold leading-snug text-slate-900">
                  {MOBILE_APP.nextVisit.title}
                </p>
                <p className="mt-0.5 text-delta text-neutral">{MOBILE_APP.nextVisit.subtitle}</p>
                <div className="mt-2 space-y-0.5 border-t border-surface-border pt-2">
                  <p className="text-delta tabular-nums text-slate-700">
                    {MOBILE_APP.nextVisit.windowLabel}
                  </p>
                  <p className="text-delta tabular-nums text-slate-700">
                    {MOBILE_APP.nextVisit.etaLabel}
                  </p>
                  <p className="text-delta tabular-nums text-neutral">
                    {MOBILE_APP.nextVisit.travelLabel}
                  </p>
                </div>
              </div>

              <div className="rounded-control border border-surface-border bg-surface-card p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-delta font-semibold uppercase tracking-wide text-neutral">
                    {MOBILE_APP.checklistTitle}
                  </p>
                  <p className="text-delta tabular-nums text-neutral">
                    {formatInteger(MOBILE_CHECKLIST_DONE)}/{formatInteger(MOBILE_CHECKLIST_TOTAL)}
                  </p>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {MOBILE_APP.checklist.map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <span
                        className="mt-px flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border text-[9px] leading-none text-white"
                        style={
                          item.done
                            ? { backgroundColor: PROVEN_COLOR, borderColor: PROVEN_COLOR }
                            : { borderColor: '#CBD5E1' }
                        }
                      >
                        {item.done ? '✓' : ''}
                      </span>
                      <span
                        className={`text-delta leading-snug ${
                          item.done ? 'text-neutral line-through' : 'text-slate-800'
                        }`}
                      >
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div
                  className="rounded-control px-3 py-2 text-center text-delta-lg font-semibold text-white"
                  style={{ backgroundColor: 'var(--product-accent)' }}
                >
                  {MOBILE_APP.primaryActionLabel}
                </div>
                <div className="mt-1.5 rounded-control border border-surface-border bg-surface-card px-3 py-2 text-center text-delta font-medium text-slate-700">
                  {MOBILE_APP.secondaryActionLabel}
                </div>
                <p className="mt-2 text-center text-delta leading-snug text-neutral">
                  {MOBILE_APP.captureHint}
                </p>
              </div>
            </div>

            <div className="flex justify-center pb-2">
              <span className="h-1 w-20 rounded-full bg-slate-300" />
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-delta leading-relaxed text-neutral">{MOBILE_APP.readOnlyNote}</p>
    </div>
  )
}

export function FieldExecution() {
  return (
    <div className="space-y-5">
      <ThreadRibbon step="execution" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Execução comercial
          </h1>
          <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
            A visita entra no sistema com evidência, não de memória
          </p>
        </div>
        <span className="text-delta tabular-nums text-neutral">
          Dia corrente · {formatDate(EXECUTION_DATE)}
        </span>
      </div>

      <FieldForceContext />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Visitas planejadas (equipe)"
          value={formatInteger(TEAM_EXECUTION.plannedVisits)}
          attestation={VISIT_ATTESTATION}
        />
        <KpiCard
          label="Visitas realizadas"
          value={formatInteger(TEAM_EXECUTION.completedVisits)}
          attestation={VISIT_ATTESTATION}
        />
        <KpiCard
          label="Aderência ao roteiro"
          value={formatPercent(TEAM_EXECUTION.routeAdherencePercent, 0)}
          attestation={EXECUTION_ATTESTATION}
        />
        <KpiCard
          label="Tempo médio em visita"
          value={`${formatInteger(TEAM_EXECUTION.averageVisitMinutes)} min`}
          comparison={`previsto ${formatInteger(PLANNED_VISIT_MINUTES)} min no roteiro`}
          attestation={EVIDENCE_ATTESTATION}
        />
      </div>

      <Panel
        title="Declarado contra comprovado"
        description="Visitas realizadas hoje, separadas pelo que a plataforma consegue reconstituir"
        action={<EvidenceLegend />}
        footer={<DataBadge attestation={EVIDENCE_ATTESTATION} variant="full" />}
      >
        <EvidenceContrast />
      </Panel>

      <Panel
        title="Cockpit de visitas e aderência"
        description="Por representante, no dia corrente"
        footer={
          <div className="flex flex-wrap items-center gap-3">
            {FUTURE_ACTIONS.map((action) => (
              <FutureButton key={action.label} label={action.label} phase={action.phase} />
            ))}
            <span className="ml-auto">
              <DataBadge attestation={EXECUTION_ATTESTATION} variant="full" />
            </span>
          </div>
        }
      >
        <RepCockpit />
      </Panel>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <Panel
            title="Registro assistido de visita"
            description={`${formatPercent(AUTO_FIELD_SHARE_PERCENT, 0)} do registro chega preenchido pela plataforma`}
            footer={<DataBadge attestation={REGISTRATION_ATTESTATION} variant="full" />}
          >
            <AssistedRegistration />
          </Panel>
        </div>

        <div className="xl:col-span-4">
          <Panel
            title="App de campo"
            description="Como o representante vê a próxima visita"
            action={<StateChip label={MOBILE_APP.readOnlyLabel} tone="neutral" />}
            footer={<DataBadge attestation={VISIT_ATTESTATION} />}
          >
            <FieldAppFrame />
          </Panel>
        </div>
      </div>
    </div>
  )
}
