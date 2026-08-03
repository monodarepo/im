import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DataBadge } from '../components/DataBadge'
import { KpiCard } from '../components/KpiCard'
import { Panel } from '../components/Panel'
import { ProductBadge } from '../components/ProductBadge'
import { StateChip } from '../components/StateChip'
import { PRODUCTS, PRODUCT_ORDER, SEMANTIC, type ProductId } from '../design/tokens'
import { formatInteger } from '../domain/format'
import { formatMoney } from '../domain/money'
import { formatRelative } from '../domain/today'
import {
  ALERTS_WITH_DECISION,
  NOTIFICATIONS_ATTESTATION,
  PRIORITIZED_ALERTS,
  SEVERITY_LABEL,
  SEVERITY_ORDER,
  SEVERITY_TONE,
  TOTAL_AT_RISK_BRL,
  countByProduct,
  countBySeverity,
  isWellFormed,
  type Alert,
  type AlertSeverity,
} from '../mock/notifications'

/**
 * Central de Notificações (seção 2, S4).
 *
 * Quinze alertas com anatomia fixa: valor em R$, evidência, causa provável,
 * ação sugerida e dono. O cartão exibe os cinco lado a lado de propósito — é
 * a forma de deixar visível que nenhum alerta chegou aqui pela metade.
 */
export function NotificationCenter() {
  const [severity, setSeverity] = useState<AlertSeverity | 'all'>('all')
  const [product, setProduct] = useState<ProductId | 'all'>('all')

  const filtered = PRIORITIZED_ALERTS.filter(
    (alert) =>
      (severity === 'all' || alert.severity === severity) &&
      (product === 'all' || alert.product === product),
  )

  const filteredAtRisk = filtered.reduce((sum, alert) => sum + alert.valueAtRiskBrl, 0)

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Central de notificações
        </h1>
        <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
          {formatInteger(PRIORITIZED_ALERTS.length)} alertas prioritários ·{' '}
          {formatMoney(TOTAL_AT_RISK_BRL)} em risco
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total em risco"
          value={formatMoney(TOTAL_AT_RISK_BRL)}
          attestation={NOTIFICATIONS_ATTESTATION}
        />
        <KpiCard
          label="Alertas críticos"
          value={formatInteger(countBySeverity('critical'))}
          attestation={NOTIFICATIONS_ATTESTATION}
        />
        <KpiCard
          label="Com decisão aberta"
          value={`${formatInteger(ALERTS_WITH_DECISION)} de ${formatInteger(PRIORITIZED_ALERTS.length)}`}
          attestation={NOTIFICATIONS_ATTESTATION}
        />
        <KpiCard
          label="Com anatomia completa"
          value={`${formatInteger(PRIORITIZED_ALERTS.filter(isWellFormed).length)} de ${formatInteger(PRIORITIZED_ALERTS.length)}`}
          attestation={NOTIFICATIONS_ATTESTATION}
        />
      </div>

      <Panel title="Filtros" description="Severidade e produto">
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-delta font-medium text-neutral">Severidade</span>
            <FilterChip label="Todas" active={severity === 'all'} onClick={() => setSeverity('all')} />
            {SEVERITY_ORDER.map((option) => (
              <FilterChip
                key={option}
                label={`${SEVERITY_LABEL[option]} (${formatInteger(countBySeverity(option))})`}
                active={severity === option}
                onClick={() => setSeverity(option)}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-delta font-medium text-neutral">Produto</span>
            <FilterChip label="Todos" active={product === 'all'} onClick={() => setProduct('all')} />
            {PRODUCT_ORDER.map((option) => (
              <FilterChip
                key={option}
                label={`${PRODUCTS[option].shortName} (${formatInteger(countByProduct(option))})`}
                active={product === option}
                onClick={() => setProduct(option)}
              />
            ))}
          </div>
        </div>

        <p className="mt-3 text-delta text-neutral">
          {formatInteger(filtered.length)} de {formatInteger(PRIORITIZED_ALERTS.length)} alertas ·{' '}
          {formatMoney(filteredAtRisk)} em risco no recorte.
        </p>
      </Panel>

      {filtered.length === 0 ? (
        <Panel title="Nenhum alerta no recorte">
          <p className="text-delta-lg text-neutral">
            Nenhum alerta combina a severidade e o produto selecionados.
          </p>
        </Panel>
      ) : (
        <ol className="space-y-3">
          {filtered.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </ol>
      )}
    </div>
  )
}

function AlertCard({ alert }: { alert: Alert }) {
  return (
    <li className="rounded-card border border-surface-border bg-surface-card px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <StateChip label={SEVERITY_LABEL[alert.severity]} tone={SEVERITY_TONE[alert.severity]} />
          <ProductBadge product={alert.product} />
          <h2 className="min-w-0 text-delta-lg font-semibold text-slate-900">{alert.title}</h2>
        </div>
        <span className="shrink-0 text-delta text-neutral">
          detectado {formatRelative(alert.detectedOn)}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 lg:grid-cols-5">
        <div>
          <dt className="text-delta font-medium uppercase tracking-wide text-neutral">
            Valor em risco
          </dt>
          <dd
            className="mt-1 font-mono text-kpi tabular-nums"
            style={{ color: alert.valueAtRiskBrl > 0 ? SEMANTIC.negative : SEMANTIC.neutral }}
          >
            {alert.valueAtRiskBrl > 0 ? formatMoney(alert.valueAtRiskBrl) : 'Sem R$ direto'}
          </dd>
        </div>

        <div>
          <dt className="text-delta font-medium uppercase tracking-wide text-neutral">Evidência</dt>
          <dd className="mt-1 text-delta-lg text-slate-700">{alert.evidence}</dd>
        </div>

        <div>
          <dt className="text-delta font-medium uppercase tracking-wide text-neutral">
            Causa provável
          </dt>
          <dd className="mt-1 text-delta-lg text-slate-700">{alert.probableCause}</dd>
        </div>

        <div>
          <dt className="text-delta font-medium uppercase tracking-wide text-neutral">
            Ação sugerida
          </dt>
          <dd className="mt-1 text-delta-lg text-slate-700">{alert.suggestedAction}</dd>
        </div>

        <div>
          <dt className="text-delta font-medium uppercase tracking-wide text-neutral">Dono</dt>
          <dd className="mt-1 text-delta-lg font-medium text-slate-900">{alert.owner}</dd>
          <dd className="text-delta text-neutral">{alert.ownerRole}</dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-surface-border pt-3">
        <DataBadge attestation={alert.attestation} />
        <Link
          to={alert.route}
          className="text-delta font-medium underline"
          style={{ color: 'var(--product-accent)' }}
        >
          {alert.routeLabel} →
        </Link>
      </div>
    </li>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="rounded-control border px-2.5 py-1 text-delta font-medium transition-colors"
      style={
        active
          ? {
              backgroundColor: 'var(--product-accent)',
              borderColor: 'var(--product-accent)',
              color: '#FFFFFF',
            }
          : { borderColor: '#E2E8F0', color: '#475569' }
      }
    >
      {label}
    </button>
  )
}
