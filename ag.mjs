import { chromium } from 'playwright'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const p = await b.newPage({ viewport: { width: 1600, height: 1200 } })
const probs=[]
p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')probs.push(`[${m.type()}] ${m.text()}`)})
p.on('pageerror',e=>probs.push(`[pageerror] ${e.message}`))
const B='http://localhost:4173', S='/tmp/claude-0/-home-user-im/945a68f7-618a-55b0-98f0-a3f8ad222db3/scratchpad'
for (const r of ['/ag','/ag/otimizador','/ag/conversao-roi']) {
  await p.goto(B+r,{waitUntil:'networkidle'}); await p.waitForTimeout(350)
  console.log(`${r.padEnd(20)} h1="${(await p.locator('h1').first().textContent())?.trim()}"`)
}
await p.goto(B+'/ag/otimizador',{waitUntil:'networkidle'}); await p.waitForTimeout(500)
console.log('bloqueio:', (await p.locator('[role=status]').innerText()).split('\n').slice(0,3).join(' | '))
await p.screenshot({path:`${S}/p9-otimizador.png`, fullPage:true})
// link do bloqueio -> HUB
await p.getByRole('link',{name:/Ver o diagnóstico no HUB/}).click()
await p.waitForURL('**/hub'); await p.waitForTimeout(300)
console.log('link do bloqueio ->', p.url(), '| h1:', (await p.locator('h1').first().textContent())?.trim())
// link do NBA -> otimizador
await p.goto(B+'/gtm/nba',{waitUntil:'networkidle'})
await p.getByRole('link',{name:/34/}).click()
await p.waitForURL('**/ag/otimizador'); await p.waitForTimeout(300)
console.log('link do NBA     ->', p.url(), '| h1:', (await p.locator('h1').first().textContent())?.trim())
// enviar para aprovação
await p.getByRole('button',{name:'Enviar para aprovação'}).click(); await p.waitForTimeout(300)
console.log('após enviar:', (await p.locator('section:has-text("Ações")').innerText()).split('\n').filter(l=>l.includes('D-2026')||l.includes('aprova')).join(' / '))
// campanha Skincare
await p.selectOption('select','hydraserum-fps'); await p.waitForTimeout(300)
console.log('Skincare:', (await p.locator('section').first().innerText()).split('\n').slice(0,2).join(' | '))
await p.screenshot({path:`${S}/p9-skincare.png`})
for (const [r,n] of [['/ag','p9-visaogeral'],['/ag/conversao-roi','p9-conversao']]) {
  await p.goto(B+r,{waitUntil:'networkidle'}); await p.waitForTimeout(500)
  await p.screenshot({path:`${S}/${n}.png`, fullPage:true})
}
console.log(probs.length?`\nPROBLEMAS:\n${probs.slice(0,6).join('\n')}`:'\nSEM erros/avisos de console')
await b.close()
