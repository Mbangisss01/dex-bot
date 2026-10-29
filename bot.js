const { Telegraf } = require('telegraf');
const axios = require('axios');
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = 7704697744;
const CHANNEL_ID = '@dextrading01';
const bot = new Telegraf(BOT_TOKEN);
let tracked = {};
console.log('🔥 BOT ON!');
function ageH(t){return t?(Date.now()-new Date(t).getTime())/3600000:999);}
async function getPair(a){const r=await axios.get('https://api.dexscreener.com/latest/dex/tokens/'+a);return r.data.pairs?.[0]||null;}
async function getSec(a){try{const r=await axios.get('https://api.gopluslabs.io/api/v1/token_security/1?contract_addresses='+a);return r.data.result[a.toLowerCase()];}catch{return null;}}
async function filter1(a){
 const p=await getPair(a);if(!p)return{pass:false,reason:'No pair'};
 const ah=ageH(p.pairCreatedAt);if(ah<1||ah>24)return{pass:false,reason:'Age '+ah.toFixed(1)+'h'};
 const mc=p.fdv||0;if(mc<3500)return{pass:false,reason:'MC $'+mc.toFixed(0)+'<4k'};
 if(Math.abs(p.priceChange?.m5||0)>25)return{pass:false,reason:'No consolidation'};
 const s=await getSec(a);if(s){if(s.is_honeypot==='1')return{pass:false,reason:'HONEYPOT'};if(parseInt(s.holder_count||0)<100)return{pass:false,reason:'Holders<100'};}
 if(!p.info?.socials?.length)return{pass:false,reason:'No X'};
 return{pass:true,pair:p,mc};
}
async function filter2(a){
 const p=await getPair(a);if(!p)return{pass:false,reason:'No pair'};
 const ah=ageH(p.pairCreatedAt);if(ah<2||ah>24)return{pass:false,reason:'Age'};
 const mc=p.fdv||0;const liq=p.liquidity?.usd||0;const ratio=mc>0?liq/mc:0;
 if(ratio<0.09||ratio>0.28)return{pass:false,reason:'Liq/MC '+ratio.toFixed(2)};
 const s=await getSec(a);if(!s)return{pass:false,reason:'No sec'};if(parseInt(s.holder_count||0)<400)return{pass:false,reason:'Holders<400'};
 return{pass:true,pair:p,mc};
}
async function sendCall(p,addr,type,mcEntry){
 tracked[addr]={name:p.baseToken.name,symbol:p.baseToken.symbol,entryMC:mcEntry,chainId:p.chainId,pairAddress:p.pairAddress,lastPct:0};
 const link=`https://dexscreener.com/${p.chainId}/${p.pairAddress}`;
 const msg=`🚀 ${p.baseToken.name} ($${p.baseToken.symbol}) | ${type}\n📍 ${addr}\n💰 MC: $${mcEntry.toFixed(0)}\n[Chart](${link})`;
 await bot.telegram.sendMessage(CHANNEL_ID,msg,{parse_mode:'Markdown'});
}
setInterval(async()=>{for(let a in tracked){try{const p=await getPair(a);if(!p)continue;const cur=p.fdv||0;const pct=((cur-tracked[a].entryMC)/tracked[a].entryMC)*100;if(pct>=20&&pct-tracked[a].lastPct>=20){const link=`https://dexscreener.com/${tracked[a].chainId}/${tracked[a].pairAddress}`;await bot.telegram.sendMessage(CHANNEL_ID,`*${tracked[a].name} is up ${pct.toFixed(0)}%* 📈\n\nFrom - [entry signal](${link})\nMC: $${tracked[a].entryMC.toFixed(0)} ➡️ $${cur.toFixed(0)}`,{parse_mode:'Markdown'});tracked[a].lastPct=pct;}}catch{}}},180000);
bot.command('test',async(ctx)=>{if(ctx.from.id!==ADMIN_ID)return;const addr=ctx.message.text.split(' ')[1];if(!addr)return ctx.reply('Yi: /test 0x...');ctx.reply('Ina duba...');const f1=await filter1(addr);if(f1.pass){await sendCall(f1.pair,addr,'F1',f1.mc);return ctx.reply('✅ F1 WUCE!');}ctx.reply(`❌ F1: ${f1.reason} - F2...`);const f2=await filter2(addr);if(f2.pass){await sendCall(f2.pair,addr,'F2',f2.mc);return ctx.reply('✅ F2 WUCE!');}else ctx.reply(`❌ F2: ${f2.reason}`);});
bot.launch();
  bot.sendMessage(msg.chat.id, `${text}\n\n⚠️ ALWAYS DYOR`);
