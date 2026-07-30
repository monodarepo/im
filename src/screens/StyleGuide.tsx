import { useState } from 'react'
import { AiChip } from '../components/AiChip'
import { ConfidenceMeter } from '../components/ConfidenceMeter'
import { DataBadge } from '../components/DataBadge'
import { DataTable, type DataTableColumn } from '../components/DataTable'
import { DegradedBanner } from '../components/DegradedBanner'
import { FutureButton } from '../components/FutureButton'
import { KpiCard } from '../components/KpiCard'
import { Panel } from '../components/Panel'
import { ProductBadge } from '../components/ProductBadge'
import { SemanticDelta } from '../components/SemanticDelta'
import { StateChip } from '../components/StateChip'
import { EmptyState } from '../components/states/EmptyState'
import { ErrorState } from '../components/states/ErrorState'
import { SkeletonRows } from '../components/states/Skeleton'
import { ICON_SIZE, ICON_STROKE, iconFor } from '../design/icons'
import { PRODUCT_ORDER, PRODUCTS, SEMANTIC } from '../design/tokens'
import { combine } from '../domain/attestation'
import { formatMoney } from '../domain/money'
import { formatInteger, formatPercent } from '../domain/format'
import { MARKET_KPIS } from '../mock/kpis'
import { REGION_ALLOCATIONS, REGION_TOTAL } from '../mock/sampleAllocation'
import { IQVIA, SCANNTECH } from '../mock/sources'

/**
 * Página de estilo (PD1). Não linkada na navegação — é a referência de
 * consistência para detectar deriva entre sessões: todos os tokens,
 * componentes e estados lado a lado, com dado real.
 */

const SAMPLE_ATTESTATION = combine([SCANNTECH, IQVIA])

type RegionRow = (typeof REGION_ALLOCATIONS)[number]

const TABLE_COLUMNS: readonly DataTableColumn<RegionRow>[] = [
  { id: 'region', header: 'Região', cell: (row) => row.region, sortValue: (row) => row.region, pinned: true },
  {
    id: 'doctors',
    header: 'Médicos-alvo',
    cell: (row) => formatInteger(row.targetDoctors),
    sortValue: (row) => row.targetDoctors,
    numeric: true,
  },
  {
    id: 'samples',
    header: 'Amostras',
    cell: (row) => formatInteger(row.recommendedSamples),
    sortValue: (row) => row.recommendedSamples,
    numeric: true,
  },
  {
    id: 'coverage',
    header: 'Cobertura',
    cell: (row) => formatPercent(row.coveragePercent, 0),
    sortValue: (row) => row.coveragePercent,
    numeric: true,
    attestation: SAMPLE_ATTESTATION,
  },
]

const TYPE_ROLES = [
  ['text-micro uppercase', 'micro-rótulo · 11px caixa alta'],
  ['text-label', 'label · 12px'],
  ['text-body', 'body · 13px'],
  ['text-body-lg', 'bodyLarge · 14px'],
  ['text-section', 'sectionTitle · 15px'],
  ['text-screen', 'screenTitle · 18px'],
] as const

