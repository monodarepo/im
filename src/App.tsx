import { PRODUCTS, PRODUCT_ORDER } from './design/tokens'
import { formatDate, HOJE } from './domain/today'

/**
 * Casca da plataforma. As telas de cada produto são governadas pelo ESCOPO
 * (seções 10 e 12.3) e entram quando o documento estiver no repositório.
 */
export function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-baseline justify-between px-6 py-5">
          <h1 className="text-lg font-semibold tracking-tight">
            Plataforma de Inteligência de Mercado e Crescimento
          </h1>
          <span className="text-sm text-neutral">{formatDate(HOJE)}</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-lg border border-attention/40 bg-attention/5 p-5">
          <p className="text-sm font-medium text-slate-900">Documento de escopo pendente</p>
          <p className="mt-1 text-sm text-slate-600">
            As telas dependem das seções 3, 8, 10, 11 e 12.3 do ESCOPO consolidado. Nenhum número é
            exibido até que o documento esteja disponível.
          </p>
        </div>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {PRODUCT_ORDER.map((id) => {
            const product = PRODUCTS[id]
            return (
              <li
                key={product.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
                style={{ borderLeft: `3px solid ${product.accent}` }}
              >
                <span className="text-sm font-medium">{product.name}</span>
              </li>
            )
          })}
        </ul>
      </main>
    </div>
  )
}
