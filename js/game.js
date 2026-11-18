'use strict';
/* Xe Buýt Sài Gòn — game quản lý xe buýt TP.HCM.
   Dữ liệu tuyến/trạm & ranh giới: © OpenStreetMap contributors (ODbL). Bản đồ nền: OpenFreeMap / OpenMapTiles. */
(() => {
const SAVE_KEY = 'xebuyt-sg-v1';
const MIN_PER_SEC = 2;
const SUBSIDY_KM = 4000;
const SHELTER_COST = 800000;
const START_MONEY = 24000000;
const FARES = [5000,6000,7000,8000,10000];
const FARE_SAT = {5000:100,6000:90,7000:78,8000:62,10000:38};
const FARE_DEMAND = {5000:1.15,6000:1.07,7000:1,8000:0.9,10000:0.74};
const PALETTE = ['#0ea5e9','#f97316','#22c55e','#e11d48','#8b5cf6','#14b8a6','#eab308','#ec4899','#6366f1','#65a30d','#06b6d4','#f43f5e','#a855f7','#10b981','#f59e0b'];
const MODELS = {
  mini:{name:'Xe buýt nhỏ', desc:'Gọn, lanh lẹ trong phố', cap:30, speed:330, price:6000000, upk:400000, fuel:3000, lvl:1, comfort:50, color:'#38bdf8', len:16, img:'assets/bus-mini.jpg', icon:'bus_mini'},
  std: {name:'Xe buýt thường', desc:'Xe 60 chỗ quen thuộc', cap:60, speed:300, price:12000000, upk:700000, fuel:5000, lvl:1, comfort:60, color:'#2563eb', len:22, img:'assets/bus-std.jpg', icon:'bus_std'},
  cng: {name:'Xe buýt CNG', desc:'Chạy khí nén, rẻ nhiên liệu', cap:75, speed:300, price:18000000, upk:800000, fuel:3500, lvl:3, comfort:72, color:'#16a34a', len:24, img:'assets/bus-cng.jpg', icon:'bus_cng'},
  ev:  {name:'Xe buýt điện', desc:'Êm, mát, sạch – khách rất thích', cap:70, speed:310, price:28000000, upk:750000, fuel:1500, lvl:5, comfort:92, color:'#84cc16', len:24, img:'assets/bus-ev.jpg', icon:'bus_ev'},
  dd:  {name:'Xe buýt 2 tầng', desc:'Chở cực đông, ngắm phố', cap:110, speed:260, price:45000000, upk:1300000, fuel:7000, lvl:7, comfort:86, color:'#15803d', len:25, img:'assets/bus-dd.jpg', icon:'bus_dd'},
};
const LEVEL_XP = [0,800,2500,5000,8500,13000,19000,26000,35000,46000,60000,76000,95000,120000,150000];
const FESTIVALS = ['Lễ hội Áo dài','Đêm nhạc phố đi bộ','Hội chợ ẩm thực đường phố','Lễ hội Trung thu','Ngày hội sinh viên','Lễ hội Tết Nguyên đán'];
const CENTER = [10.7769, 106.7009];
const FACTORS = [
  {k:'wait',   n:'Thời gian chờ', ic:'stop',    w:.17, tip:'Thêm xe cho tuyến để khách không phải chờ lâu ở trạm.'},
  {k:'freq',   n:'Tần suất chuyến', ic:'calendar', w:.13, tip:'Tuyến dài cần nhiều xe hơn để có chuyến thường xuyên.'},
  {k:'crowd',  n:'Độ chật trên xe', ic:'people', w:.15, tip:'Xe quá tải: dùng xe lớn hơn (CNG, 2 tầng) hoặc thêm xe.'},
  {k:'comfort',n:'Tiện nghi xe',  ic:'bus',     w:.12, tip:'Xe điện và xe 2 tầng êm, mát hơn nhiều so với xe nhỏ.'},
  {k:'shelter',n:'Mái che trạm',  ic:'shelter', w:.10, tip:'Bấm vào trạm đông khách để xây mái che.'},
  {k:'weather',n:'Mưa & kẹt xe',  ic:'rain',    w:.10, tip:'Trạm có mái che giúp khách đỡ bực khi trời mưa.'},
  {k:'fare',   n:'Giá vé',        ic:'ticket',  w:.13, tip:'Giá vé cao làm khách khó chịu và đi ít hơn.'},
  {k:'reliab', n:'Đúng giờ',      ic:'jam',     w:.10, tip:'Giờ cao điểm và kẹt xe làm xe trễ chuyến.'},
];

const $ = s => document.querySelector(s);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const fmt = v => { const a=Math.abs(v), s=v<0?'-':''; if(a>=1e9) return s+(a/1e9).toFixed(2).replace('.',',')+' tỷ'; if(a>=1e6) return s+(a/1e6).toFixed(a>=1e8?0:1).replace('.',',')+' tr'; if(a>=1e3) return s+Math.round(a/1e3)+'k'; return s+Math.round(a)+'đ'; };
const hhmm = t => { const m=Math.floor(t)%1440; return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'); };
const esc = s => String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function dist(a,b){ const la=(a[0]+b[0])/2*Math.PI/180; return Math.hypot((a[0]-b[0])*111320,(a[1]-b[1])*111320*Math.cos(la)); }
const faceOf = s => s>=80?'face4':s>=60?'face3':s>=40?'face2':'face1';
const moodTxt = s => s>=80?'Rất hài lòng':s>=60?'Hài lòng':s>=40?'Tạm được':'Bực bội';
const satColor = s => s>=80?'#22c55e':s>=60?'#84cc16':s>=40?'#eab308':'#ef4444';

let D, S, map, routeById={}, stopW=[], stopRoutes=[], fxCtx, rainCtx, sprites={}, iconImg={}, boundary;
let speedMul=1, lastTs=0, floaters=[], curTab='map', sheetCtx=null, routeFilter='all', routeQuery='';
let viewDirty=true, stopScreen=[], previewRef=null, mapReady=false, frameSkip=0, dpr=1;

/* ---------- Model ---------- */
function stopWeight(name,p){
  let w=0.6; const n=name.toLowerCase();
  const K=[[/bến thành/,2.5],[/chợ/,1.0],[/bến xe/,1.6],[/đại học|đh |trường đh|ký túc|ktx/,1.4],[/bệnh viện|bv /,1.0],[/siêu thị|co\.?op|big c|aeon|vincom|lotte|emart|go!|mall|plaza/,1.1],[/sân bay|tân sơn nhất/,1.6],[/ga /,0.8],[/công viên/,0.6],[/trường|thpt|thcs/,0.5],[/khu công nghiệp|kcn|khu chế xuất/,1.0],[/nhà thờ|chùa/,0.3],[/ngã tư|ngã ba|vòng xoay/,0.4],[/ubnd|quận/,0.3]];
  for(const [re,v] of K) if(re.test(n)) w+=v;
  const dc=dist(p,CENTER); w+=1.8*Math.exp(-dc/3500)+0.6*Math.exp(-dc/9000);
  return clamp(w,0.4,5);
}
function hourFactor(h){ if(h<5) return .05; if(h<6) return .5; if(h<8.5) return 1.9; if(h<11) return 1; if(h<13) return 1.2; if(h<16.5) return .9; if(h<19) return 2; if(h<22) return .8; return .2; }
const isRush = h => (h>=6&&h<8.5)||(h>=16.5&&h<19);
function newState(){ return {v:1, money:START_MONEY, t:6*60, xp:0, level:1, sat:70, opened:{}, buses:[], shelters:{}, waiting:{}, nextId:1,
  ledger:[{day:1,fare:0,sub:0,fuel:0,upk:0,build:0,bonus:0}], paxTotal:0, event:null, seen:{}, fare:7000, rsat:{}, opt:{fps:60}}; }
function migrate(s){ s.fare=s.fare||7000; s.rsat=s.rsat||{}; s.opt=s.opt||{fps:60}; for(const l of s.ledger) l.bonus=l.bonus||0; return s; }
function save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }catch(e){} }
function load(){ try{ const s=JSON.parse(localStorage.getItem(SAVE_KEY)); if(s&&s.v===1){ s.buses=s.buses.filter(b=>MODELS[b.m]); for(const b of s.buses) if(b.r&&!routeById[b.r]) b.r=null; for(const k in s.opened) if(!routeById[k]) delete s.opened[k]; return migrate(s);} }catch(e){} return newState(); }
const today=()=>S.ledger[S.ledger.length-1];
const day=()=>Math.floor(S.t/1440)+1;
const hour=()=>(S.t%1440)/60;

function prepData(){
  D.stops.forEach((s,i)=>{ stopW[i]=stopWeight(s[0],[s[1],s[2]]); stopRoutes[i]=[]; });
  D.routes.forEach((r,i)=>{
    r.color=PALETTE[i%PALETTE.length];
    r.cum=[0]; for(let k=1;k<r.g.length;k++) r.cum.push(r.cum[k-1]+dist(r.g[k-1],r.g[k]));
    r.sd=r.s.map(x=>Math.min(x[1],r.cum[r.cum.length-1])); r.si=r.s.map(x=>x[0]);
    r.si.forEach(si=>stopRoutes[si].push(r.ref));
    r.km=r.len/1000;
    r.cost=Math.round((3000000+r.km*250000+r.si.length*40000)/100000)*100000;
    r.pot=r.si.reduce((a,s)=>a+stopW[s],0)/r.si.length;
    r.title=(r.name||'').replace(/^Số\s*\S+\s*[:\-–]?\s*/,'')||((r.from||'')+' – '+(r.to||''));
    r.ll=r.g.map(p=>[p[1],p[0]]);
    routeById[r.ref]=r;
  });
  const pots=D.routes.map(r=>r.pot).sort((a,b)=>a-b), q=x=>pots[Math.floor(pots.length*x)];
  D.routes.forEach(r=>r.fire=r.pot>=q(.85)?4:r.pot>=q(.6)?3:r.pot>=q(.3)?2:1);
  const sw=[...stopW].sort((a,b)=>a-b), qs=x=>sw[Math.floor(sw.length*x)];
  D.qs=[qs(.5),qs(.8),qs(.95)];
}
const stopFire = si => 1+(stopW[si]>=D.qs[0])+(stopW[si]>=D.qs[1])+(stopW[si]>=D.qs[2]);
function posAt(r,s){ const c=r.cum; let lo=0,hi=c.length-1; while(hi-lo>1){ const m=(lo+hi)>>1; if(c[m]<=s) lo=m; else hi=m; }
  const a=r.g[lo], b=r.g[hi], f=clamp((s-c[lo])/((c[hi]-c[lo])||1),0,1); return {lat:a[0]+(b[0]-a[0])*f, lng:a[1]+(b[1]-a[1])*f, i:lo}; }
function openRoutes(){ return Object.keys(S.opened).map(k=>routeById[k]).filter(Boolean); }
let servedCache=null;
function servedStops(){ if(servedCache) return servedCache; const set=new Set(); for(const r of openRoutes()) r.si.forEach(s=>set.add(s)); return servedCache=[...set]; }
const busCount = ref => S.buses.reduce((a,b)=>a+(b.r===ref),0);
const rsat = ref => (S.rsat[ref]&&S.rsat[ref].s) ?? 70;

/* ---------- Map (MapLibre, style tối giản tự làm) ---------- */
function lightStyle(){
  const roadW=(a,b)=>['interpolate',['exponential',1.5],['zoom'],10,a,16,b];
  return {version:8, glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources:{omt:{type:'vector', url:'https://tiles.openfreemap.org/planet', attribution:'<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank">OpenMapTiles</a> · Dữ liệu © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'}},
    layers:[
      {id:'bg', type:'background', paint:{'background-color':'#eef2ea'}},
      {id:'green', type:'fill', source:'omt', 'source-layer':'park', minzoom:10, paint:{'fill-color':'#d3ebcb','fill-opacity':.8}},
      {id:'wood', type:'fill', source:'omt', 'source-layer':'landcover', minzoom:9, filter:['in',['get','class'],['literal',['wood','grass','wetland']]], paint:{'fill-color':'#dcefd4','fill-opacity':.7}},
      {id:'water', type:'fill', source:'omt', 'source-layer':'water', paint:{'fill-color':'#a7d8f2'}},
      {id:'river', type:'line', source:'omt', 'source-layer':'waterway', minzoom:11, filter:['in',['get','class'],['literal',['river','canal']]], paint:{'line-color':'#a7d8f2','line-width':['interpolate',['linear'],['zoom'],11,1,16,4]}},
      {id:'minor', type:'line', source:'omt', 'source-layer':'transportation', minzoom:14.5, filter:['in',['get','class'],['literal',['minor','service']]], layout:{'line-cap':'round'}, paint:{'line-color':'#ffffff','line-width':['interpolate',['linear'],['zoom'],14.5,1,18,6]}},
      {id:'sec-case', type:'line', source:'omt', 'source-layer':'transportation', minzoom:12, filter:['in',['get','class'],['literal',['secondary','tertiary']]], layout:{'line-cap':'round','line-join':'round'}, paint:{'line-color':'#dfe3e8','line-width':roadW(1.4,8)}},
      {id:'sec', type:'line', source:'omt', 'source-layer':'transportation', minzoom:12, filter:['in',['get','class'],['literal',['secondary','tertiary']]], layout:{'line-cap':'round','line-join':'round'}, paint:{'line-color':'#ffffff','line-width':roadW(.8,6)}},
      {id:'maj-case', type:'line', source:'omt', 'source-layer':'transportation', minzoom:9, filter:['in',['get','class'],['literal',['motorway','trunk','primary']]], layout:{'line-cap':'round','line-join':'round'}, paint:{'line-color':'#e8cf9a','line-width':roadW(1.6,11)}},
      {id:'maj', type:'line', source:'omt', 'source-layer':'transportation', minzoom:9, filter:['in',['get','class'],['literal',['motorway','trunk','primary']]], layout:{'line-cap':'round','line-join':'round'}, paint:{'line-color':['match',['get','class'],'motorway','#ffd98a','#fff3cf'],'line-width':roadW(.9,8.5)}},
      {id:'roadname', type:'symbol', source:'omt', 'source-layer':'transportation_name', minzoom:15, filter:['in',['get','class'],['literal',['trunk','primary','secondary']]], layout:{'symbol-placement':'line','text-field':['coalesce',['get','name:vi'],['get','name']],'text-font':['Noto Sans Regular'],'text-size':11}, paint:{'text-color':'#8a7f6a','text-halo-color':'#fff','text-halo-width':1.4}},
      {id:'place', type:'symbol', source:'omt', 'source-layer':'place', minzoom:9, filter:['in',['get','class'],['literal',['city','town','suburb']]], layout:{'text-field':['coalesce',['get','name:vi'],['get','name']],'text-font':['Noto Sans Bold'],'text-size':['interpolate',['linear'],['zoom'],9,10,14,13],'text-transform':'uppercase','text-letter-spacing':.06,'text-max-width':8}, paint:{'text-color':'#5b6b7a','text-halo-color':'rgba(255,255,255,.9)','text-halo-width':1.6}},
    ]};
}
function worldMask(){ const g=boundary.geometry; const rings=g.type==='Polygon'?[g.coordinates[0]]:g.coordinates.map(p=>p[0]);
  return {type:'Feature',geometry:{type:'Polygon',coordinates:[[[-180,-85],[180,-85],[180,85],[-180,85],[-180,-85]],...rings.map(r=>[...r].reverse())]}}; }
function bbox(g){ let a=[999,999,-999,-999]; const walk=c=>{ if(typeof c[0]==='number'){ a[0]=Math.min(a[0],c[0]);a[1]=Math.min(a[1],c[1]);a[2]=Math.max(a[2],c[0]);a[3]=Math.max(a[3],c[1]); } else c.forEach(walk); }; walk(g.coordinates); return a; }
function initMap(){
  const b=bbox(boundary.geometry), pad=0.06;
  dpr=Math.min(devicePixelRatio||1, 2);
  map=new maplibregl.Map({container:'map', style:lightStyle(), center:[106.70,10.776], zoom:13.2, minZoom:9, maxZoom:18,
    maxBounds:[[b[0]-pad,b[1]-pad],[b[2]+pad,b[3]+pad]], dragRotate:false, pitchWithRotate:false, touchPitch:false,
    pixelRatio:Math.min(devicePixelRatio||1,1.5), fadeDuration:0, attributionControl:false, maxTileCacheSize:200});
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-left');
  map.on('move',()=>{viewDirty=true;}); map.on('resize',()=>{viewDirty=true;});
  map.on('load',()=>{
    map.addSource('mask',{type:'geojson',data:worldMask()});
    map.addLayer({id:'mask',type:'fill',source:'mask',paint:{'fill-color':'#0f3b3a','fill-opacity':.55}});
    map.addSource('hcm',{type:'geojson',data:boundary});
    map.addLayer({id:'hcm-glow',type:'line',source:'hcm',paint:{'line-color':'#14b8a6','line-width':7,'line-opacity':.25}});
    map.addLayer({id:'hcm-line',type:'line',source:'hcm',paint:{'line-color':'#0f766e','line-width':2,'line-dasharray':[3,2]}});
    map.addSource('net',{type:'geojson',data:fc([])});
    map.addLayer({id:'net',type:'line',source:'net',layout:{'line-join':'round'},paint:{'line-color':'#64748b','line-width':['interpolate',['linear'],['zoom'],10,.8,15,2.2],'line-opacity':.3}});
    map.addSource('preview',{type:'geojson',data:fc([])});
    map.addLayer({id:'preview-case',type:'line',source:'preview',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#fff','line-width':['interpolate',['linear'],['zoom'],10,4,16,11]}});
    map.addLayer({id:'preview',type:'line',source:'preview',layout:{'line-join':'round'},paint:{'line-color':['get','color'],'line-width':['interpolate',['linear'],['zoom'],10,2.2,16,6],'line-dasharray':[2,1.4]}});
    map.addSource('open',{type:'geojson',data:fc([])});
    map.addLayer({id:'open-case',type:'line',source:'open',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#fff','line-width':['interpolate',['linear'],['zoom'],10,4,16,12]}});
    map.addLayer({id:'open',type:'line',source:'open',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':['get','color'],'line-width':['interpolate',['linear'],['zoom'],10,2.4,16,7]}});
    mapReady=true; drawNetwork(); fitOpen(false);
  });
  map.on('click',onMapClick);
}
const fc = f => ({type:'FeatureCollection',features:f});
const lineF = r => ({type:'Feature',properties:{ref:r.ref,color:r.color},geometry:{type:'LineString',coordinates:r.ll}});
function drawNetwork(){
  servedCache=null; viewDirty=true; if(!mapReady) return;
  map.getSource('net').setData(fc(D.routes.filter(r=>!S.opened[r.ref]).map(lineF)));
  map.getSource('open').setData(fc(openRoutes().map(lineF)));
}
function setPreview(r){ previewRef=r&&!S.opened[r.ref]?r.ref:null; viewDirty=true; if(mapReady) map.getSource('preview').setData(fc(previewRef?[lineF(r)]:[])); }
function fitOpen(anim=true){ const o=openRoutes(); if(!o.length){ map.flyTo({center:[106.70,10.776],zoom:13.2}); return; } fitRoutes(o,anim); }
function fitRoutes(rs,anim=true,bottom=40){ let b=[999,999,-999,-999]; rs.forEach(r=>r.ll.forEach(p=>{b[0]=Math.min(b[0],p[0]);b[1]=Math.min(b[1],p[1]);b[2]=Math.max(b[2],p[0]);b[3]=Math.max(b[3],p[1]);}));
  map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:{top:120,left:24,right:24,bottom:bottom+90},maxZoom:15,duration:anim?700:0}); }
function onMapClick(e){
  const p=e.point, z=map.getZoom();
  // xe buýt
  let best=null,bd=22;
  for(const b of S.buses){ if(!b.r||!b._p) continue; const d=Math.hypot(b._p[0]-p.x,b._p[1]-p.y); if(d<bd){bd=d;best=b;} }
  if(best) return showRoute(best.r);
  if(z>=12){ let bs=null,sd=16; for(const s of stopScreen){ const d=Math.hypot(s[1]-p.x,s[2]-p.y); if(d<sd){sd=d;bs=s[0];} } if(bs!==null) return showStop(bs); }
  const f=map.queryRenderedFeatures([[p.x-10,p.y-10],[p.x+10,p.y+10]],{layers:['open','preview','net']});
  if(f.length) return showRoute(f[0].properties.ref);
  if(curTab==='map') closeSheet();
}

/* ---------- Sprites ---------- */
function makeSprite(model){
  const M=MODELS[model], sc=3, L_=M.len, W=10, c=document.createElement('canvas'); c.width=(L_+6)*sc; c.height=(W+6)*sc;
  const g=c.getContext('2d'); g.scale(sc,sc); g.translate(3,3);
  const rr=(x,y,w,h,r)=>{g.beginPath();g.roundRect(x,y,w,h,r);};
  g.shadowColor='rgba(0,0,0,.35)'; g.shadowBlur=3; g.shadowOffsetY=1.5;
  g.fillStyle='#fff'; rr(-1.2,-1.2,L_+2.4,W+2.4,4); g.fill(); g.shadowColor='transparent';
  g.fillStyle=M.color; rr(0,0,L_,W,3); g.fill();
  g.fillStyle='rgba(255,255,255,.25)'; rr(1,1,L_-2,3,1.5); g.fill();
  g.fillStyle='#bae6fd'; rr(L_-4.2,1.2,3.2,W-2.4,1.2); g.fill();
  g.fillStyle='rgba(15,23,42,.55)'; for(let x=2.5;x<L_-6;x+=3.4){ rr(x,.6,2.4,1.4,.5); g.fill(); rr(x,W-2,2.4,1.4,.5); g.fill(); }
  g.fillStyle=model==='ev'?'#d9f99d':model==='dd'?'#fde047':'#fff'; rr(3,W/2-1.2,L_-9,2.4,1.2); g.fill();
  if(model==='dd'){ g.fillStyle='rgba(255,255,255,.35)'; rr(2,2.5,L_-7,W-5,1.5); g.fill(); }
  g.fillStyle='#fef08a'; g.fillRect(L_-.8,1,.8,1.6); g.fillRect(L_-.8,W-2.6,.8,1.6);
  g.fillStyle='#f87171'; g.fillRect(0,1,.7,1.6); g.fillRect(0,W-2.6,.7,1.6);
  return {c,w:L_+6,h:W+6};
}
function loadIcons(){ return Promise.all(['face1','face2','face3','face4','office','fest','shelter'].map(n=>new Promise(res=>{ const im=new Image(); im.onload=()=>{im.ok=1;res();}; im.onerror=()=>res(); im.src=ICON_SRC(n); iconImg[n]=im; }))); }

/* ---------- Satisfaction ---------- */
function computeRouteSat(r){
  const buses=S.buses.filter(b=>b.r===r.ref), n=buses.length, f={};
  let wsum=0; for(const si of r.si) wsum+=(S.waiting[si]||0); const wavg=wsum/r.si.length;
  f.wait = clamp(100-(wavg-6)*2.4,0,100);
  const avgSpeed=n?buses.reduce((a,b)=>a+MODELS[b.m].speed,0)/n:300;
  const headway = n? (2*r.len/avgSpeed)/n : 999; // phút
  f.freq = n? clamp(100-(headway-15)*0.9,0,100) : 0;
  f.crowd = n? clamp(100-buses.reduce((a,b)=>a+Math.max(0,b.l/MODELS[b.m].cap-0.75),0)/n*250,0,100) : 50;
  f.comfort = n? buses.reduce((a,b)=>a+MODELS[b.m].comfort,0)/n : 50;
  const sh=r.si.filter(si=>S.shelters[si]).length/r.si.length; f.shelter=35+65*Math.min(1,sh*2.5);
  const e=S.event; f.weather=100; if(e&&e.type==='rain') f.weather=100-60*(1-Math.min(1,sh*2.5)); if(e&&e.type==='jam'&&e.route===r.ref) f.weather=Math.min(f.weather,45);
  f.fare=FARE_SAT[S.fare]; f.reliab = (isRush(hour())?72:95) - (e&&e.type==='jam'&&e.route===r.ref?35:0) - (e&&e.type==='rain'?10:0);
  let target=0; for(const F of FACTORS) target+=F.w*f[F.k];
  return {target,f,headway,n,wavg};
}
function updateSat(rate){
  let tot=0, wt=0;
  for(const r of openRoutes()){
    const c=computeRouteSat(r); const o=S.rsat[r.ref]||(S.rsat[r.ref]={s:70});
    o.s=clamp(o.s+(c.target-o.s)*rate,0,100); o.f=c.f; o.hw=c.headway;
    const w=1+(S.opened[r.ref].pax||0); tot+=o.s*w; wt+=w;
  }
  if(wt) S.sat=tot/wt;
}
function stopMood(si){ // 0..100 cho mặt cười ở trạm
  const w=S.waiting[si]||0, sh=S.shelters[si]; let m=100-w*1.3+(sh?10:0); if(S.event&&S.event.type==='rain'&&!sh) m-=25; return clamp(m,0,100);
}
function stopSatFactor(si){ let best=0; for(const ref of stopRoutes[si]) if(S.opened[ref]) best=Math.max(best,rsat(ref)); return 0.5+best/100; }

/* ---------- Simulation ---------- */
function eventSpeed(r){ let f=1; const e=S.event; if(e){ if(e.type==='rain') f*=.85; if(e.type==='jam'&&e.route===r.ref) f*=.45; } if(isRush(hour())) f*=.8; return f; }
function spawnFactor(si){
  let f=hourFactor(hour())*stopSatFactor(si)*FARE_DEMAND[S.fare];
  if(S.shelters[si]) f*=1.15;
  const e=S.event; if(e){ if(e.type==='rain') f*=S.shelters[si]?1.25:.9; if(e.type==='fest'&&dist([D.stops[si][1],D.stops[si][2]],e.p)<1600) f*=3; }
  return f;
}
function addMoney(v,cat){ S.money+=v; const t=today(); t[cat]=(t[cat]||0)+Math.abs(v); }
function step(dt){
  const prevDay=day(), prevH=Math.floor(hour()), prev10=Math.floor(S.t/10);
  S.t+=dt;
  for(const si of servedStops()){ const cap=S.shelters[si]?120:80; S.waiting[si]=Math.min(cap,(S.waiting[si]||0)+0.022*stopW[si]*spawnFactor(si)*dt); }
  for(const b of S.buses){
    const M=MODELS[b.m]; addMoney(-M.upk/1440*dt,'upk');
    if(!b.r) continue; const r=routeById[b.r]; if(!r){ b.r=null; continue; }
    if(b.dw>0){ b.dw-=dt; continue; }
    const before=b.s; b.s+=b.d*M.speed*eventSpeed(r)*dt;
    const target=r.sd[b.k]; if((b.d>0&&b.s>=target)||(b.d<0&&b.s<=target)){ b.s=target; arrive(b,r,M); }
    const km=Math.abs(b.s-before)/1000; b.km+=km; addMoney(-M.fuel*km,'fuel'); addMoney(SUBSIDY_KM*km,'sub');
  }
  if(Math.floor(S.t/10)!==prev10) updateSat(0.18);
  if(Math.floor(hour())!==prevH) hourly();
  if(day()!==prevDay) newDay(prevDay);
}
function arrive(b,r,M){
  const si=r.si[b.k], last=b.k===0||b.k===r.si.length-1;
  const off=last?b.l:Math.round(b.l*clamp(.02+.03*stopW[si],.03,.3)); b.l-=off;
  const on=Math.min(Math.floor(S.waiting[si]||0), M.cap-b.l);
  if(last){ b.d=-b.d; b.trips=(b.trips||0)+1; }
  b.k=clamp(b.k+b.d,0,r.si.length-1);
  S.waiting[si]=(S.waiting[si]||0)-on; b.l+=on;
  if(on>0){ const rev=on*S.fare; addMoney(rev,'fare'); S.xp+=Math.round(on*(S.sat>=80?1.2:1)); S.paxTotal+=on;
    const o=S.opened[r.ref]; o.pax=(o.pax||0)+on; o.rev=(o.rev||0)+rev;
    if(on>=3&&floaters.length<20) floaters.push({lat:D.stops[si][1],lng:D.stops[si][2],txt:'+'+fmt(rev),life:1}); checkLevel(); }
  b.dw=(last?8:.8)+(on+off)*.08;
}
function checkLevel(){
  while(S.level<LEVEL_XP.length&&S.xp>=LEVEL_XP[S.level]){
    S.level++; const un=Object.values(MODELS).filter(m=>m.lvl===S.level); const bonus=S.level*600000; S.money+=bonus;
    modal(`<div class="big">${ICON('trophy',72)}</div><h2>Lên cấp ${S.level}!</h2><p>Thưởng <b>${fmt(bonus)}</b>.${un.length?'<br>Mở khóa: <b>'+un.map(m=>m.name).join(', ')+'</b>':''}</p>${un.map(m=>ICON(m.icon,64)).join('')}<button class="btn full" data-close>Tuyệt!</button>`);
  }
}
function hourly(){
  const e=S.event;
  if(e&&S.t>=e.end){ toast(e.type==='rain'?'Trời đã tạnh mưa':e.type==='jam'?'Hết kẹt xe trên tuyến '+e.route:'Lễ hội đã kết thúc', e.type==='rain'?'sun':e.type==='jam'?'check':'fest'); S.event=null; }
  else if(!e&&openRoutes().length&&Math.random()<.13){
    const x=Math.random(), o=openRoutes();
    if(x<.38) S.event={type:'rain',end:S.t+90+Math.random()*120,txt:'Mưa lớn! Xe chạy chậm, khách ở trạm không mái che bực bội'};
    else if(x<.72){ const r=o[Math.floor(Math.random()*o.length)]; S.event={type:'jam',route:r.ref,end:S.t+60+Math.random()*90,txt:`Kẹt xe trên tuyến ${r.ref}! Xe chạy chậm hẳn`}; }
    else { const sv=[...servedStops()].sort((a,b)=>stopW[b]-stopW[a]).slice(0,25), si=sv[Math.floor(Math.random()*sv.length)], nm=FESTIVALS[Math.floor(Math.random()*FESTIVALS.length)];
      S.event={type:'fest',p:[D.stops[si][1],D.stops[si][2]],end:S.t+120+Math.random()*60,txt:`${nm} gần trạm ${D.stops[si][0]}: khách tăng gấp 3!`}; }
    toast(S.event.txt, evIcon(S.event));
  }
  const hr=Math.floor(hour()); if(hr===6) toast('Giờ cao điểm sáng! Khách đổ ra trạm','sunrise'); if(hr===17) toast('Giờ cao điểm chiều! Tăng xe cho tuyến đông','fire');
}
const evIcon = e => e.type==='rain'?'rain':e.type==='jam'?'jam':'fest';
function newDay(prev){
  const t=today(); let msg='';
  if(openRoutes().length){
    if(S.sat>=75){ const bn=Math.round((S.sat-75)*200000*Math.max(1,openRoutes().length)/100000)*100000; if(bn>0){ addMoney(bn,'bonus'); msg=` · Thưởng hài lòng +${fmt(bn)}`; } }
    else if(S.sat<35){ const pn=Math.round((35-S.sat)*100000/100000)*100000; addMoney(-pn,'bonus'); t.bonus-=2*pn; msg=` · Phạt chất lượng -${fmt(pn)}`; }
  }
  const inc=t.fare+t.sub+Math.max(0,t.bonus), exp=t.fuel+t.upk+Math.max(0,-t.bonus);
  toast(`Hết ngày ${prev}: ${inc-exp>=0?'lãi':'lỗ'} ${fmt(Math.abs(inc-exp))}${msg}`,'calendar');
  S.ledger.push({day:day(),fare:0,sub:0,fuel:0,upk:0,build:0,bonus:0}); if(S.ledger.length>30) S.ledger.shift();
  for(const k in S.opened){ S.opened[k].pax=0; S.opened[k].rev=0; }
}

/* ---------- Actions ---------- */
function openRoute(ref){ const r=routeById[ref]; if(S.opened[ref]) return; if(S.money<r.cost) return toast('Không đủ tiền mở tuyến','coin');
  addMoney(-r.cost,'build'); S.opened[ref]={at:S.t,pax:0,rev:0}; S.rsat[ref]={s:70}; setPreview(null); drawNetwork(); fitRoutes([r]);
  toast(`Đã mở tuyến ${ref}! Giờ hãy mua xe cho tuyến`,'check'); save(); refreshSheet(); }
function closeRoute(ref){ for(const b of S.buses) if(b.r===ref) b.r=null; delete S.opened[ref]; delete S.rsat[ref]; drawNetwork(); toast('Đã đóng tuyến '+ref,'info'); save(); refreshSheet(); }
function buyBus(m){ const M=MODELS[m]; if(S.level<M.lvl) return toast('Cần cấp '+M.lvl,'lock'); if(S.money<M.price) return toast('Không đủ tiền mua xe','coin');
  addMoney(-M.price,'build'); const b={id:S.nextId++,m,r:null,s:0,d:1,k:0,l:0,dw:0,km:0,trips:0}; S.buses.push(b);
  const o=openRoutes(); if(o.length){ const pick=(sheetCtx&&sheetCtx.ref&&S.opened[sheetCtx.ref])?routeById[sheetCtx.ref]:o.sort((a,c)=>busCount(a.ref)-busCount(c.ref))[0]; assign(b,pick.ref,true); toast(`Đã mua ${M.name} #${b.id} cho tuyến ${pick.ref}`,M.icon); }
  else toast(`Đã mua ${M.name} #${b.id}. Mở tuyến để giao xe`,M.icon);
  save(); refreshSheet(); }
function assign(b,ref,silent){ b.r=ref||null; b.l=0; b.dw=1;
  if(ref){ const r=routeById[ref], n=busCount(ref)-1, k=Math.floor(((n*.618)%1)*(r.si.length-1)); b.k=k; b.s=r.sd[k]; b.d=k>=r.si.length-1?-1:1; if(!silent) toast(`Xe #${b.id} chạy tuyến ${ref}`,'bus'); }
  save(); }
function sellBus(id){ const i=S.buses.findIndex(b=>b.id===id); if(i<0) return; const M=MODELS[S.buses[i].m]; S.money+=M.price*.5; S.buses.splice(i,1); toast('Đã bán xe, nhận lại '+fmt(M.price*.5),'coin'); save(); refreshSheet(); }
function buildShelter(si){ if(S.shelters[si]) return; if(S.money<SHELTER_COST) return toast('Không đủ tiền','coin'); addMoney(-SHELTER_COST,'build'); S.shelters[si]=1; viewDirty=true; toast('Đã xây mái che ở trạm '+D.stops[si][0],'shelter'); save(); showStop(si); }
function setFare(f){ S.fare=f; toast('Giá vé mới: '+fmt(f),'ticket'); save(); refreshSheet(); }

/* ---------- UI ---------- */
function openSheet(html,ctx){ $('#sheet-body').innerHTML=html; $('#sheet').classList.remove('closed'); sheetCtx=ctx; }
function closeSheet(){ $('#sheet').classList.add('closed'); sheetCtx=null; setPreview(null); setTab('map',true); }
function refreshSheet(){ if(!sheetCtx) return; const c=sheetCtx, sc=$('#sheet-body').scrollTop;
  ({routes:renderRoutes,route:()=>showRoute(c.ref,true),fleet:renderFleet,finance:renderFinance,stop:()=>showStop(c.si),more:renderMore,sat:renderSat})[c.t]?.(); $('#sheet-body').scrollTop=sc; }
function setTab(t,noOpen){ curTab=t; document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t)); if(noOpen) return; setPreview(null);
  if(t==='map') closeSheet(); else if(t==='routes') renderRoutes(); else if(t==='fleet') renderFleet(); else if(t==='finance') renderFinance(); else renderMore(); }
const badge = (r,small) => `<span class="badge${small?' sm':''}" style="background:${r.color}">${esc(r.ref)}</span>`;
const fires = n => `<span class="fires">${ICON('fire',14).repeat(n)}</span>`;
function renderRoutes(){
  const q=routeQuery.toLowerCase();
  const list=D.routes.filter(r=>{ if(routeFilter==='open'&&!S.opened[r.ref]) return false; if(routeFilter==='new'&&S.opened[r.ref]) return false;
    return !q||(r.ref+' '+r.name+' '+r.si.map(s=>D.stops[s][0]).join(' ')).toLowerCase().includes(q); });
  const items=list.slice(0,60).map(r=>{ const o=S.opened[r.ref];
    return `<div class="card" data-route="${esc(r.ref)}">${badge(r)}<div class="grow"><div class="t">${esc(r.title)}</div><div class="m">${r.km.toFixed(1)} km · ${r.si.length} trạm · ${fires(r.fire)}${o?` · ${ICON('bus',14)} ${busCount(r.ref)}`:''}</div></div>
      ${o?`<span class="mood">${ICON(faceOf(rsat(r.ref)),30)}<small>${Math.round(rsat(r.ref))}%</small></span>`:`<button class="btn y" data-open="${esc(r.ref)}" ${S.money<r.cost?'disabled':''}>${fmt(r.cost)}</button>`}</div>`; }).join('');
  openSheet(`<h2>${ICON('stop',28)} Tuyến xe buýt thật</h2><div class="sub">${D.routes.length} tuyến TP.HCM từ OpenStreetMap · ${ICON('fire',13)} = độ đông khách</div>
    <input class="search" id="rq" placeholder="Tìm số tuyến hoặc tên trạm (vd: Bến Thành)" value="${esc(routeQuery)}">
    <div class="seg"><button data-f="all" class="${routeFilter==='all'?'on':''}">Tất cả</button><button data-f="open" class="${routeFilter==='open'?'on':''}">Đã mở (${Object.keys(S.opened).length})</button><button data-f="new" class="${routeFilter==='new'?'on':''}">Chưa mở</button></div>
    ${items||'<div class="empty">Không tìm thấy tuyến nào</div>'}${list.length>60?'<div class="empty">…gõ để tìm thêm tuyến</div>':''}`,{t:'routes'});
  const el=$('#rq'); el.oninput=()=>{ routeQuery=el.value; const p=el.selectionStart; renderRoutes(); const n=$('#rq'); n.focus(); n.setSelectionRange(p,p); };
}
function factorBars(f){ return FACTORS.map(F=>{ const v=Math.round(f[F.k]??0); return `<div class="fac">${ICON(F.ic,22)}<span class="fn">${F.n}</span><div class="fbar"><i style="width:${v}%;background:${satColor(v)}"></i></div><b>${v}</b></div>`; }).join(''); }
function tipsFor(f,max=3){ return FACTORS.map(F=>({F,v:f[F.k]??0})).filter(x=>x.v<70).sort((a,b)=>a.v-b.v).slice(0,max).map(x=>`<div class="tip">${ICON(x.F.ic,20)}<span><b>${x.F.n} (${Math.round(x.v)})</b>: ${x.F.tip}</span></div>`).join('') || `<div class="tip">${ICON('check',20)}<span>Mọi thứ đang rất ổn, tiếp tục phát huy!</span></div>`; }
function showRoute(ref,keep){
  const r=routeById[ref]; if(!r) return; const o=S.opened[ref];
  if(!keep){ setPreview(r); fitRoutes([r],true,innerHeight*.5); }
  const buses=S.buses.filter(b=>b.r===ref), idle=S.buses.filter(b=>!b.r);
  const top=[...r.si].sort((a,b)=>stopW[b]-stopW[a]).slice(0,5).map(s=>esc(D.stops[s][0]));
  const rs=S.rsat[ref];
  openSheet(`<h2>${badge(r)} <span class="h2t">${esc(r.title)}</span></h2>
    <div class="sub">${r.op?esc(r.op)+' · ':''}${r.km.toFixed(1)} km · ${r.si.length} trạm thật · ${fires(r.fire)}</div>
    <div class="kpi"><div>Trạm đầu<b class="sm">${esc(D.stops[r.si[0]][0])}</b></div><div>Trạm cuối<b class="sm">${esc(D.stops[r.si[r.si.length-1]][0])}</b></div>
    ${o?`<div class="p">Khách hôm nay<b>${(o.pax||0).toLocaleString('vi-VN')}</b></div><div class="p">Doanh thu hôm nay<b>${fmt(o.rev||0)}</b></div>`:''}</div>
    ${o&&rs?`<div class="satbox"><div class="row">${ICON(faceOf(rs.s),44)}<div class="grow"><b style="font-size:17px">${Math.round(rs.s)}% · ${moodTxt(rs.s)}</b><div class="m">${buses.length?`Cứ ~${Math.round(rs.hw||0)} phút có 1 chuyến`:'Chưa có xe chạy'}</div></div></div>${rs.f?factorBars(rs.f):''}<h3>Lời khuyên</h3>${rs.f?tipsFor(rs.f):''}</div>`:''}
    <div class="m" style="margin:8px 0">Trạm đông: ${top.join(' · ')}</div>
    ${o?`<h3>Xe trên tuyến (${buses.length})</h3>${buses.map(busCard).join('')||'<div class="empty">Chưa có xe. Mua hoặc giao xe đang rảnh!</div>'}
      ${idle.length?`<button class="btn full" data-assignidle="${esc(ref)}">Giao ${idle.length} xe đang rảnh cho tuyến này</button>`:''}
      <div class="row wrap">${Object.entries(MODELS).filter(([k,M])=>S.level>=M.lvl).map(([k,M])=>`<button class="btn y buyq" data-buy="${k}" ${S.money<M.price?'disabled':''}>${ICON(M.icon,26)}<span>${fmt(M.price)}</span></button>`).join('')}</div>
      <button class="btn r full" data-close-route="${esc(ref)}">Đóng tuyến</button>`
     :`<button class="btn y full" data-open="${esc(ref)}" ${S.money<r.cost?'disabled':''}>Mở tuyến · ${fmt(r.cost)}</button>`}`,{t:'route',ref});
}
function busCard(b){
  const M=MODELS[b.m], r=b.r&&routeById[b.r];
  const opts=['<option value="">Về bãi xe</option>'].concat(openRoutes().map(x=>`<option value="${esc(x.ref)}" ${x.ref===b.r?'selected':''}>Tuyến ${esc(x.ref)}</option>`)).join('');
  const f=b.l/M.cap;
  return `<div class="card bus">${ICON(M.icon,44)}<div class="grow"><div class="t">${r?badge(r,1):'<span class="badge sm park">P</span>'} #${b.id} ${M.name}</div>
    <div class="m">${ICON('people',14)} <b style="color:${f>.9?'#dc2626':f>.6?'#ca8a04':'#16a34a'}">${b.l}/${M.cap}</b> · ${Math.round(b.km)} km · ${b.trips||0} lượt</div></div><select data-assign="${b.id}">${opts}</select></div>`;
}
function renderFleet(){
  const models=Object.entries(MODELS).map(([k,M])=>{ const lock=S.level<M.lvl;
    return `<div class="card model ${lock?'lock':''}"><img src="${M.img}" alt="${M.name}" loading="lazy"><div class="in">
      <div class="t row">${ICON(M.icon,30)} ${M.name} ${lock?`<span class="tag lock">${ICON('lock',12)} Cấp ${M.lvl}</span>`:''}</div><div class="m">${M.desc}</div>
      <div class="stats"><div>${ICON('people',18)}<b>${M.cap}</b>chỗ</div><div>${ICON('fast',18)}<b>${Math.round(M.speed*.06)}</b>km/h</div><div>${ICON('star',18)}<b>${M.comfort}</b>tiện nghi</div><div>${ICON(k==='ev'?'bolt':'fuel',18)}<b>${fmt(M.fuel)}</b>/km</div></div>
      <div class="m">${ICON('wrench',14)} Bảo dưỡng ${fmt(M.upk)}/ngày</div>
      <button class="btn y full" data-buy="${k}" ${lock||S.money<M.price?'disabled':''}>${ICON('cart',20)} Mua · ${fmt(M.price)}</button></div></div>`; }).join('');
  const mine=S.buses.map(b=>busCard(b)+`<div class="sellrow"><button class="btn r mini" data-sell="${b.id}">Bán (${fmt(MODELS[b.m].price/2)})</button></div>`).join('');
  openSheet(`<h2>${ICON('bus',28)} Đội xe</h2><div class="sub">${S.buses.length} xe · ${S.buses.filter(b=>!b.r).length} xe đang rảnh</div>
    ${mine||'<div class="empty">Bạn chưa có xe nào. Mua chiếc đầu tiên bên dưới!</div>'}<h3>${ICON('cart',20)} Cửa hàng xe</h3>${models}`,{t:'fleet'});
}
function renderSat(){
  const o=openRoutes(); const avg={}; let wt=0;
  for(const F of FACTORS) avg[F.k]=0;
  for(const r of o){ const s=S.rsat[r.ref]; if(!s||!s.f) continue; const w=1+(S.opened[r.ref].pax||0); wt+=w; for(const F of FACTORS) avg[F.k]+=s.f[F.k]*w; }
  if(wt) for(const F of FACTORS) avg[F.k]/=wt;
  const bonusTxt = S.sat>=75?`Nếu giữ ≥75% tới cuối ngày bạn được <b>thưởng</b> từ thành phố.`:S.sat<35?`Dưới 35% sẽ bị <b>phạt chất lượng</b> cuối ngày!`:`Đạt 75% để nhận thưởng hài lòng mỗi ngày.`;
  openSheet(`<h2>${ICON('star',28)} Độ hài lòng của khách</h2>
    <div class="satbox big"><div class="row">${ICON(faceOf(S.sat),64)}<div class="grow"><b style="font-size:26px">${Math.round(S.sat)}%</b><div class="m">${moodTxt(S.sat)} · ${bonusTxt}</div></div></div>
    <div class="m" style="margin-top:6px">Khách vui thì đi xe nhiều hơn (tới +50% khách), lên cấp nhanh hơn (+20% XP khi ≥80%).</div></div>
    ${o.length?`<h3>Các yếu tố</h3>${factorBars(avg)}<h3>Lời khuyên</h3>${tipsFor(avg)}`:'<div class="empty">Mở tuyến đầu tiên để bắt đầu đo độ hài lòng.</div>'}
    <h3>${ICON('ticket',20)} Giá vé</h3><div class="seg">${FARES.map(f=>`<button data-fare="${f}" class="${S.fare===f?'on':''}">${f/1000}k</button>`).join('')}</div>
    <div class="m">Vé rẻ: khách vui & đi nhiều hơn. Vé đắt: thu nhiều mỗi khách nhưng khách bực.</div>
    ${o.length?`<h3>Theo tuyến</h3>${o.sort((a,b)=>rsat(a.ref)-rsat(b.ref)).map(r=>`<div class="card" data-route="${esc(r.ref)}">${badge(r)}<div class="grow"><div class="t">${esc(r.title)}</div><div class="fbar"><i style="width:${rsat(r.ref)}%;background:${satColor(rsat(r.ref))}"></i></div></div><span class="mood">${ICON(faceOf(rsat(r.ref)),30)}<small>${Math.round(rsat(r.ref))}%</small></span></div>`).join('')}`:''}`,{t:'sat'});
}
function renderFinance(){
  const t=today(), inc=t.fare+t.sub, exp=t.fuel+t.upk;
  openSheet(`<h2>${ICON('chart',28)} Tài chính</h2><div class="sub">Ngày ${day()} · ${hhmm(S.t)} · giá vé ${fmt(S.fare)}</div>
    <div class="kpi"><div class="p">${ICON('ticket',18)} Tiền vé<b>${fmt(t.fare)}</b></div><div class="p">${ICON('coin',18)} Trợ giá TP<b>${fmt(t.sub)}</b></div>
    <div class="n">${ICON('fuel',18)} Nhiên liệu / điện<b>${fmt(t.fuel)}</b></div><div class="n">${ICON('wrench',18)} Bảo dưỡng, lương<b>${fmt(t.upk)}</b></div>
    <div>${ICON('cart',18)} Đầu tư<b>${fmt(t.build)}</b></div><div class="${inc-exp>=0?'p':'n'}">${ICON('chart',18)} Lãi vận hành<b>${fmt(inc-exp)}</b></div></div>
    <canvas id="chart"></canvas><div class="legend"><span><i style="background:#22c55e"></i>Thu</span><span><i style="background:#f87171"></i>Chi vận hành</span><span><i style="background:#0f766e"></i>Lãi</span><span><i style="background:#f59e0b"></i>Thưởng/phạt</span></div>
    <div class="kpi"><div>${ICON('people',18)} Tổng hành khách<b>${S.paxTotal.toLocaleString('vi-VN')}</b></div><div>${ICON('bus',18)} Xe đang chạy<b>${S.buses.filter(b=>b.r).length}/${S.buses.length}</b></div>
    <div>${ICON('stop',18)} Tuyến đang mở<b>${Object.keys(S.opened).length}</b></div><div>${ICON('shelter',18)} Mái che<b>${Object.keys(S.shelters).length}</b></div></div>
    <div class="sub">Trợ giá ${fmt(SUBSIDY_KM)}/km xe chạy. Thưởng/phạt hài lòng tính lúc hết ngày.</div>`,{t:'finance'});
  drawChart();
}
function drawChart(){
  const c=$('#chart'); if(!c) return; const r=Math.min(devicePixelRatio||1,2), W=c.clientWidth, H=c.clientHeight; c.width=W*r; c.height=H*r;
  const g=c.getContext('2d'); g.scale(r,r);
  const days=S.ledger.slice(-7), inc=days.map(d=>d.fare+d.sub), exp=days.map(d=>d.fuel+d.upk), mx=Math.max(1,...inc,...exp), pad=28, bw=(W-pad-10)/days.length, Y=v=>12+(H-34)*(1-v/mx);
  g.font='10px sans-serif'; g.fillStyle='#94a3b8'; g.strokeStyle='#e2e8f0';
  for(let i=0;i<=3;i++){ const y=Y(mx*i/3); g.beginPath(); g.moveTo(pad,y); g.lineTo(W-6,y); g.stroke(); g.fillText(fmt(mx*i/3).replace(' tr','tr'),2,y+3); }
  days.forEach((d,i)=>{ const x=pad+i*bw+bw*.12, w=bw*.3; g.fillStyle='#22c55e'; bar(g,x,Y(inc[i]),w,H-22-Y(inc[i])); g.fillStyle='#f87171'; bar(g,x+w+2,Y(exp[i]),w,H-22-Y(exp[i]));
    if(d.bonus){ g.fillStyle='#f59e0b'; g.beginPath(); g.arc(x+w*2+8,Y(Math.abs(d.bonus))-0,3.5,0,7); g.fill(); }
    g.fillStyle='#64748b'; g.fillText('N'+d.day,x,H-8); });
  g.strokeStyle='#0f766e'; g.lineWidth=2.5; g.beginPath(); days.forEach((d,i)=>{ const x=pad+i*bw+bw*.5, y=Y(clamp(inc[i]-exp[i],0,mx)); i?g.lineTo(x,y):g.moveTo(x,y); }); g.stroke();
}
function bar(g,x,y,w,h){ if(h<=0) return; g.beginPath(); g.roundRect(x,y,w,h,[4,4,0,0]); g.fill(); }
function showStop(si){
  const st=D.stops[si], w=Math.floor(S.waiting[si]||0), sh=S.shelters[si], rs=stopRoutes[si].map(x=>routeById[x]), mood=stopMood(si);
  openSheet(`<h2>${ICON(sh?'shelter':'stop',28)} <span class="h2t">${esc(st[0])}</span></h2><div class="sub">Trạm thật trên OpenStreetMap · ${fires(stopFire(si))}</div>
    <div class="kpi"><div>${ICON('people',18)} Khách đang chờ<b>${w}</b></div><div>${ICON(faceOf(mood),18)} Tâm trạng<b>${moodTxt(mood)}</b></div></div>
    <div class="m">Tuyến đi qua: ${rs.map(r=>badge(r,1)).join(' ')}</div>
    ${sh?`<div class="tip">${ICON('check',20)}<span>Đã có mái che: +15% khách, chứa 120 người, khách không bực khi mưa.</span></div>`:`<button class="btn y full" data-shelter="${si}" ${S.money<SHELTER_COST?'disabled':''}>${ICON('shelter',22)} Xây mái che · ${fmt(SHELTER_COST)}</button><div class="sub" style="margin-top:8px">Mái che: +15% khách, chứa 120 người, tăng điểm hài lòng của tuyến.</div>`}`,{t:'stop',si});
}
function renderMore(){
  openSheet(`<h2>${ICON('gear',28)} Thêm</h2>
    <button class="btn full" data-tut>${ICON('book',20)} Xem lại hướng dẫn</button>
    <button class="btn g full" data-fps>${ICON('battery',20)} Chế độ tiết kiệm pin (30 FPS): <b>${S.opt.fps===30?'BẬT':'TẮT'}</b></button>
    <button class="btn g full" data-saveg>${ICON('save',20)} Lưu game ngay</button>
    <button class="btn r full" data-reset>${ICON('reset',20)} Chơi lại từ đầu</button>
    <h3>${ICON('info',20)} Nguồn dữ liệu & hình ảnh</h3><div class="credits" id="cred">Đang tải…</div>`,{t:'more'});
  fetch('credits.json').then(r=>r.json()).then(c=>{ const el=$('#cred'); if(!el) return;
    el.innerHTML='<ul>'+c.map(x=>`<li><b>${esc(x.what)}</b>: ${x.title?esc(x.title)+' – ':''}${esc(x.author)} · ${x.licenseUrl?`<a href="${esc(x.licenseUrl)}" target="_blank" rel="noopener">${esc(x.license)}</a>`:esc(x.license)}${x.source?` · <a href="${esc(x.source)}" target="_blank" rel="noopener">nguồn</a>`:''}</li>`).join('')+'</ul><p>Dữ liệu tuyến có thể khác thực tế hiện tại.</p>'; }).catch(()=>{});
}
function toast(t,ic){ const d=document.createElement('div'); d.className='toast'; d.innerHTML=(ic?ICON(ic,20):'')+'<span>'+esc(t)+'</span>'; const box=$('#toasts'); box.appendChild(d); setTimeout(()=>d.remove(),3200); while(box.children.length>3) box.firstChild.remove(); }
function modal(h){ const m=$('#modal'); m.innerHTML=`<div class="dlg">${h}</div>`; m.classList.remove('hidden'); }
const closeModal=()=>$('#modal').classList.add('hidden');
const TUT=[
  ['bus','Chào mừng giám đốc!','Bạn vừa lập công ty xe buýt ở <b>TP.HCM</b>. Bản đồ, <b>{R} tuyến</b> và <b>{S} trạm</b> trong game đều là thật, lấy từ OpenStreetMap.'],
  ['stop','Bước 1: Mở tuyến','Vào tab <b>Tuyến</b>, chọn một tuyến rồi bấm nút giá để mở. Gợi ý: tìm <b>"Bến Thành"</b>, nơi đông khách nhất.'],
  ['cart','Bước 2: Mua xe','Vào <b>Đội xe</b> mua xe. Xe tự được giao cho tuyến, chạy theo <b>đường thật</b> và dừng ở <b>trạm thật</b>. Số tuyến hiện ngay trên nóc xe.'],
  ['star','Giữ khách hài lòng','Bấm vào <b>ngôi sao</b> trên cùng để xem khách vui hay bực và vì sao: chờ lâu, xe chật, mưa, giá vé… Khách vui thì đi nhiều hơn và bạn được thưởng.'],
  ['rain','Giờ cao điểm & sự kiện','Khách đông lúc <b>6h–8h30</b> và <b>16h30–19h</b>. Coi chừng <b>mưa</b>, <b>kẹt xe</b> và tận dụng <b>lễ hội</b>. Bấm vào trạm để xây <b>mái che</b>.'],
  ['trophy','Lên cấp','Chở càng nhiều khách càng lên cấp, mở khóa <b>xe CNG</b>, <b>xe điện</b>, <b>xe 2 tầng</b>. Game tự lưu trên máy bạn.'],
];
function showTut(i){ if(i>=TUT.length){ closeModal(); S.seen.tut=1; save(); return; } const [ic,h,p]=TUT[i];
  modal(`<div class="big">${ICON(ic,76)}</div><h2>${h}</h2><p>${p.replace('{R}',D.routes.length).replace('{S}',D.stops.length.toLocaleString('vi-VN'))}</p><div class="dots">${TUT.map((_,k)=>`<i class="${k===i?'on':''}"></i>`).join('')}</div>
    <div class="row"><button class="btn g" style="flex:1" data-tutskip>Bỏ qua</button><button class="btn" style="flex:2" data-tutnext="${i+1}">${i===TUT.length-1?'Bắt đầu chơi!':'Tiếp theo'}</button></div>`); }

function bindUI(){
  document.querySelectorAll('[data-ic]').forEach(el=>el.insertAdjacentHTML('afterbegin',ICON(el.dataset.ic,+el.dataset.s||24)));
  document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
  document.querySelectorAll('.speed button').forEach(b=>b.onclick=()=>{ speedMul=+b.dataset.sp; document.querySelectorAll('.speed button').forEach(x=>x.classList.toggle('on',x===b)); });
  $('#satpill').onclick=()=>{ setTab('map',true); renderSat(); };
  $('#zin').onclick=()=>map.zoomIn(); $('#zout').onclick=()=>map.zoomOut(); $('#zhome').onclick=()=>fitOpen();
  document.body.addEventListener('click',e=>{
    const t=e.target.closest('[data-open],[data-route],[data-buy],[data-sell],[data-shelter],[data-close],[data-tutnext],[data-tutskip],[data-tut],[data-reset],[data-saveg],[data-f],[data-assignidle],[data-close-route],[data-fare],[data-fps]');
    if(!t) return; const ds=t.dataset;
    if(ds.open!==undefined){ e.stopPropagation(); openRoute(ds.open); }
    else if(ds.buy) buyBus(ds.buy); else if(ds.sell) sellBus(+ds.sell); else if(ds.shelter) buildShelter(+ds.shelter);
    else if(ds.close!==undefined) closeModal(); else if(ds.tutnext) showTut(+ds.tutnext); else if(ds.tutskip!==undefined) showTut(99); else if(ds.tut!==undefined) showTut(0);
    else if(ds.saveg!==undefined){ save(); toast('Đã lưu','save'); }
    else if(ds.fps!==undefined){ S.opt.fps=S.opt.fps===30?60:30; save(); renderMore(); }
    else if(ds.reset!==undefined){ if(confirm('Xóa toàn bộ tiến trình và chơi lại?')){ localStorage.removeItem(SAVE_KEY); location.reload(); } }
    else if(ds.f){ routeFilter=ds.f; renderRoutes(); }
    else if(ds.fare) setFare(+ds.fare);
    else if(ds.assignidle){ S.buses.filter(b=>!b.r).forEach(b=>assign(b,ds.assignidle,true)); toast('Đã giao xe cho tuyến '+ds.assignidle,'bus'); refreshSheet(); }
    else if(ds.closeRoute){ if(confirm('Đóng tuyến '+ds.closeRoute+'? Xe sẽ về bãi.')) closeRoute(ds.closeRoute); }
    else if(ds.route) showRoute(ds.route);
  });
  document.body.addEventListener('change',e=>{ const s=e.target.closest('[data-assign]'); if(!s) return; const b=S.buses.find(x=>x.id===+s.dataset.assign); if(b){ assign(b,s.value||null); refreshSheet(); } });
  $('.grab').onclick=closeSheet;
  let y0=null; $('#sheet').addEventListener('touchstart',e=>{ if($('#sheet-body').scrollTop<=0) y0=e.touches[0].clientY; },{passive:true});
  $('#sheet').addEventListener('touchmove',e=>{ if(y0!==null&&e.touches[0].clientY-y0>70){ y0=null; closeSheet(); } },{passive:true});
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) save(); }); addEventListener('pagehide',save);
}

