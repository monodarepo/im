import { ThreadRibbon } from '../../components/ThreadRibbon'
import { useNavigate, useParams } from 'react-router-dom'
import { DataBadge } from '../../components/DataBadge'
import { Panel } from '../../components/Panel'
import { SemanticDelta } from '../../components/SemanticDelta'
import {
  DEFAULT_SKU_ID,
  findSku,
  formatMetric,
  PRODUCT_DIMENSION_COUNT,
  SKUS,
  type ProductMetric,
} from '../../mock/products'

function MetricRow({ metric }: { metric: ProductMetric }) {
  const pending = metric.value === null

  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-delta-lg text-slate-600">{metric.label}</span>
      <span className="text-right">
        <span
          className={`block text-delta-lg font-semibold tabular-nums ${
            pending ? 'text-slate-300' : 'text-slate-900'
          }`}
          title={pending ? 'Valor pendente da seção 10 do ESCOPO' : undefined}
        >
          {formatMetric(metric)}
        </span>
        {metric.delta !== undefined ? (
          <span className="block">
            <SemanticDelta
              value={metric.delta}
              unit={metric.deltaUnit ?? 'percent'}
              inverted={metric.inverted ?? false}
              size="sm"
            />
          </span>
        ) : null}
      </span>
    </div>
  )
}

export function Product360() {
  const { skuId } = useParams()
  const navigate = useNavigate()
  const sku = findSku(skuId ?? DEFAULT_SKU_ID)

  if (!sku) {
    return (
      <div className="max-w-2xl space-y-3">
        <h1 className="text-lg font-semibold text-slate-900">Produto não encontrado</h1>
        <p className="text-delta-lg text-neutral">Nenhum SKU com o identificador {skuId}.</p>
      </div>
    )
  }

  const pendingCount = sku.panels
    .flatMap((panel) => panel.metrics)
    .filter((metric) => metric.value === null).length

  return (
    <div className="space-y-5">
      <ThreadRibbon step="measurement" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Produto 360°
          </h1>
          <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">{sku.name}</p>
          <p className="text-delta-lg text-neutral">{sku.presentation}</p>
        </div>

        <label className="text-delta-lg">
          <span className="mr-2 text-neutral">SKU</span>
          <select
            value={sku.id}
            onChange={(event) => navigate(`/hub/produto/${event.target.value}`)}
            className="rounded-control border border-surface-border bg-surface-card px-3 py-1.5 font-medium text-slate-900"
          >
            {SKUS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {sku.panels.map((panel) => (
          <Panel
            key={panel.id}
            title={panel.title}
            footer={<DataBadge attestation={panel.attestation} variant="full" />}
          >
            <div className="divide-y divide-surface-border">
              {panel.metrics.map((metric) => (
                <MetricRow key={metric.id} metric={metric} />
              ))}
            </div>
          </Panel>
        ))}
      </div>

      <p className="text-delta text-neutral">
        {PRODUCT_DIMENSION_COUNT} dimensões do módulo 1.3, agrupadas em quatro painéis. Cada painel
        declara as próprias fontes — as defasagens e confianças diferentes entre eles são o que a
        harmonização resolve.
        {pendingCount > 0
          ? ` ${pendingCount} valores aguardam a seção 10 do ESCOPO.`
          : ''}
      </p>
    </div>
  )
}
