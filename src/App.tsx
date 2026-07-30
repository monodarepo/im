import type { ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ROUTES } from './routes/registry'
import { DecisionDetail } from './screens/DecisionDetail'
import { DataQuality } from './screens/hub/DataQuality'
import { MarketOverview } from './screens/hub/MarketOverview'
import { Product360 } from './screens/hub/Product360'
import { RootCause } from './screens/hub/RootCause'
import { AppShell } from './shell/AppShell'
import { ScreenPlaceholder } from './shell/ScreenPlaceholder'

/**
 * Telas construídas. O que não está aqui cai no placeholder, que lista as
 * features previstas em vez de dizer "em construção".
 */
const SCREENS: Record<string, ReactElement> = {
  '/hub': <MarketOverview />,
  '/hub/produto/:skuId': <Product360 />,
  '/hub/causa-raiz': <RootCause />,
  '/hub/qualidade': <DataQuality />,
}

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {ROUTES.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={SCREENS[route.path] ?? <ScreenPlaceholder route={route} />}
          />
        ))}
        <Route path="/decisoes/:decisionId" element={<DecisionDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
