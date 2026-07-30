import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CopilotAnswer, ExplainabilityFooter, QuestionChips } from '../components/CopilotAnswer'
import { Panel } from '../components/Panel'
import { CANONICAL_QUESTION, SUGGESTED_QUESTIONS } from '../mock/copilotAnswer'

/**
 * Copiloto Executivo (seção 2, S3).
 *
 * A pergunta canônica atravessa os quatro produtos e volta com dez blocos, cada
 * um linkando a tela que apurou o número. A resposta é determinística: o que a
 * demonstração precisa provar é que a plataforma sabe montar o caminho, não que
 * um modelo sabe redigir.
 */
export function ExecutiveCopilot() {
  const [askedId, setAskedId] = useState<string | null>('canonical')
  const asked = SUGGESTED_QUESTIONS.find((question) => question.id === askedId) ?? null

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Copiloto executivo
        </h1>
        <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
          Uma pergunta, quatro produtos, uma decisão
        </p>
      </header>

      <Panel
        title="Pergunta"
        description="Escolha uma das sugeridas ou escreva a sua"
        footer="A escrita livre entra na Fase 2. As perguntas sugeridas já respondem com dado real da plataforma."
      >
        <QuestionChips selectedId={askedId} onSelect={setAskedId} />

        <div className="mt-4">
          <label htmlFor="copilot-question" className="sr-only">
            Pergunta
          </label>
          <textarea
            id="copilot-question"
            rows={2}
            disabled
            placeholder={CANONICAL_QUESTION}
            className="w-full resize-none rounded-control border border-surface-border bg-slate-50 p-3 text-delta-lg text-slate-700 placeholder:text-neutral"
          />
        </div>
      </Panel>

      {asked?.answered ? (
        <CopilotAnswer />
      ) : (
        <Panel title="Resposta" description="Pergunta ainda sem resposta montada">
          <p className="text-delta-lg text-slate-700">
            {asked
              ? 'Esta pergunta entra na Fase 2, junto com a escrita livre. A pergunta canônica abaixo já responde com dado real e links funcionais.'
              : 'Selecione uma pergunta acima.'}
          </p>
          <button
            type="button"
            onClick={() => setAskedId('canonical')}
            className="mt-3 rounded-control px-3 py-1.5 text-delta font-medium text-white"
            style={{ backgroundColor: 'var(--product-accent)' }}
          >
            Ver a pergunta canônica respondida
          </button>
        </Panel>
      )}

      <ExplainabilityFooter />

      <p className="text-delta-lg text-neutral">
        Toda recomendação do copiloto termina numa decisão rastreável.{' '}
        <Link
          to="/decisoes/D-2026-0001"
          className="font-medium underline"
          style={{ color: 'var(--product-accent)' }}
        >
          Abrir a decisão D-2026-0001
        </Link>
        .
      </p>
    </div>
  )
}
