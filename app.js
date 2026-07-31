const STORAGE_KEY="crypto_portfolio_v1",BN_STORAGE="crypto_portfolio_binance_api",CB_STORAGE="crypto_portfolio_coinbase_api",OPTS_STORAGE="crypto_portfolio_opts",SNAP_STORAGE="crypto_portfolio_snaps",ALERT_BASE="crypto_portfolio_alert_base",HOOK_STORAGE="crypto_portfolio_webhook",OC_STORAGE="crypto_portfolio_onchain";
const STABLES=new Set(["USDT","USDC","USD","BUSD","DAI","TUSD","FDUSD"]);
const COLORS=["#2dd4bf","#38bdf8","#a78bfa","#f472b6","#fbbf24","#34d399","#fb923c","#94a3b8","#e879f9","#22d3ee"];
let pieChart=null,lineChart=null,refreshTimer=null;
let lastPrices={},lastChanges={},lastTotal=0,lastCost=0,lastRisk=null,lastRows=[];

function load(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]")}catch{return[]}}
function save(items){localStorage.setItem(STORAGE_KEY,JSON.stringify(items))}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function loadJSON(k){try{return JSON.parse(localStorage.getItem(k)||"null")}catch{return null}}
function fmt(n){if(n==null||Number.isNaN(n))return"—";return n.toLocaleString("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2})}
function fmtPct(n){if(n==null||Number.isNaN(n))return"";return(n>0?"+":"")+Number(n).toFixed(2)+"%"}
function escapeHtml(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
function sourceLabel(s){return({binance:" · Binance",coinbase:" · Coinbase",paper:" · Paper",onchain:" · On-chain"})[s]||""}
function defaultOpts(){return{sortBy:"value",hideSmall:false,hideStable:false,privacyMode:false,refreshSec:60,alertPct:0,showBtcBench:false,tgtBtc:0,tgtEth:0}}
function loadOpts(){return{...defaultOpts(),...(loadJSON(OPTS_STORAGE)||{})}}
function saveOptsObj(o){localStorage.setItem(OPTS_STORAGE,JSON.stringify(o))}
function loadSnaps(){try{return JSON.parse(localStorage.getItem(SNAP_STORAGE)||"[]")}catch{return[]}}
function pushSnap(total){if(!(total>0))return;const snaps=loadSnaps(),now=Date.now();if(snaps.length&&now-snaps[snaps.length-1].t<3e5)snaps[snaps.length-1]={t:now,v:total};else snaps.push({t:now,v:total});while(snaps.length>60)snaps.shift();localStorage.setItem(SNAP_STORAGE,JSON.stringify(snaps))}
function loadHook(){return loadJSON(HOOK_STORAGE)||{url:"",onRefresh:false}}
function saveHook(h){localStorage.setItem(HOOK_STORAGE,JSON.stringify(h))}

async function fetchPrices(symbols){
  if(!symbols.length)return{prices:{},changes:{}};
  try{const r=await fetch("/api/prices",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({symbols})});
    if(r.ok){const d=await r.json();return{prices:d.prices||{},changes:d.changes||{}}}}catch(_ ){}
  const prices={},changes={},unique=[...new Set(symbols.map(s=>String(s).toUpperCase()))];
  await Promise.all(unique.map(async sym=>{
    if(STABLES.has(sym)){prices[sym]=1;changes[sym]=0;return}
    try{const res=await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol="+encodeURIComponent(sym+"USDT"));
      if(res.ok){const d=await res.json();prices[sym]=parseFloat(d.lastPrice);changes[sym]=parseFloat(d.priceChangePercent)}
      else{prices[sym]=null;changes[sym]=null}}catch{prices[sym]=null;changes[sym]=null}}));
  return{prices,changes};
}

function analyzeRisk(rows,totalValue,changes){
  const notes=[];if(!(totalValue>0)||!rows.length)return null;
  const bySym={};rows.forEach(r=>{if(!(r.value>0))return;const s=String(r.item.symbol).toUpperCase();bySym[s]=(bySym[s]||0)+r.value});
  const weights=Object.entries(bySym).map(([sym,val])=>({sym,w:val/totalValue,ch:changes[sym]!=null?Math.abs(changes[sym]):null}));
  const hhi=weights.reduce((s,x)=>s+x.w*x.w,0),effN=hhi>0?1/hhi:0;
  const sorted=[...weights].sort((a,b)=>b.w-a.w);
  const top1=sorted[0]?sorted[0].w*100:0,top3=sorted.slice(0,3).reduce((s,x)=>s+x.w,0)*100;
  const stableShare=weights.filter(x=>STABLES.has(x.sym)).reduce((s,x)=>s+x.w,0)*100;
  let volNum=0,volDen=0;weights.forEach(x=>{if(x.ch!=null&&!STABLES.has(x.sym)){volNum+=x.w*x.ch;volDen+=x.w}});const volProxy=volDen>0?volNum/volDen:null;
  const snaps=loadSnaps().map(s=>s.v).filter(v=>v>0);let maxDD=null;
  if(snaps.length>=2){let peak=snaps[0],dd=0;snaps.forEach(v=>{if(v>peak)peak=v;const d=peak>0?(peak-v)/peak:0;if(d>dd)dd=d});maxDD=dd*100}
  let divScore=Math.min(100,(effN/8)*70+(1-Math.min(top1/100,1))*30);if(weights.length===1)divScore=Math.min(divScore,15);
  let riskScore=0;
  if(top1>=60)riskScore+=35;else if(top1>=40)riskScore+=22;else if(top1>=25)riskScore+=12;else riskScore+=5;
  if(hhi>=0.45)riskScore+=25;else if(hhi>=0.25)riskScore+=15;else riskScore+=5;
  if(volProxy!=null){if(volProxy>=8)riskScore+=25;else if(volProxy>=4)riskScore+=15;else riskScore+=5}else riskScore+=10;
  if(stableShare<5&&totalValue>100)riskScore+=10;if(stableShare>=30)riskScore-=8;
  riskScore=Math.max(0,Math.min(100,riskScore));
  let level="متوسط",cls="risk-mid";if(riskScore>=65){level="مرتفع";cls="risk-high"}else if(riskScore<=35){level="منخفض-متوسط";cls="risk-low"}
  if(top1>=50)notes.push("تركّز: أكبر أصل ≈ "+top1.toFixed(1)+"%");
  if(effN<3)notes.push("تنويع محدود (فعّال ≈ "+effN.toFixed(1)+")");
  if(volProxy!=null&&volProxy>=6)notes.push("تقلب يومي ≈ "+volProxy.toFixed(1)+"%");
  if(stableShare<5)notes.push("مستقرات منخفضة");if(stableShare>=40)notes.push("مستقرات مرتفعة");
  if(maxDD!=null&&maxDD>=15)notes.push("أقصى تراجع ≈ "+maxDD.toFixed(1)+"%");
  if(!notes.length)notes.push("لا إشارات تركّز حادة");
  return{level,cls,riskScore,hhi,effN,top1,top3,stableShare,volProxy,maxDD,divScore,notes,nAssets:weights.length};
}

function buildExportPayload(){
  const assets=lastRows.map(r=>({symbol:r.item.symbol,amount:r.item.amount,buyPrice:r.item.buyPrice,price:r.price,value:r.value,pnl:r.pnl,change24h:r.ch,source:r.item.source||"manual",note:r.item.note||"",paper:!!r.item.paper,address:r.item.address||null}));
  const risk=lastRisk?{level:lastRisk.level,riskScore:lastRisk.riskScore,divScore:lastRisk.divScore,hhi:lastRisk.hhi,effN:lastRisk.effN,top1Pct:lastRisk.top1,top3Pct:lastRisk.top3,stableSharePct:lastRisk.stableShare,volProxy24h:lastRisk.volProxy,maxDrawdownPct:lastRisk.maxDD,nAssets:lastRisk.nAssets,notes:lastRisk.notes}:null;
  return{version:1,exportedAt:new Date().toISOString(),portfolio:{totalValue:lastTotal,totalCost:lastCost,totalPnl:lastTotal-lastCost,assets},risk,meta:{app:"crypto-portfolio",repo:"https://github.com/Johanne012/crypto-portfolio"}};
}

async function sendWebhook(test){
  const h=loadHook(),el=document.getElementById("devStatus");
  if(!h.url){el.textContent="أدخل Webhook";el.className="api-status err";return}
  const payload=buildExportPayload();payload.meta.trigger=test?"test":"refresh";
  el.textContent="...";el.className="api-status";
  try{const r=await fetch("/api/webhook-proxy",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:h.url,payload})});
    const data=await r.json();if(!r.ok)throw new Error(data.error||"fail");
    el.textContent=data.ok?"OK "+data.status:"HTTP "+data.status;el.className="api-status "+(data.ok?"ok":"err")}catch(e){el.textContent="فشل: "+(e.message||e);el.className="api-status err"}
}

