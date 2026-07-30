import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { App } from './App'
import './index.css'

/**
 * `VITE_HASH_ROUTER=1` troca para roteamento por hash no build. Serve para
 * hospedar a demo como arquivo estático (sem servidor que reescreva rotas):
 * as 45 rotas viram `#/rota` e funcionam em qualquer hospedagem. O padrão
 * continua BrowserRouter, com URLs limpas.
 */
const Router = import.meta.env.VITE_HASH_ROUTER === '1' ? HashRouter : BrowserRouter

const container = document.getElementById('root')
if (!container) throw new Error('Elemento raiz não encontrado')

createRoot(container).render(
  <StrictMode>
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </Router>
  </StrictMode>,
)
