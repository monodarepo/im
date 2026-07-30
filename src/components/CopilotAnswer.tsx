import { Link } from 'react-router-dom'
import { ConfidenceMeter } from './ConfidenceMeter'
import { DataBadge } from './DataBadge'
import { ProductBadge } from './ProductBadge'
import { Panel } from './Panel'
import { ageInDays } from '../domain/today'
import { SOURCE_LABEL } from '../domain/attestation'
import {
  ANSWER_ATTESTATION,
  ANSWER_BLOCKS,
  CANONICAL_QUESTION,
  EXPLAINABILITY,
  SUGGESTED_QUESTIONS,
} from '../mock/copilotAnswer'

/**
 * Resposta do copiloto à pergunta canônica.
 *
 * Vive em componente próprio porque aparece em dois lugares — na tela cheia e
 * no drawer — e as duas precisam mostrar exatamente a mesma coisa. Se
 * divergissem, a demonstração teria duas respostas para a mesma pergunta.
 */
export function CopilotAnswer({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-4">
      <div className="rounded-card border border-surface-border bg-slate-50 px-5 py-4">
        <p className="text-delta font-medium uppercase tracking-wide text-neutral">Pergunta</p>
        <p className="mt-1 text-delta-lg font-medium text-slate-900">{CANONICAL_QUESTION}</p>
      </div>

      <div
        className={
          compact ? 'space-y-3' : 'grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3'
        }
      >
        {ANSWER_BLOCKS.map((block, index) => (
          <Panel
            key={block.id}
            title={`${index + 1}. ${block.title}`}
            action={<ProductBadge product={block.product} />}
            footer={
              <span className="flex flex-wrap items-center justify-between gap-2">
                <DataBadge attestation={block.attestation} />
                <Link
                  to={block.route}
                  className="font-medium underline"
                  style={{ color: 'var(--product-accent)' }}
                >
                  {block.routeLabel} →
                </Link>
              </span>
            }
          >
            <p className="text-delta-lg text-slate-700">{block.headline}</p>

            <ul className="mt-3 divide-y divide-surface-border">
              {block.rows.map((row) => (
                <li key={row.label} className="flex flex-wrap items-baseline justify-between gap-2 py-1.5">
                  <span className="min-w-0 text-delta-lg text-slate-800">{row.label}</span>
                  <span className="min-w-0 text-right">
                    <span className="text-delta-lg font-semibold tabular-nums text-slate-900">
                      {row.value}
                    </span>
                    {row.note ? (
                      <span className="ml-2 text-delta font-normal text-neutral">{row.note}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </div>
  )
}

/**
 * Rodapé de explicabilidade, sempre visível.
 *
 * Quais dados, qual regra, qual confiança, qual defasagem. A confiança e a
 * defasagem não são digitadas: saem do atestado combinado da resposta, que já
 * é o elo mais fraco entre os dez blocos.
 */
export function ExplainabilityFooter() {
  const lag = ageInDays(ANSWER_ATTESTATION.asOf)

  return (
    <section className="rounded-card border border-surface-border bg-surface-card px-5 py-4">
      <h2 className="text-sm font-semibold text-slate-900">Como esta resposta foi montada</h2>

      <dl className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div>
          <dt className="text-delta font-medium uppercase tracking-wide text-neutral">
            Quais dados
          </dt>
          <dd className="mt-1 text-delta-lg text-slate-700">{EXPLAINABILITY.data}</dd>
          <dd className="mt-2 flex flex-wrap gap-1">
            {ANSWER_ATTESTATION.source.map((source) => (
              <span
                key={source}
                className="rounded-control bg-slate-100 px-2 py-0.5 text-delta text-slate-600"
              >
                {SOURCE_LABEL[source]}
              </span>
            ))}
          </dd>
        </div>

        <div>
          <dt className="text-delta font-medium uppercase tracking-wide text-neutral">Qual regra</dt>
          <dd className="mt-1 text-delta-lg text-slate-700">{EXPLAINABILITY.rule}</dd>
        </div>

        <div>
          <dt className="text-delta font-medium uppercase tracking-wide text-neutral">
            Qual confiança
          </dt>
          <dd className="mt-1">
            <ConfidenceMeter confidence={ANSWER_ATTESTATION.confidence} showLabel />
          </dd>
          <dd className="mt-1 text-delta text-neutral">{EXPLAINABILITY.confidenceNote}</dd>
        </div>

        <div>
          <dt className="text-delta font-medium uppercase tracking-wide text-neutral">
            Qual defasagem
          </dt>
          <dd className="mt-1 text-delta-lg tabular-nums text-slate-700">
            {lag} dias desde a referência mais antiga
          </dd>
          <dd className="mt-1 text-delta text-neutral">{EXPLAINABILITY.lagNote}</dd>
        </div>
      </dl>
    </section>
  )
}

export function QuestionChips({
  selectedId,
  onSelect,
}: {
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Perguntas sugeridas">
      {SUGGESTED_QUESTIONS.map((question) => {
        const isActive = question.id === selectedId
        return (
          <button
            key={question.id}
            type="button"
            onClick={() => onSelect(question.id)}
            aria-pressed={isActive}
            className="rounded-control border px-3 py-1.5 text-left text-delta font-medium transition-colors"
            style={
              isActive
                ? {
                    backgroundColor: 'var(--product-accent)',
                    borderColor: 'var(--product-accent)',
                    color: '#FFFFFF',
                  }
                : { borderColor: '#E2E8F0', color: '#475569' }
            }
          >
            {question.text}
            {question.answered ? null : (
              <span className="ml-2 text-[10px] uppercase opacity-70">Fase 2</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