function renderRisk(risk){
  const card=document.getElementById("riskCard");if(!risk){card.hidden=true;lastRisk=null;return}lastRisk=risk;card.hidden=false;
  const badge=document.getElementById("riskBadge");badge.textContent="مستوى: "+risk.level;badge.className="risk-level "+risk.cls;
  const cells=[{k:"مخاطر",v:risk.riskScore.toFixed(0)},{k:"تنويع",v:risk.divScore.toFixed(0)},{k:"HHI",v:risk.hhi.toFixed(3)},{k:"فعّال",v:risk.effN.toFixed(2)},{k:"أكبر %",v:risk.top1.toFixed(1)+"%"},{k:"أعلى3 %",v:risk.top3.toFixed(1)+"%"},{k:"مستقرات",v:risk.stableShare.toFixed(1)+"%"},{k:"تقلب24س",v:risk.volProxy!=null?risk.volProxy.toFixed(2)+"%":"—"},{k:"تراجع",v:risk.maxDD!=null?risk.maxDD.toFixed(1)+"%":"—"},{k:"رموز",v:String(risk.nAssets)}];
  document.getElementById("riskGrid").innerHTML=cells.map(c=>`<div class="risk-item"><div class="k">${c.k}</div><div class="v blur-me">${c.v}</div></div>`).join("");
  document.getElementById("riskNotes").innerHTML=risk.notes.map(n=>`<li>${escapeHtml(n)}</li>`).join("");
}

