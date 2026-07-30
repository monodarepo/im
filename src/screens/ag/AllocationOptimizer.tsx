import { ThreadRibbon } from '../../components/ThreadRibbon'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { CHART_TOOLTIP_STYLE } from '../../design/chartTheme'
import { DataBadge } from '../../components/DataBadge'
import { FutureButton } from '../../components/FutureButton'
import { KpiCard } from '../../components/KpiCard'
import { Panel } from '../../components/Panel'
import { StateChip } from '../../components/StateChip'
import { DECISION_STATE_LABEL, DECISION_STATE_TONE } from '../../domain/decision'
import { formatDecimal, formatInteger, formatMultiple, formatPercent } from '../../domain/format'
import { formatMoney, formatMoneyFull } from '../../domain/money'
import { SEMANTIC } from '../../design/tokens'
import type { SemanticTone } from '../../design/tokens'
import { POTENTIAL_TIER_LABEL, SPECIALTY_LABEL } from '../../mock/doctors'
import {
  ALLOCATION_ATTESTATION,
  ALLOCATION_DECISION_ID,
  ALLOCATION_FILTERS,
  ALLOCATION_KPIS,
  BLOCKED_SAMPLES,
  CAMPAIGNS,
  CONVERSION_FUNNEL,
  DEFAULT_CAMPAIGN_ID,
  DOCTOR_ALLOCATION_ATTESTATION,
  DOCTOR_ALLOCATIONS,
  doctorOfAllocation,
  FUNNEL_ATTESTATION,
  REGION_ALLOCATIONS,
  REGION_ATTESTATION,
  REGION_TOTAL,
  SPECIALTY_DISTRIBUTION,
  STOCKOUT_BLOCK,
  type AllocationKpi,
  type CampaignId,
} from '../../mock/sampleAllocation'
import { useDecisionWorkflow } from '../../state/decisionWorkflowStore'

const SLICE_COLORS = ['#334155', '#64748B', '#94A3B8', '#CBD5E1']

const POTENTIAL_TONE: Record<'high' | 'medium' | 'low', SemanticTone> = {
  high: 'positive',
  medium: 'attention',
  low: 'neutral',
}

function kpiValue(kpi: AllocationKpi): string {
  switch (kpi.format) {
    case 'integer':
      return formatInteger(kpi.value)
    case 'percent':
      return formatPercent(kpi.value, 0)
    case 'money':
      return formatMoney(kpi.value)
    case 'money_full':
      return formatMoneyFull(kpi.value)
    case 'multiple':
      return formatMultiple(kpi.value)
  }
}

/**
 * Banner de bloqueio por ruptura.
 *
 * É o momento em que a plataforma se comporta como uma só: o AG não distribui
 * onde o HUB apurou ruptura, e diz de onde veio a informação.
 */
