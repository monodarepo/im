# Auditoria de produto — PD4

Data-base: 30/07/2026 (HOJE da demo) · Build auditado: `d6045c8` (pós-PD2) ·
Evidências: `docs/auditoria/*.png` (1920×1080 e 1366×768, contra o build de produção)

Nota de método: o ESCOPO (`HYPERA_260730_ABS_01...md`) segue ausente do repositório —
verificado nesta sessão, como em todas as anteriores. Onde a auditoria cita o ESCOPO,
cita o que dele foi transcrito nos prompts das fases. Nenhuma linha de código de
produção foi alterada nesta sessão.

---

## 1. Sumário executivo

O produto está apresentável: 45 telas navegáveis, fio condutor percorrível sem beco,
zero erro de console, determinismo total e a fundação visual de instrumento aplicada.
O que resta não é construção — é afinação de credibilidade. Os três problemas de
maior impacto: **(1)** a 1366×768, a resolução do projetor, o badge de produto
sobrepõe o rótulo dos KPIs da Torre — a primeira tela da demo abre com um defeito
visível; **(2)** a contradição sistêmica de período — o filtro global diz "Últimos
90 dias" enquanto todos os KPIs comparam com "7 dias anteriores" e telas exibem
chips locais próprios ("Esta semana", "Mai") — é a primeira pergunta que um CFO faz
e não tem resposta na tela; **(3)** o toggle de densidade do header afeta apenas a
DataTable da página de estilo — as ~30 tabelas reais não o escutam, um controle
global que quase nada controla. Com um dia: corrigiria AUD-01/04/05/06/09 (todos P,
uma manhã), unificaria a narrativa de período nas cinco telas do fio (tarde), e
deixaria o resto priorizado por esta tabela.

---

## 2. Achados

Severidade: CRÍTICO · ALTO · MÉDIO · BAIXO — Esforço: P (<30 min) · M (1–3 h) · G (≥ meia sessão)