/* ---------- Render ---------- */
function resize(){ for(const c of [$('#fx'),$('#rain')]){ c.width=innerWidth*dpr; c.height=innerHeight*dpr; c.style.width=innerWidth+'px'; c.style.height=innerHeight+'px'; c.getContext('2d').setTransform(dpr,0,0,dpr,0,0); } viewDirty=true; }
const drops=[]; for(let i=0;i<110;i++) drops.push({x:Math.random(),y:Math.random(),v:.6+Math.random()*.6});
function tintFor(h){ const K=[[0,.42],[4.5,.38],[6,.12],[7.5,0],[16.5,0],[18,.1],[19.3,.36],[24,.42]];
  for(let i=0;i<K.length-1;i++){ const [a,va]=K[i],[b,vb]=K[i+1]; if(h>=a&&h<=b) return va+(vb-va)*(h-a)/(b-a); } return 0; }
let uiT=0, slowT=0, lastTint='';
function frame(ts){
  requestAnimationFrame(frame);
  if(S.opt.fps===30 && (frameSkip^=1)) return;
  const dtR=Math.min(.1,(ts-(lastTs||ts))/1000); lastTs=ts;
  if(speedMul>0){ let dt=dtR*MIN_PER_SEC*speedMul; while(dt>0){ const d=Math.min(dt,1); step(d); dt-=d; } }
  if(mapReady) render(dtR);
  uiT+=dtR; slowT+=dtR;
  if(uiT>.3){ uiT=0; updateHud(); }
  if(slowT>1.2){ slowT=0; if(sheetCtx&&['finance','stop','sat','route'].includes(sheetCtx.t)&&!document.activeElement.matches('input,select')) refreshSheet(); }
}
function projectStops(){
  stopScreen=[]; const z=map.getZoom(); if(z<12) return; const W=innerWidth,H=innerHeight;
  const ids=new Set(servedStops()); if(previewRef) routeById[previewRef].si.forEach(s=>ids.add(s));
  for(const si of ids){ const s=D.stops[si], p=map.project([s[2],s[1]]); if(p.x<-20||p.y<-20||p.x>W+20||p.y>H+20) continue; stopScreen.push([si,p.x,p.y]); }
}
function render(dt){
  const g=fxCtx, W=innerWidth, H=innerHeight; g.clearRect(0,0,W,H);
  const h=hour(), night=h<5.5||h>19, z=map.getZoom();
  const a=tintFor(h).toFixed(2); if(a!==lastTint){ lastTint=a; $('#tint').style.background=`rgba(18,28,78,${a})`; }
  if(viewDirty){ projectStops(); viewDirty=false; }
  // depot
  const dp=D.depot&&map.project([D.depot[1],D.depot[0]]); if(dp&&iconImg.office.ok){ const s=z>=13?34:24; g.drawImage(iconImg.office,dp.x-s/2,dp.y-s,s,s); }
  // trạm
  if(stopScreen.length){
    const rad=z>=16?7:z>=14?5.5:z>=13?4:3, showFace=z>=14.5;
    for(const [si,x,y] of stopScreen){
      const w=S.waiting[si]||0;
      const isPrev=previewRef&&!stopRoutes[si].some(r=>S.opened[r]);
      g.beginPath(); g.arc(x,y,rad+2,0,6.283); g.fillStyle=S.shelters[si]?'#1d4ed8':'#fff'; g.fill();
      g.beginPath(); g.arc(x,y,rad,0,6.283); g.fillStyle=isPrev?'#fff':(w<15?'#22c55e':w<35?'#facc15':w<55?'#fb923c':'#ef4444'); g.fill();
      if(isPrev){ g.lineWidth=2; g.strokeStyle=routeById[previewRef].color; g.stroke(); }
      if(showFace&&!isPrev){ const m=stopMood(si), im=iconImg[faceOf(m)]; if(im&&im.ok) g.drawImage(im,x+rad-2,y-rad-14,16,16);
        if(w>=1){ g.font='700 10px system-ui,sans-serif'; g.textAlign='left'; g.lineWidth=3; g.strokeStyle='#fff'; g.strokeText(Math.floor(w),x+rad+15,y-rad-3); g.fillStyle='#0f172a'; g.fillText(Math.floor(w),x+rad+15,y-rad-3); } }
    }
  }
  // xe buýt
  const sc=clamp(1+(z-13)*.3,.7,1.9);
  g.textAlign='center'; g.textBaseline='middle';
  for(const b of S.buses){ b._p=null; if(!b.r) continue; const r=routeById[b.r]; if(!r) continue;
    const p=posAt(r,b.s), pt=map.project([p.lng,p.lat]); if(pt.x<-40||pt.y<-40||pt.x>W+40||pt.y>H+40) continue; b._p=[pt.x,pt.y];
    const A=r.g[p.i], B=r.g[Math.min(p.i+1,r.g.length-1)], pa=map.project([A[1],A[0]]), pb=map.project([B[1],B[0]]);
    let ang=Math.atan2(pb.y-pa.y,pb.x-pa.x); if(b.d<0) ang+=Math.PI;
    const sp=sprites[b.m];
    g.save(); g.translate(pt.x,pt.y); g.rotate(ang); g.scale(sc,sc);
    if(night){ g.fillStyle='rgba(255,240,170,.35)'; g.beginPath(); g.moveTo(sp.w/2-2,0); g.arc(sp.w/2-2,0,30,-.42,.42); g.fill(); }
    g.drawImage(sp.c,-sp.w/2,-sp.h/2,sp.w,sp.h); g.restore();
    // số tuyến trên xe
    const fs=z>=15?12:z>=13?11:10, label=r.ref; g.font=`900 ${fs}px system-ui,sans-serif`;
    const tw=Math.max(g.measureText(label).width+10,20), bx=pt.x, by=pt.y-10*sc-fs;
    g.fillStyle='#fff'; g.beginPath(); g.roundRect(bx-tw/2-2,by-fs/2-4,tw+4,fs+8,7); g.fill();
    g.fillStyle=r.color; g.beginPath(); g.roundRect(bx-tw/2,by-fs/2-2,tw,fs+4,6); g.fill();
    g.beginPath(); g.moveTo(bx-4,by+fs/2+2); g.lineTo(bx+4,by+fs/2+2); g.lineTo(bx,by+fs/2+6); g.fill();
    g.fillStyle='#fff'; g.fillText(label,bx,by+.5);
    if(z>=15){ const M=MODELS[b.m], f=b.l/M.cap; const ly=pt.y+10*sc+8; g.font='700 10px system-ui,sans-serif';
      g.fillStyle='rgba(15,23,42,.8)'; g.beginPath(); g.roundRect(bx-17,ly-7,34,14,7); g.fill(); g.fillStyle=f>.9?'#fca5a5':f>.6?'#fde047':'#86efac'; g.fillText(`${b.l}/${M.cap}`,bx,ly+.5); }
  }
  g.textBaseline='alphabetic';
  for(const f of floaters){ f.life-=dt*.7; if(z<12) continue; const pt=map.project([f.lng,f.lat]), y=pt.y-24-(1-f.life)*34; g.globalAlpha=clamp(f.life*1.5,0,1);
    g.font='900 14px system-ui,sans-serif'; g.lineWidth=4; g.strokeStyle='#fff'; g.strokeText(f.txt,pt.x,y); g.fillStyle='#15803d'; g.fillText(f.txt,pt.x,y); g.globalAlpha=1; }
  floaters=floaters.filter(f=>f.life>0);
  if(S.event&&S.event.type==='fest'){ const pt=map.project([S.event.p[1],S.event.p[0]]), t=performance.now()/600;
    g.strokeStyle='rgba(244,63,94,.55)'; g.lineWidth=3; g.beginPath(); g.arc(pt.x,pt.y,26+((t*20)%30),0,6.283); g.stroke();
    if(iconImg.fest.ok) g.drawImage(iconImg.fest,pt.x-16,pt.y-38+Math.sin(t)*4,32,32); }
  const rg=rainCtx;
  if(S.event&&S.event.type==='rain'){ rg.clearRect(0,0,W,H); rg.strokeStyle='rgba(190,210,255,.6)'; rg.lineWidth=1.2; rg.beginPath();
    for(const d of drops){ d.y+=d.v*dt*1.6; d.x-=dt*.15; if(d.y>1){d.y=0;d.x=Math.random()*1.2;} const x=d.x*W, y=d.y*H; rg.moveTo(x,y); rg.lineTo(x-4,y+14); } rg.stroke(); rg._on=1; }
  else if(rg._on){ rg.clearRect(0,0,W,H); rg._on=0; }
}
let hudCache={};
function setTxt(id,v){ if(hudCache[id]!==v){ hudCache[id]=v; document.getElementById(id).textContent=v; } }
function setHtml(id,v){ if(hudCache[id]!==v){ hudCache[id]=v; document.getElementById(id).innerHTML=v; } }
function updateHud(){
  setTxt('money',fmt(S.money)); $('#money').parentElement.classList.toggle('neg',S.money<0);
  setTxt('clock',hhmm(S.t)); setTxt('daylbl','Ngày '+day()); 
  const h=hour(); setHtml('dayicon',ICON(h<5.5||h>=19?'moon':h<7||h>=17.5?'sunrise':'sun',22));
  setHtml('rush',isRush(h)?ICON('fire',18):'');
  setTxt('lvl',S.level); const a=LEVEL_XP[S.level-1]||0, b=LEVEL_XP[S.level]||a+1; $('#xpbar').style.width=clamp((S.xp-a)/(b-a)*100,0,100).toFixed(1)+'%';
  setTxt('sat',Math.round(S.sat)+'%'); setHtml('satface',ICON(faceOf(S.sat),24));
  let pax=0; for(const x of S.buses) pax+=x.l; setTxt('paxnow',pax);
  const ev=$('#event'); if(S.event){ setHtml('event',ICON(evIcon(S.event),22)+'<span>'+esc(S.event.txt)+'</span>'); ev.classList.remove('hidden'); } else ev.classList.add('hidden');
}

async function boot(){
  [D,boundary]=await Promise.all([fetch('data/hcm.json').then(r=>r.json()),fetch('data/hcm-boundary.json').then(r=>r.json())]);
  prepData(); S=load();
  const bt=D.stops.findIndex(s=>/bến thành/i.test(s[0])); D.depot=bt>=0?[D.stops[bt][1]+.0012,D.stops[bt][2]-.001]:CENTER;
  for(const k in MODELS) sprites[k]=makeSprite(k);
  await loadIcons();
  initMap(); fxCtx=$('#fx').getContext('2d'); rainCtx=$('#rain').getContext('2d'); resize(); addEventListener('resize',resize);
  bindUI(); updateSat(1); updateHud();
  $('#loading').style.opacity=0; setTimeout(()=>$('#loading').remove(),500);
  if(!S.seen.tut) showTut(0);
  setInterval(save,10000);
  window.__game={S,D,MODELS,step,openRoute,buyBus,routeById,get map(){return map;}};
  requestAnimationFrame(frame);
}
boot().catch(e=>{ const p=$('#loading p'); if(p) p.textContent='Lỗi tải game: '+e.message; console.error(e); });
})();