function updateCharts(rows,totalValue){
  const chartsRow=document.getElementById("chartsRow");
  if(!(totalValue>0)||!rows.length||typeof Chart==="undefined"){chartsRow.hidden=true;return}chartsRow.hidden=false;
  const bySym={};rows.forEach(r=>{if(!(r.value>0))return;const s=String(r.item.symbol).toUpperCase();bySym[s]=(bySym[s]||0)+r.value});
  let entries=Object.entries(bySym).sort((a,b)=>b[1]-a[1]);if(entries.length>8){const top=entries.slice(0,7),rest=entries.slice(7).reduce((s,x)=>s+x[1],0);entries=[...top,["أخرى",rest]]}
  const labels=entries.map(e=>e[0]),data=entries.map(e=>e[1]),colors=labels.map((_,i)=>COLORS[i%COLORS.length]);
  const pieCtx=document.getElementById("pieChart").getContext("2d");if(pieChart)pieChart.destroy();
  pieChart=new Chart(pieCtx,{type:"doughnut",data:{labels,datasets:[{data,backgroundColor:colors,borderWidth:0}]},options:{responsive:true,plugins:{legend:{position:"bottom",labels:{color:"#9aa8c7",boxWidth:12,font:{size:11}}},tooltip:{callbacks:{label:ctx=>{const v=ctx.raw,p=totalValue>0?((v/totalValue)*100).toFixed(1):0;return" "+ctx.label+": "+fmt(v)+" ("+p+"%)"}}}}}});
  const snaps=loadSnaps();const lineCtx=document.getElementById("lineChart").getContext("2d");if(lineChart)lineChart.destroy();
  lineChart=new Chart(lineCtx,{type:"line",data:{labels:snaps.length?snaps.map(s=>new Date(s.t).toLocaleTimeString("ar",{hour:"2-digit",minute:"2-digit"})):["—"],datasets:[{data:snaps.length?snaps.map(s=>s.v):[totalValue],borderColor:"#2dd4bf",backgroundColor:"rgba(45,212,191,0.15)",fill:true,tension:.3,pointRadius:2}]},options:{responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>" "+fmt(c.raw)}}},scales:{x:{ticks:{color:"#9aa8c7",maxTicksLimit:6},grid:{color:"#1e293b"}},y:{ticks:{color:"#9aa8c7"},grid:{color:"#1e293b"}}}}});
}

