import { useState } from 'react'
import { ICON_SIZE, ICON_STROKE, iconUi } from '../design/icons'
import { Link } from 'react-router-dom'
import { DataBadge } from '../components/DataBadge'
import { ImpactFunnel } from '../components/ImpactFunnel'
import { IntelligentMap } from '../components/IntelligentMap'
import { KpiCard } from '../components/KpiCard'
import { Panel } from '../components/Panel'
import { ProductBadge, ProductBadges } from '../components/ProductBadge'
import { StateChip } from '../components/StateChip'
import { PRODUCTS, PRODUCT_ORDER, SEMANTIC } from '../design/tokens'
import { DECISION_STATE_LABEL, DECISION_STATE_TONE } from '../domain/decision'
import { formatDecimal, formatInteger, formatPercent } from '../domain/format'
import { formatMoney } from '../domain/money'
import { formatRelative } from '../domain/today'
import { DECISION_RECORDS, TOTAL_DECISION_IMPACT_BRL } from '../mock/decisionRecords'
import { PRIORITIZED_ALERTS, SEVERITY_LABEL, SEVERITY_TONE } from '../mock/notifications'
import {
  BRIEFING_TOTAL_AT_RISK_BRL,
  DAILY_BRIEFING,
  DEFAULT_FUNNEL_VIEW,
  TOWER_ATTESTATION,
  TOWER_PRIMARY_KPIS,
  TOWER_SECONDARY_KPIS,
  type FunnelViewId,
  type TowerKpi,
} from '../mock/tower'

const ChevronUpIcon = iconUi.chevronUp
const ChevronDownIcon = iconUi.chevronDown

/**
 * Torre Integrada (seção 2, S1).
 *
 * A tela que responde à pergunta que nenhum dos quatro produtos responde
 * sozinho: onde está o dinheiro e quem está cuidando dele. Nada aqui é apurado
 * nesta tela — cada número é o mesmo que a tela de origem publica, e cada
 * cartão devolve o clique para lá.
 */
