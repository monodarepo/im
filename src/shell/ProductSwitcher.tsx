import { NavLink } from 'react-router-dom'
import { PRODUCTS, PRODUCT_ORDER } from '../design/tokens'

/**
 * Troca de produto no topo da sidebar. Quatro cartões, cada um na cor da sua
 * identidade; o ativo ganha preenchimento sólido, os demais ficam contornados.
 */
export function ProductSwitcher() {
  return (
    <nav aria-label="Produtos" className="grid grid-cols-2 gap-2">
      {PRODUCT_ORDER.map((id) => {
        const product = PRODUCTS[id]
        return (
          <NavLink
            key={id}
            to={`/${id}`}
            className="rounded-control border px-2.5 py-2 transition-colors"
            style={({ isActive }) =>
              isActive
                ? { backgroundColor: product.accent, borderColor: product.accent, color: '#FFFFFF' }
                : { borderColor: '#334155', color: '#CBD5E1' }
            }
          >
            {({ isActive }) => (
              <>
                <span className="block text-delta-lg font-semibold">{product.shortName}</span>
                <span
                  className="mt-0.5 block h-1 w-6 rounded-full"
                  style={{ backgroundColor: isActive ? '#FFFFFF' : product.accent }}
                  aria-hidden
                />
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