function updateTargets(rows,totalValue){
  const o=loadOpts(),el=document.getElementById("targetGap");
  if(!(totalValue>0)||(!(o.tgtBtc>0)&&!(o.tgtEth>0))){el.textContent="";return}
  let btc=0,eth=0;rows.forEach(r=>{if(!(r.value>0))return;const s=String(r.item.symbol).toUpperCase();if(s==="BTC")btc+=r.value;if(s==="ETH")eth+=r.value});
  const parts=[];if(o.tgtBtc>0){const p=(btc/totalValue)*100;parts.push("BTC "+p.toFixed(1)+"% (هدف "+o.tgtBtc+" · فجوة "+(p-o.tgtBtc).toFixed(1)+")")}if(o.tgtEth>0){const p=(eth/totalValue)*100;parts.push("ETH "+p.toFixed(1)+"% (هدف "+o.tgtEth+" · فجوة "+(p-o.tgtEth).toFixed(1)+")")}el.textContent=parts.join(" | ");
}
function updateBtcBench(totalValue,totalCost,btcPrice){
  const el=document.getElementById("btcBench"),o=loadOpts();
  if(!o.showBtcBench||!(totalCost>0)||!(btcPrice>0)){el.hidden=true;return}
  const btcAmt=totalCost/btcPrice,portPnlPct=totalCost>0?((totalValue-totalCost)/totalCost)*100:0;
  el.hidden=false;el.textContent="مرجع BTC: تكلفة "+fmt(totalCost)+" ≈ "+btcAmt.toFixed(6)+" BTC · أداء المحفظة "+fmtPct(portPnlPct);
}

