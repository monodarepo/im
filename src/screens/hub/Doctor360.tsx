import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { UF_NAME } from '../../assets/brazil-uf'
import { DataBadge } from '../../components/DataBadge'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { SemanticDelta } from '../../components/SemanticDelta'
import { SEMANTIC } from '../../design/tokens'
import { formatInteger, formatPercent } from '../../domain/format'
import { formatMoney } from '../../domain/money'
import { daysAgo, formatRelative } from '../../domain/today'
import {
  COVERAGE_ATTESTATION,
  DOCTOR_COVERAGE_OPPORTUNITY,
  DOCTORS,
  doctorTotals,
  POTENTIAL_ATTESTATION,
  PRESCRIPTION_ATTESTATION,
  REGION_SCOPE_LABEL,
  REGION_SCOPES,
  SPECIALTY_LABEL,
  specialtyRows,
  type RegionScope,
  type SpecialtyRow,
} from '../../mock/doctors'

/**
 * Médico 360° (módulo 1.6 do ESCOPO).
 *
 * A leitura primária é agregada — especialidade no eixo, região como corte. A
 * lista nominal fica abaixo e é deliberadamente secundária: serve para dar
 * concretude ao agregado, não para substituir a leitura por segmento.
 */

const COVERED_COLOR = SEMANTIC.neutral
const GAP_COLOR = SEMANTIC.attention

function RegionFilter({
  value,
  onChange,
}: {
  value: RegionScope
  onChange: (scope: RegionScope) => void
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-control bg-slate-100 p-1">
      {REGION_SCOPES.map((scope) => {
        const active = scope === value
        return (
          <button
            key={scope}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(scope)}
            className={`rounded-control px-2.5 py-1 text-delta font-medium transition-colors ${
              active ? 'text-white' : 'text-slate-600 hover:bg-white'
            }`}
            style={active ? { backgroundColor: 'var(--product-accent)' } : undefined}
          >
            {REGION_SCOPE_LABEL[scope]}
          </button>
        )
      })}
    </div>
  )
}

type TooltipEntry = { name?: string; value?: number; color?: string }

function CoverageTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-control border border-surface-border bg-surface-card px-3 py-2 shadow-sm">
      <p className="text-delta font-medium text-slate-900">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="mt-1 flex items-center gap-2 text-delta text-slate-700">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
            aria-hidden
          />
          <span>{entry.name}</span>
          <span className="ml-auto font-medium tabular-nums">{formatInteger(entry.value ?? 0)}</span>
        </p>
      ))}
    </div>
  )
}