| ID | Lente | Tela/arquivo | Achado | Por que importa | Sev. | Esf. | Correção proposta |
|---|---|---|---|---|---|---|---|
| AUD-01 | 1,6 | Torre a 1366 · `torre-1366.png` · `IntegratedTower.tsx` (TowerKpiCard) | Badge de produto posicionado por absoluto sobrepõe o micro-rótulo do KPI ("MARKET SHARE (VALOR…", "PREÇO RELATIVO (IP…") | 1366×768 é a resolução de projeção; a primeira tela da demo abre com texto clipado | CRÍTICO | P | Reservar espaço no header do card (flex com `pr`), abandonar posicionamento absoluto |
| AUD-02 | 3,6 | Todas · `torre-1366.png`, `gtm-nba-1920.png`, `ag-otimizador-1920.png` | Confirma e amplia o achado (a): filtro global "Últimos 90 dias" contradiz "vs. 7 dias anteriores" dos KPIs **e** chips locais ("Esta semana" no NBA, "Período: Mai" no AG) — três indicadores de período simultâneos e divergentes | Primeira pergunta cética da sala; mina a confiança em todos os números seguintes | CRÍTICO | M | Decisão de produto: o filtro global vira "Referência: 30/07/2026"; comparadores declarados por tela; chips locais somem onde duplicam o global |
| AUD-03 | 2,5 | Header · todas | Confirma (k) e agrava: o botão "Compacta" alterna densidade que só a DataTable consome — e ela só existe em /estilo. Controle global sem efeito real | Diretor clica, nada muda — parece quebrado | ALTO | G | Ou migrar as tabelas principais para DataTable (correto), ou remover o toggle até lá (honesto) |
| AUD-04 | 5 | `DecisionDetail.tsx` · `decisao-detalhe-1920.png` | Botões de transição rotulados com o estado resultante ("Aprovada", "Rejeitada", "Proposta") em vez do verbo ("Aprovar", "Rejeitar", "Devolver a proposta") | Viola a regra de voz ativa do CLAUDE.md; "Aprovada" como botão é ambíguo | ALTO | P | Mapa de rótulos de ação por transição |
| AUD-05 | 3,5 | `DecisionDetail.tsx` · `decisao-detalhe-1920.png` | Token de sistema vazando na UI: "Estado atual: EM_APROVACAO" | O token existe para fronteira de sistema; o chip humano "Em aprovação" está 30px acima — a duplicata técnica lê como bug | ALTO | P | Usar `DECISION_STATE_LABEL`; token só em tooltip, se tanto |
| AUD-06 | 5 | `AllocationOptimizer.tsx` · `ag-otimizador-1920.png` | Coluna "Recomendação IA" pinta os valores com chips no laranja de identidade do AG — cor de produto aplicada a dado | Violação direta do CLAUDE.md ("identidade vive só no chrome"); único lugar do produto em que isso ocorre | ALTO | P | Chip neutro + `AiChip`; verificar padrão análogo nas demais tabelas do AG |
| AUD-07 | 5 | `gtm-nba-1920.png` · `NextBestAction.tsx` | Avatares circulares com iniciais em pastel nos cards de médico — sinal listado nominalmente na seção "Padrão visual" | É o sinal de protótipo nº 1 da lista que nós mesmos escrevemos | ALTO | M | Remover avatar; nome + especialidade tipográficos, ou `iconFor.doctor` ao lado do rótulo |
| AUD-08 | 1 | `hub-visao-geral-1920.png` | Confirma (d)+(o): gráfico de sell-out ocupa a área nobre com eixo Y 0–50 para série que vive em 30–40 (~60% de área vazia); Top oportunidades e Mix abaixo da dobra | O conteúdo de maior valor (oportunidades em R$) não é o que o diretor leva em 3 segundos | ALTO | M | Domain do eixo a partir dos dados (`niceStep` já existe); subir Top oportunidades para a coluna direita da primeira dobra |
| AUD-09 | 1,6 | `torre-1366.png` | Confirma (f) a 1366: cards de KPI com alturas desiguais quando o atestado quebra ("Neogrid + Distribuidores / há 3 dias") | Faixa de abertura da demo com dentes | ALTO | P | `min-h` na zona de atestado ou truncar fontes com `+N` e tooltip |
| AUD-10 | 3 | `ag-otimizador-1920.png` · Torre (funil) | ROI 4,3x e taxas do funil sem método acessível na tela; o mock documenta a divergência do ROI canônico (4,3x vs 1,26x reconstituível), a UI não | O CFO refaz a conta na sala e chega em outro número — sem nota de método, a tela perde | ALTO | M | Tooltip/nota "como este número é calculado" no KPI de ROI e no funil; expor "canônico do ESCOPO" onde a conta não fecha |
| AUD-11 | 2,3 | NBA, Otimizador, Cenários | Governança de filtro dupla: chips locais por tela + filtros globais no header, sem hierarquia declarada entre eles | Analista não sabe qual recorte manda; CFO não sabe o que o número obedece | ALTO | G | Definir contrato: global filtra, local só refina; chips locais herdam e exibem o global |
| AUD-12 | 5,6 | Sidebar · todas as telas | Confirma (j): quatro dispositivos de navegação empilhados (logo-link, switcher 2×2, "← Torre Integrada", módulos) + trilha no header; o back-link duplica a trilha; switcher consome ~120px | Altura útil de navegação desperdiçada; redundância lê como indecisão de design | ALTO | M | Switcher em linha única compacta; remover "← Torre" (a trilha e o logo já cobrem) |
| AUD-13 | 5 | Sidebar · `hub-visao-geral-1920.png` | Confirma (b): códigos internos "HUB 1.1"…"AG 4.10" na navegação | Vocabulário de projeto exposto ao cliente; nenhum software de produto numera menu | ALTO | P | Remover badge da sidebar; manter mapeamento em /estilo. Ajustar os testes que fixam badges |
| AUD-14 | 1,5 | `gtm-nba-1920.png` | "Mapa de prioridades" com ~60% do painel vazio abaixo do scatter; "Resumo do dia" idem na metade inferior | Área grande, informação baixa — na tela-vitrine do GTM | MÉDIO | M | Altura do painel ao conteúdo; puxar "Desempenho da equipe" para cima |
| AUD-15 | 5 | `chartTheme.ts` vs `SelloutChart.tsx` · `hub-visao-geral-1920.png` | Tema promete "ponto apenas no último valor" e não implementa; a série atual termina 3 dias antes do fim do eixo sem marcador nem anotação | A linha "morre no ar" — parece dado faltando, não período parcial | MÉDIO | P | Dot no último ponto + rótulo "parcial" quando a série não alcança o eixo |
| AUD-16 | 5 | `hub-visao-geral-1920.png` (mapa) | Confirma (c) parcialmente: geometria agora real, mas 22 de 27 UFs no nível 1 (quase monocromático), rótulos do NE ainda colidem (RN/PB/PE/AL), legenda discreta demais para projeção | O mapa é o elemento mais chamativo da tela e entrega pouca leitura | MÉDIO | M | Rótulo do NE só a partir de zoom >1 ou leader lines; legenda maior; declarar na tela "5 oportunidades priorizadas" para explicar o branco |
| AUD-17 | 5 | Torre briefing, `decisao-detalhe-1920.png` (atributos) | Numerais grandes fora do mono: "R$ 4,8M" dos atributos e do briefing em Geist Sans, enquanto KPIs usam Geist Mono | Inconsistência do papel `metric` definido no type.ts | MÉDIO | P | `font-mono` nos valores metric fora do KpiCard |
| AUD-18 | 5 | KpiCards (todos) | Confirma (h): "vs. 7 dias anteriores" repetido em cada card; a 1366 quebra em 2 linhas em todos | Ruído ×5; contribui para AUD-09 | MÉDIO | P | Comparador único no cabeçalho da faixa; delta sozinho no card |
| AUD-19 | 5 | 9 arquivos com `type="monotone"` | Confirma (e): suavização spline nas linhas | Curva bonita demais lê como marketing, não medição | MÉDIO | P | `type="linear"` (ou `natural` só em curva teórica, ex.: elasticidade) |
| AUD-20 | 2 | Header (pills de filtro) | Pills de filtro aplicadas (ex.: região SP após clique no mapa) não têm remoção — para limpar é preciso achar onde o filtro foi posto | Analista fica preso num recorte; fricção diária | MÉDIO | M | "×" na pill e "limpar todos" |
| AUD-21 | 1,5 | Torre `pd2-_.png` | KPIs da Torre são links (bom), mas nada na aparência diz isso; confirma (l) — e nos produtos os KpiCards não são clicáveis, inconsistente | Afordância invisível = feature invisível na demo | MÉDIO | M | Hover com borda no accent + chevron discreto; decidir: KPI clica em todo lugar ou em lugar nenhum |
| AUD-22 | 6 | `NextBestAction.tsx` headline | "Recomendações inteligentes para sua atuação" — adjetivo de marketing no registro que o CLAUDE.md define como "sem enfeite" | Única tela com headline vendedora; destoa das demais | MÉDIO | P | "Próximas ações do dia" ou o padrão das outras telas |
| AUD-23 | 4 | `copilotAnswer.ts:188` | Valor monetário montado na mão (`toFixed(1).replace('.', ',')`) em vez de `formatMoney` | Se a formatação pt-BR mudar, o copiloto diverge do resto silenciosamente | MÉDIO | P | `formatMoney(parcel.amountBrl)` |
| AUD-24 | 4 | `DecisionDetail.tsx`, `RootCause.tsx` | Badges de produto desenhados na mão (`PRODUCTS[x].accent` inline) em vez de `ProductBadge` | Duplicação do componente que existe exatamente para isso | MÉDIO | P | Substituir pelos componentes |
| AUD-25 | 4 | 11 arquivos com `aria-pressed` | Controle segmentado (chips de visão/filtro) reimplementado ~11 vezes com pequenas variações | Deriva visual inevitável; custo de manutenção | MÉDIO | M | Extrair primitiva `SegmentedControl` |
| AUD-26 | 4 | `DoctorSegmentation.tsx` (1016 l), `ag/FieldExecution.tsx` (846), `Inventory.tsx` (727), +11 acima de 500 | 14 telas acima de 500 linhas, 3 acima de 700 | Piloto herda arquivos-monólito; revisão e reuso ficam caros | MÉDIO | G | Extrair painéis nomeados por domínio (regra do CLAUDE.md) |
| AUD-27 | 6 | `ThreadRibbon` em 11 telas | Confirma (i) como dúvida de produto: a faixa do fio é chrome permanente — cliente navegando fora da demo a verá sempre | Ótimo corrimão na demo; ruído fora dela | MÉDIO | M | **Dúvida para o dono do produto** — ver seção 6 |
| AUD-28 | 4 | `dist/assets/index-*.js` (1,47 MB) | Bundle único sem code-splitting; aviso do Vite a cada build | Irrelevante offline; dói se virar piloto hospedado | BAIXO | M | `manualChunks` (recharts, mapa) quando houver hospedagem |
| AUD-29 | 5 | `hub-visao-geral-1920.png` (mapa) | Confirma (n) mitigado: tabs "Município/Território Fase 2" agora desabilitadas visualmente, mas seguem na linha de tabs ativa | Custo residual baixo; ainda atrai clique frustrado | BAIXO | P | Mover para nota de rodapé do painel ("drill municipal — Fase 2") |
| AUD-30 | 5 | KpiCard mono | "R$␣256,4M": o espaço em Geist Mono é célula cheia — lê como espaço duplo entre moeda e valor | Detalhe de olho treinado; confirma o espírito de (g) | BAIXO | P | Espaço fino (U+2009) no `formatMoney` ou prefixo fora do mono |
| AUD-31 | 2 | Todas | Nenhum atalho de teclado além de Ctrl K; ordenar/exportar/buscar ausentes nas tabelas de tela | Para demo não pesa; para o analista das 8h, sim | BAIXO | G | Vem junto da adoção da DataTable (AUD-03) |
| AUD-32 | 6 | `OpportunityMap` zoom | Zoom +/− apenas centrado, sem pan; a 150% o Sul some | Botão que promete mais do que entrega | BAIXO | M | Pan por arrasto ou zoom ancorado no cursor |

