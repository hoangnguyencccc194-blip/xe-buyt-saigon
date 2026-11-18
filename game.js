'use strict';
/* Xe Buýt Sài Gòn — game quản lý xe buýt TP.HCM. Dữ liệu tuyến/trạm: © OpenStreetMap contributors (ODbL). */
(() => {
const SAVE_KEY = 'xebuyt-sg-v1';
const MIN_PER_SEC = 2;            // game minutes per real second at 1x
const FARE = 7000;                // giá vé (đ)
const SUBSIDY_KM = 4000;          // trợ giá mỗi km chạy
const SHELTER_COST = 800000;
const START_MONEY = 24000000;
const PALETTE = ['#0ea5e9','#f97316','#22c55e','#e11d48','#8b5cf6','#14b8a6','#eab308','#ec4899','#6366f1','#84cc16','#06b6d4','#f43f5e','#a855f7','#10b981','#f59e0b'];
const MODELS = {
  mini: {name:'Xe buýt nhỏ', desc:'Gọn, lanh lẹ trong hẻm phố', cap:30, speed:330, price:6000000, upk:400000, fuel:3000, lvl:1, sat:0, color:'#38bdf8', len:16, img:'assets/bus-mini.jpg'},
  std:  {name:'Xe buýt thường', desc:'Xe 60 chỗ quen thuộc', cap:60, speed:300, price:12000000, upk:700000, fuel:5000, lvl:1, sat:0, color:'#2563eb', len:22, img:'assets/bus-std.jpg'},
  cng:  {name:'Xe buýt CNG', desc:'Chạy khí nén, rẻ nhiên liệu', cap:75, speed:300, price:18000000, upk:800000, fuel:3500, lvl:3, sat:2, color:'#16a34a', len:24, img:'assets/bus-cng.jpg'},
  ev:   {name:'Xe buýt điện', desc:'Êm, sạch, khách rất thích', cap:70, speed:310, price:28000000, upk:750000, fuel:1500, lvl:5, sat:6, color:'#65a30d', len:24, img:'assets/bus-ev.jpg'},
  dd:   {name:'Xe buýt 2 tầng', desc:'Chở cực đông, thu hút du khách', cap:110, speed:260, price:45000000, upk:1300000, fuel:7000, lvl:7, sat:8, color:'#15803d', len:25, img:'assets/bus-dd.jpg'},
};
const LEVEL_XP = [0,800,2500,5000,8500,13000,19000,26000,35000,46000,60000,76000,95000,120000,150000];
const FESTIVALS = ['Lễ hội Áo dài','Đêm nhạc phố đi bộ','Hội chợ ẩm thực đường phố','Lễ hội Trung thu','Ngày hội sinh viên','Lễ hội Tết Nguyên đán'];
const CENTER = [10.7769, 106.7009];

const $ = s => document.querySelector(s);
const fmt = v => { const a=Math.abs(v), s=v<0?'-':''; if(a>=1e9) return s+(a/1e9).toFixed(2).replace('.',',')+' tỷ'; if(a>=1e6) return s+(a/1e6).toFixed(a>=1e8?0:1).replace('.',',')+' tr'; if(a>=1e3) return s+Math.round(a/1e3)+'k'; return s+Math.round(a)+'đ'; };
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const hhmm = t => { const m=Math.floor(t)%1440; return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'); };
function dist(a,b){ const la=(a[0]+b[0])/2*Math.PI/180; return Math.hypot((a[0]-b[0])*111320,(a[1]-b[1])*111320*Math.cos(la)); }

let D, S, map, routeById={}, stopW=[], stopRoutes=[], layers={}, fxCtx, rainCtx, sprites={};
let speedMul = 1, lastTs = 0, floaters = [], zooming=false, curTab='map', sheetCtx=null, routeFilter='all', routeQuery='';

/* ---------- Stop weight (độ đông khách) ---------- */
function stopWeight(name, p){
  let w = 0.6;
  const n = name.toLowerCase();
  const K = [[/bến thành/,2.5],[/chợ/,1.0],[/bến xe/,1.6],[/đại học|đh |trường đh|ký túc|ktx/,1.4],[/bệnh viện|bv /,1.0],[/siêu thị|co\.?op|big c|aeon|vincom|lotte|emart|go!|mall|plaza/,1.1],[/sân bay|tân sơn nhất/,1.6],[/ga /,0.8],[/công viên/,0.6],[/trường|thpt|thcs/,0.5],[/khu công nghiệp|kcn|khu chế xuất/,1.0],[/nhà thờ|chùa/,0.3],[/ngã tư|ngã ba|vòng xoay/,0.4],[/ubnd|quận/,0.3]];
  for(const [re,v] of K) if(re.test(n)) w += v;
  const dc = dist(p, CENTER);
  w += 1.8*Math.exp(-dc/3500) + 0.6*Math.exp(-dc/9000);
  return clamp(w, 0.4, 5);
}
function hourFactor(h){
  if(h<5) return 0.05; if(h<6) return 0.5; if(h<8.5) return 1.9; if(h<11) return 1.0; if(h<13) return 1.2;
  if(h<16.5) return 0.9; if(h<19) return 2.0; if(h<22) return 0.8; return 0.2;
}
const isRush = h => (h>=6&&h<8.5)||(h>=16.5&&h<19);

/* ---------- State ---------- */
function newState(){
  return {v:1, money:START_MONEY, t:6*60, xp:0, level:1, sat:70, opened:{}, buses:[], shelters:{}, waiting:{}, nextId:1,
    ledger:[{day:1,fare:0,sub:0,fuel:0,upk:0,build:0}], paxTotal:0, event:null, tut:0, seen:{}};
}
function save(){ try{ S.saved=Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }catch(e){} }
function load(){
  try{ const s=JSON.parse(localStorage.getItem(SAVE_KEY)); if(s&&s.v===1){ s.buses=s.buses.filter(b=>MODELS[b.m]); for(const b of s.buses) if(b.r&&!routeById[b.r]) b.r=null; return s; } }catch(e){}
  return newState();
}
const today = () => S.ledger[S.ledger.length-1];
const day = () => Math.floor(S.t/1440)+1;
const hour = () => (S.t%1440)/60;

/* ---------- Data prep ---------- */
function prepData(){
  D.stops.forEach((s,i)=>{ stopW[i]=stopWeight(s[0],[s[1],s[2]]); stopRoutes[i]=[]; });
  D.routes.forEach((r,i)=>{
    r.id = r.ref; r.color = PALETTE[i%PALETTE.length];
    r.cum=[0]; for(let k=1;k<r.g.length;k++) r.cum.push(r.cum[k-1]+dist(r.g[k-1],r.g[k]));
    r.sd = r.s.map(x=>Math.min(x[1], r.cum[r.cum.length-1])); r.si = r.s.map(x=>x[0]);
    r.si.forEach(si=>stopRoutes[si].push(r.ref));
    r.km = r.len/1000;
    r.cost = Math.round((3000000 + r.km*250000 + r.si.length*40000)/100000)*100000;
    const ws=r.si.reduce((a,s)=>a+stopW[s],0); r.pot = ws/r.si.length;
    r.title = (r.name||'').replace(/^Số\s*\S+\s*[:\-–]?\s*/,'') || ((r.from||'')+' – '+(r.to||''));
    routeById[r.ref]=r;
  });
  const pots=D.routes.map(r=>r.pot).sort((a,b)=>a-b); const q=x=>pots[Math.floor(pots.length*x)];
  D.routes.forEach(r=>r.fire=r.pot>=q(.85)?4:r.pot>=q(.6)?3:r.pot>=q(.3)?2:1);
  const sw=[...stopW].sort((a,b)=>a-b); const qs=x=>sw[Math.floor(sw.length*x)];
  stopW.forEach((w,i)=>{});
  window.__qs=[qs(.5),qs(.8),qs(.95)];
}
function posAt(r, s){
  const c=r.cum; let lo=0, hi=c.length-1;
  while(hi-lo>1){ const m=(lo+hi)>>1; if(c[m]<=s) lo=m; else hi=m; }
  const a=r.g[lo], b=r.g[hi], seg=c[hi]-c[lo]||1, f=clamp((s-c[lo])/seg,0,1);
  return {lat:a[0]+(b[0]-a[0])*f, lng:a[1]+(b[1]-a[1])*f, i:lo};
}

/* ---------- Map ---------- */
function initMap(){
  map = L.map('map',{preferCanvas:true, zoomControl:false, minZoom:11, maxZoom:18, maxBounds:[[10.3,106.3],[11.25,107.1]], maxBoundsViscosity:0.8, tap:true}).setView([10.776,106.70],14);
  const ATTR='<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> © <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> · Dữ liệu © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';
  let gl=false; try{ const c=document.createElement('canvas'); gl=!!(c.getContext('webgl2')||c.getContext('webgl')); }catch(e){}
  if(gl && L.maplibreGL){
    L.maplibreGL({style:'https://tiles.openfreemap.org/styles/liberty', attribution:ATTR, interactive:false}).addTo(map);
  } else {
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19, attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
  }
  map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
  layers.renderer = L.canvas({padding:0.3, tolerance:8});
  layers.net = L.layerGroup().addTo(map);
  layers.open = L.layerGroup().addTo(map);
  layers.stops = L.layerGroup().addTo(map);
  layers.preview = L.layerGroup().addTo(map);
  // depot near Bến Thành
  const bt = D.stops.findIndex(s=>/bến thành/i.test(s[0]));
  const dp = bt>=0 ? [D.stops[bt][1]+0.0012, D.stops[bt][2]-0.001] : CENTER;
  L.marker(dp,{icon:L.divIcon({className:'depot',html:'🏢',iconSize:[30,30]}),zIndexOffset:500}).addTo(map).bindPopup('<b>Bãi xe & văn phòng của bạn</b><br>Xe chưa giao tuyến sẽ đậu ở đây.');
  map.on('zoomstart',()=>{zooming=true;}); map.on('zoomend',()=>{zooming=false; drawStops();});
  map.on('click',()=>{ if(curTab==='map') closeSheet(); });
  const fab=document.createElement('div'); fab.className='fab';
  fab.innerHTML='<button id="zin" aria-label="Phóng to">➕</button><button id="zout" aria-label="Thu nhỏ">➖</button><button id="zhome" aria-label="Về trung tâm">🎯</button>';
  document.body.appendChild(fab);
  $('#zin').onclick=()=>map.zoomIn(); $('#zout').onclick=()=>map.zoomOut();
  $('#zhome').onclick=()=>{ const o=openRoutes(); if(o.length){ let b=L.latLngBounds(o[0].g); o.forEach(r=>b.extend(r.g)); map.flyToBounds(b,{padding:[30,30],maxZoom:15}); } else map.flyTo([10.776,106.70],14); };
}
function openRoutes(){ return Object.keys(S.opened).map(k=>routeById[k]).filter(Boolean); }
function drawNetwork(){
  layers.net.clearLayers(); layers.open.clearLayers();
  for(const r of D.routes){
    if(S.opened[r.ref]) continue;
    L.polyline(r.g,{renderer:layers.renderer,color:'#64748b',weight:2,opacity:0.28,interactive:true}).on('click',e=>{L.DomEvent.stop(e); showRoute(r.ref);}).addTo(layers.net);
  }
  for(const r of openRoutes()){
    L.polyline(r.g,{renderer:layers.renderer,color:'#fff',weight:10,opacity:0.95,interactive:false}).addTo(layers.open);
    L.polyline(r.g,{renderer:layers.renderer,color:r.color,weight:6,opacity:1}).on('click',e=>{L.DomEvent.stop(e); showRoute(r.ref);}).addTo(layers.open);
  }
  drawStops();
}
let stopMarkers = {};
function servedStops(){ const set=new Set(); for(const r of openRoutes()) r.si.forEach(s=>set.add(s)); return set; }
function drawStops(){
  layers.stops.clearLayers(); stopMarkers={};
  const z=map.getZoom(); const rad = z>=16?8:z>=14?6:z>=13?4.5:3;
  for(const si of servedStops()){
    const st=D.stops[si];
    const m=L.circleMarker([st[1],st[2]],{renderer:layers.renderer,radius:rad,weight:S.shelters[si]?3.5:2,color:S.shelters[si]?'#1d4ed8':'#fff',fillColor:'#22c55e',fillOpacity:1});
    m.on('click',e=>{L.DomEvent.stop(e); showStop(si);});
    m.addTo(layers.stops); stopMarkers[si]=m;
  }
  styleStops();
}
function waitColor(w){ return w<15?'#22c55e':w<35?'#facc15':w<55?'#fb923c':'#ef4444'; }
function styleStops(){ for(const k in stopMarkers){ const w=S.waiting[k]||0; stopMarkers[k].setStyle({fillColor:waitColor(w)}); } }

/* ---------- Bus sprites (vẽ bằng code) ---------- */
function makeSprite(model){
  const M=MODELS[model], sc=3, L_=M.len, W=10;
  const c=document.createElement('canvas'); c.width=(L_+6)*sc; c.height=(W+6)*sc;
  const g=c.getContext('2d'); g.scale(sc,sc); g.translate(3,3);
  g.shadowColor='rgba(0,0,0,.35)'; g.shadowBlur=3; g.shadowOffsetY=1.5;
  const rr=(x,y,w,h,r)=>{g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();};
  g.fillStyle=M.color; rr(0,0,L_,W,3); g.fill(); g.shadowColor='transparent';
  g.fillStyle='rgba(255,255,255,.25)'; rr(1,1,L_-2,3,1.5); g.fill();
  g.fillStyle='#bae6fd'; rr(L_-4.2,1.2,3.2,W-2.4,1.2); g.fill();                    // kính lái
  g.fillStyle='rgba(15,23,42,.55)'; for(let x=2.5;x<L_-6;x+=3.4){ rr(x,0.6,2.4,1.4,0.5); g.fill(); rr(x,W-2,2.4,1.4,0.5); g.fill(); }
  g.fillStyle = model==='ev'?'#d9f99d':model==='dd'?'#fde047':'#fff';
  rr(3,W/2-1.2,L_-9,2.4,1.2); g.fill();                                             // sọc mái
  if(model==='dd'){ g.fillStyle='rgba(255,255,255,.35)'; rr(2,2.5,L_-7,W-5,1.5); g.fill(); }
  if(model==='ev'){ g.fillStyle='#fff'; g.font='bold 4px sans-serif'; g.fillText('⚡',L_/2-3,W/2+1.6); }
  g.fillStyle='#fef08a'; g.fillRect(L_-0.8,1,0.8,1.6); g.fillRect(L_-0.8,W-2.6,0.8,1.6);
  g.fillStyle='#f87171'; g.fillRect(0,1,0.7,1.6); g.fillRect(0,W-2.6,0.7,1.6);
  return {c, w:L_+6, h:W+6};
}

/* ---------- Simulation ---------- */
function eventSpeed(r){ let f=1; const e=S.event; if(e){ if(e.type==='rain') f*=0.85; if(e.type==='jam'&&e.route===r.ref) f*=0.45; } if(isRush(hour())) f*=0.8; return f; }
function spawnFactor(si){
  let f=hourFactor(hour()) * (0.55+0.8*S.sat/100);
  if(S.shelters[si]) f*=1.15;
  const e=S.event;
  if(e){ if(e.type==='rain') f*= S.shelters[si]?1.25:0.9; if(e.type==='fest' && dist([D.stops[si][1],D.stops[si][2]], e.p)<1600) f*=3; }
  return f;
}
function addMoney(v, cat){ S.money+=v; const t=today(); t[cat]=(t[cat]||0)+Math.abs(v); }
function step(dt){ // dt in game minutes
  const prevDay=day(), prevHour=Math.floor(hour());
  S.t += dt;
  // passengers spawn
  const served=servedStops();
  for(const si of served){
    const cap = S.shelters[si]?120:80;
    S.waiting[si] = Math.min(cap, (S.waiting[si]||0) + 0.022*stopW[si]*spawnFactor(si)*dt);
  }
  // buses
  for(const b of S.buses){
    const M=MODELS[b.m]; addMoney(-M.upk/1440*dt,'upk');
    if(!b.r) continue; const r=routeById[b.r]; if(!r) { b.r=null; continue; }
    if(b.dw>0){ b.dw-=dt; continue; }
    const v=M.speed*eventSpeed(r)*dt, before=b.s;
    b.s += b.d*v;
    const target=r.sd[b.k];
    if((b.d>0&&b.s>=target)||(b.d<0&&b.s<=target)){ b.s=target; arrive(b,r,M); }
    const km=Math.abs(b.s-before)/1000; b.km+=km; addMoney(-M.fuel*km,'fuel'); addMoney(SUBSIDY_KM*km,'sub');
  }
  if(Math.floor(hour())!==prevHour) hourly();
  if(day()!==prevDay) newDay(prevDay);
}
function arrive(b,r,M){
  const si=r.si[b.k], last = b.k===0||b.k===r.si.length-1;
  const w=stopW[si];
  let off = last ? b.l : Math.round(b.l*clamp(0.02+0.03*w,0.03,0.3));
  b.l-=off;
  let on = last && b.k!==0 && b.d>0 ? 0 : 0;
  const waiting=Math.floor(S.waiting[si]||0); on=Math.min(waiting, M.cap-b.l);
  if(last){ b.d=-b.d; b.trips=(b.trips||0)+1; }
  b.k += b.d; b.k=clamp(b.k,0,r.si.length-1);
  S.waiting[si]=(S.waiting[si]||0)-on; b.l+=on;
  if(on>0){ const rev=on*FARE; addMoney(rev,'fare'); S.xp+=on; S.paxTotal+=on; const o=S.opened[r.ref]; o.pax=(o.pax||0)+on; o.rev=(o.rev||0)+rev;
    if(!zooming && on>=3) floaters.push({lat:D.stops[si][1],lng:D.stops[si][2],txt:'+'+fmt(rev),life:1}); checkLevel(); }
  b.dw = (last?8:0.8) + (on+off)*0.08;
}
function checkLevel(){
  while(S.level<LEVEL_XP.length && S.xp>=LEVEL_XP[S.level]){
    S.level++;
    const unlocked=Object.entries(MODELS).filter(([k,m])=>m.lvl===S.level).map(([k,m])=>m.name);
    const bonus=S.level*600000; S.money+=bonus;
    modal(`<div class="big">🏆</div><h2>Lên cấp ${S.level}!</h2><p>Thưởng <b>${fmt(bonus)}</b>.${unlocked.length?'<br>Mở khóa: <b>'+unlocked.join(', ')+'</b> 🎉':''}</p><button class="btn full" data-close>Tuyệt!</button>`);
  }
}
function hourly(){
  // satisfaction
  const served=[...servedStops()];
  if(served.length){
    let over=0, unsh=0; for(const si of served){ if((S.waiting[si]||0)>45) over++; if(!S.shelters[si]) unsh++; }
    const assigned=S.buses.filter(b=>b.r);
    const bonus = assigned.length? assigned.reduce((a,b)=>a+MODELS[b.m].sat,0)/assigned.length : 0;
    const crowd = assigned.length? assigned.filter(b=>b.l>MODELS[b.m].cap*0.9).length/assigned.length : 0;
    let target = 88 - 45*over/served.length + bonus - 10*crowd + 6*(1-unsh/served.length);
    if(S.event&&S.event.type==='rain') target -= 12*unsh/served.length;
    if(S.event&&S.event.type==='jam') target -= 4;
    S.sat = clamp(S.sat + (target-S.sat)*0.25, 5, 100);
  }
  // events
  const e=S.event;
  if(e && S.t>=e.end){ toast(e.type==='rain'?'🌤️ Trời đã tạnh mưa':e.type==='jam'?'🚦 Hết kẹt xe trên tuyến '+e.route:'🎉 Lễ hội đã kết thúc'); S.event=null; }
  else if(!e && openRoutes().length && Math.random()<0.13){
    const h=hour(), x=Math.random(), o=openRoutes();
    if(x<0.38) S.event={type:'rain', end:S.t+90+Math.random()*120, txt:'🌧️ Mưa lớn! Xe chạy chậm, trạm có mái che đông khách hơn'};
    else if(x<0.72){ const r=o[Math.floor(Math.random()*o.length)]; S.event={type:'jam', route:r.ref, end:S.t+60+Math.random()*90, txt:`🚦 Kẹt xe trên tuyến ${r.ref}! Xe chạy chậm hẳn`}; }
    else { const sv=[...servedStops()].sort((a,b)=>stopW[b]-stopW[a]).slice(0,25); const si=sv[Math.floor(Math.random()*sv.length)]; const nm=FESTIVALS[Math.floor(Math.random()*FESTIVALS.length)];
      S.event={type:'fest', p:[D.stops[si][1],D.stops[si][2]], end:S.t+120+Math.random()*60, txt:`🎉 ${nm} gần trạm ${D.stops[si][0]}: khách tăng gấp 3!`}; }
    toast(S.event.txt);
  }
  const hr=Math.floor(hour());
  if(hr===6) toast('⏰ Giờ cao điểm sáng! Khách đổ ra trạm đông');
  if(hr===17) toast('⏰ Giờ cao điểm chiều! Tăng xe cho tuyến đông');
}
function newDay(prev){
  const t=today(); const inc=t.fare+t.sub, exp=t.fuel+t.upk; 
  toast(`📅 Hết ngày ${prev}: ${inc-exp>=0?'lãi':'lỗ'} ${fmt(Math.abs(inc-exp))}`);
  S.ledger.push({day:day(),fare:0,sub:0,fuel:0,upk:0,build:0}); if(S.ledger.length>30) S.ledger.shift();
  for(const k in S.opened){ S.opened[k].pax=0; S.opened[k].rev=0; }
}

/* ---------- Actions ---------- */
function openRoute(ref){
  const r=routeById[ref]; if(S.opened[ref]) return;
  if(S.money<r.cost) return toast('💸 Không đủ tiền mở tuyến');
  addMoney(-r.cost,'build'); S.opened[ref]={at:S.t,pax:0,rev:0};
  drawNetwork(); toast(`✅ Đã mở tuyến ${ref}! Giờ hãy mua xe và giao cho tuyến`);
  map.flyToBounds(L.latLngBounds(r.g),{padding:[40,40]}); if(S.tut===2) S.tut=3; save(); refreshSheet();
}
function closeRoute(ref){
  for(const b of S.buses) if(b.r===ref) b.r=null;
  delete S.opened[ref]; drawNetwork(); toast('Đã đóng tuyến '+ref); save(); refreshSheet();
}
function buyBus(m){
  const M=MODELS[m]; if(S.level<M.lvl) return toast('🔒 Cần cấp '+M.lvl);
  if(S.money<M.price) return toast('💸 Không đủ tiền mua xe');
  addMoney(-M.price,'build');
  const b={id:S.nextId++, m, r:null, s:0, d:1, k:0, l:0, dw:0, km:0, trips:0};
  S.buses.push(b);
  const o=openRoutes();
  if(o.length){ // tự giao cho tuyến ít xe nhất
    o.sort((a,c)=>busCount(a.ref)-busCount(c.ref)); assign(b,o[0].ref,true);
    toast(`🚌 Đã mua ${M.name} #${b.id} và giao cho tuyến ${o[0].ref}`);
  } else toast(`🚌 Đã mua ${M.name} #${b.id}. Mở tuyến để giao xe`);
  save(); refreshSheet();
}
const busCount = ref => S.buses.filter(b=>b.r===ref).length;
function assign(b, ref, silent){
  b.r = ref||null; b.l=0; b.dw=1;
  if(ref){ const r=routeById[ref]; const n=busCount(ref)-1; const k = Math.floor(((n*0.618)%1)*(r.si.length-1));
    b.k=k; b.s=r.sd[k]; b.d=1; if(k>=r.si.length-1){b.d=-1;}
    if(!silent) toast(`➡️ Xe #${b.id} chạy tuyến ${ref}`); }
  save();
}
function sellBus(id){ const i=S.buses.findIndex(b=>b.id===id); if(i<0) return; const M=MODELS[S.buses[i].m]; S.money+=M.price*0.5; S.buses.splice(i,1); toast('Đã bán xe, nhận lại '+fmt(M.price*0.5)); save(); refreshSheet(); }
function buildShelter(si){ if(S.shelters[si]) return; if(S.money<SHELTER_COST) return toast('💸 Không đủ tiền'); addMoney(-SHELTER_COST,'build'); S.shelters[si]=1; drawStops(); toast('🏗️ Đã xây mái che ở trạm '+D.stops[si][0]); save(); showStop(si); }

/* ---------- UI: sheet ---------- */
function openSheet(html, ctx){ $('#sheet-body').innerHTML=html; $('#sheet').classList.remove('closed'); sheetCtx=ctx; }
function closeSheet(){ $('#sheet').classList.add('closed'); sheetCtx=null; setTab('map',true); }
function refreshSheet(){ if(!sheetCtx) return; const c=sheetCtx; const sc=$('#sheet-body').scrollTop;
  if(c.t==='routes') renderRoutes(); else if(c.t==='route') showRoute(c.ref,true); else if(c.t==='fleet') renderFleet(); else if(c.t==='finance') renderFinance(); else if(c.t==='stop') showStop(c.si); else if(c.t==='more') renderMore();
  $('#sheet-body').scrollTop=sc; }
function setTab(t, noOpen){
  curTab=t; document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));
  if(noOpen) return;
  layers.preview.clearLayers();
  if(t==='map') closeSheet(); else if(t==='routes') renderRoutes(); else if(t==='fleet') renderFleet(); else if(t==='finance') renderFinance(); else renderMore();
}
function badge(r){ return `<div class="badge" style="background:${r.color}">${r.ref}</div>`; }
function renderRoutes(){
  const list=D.routes.filter(r=>{
    if(routeFilter==='open'&&!S.opened[r.ref]) return false; if(routeFilter==='new'&&S.opened[r.ref]) return false;
    if(routeQuery){ const q=routeQuery.toLowerCase(); return (r.ref+' '+r.name+' '+r.si.map(s=>D.stops[s][0]).join(' ')).toLowerCase().includes(q); } return true; });
  const items=list.slice(0,80).map(r=>{
    const o=S.opened[r.ref];
    return `<div class="card" data-route="${r.ref}">${badge(r)}<div class="grow"><div class="t">${esc(r.title)}</div><div class="m">${r.km.toFixed(1)} km · ${r.si.length} trạm · ${'🔥'.repeat(r.fire)}${o?` · 🚌 ${busCount(r.ref)} xe`:''}</div></div>
      ${o?`<span class="tag">Đang chạy</span>`:`<button class="btn y" data-open="${r.ref}" ${S.money<r.cost?'disabled':''}>${fmt(r.cost)}</button>`}</div>`; }).join('');
  openSheet(`<h2>🚏 Tuyến xe buýt thật</h2><div class="sub">${D.routes.length} tuyến của TP.HCM từ OpenStreetMap · 🔥 = độ đông khách</div>
    <input class="search" id="rq" placeholder="Tìm số tuyến hoặc tên trạm (vd: Bến Thành)" value="${esc(routeQuery)}">
    <div class="seg"><button data-f="all" class="${routeFilter==='all'?'on':''}">Tất cả</button><button data-f="open" class="${routeFilter==='open'?'on':''}">Đã mở (${Object.keys(S.opened).length})</button><button data-f="new" class="${routeFilter==='new'?'on':''}">Chưa mở</button></div>
    ${items||'<div class="empty">Không tìm thấy tuyến nào</div>'}${list.length>80?'<div class="empty">…gõ để tìm thêm tuyến</div>':''}`, {t:'routes'});
  const q=$('#rq'); q.oninput=()=>{ routeQuery=q.value; const pos=q.selectionStart; renderRoutes(); const n=$('#rq'); n.focus(); n.setSelectionRange(pos,pos); };
}
function previewRoute(r){
  layers.preview.clearLayers();
  if(!S.opened[r.ref]){
    L.polyline(r.g,{renderer:layers.renderer,color:'#fff',weight:9,opacity:.9,interactive:false}).addTo(layers.preview);
    L.polyline(r.g,{renderer:layers.renderer,color:r.color,weight:5,dashArray:'10 8',interactive:false}).addTo(layers.preview);
    r.si.forEach(si=>L.circleMarker([D.stops[si][1],D.stops[si][2]],{renderer:layers.renderer,radius:4,color:r.color,weight:2,fillColor:'#fff',fillOpacity:1,interactive:false}).addTo(layers.preview));
  }
  const b=L.latLngBounds(r.g); const h=window.innerHeight;
  map.flyToBounds(b,{paddingTopLeft:[20,110],paddingBottomRight:[20,h*0.55],duration:0.8});
}
function showRoute(ref, keep){
  const r=routeById[ref]; if(!r) return; const o=S.opened[ref];
  if(!keep) previewRoute(r);
  const buses=S.buses.filter(b=>b.r===ref);
  const idle=S.buses.filter(b=>!b.r);
  const top=[...r.si].sort((a,b)=>stopW[b]-stopW[a]).slice(0,5).map(s=>D.stops[s][0]);
  openSheet(`<h2>${badge(r)} <span style="font-size:16px">${esc(r.title)}</span></h2>
    <div class="sub">${r.op?esc(r.op)+' · ':''}${r.km.toFixed(1)} km · ${r.si.length} trạm thật</div>
    <div class="kpi"><div>Trạm đầu<b style="font-size:13px">${esc(D.stops[r.si[0]][0])}</b></div><div>Trạm cuối<b style="font-size:13px">${esc(D.stops[r.si[r.si.length-1]][0])}</b></div>
    ${o?`<div class="p">Khách hôm nay<b>${o.pax||0}</b></div><div class="p">Doanh thu hôm nay<b>${fmt(o.rev||0)}</b></div>`:''}</div>
    <div class="m" style="font-size:12px;color:#64748b">Trạm đông: ${top.map(esc).join(' · ')}</div>
    ${o?`<h3>Xe trên tuyến (${buses.length})</h3>${buses.map(b=>busCard(b)).join('')||'<div class="empty">Chưa có xe. Mua hoặc giao xe đang rảnh!</div>'}
      ${idle.length?`<button class="btn full" data-assignidle="${ref}">Giao ${idle.length} xe đang rảnh cho tuyến này</button>`:''}
      <button class="btn y full" data-tab2="fleet">🛒 Mua thêm xe</button><button class="btn r full" data-close-route="${ref}">Đóng tuyến</button>`
     :`<button class="btn y full" data-open="${ref}" ${S.money<r.cost?'disabled':''}>Mở tuyến · ${fmt(r.cost)}</button>`}`, {t:'route',ref});
}
function busCard(b){
  const M=MODELS[b.m], r=b.r&&routeById[b.r];
  const opts=['<option value="">🅿️ Về bãi</option>'].concat(openRoutes().map(x=>`<option value="${x.ref}" ${x.ref===b.r?'selected':''}>Tuyến ${x.ref}</option>`)).join('');
  return `<div class="card"><img src="${M.img}" style="width:58px;height:44px;object-fit:cover;border-radius:10px" alt=""><div class="grow"><div class="t">#${b.id} ${M.name}</div>
    <div class="m">👥 ${b.l}/${M.cap} · ${Math.round(b.km)} km · ${b.trips||0} lượt${r?'':' · đang đậu'}</div></div>
    <select data-assign="${b.id}">${opts}</select></div>`;
}
function renderFleet(){
  const models=Object.entries(MODELS).map(([k,M])=>{ const lock=S.level<M.lvl;
    return `<div class="card model ${lock?'lock':''}"><img src="${M.img}" alt="${M.name}" loading="lazy"><div class="in">
      <div class="t">${M.name} ${lock?`<span class="tag lock">🔒 Cấp ${M.lvl}</span>`:''}</div><div class="m">${M.desc}</div>
      <div class="stats"><div><b>${M.cap}</b>chỗ</div><div><b>${Math.round(M.speed*0.06)}</b>km/h</div><div><b>${fmt(M.upk)}</b>/ngày</div><div><b>${fmt(M.fuel)}</b>/km</div></div>
      <button class="btn y full" data-buy="${k}" ${lock||S.money<M.price?'disabled':''}>Mua · ${fmt(M.price)}</button></div></div>`; }).join('');
  const mine=S.buses.map(b=>busCard(b)+`<div style="text-align:right;margin:-4px 0 10px"><button class="btn r" style="min-height:34px;padding:6px 10px;font-size:12px" data-sell="${b.id}">Bán (${fmt(MODELS[b.m].price/2)})</button></div>`).join('');
  openSheet(`<h2>🚌 Đội xe</h2><div class="sub">${S.buses.length} xe · ${S.buses.filter(b=>!b.r).length} xe đang rảnh</div>
    ${mine||'<div class="empty">Bạn chưa có xe nào. Mua chiếc đầu tiên bên dưới!</div>'}<h3>🛒 Cửa hàng xe</h3>${models}`, {t:'fleet'});
}
function renderFinance(){
  const t=today(), inc=t.fare+t.sub, exp=t.fuel+t.upk;
  const ass=S.buses.filter(b=>b.r).length;
  openSheet(`<h2>📊 Tài chính</h2><div class="sub">Ngày ${day()} · ${hhmm(S.t)}</div>
    <div class="kpi"><div class="p">Tiền vé<b>${fmt(t.fare)}</b></div><div class="p">Trợ giá thành phố<b>${fmt(t.sub)}</b></div>
    <div class="n">Nhiên liệu / điện<b>${fmt(t.fuel)}</b></div><div class="n">Bảo dưỡng, lương<b>${fmt(t.upk)}</b></div>
    <div>Đầu tư (xe, tuyến, trạm)<b>${fmt(t.build)}</b></div><div class="${inc-exp>=0?'p':'n'}">Lãi vận hành<b>${fmt(inc-exp)}</b></div></div>
    <canvas id="chart"></canvas><div class="legend"><span><i style="background:#22c55e"></i>Thu</span><span><i style="background:#f87171"></i>Chi vận hành</span><span><i style="background:#0f766e"></i>Lãi</span></div>
    <div class="kpi"><div>Tổng hành khách<b>${S.paxTotal.toLocaleString('vi-VN')}</b></div><div>Xe đang chạy<b>${ass}/${S.buses.length}</b></div>
    <div>Tuyến đang mở<b>${Object.keys(S.opened).length}</b></div><div>Mái che đã xây<b>${Object.keys(S.shelters).length}</b></div></div>
    <div class="sub" style="margin-top:4px">Giá vé ${fmt(FARE)}/khách · trợ giá ${fmt(SUBSIDY_KM)}/km xe chạy</div>`, {t:'finance'});
  drawChart();
}
function drawChart(){
  const c=$('#chart'); if(!c) return; const dpr=devicePixelRatio||1; const W=c.clientWidth, H=c.clientHeight; c.width=W*dpr; c.height=H*dpr;
  const g=c.getContext('2d'); g.scale(dpr,dpr);
  const days=S.ledger.slice(-7); const inc=days.map(d=>d.fare+d.sub), exp=days.map(d=>d.fuel+d.upk);
  const mx=Math.max(1,...inc,...exp); const pad=26, bw=(W-pad-10)/days.length;
  g.font='10px sans-serif'; g.fillStyle='#94a3b8'; g.strokeStyle='#e2e8f0';
  for(let i=0;i<=3;i++){ const y=12+(H-34)*(1-i/3); g.beginPath(); g.moveTo(pad,y); g.lineTo(W-6,y); g.stroke(); g.fillText(fmt(mx*i/3).replace(' tr','tr'),2,y+3); }
  const Y=v=>12+(H-34)*(1-v/mx);
  days.forEach((d,i)=>{ const x=pad+i*bw+bw*0.15, w=bw*0.33;
    g.fillStyle='#22c55e'; roundBar(g,x,Y(inc[i]),w,H-22-Y(inc[i])); g.fillStyle='#f87171'; roundBar(g,x+w+2,Y(exp[i]),w,H-22-Y(exp[i]));
    g.fillStyle='#64748b'; g.fillText('N'+d.day, x, H-8); });
  g.strokeStyle='#0f766e'; g.lineWidth=2.5; g.beginPath();
  days.forEach((d,i)=>{ const x=pad+i*bw+bw*0.5, y=Y(clamp(inc[i]-exp[i],0,mx)); i?g.lineTo(x,y):g.moveTo(x,y); }); g.stroke();
}
function roundBar(g,x,y,w,h){ if(h<=0) return; const r=Math.min(4,w/2,h); g.beginPath(); g.moveTo(x,y+h); g.lineTo(x,y+r); g.quadraticCurveTo(x,y,x+r,y); g.lineTo(x+w-r,y); g.quadraticCurveTo(x+w,y,x+w,y+r); g.lineTo(x+w,y+h); g.fill(); }
function showStop(si){
  const st=D.stops[si], w=Math.floor(S.waiting[si]||0), sh=S.shelters[si];
  const rs=stopRoutes[si].map(x=>routeById[x]);
  openSheet(`<h2>🚏 ${esc(st[0])}</h2><div class="sub">Trạm thật trên OpenStreetMap · độ đông ${'🔥'.repeat(1+(stopW[si]>=__qs[0])+(stopW[si]>=__qs[1])+(stopW[si]>=__qs[2]))}</div>
    <div class="kpi"><div>Khách đang chờ<b style="color:${waitColor(w)}">${w} 👥</b></div><div>Mái che<b>${sh?'✅ Đã có':'❌ Chưa có'}</b></div></div>
    <div class="m">Tuyến đi qua: ${rs.map(r=>`<span class="badge" style="display:inline-grid;height:26px;min-width:34px;font-size:12px;margin:2px;background:${r.color}">${r.ref}</span>`).join('')}</div>
    ${sh?'<div class="sub" style="margin-top:10px">Mái che giúp khách chờ được lâu hơn, không ngại mưa và tăng 15% khách.</div>':`<button class="btn y full" data-shelter="${si}" ${S.money<SHELTER_COST?'disabled':''}>🏗️ Xây mái che · ${fmt(SHELTER_COST)}</button><div class="sub" style="margin-top:8px">Mái che: +15% khách, chứa được 120 người, khách không bực khi mưa.</div>`}`, {t:'stop',si});
  setTab(curTab,true);
}
function renderMore(){
  openSheet(`<h2>⚙️ Thêm</h2>
    <button class="btn full" data-tut>📖 Xem lại hướng dẫn</button>
    <button class="btn g full" data-saveg>💾 Lưu game ngay</button>
    <button class="btn r full" data-reset>🔄 Chơi lại từ đầu</button>
    <h3>Nguồn dữ liệu & hình ảnh</h3><div class="credits" id="cred">Đang tải…</div>`, {t:'more'});
  fetch('credits.json').then(r=>r.json()).then(c=>{ const el=$('#cred'); if(!el) return;
    el.innerHTML='<ul style="padding-left:16px">'+c.map(x=>`<li><b>${esc(x.what)}</b>: ${x.title?esc(x.title)+' – ':''}${esc(x.author)} · <a href="${x.licenseUrl}" target="_blank" rel="noopener">${esc(x.license)}</a> · <a href="${x.source}" target="_blank" rel="noopener">nguồn</a></li>`).join('')+'</ul><p>Game và hình xe trên bản đồ do tác giả tự vẽ bằng code. Dữ liệu tuyến có thể khác thực tế hiện tại.</p>'; }).catch(()=>{});
}
function esc(s){ return String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

/* ---------- Toast / modal / tutorial ---------- */
function toast(t){ const d=document.createElement('div'); d.className='toast'; d.textContent=t; $('#toasts').appendChild(d); setTimeout(()=>d.remove(),3200); while($('#toasts').children.length>3) $('#toasts').firstChild.remove(); }
function modal(html){ const m=$('#modal'); m.innerHTML=`<div class="dlg">${html}</div>`; m.classList.remove('hidden'); }
function closeModal(){ $('#modal').classList.add('hidden'); }
const TUT=[
  ['🚌','Chào mừng giám đốc!','Bạn vừa lập công ty xe buýt ở <b>TP.HCM</b>. Bản đồ, <b>'+'{R}'+' tuyến</b> và <b>{S} trạm</b> trong game đều là thật, lấy từ OpenStreetMap.'],
  ['🚏','Bước 1: Mở tuyến','Vào tab <b>🚏 Tuyến</b>, chọn một tuyến rồi bấm nút giá để mở. Gợi ý: tìm <b>"Bến Thành"</b> – nơi đông khách nhất.'],
  ['🛒','Bước 2: Mua xe','Vào <b>🚌 Đội xe</b> mua xe. Xe tự được giao cho tuyến và chạy theo <b>đường thật</b>, dừng ở <b>trạm thật</b> để đón khách.'],
  ['⏰','Giờ cao điểm & sự kiện','Khách đông lúc <b>6h–8h30</b> và <b>16h30–19h</b>. Coi chừng <b>mưa</b>, <b>kẹt xe</b> và tận dụng <b>lễ hội</b>! Chấm trạm đỏ = khách chờ quá đông.'],
  ['🏆','Lên cấp','Chở càng nhiều khách càng lên cấp, mở khóa <b>xe CNG</b>, <b>xe điện</b>, <b>xe 2 tầng</b>. Bấm vào trạm để xây <b>mái che</b>. Game tự lưu trên máy bạn.'],
];
function showTut(i){
  if(i>=TUT.length){ closeModal(); S.seen.tut=1; save(); return; }
  const [ic,h,p]=TUT[i];
  modal(`<div class="big">${ic}</div><h2>${h}</h2><p>${p.replace('{R}',D.routes.length).replace('{S}',D.stops.length.toLocaleString('vi-VN'))}</p><div class="dots">${TUT.map((_,k)=>`<i class="${k===i?'on':''}"></i>`).join('')}</div>
    <div class="row"><button class="btn g" style="flex:1" data-tutskip>Bỏ qua</button><button class="btn" style="flex:2" data-tutnext="${i+1}">${i===TUT.length-1?'Bắt đầu chơi!':'Tiếp theo'}</button></div>`);
}

/* ---------- Events (delegation) ---------- */
function bindUI(){
  document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
  document.querySelectorAll('.speed button').forEach(b=>b.onclick=()=>{ speedMul=+b.dataset.sp; document.querySelectorAll('.speed button').forEach(x=>x.classList.toggle('on',x===b)); });
  document.body.addEventListener('click',e=>{
    const t=e.target.closest('[data-open],[data-route],[data-buy],[data-sell],[data-shelter],[data-close],[data-tutnext],[data-tutskip],[data-tut],[data-reset],[data-saveg],[data-f],[data-assignidle],[data-tab2],[data-close-route]');
    if(!t) return; const ds=t.dataset;
    if(ds.open!==undefined){ e.stopPropagation(); openRoute(ds.open); }
    else if(ds.buy) buyBus(ds.buy);
    else if(ds.sell) sellBus(+ds.sell);
    else if(ds.shelter) buildShelter(+ds.shelter);
    else if(ds.close!==undefined) closeModal();
    else if(ds.tutnext) showTut(+ds.tutnext);
    else if(ds.tutskip!==undefined) showTut(99);
    else if(ds.tut!==undefined) showTut(0);
    else if(ds.saveg!==undefined){ save(); toast('💾 Đã lưu'); }
    else if(ds.reset!==undefined){ if(confirm('Xóa toàn bộ tiến trình và chơi lại?')){ localStorage.removeItem(SAVE_KEY); location.reload(); } }
    else if(ds.f){ routeFilter=ds.f; renderRoutes(); }
    else if(ds.assignidle){ S.buses.filter(b=>!b.r).forEach(b=>assign(b,ds.assignidle,true)); toast('Đã giao xe cho tuyến '+ds.assignidle); refreshSheet(); }
    else if(ds.tab2) setTab(ds.tab2);
    else if(ds.closeRoute) { if(confirm('Đóng tuyến '+ds.closeRoute+'? Xe sẽ về bãi.')) closeRoute(ds.closeRoute); }
    else if(ds.route) showRoute(ds.route);
  });
  document.body.addEventListener('change',e=>{ const s=e.target.closest('[data-assign]'); if(!s) return; const b=S.buses.find(x=>x.id===+s.dataset.assign); if(b){ assign(b,s.value||null); refreshSheet(); } });
  $('.grab').onclick=closeSheet;
  // swipe down to close sheet
  let y0=null; $('#sheet').addEventListener('touchstart',e=>{ if($('#sheet-body').scrollTop<=0) y0=e.touches[0].clientY; },{passive:true});
  $('#sheet').addEventListener('touchmove',e=>{ if(y0!==null && e.touches[0].clientY-y0>70){ y0=null; closeSheet(); } },{passive:true});
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) save(); });
  window.addEventListener('pagehide',save);
}