function render(items,prices,changes){
  lastPrices=prices;lastChanges=changes||{};const opts=loadOpts();document.body.classList.toggle("privacy",!!opts.privacyMode);
  let rows=items.map(item=>{const price=prices[item.symbol],cost=item.amount*item.buyPrice,value=price!=null?item.amount*price:null,pnl=value!=null?value-cost:null;return{item,price,cost,value,pnl,ch:changes[item.symbol]}});
  if(opts.hideStable)rows=rows.filter(r=>!STABLES.has(String(r.item.symbol).toUpperCase()));
  if(opts.hideSmall)rows=rows.filter(r=>r.value==null||r.value>=1);
  if(opts.sortBy==="value")rows.sort((a,b)=>(b.value||0)-(a.value||0));
  else if(opts.sortBy==="pnl")rows.sort((a,b)=>(b.pnl||0)-(a.pnl||0));
  else if(opts.sortBy==="name")rows.sort((a,b)=>String(a.item.symbol).localeCompare(b.item.symbol));
  else if(opts.sortBy==="change")rows.sort((a,b)=>(b.ch||-999)-(a.ch||-999));
  lastRows=rows;const listEl=document.getElementById("list"),emptyEl=document.getElementById("empty");listEl.innerHTML="";document.getElementById("count").textContent=rows.length?"("+rows.length+")":"";
  let totalValue=0,totalCost=0;
  if(!rows.length){emptyEl.hidden=false;document.getElementById("totalValue").textContent="$0.00";document.getElementById("totalCost").textContent="$0.00";document.getElementById("totalPnl").textContent="$0.00";document.getElementById("chartsRow").hidden=true;document.getElementById("riskCard").hidden=true;document.getElementById("btcBench").hidden=true;lastTotal=0;lastCost=0;lastRisk=null;return}
  emptyEl.hidden=true;
  rows.forEach(({item,price,cost,value,pnl,ch})=>{
    if(value!=null)totalValue+=value;totalCost+=cost;
    const pnlPct=value!=null&&cost>0?(pnl/cost)*100:null,pnlClass=pnl==null?"":pnl>=0?"pos":"neg",chClass=ch==null?"":ch>=0?"pos":"neg";
    const chHtml=ch!=null?`<span class="ch24 ${chClass}">${fmtPct(ch)} 24س</span>`:"";
    const addr=item.address?` · ${escapeHtml(item.address.slice(0,8))}…`:"";
    const div=document.createElement("div");div.className="item";
    div.innerHTML=`<div><h3>${item.symbol}${chHtml}${item.note?" · "+escapeHtml(item.note):""}${sourceLabel(item.paper?"paper":item.source)}${addr}</h3>
      <div class="meta">كمية <span class="blur-me">${item.amount}</span> · شراء <span class="blur-me">${fmt(item.buyPrice)}</span>${price!=null?" · <span class=\"blur-me\">"+fmt(price)+"</span>":""}</div>
      <div class="actions"><button type="button" class="btn-ghost btn-danger" data-del="${item.id}">حذف</button></div></div>
      <div class="pnl ${pnlClass} blur-me">${value!=null?fmt(value):"—"}<br/><span style="font-size:.8rem">${pnl!=null?fmt(pnl)+" ("+fmtPct(pnlPct)+")":""}</span></div>`;
    listEl.appendChild(div);
  });
  lastTotal=totalValue;lastCost=totalCost;const totalPnl=totalValue-totalCost;
  document.getElementById("totalValue").textContent=fmt(totalValue);document.getElementById("totalCost").textContent=fmt(totalCost);
  const pnlEl=document.getElementById("totalPnl");pnlEl.textContent=fmt(totalPnl)+(totalCost>0?" ("+fmtPct((totalPnl/totalCost)*100)+")":"");pnlEl.className="value blur-me "+(totalPnl>=0?"pos":"neg");
  pushSnap(totalValue);updateCharts(rows,totalValue);renderRisk(analyzeRisk(rows,totalValue,lastChanges));updateTargets(rows,totalValue);updateBtcBench(totalValue,totalCost,prices.BTC);
  checkAlert(totalValue);
  listEl.querySelectorAll("[data-del]").forEach(btn=>{btn.onclick=()=>{save(load().filter(x=>x.id!==btn.getAttribute("data-del")));refresh()}});
  const hook=loadHook();if(hook.onRefresh&&hook.url)sendWebhook(false);
}

function checkAlert(total){const pct=Number(loadOpts().alertPct)||0;if(!(pct>0)||!(total>0))return;let base=Number(localStorage.getItem(ALERT_BASE)||0);if(!base){localStorage.setItem(ALERT_BASE,String(total));return}const change=Math.abs((total-base)/base)*100;if(change>=pct){if(window.Notification&&Notification.permission==="granted")new Notification("محفظتي",{body:"تغيّر ≈ "+change.toFixed(2)+"% → "+fmt(total)});localStorage.setItem(ALERT_BASE,String(total))}}
async function refresh(){const items=load();document.getElementById("status").textContent="...";const{prices,changes}=await fetchPrices(items.map(i=>i.symbol));render(items,prices,changes);document.getElementById("status").textContent=new Date().toLocaleTimeString("ar")}
function mergeSource(source,synced){save([...load().filter(x=>x.source!==source),...synced])}

