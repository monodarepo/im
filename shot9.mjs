import { chromium } from 'playwright'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const p = await b.newPage({ viewport: { width: 1600, height: 1200 } })
const S='/tmp/claude-0/-home-user-im/945a68f7-618a-55b0-98f0-a3f8ad222db3/scratchpad'
await p.goto('http://localhost:4173/ag/otimizador',{waitUntil:'networkidle'}); await p.waitForTimeout(500)
console.log('custo:', (await p.locator('article:has-text("Custo estimado") p').first().textContent())?.trim())
await p.screenshot({path:`${S}/p9-otimizador.png`, fullPage:true})
await b.close()