export function StyleGuide() {
  const [tableState, setTableState] = useState<'ready' | 'loading' | 'empty' | 'error'>('ready')

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-micro uppercase text-slate-500">Página de estilo</h1>
        <p className="mt-1 text-screen text-slate-900">
          Fundação visual PD1 — tokens, componentes e estados
        </p>
        <p className="mt-1 text-body text-neutral">
          Referência de consistência. Não linkada na navegação; a deriva se detecta aqui.
        </p>
      </header>

      <Panel title="Tipografia" description="Geist Sans na interface, Geist Mono no numeral">
        <div className="space-y-2">
          {TYPE_ROLES.map(([cls, label]) => (
            <p key={cls} className={`${cls} text-slate-900`}>
              {label}
            </p>
          ))}
          <p className="font-mono text-metric text-slate-900">R$ 256,4M · metric mono</p>
          <p className="font-mono text-metric-lg text-slate-900">18,7% · metricLarge</p>
          <p className="text-body text-slate-700">
            Numeral tabular global: 111.111 vs 999.999 alinham coluna. Menos tipográfico: −3,2 pp.
          </p>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Cor semântica" description="A cor pertence ao número">
          <ul className="space-y-2">
            {Object.entries(SEMANTIC).map(([tone, color]) => (
              <li key={tone} className="flex items-center gap-3 text-body">
                <span className="h-4 w-10 rounded-sm border border-surface-border" style={{ backgroundColor: color }} />
                <span className="font-mono text-label text-slate-600">{color}</span>
                <span className="text-neutral">{tone}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Identidade de produto" description="Vive só no chrome, nunca em série de dado">
          <ul className="space-y-2">
            {PRODUCT_ORDER.map((id) => (
              <li key={id} className="flex items-center gap-3 text-body">
                <ProductBadge product={id} />
                <span className="font-mono text-label text-slate-600">{PRODUCTS[id].accent}</span>
                <span className="text-neutral">{PRODUCTS[id].name}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Ícones" description="Lucide, stroke 1.5, tamanhos 14/16/20, sempre com rótulo">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(iconFor).map(([name, Icon]) => (
            <li key={name} className="flex items-center gap-2 text-body text-slate-700">
              <Icon size={ICON_SIZE.md} strokeWidth={ICON_STROKE} aria-hidden />
              {name}
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-center gap-2 text-body text-slate-700">
          Marcador de recomendação de IA: <AiChip /> — nunca ícone de brilho.
        </p>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <KpiCard
          label={MARKET_KPIS[0]?.label ?? 'Sell-out'}
          value={formatMoney(MARKET_KPIS[0]?.value ?? 0)}
          delta={MARKET_KPIS[0]?.delta ?? 0}
          comparison="vs. 7 dias anteriores"
          attestation={MARKET_KPIS[0]?.attestation ?? SAMPLE_ATTESTATION}
        />
        <Panel title="Chips e estados">
          <div className="flex flex-wrap items-center gap-2">
            <StateChip label="Aprovada" tone="positive" />
            <StateChip label="Em aprovação" tone="attention" />
            <StateChip label="Rejeitada" tone="negative" />
            <StateChip label="Proposta" />
            <SemanticDelta value={8.6} comparison="vs. anterior" />
            <SemanticDelta value={-1.2} unit="points" inverted />
            <ConfidenceMeter confidence="medium" showLabel />
            <FutureButton label="Write-back ao ERP" phase="Fase 3" />
          </div>
        </Panel>
        <Panel title="Procedência">
          <div className="space-y-2">
            <DataBadge attestation={SAMPLE_ATTESTATION} variant="full" />
            <DegradedBanner attestations={[]} />
            <p className="text-label text-neutral">
              Banner degradado renderiza nulo sem fonte atrasada — estado degradado nunca bloqueia.
            </p>
          </div>
        </Panel>
      </div>

      <Panel
        title="DataTable"
        description="A primitiva de metade das telas: micro-rótulo, ordenação, hairline, total com borda de 2px"
        action={
          <div className="flex gap-1">
            {(['ready', 'loading', 'empty', 'error'] as const).map((state) => (
              <button
                key={state}
                type="button"
                onClick={() => setTableState(state)}
                aria-pressed={tableState === state}
                className="rounded-control border px-2 py-1 text-label font-medium"
                style={
                  tableState === state
                    ? { backgroundColor: 'var(--product-accent)', borderColor: 'var(--product-accent)', color: '#fff' }
                    : { borderColor: '#E2E8F0', color: '#475569' }
                }
              >
                {state}
              </button>
            ))}
          </div>
        }
      >
        <DataTable
          caption="Alocação por região — amostra da primitiva"
          columns={TABLE_COLUMNS}
          rows={REGION_ALLOCATIONS}
          rowKey={(row) => row.id}
          state={tableState}
          footer={(columnId) => {
            if (columnId === 'region') return REGION_TOTAL.region
            if (columnId === 'doctors') return formatInteger(REGION_TOTAL.targetDoctors)
            if (columnId === 'samples') return formatInteger(REGION_TOTAL.recommendedSamples)
            return formatPercent(REGION_TOTAL.coveragePercent, 0)
          }}
        />
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Carregando">
          <SkeletonRows rows={4} />
        </Panel>
        <Panel title="Vazio">
          <EmptyState
            title="Nenhum filtro aplicado"
            description="Selecione um período e uma região para trazer os dados desta tabela."
          />
        </Panel>
        <Panel title="Erro">
          <ErrorState
            title="Não foi possível carregar"
            cause="A fonte não respondeu dentro do prazo. Recarregue a tela ou consulte a Qualidade dos Dados."
          />
        </Panel>
      </div>
    </div>
  )
}
