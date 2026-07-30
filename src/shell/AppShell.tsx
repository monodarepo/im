import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ProductTheme } from '../design/ProductTheme'
import { resolveTheme } from '../routes/registry'
import { useCopilot } from '../state/copilotStore'
import { CopilotDrawer } from './CopilotDrawer'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

function useCopilotShortcut() {
  const toggle = useCopilot((state) => state.toggle)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k') return
      if (!event.metaKey && !event.ctrlKey) return
      event.preventDefault()
      toggle()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggle])
}

/**
 * Casca da plataforma. A identidade de cor vem da rota e desce por custom
 * property, então sidebar, header e botão primário trocam juntos sem props.
 */
export function AppShell() {
  const { pathname } = useLocation()
  useCopilotShortcut()

  return (
    <ProductTheme theme={resolveTheme(pathname)} className="flex min-h-screen bg-surface-app">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>
      <CopilotDrawer />
    </ProductTheme>
  )
}