/* ---------- Render loop ---------- */
function resize(){ const dpr=Math.min(devicePixelRatio||1,2); for(const c of [$('#fx'),$('#rain')]){ c.width=innerWidth*dpr; c.height=innerHeight*dpr; c.style.width=innerWidth+'px'; c.style.height=innerHeight+'px'; c.getContext('2d').setTransform(dpr,0,0,dpr,0,0);} }
let drops=[]; for(let i=0;i<140;i++) drops.push({x:Math.random(),y:Math.random(),v:0.6+Math.random()*0.6});
function tintFor(h){ // multiply colors
  const keys=[[0,[70,85,150]],[4.5,[80,95,160]],[6,[255,218,190]],[7.5,[255,255,255]],[16.5,[255,255,255]],[18,[255,215,180]],[19.3,[110,115,175]],[24,[70,85,150]]];
  for(let i=0;i<keys.length-1;i++){ const [a,ca]=keys[i],[b,cb]=keys[i+1]; if(h>=a&&h<=b){ const f=(h-a)/(b-a); return ca.map((v,k)=>Math.round(v+(cb[k]-v)*f)); } } return [255,255,255];
}
let uiTick=0, stopTick=0;
function frame(ts){
  const dtReal=Math.min(0.1,(ts-(lastTs||ts))/1000); lastTs=ts;
  if(speedMul>0){ let dt=dtReal*MIN_PER_SEC*speedMul; while(dt>0){ const d=Math.min(dt,1); step(d); dt-=d; } }
  render(dtReal);
  uiTick+=dtReal; stopTick+=dtReal;
  if(uiTick>0.25){ uiTick=0; updateHud(); }
  if(stopTick>1){ stopTick=0; styleStops(); if(sheetCtx&&(sheetCtx.t==='finance'||sheetCtx.t==='stop')&&!document.activeElement.matches('input,select')) refreshSheet(); }
  requestAnimationFrame(frame);
}
function render(dt){
  const g=fxCtx, W=innerWidth, H=innerHeight; g.clearRect(0,0,W,H);
  const h=hour(), night = h<5.5||h>19;
  const c=tintFor(h); $('#tint').style.background=`rgb(${c})`;
  if(!zooming){
    const z=map.getZoom(), sc=clamp(1+(z-13)*0.3,0.8,1.9);
    for(const b of S.buses){ if(!b.r) continue; const r=routeById[b.r]; if(!r) continue;
      const p=posAt(r,b.s); const pt=map.latLngToContainerPoint([p.lat,p.lng]); if(pt.x<-40||pt.y<-40||pt.x>W+40||pt.y>H+40) continue;
      const a=r.g[p.i], bb=r.g[Math.min(p.i+1,r.g.length-1)];
      const pa=map.latLngToContainerPoint(a), pb=map.latLngToContainerPoint(bb);
      let ang=Math.atan2(pb.y-pa.y,pb.x-pa.x); if(b.d<0) ang+=Math.PI;
      const sp=sprites[b.m];
      g.save(); g.translate(pt.x,pt.y); g.rotate(ang); g.scale(sc,sc);
      if(night){ const gr=g.createRadialGradient(sp.w/2,0,2,sp.w/2+14,0,30); gr.addColorStop(0,'rgba(255,240,170,.75)'); gr.addColorStop(1,'rgba(255,240,170,0)'); g.fillStyle=gr; g.beginPath(); g.moveTo(sp.w/2-2,0); g.arc(sp.w/2-2,0,34,-0.45,0.45); g.fill(); }
      g.fillStyle='rgba(255,255,255,.9)'; g.beginPath(); g.roundRect(-sp.w/2+1.5,-sp.h/2+1.5,sp.w-3,sp.h-3,6); g.fill();
      g.drawImage(sp.c,-sp.w/2,-sp.h/2,sp.w,sp.h); g.restore();
      if(z>=14){ const M=MODELS[b.m], f=b.l/M.cap; const tx=pt.x, ty=pt.y-13*sc-8;
        g.fillStyle='rgba(15,23,42,.82)'; g.beginPath(); g.roundRect(tx-17,ty-8,34,15,7); g.fill();
        g.fillStyle=f>0.9?'#fca5a5':f>0.6?'#fde047':'#86efac'; g.font='bold 10px system-ui,sans-serif'; g.textAlign='center'; g.fillText(`${b.l}/${M.cap}`,tx,ty+3.5); }
    }
    g.textAlign='center';
    for(const f of floaters){ f.life-=dt*0.7; const pt=map.latLngToContainerPoint([f.lat,f.lng]); const y=pt.y-20-(1-f.life)*34;
      g.globalAlpha=clamp(f.life*1.5,0,1); g.font='900 14px system-ui,sans-serif'; g.lineWidth=4; g.strokeStyle='#fff'; g.strokeText(f.txt,pt.x,y); g.fillStyle='#15803d'; g.fillText(f.txt,pt.x,y); g.globalAlpha=1; }
    floaters=floaters.filter(f=>f.life>0).slice(-25);
    // festival marker
    if(S.event&&S.event.type==='fest'){ const pt=map.latLngToContainerPoint(S.event.p); const t=performance.now()/600; g.font='28px serif'; g.fillText('🎉',pt.x,pt.y-10+Math.sin(t)*4);
      g.strokeStyle='rgba(236,72,153,.5)'; g.lineWidth=3; g.beginPath(); g.arc(pt.x,pt.y,30+((t*20)%30),0,7); g.stroke(); }
  }
  // rain
  const rg=rainCtx; rg.clearRect(0,0,W,H);
  if(S.event&&S.event.type==='rain'){ rg.strokeStyle='rgba(180,200,255,.55)'; rg.lineWidth=1.2; rg.beginPath();
    for(const d of drops){ d.y+=d.v*dt*1.6; d.x-=dt*0.15; if(d.y>1){d.y=0;d.x=Math.random()*1.2;} const x=d.x*W, y=d.y*H; rg.moveTo(x,y); rg.lineTo(x-4,y+14); } rg.stroke();
    rg.fillStyle='rgba(40,60,100,.12)'; rg.fillRect(0,0,W,H); }
}
function updateHud(){
  const m=$('#money'); m.textContent=fmt(S.money); m.parentElement.classList.toggle('neg',S.money<0);
  $('#clock').textContent=hhmm(S.t); $('#daylbl').textContent='Ngày '+day()+(isRush(hour())?' 🔥':'');
  const h=hour(); $('#dayicon').textContent = h<5.5||h>=19?'🌙':h<7||h>=17.5?'🌅':'☀️';
  $('#lvl').textContent=S.level; const a=LEVEL_XP[S.level-1]||0, b=LEVEL_XP[S.level]||a+1; $('#xpbar').style.width=clamp((S.xp-a)/(b-a)*100,0,100)+'%';
  $('#sat').textContent=Math.round(S.sat)+'%';
  let pax=0; for(const b of S.buses) pax+=b.l; $('#paxnow').textContent=pax;
  const ev=$('#event'); if(S.event){ ev.textContent=S.event.txt; ev.classList.remove('hidden'); } else ev.classList.add('hidden');
}

/* ---------- Boot ---------- */
async function boot(){
  D = await (await fetch('data/hcm.json')).json();
  prepData(); S=load(); initMap(); for(const k in MODELS) sprites[k]=makeSprite(k);
  fxCtx=$('#fx').getContext('2d'); rainCtx=$('#rain').getContext('2d'); resize(); addEventListener('resize',resize);
  bindUI(); drawNetwork(); updateHud();
  const o=openRoutes(); if(o.length){ let b=L.latLngBounds(o[0].g); o.forEach(r=>b.extend(r.g)); map.fitBounds(b,{padding:[30,30],maxZoom:15}); }
  $('#loading').style.opacity=0; setTimeout(()=>$('#loading').remove(),500);
  if(!S.seen.tut) showTut(0);
  setInterval(save,10000);
  window.__game={S,D,MODELS,step,openRoute,buyBus,routeById}; window.__mapFly=(p,z)=>map.setView(p,z,{animate:false});
  requestAnimationFrame(frame);
}
boot().catch(e=>{ $('#loading p').textContent='Lỗi tải game: '+e.message; console.error(e); });
})();
