import { Panel } from '../components/Panel'
import type { RouteEntry } from '../routes/registry'

/**
 * Placeholder de tela ainda não construída.
 *
 * Lista o que a tela vai ter, em vez de dizer "em construção": serve de
 * checklist de progresso durante a demonstração e não promete nada que o
 * ESCOPO não tenha previsto.
 */
export function ScreenPlaceholder({ route }: { route: RouteEntry }) {
  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">{route.title}</h1>
        <span
          className="rounded-control px-2 py-0.5 text-delta font-semibold text-white"
          style={{ backgroundColor: 'var(--product-accent)' }}
        >
          {route.badge}
        </span>
      </div>

      <Panel
        title="Features previstas"
        description={
          route.features.length > 0
            ? 'Conforme o ESCOPO consolidado.'
            : 'Aguardando o detalhamento do ESCOPO para esta tela.'
        }
      >
        {route.features.length > 0 ? (
          <ul className="space-y-2">
            {route.features.map((feature) => (
              <li key={feature} className="flex gap-2 text-delta-lg text-slate-700">
                <span className="text-neutral" aria-hidden>
                  —
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-delta-lg text-neutral">
            A lista de features desta tela vem da seção 12.3 do ESCOPO.
          </p>
        )}
      </Panel>
    </div>
  )
}
