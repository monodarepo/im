# Roteiro de demonstração — Plataforma de Inteligência de Mercado e Crescimento

**Duração alvo: 20 a 24 minutos.** O roteiro segue o fio condutor Losartana
(seção 8.3): uma perda de participação detectada, diagnosticada, simulada,
planejada, executada, medida e aprendida — atravessando os quatro produtos.

**Corrimão em tela:** toda tela do fluxo exibe a faixa **"Fio Losartana —
etapa N de 9"** com o botão da próxima etapa. Se você se perder, clique na
faixa. Nunca é preciso digitar rota.

**Preparação:** `npm run build && npx vite preview` e abrir `http://localhost:4173/`.
A demo é determinística — os números são idênticos em qualquer máquina, em
qualquer dia. "Hoje" é sempre 30/07/2026.

---

## Bloco 0 — Torre Integrada (2 min) · rota `/`

**O que dizer:** "Isto é o que o CEO abre de manhã. Quatro produtos, uma
plataforma — e a pergunta que ela responde é: onde está o dinheiro e quem está
cuidando dele."

**O que clicar e apontar:**
1. Os **10 indicadores** do topo. Apontar que cada cartão tem o selo do produto
   que o apurou — a Torre não tem número próprio, ela devolve o clique para a
   tela de origem.
2. Abrir a **linha secundária** (botão "▼ Abrir a linha secundária") — mais 8
   indicadores de apoio.
3. No **funil de impacto financeiro**, trocar a visão para "Margem de
   contribuição". Apontar a última barra: **"de cada real identificado, 34%
   chega validado por Finanças"** — a plataforma é honesta sobre a diferença
   entre promessa e resultado auditado.
4. No **briefing do dia**, apontar o primeiro alerta: Losartana SP,
   **R$ 4,8M** em risco.

**Transição:** "Esse alerta de R$ 4,8M é o nosso fio condutor. Vamos segui-lo
do início ao fim — começando onde ele nasceu, no HUB."

---

## Bloco 1 — Detecção: HUB Visão Geral (2 min) · rota `/hub`

**O que dizer:** "O HUB é o radar. Sell-out de R$ 256,4M, participação 18,7%,
distribuição, ruptura, preço relativo — os cinco sinais vitais do mercado, cada
um com a fonte e o atraso escritos embaixo."

**O que clicar e apontar:**
1. Passar o mouse num KPI e mostrar o **atestado** (fonte · método · confiança).
2. O mapa de oportunidades: **SP em verde escuro, R$ 4,8M**.
3. A fila de oportunidades: a #1 é "Recuperar distribuição de Losartana em SP".

**Número a apontar:** R$ 4,8M — o mesmo do briefing da Torre. Mesmo número,
mesma origem, telas diferentes.

**Transição:** "Detectar é fácil. A pergunta cara é *por quê*. Clique na faixa:
Diagnóstico."

---

## Bloco 2 — Diagnóstico: Causa-Raiz (2 min) · rota `/hub/causa-raiz`

**O que dizer:** "A queda de 3,2 pontos não tem uma causa — tem sete, com
pesos. Ruptura no canal independente, preço acima do corredor e cobertura
comercial caindo juntas, no mesmo recorte."

**O que clicar e apontar:**
1. A cascata de fatores com a contribuição de cada um.
2. O encaminhamento: cada fator vai para o produto que o resolve — e o link
   para a decisão D-2026-0001.

**Número a apontar:** ruptura de **11,8%** contra limite de 10% no canal
independente.

**Transição:** "Um dos fatores é preço. Antes de mexer em preço, simula-se.
Faixa: Simulação."

---

## Bloco 3 — Simulação: RGM Cenários (3 min) · rota `/rgm/cenarios`

**O que dizer:** "Este é o simulador com elasticidade real. Três cenários
calibrados; o recomendado recupera volume sem queimar margem."

**O que clicar e apontar:**
1. **Mexer no slider de preço** — os números respondem na hora.
2. **Voltar ao valor original** — os números canônicos voltam exatamente.
   (Este é o momento de credibilidade: a simulação não é um vídeo.)
3. O painel do cenário recomendado: **+360 mil unidades** de sell-out
   incremental.
