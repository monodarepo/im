import { ThreadRibbon } from '../../components/ThreadRibbon'
import { Link } from 'react-router-dom'
import { DiagnosticList } from '../../components/DiagnosticList'
import { KpiCard } from '../../components/KpiCard'
import { MixDonut } from '../../components/MixDonut'
import { OpportunityMap } from '../../components/OpportunityMap'
import { OpportunityQueue } from '../../components/OpportunityQueue'
import { Panel } from '../../components/Panel'
import { SelloutChart } from '../../components/SelloutChart'
import { formatKpiValue, MARKET_KPIS } from '../../mock/kpis'

function PanelLink({ to, children }: { to: string; children: string }) {
  return (
    <Link
      to={to}
      className="rounded-control px-2 py-1 text-delta font-medium transition-colors hover:bg-slate-50"
      style={{ color: 'var(--product-accent)' }}
    >
      {children} →
    </Link>
  )
}

export function MarketOverview() {
  return (
    <div className="space-y-5">
      <ThreadRibbon step="detection" />
      <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Visão geral do mercado
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {MARKET_KPIS.map((kpi) => (
          <KpiCard
            key={kpi.id}
            label={kpi.label}
            value={formatKpiValue(kpi)}
            delta={kpi.delta}
            deltaUnit={kpi.deltaUnit}
            deltaInverted={kpi.inverted}
            comparison={kpi.comparison}
            attestation={kpi.attestation}
          />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel title="Evolução de sell-out" description="Período atual contra os 7 dias anteriores">
            <SelloutChart />
          </Panel>
        </div>

        <div className="lg:col-span-5">
          <Panel title="Mapa de oportunidades">
            <OpportunityMap />
          </Panel>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel
            title="Top oportunidades (impacto R$)"
            action={<PanelLink to="/hub/radar">Ver todas as oportunidades</PanelLink>}
          >
            <OpportunityQueue />
          </Panel>
        </div>

        <div className="lg:col-span-5">
          <Panel title="Mix de vendas" description="Participação por marca no sell-out do período">
            <MixDonut />
          </Panel>
        </div>
      </div>

      <Panel
        title="Diagnóstico rápido"
        action={<PanelLink to="/hub/causa-raiz">Ver todos os diagnósticos</PanelLink>}
      >
        <DiagnosticList />
      </Panel>
    </div>
  )
}
