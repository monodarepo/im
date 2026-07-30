import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DataBadge } from '../../components/DataBadge'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { PerimeterMark, PerimeterNote } from '../../components/PerimeterNote'
import { SemanticDelta } from '../../components/SemanticDelta'
import { StateChip } from '../../components/StateChip'
import { SEMANTIC, semanticColor } from '../../design/tokens'
import { formatInteger, formatPercent } from '../../domain/format'
import { formatMoney, formatMoneyDelta } from '../../domain/money'
import { formatDate, formatRelative } from '../../domain/today'
import { CORRIDOR_LABEL } from '../../mock/pricing'
import {
  AGENDA_ATTESTATION,
  AGENDA_CHECK_COUNT,
  AGENDA_EVIDENCE_COUNT,
  AGENDA_ITEMS,
  AGENDA_MINUTES,
  AGENDA_ORIGIN_NOTE,
  AGENDA_ROUTE,
  CHECK_LABEL,
  CORRIDOR_TONE,
  formatReference,
  PROPOSAL_ATTESTATION,
  PROPOSAL_BLANK_COUNT,
  PROPOSAL_CLIENT,
  PROPOSAL_COUNTERPARTS,
  PROPOSAL_FIELDS,
  PROPOSAL_FILLED_COUNT,
  PROPOSAL_HEADER,
  PROPOSAL_IMPACT,
  PROPOSAL_IMPACT_ATTESTATION,
  PROPOSAL_ORIGIN_NOTE,
  PROPOSAL_SECTIONS,
  type AgendaEvidence,
  type AgendaItem,
  type ProposalField,
  type ProposalImpact,
} from '../../mock/reports'

const ROUTE_FACTS: readonly { label: string; value: string }[] = [
  { label: 'Praça e canal', value: AGENDA_ROUTE.label },
  { label: 'Executa', value: `${AGENDA_ROUTE.rep.name} · ${AGENDA_ROUTE.rep.area}` },
  {
    label: 'Visita',
    value: `${formatDate(AGENDA_ROUTE.visitOn)} (${formatRelative(AGENDA_ROUTE.visitOn)})`,
  },
  { label: 'Pontos de venda no roteiro', value: formatInteger(AGENDA_ROUTE.pointsOfSale) },
  { label: 'Tempo estimado em loja', value: `${formatInteger(AGENDA_MINUTES)} min` },
  { label: 'Gerada em', value: formatDate(AGENDA_ROUTE.generatedOn) },
]