function StockoutBlock() {
  return (
    <div
      role="status"
      className="rounded-card border px-4 py-4"
      style={{ borderColor: `${SEMANTIC.attention}66`, backgroundColor: `${SEMANTIC.attention}0F` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-delta-lg font-semibold text-slate-900">{STOCKOUT_BLOCK.headline}</p>
          <p className="mt-1 text-delta-lg text-slate-700">
            {STOCKOUT_BLOCK.reason} {STOCKOUT_BLOCK.principle}
          </p>
          <p className="mt-2 text-delta text-neutral">
            Origem: {STOCKOUT_BLOCK.diagnosticFinding} — {STOCKOUT_BLOCK.diagnosticReading}.{' '}
            {formatInteger(BLOCKED_SAMPLES)} amostras retidas até a reposição.
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <StateChip label="Bloqueio ativo" tone="attention" />
          <Link
            to={STOCKOUT_BLOCK.sourceRoute}
            className="rounded-control px-3 py-1.5 text-delta-lg font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--product-accent)' }}
          >
            {STOCKOUT_BLOCK.sourceLabel} →
          </Link>
        </div>
      </div>

      <div className="mt-3 border-t pt-3" style={{ borderColor: `${SEMANTIC.attention}44` }}>
        <DataBadge attestation={STOCKOUT_BLOCK.attestation} variant="full" />
      </div>
    </div>
  )
}

function DoctorTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 font-medium">Médico</th>
            <th className="pb-2 font-medium">Especialidade</th>
            <th className="pb-2 font-medium">Potencial</th>
            <th className="pb-2 text-right font-medium">Prescrição (unid./mês)</th>
            <th className="pb-2 text-right font-medium">Freq. visita (dias)</th>
            <th className="pb-2 text-right font-medium">Amostras entregues</th>
            <th className="pb-2 text-right font-medium">Recomendação IA</th>
            <th className="pb-2 text-right font-medium">Conversão est. (unid.)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {DOCTOR_ALLOCATIONS.map((allocation) => {
            const doctor = doctorOfAllocation(allocation)
            if (!doctor) return null
            return (
              <tr
                key={allocation.doctorId}
                className="text-delta-lg transition-colors hover:bg-slate-50"
              >
                <td className="py-2.5 font-medium text-slate-900">{doctor.name}</td>
                <td className="py-2.5 text-slate-600">{SPECIALTY_LABEL[doctor.specialty]}</td>
                <td className="py-2.5">
                  <StateChip
                    label={POTENTIAL_TIER_LABEL[doctor.potentialTier].replace(' potencial', '')}
                    tone={POTENTIAL_TONE[doctor.potentialTier]}
                  />
                </td>
                <td className="py-2.5 text-right tabular-nums text-slate-700">
                  {formatInteger(allocation.monthlyPrescriptions)}
                </td>
                <td className="py-2.5 text-right tabular-nums text-slate-700">
                  {formatInteger(allocation.visitFrequencyDays)}
                </td>
                <td className="py-2.5 text-right tabular-nums text-slate-700">
                  {formatInteger(allocation.samplesDelivered)}
                </td>
                <td className="py-2.5 text-right">
                  <span
                    className="inline-block rounded-control px-2.5 py-1 text-delta-lg font-semibold tabular-nums text-white"
                    style={{ backgroundColor: 'var(--product-accent)' }}
                  >
                    {formatInteger(allocation.recommendedSamples)}
                  </span>
                </td>
                <td className="py-2.5 text-right font-semibold tabular-nums text-slate-900">
                  {formatInteger(allocation.estimatedConversionUnits)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function RegionTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left">
        <thead>
          <tr className="border-b border-surface-border text-delta text-neutral">
            <th className="pb-2 font-medium">Região</th>
            <th className="pb-2 text-right font-medium">Médicos-alvo</th>
            <th className="pb-2 text-right font-medium">Estoque disponível</th>
            <th className="pb-2 text-right font-medium">Recomendação IA</th>
            <th className="pb-2 text-right font-medium">Cobertura</th>
            <th className="pb-2 text-right font-medium">ROI estimado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {REGION_ALLOCATIONS.map((row) => (
            <tr key={row.id} className="text-delta-lg transition-colors hover:bg-slate-50">
              <td className="py-2.5 font-medium text-slate-900">{row.region}</td>
              <td className="py-2.5 text-right tabular-nums text-slate-700">
                {formatInteger(row.targetDoctors)}
              </td>
              <td className="py-2.5 text-right tabular-nums text-slate-700">
                {formatInteger(row.availableStock)}
              </td>
              <td className="py-2.5 text-right font-medium tabular-nums text-slate-900">
                {formatInteger(row.recommendedSamples)}
              </td>
              <td className="py-2.5 text-right tabular-nums text-slate-700">
                {formatPercent(row.coveragePercent, 0)}
              </td>
              <td className="py-2.5 text-right tabular-nums text-slate-700">
                {formatMultiple(row.estimatedRoi)}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-surface-border text-delta-lg font-semibold">
            <td className="py-2.5 text-slate-900">{REGION_TOTAL.region}</td>
            <td className="py-2.5 text-right tabular-nums text-slate-900">
              {formatInteger(REGION_TOTAL.targetDoctors)}
            </td>
            <td className="py-2.5 text-right tabular-nums text-slate-900">
              {formatInteger(REGION_TOTAL.availableStock)}
            </td>
            <td className="py-2.5 text-right tabular-nums text-slate-900">
              {formatInteger(REGION_TOTAL.recommendedSamples)}
            </td>
            <td className="py-2.5 text-right tabular-nums text-slate-900">
              {formatPercent(REGION_TOTAL.coveragePercent, 0)}
            </td>
            <td className="py-2.5 text-right tabular-nums text-slate-900">
              {formatMultiple(REGION_TOTAL.estimatedRoi)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function SpecialtyDonut() {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[...SPECIALTY_DISTRIBUTION]}
              dataKey="share"
              nameKey="label"
              innerRadius={54}
              outerRadius={78}
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              {SPECIALTY_DISTRIBUTION.map((slice, index) => (
                <Cell key={slice.id} fill={SLICE_COLORS[index % SLICE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [formatPercent(value, 0), 'Participação']}
              contentStyle={CHART_TOOLTIP_STYLE}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="w-full space-y-2">
        {SPECIALTY_DISTRIBUTION.map((slice, index) => (
          <li key={slice.id} className="flex items-center gap-2 text-delta-lg">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: SLICE_COLORS[index % SLICE_COLORS.length] }}
              aria-hidden
            />
            <span className="text-slate-700">{slice.label}</span>
            <span className="ml-auto font-medium tabular-nums text-slate-900">
              {formatPercent(slice.share, 0)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ConversionFunnel() {
  const first = CONVERSION_FUNNEL[0]?.value ?? 1

  return (
    <ol className="space-y-3">
      {CONVERSION_FUNNEL.map((stage) => {
        const width = Math.max(8, (stage.value / first) * 100)
        return (
          <li key={stage.id}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-delta-lg text-slate-700">{stage.label}</span>
              <span className="text-delta-lg font-semibold tabular-nums text-slate-900">
                {formatInteger(stage.value)}
                {stage.conversionPercent !== null ? (
                  <span className="ml-2 text-delta font-normal text-neutral">
                    {formatPercent(stage.conversionPercent, 0)} {stage.basis}
                  </span>
                ) : null}
              </span>
            </div>
            <span className="mt-1 block h-2.5 w-full rounded-full bg-slate-100">
              <span
                className="block h-2.5 rounded-full bg-slate-500"
                style={{ width: `${width}%` }}
              />
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function AllocationOptimizer() {
  const [campaignId, setCampaignId] = useState<CampaignId>(DEFAULT_CAMPAIGN_ID)
  const campaign = CAMPAIGNS.find((item) => item.id === campaignId) ?? CAMPAIGNS[0]

  const submitForApproval = useDecisionWorkflow((state) => state.submitForApproval)
  const decisionState = useDecisionWorkflow((state) => state.stateOf(ALLOCATION_DECISION_ID))
  const parcels = useDecisionWorkflow((state) => state.parcelsOf(ALLOCATION_DECISION_ID))
  const submitted = parcels.some((parcel) => parcel.id === 'ag-allocation-plan')

  const costKpi = ALLOCATION_KPIS.find((kpi) => kpi.id === 'cost')

  return (
    <div className="space-y-5">
      <ThreadRibbon step="reinforcement" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Otimizador de alocação
          </h1>
          <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
            Para quem a amostra vai — e para quem não vai
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-delta-lg">
            <span className="mr-2 text-neutral">Campanha</span>
            <select
              value={campaignId}
              onChange={(event) => setCampaignId(event.target.value as CampaignId)}
              className="rounded-control border border-surface-border bg-surface-card px-3 py-1.5 font-medium text-slate-900"
            >
              {CAMPAIGNS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} · {option.businessUnit}
                </option>
              ))}
            </select>
          </label>

          {ALLOCATION_FILTERS.slice(1).map((filter) => (
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

      <StockoutBlock />

      {campaign && !campaign.planned ? (
        <Panel
          title={`${campaign.name} — ${campaign.businessUnit}`}
          description="Piloto em dimensionamento"
        >
          <p className="text-delta-lg text-slate-700">{campaign.note}</p>
          <p className="mt-2 text-delta text-neutral">
            Produto: {campaign.product}. O bloqueio por ruptura acima vale para qualquer campanha —
            é regra da plataforma, não parâmetro de campanha.
          </p>
        </Panel>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {ALLOCATION_KPIS.map((kpi) => (
              <KpiCard
                key={kpi.id}
                label={kpi.label}
                value={kpiValue(kpi)}
                attestation={kpi.attestation}
              />
            ))}
          </div>

          <Panel
            title="Recomendação por médico"
            description="A recomendação da IA sai do histórico de prescrição, da frequência de visita e do que já foi entregue"
            footer={<DataBadge attestation={DOCTOR_ALLOCATION_ATTESTATION} variant="full" />}
          >
            <DoctorTable />
          </Panel>

          <Panel
            title="Alocação por região"
            footer={<DataBadge attestation={REGION_ATTESTATION} variant="full" />}
          >
            <RegionTable />
          </Panel>

          <div className="grid gap-5 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Panel
                title="Distribuição recomendada"
                description="Participação por especialidade"
                footer={<DataBadge attestation={ALLOCATION_ATTESTATION} />}
              >
                <SpecialtyDonut />
              </Panel>
            </div>

            <div className="lg:col-span-7">
              <Panel
                title="Conversão esperada"
                description="Da amostra distribuída ao sell-out incremental"
                footer={<DataBadge attestation={FUNNEL_ATTESTATION} />}
              >
                <ConversionFunnel />
              </Panel>
            </div>
          </div>

          <Panel
            title="Ações"
            footer={
              submitted ? (
                <span>
                  Plano de {formatInteger(REGION_TOTAL.recommendedSamples)} amostras anexado a{' '}
                  <Link
                    to={`/decisoes/${ALLOCATION_DECISION_ID}`}
                    className="font-medium underline"
                    style={{ color: 'var(--product-accent)' }}
                  >
                    {ALLOCATION_DECISION_ID}
                  </Link>
                  .
                </span>
              ) : (
                <span>
                  Enviar para aprovação cria a parcela do plano em {ALLOCATION_DECISION_ID}, com o
                  custo estimado da campanha.
                </span>
              )
            }
          >
            <div className="flex flex-wrap items-center gap-3">
              <FutureButton label="Gerar plano de entrega" phase="Fase 2" />

              <button
                type="button"
                disabled={submitted}
                onClick={() =>
                  submitForApproval(ALLOCATION_DECISION_ID, {
                    id: 'ag-allocation-plan',
                    source: 'ag',
                    label: `Plano de alocação — ${formatInteger(REGION_TOTAL.recommendedSamples)} amostras`,
                    amountBrl: costKpi?.value ?? 0,
                    attestation: ALLOCATION_ATTESTATION,
                  })
                }
                className={`rounded-control px-3 py-2 text-delta-lg font-medium transition-colors ${
                  submitted
                    ? 'cursor-default border border-surface-border bg-slate-50 text-neutral'
                    : 'text-white'
                }`}
                style={submitted ? undefined : { backgroundColor: 'var(--product-accent)' }}
              >
                {submitted ? 'Enviado para aprovação' : 'Enviar para aprovação'}
              </button>

              <FutureButton label="Simular outro cenário" phase="Fase 2" />
              <FutureButton label="Exportar plano" phase="Fase 2" />

              <span className="ml-auto inline-flex items-center gap-2">
                <span className="text-delta text-neutral">{ALLOCATION_DECISION_ID}</span>
                <StateChip
                  label={DECISION_STATE_LABEL[decisionState]}
                  tone={DECISION_STATE_TONE[decisionState]}
                />
              </span>
            </div>
          </Panel>

          <p className="text-delta text-neutral">
            Custo por amostra: R$ {formatDecimal((costKpi?.value ?? 0) / REGION_TOTAL.recommendedSamples, 2)}.
            Verba anual sob governança do módulo: {formatMoney(700_000_000)}.
          </p>
        </>
      )}
    </div>
  )
}