async function syncOnchain(){
  const el=document.getElementById("ocStatus");
  const chain=document.getElementById("ocChain").value;
  const address=document.getElementById("ocAddr").value.trim();
  const buyOpt=document.getElementById("ocBuy").value;
  if(!address){el.textContent="أدخل العنوان";el.className="api-status err";return}
  el.textContent="جاري الجلب...";el.className="api-status";
  try{
    const path=chain==="BTC"?"/api/onchain-btc":"/api/onchain-eth";
    const r=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({address})});
    const data=await r.json();
    if(!r.ok)throw new Error(data.error||"error");
    const symbol=chain==="BTC"?"BTC":"ETH";
    const amount=Number(data.balance)||0;
    if(!(amount>0)){el.textContent="الرصيد صفر أو غير متاح";el.className="api-status err";return}
    const{prices}=await fetchPrices([symbol]);
    const px=prices[symbol]!=null?prices[symbol]:0;
    const buyPrice=buyOpt!==""&&!Number.isNaN(parseFloat(buyOpt))?parseFloat(buyOpt):(px||0);
    const note=address.slice(0,10)+"…";
    // replace onchain entries for same symbol+address or all onchain same symbol
    const rest=load().filter(x=>!(x.source==="onchain"&&x.symbol===symbol&&(x.address===address||!x.address)));
    rest.push({id:uid(),symbol,amount,buyPrice,note,source:"onchain",address,createdAt:Date.now()});
    save(rest);
    localStorage.setItem(OC_STORAGE,JSON.stringify({chain,address}));
    el.textContent="تم: "+amount+" "+symbol;el.className="api-status ok";
    await refresh();
  }catch(e){el.textContent="فشل: "+(e.message||e);el.className="api-status err"}
}

async function syncBinance(){
  const creds=loadJSON(BN_STORAGE),el=document.getElementById("bnStatus");
  if(!creds?.key||!creds?.secret){el.textContent="احفظ المفاتيح";el.className="api-status err";return}
  el.textContent="...";try{
    const r=await fetch("/api/binance-account",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:creds.key,secret:creds.secret})});
    const data=await r.json();if(!r.ok)throw new Error(data.error||"err");
    const balances=(data.balances||[]).filter(b=>parseFloat(b.free)+parseFloat(b.locked)>0);
    const{prices}=await fetchPrices(balances.map(b=>b.asset));
    const synced=balances.map(b=>{const amount=parseFloat(b.free)+parseFloat(b.locked),px=prices[b.asset]!=null?prices[b.asset]:0;return{id:uid(),symbol:b.asset,amount,buyPrice:px,note:"مزامنة",source:"binance",createdAt:Date.now()}}).filter(x=>x.amount>0);
    mergeSource("binance",synced);el.textContent="تم: "+synced.length;el.className="api-status ok";await refresh();
  }catch(e){el.textContent="فشل: "+(e.message||e);el.className="api-status err"}
}
async function syncCoinbase(){
  const creds=loadJSON(CB_STORAGE),el=document.getElementById("cbStatus");
  if(!creds?.key||!creds?.secret||!creds?.passphrase){el.textContent="احفظ الحقول";el.className="api-status err";return}
  el.textContent="...";try{
    const r=await fetch("/api/coinbase-accounts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:creds.key,secret:creds.secret,passphrase:creds.passphrase})});
    const data=await r.json();if(!r.ok)throw new Error(data.error||"err");
    const balances=(data.accounts||[]).map(a=>{const sym=(a.currency||a.available_balance?.currency||"").toUpperCase();const avail=parseFloat(a.available_balance?.value||0),hold=parseFloat(a.hold?.value||0);return{asset:sym,amount:avail+hold}}).filter(b=>b.asset&&b.amount>0);
    const{prices}=await fetchPrices(balances.map(b=>b.asset));
    const synced=balances.map(b=>{const px=prices[b.asset]!=null?prices[b.asset]:0;return{id:uid(),symbol:b.asset,amount:b.amount,buyPrice:px,note:"مزامنة",source:"coinbase",createdAt:Date.now()}});
    mergeSource("coinbase",synced);el.textContent="تم: "+synced.length;el.className="api-status ok";await refresh();
  }catch(e){el.textContent="فشل: "+(e.message||e);el.className="api-status err"}
}

function applyRefreshTimer(){if(refreshTimer)clearInterval(refreshTimer);const sec=Number(loadOpts().refreshSec)||0;if(sec>0)refreshTimer=setInterval(refresh,sec*1000)}
function fillOptsForm(){const o=loadOpts();document.getElementById("sortBy").value=o.sortBy;document.getElementById("hideSmall").checked=!!o.hideSmall;document.getElementById("hideStable").checked=!!o.hideStable;document.getElementById("privacyMode").checked=!!o.privacyMode;document.getElementById("showBtcBench").checked=!!o.showBtcBench;document.getElementById("refreshSec").value=o.refreshSec;document.getElementById("alertPct").value=o.alertPct||0;document.getElementById("tgtBtc").value=o.tgtBtc||0;document.getElementById("tgtEth").value=o.tgtEth||0}
function fillDevForm(){const h=loadHook();document.getElementById("hookUrl").value=h.url||"";document.getElementById("hookOnRefresh").checked=!!h.onRefresh}
function fillOcForm(){const o=loadJSON(OC_STORAGE);if(o){if(o.chain)document.getElementById("ocChain").value=o.chain;if(o.address)document.getElementById("ocAddr").value=o.address}}

document.querySelectorAll(".tab").forEach(tab=>{tab.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));tab.classList.add("active");const t=tab.dataset.tab;
  document.getElementById("addForm").hidden=t!=="manual";document.getElementById("binanceBox").hidden=t!=="binance";document.getElementById("coinbaseBox").hidden=t!=="coinbase";document.getElementById("onchainBox").hidden=t!=="onchain";document.getElementById("optionsBox").hidden=t!=="options";document.getElementById("devBox").hidden=t!=="dev";
  if(t==="options")fillOptsForm();if(t==="dev")fillDevForm();if(t==="onchain")fillOcForm()})});