4. O botão "Enviar para aprovação" — apontar que ele movimenta a decisão
   D-2026-0001, com a parcela de R$ 1,9M anexada. Nada de recomendação solta.

**Número a apontar:** +360 mil unidades (não +880 mil — o valor do ESCOPO
corrige a imagem de referência).

**Transição:** "Preço ajustado no papel. Agora: onde executar primeiro? Faixa:
Priorização."

---

## Bloco 4 — Priorização e Plano: GTM (3 min) · rotas `/gtm/segmentacao` → `/gtm/nba`

**O que dizer:** "A frase mais forte da entrevista de GTM: *o vendedor recebe
informações, mas não recebe decisões.* Estas duas telas são a resposta."

**O que clicar e apontar:**
1. Na Segmentação: a matriz de clientes — quem tem potencial e não está
   coberto.
2. Faixa: **Plano** → NBA. O cartão do Dr. Ricardo Alencar: a visita de hoje
   com a ação recomendada, o porquê explicado e o link da decisão.
3. Apontar **"Amostras a entregar: 34"** — e clicar. Cai no Otimizador do AG.

**Número a apontar:** 34 amostras — o número atravessa a fronteira de produto
clicável.

**Transição:** (o clique nas 34 amostras já é a transição) "Repare que
mudamos de produto sem mudar de plataforma."

---

## Bloco 5 — Reforço: AG Otimizador (3 min) · rota `/ag/otimizador`

**O que dizer:** "Aqui se governa uma verba de cerca de R$ 700 milhões por
ano. A pergunta desta tela não é quantas amostras existem — é para quem vão.
E, principalmente, para quem **não** vão."

**O que clicar e apontar:**
1. Os 6 KPIs: 125 mil em estoque, 98.750 recomendadas, ROI estimado 4,3x.
2. **O momento mais importante:** o banner de bloqueio. **"3 territórios do
   Nordeste bloqueados — ruptura acima de 10% detectada pelo HUB."** Clicar no
   link e mostrar que ele volta ao diagnóstico do HUB.
3. Voltar e dizer a frase do princípio: **"Não estimular demanda onde o
   produto não está disponível."** Um produto decidiu com o dado do outro —
   isso é a prova de plataforma, não de quatro sistemas.

**Número a apontar:** 6.400 amostras retidas pelo bloqueio.

**Transição:** "Plano fechado. Agora ele vai para a rua — e volta como
registro. Faixa: Registro."

---

## Bloco 6 — Registro: Execução em campo (2 min) · rota `/gtm/execucao` (+ `/ag/campo`)

**O que dizer:** "Cerca de 5 mil pessoas em campo hoje são invisíveis ao
software. O frame ao lado é o app do representante: a visita, a entrega, o
aceite — e o motivo quando não aconteceu."

**O que clicar e apontar:**
1. O frame mobile somente-leitura.
2. Na fila de entregas (AG Execução em Campo, link na faixa): o caso **"sem
   motivo registrado"** contado à parte — o único caso em que a plataforma não
   sabe onde a amostra parou, e por isso o número que precisa chegar a zero.

**Transição:** "Executou, registrou. Quem confere se funcionou é o mesmo HUB
que detectou o problema. Faixa: Mensuração."

---

## Bloco 7 — Mensuração: Produto 360° e Torre (2 min) · rota `/hub/produto/losartana-50-30`

**O que dizer:** "Mesma régua, mesmo atestado: a recuperação é medida pelo
mesmo indicador que detectou a queda. Sem régua nova não há como maquiar
resultado."

**O que clicar e apontar:**
1. A série de sell-out e participação do SKU.
2. O funil da Torre (link "Torre Integrada" na faixa): Identificado → Aprovado
   → Em execução → Realizado → **Validado por Finanças**.

**Transição:** "Falta o passo que quase nenhum projeto dá: aprender. Faixa:
Aprendizado."

---

## Bloco 8 — Aprendizado: a Decisão fecha o ciclo (3 min) · rota `/decisoes/D-2026-0001`

**O que dizer:** "Esta é a peça central da plataforma: o objeto Decisão. Não é
um dashboard — é um registro auditável de quem decidiu o quê, com que
evidência, e o que aconteceu depois."