function CoverageChart({ rows }: { rows: readonly SpecialtyRow[] }) {
  const data = rows.map((row) => ({
    label: row.label,
    covered: row.coveredDoctors,
    uncovered: row.uncoveredDoctors,
  }))

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
            tick={{ fill: '#64748B', fontSize: 12 }}
            tickFormatter={(value: number) => formatInteger(value)}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={104}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#475569', fontSize: 12 }}
          />
          <Tooltip content={<CoverageTooltip />} cursor={{ fill: '#F1F5F9' }} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="square"
            wrapperStyle={{ fontSize: 12, color: '#64748B', paddingBottom: 8 }}
          />
          <Bar dataKey="covered" name="Médicos cobertos" stackId="doctors" fill={COVERED_COLOR} />
          <Bar
            dataKey="uncovered"
            name="Médicos não cobertos"
            stackId="doctors"
            fill={GAP_COLOR}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function SpecialtyTable({ rows }: { rows: readonly SpecialtyRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-delta-lg">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="py-2 pr-3 text-left font-medium">Especialidade</th>
            <th className="py-2 px-3 text-right font-medium">Médicos-alvo</th>
            <th className="py-2 px-3 text-right font-medium">Cobertura</th>
            <th className="py-2 px-3 text-right font-medium">Prescrições</th>
            <th className="py-2 pl-3 text-right font-medium">Potencial</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {rows.map((row) => (
            <tr key={row.specialty} className="transition-colors hover:bg-slate-50">
              <td className="py-2.5 pr-3 font-medium text-slate-900">{row.label}</td>
              <td className="py-2.5 px-3 text-right tabular-nums text-slate-700">
                {formatInteger(row.targetDoctors)}
              </td>
              <td className="py-2.5 px-3 text-right">
                <span className="block tabular-nums font-medium text-slate-900">
                  {formatPercent(row.coveragePercent)}
                </span>
                <SemanticDelta value={row.coverageDeltaPp} unit="points" size="sm" />
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums text-slate-700">
                {formatInteger(row.prescriptions)}
              </td>
              <td className="py-2.5 pl-3 text-right tabular-nums font-medium text-slate-900">
                {formatMoney(row.potentialBrl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CanonicalOpportunity() {
  return (
    <div className="space-y-2">
      <Link
        to={`/decisoes/${DOCTOR_COVERAGE_OPPORTUNITY.decisionId}`}
        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-surface-border px-3 py-2.5 transition-colors hover:bg-slate-50"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-delta text-neutral">Oportunidade priorizada</span>
          <span className="block text-delta-lg font-medium text-slate-900">
            {DOCTOR_COVERAGE_OPPORTUNITY.title}
          </span>
          <span className="mt-1 block">
            <DataBadge attestation={DOCTOR_COVERAGE_OPPORTUNITY.attestation} />
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-delta-lg font-semibold tabular-nums text-slate-900">
            {formatMoney(DOCTOR_COVERAGE_OPPORTUNITY.impactBrl)}
          </span>
          <span className="mt-0.5 block text-delta tabular-nums text-neutral">
            {DOCTOR_COVERAGE_OPPORTUNITY.decisionId} →
          </span>
        </span>
      </Link>

      <p className="text-delta text-neutral">
        O potencial das demais células escala a taxa por médico não coberto desta decisão: a fatia
        do Rio de Janeiro em Cardiologia/Sudeste fecha exatamente no valor acima, e cada célula
        aplica a mesma taxa ao próprio universo descoberto.
      </p>
    </div>
  )
}

function DoctorTable({ scope }: { scope: RegionScope }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-delta-lg">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="py-2 pr-3 text-left font-medium">Médico</th>
            <th className="py-2 px-3 text-left font-medium">Especialidade</th>
            <th className="py-2 px-3 text-left font-medium">UF</th>
            <th className="py-2 px-3 text-right font-medium">Prescrições</th>
            <th className="py-2 px-3 text-right font-medium">Visitas</th>
            <th className="py-2 px-3 text-left font-medium">Última visita</th>
            <th className="py-2 pl-3 text-right font-medium">Potencial</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {DOCTORS.map((doctor) => {
            const inScope = scope === 'brasil' || doctor.region === scope
            return (
              <tr
                key={doctor.id}
                className={`transition-colors hover:bg-slate-50 ${inScope ? '' : 'opacity-45'}`}
                title={inScope ? undefined : 'Fora do recorte regional selecionado'}
              >
                <td className="py-2.5 pr-3">
                  <span className="block font-medium text-slate-900">{doctor.name}</span>
                  <span className="block text-delta tabular-nums text-neutral">
                    {doctor.id}
                    {doctor.decisionId ? (
                      <>
                        {' · '}
                        <Link
                          to={`/decisoes/${doctor.decisionId}`}
                          className="font-medium"
                          style={{ color: 'var(--product-accent)' }}
                        >
                          {doctor.decisionId}
                        </Link>
                      </>
                    ) : null}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-700">{SPECIALTY_LABEL[doctor.specialty]}</td>
                <td className="py-2.5 px-3 text-slate-700" title={UF_NAME[doctor.uf]}>
                  {doctor.uf}
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums text-slate-700">
                  {formatInteger(doctor.prescriptions)}
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums text-slate-700">
                  {formatInteger(doctor.visits)}
                </td>
                <td className="py-2.5 px-3 text-slate-700">
                  {formatRelative(daysAgo(doctor.lastVisitDaysAgo))}
                </td>
                <td className="py-2.5 pl-3 text-right tabular-nums font-medium text-slate-900">
                  {formatMoney(doctor.potentialBrl)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function Doctor360() {
  const [scope, setScope] = useState<RegionScope>('brasil')
  const rows = specialtyRows(scope)
  const totals = doctorTotals(scope)
  const scopeLabel = REGION_SCOPE_LABEL[scope]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Médico 360°</h1>
        <p className="mt-1 max-w-3xl text-delta-lg text-neutral">
          A leitura primária desta tela é agregada: cobertura, prescrição e potencial por
          especialidade, com a região como corte. A relação nominal de médicos vem depois e é
          secundária — serve para dar concretude ao agregado, não para substituí-lo.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={`Médicos-alvo · ${scopeLabel}`}
          value={formatInteger(totals.targetDoctors)}
          attestation={COVERAGE_ATTESTATION}
        />
        <KpiCard
          label="Cobertura de médicos"
          value={formatPercent(totals.coveragePercent)}
          delta={totals.coverageDeltaPp}
          deltaUnit="points"
          comparison="vs. período anterior"
          attestation={COVERAGE_ATTESTATION}
        />
        <KpiCard
          label="Prescrições no período"
          value={formatInteger(totals.prescriptions)}
          attestation={PRESCRIPTION_ATTESTATION}
        />
        <KpiCard
          label="Potencial de cobertura"
          value={formatMoney(totals.potentialBrl)}
          attestation={POTENTIAL_ATTESTATION}
        />
      </div>

      <Panel
        title="Cobertura por especialidade"
        description="Visão agregada. A faixa âmbar é o universo médico ainda não coberto pela força de vendas."
        action={<RegionFilter value={scope} onChange={setScope} />}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DataBadge attestation={POTENTIAL_ATTESTATION} variant="full" />
            <FutureButton label="Perfil individual do médico" phase="Fase 2" />
          </div>
        }
      >
        <div className="space-y-4">
          <CoverageChart rows={rows} />
          <SpecialtyTable rows={rows} />
          <CanonicalOpportunity />
        </div>
      </Panel>

      <Panel
        title="Médicos em acompanhamento"
        description="Recorte nominal, secundário à leitura agregada acima. Linhas fora da região selecionada ficam esmaecidas."
        footer={<DataBadge attestation={POTENTIAL_ATTESTATION} variant="full" />}
      >
        <DoctorTable scope={scope} />
      </Panel>

      <p className="max-w-3xl text-delta text-neutral">
        Prescrição vem do painel médico e chega com semanas de defasagem; cobertura e visita vêm do
        CRM/SFA e chegam em dias. O potencial nasce das duas fontes, então carrega sempre o elo mais
        fraco entre elas — o número segue na tela, apenas não se apresenta como fresco.
      </p>
    </div>
  )
}
