import type { ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ROUTES } from './routes/registry'
import { DecisionDetail } from './screens/DecisionDetail'
import { CompetitiveIntel } from './screens/hub/CompetitiveIntel'
import { Customer360 } from './screens/hub/Customer360'
import { DataQuality } from './screens/hub/DataQuality'
import { Doctor360 } from './screens/hub/Doctor360'
import { MarketOverview } from './screens/hub/MarketOverview'
import { MarketPulse } from './screens/hub/MarketPulse'
import { OpportunityRadar } from './screens/hub/OpportunityRadar'
import { Product360 } from './screens/hub/Product360'
import { RootCause } from './screens/hub/RootCause'
import { Territory360 } from './screens/hub/Territory360'
import { AppShell } from './shell/AppShell'
import { ScreenPlaceholder } from './shell/ScreenPlaceholder'

/**
 * Telas construídas. O que não está aqui cai no placeholder, que lista as
 * features previstas em vez de dizer "em construção".
 */
const SCREENS: Record<string, ReactElement> = {
  '/hub': <MarketOverview />,
  '/hub/pulse': <MarketPulse />,
  '/hub/produto/:skuId': <Product360 />,
  '/hub/cliente': <Customer360 />,
  '/hub/territorio': <Territory360 />,
  '/hub/medico': <Doctor360 />,
  '/hub/radar': <OpportunityRadar />,
  '/hub/competitiva': <CompetitiveIntel />,
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