**O que clicar e apontar:**
1. A **decomposição do impacto**: R$ 4,8M = GTM 2,1 + RGM 1,9 + AG 0,8 — e a
   frase do rodapé: "a soma das parcelas fecha exatamente". Clicar numa parcela
   e voltar: cada valor tem caminho de volta à tela que o apurou.
2. As **evidências com atestado** e a **trilha de auditoria** — cada elo
   continua o anterior; a máquina de estados não grava salto.
3. **Mover a decisão ao vivo:** Aprovada → Em execução → Concluída →
   **Aprendida**. Apontar o estado final: "APRENDIDA. O resultado medido virou
   regra — a próxima decisão parecida já nasce calibrada por esta."
4. O badge **"Execução assistida"** e o botão **"Write-back ao ERP — Fase 3"**
   desabilitado: a plataforma não finge o que ainda não faz.

**Transição:** "Isso foi o fio de uma molécula. Para fechar: o que mais está
na fila — e como se pergunta à plataforma."

---

## Bloco 9 — Copiloto e fechamento (2 min) · rota `/copiloto`

**O que dizer:** "A pergunta que qualquer executivo faria: *quais são as cinco
maiores oportunidades para recuperar market share de Losartana em São Paulo
nas próximas quatro semanas?*"

**O que clicar e apontar:**
1. Clicar no **chip da pergunta canônica**: dez blocos, cada um com o selo do
   produto e o link da tela que o sustenta.
2. O **rodapé de explicabilidade**: quais dados, qual regra, qual confiança,
   qual defasagem — sempre visível. "Uma resposta que não mostra de onde veio
   é indistinguível de uma inventada."
3. Fechar na Central de Notificações (sino do header): 15 alertas, todos com
   valor, evidência, causa, ação e dono.

**Frase final:** "Quatro produtos, um objeto Decisão, uma régua. O que vocês
viram funcionando é a Fase 2 do desenho — e cada botão desabilitado que
apareceu é a Fase 3 dita com honestidade."

---

## Perguntas prováveis — e onde está a resposta na tela

**"Isso não é só um BI?"**
Abrir `/decisoes/D-2026-0001`. BI mostra número; isto registra decisão — o
objeto da seção 8.1: evidência com atestado, causa, recomendação, dono, prazo,
alçada, trilha de auditoria e máquina de estados que recusa salto. O kanban da
Central mostra o fluxo inteiro até APRENDIDA. Nenhum BI tem estado `APRENDIDA`.

**"De onde vem esse número?"**
Qualquer número relevante: passar o mouse (tooltip com fonte · método ·
confiança) ou olhar o selo de atestado ao pé do cartão. A regra `combine()`
está viva: número composto herda sempre o elo mais fraco. Demonstrar em
qualquer KPI da Torre.

**"E se o dado atrasar?"**
Abrir `/hub/qualidade`. Fonte atrasada → banner âmbar, confiança rebaixada,
tela segue operável. Estado degradado nunca bloqueia — o princípio está
escrito no banner. O alerta "Fonte de distribuidores com atraso" na Central de
Notificações mostra o mesmo caso pela ótica de quem opera.

**"Como vocês medem o retorno?"**
Dois lugares. O funil da Torre (`/`): Identificado → Validado por Finanças,
com a taxa de sobrevivência dita em voz alta — só o validado é auditável. E
`/ag/conversao-roi`: teste × controle, +8,7 prescrições por médico de efeito
incremental — a diferença entre o que a amostra causou e o que teria
acontecido de qualquer jeito.

**"Quanto disso é real hoje?"**
A honestidade está na própria tela: tudo que é Fase 3 aparece como botão
desabilitado com rótulo — "Write-back ao ERP — Fase 3", drill de município
"Fase 2", escrita livre do copiloto "Fase 2". A curva de maturidade da seção
9.2 é o mapa: o que vocês viram operando é o desenho da Fase 2; a Fase 3
automatiza a execução dentro de alçada. Nada na demo finge estar numa fase que
não está.

---

## Se algo der errado

- **Perdeu-se na navegação:** clique em qualquer item da faixa "Fio Losartana".
- **Mexeu demais no simulador:** volte os controles — os valores canônicos
  reaparecem exatamente (é derivado, não digitado).
- **Fechou o navegador:** o estado é de sessão; reabrir volta ao ponto zero
  determinístico. O fio inteiro leva menos de dez minutos em ritmo calmo.