document.getElementById("addForm").addEventListener("submit",e=>{e.preventDefault();const symbol=document.getElementById("symbol").value,amount=parseFloat(document.getElementById("amount").value),buyPrice=parseFloat(document.getElementById("buyPrice").value),note=document.getElementById("note").value.trim(),paper=document.getElementById("paperFlag").checked;if(!(amount>0)||!(buyPrice>=0))return;const items=load();items.push({id:uid(),symbol,amount,buyPrice,note,source:paper?"paper":"manual",paper,createdAt:Date.now()});save(items);e.target.reset();refresh()});
document.getElementById("bnSave").onclick=()=>{const key=document.getElementById("bnKey").value.trim(),secret=document.getElementById("bnSecret").value.trim();if(!key||!secret)return;localStorage.setItem(BN_STORAGE,JSON.stringify({key,secret}));document.getElementById("bnStatus").textContent="محفوظ";document.getElementById("bnStatus").className="api-status ok"};
document.getElementById("bnClear").onclick=()=>{localStorage.removeItem(BN_STORAGE);document.getElementById("bnKey").value="";document.getElementById("bnSecret").value="";document.getElementById("bnStatus").textContent="—"};
document.getElementById("bnSync").onclick=syncBinance;
document.getElementById("cbSave").onclick=()=>{const key=document.getElementById("cbKey").value.trim(),secret=document.getElementById("cbSecret").value.trim(),passphrase=document.getElementById("cbPass").value.trim();if(!key||!secret||!passphrase)return;localStorage.setItem(CB_STORAGE,JSON.stringify({key,secret,passphrase}));document.getElementById("cbStatus").textContent="محفوظ";document.getElementById("cbStatus").className="api-status ok"};
document.getElementById("cbClear").onclick=()=>{localStorage.removeItem(CB_STORAGE);document.getElementById("cbKey").value="";document.getElementById("cbSecret").value="";document.getElementById("cbPass").value="";document.getElementById("cbStatus").textContent="—"};
document.getElementById("cbSync").onclick=syncCoinbase;
document.getElementById("ocSync").onclick=syncOnchain;
document.getElementById("saveOpts").onclick=()=>{const o={sortBy:document.getElementById("sortBy").value,hideSmall:document.getElementById("hideSmall").checked,hideStable:document.getElementById("hideStable").checked,privacyMode:document.getElementById("privacyMode").checked,showBtcBench:document.getElementById("showBtcBench").checked,refreshSec:Number(document.getElementById("refreshSec").value)||0,alertPct:Number(document.getElementById("alertPct").value)||0,tgtBtc:Number(document.getElementById("tgtBtc").value)||0,tgtEth:Number(document.getElementById("tgtEth").value)||0};saveOptsObj(o);if(o.alertPct>0&&window.Notification?.permission==="default")Notification.requestPermission();applyRefreshTimer();document.getElementById("optStatus").textContent="تم";document.getElementById("optStatus").className="api-status ok";refresh()};
document.getElementById("genJson").onclick=()=>{document.getElementById("jsonOut").value=JSON.stringify(buildExportPayload(),null,2);document.getElementById("devStatus").textContent="تم";document.getElementById("devStatus").className="api-status ok"};
document.getElementById("copyJson").onclick=async()=>{const t=document.getElementById("jsonOut").value||JSON.stringify(buildExportPayload(),null,2);document.getElementById("jsonOut").value=t;try{await navigator.clipboard.writeText(t);document.getElementById("devStatus").textContent="نُسخ";document.getElementById("devStatus").className="api-status ok"}catch{document.getElementById("devStatus").textContent="تعذّر";document.getElementById("devStatus").className="api-status err"}};
document.getElementById("dlJson").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(buildExportPayload(),null,2)],{type:"application/json"}));a.download="portfolio-export.json";a.click()};
document.getElementById("hookSave").onclick=()=>{saveHook({url:document.getElementById("hookUrl").value.trim(),onRefresh:document.getElementById("hookOnRefresh").checked});document.getElementById("devStatus").textContent="Webhook محفوظ";document.getElementById("devStatus").className="api-status ok"};
document.getElementById("hookTest").onclick=()=>sendWebhook(true);
document.getElementById("shareBtn").onclick=async()=>{const text="ملخص\n"+fmt(lastTotal);try{if(navigator.share)await navigator.share({title:"محفظتي",text});else await navigator.clipboard.writeText(text)}catch(_){}};
document.getElementById("importBtn").onclick=()=>document.getElementById("importFile").click();
document.getElementById("importFile").onchange=e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{const lines=String(reader.result||"").split(/\r?\n/).filter(Boolean);const start=lines[0].toLowerCase().includes("symbol")?1:0;const items=load();for(let i=start;i<lines.length;i++){const p=lines[i].split(",");if(p.length<3)continue;const symbol=p[0].replace(/"/g,"").trim().toUpperCase(),amount=parseFloat(p[1]),buyPrice=parseFloat(p[2]);if(!symbol||!(amount>0))continue;items.push({id:uid(),symbol,amount,buyPrice:buyPrice||0,note:"",source:"import",createdAt:Date.now()})}save(items);refresh()};reader.readAsText(file);e.target.value=""};
document.getElementById("syncAll").onclick=async()=>{await syncBinance();await syncCoinbase()};
document.getElementById("refreshBtn").onclick=refresh;
document.getElementById("exportBtn").onclick=()=>{const items=load();if(!items.length)return;const header="symbol,amount,buyPrice,note,source,createdAt\n";const rows=items.map(i=>[i.symbol,i.amount,i.buyPrice,JSON.stringify(i.note||""),i.source||"manual",i.createdAt].join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([header+rows],{type:"text/csv"}));a.download="portfolio.csv";a.click()};
document.getElementById("clearBtn").onclick=()=>{if(load().length&&confirm("مسح الكل؟")){save([]);refresh()}};

(function init(){
  const bn=loadJSON(BN_STORAGE);if(bn){document.getElementById("bnKey").value=bn.key||"";document.getElementById("bnSecret").value=bn.secret||"";document.getElementById("bnStatus").textContent="محفوظ";document.getElementById("bnStatus").className="api-status ok"}
  const cb=loadJSON(CB_STORAGE);if(cb){document.getElementById("cbKey").value=cb.key||"";document.getElementById("cbSecret").value=cb.secret||"";document.getElementById("cbPass").value=cb.passphrase||"";document.getElementById("cbStatus").textContent="محفوظ";document.getElementById("cbStatus").className="api-status ok"}
  applyRefreshTimer();refresh();
})();
