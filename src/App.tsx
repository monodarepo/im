import type { ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ROUTES } from './routes/registry'
import { DecisionCentral } from './screens/DecisionCentral'
import { DecisionDetail } from './screens/DecisionDetail'
import { AgOverview } from './screens/ag/AgOverview'
import { Reports as AgReports } from './screens/ag/Reports'
import { AllocationOptimizer } from './screens/ag/AllocationOptimizer'
import { CampaignPlanning } from './screens/ag/CampaignPlanning'
import { ConversionRoi } from './screens/ag/ConversionRoi'
import { Inventory } from './screens/ag/Inventory'
import { Assortment } from './screens/gtm/Assortment'
import { CoverageSimulator } from './screens/gtm/CoverageSimulator'
import { FieldExecution } from './screens/gtm/FieldExecution'
import { GtmOverview } from './screens/gtm/GtmOverview'
import { GtmPlanning } from './screens/gtm/GtmPlanning'
import { GtmReports } from './screens/gtm/GtmReports'
import { NextBestAction } from './screens/gtm/NextBestAction'
import { QuotasAndTargets } from './screens/gtm/QuotasAndTargets'
import { Segmentation } from './screens/gtm/Segmentation'
import { SmartRouting } from './screens/gtm/SmartRouting'
import { TerritoryCoverage } from './screens/gtm/TerritoryCoverage'
import { CompetitivenessIndex } from './screens/rgm/CompetitivenessIndex'
import { ElasticitySimulator } from './screens/rgm/ElasticitySimulator'
import { GenericsWarRoom } from './screens/rgm/GenericsWarRoom'
import { GrossToNet } from './screens/rgm/GrossToNet'
import { PortfolioArchitecture } from './screens/rgm/PortfolioArchitecture'
import { PriceGovernance } from './screens/rgm/PriceGovernance'
import { PricingCockpit } from './screens/rgm/PricingCockpit'
import { PromotionMonitor } from './screens/rgm/PromotionMonitor'
import { Reports } from './screens/rgm/Reports'
import { ScenarioSimulator } from './screens/rgm/ScenarioSimulator'
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
  '/decisoes': <DecisionCentral />,
  '/rgm': <PricingCockpit />,
  '/rgm/competitividade': <CompetitivenessIndex />,
  '/rgm/elasticidade': <ElasticitySimulator />,
  '/rgm/cenarios': <ScenarioSimulator />,
  '/rgm/gross-to-net': <GrossToNet />,
  '/rgm/portfolio': <PortfolioArchitecture />,
  '/rgm/governanca': <PriceGovernance />,
  '/rgm/promocoes': <PromotionMonitor />,
  '/rgm/war-room': <GenericsWarRoom />,
  '/rgm/relatorios': <Reports />,
  '/ag': <AgOverview />,
  '/ag/campanhas': <CampaignPlanning />,
  '/ag/otimizador': <AllocationOptimizer />,
  '/ag/estoque': <Inventory />,
  '/ag/conversao-roi': <ConversionRoi />,
  '/ag/relatorios': <AgReports />,
  '/gtm': <GtmOverview />,
  '/gtm/planejamento': <GtmPlanning />,
  '/gtm/segmentacao': <Segmentation />,
  '/gtm/territorios': <TerritoryCoverage />,
  '/gtm/nba': <NextBestAction />,
  '/gtm/roteirizacao': <SmartRouting />,
  '/gtm/sortimento': <Assortment />,
  '/gtm/execucao': <FieldExecution />,
  '/gtm/metas': <QuotasAndTargets />,
  '/gtm/simulador-cobertura': <CoverageSimulator />,
  '/gtm/relatorios': <GtmReports />,
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