export function IntegratedTower() {
  const [showSecondary, setShowSecondary] = useState(false)
  const [funnelView, setFunnelView] = useState<FunnelViewId>(DEFAULT_FUNNEL_VIEW)

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Torre integrada
          </h1>
          <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
            Onde está o dinheiro, e quem está cuidando dele
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProductBadges products={PRODUCT_ORDER} size="md" />
        </div>
      </header>

      <section aria-label="Indicadores principais">
        <p className="mb-2 text-micro uppercase text-neutral">
          Indicadores principais · variação vs. 7 dias anteriores
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {TOWER_PRIMARY_KPIS.map((kpi) => (
            <TowerKpiCard key={kpi.id} kpi={kpi} />
          ))}
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowSecondary((value) => !value)}
            aria-expanded={showSecondary}
            className="inline-flex items-center gap-1.5 rounded-control border border-surface-border px-3 py-1.5 text-delta font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            {showSecondary ? (
              <ChevronUpIcon size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} aria-hidden />
            ) : (
              <ChevronDownIcon size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} aria-hidden />
            )}
            {showSecondary ? 'Recolher' : 'Abrir'} a linha secundária ·{' '}
            {formatInteger(TOWER_SECONDARY_KPIS.length)} indicadores de apoio
          </button>
        </div>

        {showSecondary ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TOWER_SECONDARY_KPIS.map((kpi) => (
              <TowerKpiCard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        ) : null}
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Panel
            title="Mapa inteligente"
            description="Nove camadas sobre a mesma geografia. Clique num estado para descer até o produto."
          >
            <IntelligentMap />
          </Panel>
        </div>

        <Panel
          title="Briefing do dia"
          description={`${formatInteger(DAILY_BRIEFING.length)} alertas priorizados por R$ em risco`}
          footer={`Total em risco no briefing: ${formatMoney(BRIEFING_TOTAL_AT_RISK_BRL)}.`}
        >
          <ol className="space-y-3">
            {DAILY_BRIEFING.map((alert, index) => (
              <li
                key={alert.id}
                className="rounded-control border border-surface-border px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-delta font-semibold tabular-nums text-neutral">
                    {index + 1}
                  </span>
                  <ProductBadge product={alert.product} />
                </div>
                <p className="mt-1 text-delta-lg font-medium text-slate-900">{alert.headline}</p>
                <p className="mt-1 font-mono text-kpi tabular-nums" style={{ color: SEMANTIC.negative }}>
                  {formatMoney(alert.valueAtRiskBrl)}
                </p>
                <p className="mt-1 text-delta text-neutral">{alert.evidence}</p>
                <Link
                  to={alert.route}
                  className="mt-2 inline-block text-delta font-medium underline"
                  style={{ color: 'var(--product-accent)' }}
                >
                  {alert.routeLabel} →
                </Link>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel
          title="Fila executiva de oportunidades"
          description="Cada card mostra os produtos que participam da captura"
          action={
            <Link
              to="/decisoes"
              className="text-delta font-medium underline"
              style={{ color: 'var(--product-accent)' }}
            >
              Central de Decisões
            </Link>
          }
          footer={`${formatInteger(DECISION_RECORDS.length)} decisões abertas somando ${formatMoney(TOTAL_DECISION_IMPACT_BRL)}.`}
        >
          <ol className="space-y-3">
            {DECISION_RECORDS.map((record) => (
              <li
                key={record.id}
                className="rounded-control border border-surface-border px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-delta font-medium tabular-nums text-neutral">{record.id}</p>
                    <Link
                      to={`/decisoes/${record.id}`}
                      className="mt-0.5 block text-delta-lg font-medium text-slate-900 underline decoration-slate-300 underline-offset-2"
                    >
                      {record.title}
                    </Link>
                  </div>
                  <span className="shrink-0 text-delta-lg font-semibold tabular-nums text-slate-900">
                    {formatMoney(record.impactBrl)}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ProductBadges
                    products={[...new Set(record.parcels.map((parcel) => parcel.source))]}
                  />
                  <StateChip
                    label={DECISION_STATE_LABEL[record.state]}
                    tone={DECISION_STATE_TONE[record.state]}
                  />
                  <span className="text-delta text-neutral">
                    {record.owner} · prazo {formatRelative(record.dueOn)}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel
          title="Funil de impacto financeiro"
          description="Do que a plataforma identifica ao que Finanças valida"
        >
          <ImpactFunnel view={funnelView} onViewChange={setFunnelView} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel
          title="Alertas prioritários"
          description="Os cinco primeiros da Central de Notificações"
          action={
            <Link
              to="/notificacoes"
              className="text-delta font-medium underline"
              style={{ color: 'var(--product-accent)' }}
            >
              Ver os {formatInteger(PRIORITIZED_ALERTS.length)}
            </Link>
          }
        >
          <ul className="divide-y divide-surface-border">
            {PRIORITIZED_ALERTS.slice(0, 5).map((alert) => (
              <li key={alert.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <StateChip
                  label={SEVERITY_LABEL[alert.severity]}
                  tone={SEVERITY_TONE[alert.severity]}
                />
                <ProductBadge product={alert.product} />
                <span className="min-w-0 flex-1 text-delta-lg text-slate-800">{alert.title}</span>
                <span className="shrink-0 text-delta-lg font-semibold tabular-nums text-slate-900">
                  {alert.valueAtRiskBrl > 0 ? formatMoney(alert.valueAtRiskBrl) : '—'}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Os quatro produtos"
          description="Cada um responde por uma parte da captura"
          footer={
            <span>
              <DataBadge attestation={TOWER_ATTESTATION} />
            </span>
          }
        >
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PRODUCT_ORDER.map((product) => {
              const decisions = DECISION_RECORDS.filter((record) =>
                record.parcels.some((parcel) => parcel.source === product),
              )
              const total = DECISION_RECORDS.flatMap((record) => record.parcels)
                .filter((parcel) => parcel.source === product)
                .reduce((sum, parcel) => sum + parcel.amountBrl, 0)

              return (
                <li
                  key={product}
                  className="rounded-control border border-surface-border px-4 py-3"
                >
                  <ProductBadge product={product} variant="full" />
                  <p className="mt-2 font-mono text-kpi tabular-nums text-slate-900">{formatMoney(total)}</p>
                  <p className="mt-1 text-delta text-neutral">
                    em {formatInteger(decisions.length)}{' '}
                    {decisions.length === 1 ? 'decisão' : 'decisões'}
                  </p>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>
    </div>
  )
}

function TowerKpiCard({ kpi }: { kpi: TowerKpi }) {
  const value =
    kpi.format === 'money'
      ? formatMoney(kpi.value)
      : kpi.format === 'percent'
        ? formatPercent(kpi.value)
        : formatDecimal(kpi.value, 1)

  return (
    <Link to={kpi.route} className="block transition-opacity hover:opacity-90">
      <KpiCard
        label={kpi.label}
        value={value}
        delta={kpi.delta}
        deltaUnit={kpi.deltaUnit}
        deltaInverted={kpi.inverted}
        attestation={kpi.attestation}
        corner={<ProductBadge product={kpi.product} />}
      />
    </Link>
  )
}

export { PRODUCTS }
