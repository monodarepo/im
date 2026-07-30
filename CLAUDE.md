# Hypera Market & Growth Intelligence Platform — mockup de demonstração

Protótipo de alta fidelidade para apresentação executiva à Hypera (farmacêutica, Brasil).
Quatro produtos em uma plataforma: HUB Market Intelligence, GTM, RGM Genéricos, Amostra Grátis.

## Fonte de verdade
`HYPERA_260730_ABS_01_Escopo_Consolidado_Plataforma_IM_HUB_GTM_RGM_AG.md` na raiz.
Seções que governam o código: **3** (design system) · **8** (objeto Decisão e atestado) ·
**10** (números canônicos) · **11** (regras de engenharia) · **12.3** (rotas).
Em qualquer dúvida sobre conteúdo de tela, ler o ESCOPO. Não improvisar.

## Proibições invioláveis
1. **Não inventar números.** Todo valor exibido vem da seção 10 do ESCOPO. Se um número
   necessário não estiver lá, PARAR e perguntar — não estimar, não interpolar.
2. **Não exibir nomes de produtos técnicos Google** em nenhuma tela: proibido BigQuery,
   Vertex, Gemini, Looker, Dataflow, Dataplex, Pub/Sub, Apigee, AppSheet, Maps Platform.
   Permitido apenas "Google Cloud" como marca e "IA" como capacidade.
3. **Não exibir valores de investimento do programa** (R$ 39,4M, R$ 43,4M, valores por produto).
4. **Não citar Close-Up** como fonte de dados em nenhum lugar. Fontes válidas: Scanntech,
   IQVIA, Neogrid, SAP, CRM/SFA, distribuidores, grandes redes.
5. **Não usar nomes reais de stakeholders Hypera** na interface. Personas fictícias apenas
   (Carla Mendes / João Pedro / Mariana Santos / Fernanda Lima).
6. **Não usar `localStorage`, `sessionStorage` nem `Date.now()`/`new Date()`** na camada de
   dados ou domínio.

## Regras de engenharia
- **Código e identificadores em inglês. Todo texto visível em pt-BR.** Sem exceção.
- **`HOJE` é constante única** em `src/domain/today.ts`. Toda data relativa deriva dela.
- **Cor significa dado.** Verde `#16A34A` = positivo, vermelho `#DC2626` = negativo,
  âmbar `#F59E0B` = atenção, neutro `#64748B`. A cor de identidade do produto
  (HUB `#1E4FD8` · GTM `#0F766E` · RGM `#7C3AED` · AG `#EA7317`) vive **só no chrome**:
  sidebar, header, botão primário, badge. Nunca em série de dado.
- **Todo número relevante carrega atestado** (`Attestation`: source, asOf, lagDays,
  confidence, quality, method). `combine()` retorna sempre o elo mais fraco.
- **Estado degradado nunca bloqueia.** Fonte atrasada → banner âmbar + confiança reduzida,
  tela segue operável.
- **Toda recomendação cria ou referencia um objeto `Decision`** (schema na seção 8.1 do ESCOPO).
  Nada de recomendação solta.
- **Botão de funcionalidade futura:** renderizar `disabled` com rótulo explicando a fase
  (ex.: "Write-back ao ERP — Fase 3"). Nunca esconder, nunca deixar clicável sem efeito.
- **Mock determinístico:** seed fixa. A demo é idêntica em qualquer máquina.

## Stack
React 18 + Vite + TypeScript (strict) · React Router · Tailwind · Recharts ·
Zustand para estado leve · mock em TS puro sob `src/mock/`.
Sem backend, sem fetch externo, sem CDN em runtime.

## Comandos

```bash
npm run dev        # servidor de desenvolvimento
npm run validate   # tsc --noEmit && vitest run src/mock/validateMock.test.ts
npm run build      # build de produção
```

## Gate de fim de sessão
`npm run validate` verde **e** `npm run build` sem erro. Só então commitar.
Se `validate` falhar, corrigir antes de reportar conclusão.

## Estilo de trabalho
Autonomia alta: decidir e executar, sem pedir aprovação a cada passo. Reportar no fim
o que foi feito, o que foi decidido por conta própria e o que ficou pendente.
Não escrever comentários explicando o óbvio. Componentes pequenos e nomeados pelo domínio
(`OpportunityQueue`, não `List2`).