**Conhecidos resolvidos, confirmados como tal:** (m) largura contida a 1440px pelo PD1
(`pd2-_.png`, margem direita presente); (g) tracking dos numerais resolvido pela troca
para Geist Mono (AUD-30 é o resíduo); (b)–(o) demais confirmados acima com novo contexto.

---

## 3. Oportunidades de valor (fora do ESCOPO transcrito)

1. **Comparação de períodos lado a lado** (semana × semana anterior × mesmo período do ano) — o CFO pensa em variação, não em nível; hoje só há delta de 7 dias.
2. **Modo apresentação** — chrome mínimo, tipo 20% maior, avanço por teclado seguindo o fio: vende a plataforma na própria sala onde ela será vendida.
3. **"O que mudou desde a última vez"** — diff de KPIs e decisões na abertura da Torre; transforma a segunda visita no hábito diário.
4. **Anotação sobre número** (autor + data + texto, visível no hover) — o contexto humano que hoje morre no e-mail vira parte do instrumento.
5. **Exportação de painel para a reunião** (PDF/imagem com data-base e atestados no rodapé) — o número viaja com a procedência junto.
6. **Visões salvas por persona** ("minha mesa") — o analista abre o dia no recorte dele em um clique.
7. **Origem da decisão vinculada** (ata/e-mail/reunião no objeto da 8.1) — fecha a trilha de auditoria de ponta a ponta, argumento forte para compliance.
8. **Limiares pessoais de alerta** — o briefing deixa de ser genérico e vira "o meu risco"; aumenta retenção diária.

