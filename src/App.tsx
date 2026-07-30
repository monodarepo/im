import { Navigate, Route, Routes } from 'react-router-dom'
import { ROUTES } from './routes/registry'
import { AppShell } from './shell/AppShell'
import { ScreenPlaceholder } from './shell/ScreenPlaceholder'

/**
 * Todas as telas saem do registro em `routes/registry.ts`: acrescentar uma rota
 * é acrescentar um dado, não editar este arquivo.
 */
export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {ROUTES.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={<ScreenPlaceholder route={route} />}
          />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