function RouteHeader() {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      {ROUTE_FACTS.map((fact) => (
        <div key={fact.label}>
          <dt className="text-delta text-neutral">{fact.label}</dt>
          <dd className="mt-0.5 text-delta-lg font-medium text-slate-900">{fact.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function EvidenceLine({ evidence }: { evidence: AgendaEvidence }) {
  return (
    <li className="border-l-2 border-surface-border pl-3">
      <p className="text-delta font-semibold uppercase tracking-wide text-neutral">
        {evidence.kindLabel}
      </p>
      <p className="mt-0.5 text-delta-lg text-slate-800">{evidence.finding}</p>

      {evidence.readingLabel && evidence.reading ? (
        <p className="mt-0.5 text-delta text-neutral">
          {evidence.readingLabel}:{' '}
          <span className="font-medium tabular-nums text-slate-700">{evidence.reading}</span>
          {evidence.readingIsMoney ? <PerimeterMark /> : null}
        </p>
      ) : null}

      {evidence.impactBrl !== null ? (
        <p className="mt-0.5 text-delta text-neutral">
          Impacto{' '}
          <span className="font-medium tabular-nums text-slate-700">
            {formatMoney(evidence.impactBrl)}
          </span>
          <PerimeterMark />
          {evidence.decisionId ? (
            <>
              {' · '}
              <Link
                to={`/decisoes/${evidence.decisionId}`}
                className="font-medium underline"
                style={{ color: 'var(--product-accent)' }}
              >
                {evidence.decisionId}
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      <div className="mt-1">
        <DataBadge attestation={evidence.attestation} />
      </div>
    </li>
  )
}

function AgendaEntry({ item, position }: { item: AgendaItem; position: number }) {
  return (
    <li className="rounded-card border border-surface-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-delta font-semibold tabular-nums text-slate-600">
            {position}
          </span>
          <span className="min-w-0">
            <span className="block text-delta-lg font-semibold text-slate-900">{item.skuName}</span>
            <span className="block text-delta text-neutral">
              {item.molecule} · {item.presentation}
            </span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {item.corridor ? (
            <StateChip
              label={CORRIDOR_LABEL[item.corridor]}
              tone={CORRIDOR_TONE[item.corridor]}
            />
          ) : null}
          <span className="text-delta tabular-nums text-neutral">
            {formatInteger(item.pointsOfSale)} PDV · {formatInteger(item.estimatedMinutes)} min
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-delta font-semibold uppercase tracking-wide text-neutral">
            O que conferir
          </p>
          <ul className="mt-2 divide-y divide-surface-border">
            {item.checks.map((check) => (
              <li key={check.id} className="py-2">
                <p className="text-delta-lg font-medium text-slate-900">
                  {CHECK_LABEL[check.kind]}
                </p>
                <p className="mt-0.5 text-delta-lg text-slate-700">{check.instruction}</p>
                <p className="mt-0.5 text-delta text-neutral">
                  {check.referenceLabel}:{' '}
                  <span className="font-medium tabular-nums text-slate-700">
                    {formatReference(check)}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-delta font-semibold uppercase tracking-wide text-neutral">
            Por que entrou na pauta
          </p>
          <ul className="mt-2 space-y-3">
            {item.evidence.map((evidence) => (
              <EvidenceLine key={evidence.id} evidence={evidence} />
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-3 border-t border-surface-border pt-2">
        <DataBadge attestation={item.attestation} variant="full" />
      </div>
    </li>
  )
}

function renderImpact(impact: ProposalImpact): ReactNode {
  if (impact.format === 'money') {
    return (
      <span style={{ color: semanticColor('positive') }}>
        {formatMoneyDelta(impact.value)}
        <PerimeterMark />
      </span>
    )
  }
  if (impact.format === 'integer') {
    return (
      <span style={{ color: semanticColor('positive') }}>
        +{formatInteger(impact.value)} unid.
      </span>
    )
  }
  if (impact.format === 'points') {
    return <SemanticDelta value={impact.value} unit="points" />
  }
  return <span className="text-slate-900">{formatPercent(impact.value)}</span>
}

function ProposalFieldRow({ field }: { field: ProposalField }) {
  if (field.value === null) {
    return (
      <div className="rounded-control border border-dashed border-surface-border px-3 py-2">
        <p className="text-delta text-neutral">{field.label}</p>
        <p className="mt-1 text-delta-lg italic text-neutral">{field.note}</p>
      </div>
    )
  }

  return (
    <div className="rounded-control border border-surface-border bg-slate-50 px-3 py-2">
      <p className="flex items-center gap-1.5 text-delta text-neutral">
        {field.label}
        <span
          className="rounded-sm px-1 py-px text-delta font-semibold text-white"
          style={{ backgroundColor: 'var(--product-accent)' }}
          title="Campo preenchido pela plataforma"
        >
          auto
        </span>
      </p>
      <p className="mt-1 text-delta-lg font-semibold tabular-nums text-slate-900">{field.value}</p>
      {field.note ? (
        <p className="mt-0.5 text-delta font-medium" style={{ color: semanticColor(field.noteTone ?? 'neutral') }}>
          {field.note}
        </p>
      ) : null}
      {field.origin ? <p className="mt-0.5 text-delta text-neutral">{field.origin}</p> : null}
    </div>
  )
}

function ProposalDocument() {
  return (
    <article className="rounded-card border border-surface-border bg-surface-card p-6">
      <header className="border-b border-surface-border pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-delta font-semibold uppercase tracking-widest text-neutral">
              {PROPOSAL_HEADER.reference}
            </p>
            <h3 className="mt-1 text-base font-semibold tracking-tight text-slate-900">
              {PROPOSAL_HEADER.title}
            </h3>
            <p className="mt-1 text-delta-lg text-neutral">
              {PROPOSAL_CLIENT.name} · {PROPOSAL_CLIENT.region} · emitida em{' '}
              {formatDate(PROPOSAL_HEADER.issuedOn)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StateChip label={PROPOSAL_HEADER.statusLabel} tone="attention" />
            <Link
              to={`/decisoes/${PROPOSAL_HEADER.decisionId}`}
              className="text-delta font-medium underline"
              style={{ color: 'var(--product-accent)' }}
            >
              {PROPOSAL_HEADER.decisionId}
            </Link>
          </div>
        </div>
      </header>

      {PROPOSAL_SECTIONS.map((section) => (
        <section key={section.id} className="border-b border-surface-border py-4">
          <h4 className="text-delta font-semibold uppercase tracking-wide text-neutral">
            {section.title}
          </h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {section.fields.map((field) => (
              <ProposalFieldRow key={field.id} field={field} />
            ))}
          </div>
          <div className="mt-3">
            <DataBadge attestation={section.attestation} />
          </div>
        </section>
      ))}

      <section className="border-b border-surface-border py-4">
        <h4 className="text-delta font-semibold uppercase tracking-wide text-neutral">
          Impacto estimado
        </h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PROPOSAL_IMPACT.map((impact) => (
            <div key={impact.id} className="rounded-control border border-surface-border px-3 py-2.5">
              <p className="text-delta text-neutral">{impact.label}</p>
              <p className="mt-0.5 text-delta-lg font-semibold tabular-nums">
                {renderImpact(impact)}
              </p>
              <p className="mt-0.5 text-delta text-neutral">{impact.origin}</p>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <DataBadge attestation={PROPOSAL_IMPACT_ATTESTATION} variant="full" />
        </div>
      </section>

      <section className="py-4">
        <h4 className="text-delta font-semibold uppercase tracking-wide text-neutral">
          Contrapartidas
        </h4>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-surface-border text-delta text-neutral">
                <th className="pb-2 font-medium">Compromisso da rede</th>
                <th className="pb-2 text-right font-medium">Meta</th>
                <th className="pb-2 font-medium">Origem na plataforma</th>
                <th className="pb-2 text-right font-medium">Procedência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {PROPOSAL_COUNTERPARTS.map((counterpart) => (
                <tr key={counterpart.id} className="text-delta-lg">
                  <td className="py-2.5 font-medium text-slate-900">{counterpart.label}</td>
                  <td className="py-2.5 text-right font-semibold tabular-nums text-slate-900">
                    {counterpart.target}
                  </td>
                  <td className="py-2.5 text-slate-600">{counterpart.origin}</td>
                  <td className="py-2.5 text-right">
                    <DataBadge attestation={counterpart.attestation} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="border-t border-surface-border pt-4">
        <p className="text-delta text-neutral">{PROPOSAL_ORIGIN_NOTE}</p>
      </footer>
    </article>
  )
}

export function Reports() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Relatórios</h1>
        <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
          Documentos gerados a partir do que a plataforma já apurou
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Itens na pauta do PDV Scanner"
          value={formatInteger(AGENDA_ITEMS.length)}
          attestation={AGENDA_ATTESTATION}
        />
        <KpiCard
          label="Verificações no roteiro"
          value={formatInteger(AGENDA_CHECK_COUNT)}
          attestation={AGENDA_ATTESTATION}
        />
        <KpiCard
          label="Evidências citadas na pauta"
          value={formatInteger(AGENDA_EVIDENCE_COUNT)}
          attestation={AGENDA_ATTESTATION}
        />
        <KpiCard
          label="Campos da proposta preenchidos"
          value={`${formatInteger(PROPOSAL_FILLED_COUNT)} de ${formatInteger(PROPOSAL_FIELDS.length)}`}
          attestation={PROPOSAL_ATTESTATION}
        />
      </div>

      <Panel
        title="Pauta do PDV Scanner"
        description={AGENDA_ORIGIN_NOTE}
        footer={
          <div className="flex flex-wrap items-center gap-3">
            <FutureButton label="Exportar pauta para o app de campo" phase="Fase 2" />
            <FutureButton label="Enviar ao roteirizador" phase="Fase 3" />
            <span className="ml-auto">
              <DataBadge attestation={AGENDA_ATTESTATION} variant="full" />
            </span>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-card border border-surface-border bg-slate-50 p-4">
            <RouteHeader />
          </div>

          <ol className="space-y-4">
            {AGENDA_ITEMS.map((item, position) => (
              <AgendaEntry key={item.id} item={item} position={position + 1} />
            ))}
          </ol>
        </div>
      </Panel>

      <Panel
        title="Proposta comercial"
        description={`${formatInteger(PROPOSAL_FILLED_COUNT)} campos vêm da plataforma, ${formatInteger(PROPOSAL_BLANK_COUNT)} ficam em branco para a negociação`}
        action={
          <span className="inline-flex items-center gap-2 text-delta text-neutral">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: SEMANTIC.attention }}
              aria-hidden
            />
            Não enviado
          </span>
        }
        footer={
          <div className="flex flex-wrap items-center gap-3">
            <FutureButton label="Gerar PDF da proposta" phase="Fase 2" />
            <FutureButton label="Enviar ao cliente" phase="Fase 3" />
            <FutureButton label="Write-back da condição ao ERP" phase="Fase 3" />
            <span className="ml-auto">
              <DataBadge attestation={PROPOSAL_ATTESTATION} variant="full" />
            </span>
          </div>
        }
      >
        <ProposalDocument />
      </Panel>

      <PerimeterNote />
    </div>
  )
}
