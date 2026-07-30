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

## Padrão visual — o software não pode parecer gerado por IA

Referência de registro: instrumento corporativo denso e calmo (Bloomberg, Palantir Foundry,
Stripe, SAP Fiori). Não é landing page, não é dashboard de portfólio.

### Proibido
- Emoji como ícone. Ícone de brilho/sparkle para marcar IA. Mais de uma biblioteca de ícones.
- Gradiente em card, header, botão ou fundo. Sombra pesada. `rounded-2xl` ou maior.
- Card para conteúdo que é tabela. Grade uniforme onde tudo tem o mesmo peso visual.
- Número sem `tabular-nums`. Número redondo inventado (1.000, 50%, 4,0x).
- Texto centralizado fora de estado vazio e modal.
- Recharts com estilo de fábrica: grade completa, legenda em caixa, ponto em cada vértice.
- Palavras: "Insights", "Analytics", "Overview", "Powered by AI", "Dashboard" como título.
- Exclamação em mensagem de sistema.

### Obrigatório
- Ícones: Lucide, exclusivamente. Stroke 1.5. Tamanhos 14 / 16 / 20 apenas. Ícone sempre
  ao lado de rótulo em texto, nunca sozinho como único significante de uma ação.
- Numerais: `font-variant-numeric: tabular-nums` em todo número. Alinhamento à direita em
  coluna numérica. Milhar com ponto, decimal com vírgula, menos tipográfico (−).
- Separação por borda hairline (1px) antes de sombra. Elevação só em overlay real
  (dropdown, drawer, modal).
- Raio: 6px em controle, 8px em painel. Nada acima disso.
- Micro-rótulo: 11px, caixa alta, tracking 0.06em, cor neutra — sobre todo KPI e toda coluna.
- Todo componente que carrega dado implementa quatro estados: carregando (skeleton),
  vazio (com ação), erro (com causa e saída), degradado (banner âmbar, tela operável).
- `:focus-visible` com anel de 2px visível em todo elemento interativo.
- Transições de 120–160ms, `ease-out`. `prefers-reduced-motion` respeitado.
- Texto de interface: voz ativa, frase em caixa baixa, sem enfeite. O botão diz o que
  acontece ("Enviar para aprovação", não "Confirmar"). O nome da ação não muda ao longo do fluxo.
- Marcador de recomendação de IA: chip pequeno com o rótulo "IA" em cor neutra
  (componente `AiChip`). Nunca ícone de brilho.
- Tipografia: Geist Sans (interface) + Geist Mono (numerais e códigos), carregadas
  localmente via @fontsource. A escala nomeada vive em `src/design/type.ts`.
