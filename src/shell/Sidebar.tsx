import { Link, NavLink, useLocation } from 'react-router-dom'
import { HyperaLogo } from '../components/HyperaLogo'
import { ICON_SIZE, ICON_STROKE, iconUi } from '../design/icons'
import { PRODUCTS } from '../design/tokens'
import { CURRENT_PERSONA } from '../domain/persona'
import {
  institutionalRoutes,
  resolveTheme,
  routeCoverage,
  routesOfProduct,
} from '../routes/registry'
import { ProductSwitcher } from './ProductSwitcher'

function ModuleLink({ to, title, badge }: { to: string; title: string; badge: string }) {
  return (
    <NavLink
      to={to}
      className="flex items-center justify-between gap-2 rounded-control px-3 py-2 text-delta-lg transition-colors"
      style={({ isActive }) =>
        isActive ? { backgroundColor: 'var(--product-accent)', color: '#FFFFFF' } : { color: '#CBD5E1' }
      }
    >
      <span>{title}</span>
      <span className="shrink-0 text-delta opacity-70">{badge}</span>
    </NavLink>
  )
}

const BackIcon = iconUi.arrowLeft

export function Sidebar() {
  const { pathname } = useLocation()
  const theme = resolveTheme(pathname)
  const product = theme === 'institutional' ? null : PRODUCTS[theme]
  const modules = product ? routesOfProduct(product.id) : institutionalRoutes()
  const coverage = routeCoverage()

  return (
    <aside className="flex w-sidebar shrink-0 flex-col bg-slate-900 text-slate-100">
      <div className="px-4 pb-4 pt-5">
        <Link to="/" title="Voltar à Torre Integrada" className="inline-block">
          <HyperaLogo on="dark" />
        </Link>
        <p className="mt-2 text-delta-lg text-slate-400">
          {product ? product.name : 'Plataforma de Inteligência de Mercado e Crescimento'}
        </p>
      </div>

      <div className="px-4 pb-5">
        <ProductSwitcher />
      </div>

      <nav aria-label="Módulos" className="flex-1 space-y-0.5 overflow-y-auto px-2">
        {product ? (
          <NavLink
            to="/"
            className="mb-2 flex items-center gap-2 rounded-control border-b border-slate-800 px-3 pb-2.5 pt-2 text-body font-medium text-slate-400 transition-colors hover:text-white"
          >
            <BackIcon size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} aria-hidden />
            Torre Integrada
          </NavLink>
        ) : null}
        {modules.map((route) => (
          <ModuleLink
            key={route.path}
            to={route.navPath ?? route.path}
            title={route.title}
            badge={route.badge}
          />
        ))}
      </nav>

      <div className="border-t border-slate-800 px-4 py-3 text-delta text-slate-400">
        {coverage.mapped} de {coverage.expected} telas mapeadas
      </div>

      <footer className="flex items-center gap-3 border-t border-slate-800 px-4 py-4">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-delta-lg font-semibold text-white"
          style={{ backgroundColor: 'var(--product-accent)' }}
          aria-hidden
        >
          {CURRENT_PERSONA.initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-delta-lg font-medium text-white">
            {CURRENT_PERSONA.name}
          </span>
          <span className="block truncate text-delta text-slate-400">{CURRENT_PERSONA.area}</span>
        </span>
      </footer>
    </aside>
  )
}