---

## 4. Dívida técnica (o que dói se virar piloto)

- **DataTable órfã** (AUD-03/31): a primitiva certa existe e nenhuma tela a usa; a migração das ~30 tabelas é a maior fatura aberta.
- **Monólitos de tela** (AUD-26): 14 arquivos >500 linhas.
- **SegmentedControl inexistente** (AUD-25): 11 reimplementações.
- **`validateMock.test.ts` com ~2.900 linhas**: um arquivo de teste para o produto inteiro; dividir por domínio antes que merge vire conflito permanente.
- **Pipeline do artifact fora do repositório**: o build de arquivo único (hash router + inline de fonte) vive em script de sessão; deveria ser `scripts/build-single-file.mjs` versionado.
- **Testes acoplados a texto de fonte** (ribbon, badges da sidebar): deliberado como guarda, mas AUD-13 exigirá revisão conjunta teste+UI.
- **Bundle único de 1,47 MB** (AUD-28).

## 5. O que está bom — não mexer

- **O atestado como sistema**: todo número relevante carrega fonte, defasagem e confiança; `combine()` devolve o elo mais fraco; fonte atrasada degrada sem bloquear. É o argumento anti-BI inteiro, funcionando.
- **O banner de bloqueio do NE no Otimizador** (`ag-otimizador-1920.png`): evidência, princípio, valor retido, link ao diagnóstico de origem e atestado num único bloco — o melhor momento do produto; usar como padrão-ouro.
- **A máquina de estados da Decisão**: `transition()` recusa estado inválido, a trilha é validada elo a elo, APRENDIDA fecha o ciclo, e o teste caminha a D-2026-0001 inteira.
- **A decomposição dos R$ 4,8M por identidade referencial** — parcela é o mesmo objeto, não redigitação; teste com `toBe`.
- **Determinismo absoluto** (HOJE fixo, seed fixa): a demo é idêntica em qualquer máquina, qualquer dia.
- **Separação identidade × semântica de cor** — com a única exceção do AUD-06.
- **258 testes com guardas de conteúdo** (emoji, gradiente, Lucide via mapa, vocabulário proibido, termos vetados): a regressão visual tem imunidade.
- **Fio condutor como dado** com faixa própria e teste de continuidade — zero beco sem saída, percorrido por clique.
- **Logo oficial verbatim** e mapa em geometria real embutida — sem dependência de rede.

## 6. Regras nossas que merecem discussão (não quebradas nesta auditoria)

- **A faixa do fio como chrome permanente (AUD-27)**: a regra implícita das fases foi "corrimão sempre visível". Para a sala de demo é ótimo; para o cliente explorando sozinho depois, é ruído de ensaio. Proposta: um modo demo alternável (atalho discreto), desligado por padrão fora da apresentação. Decisão do dono do produto.
- **Códigos de módulo na navegação (AUD-13)**: nasceram como rastreabilidade ESCOPO↔tela nas fases P2–P12 e os testes os fixam. Cumpriram o papel; na interface final jogam contra. Removê-los exige mexer nos testes que os pinam — mudança conjunta, não regra quebrada em silêncio.
