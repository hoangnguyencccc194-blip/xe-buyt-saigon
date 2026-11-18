(()=>{
'use strict';
/* Xe Buýt Sài Gòn v3 — game quản lý xe buýt TP.HCM (mã nguồn tự viết).
   Dữ liệu tuyến/trạm & ranh giới: © OpenStreetMap contributors (ODbL). Bản đồ nền: OpenFreeMap / OpenMapTiles. */
const SAVE_KEY='xebuyt-sg-v1';
const MIN_PER_SEC=2, SUBSIDY_KM=4000, SHELTER_COST=800000, START_MONEY=24000000;
const FARES=[5000,6000,7000,8000,10000];
const FARE_SAT={5000:100,6000:90,7000:78,8000:62,10000:38};
const FARE_DEMAND={5000:1.15,6000:1.07,7000:1,8000:.9,10000:.74};
const PALETTE=['#0ea5e9','#f97316','#22c55e','#e11d48','#8b5cf6','#14b8a6','#eab308','#ec4899','#6366f1','#65a30d','#06b6d4','#f43f5e','#a855f7','#10b981','#f59e0b'];
const LIVERIES=[['#2563eb','Xanh dương'],['#16a34a','Xanh lá'],['#84cc16','Xanh cốm'],['#38bdf8','Xanh trời'],['#f97316','Cam'],['#e11d48','Đỏ'],['#eab308','Vàng'],['#8b5cf6','Tím'],['#ec4899','Hồng'],['#475569','Xám']];
const MODELS={
  mini:{name:'Xe buýt nhỏ',desc:'Gọn, lanh lẹ trong phố',cap:30,speed:330,price:6000000,upk:400000,fuel:3000,lvl:1,comfort:50,color:'#38bdf8',len:16,img:'assets/bus-mini.jpg',icon:'bus_mini',rel:1},
  std:{name:'Xe buýt thường',desc:'Xe 60 chỗ quen thuộc',cap:60,speed:300,price:12000000,upk:700000,fuel:5000,lvl:1,comfort:60,color:'#2563eb',len:22,img:'assets/bus-std.jpg',icon:'bus_std',rel:1},
  cng:{name:'Xe buýt CNG',desc:'Chạy khí nén, rẻ nhiên liệu',cap:75,speed:300,price:18000000,upk:800000,fuel:3500,lvl:3,comfort:72,color:'#16a34a',len:24,img:'assets/bus-cng.jpg',icon:'bus_cng',rel:.9},
  ev:{name:'Xe buýt điện',desc:'Êm, mát, sạch – khách rất thích',cap:70,speed:310,price:28000000,upk:750000,fuel:1500,lvl:5,comfort:92,color:'#84cc16',len:24,img:'assets/bus-ev.jpg',icon:'bus_ev',rel:.7},
  dd:{name:'Xe buýt 2 tầng',desc:'Chở cực đông, ngắm phố',cap:110,speed:260,price:45000000,upk:1300000,fuel:7000,lvl:7,comfort:86,color:'#15803d',len:25,img:'assets/bus-dd.jpg',icon:'bus_dd',rel:.9},
};
const LEVEL_XP=[0,800,2500,5000,8500,13000,19000,26000,35000,46000,60000,76000,95000,120000,150000,190000,240000,300000];
const FESTIVALS=['Lễ hội Áo dài','Đêm nhạc phố đi bộ','Hội chợ ẩm thực đường phố','Lễ hội Trung thu','Ngày hội sinh viên','Lễ hội Tết Nguyên đán','Lễ hội bánh dân gian','Đêm hội pháo hoa'];
const CENTER=[10.7769,106.7009];
const FACTORS=[
  {k:'wait',n:'Thời gian chờ',ic:'stop',w:.17,tip:'Thêm xe cho tuyến; lắp ghế chờ, đèn và bảng điện tử báo giờ xe ở trạm.'},
  {k:'freq',n:'Tần suất chuyến',ic:'calendar',w:.13,tip:'Tuyến dài cần nhiều xe và đủ tài xế cả hai ca.'},
  {k:'crowd',n:'Độ chật trên xe',ic:'people',w:.15,tip:'Xe quá tải: dùng xe lớn hơn (CNG, 2 tầng) hoặc thêm xe.'},
  {k:'comfort',n:'Tiện nghi xe',ic:'bus',w:.12,tip:'Xe điện, máy lạnh & wifi, tài xế giỏi, trạm có cây xanh và khu rửa xe ở bãi.'},
  {k:'shelter',n:'Mái che trạm',ic:'shelter',w:.10,tip:'Bấm vào trạm để mở ô nâng cấp, hoặc nâng cấp cả tuyến trong bảng tuyến.'},
  {k:'weather',n:'Mưa & kẹt xe',ic:'rain',w:.10,tip:'Mái che và làn xe buýt riêng giúp khách đỡ bực khi mưa, kẹt xe.'},
  {k:'fare',n:'Giá vé',ic:'ticket',w:.13,tip:'Giá vé cao làm khách khó chịu và đi ít hơn.'},
  {k:'reliab',n:'Đúng giờ',ic:'jam',w:.10,tip:'Bảo dưỡng xe; đèn ưu tiên, bảng điện tử và vịnh đỗ ở trạm giúp xe đúng giờ.'},
];
const UPGRADES={
  lane:{n:'Làn xe buýt riêng',ic:'lane',d:'Xe chạy nhanh hơn 25%, gần như không bị kẹt xe giờ cao điểm.',cost:r=>Math.round(r.km*400000/1e5)*1e5,lvl:2},
  signal:{n:'Đèn ưu tiên xe buýt',ic:'signal',d:'Xe đúng giờ hơn: +15 điểm "Đúng giờ".',cost:r=>Math.round((1e6+r.km*150000)/1e5)*1e5,lvl:3},
  ac:{n:'Máy lạnh & wifi',ic:'ac',d:'Khách thoải mái: +12 điểm tiện nghi.',cost:r=>3000000,lvl:2},
};
const SHIFTS={sang:{n:'Ca sáng',h:[5,13.5],mul:1},chieu:{n:'Ca chiều',h:[13.5,22],mul:1},full:{n:'Cả ngày',h:[5,22],mul:1.6}};
const HO=['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Vũ','Võ','Đặng','Bùi','Đỗ','Hồ','Ngô','Dương','Lý'];
const DEM=['Văn','Thị','Minh','Hữu','Thanh','Ngọc','Quốc','Gia','Đức','Thu','Bảo','Kim'];
const TEN=['An','Bình','Cường','Dũng','Hùng','Lan','Mai','Nam','Phúc','Quân','Sơn','Tâm','Thảo','Trang','Tuấn','Vy','Hải','Long','Khoa','Linh','Nhi','Phát','Tài','Yến'];
const DEPOTS=[ // bãi xe đặt cạnh các bến/ga thật (tìm theo tên trạm trong dữ liệu OSM)
  {id:'bt',n:'Bãi xe Bến Thành',re:/^Chợ Bến Thành$/,cost:0},
  {id:'cl',n:'Bãi xe Chợ Lớn',re:/^Bến xe Chợ Lớn$/,cost:15000000},
  {id:'mt',n:'Bãi xe Miền Tây',re:/^Bến xe Miền Tây$/,cost:18000000},
  {id:'as',n:'Bãi xe An Sương',re:/^Bến xe An Sương$/,cost:18000000},
  {id:'vt',n:'Bãi xe Văn Thánh',re:/^Bến xe buýt Văn Thánh$/,cost:16000000},
  {id:'q8',n:'Bãi xe Quận 8',re:/^Bến xe Quận 8$/,cost:15000000},
  {id:'ntg',n:'Bãi xe Ngã tư Ga',re:/^Bến xe Ngã tư Ga$/,cost:20000000},
  {id:'md',n:'Bãi xe Miền Đông mới',re:/^Bến xe Miền Đông mới$/,cost:22000000},
  {id:'dhqg',n:'Bãi xe Làng Đại học',re:/^Bến xe buýt Khu A$/,cost:20000000},
  {id:'cc',n:'Bãi xe Củ Chi',re:/^Bến xe Củ Chi$/,cost:16000000},
];
const DEPOT_CAP=10;
const ACH=[
  {id:'r1',n:'Tuyến đầu tiên',d:'Mở 1 tuyến',ic:'stop',ok:s=>Object.keys(s.opened).length>=1,rw:1e6},
  {id:'r5',n:'Mạng lưới nhỏ',d:'Mở 5 tuyến',ic:'map',ok:s=>Object.keys(s.opened).length>=5,rw:5e6},
  {id:'r10',n:'Vua tuyến đường',d:'Mở 10 tuyến',ic:'map',ok:s=>Object.keys(s.opened).length>=10,rw:12e6},
  {id:'b1',n:'Chiếc xe đầu tiên',d:'Có 1 xe buýt',ic:'bus',ok:s=>s.buses.length>=1,rw:5e5},
  {id:'b10',n:'Đội xe 10 chiếc',d:'Có 10 xe buýt',ic:'bus_std',ok:s=>s.buses.length>=10,rw:6e6},
  {id:'b25',n:'Đế chế xe buýt',d:'Có 25 xe buýt',ic:'bus_dd',ok:s=>s.buses.length>=25,rw:2e7},
  {id:'p1k',n:'Nghìn lượt khách',d:'Chở 1.000 khách',ic:'people',ok:s=>s.paxTotal>=1000,rw:1e6},
  {id:'p10k',n:'Vạn lượt khách',d:'Chở 10.000 khách',ic:'people',ok:s=>s.paxTotal>=10000,rw:5e6},
  {id:'p100k',n:'Trăm nghìn nụ cười',d:'Chở 100.000 khách',ic:'face4',ok:s=>s.paxTotal>=100000,rw:3e7},
  {id:'s90',n:'Khách rất vui',d:'Hài lòng đạt 90%',ic:'star',ok:s=>s.sat>=90&&Object.keys(s.opened).length>0,rw:5e6},
  {id:'sh1',n:'Che mưa che nắng',d:'Xây 1 mái che',ic:'shelter',ok:s=>Object.keys(s.shelters).length>=1,rw:5e5},
  {id:'sh10',n:'Trạm chờ văn minh',d:'Xây 10 mái che',ic:'shelter',ok:s=>Object.keys(s.shelters).length>=10,rw:4e6},
  {id:'su20',n:'Trạm chờ hiện đại',d:'Làm 20 hạng mục nâng cấp trạm',ic:'board',ok:s=>(s.stat.stopUps||0)>=20,rw:3e6},
  {id:'su6',n:'Trạm 5 sao',d:'Một trạm có đủ 6 nâng cấp',ic:'star',ok:s=>Object.keys(s.stopUp||{}).some(si=>s.shelters[si]&&Object.keys(s.stopUp[si]).length>=5),rw:2e6},
  {id:'du1',n:'Bãi xe xịn',d:'Nâng cấp bãi xe lần đầu',ic:'wrench',ok:s=>(s.stat.depotUps||0)>=1,rw:1e6},
  {id:'cu1',n:'Nhà quy hoạch',d:'Tự tạo 1 tuyến riêng',ic:'newroute',ok:s=>(s.custom||[]).length>=1,rw:2e6},
  {id:'ev5',n:'Thành phố xanh',d:'Có 5 xe buýt điện',ic:'bolt',ok:s=>s.buses.filter(b=>b.m==='ev').length>=5,rw:1e7},
  {id:'dd1',n:'Ngắm phố trên cao',d:'Mua xe 2 tầng',ic:'bus_dd',ok:s=>s.buses.some(b=>b.m==='dd'),rw:3e6},
  {id:'dp3',n:'Ba bãi xe',d:'Sở hữu 3 bãi xe',ic:'depot',ok:s=>s.depots.length>=3,rw:5e6},
  {id:'dr10',n:'Đại gia đình tài xế',d:'Thuê 10 tài xế',ic:'driver',ok:s=>s.drivers.length>=10,rw:3e6},
  {id:'lv5',n:'Giám đốc cấp 5',d:'Đạt cấp 5',ic:'trophy',ok:s=>s.level>=5,rw:5e6},
  {id:'lv10',n:'Tổng giám đốc',d:'Đạt cấp 10',ic:'trophy',ok:s=>s.level>=10,rw:2e7},
  {id:'ct1',n:'Đối tác thành phố',d:'Hoàn thành 1 hợp đồng',ic:'contract',ok:s=>(s.stat.contracts||0)>=1,rw:2e6},
  {id:'ln',n:'Trả nợ sòng phẳng',d:'Trả hết một khoản vay',ic:'bank',ok:s=>(s.stat.repaid||0)>=1,rw:1e6},
  {id:'cp',n:'Đánh bại đối thủ',d:'Đẩy đối thủ khỏi 1 tuyến',ic:'rival',ok:s=>(s.stat.beatComp||0)>=1,rw:5e6},
];
const NEWS_FLAVOR=['Người dân được khuyến khích đi xe buýt để giảm kẹt xe giờ cao điểm.','Thời tiết Sài Gòn mùa này thất thường, nhớ mang áo mưa nhé!','Phố đi bộ Nguyễn Huệ cuối tuần đông vui.','Sinh viên làng đại học chuộng đi xe buýt vì tiết kiệm.','Xe buýt điện ngày càng phổ biến ở thành phố.','Các trạm có mái che được khách khen nhiều.','Giờ tan tầm 17h–19h, đường Cộng Hòa đông nghẹt.','Một quán cà phê mới mở gần trạm xe buýt, khách ghé đông.'];

const $=s=>document.querySelector(s);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const fmt=v=>{const a=Math.abs(v),s=v<0?'-':'';if(a>=1e9)return s+(a/1e9).toFixed(2).replace('.',',')+' tỷ';if(a>=1e6)return s+(a/1e6).toFixed(a>=1e8?0:1).replace('.',',')+' tr';if(a>=1e3)return s+Math.round(a/1e3)+'k';return s+Math.round(a)+'đ';};
const hhmm=t=>{const m=Math.floor(t)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function dist(a,b){const la=(a[0]+b[0])/2*Math.PI/180;return Math.hypot((a[0]-b[0])*111320,(a[1]-b[1])*111320*Math.cos(la));}
const faceOf=s=>s>=80?'face4':s>=60?'face3':s>=40?'face2':'face1';
const moodTxt=s=>s>=80?'Rất hài lòng':s>=60?'Hài lòng':s>=40?'Tạm được':'Bực bội';
const satColor=s=>s>=80?'#22c55e':s>=60?'#84cc16':s>=40?'#eab308':'#ef4444';
const rnd=a=>a[Math.floor(Math.random()*a.length)];
const stars=n=>'★'.repeat(n)+'☆'.repeat(5-n);

let D,S,map,routeById={},stopW=[],stopRoutes=[],fxCtx,rainCtx,sprites={},iconImg={},boundary,stopGrid={};
let speedMul=1,lastTs=0,floaters=[],curTab='map',sheetCtx=null,routeFilter='all',routeQuery='',sub={fleet:'bus',fin:'sum',more:null};
let viewDirty=true,stopScreen=[],previewRef=null,mapReady=false,frameSkip=0,dpr=1,createMode=null;
/* ---------- State ---------- */
function newLedger(d){return {day:d,fare:0,sub:0,fuel:0,upk:0,build:0,bonus:0,wage:0,interest:0,repair:0,contract:0};}
function newState(){ return {v:3,money:START_MONEY,t:6*60,xp:0,level:1,sat:70,opened:{},buses:[],shelters:{},waiting:{},nextId:1,
  ledger:[newLedger(1)],paxTotal:0,event:null,seen:{},fare:7000,rsat:{},opt:{fps:60,sfx:1,music:0,fs:'md',automaint:1,svcStart:270,svcEnd:1320,nightFF:1,theme:'auto'},
  drivers:[],cands:[],depots:['bt'],custom:[],missions:null,weekly:null,ach:{},contracts:{offers:[],active:[]},loans:[],
  stopUp:{},depotUp:{},comp:{name:'Xe buýt Phương Nam',buses:4,routes:[],sat:62,pax:0},notes:[],fc:[],rec:{},stat:{},ss:{},td:{}}; }
function genDriver(){ const skill=clamp(Math.round(1+Math.random()*3.2+(S?S.level*.08:0)),1,5);
  return {id:S.nextId++,name:rnd(HO)+' '+rnd(DEM)+' '+rnd(TEN),skill,shift:'full',bus:null,wage:250000+skill*90000}; }
function driverWage(d){ return d.wage*SHIFTS[d.shift].mul; }
function migrate(s,stopmap){
  const N=newState();
  for(const k in N) if(s[k]===undefined) s[k]=N[k];
  s.opt=Object.assign({},N.opt,s.opt||{});
  for(const l of s.ledger) for(const k in newLedger(0)) if(l[k]===undefined) l[k]=0;
  if(s.v===1){
    if(stopmap){ const re=o=>{const n={}; for(const k in o){ const m=stopmap[+k]; if(m!==undefined&&m>=0) n[m]=o[k]; } return n;}; s.shelters=re(s.shelters); s.waiting=re(s.waiting); }
    s.v=3; s._needDrivers=1;
    for(const b of s.buses){ b.dir=0; b.dest={}; b.l=0; b.cond=90; b.born=s.t; b.st='ok'; b._reset=1; }
  }
  for(const k in s.opened){ const o=s.opened[k]; o.up=o.up||{}; o.bd=o.bd||0; }
  return s;
}
function save(){ try{ localStorage.setItem(SAVE_KEY,JSON.stringify(S,(k,v)=>k==='_p'?undefined:v)); }catch(e){} }
function load(stopmap){ try{ const s=JSON.parse(localStorage.getItem(SAVE_KEY)); if(s&&(s.v===1||s.v===3)) return migrate(s,stopmap); }catch(e){ console.warn(e); } return null; }
const today=()=>S.ledger[S.ledger.length-1];
const day=()=>Math.floor(S.t/1440)+1;
const hour=()=>(S.t%1440)/60;
const isRush=h=>(h>=6&&h<8.5)||(h>=16.5&&h<19);
function hourFactor(h){ if(h<5) return .35; if(h<6) return .5; if(h<8.5) return 1.9; if(h<11) return 1; if(h<13) return 1.2; if(h<16.5) return .9; if(h<19) return 2; if(h<22) return .8; return .2; }

/* ---------- Data ---------- */
function stopWeight(name,p){
  let w=.6; const n=name.toLowerCase();
  const K=[[/bến thành/,2.5],[/chợ/,1.0],[/bến xe/,1.6],[/đại học|đh |trường đh|ký túc|ktx/,1.4],[/bệnh viện|bv /,1.0],[/siêu thị|co\.?op|big c|aeon|vincom|lotte|emart|go!|mall|plaza/,1.1],[/sân bay|tân sơn nhất/,1.6],[/ga /,0.8],[/công viên/,0.6],[/trường|thpt|thcs/,0.5],[/khu công nghiệp|kcn|khu chế xuất/,1.0],[/nhà thờ|chùa/,0.3],[/ngã tư|ngã ba|vòng xoay/,0.4],[/ubnd|quận/,0.3]];
  for(const [re,v] of K) if(re.test(n)) w+=v;
  const dc=dist(p,CENTER); w+=1.8*Math.exp(-dc/3500)+.6*Math.exp(-dc/9000);
  return clamp(w,.4,5);
}
function mkDir(g,s){ const cum=[0]; for(let k=1;k<g.length;k++) cum.push(cum[k-1]+dist(g[k-1],g[k]));
  return {g,cum,ll:g.map(p=>[p[1],p[0]]),sd:s.map(x=>Math.min(x[1],cum[cum.length-1])),si:s.map(x=>x[0]),len:cum[cum.length-1]}; }
function revDir(A){ const L=A.len; const g=[...A.g].reverse(); const s=A.si.map((si,i)=>[si,L-A.sd[i]]).reverse(); const d=mkDir(g,s); d.synth=1; return d; }
function setupRoute(r,i){
  r.color=r.color||PALETTE[i%PALETTE.length];
  const A=mkDir(r.g,r.s); const B=r.g2?mkDir(r.g2,r.s2):revDir(A);
  r.dirs=[A,B]; r.two=!!r.g2;
  r.allStops=[...new Set([...A.si,...B.si])];
  r.allStops.forEach(si=>stopRoutes[si].includes(r.ref)||stopRoutes[si].push(r.ref));
  r.km=A.len/1000; r.si=A.si;
  r.cost=r.cost||Math.round((3000000+r.km*250000+A.si.length*40000)/100000)*100000;
  r.pot=r.allStops.reduce((a,s)=>a+stopW[s],0)/r.allStops.length;
  r.title=(r.name||'').replace(/^Số\s*\S+\s*[:\-–]?\s*/,'')||((r.from||'')+' – '+(r.to||''));
  r.ll=A.ll; routeById[r.ref]=r;
}
function prepData(){
  D.stops.forEach((s,i)=>{ stopW[i]=stopWeight(s[0],[s[1],s[2]]); stopRoutes[i]=[];
    const key=Math.floor(s[1]*50)+':'+Math.floor(s[2]*50); (stopGrid[key]||(stopGrid[key]=[])).push(i); });
  D.routes.forEach(setupRoute);
  const pots=D.routes.map(r=>r.pot).sort((a,b)=>a-b),q=x=>pots[Math.floor(pots.length*x)];
  D.potQ=[q(.3),q(.6),q(.85)];
  D.routes.forEach(r=>r.fire=r.pot>=D.potQ[2]?4:r.pot>=D.potQ[1]?3:r.pot>=D.potQ[0]?2:1);
  const sw=[...stopW].sort((a,b)=>a-b),qs=x=>sw[Math.floor(sw.length*x)];
  D.qs=[qs(.5),qs(.8),qs(.95)];
  D.depots=DEPOTS.map(dp=>{ const i=D.stops.findIndex(s=>dp.re.test(s[0])); return i<0?null:Object.assign({},dp,{si:i,p:[D.stops[i][1]+.0009,D.stops[i][2]-.0009]}); }).filter(Boolean);
  D.depotById=Object.fromEntries(D.depots.map(d=>[d.id,d]));
}
function addCustomRoute(c){
  const r={ref:c.ref,name:c.name,from:D.stops[c.stops[0]][0],to:D.stops[c.stops[c.stops.length-1]][0],op:'Tuyến riêng của bạn',g:c.g,s:c.s,color:c.color,custom:1};
  D.routes.push(r); setupRoute(r,D.routes.length-1); r.fire=r.pot>=D.potQ[2]?4:r.pot>=D.potQ[1]?3:r.pot>=D.potQ[0]?2:1; return r;
}
const stopFire=si=>1+(stopW[si]>=D.qs[0])+(stopW[si]>=D.qs[1])+(stopW[si]>=D.qs[2]);
function posAt(dr,s){ const c=dr.cum; let lo=0,hi=c.length-1; while(hi-lo>1){ const m=(lo+hi)>>1; if(c[m]<=s) lo=m; else hi=m; }
  const a=dr.g[lo],b=dr.g[hi],f=clamp((s-c[lo])/((c[hi]-c[lo])||1),0,1); return {lat:a[0]+(b[0]-a[0])*f,lng:a[1]+(b[1]-a[1])*f,i:lo}; }
function openRoutes(){ return Object.keys(S.opened).map(k=>routeById[k]).filter(Boolean); }
let servedCache=null;
function servedStops(){ if(servedCache) return servedCache; const set=new Set(); for(const r of openRoutes()) r.allStops.forEach(s=>set.add(s)); return servedCache=[...set]; }
const busCount=ref=>S.buses.reduce((a,b)=>a+(b.r===ref),0);
const rsat=ref=>(S.rsat[ref]&&S.rsat[ref].s)??70;
const fleetCap=()=>S.depots.reduce((a,id)=>a+DEPOT_CAP+(hasDU(id,'expand')?5:0),0);
function nearDepot(r){ for(const id of S.depots){ const dp=D.depotById[id]; if(!dp) continue; for(let i=0;i<r.dirs[0].g.length;i+=3) if(dist(r.dirs[0].g[i],dp.p)<2500) return dp; } return null; }
/* ---------- Drivers / bus status ---------- */
function busDrivers(b){ return S.drivers.filter(d=>d.bus===b.id); }
function onShift(d,h){ const r=shiftRange(d.shift); return h>=r[0]&&h<r[1]; }
function activeDriver(b,h=hour()){ let best=null; for(const d of S.drivers) if(d.bus===b.id&&onShift(d,h)&&(!best||d.skill>best.skill)) best=d; return best; }
const busActive=b=>b.r&&b.st==='ok'&&!!activeDriver(b);
const maxCond=b=>clamp(100-Math.max(0,(S.t-(b.born||0))/1440)*1.2,55,100);
function placeBus(b,ref,idx){ const r=routeById[ref]; const n=idx??(busCount(ref)-1); const dir=n%2; const dr=r.dirs[dir]; const k=Math.floor(((n*.618)%1)*(dr.si.length-1)); b.dir=dir; b.k=k; b.s=dr.sd[k]; b.l=0; b.dest={}; b.dw=1; }

/* ---------- Weather forecast ---------- */
const WX={sun:{n:'Nắng',ic:'sun'},cloud:{n:'Nhiều mây',ic:'cloudsun'},rain:{n:'Mưa',ic:'rain'},storm:{n:'Mưa giông',ic:'storm'}};
function nextWx(w){ const T={sun:[['sun',.72],['cloud',.22],['rain',.06]],cloud:[['sun',.35],['cloud',.38],['rain',.22],['storm',.05]],rain:[['cloud',.42],['rain',.43],['storm',.15]],storm:[['rain',.6],['cloud',.4]]}[w]||[['sun',1]];
  let x=Math.random(); for(const [k,p] of T){ if((x-=p)<=0) return k; } return T[0][0]; }
function fillForecast(){ if(!S.fc.length) S.fc.push({h:Math.floor(S.t/60),w:'sun'}); while(S.fc.length<13){ const l=S.fc[S.fc.length-1]; S.fc.push({h:l.h+1,w:nextWx(l.w)}); } }
const wxNow=()=>(S.fc[0]&&S.fc[0].w)||'sun';
const raining=()=>{ const w=wxNow(); return w==='rain'||w==='storm'; };

/* ---------- Satisfaction ---------- */
function computeRouteSat(r){
  const buses=S.buses.filter(b=>b.r===r.ref), act=buses.filter(busActive), n=act.length, f={}, o=S.opened[r.ref], up=o.up||{};
  let wsum=0; for(const si of r.allStops) wsum+=(S.waiting[si]||0); const wavg=wsum/r.allStops.length;
  f.wait=clamp(100-(wavg-6)*2.4,0,100);
  const avgSpeed=n?act.reduce((a,b)=>a+MODELS[b.m].speed,0)/n:300;
  const headway=n?(r.dirs[0].len+r.dirs[1].len)/avgSpeed/n:999;
  f.freq=n?clamp(100-(headway-15)*.9,0,100):(!inService()?60:0);
  f.crowd=n?clamp(100-act.reduce((a,b)=>a+Math.max(0,b.l/MODELS[b.m].cap-.75),0)/n*250,0,100):50;
  let cf=buses.length?buses.reduce((a,b)=>{ const d=activeDriver(b); return a+MODELS[b.m].comfort+(d?(d.skill-3)*4-(d.shift==='full'?4:0):0); },0)/buses.length:50;
  const su=routeSU(r), night=hour()<5.5||hour()>=18.5, dpo=routeDepot(r);
  f.wait=clamp(f.wait+8*su.bench+14*su.board+(night?6:2)*su.light,0,100);
  f.comfort=clamp(cf+(up.ac?12:0)+5*su.bench+6*su.green+(night?8:3)*su.light+(dpo&&hasDU(dpo.id,'wash')?6:0),0,100);
  const sh=r.allStops.filter(si=>S.shelters[si]).length/r.allStops.length, shf=Math.min(1,sh*2.5); f.shelter=35+65*shf;
  const e=S.event, jam=e&&e.type==='jam'&&e.route===r.ref; f.weather=100;
  if(raining()) f.weather=100-(wxNow()==='storm'?75:60)*(1-shf); if(jam) f.weather=Math.min(f.weather,(up.lane?80:45)+18*su.bay);
  f.fare=FARE_SAT[S.fare];
  const relB=6*su.board+10*su.bay;
  f.reliab=clamp((isRush(hour())?(up.lane?90:72):95)+(up.signal?15:0)-(jam?(up.lane?10:35):0)-(raining()?10:0)-(o.bd||0)*8-(S.comp.routes.includes(r.ref)?5:0)+relB,0,100);
  let target=0; for(const F of FACTORS) target+=F.w*f[F.k];
  return {target,f,headway};
}
function updateSat(rate){
  let tot=0,wt=0;
  for(const r of openRoutes()){ const c=computeRouteSat(r); const o=S.rsat[r.ref]||(S.rsat[r.ref]={s:70});
    o.s=clamp(o.s+(c.target-o.s)*rate,0,100); o.f=c.f; o.hw=c.headway; const w=1+(S.opened[r.ref].pax||0); tot+=o.s*w; wt+=w; }
  if(wt) S.sat=tot/wt;
}
function stopMood(si){ if(!inService()) return 70; const w=S.waiting[si]||0, sh=S.shelters[si]; let m=100-w*1.3+(sh?10:0)+suMood(si); if(raining()&&!sh) m-=25; return clamp(m,0,100); }
function stopSatFactor(si){ let best=0, comp=false; for(const ref of stopRoutes[si]) if(S.opened[ref]){ best=Math.max(best,rsat(ref)); if(S.comp.routes.includes(ref)) comp=true; } return (.5+best/100)*(comp?.8:1); }

/* ---------- Simulation ---------- */
function eventSpeed(r){ let f=1; const e=S.event, up=S.opened[r.ref].up||{};
  if(raining()) f*=wxNow()==='storm'?.78:.86; if(e&&e.type==='jam'&&e.route===r.ref) f*=up.lane?.85:.45; if(isRush(hour())) f*=up.lane?.96:.8; if(up.lane) f*=1.25; return f; }
function spawnFactor(si){
  let f=hourFactor(hour())*stopSatFactor(si)*FARE_DEMAND[S.fare];
  if(S.shelters[si]) f*=1.15; f*=suSpawn(si);
  if(raining()) f*=S.shelters[si]?1.25:.9;
  const e=S.event; if(e&&e.type==='fest'&&dist([D.stops[si][1],D.stops[si][2]],e.p)<1600) f*=3;
  return f;
}
function addMoney(v,cat){ S.money+=v; const t=today(); t[cat]=(t[cat]||0)+Math.abs(v); }
function step(dt){
  const prevDay=day(),prevH=Math.floor(hour()),prev10=Math.floor(S.t/10);
  const wasSvc=inService(); S.t+=dt; const h=hour(), svc=inService(h);
  if(svc) for(const si of servedStops()){ const cap=S.shelters[si]?120:80; S.waiting[si]=Math.min(cap,(S.waiting[si]||0)+.022*stopW[si]*spawnFactor(si)*dt); }
  else for(const si of servedStops()){ const w=S.waiting[si]; if(w) S.waiting[si]=w<.5?0:w*Math.max(0,1-.06*dt); }
  if(wasSvc&&!svc&&S.buses.length){ notify(`${fmtH(svcE())}: hết giờ chạy. Xe ngừng đón khách, trả nốt khách rồi về bãi. ${fmtH(svcS())} chạy lại`,'sleep'); news('Xe buýt kết thúc ngày làm việc, các trạm tạm đóng đến sáng.'); }
  if(!wasSvc&&svc&&S.buses.length){ notify(`${fmtH(svcS())}: xe rời bãi, bắt đầu chạy tuyến`,'sunrise'); }
  for(const d of S.drivers) addMoney(-driverWage(d)/1440*dt,'wage');
  for(const b of S.buses){
    const M=MODELS[b.m]; addMoney(-M.upk/1440*dt*(b.park&&S.t>=(b.ret||0)?.4:1),'upk');
    if(b.st!=='ok'){ if(S.t>=b.until) finishStatus(b); continue; }
    if(!b.r) continue; const r=routeById[b.r]; if(!r){ b.r=null; continue; }
    const ov=overnightBus(b,r,M,dt); if(ov===true) continue;
    const drv=ov==='drive'?(busDrivers(b)[0]):activeDriver(b,h); if(!drv) continue;
    if(b.dw>0){ b.dw-=dt; continue; }
    const dr=r.dirs[b.dir], before=b.s;
    b.s+=M.speed*eventSpeed(r)*(.94+.03*drv.skill)*dt;
    if(b.s>=dr.sd[b.k]){ b.s=dr.sd[b.k]; arrive(b,r,M); }
    const km=Math.max(0,b.s-before)/1000; b.km+=km; addMoney(-M.fuel*km*(b.m==='ev'&&(()=>{const d=routeDepot(r); return d&&hasDU(d.id,'charge');})()?.6:1),'fuel'); addMoney(SUBSIDY_KM*km,'sub');
    b.cond=Math.max(0,(b.cond??100)-km*.07);
    if(Math.random()<.00003*dt*(1+(100-b.cond)/12)*(1.4-.1*drv.skill)*M.rel*(raining()?1.3:1)) breakdown(b,r);
    else if(S.opt.automaint&&b.cond<35&&b.dw<=0&&b.l===0) startMaint(b,true);
  }
  if(Math.floor(S.t/10)!==prev10&&svc) updateSat(.18);
  if(Math.floor(hour())!==prevH) hourly();
  if(day()!==prevDay) newDay(prevDay);
}
function boardDest(b,dr,k,n){ const js=[],ws=[]; let W=0; for(let j=k+1;j<dr.si.length;j++){ const w=stopW[dr.si[j]]*(1+.15*Math.min(8,j-k)); js.push(j); ws.push(w); W+=w; }
  if(!js.length) return; let left=n; for(let i=0;i<js.length&&left>0;i++){ const c=Math.floor(n*ws[i]/W); if(c>0){ b.dest[js[i]]=(b.dest[js[i]]||0)+c; left-=c; } }
  while(left-->0){ let x=Math.random()*W; for(let i=0;i<js.length;i++){ if((x-=ws[i])<=0){ b.dest[js[i]]=(b.dest[js[i]]||0)+1; break; } } } }
function arrive(b,r,M){
  const dr=r.dirs[b.dir], si=dr.si[b.k], last=b.k>=dr.si.length-1;
  let off=last?b.l:(b.dest[b.k]||0); off=Math.min(off,b.l); delete b.dest[b.k]; b.l-=off;
  const ss=S.ss[si]||(S.ss[si]=[0,0]); ss[1]+=off; const ts=S.td.ss||(S.td.ss={}); const t2=ts[si]||(ts[si]=[0,0]); t2[1]+=off;
  if(cab&&cab.id===b.id) cabArrive(b,si,last||!inService()?0:Math.min(Math.floor(S.waiting[si]||0),M.cap-b.l),off);
  if(last){ b.dir^=1; b.k=0; b.s=r.dirs[b.dir].sd[0]; b.dest={}; b.l=0; b.trips=(b.trips||0)+1; b.dw=8+off*.06; return; }
  const on=inService()?Math.min(Math.floor(S.waiting[si]||0),M.cap-b.l):0;
  S.waiting[si]=(S.waiting[si]||0)-on; b.l+=on; if(on>0) boardDest(b,dr,b.k,on);
  b.k++;
  if(on>0){ const rev=on*S.fare; addMoney(rev,'fare'); S.xp+=Math.round(on*(S.sat>=80?1.2:1)); S.paxTotal+=on; ss[0]+=on; t2[0]+=on;
    const o=S.opened[r.ref]; o.pax=(o.pax||0)+on; o.rev=(o.rev||0)+rev; S.td.pax=(S.td.pax||0)+on; S.td.fare=(S.td.fare||0)+rev;
    const so=S.td.stopOn||(S.td.stopOn={}); so[si]=(so[si]||0)+on; if(S.weekly) S.weekly.prog+=on;
    for(const c of S.contracts.active) if(nearSet(c).has(si)) c.prog+=on;
    if(on>=3&&floaters.length<20) floaters.push({lat:D.stops[si][1],lng:D.stops[si][2],txt:'+'+fmt(rev),life:1});
    if(on>=12) sfx('coin'); checkLevel(); }
  b.dw=(.8+(on+off)*.08)*(hasSU(si,'bay')?.7:1);
}
function breakdown(b,r){ b.st='broken'; b.until=S.t+60; b.lost=b.l; b.l=0; b.dest={}; S.opened[r.ref].bd=(S.opened[r.ref].bd||0)+1; S.rsat[r.ref]&&(S.rsat[r.ref].s=Math.max(0,S.rsat[r.ref].s-4));
  S.stat.breakdowns=(S.stat.breakdowns||0)+1; notify(`Xe #${b.id} (tuyến ${r.ref}) bị hư giữa đường! Gọi cứu hộ ngay`,'broken',true); sfx('bad'); news(`Một xe buýt tuyến ${r.ref} gặp sự cố kỹ thuật, hành khách chuyển sang xe khác.`); }
function towBus(b,auto){ if(b.st!=='broken') return; const r=routeById[b.r], dp=r&&nearDepot(r), M=MODELS[b.m];
  const wk=dp&&hasDU(dp.id,'work'); const cost=Math.round(((dp?300000:600000)*(auto?1.5:1)+M.price*.02)*(wk?.75:1)/1e4)*1e4; addMoney(-cost,'repair');
  b.st='repair'; b.until=S.t+(dp?45:90)*(wk?.6:1); notify(`${auto?'Tự động gọi':'Đã gọi'} cứu hộ xe #${b.id} về ${dp?dp.n:'xưởng'} (${fmt(cost)})`,'tow'); save(); }
function startMaint(b,auto){ if(b.st!=='ok') return; const M=MODELS[b.m], r=b.r&&routeById[b.r], dp=r&&nearDepot(r), wk=dp&&hasDU(dp.id,'work'); const cost=Math.round(M.price*.03*(wk?.75:1)/1e4)*1e4;
  if(S.money<cost&&!auto) return toast('Không đủ tiền bảo dưỡng','coin'); addMoney(-cost,'repair'); b.st='maint'; b.until=S.t+(dp?60:120)*(wk?.6:1); b.l=0; b.dest={};
  S.td.maint=(S.td.maint||0)+1; if(!auto) toast(`Xe #${b.id} vào xưởng bảo dưỡng (${fmt(cost)})`,'wrench'); else notify(`Xe #${b.id} tự vào bảo dưỡng (${fmt(cost)})`,'wrench'); }
function finishStatus(b){
  if(b.st==='broken'){ towBus(b,true); return; }
  if(b.st==='repair'){ b.cond=Math.min(maxCond(b),(b.cond||0)+45); notify(`Xe #${b.id} đã sửa xong, quay lại tuyến`,'check'); }
  if(b.st==='maint'){ b.cond=maxCond(b); notify(`Xe #${b.id} bảo dưỡng xong (${Math.round(b.cond)}%)`,'check'); }
  b.st='ok'; b.dw=2; if(b.r) placeBus(b,b.r);
}
function checkLevel(){
  while(S.level<LEVEL_XP.length&&S.xp>=LEVEL_XP[S.level]){
    S.level++; const un=Object.values(MODELS).filter(m=>m.lvl===S.level); const ups=Object.values(UPGRADES).filter(u=>u.lvl===S.level); const bonus=S.level*600000; S.money+=bonus; sfx('level');
    modal(`<div class="big">${ICON('trophy',72)}</div><h2>Lên cấp ${S.level}!</h2><p>Thưởng <b>${fmt(bonus)}</b>.${un.length?'<br>Mở khóa xe: <b>'+un.map(m=>m.name).join(', ')+'</b>':''}${ups.length?'<br>Mở khóa nâng cấp tuyến: <b>'+ups.map(u=>u.n).join(', ')+'</b>':''}<br>Hạn mức vay tăng lên <b>${fmt(loanLimit())}</b>.</p>${un.map(m=>ICON(m.icon,64)).join('')}<button class="btn full" data-close>Tuyệt!</button>`);
    news(`Công ty của bạn được vinh danh: đạt cấp ${S.level}!`);
  }
}
const evIcon=e=>e.type==='jam'?'jam':'fest';
function hourly(){
  S.fc.shift(); fillForecast(); const w=wxNow(), prevW=S._lastWx; S._lastWx=w;
  if((w==='rain'||w==='storm')&&prevW!==w&&openRoutes().length){ notify(w==='storm'?'Mưa giông! Xe chạy chậm, khách ở trạm không mái che rất bực':'Trời bắt đầu mưa, khách ở trạm không mái che bực bội',w); }
  if(w==='sun'&&(prevW==='rain'||prevW==='storm')) notify('Trời đã tạnh mưa','sun');
  const in2=S.fc.slice(1,4).find(x=>x.w==='storm'); if(in2&&!S._warned){ S._warned=1; news('Dự báo: sắp có mưa giông trong vài giờ tới.'); } if(!in2) S._warned=0;
  const e=S.event;
  if(e&&S.t>=e.end){ notify(e.type==='jam'?'Hết kẹt xe trên tuyến '+e.route:'Lễ hội đã kết thúc',e.type==='jam'?'check':'fest'); S.event=null; }
  else if(!e&&openRoutes().length&&Math.random()<.09){
    const o=openRoutes();
    if(Math.random()<.6){ const r=rnd(o); S.event={type:'jam',route:r.ref,end:S.t+60+Math.random()*90,txt:`Kẹt xe trên tuyến ${r.ref}! Xe chạy chậm hẳn`}; }
    else { const sv=[...servedStops()].sort((a,b)=>stopW[b]-stopW[a]).slice(0,25), si=rnd(sv), nm=rnd(FESTIVALS);
      S.event={type:'fest',p:[D.stops[si][1],D.stops[si][2]],end:S.t+120+Math.random()*60,txt:`${nm} gần trạm ${D.stops[si][0]}: khách tăng gấp 3!`}; }
    notify(S.event.txt,evIcon(S.event)); news(S.event.txt);
  }
  const hr=Math.floor(hour()); if(hr===6) notify('Giờ cao điểm sáng! Khách đổ ra trạm','sunrise'); if(hr===17) notify('Giờ cao điểm chiều! Tăng xe cho tuyến đông','fire');
  if(Math.random()<.25) news(rnd(NEWS_FLAVOR));
  checkAch(); checkMissionsLive();
  S.rec.maxBuses=Math.max(S.rec.maxBuses||0,S.buses.length); S.rec.maxRoutes=Math.max(S.rec.maxRoutes||0,Object.keys(S.opened).length); S.rec.maxSat=Math.max(S.rec.maxSat||0,Math.round(openRoutes().length?S.sat:0));
}
function newDay(prev){
  const t=today(); let msg='';
  if(openRoutes().length){
    if(S.sat>=75){ const bn=Math.round((S.sat-75)*200000*Math.max(1,openRoutes().length)/1e5)*1e5; if(bn>0){ addMoney(bn,'bonus'); msg=` · Thưởng hài lòng +${fmt(bn)}`; } }
    else if(S.sat<35){ const pn=Math.round((35-S.sat)*1e5/1e5)*1e5; S.money-=pn; t.bonus-=pn; msg=` · Phạt chất lượng -${fmt(pn)}`; }
  }
  let intr=0; for(const l of S.loans) intr+=l.amt*l.rate; if(intr){ addMoney(-intr,'interest'); }
  // hợp đồng
  for(const c of S.contracts.active) if(c.perDay){ addMoney(c.perDay,'contract'); }
  const inc=t.fare+t.sub+Math.max(0,t.bonus)+t.contract, exp=t.fuel+t.upk+t.wage+t.interest+t.repair+Math.max(0,-t.bonus);
  const profit=inc-exp;
  notify(`Hết ngày ${prev}: ${profit>=0?'lãi':'lỗ'} ${fmt(Math.abs(profit))}${msg}`,'calendar');
  S.rec.bestPax=Math.max(S.rec.bestPax||0,S.td.pax||0); S.rec.bestProfit=Math.max(S.rec.bestProfit||0,profit); S.rec.bestFare=Math.max(S.rec.bestFare||0,t.fare);
  if(S.weekly&&S.weekly.prog>=S.weekly.target&&!S.weekly.done) S.weekly.done=1;
  // missions end-of-day sat check
  if(S.missions) for(const m of S.missions.list) if(m.type==='sat'&&!m.done&&S.sat>=m.target&&openRoutes().length) m.done=1;
  S.ledger.push(newLedger(day())); if(S.ledger.length>30) S.ledger.shift();
  for(const k in S.opened){ S.opened[k].pax=0; S.opened[k].rev=0; S.opened[k].bd=0; }
  S.td={}; genMissions(); if(Math.floor((day()-1)/7)!==S.weekly.week) genWeekly();
  S.cands=[genDriver(),genDriver(),genDriver()];
  contractsDaily(); competitorDaily();
  if(S.money<0) notify('Cảnh báo: công ty đang âm tiền! Vay ngân hàng hoặc bán bớt xe','warn',true);
  save();
}

/* ---------- Missions ---------- */
function genMissions(){
  const L=S.level, sv=servedStops(), busy=sv.length?[...sv].sort((a,b)=>stopW[b]-stopW[a])[Math.floor(Math.random()*Math.min(8,sv.length))]:null;
  const pool=[
    {type:'pax',n:`Chở ${(300+L*180).toLocaleString('vi-VN')} khách hôm nay`,target:300+L*180,rw:1e6+L*4e5,ic:'people'},
    {type:'fare',n:`Thu ${fmt((300+L*180)*5000)} tiền vé hôm nay`,target:(300+L*180)*5000,rw:1e6+L*4e5,ic:'ticket'},
    {type:'sat',n:`Giữ hài lòng ≥ ${Math.min(85,62+L*2)}% lúc hết ngày`,target:Math.min(85,62+L*2),rw:1.5e6+L*3e5,ic:'star'},
    {type:'shelter',n:'Xây 1 mái che mới',target:1,rw:1.2e6,ic:'shelter'},
    {type:'buy',n:'Mua thêm 1 xe buýt',target:1,rw:1.5e6+L*2e5,ic:'cart'},
    {type:'maint',n:'Bảo dưỡng 1 xe buýt',target:1,rw:8e5,ic:'wrench'},
  ];
  if(busy!==null) pool.push({type:'stop',si:busy,n:`Đón ${60+L*15} khách ở trạm ${D.stops[busy][0]}`,target:60+L*15,rw:1.2e6+L*3e5,ic:'stop'});
  const list=[]; while(list.length<3&&pool.length){ const i=Math.floor(Math.random()*pool.length); list.push(Object.assign({done:0,claimed:0},pool.splice(i,1)[0])); }
  S.missions={day:day(),list};
}
function genWeekly(){ const L=S.level; S.weekly={week:Math.floor((day()-1)/7),target:3000+L*1500,prog:0,rw:8e6+L*2e6,done:0,claimed:0}; }
function missionProg(m){ const td=S.td; return m.type==='pax'?(td.pax||0):m.type==='fare'?(td.fare||0):m.type==='sat'?Math.round(S.sat):m.type==='shelter'?(td.shelters||0):m.type==='buy'?(td.buys||0):m.type==='maint'?(td.maint||0):m.type==='stop'?((td.stopOn||{})[m.si]||0):0; }
function checkMissionsLive(){ if(!S.missions) return; let n=0; for(const m of S.missions.list) if(!m.done&&m.type!=='sat'&&missionProg(m)>=m.target){ m.done=1; n++; notify('Hoàn thành nhiệm vụ: '+m.n+'. Vào Thêm › Nhiệm vụ để nhận thưởng','mission'); sfx('good'); }
  if(S.weekly&&!S.weekly.done&&S.weekly.prog>=S.weekly.target){ S.weekly.done=1; notify('Hoàn thành nhiệm vụ tuần!','gift'); } }
function claimMission(i){ const m=i==='w'?S.weekly:S.missions.list[i]; if(!m||!m.done||m.claimed) return; m.claimed=1; addMoney(m.rw,'bonus'); S.xp+=Math.round(m.rw/20000); sfx('level'); toast('Nhận thưởng '+fmt(m.rw),'gift'); checkLevel(); save(); refreshSheet(); }
function pendingClaims(){ let n=0; if(S.missions) for(const m of S.missions.list) if(m.done&&!m.claimed) n++; if(S.weekly&&S.weekly.done&&!S.weekly.claimed) n++; return n; }

/* ---------- Achievements ---------- */
function checkAch(){ for(const a of ACH){ if(S.ach[a.id]) continue; if(a.ok(S)){ S.ach[a.id]=day(); S.money+=a.rw; notify(`Thành tựu mới: ${a.n} (+${fmt(a.rw)})`,'medal',true); sfx('level'); } } }

/* ---------- Contracts ---------- */
const nearCache={};
function nearSet(c){ if(nearCache[c.id]) return nearCache[c.id]; const p=[D.stops[c.si][1],D.stops[c.si][2]], set=new Set();
  const k0=Math.floor(p[0]*50),k1=Math.floor(p[1]*50); for(let a=-1;a<=1;a++) for(let b=-1;b<=1;b++) for(const si of (stopGrid[(k0+a)+':'+(k1+b)]||[])) if(dist(p,[D.stops[si][1],D.stops[si][2]])<800) set.add(si);
  return nearCache[c.id]=set; }
function contractsDaily(){
  const C=S.contracts; C.offers=C.offers.filter(o=>o.exp>=day());
  for(const c of [...C.active]){ if(c.prog>=c.need){ addMoney(c.reward,'contract'); S.stat.contracts=(S.stat.contracts||0)+1; notify(`Hoàn thành hợp đồng "${c.n}": +${fmt(c.reward)}`,'contract',true); news(`Thành phố khen ngợi dịch vụ xe buýt khu vực ${D.stops[c.si][0]}.`); C.active.splice(C.active.indexOf(c),1); }
    else if(day()>c.deadline){ notify(`Hợp đồng "${c.n}" đã hết hạn`,'warn'); C.active.splice(C.active.indexOf(c),1); } }
  if(C.offers.length<2&&Math.random()<.6&&day()>=2){
    const cand=D.stops.map((s,i)=>i).filter(i=>stopW[i]>=D.qs[1]); const si=rnd(cand); const L=S.level;
    const need=200+L*90, days=3, reward=Math.round((need*9000+L*1e6)/1e5)*1e5;
    C.offers.push({id:'c'+(S.nextId++),si,n:`Phục vụ khu ${D.stops[si][0]}`,need,days,reward,perDay:Math.round(reward*.08/1e4)*1e4,exp:day()+2});
    notify('Thành phố gửi đề nghị hợp đồng mới','contract'); }
}
function acceptContract(id){ const C=S.contracts, i=C.offers.findIndex(o=>o.id===id); if(i<0) return; if(C.active.length>=3) return toast('Tối đa 3 hợp đồng cùng lúc','warn');
  const c=C.offers.splice(i,1)[0]; c.prog=0; c.deadline=day()+c.days; C.active.push(c); toast('Đã nhận hợp đồng: '+c.n,'contract'); save(); refreshSheet(); }

/* ---------- Bank ---------- */
const loanLimit=()=>20e6+S.level*10e6;
const debt=()=>S.loans.reduce((a,l)=>a+l.amt,0);
function borrow(a){ if(debt()+a>loanLimit()) return toast('Vượt hạn mức vay','bank'); S.loans.push({id:S.nextId++,amt:a,rate:a>=50e6?.012:.015,day:day()}); S.money+=a; sfx('coin'); toast('Đã vay '+fmt(a),'bank'); save(); refreshSheet(); }
function repay(id){ const l=S.loans.find(x=>x.id===id); if(!l) return; if(S.money<l.amt) return toast('Không đủ tiền trả nợ','coin'); S.money-=l.amt; S.loans=S.loans.filter(x=>x!==l); S.stat.repaid=(S.stat.repaid||0)+1; toast('Đã trả nợ '+fmt(l.amt),'check'); checkAch(); save(); refreshSheet(); }

/* ---------- Competitor ---------- */
function competitorDaily(){ const c=S.comp; c.buses+=Math.random()<.6?1:0; c.sat=clamp(c.sat+(Math.random()-.45)*6,40,88); c.pax=Math.round(c.buses*(500+Math.random()*250));
  for(const ref of [...c.routes]){ if(!S.opened[ref]){ c.routes=c.routes.filter(x=>x!==ref); continue; }
    if(rsat(ref)>=78){ c.routes=c.routes.filter(x=>x!==ref); S.stat.beatComp=(S.stat.beatComp||0)+1; notify(`Khách quá hài lòng, ${c.name} rút khỏi tuyến ${ref}!`,'rival',true); news(`${c.name} rút khỏi tuyến ${ref} vì không cạnh tranh nổi.`); } }
  const o=openRoutes().filter(r=>!c.routes.includes(r.ref));
  if(o.length&&day()>=3&&Math.random()<.3&&c.routes.length<3){ const r=rnd(o); c.routes.push(r.ref); notify(`${c.name} mở xe chạy song song tuyến ${r.ref}! Giữ hài lòng ≥78% để đẩy lùi họ`,'rival',true); news(`${c.name} tung xe mới cạnh tranh trên tuyến ${r.ref}.`); }
}

/* ---------- Notifications & news ---------- */
function notify(txt,ic,important){ S.notes.unshift({t:S.t,txt,ic}); if(S.notes.length>40) S.notes.length=40; S.unread=(S.unread||0)+1; toast(txt,ic); }
function news(txt){ S.newsQ=S.newsQ||[]; S.newsQ.unshift(txt); if(S.newsQ.length>8) S.newsQ.length=8; updTicker(); }
/* ---------- Actions ---------- */
function openRoute(ref){ const r=routeById[ref]; if(!r||S.opened[ref]) return; if(S.money<r.cost) return toast('Không đủ tiền mở tuyến','coin');
  addMoney(-r.cost,'build'); S.opened[ref]={at:S.t,pax:0,rev:0,up:{},bd:0}; S.rsat[ref]={s:70}; setPreview(null); drawNetwork(); focusRoute(r); sfx('buy');
  toast(`Đã mở tuyến ${ref}! Giờ hãy mua xe cho tuyến`,'check'); news(`Tuyến xe buýt ${ref} (${r.title}) chính thức hoạt động dưới thương hiệu của bạn.`); checkAch(); save(); refreshSheet(); }
function closeRoute(ref){ for(const b of S.buses) if(b.r===ref) b.r=null; delete S.opened[ref]; delete S.rsat[ref]; S.comp.routes=S.comp.routes.filter(x=>x!==ref); drawNetwork(); toast('Đã đóng tuyến '+ref,'info'); save(); refreshSheet(); }
function hireDriver(d,silent){ S.drivers.push(d); S.cands=S.cands.filter(x=>x!==d&&x.id!==d.id); if(!silent){ toast(`Đã thuê tài xế ${d.name}`,'driver'); sfx('click'); } checkAch(); return d; }
function fireDriver(id){ const d=S.drivers.find(x=>x.id===id); if(!d) return; S.drivers=S.drivers.filter(x=>x!==d); toast(`Đã cho tài xế ${d.name} nghỉ việc`,'driver'); save(); refreshSheet(); }
function buyBus(m){ const M=MODELS[m]; if(S.level<M.lvl) return toast('Cần cấp '+M.lvl,'lock'); if(S.money<M.price) return toast('Không đủ tiền mua xe','coin');
  if(S.buses.length>=fleetCap()) return toast(`Bãi xe đã đầy (${fleetCap()} xe). Mua thêm bãi xe ở Đội xe › Bãi xe`,'depot');
  addMoney(-M.price,'build'); const b={id:S.nextId++,m,r:null,dir:0,s:0,k:0,l:0,dw:0,km:0,trips:0,cond:100,born:S.t,st:'ok',dest:{},color:null}; S.buses.push(b);
  S.td.buys=(S.td.buys||0)+1; sfx('buy');
  let drv=S.drivers.find(d=>d.bus===null); let hired=false; if(!drv){ drv=hireDriver(genDriver(),true); drv.skill=Math.min(drv.skill,3); drv.wage=250000+drv.skill*90000; hired=true; } drv.bus=b.id;
  const o=openRoutes(); if(o.length){ const pick=(sheetCtx&&sheetCtx.ref&&S.opened[sheetCtx.ref])?routeById[sheetCtx.ref]:o.sort((a,c)=>busCount(a.ref)-busCount(c.ref))[0]; assign(b,pick.ref,true); toast(`Đã mua ${M.name} #${b.id} cho tuyến ${pick.ref}${hired?` · thuê tài xế ${drv.name}`:''}`,M.icon); }
  else toast(`Đã mua ${M.name} #${b.id}. Mở tuyến để giao xe`,M.icon);
  checkAch(); save(); refreshSheet(); }
function assign(b,ref,silent){ b.r=ref||null; b.l=0; b.dest={}; b.dw=1; if(ref){ placeBus(b,ref); if(!silent) toast(`Xe #${b.id} chạy tuyến ${ref}`,'bus'); } save(); }
function sellBus(id){ const i=S.buses.findIndex(b=>b.id===id); if(i<0) return; const b=S.buses[i], M=MODELS[b.m]; const v=Math.round(M.price*.5*(b.cond??100)/100/1e4)*1e4;
  S.money+=v; S.buses.splice(i,1); for(const d of S.drivers) if(d.bus===id) d.bus=null; toast('Đã bán xe, nhận lại '+fmt(v),'coin'); save(); refreshSheet(); }
function buildShelter(si){ buyStopUp(si,'shelter'); }
function setFare(f){ S.fare=f; toast('Giá vé mới: '+fmt(f),'ticket'); news(`Công ty điều chỉnh giá vé xe buýt thành ${fmt(f)}/lượt.`); save(); refreshSheet(); }
function buyUpgrade(ref,k){ const r=routeById[ref], U=UPGRADES[k], o=S.opened[ref]; if(!o||o.up[k]) return; if(S.level<U.lvl) return toast('Cần cấp '+U.lvl,'lock'); const c=U.cost(r); if(S.money<c) return toast('Không đủ tiền','coin');
  addMoney(-c,'build'); o.up[k]=1; sfx('buy'); toast(`Tuyến ${ref}: đã có ${U.n}`,U.ic); news(`Tuyến ${ref} được nâng cấp: ${U.n}.`); save(); refreshSheet(); }
function buyDepot(id){ const dp=D.depotById[id]; if(!dp||S.depots.includes(id)) return; if(S.money<dp.cost) return toast('Không đủ tiền','coin'); addMoney(-dp.cost,'build'); S.depots.push(id); sfx('buy'); viewDirty=true;
  toast(`Đã mua ${dp.n}: +${DEPOT_CAP} chỗ đậu, sửa xe nhanh hơn cho tuyến gần đó`,'depot'); news(`Công ty khai trương ${dp.n}.`); checkAch(); save(); refreshSheet(); }
function setLivery(id,c){ const b=S.buses.find(x=>x.id===id); if(!b) return; b.color=c; sfx('click'); save(); refreshSheet(); }
function assignDriver(did,bid){ const d=S.drivers.find(x=>x.id===did); if(!d) return; d.bus=bid?+bid:null; save(); refreshSheet(); }
function setShift(did,sh){ const d=S.drivers.find(x=>x.id===did); if(!d) return; d.shift=sh; save(); refreshSheet(); }
/* ---------- v5: Nâng cấp trạm & bãi xe ---------- */
const STOP_UPS={
  shelter:{n:'Mái che',ic:'shelter',cost:SHELTER_COST,lvl:1,d:'+15% khách, chứa 120 người, khách không bực khi mưa',fx:['shelter','weather']},
  bench:{n:'Ghế chờ',ic:'bench',cost:300000,lvl:1,d:'Có chỗ ngồi nên khách chờ kiên nhẫn hơn',fx:['wait','comfort']},
  board:{n:'Bảng điện tử báo giờ xe',ic:'board',cost:1200000,lvl:2,d:'Khách biết còn mấy phút xe tới, ít bực khi chờ',fx:['wait','reliab']},
  light:{n:'Đèn chiếu sáng',ic:'lamp',cost:400000,lvl:1,d:'Trạm sáng và an toàn: +15% khách buổi tối',fx:['comfort','wait']},
  green:{n:'Thùng rác & cây xanh',ic:'tree',cost:250000,lvl:1,d:'Trạm sạch sẽ, có bóng mát',fx:['comfort']},
  bay:{n:'Vịnh đỗ xe buýt',ic:'bay',cost:2000000,lvl:3,d:'Xe tấp vào lề đón khách nhanh hơn 30%, đỡ kẹt xe',fx:['reliab','weather']},
};
const SU_KEYS=Object.keys(STOP_UPS);
const FX_NAME=k=>(FACTORS.find(F=>F.k===k)||{}).n||k;
const hasSU=(si,k)=>k==='shelter'?!!S.shelters[si]:!!(S.stopUp[si]&&S.stopUp[si][k]);
function suCount(si){ let n=0; for(const k of SU_KEYS) if(hasSU(si,k)) n++; return n; }
function routeSU(r){ const o={}, N=r.allStops.length||1; for(const k of SU_KEYS){ let c=0; for(const si of r.allStops) if(hasSU(si,k)) c++; o[k]=Math.min(1,c/N*2.5); } return o; }
function suMood(si){ let m=0; const night=hour()<5.5||hour()>=18.5; if(hasSU(si,'bench')) m+=6; if(hasSU(si,'board')) m+=8; if(hasSU(si,'light')) m+=night?12:3; if(hasSU(si,'green')) m+=4; if(hasSU(si,'bay')) m+=2; return m; }
function suSpawn(si){ let f=1; const h=hour(); if(hasSU(si,'light')&&(h<5.5||h>=18)) f*=1.15; if(hasSU(si,'board')) f*=1.05; if(hasSU(si,'green')) f*=1.03; return f; }
function buyStopUp(si,k,silent){
  const U=STOP_UPS[k]; if(!U||hasSU(si,k)) return false;
  if(S.level<U.lvl){ if(!silent) toast('Cần cấp '+U.lvl,'lock'); return false; }
  if(S.money<U.cost){ if(!silent) toast('Không đủ tiền','coin'); return false; }
  addMoney(-U.cost,'build');
  if(k==='shelter'){ S.shelters[si]=1; S.td.shelters=(S.td.shelters||0)+1; } else (S.stopUp[si]||(S.stopUp[si]={}))[k]=1;
  S.stat.stopUps=(S.stat.stopUps||0)+1; viewDirty=true;
  if(!silent){ sfx('buy'); toast(`Trạm ${D.stops[si][0]}: đã có ${U.n}`,U.ic); checkAch(); checkMissionsLive(); save(); refreshSheet(); }
  return true; }
function bulkRoute(ref,which){ const r=routeById[ref]; if(!r) return; const keys=which==='all'?SU_KEYS.filter(k=>S.level>=STOP_UPS[k].lvl):[which];
  const stops=[...r.allStops].sort((a,b)=>stopW[b]-stopW[a]); let n=0, spent=0, short=false;
  for(const k of keys) for(const si of stops){ if(hasSU(si,k)) continue; if(S.money<STOP_UPS[k].cost){ short=true; continue; } const m0=S.money; if(buyStopUp(si,k,true)){ n++; spent+=m0-S.money; } }
  if(!n) return toast(short?'Không đủ tiền để nâng cấp':'Các trạm trên tuyến đã có đủ','info');
  sfx('buy'); toast(`Tuyến ${ref}: nâng cấp ${n} hạng mục ở trạm (${fmt(spent)})${short?' · hết tiền nên còn thiếu vài trạm':''}`,'up');
  news(`Công ty nâng cấp ${n} hạng mục tại các trạm tuyến ${ref}.`); checkAch(); checkMissionsLive(); save(); refreshSheet(); }
function bulkCost(r,k){ let c=0,n=0; for(const si of r.allStops) if(!hasSU(si,k)){ c+=STOP_UPS[k].cost; n++; } return {c,n}; }

/* ô nâng cấp của 1 trạm */
function stopUpGrid(si){
  return `<div class="ugrid">${SU_KEYS.map(k=>{ const U=STOP_UPS[k], has=hasSU(si,k), lock=S.level<U.lvl;
    return `<div class="utile ${has?'has':''} ${lock?'lock':''}">${ICON(U.ic,34)}<b>${U.n}</b><small>${U.d}</small><em>${U.fx.map(FX_NAME).join(' · ')}</em>
      ${has?`<span class="tag ok">${ICON('check',12)} Đã có</span>`:lock?`<span class="tag lock">${ICON('lock',12)} Cấp ${U.lvl}</span>`:`<button class="btn y mini" data-su="${si}:${k}" ${S.money<U.cost?'disabled':''}>${fmt(U.cost)}</button>`}</div>`; }).join('')}</div>`; }
/* ô nâng cấp trạm cho cả tuyến */
function routeStopUpBox(r){
  let tot=0; const cells=SU_KEYS.map(k=>{ const U=STOP_UPS[k], lock=S.level<U.lvl, {c,n}=bulkCost(r,k), N=r.allStops.length, done=N-n; if(!lock) tot+=c;
    return `<div class="utile ${n===0?'has':''} ${lock?'lock':''}">${ICON(U.ic,30)}<b>${U.n}</b><div class="ubar"><i style="width:${Math.round(done/N*100)}%"></i></div><small>${done}/${N} trạm</small>
      ${n===0?`<span class="tag ok">${ICON('check',12)} Đủ cả tuyến</span>`:lock?`<span class="tag lock">${ICON('lock',12)} Cấp ${U.lvl}</span>`:`<button class="btn y mini" data-bulk="${esc(r.ref)}:${k}" ${S.money<U.cost?'disabled':''}>${n} trạm · ${fmt(c)}</button>`}</div>`; }).join('');
  return `<div class="ubox"><div class="ubh">${ICON('up',22)}<b>Nâng cấp trạm trên tuyến</b></div><div class="ugrid">${cells}</div>
    ${tot>0?`<button class="btn full" data-bulk="${esc(r.ref)}:all" ${S.money<5e5?'disabled':''}>${ICON('up',18)} Nâng cấp tất cả trạm trên tuyến · ${fmt(tot)}</button><div class="sub" style="margin:6px 0 0">Ưu tiên trạm đông khách trước; thiếu tiền thì làm tới đâu hay tới đó.</div>`:`<div class="tip">${ICON('star',20)}<span>Mọi trạm trên tuyến đã được nâng cấp đầy đủ!</span></div>`}</div>`; }

/* ---------- Bãi xe ---------- */
const DEPOT_UPS={
  work:{n:'Xưởng sửa chữa hiện đại',ic:'wrench',cost:3000000,lvl:1,d:'Sửa & bảo dưỡng nhanh hơn 40%, rẻ hơn 25% cho tuyến gần bãi'},
  expand:{n:'Mở rộng bãi',ic:'expand',cost:2500000,lvl:1,d:'+5 chỗ đậu xe'},
  wash:{n:'Khu rửa xe',ic:'wash',cost:1500000,lvl:2,d:'Xe sạch bóng: +6 điểm tiện nghi cho tuyến gần bãi'},
  charge:{n:'Trạm sạc xe điện',ic:'charger',cost:4000000,lvl:4,d:'Xe điện chạy tuyến gần bãi tốn ít hơn 40% tiền điện'},
};
const hasDU=(id,k)=>!!(S.depotUp[id]&&S.depotUp[id][k]);
function routeDepot(r){ const key=S.depots.join(','); if(r._dpk!==key){ r._dp=nearDepot(r); r._dpk=key; } return r._dp; }
function buyDepotUp(id,k){ const U=DEPOT_UPS[k], dp=D.depotById[id]; if(!U||!dp||!S.depots.includes(id)||hasDU(id,k)) return;
  if(S.level<U.lvl) return toast('Cần cấp '+U.lvl,'lock'); if(S.money<U.cost) return toast('Không đủ tiền','coin');
  addMoney(-U.cost,'build'); (S.depotUp[id]||(S.depotUp[id]={}))[k]=1; S.stat.depotUps=(S.stat.depotUps||0)+1; sfx('buy'); toast(`${dp.n}: đã có ${U.n}`,U.ic); news(`${dp.n} vừa có thêm ${U.n.toLowerCase()}.`); checkAch(); save(); refreshSheet(); }
function depotUpRow(id){ return `<div class="ugrid dep">${Object.entries(DEPOT_UPS).map(([k,U])=>{ const has=hasDU(id,k), lock=S.level<U.lvl;
  return `<div class="utile ${has?'has':''} ${lock?'lock':''}">${ICON(U.ic,28)}<b>${U.n}</b><small>${U.d}</small>${has?`<span class="tag ok">${ICON('check',12)} Đã có</span>`:lock?`<span class="tag lock">${ICON('lock',12)} Cấp ${U.lvl}</span>`:`<button class="btn y mini" data-du="${id}:${k}" ${S.money<U.cost?'disabled':''}>${fmt(U.cost)}</button>`}</div>`; }).join('')}</div>`; }

/* ---------- Bản đồ: không tự thu nhỏ khi chọn tuyến ---------- */
function routeVisible(r){ if(!mapReady) return true; const b=map.getBounds(), sh=$('#sheet'), H=innerHeight, cut=sh.classList.contains('closed')?H:sh.getBoundingClientRect().top;
  for(const d of r.dirs) for(let i=0;i<d.g.length;i+=2){ const p=d.g[i]; if(!b.contains([p[1],p[0]])) continue; const q=map.project([p[1],p[0]]); if(q.y>70&&q.y<cut-10) return true; } return false; }
function focusRoute(r){ if(!mapReady||routeVisible(r)) return; const c=map.getCenter(); let best=null,bd=1e18;
  for(const d of r.dirs) for(const p of d.g){ const dd=dist(p,[c.lat,c.lng]); if(dd<bd){ bd=dd; best=p; } }
  if(best) map.easeTo({center:[best[1],best[0]],offset:[0,-innerHeight*.2],duration:650}); }
function fitWhole(ref){ const r=routeById[ref]; if(!r) return; const sh=$('#sheet'); toggleSheetSize(false); const h=sh.classList.contains('closed')?0:innerHeight*.4; fitRoutes([r],true,Math.max(40,h-30)); }
/* ---------- v6: Giờ chạy xe (mặc định 4:30 – 22:00) ---------- */
const SHIFT_SPLIT=13.5;
const svcS=()=>(S.opt.svcStart??270)/60, svcE=()=>(S.opt.svcEnd??1320)/60;
function inService(h=hour()){ const a=svcS(), e=svcE(); return e>a?(h>=a&&h<e):(h>=a||h<e); }
function shiftRange(k){ const a=svcS(), e=svcE(); return k==='sang'?[a,SHIFT_SPLIT]:k==='chieu'?[SHIFT_SPLIT,e]:[a,e]; }
const fmtH=h=>{ const m=Math.round(h*60)%1440; return Math.floor(m/60)+':'+String(m%60).padStart(2,'0'); };
const fmtHs=h=>{ const m=Math.round(h*60)%1440; return Math.floor(m/60)+'h'+(m%60?String(m%60).padStart(2,'0'):''); };
const shiftTxt=k=>{ const r=shiftRange(k); return fmtHs(r[0])+'–'+fmtHs(r[1]); };
function busDepot(b){ const r=b.r&&routeById[b.r]; const d=r&&routeDepot(r); if(d) return d;
  const p=b._ll||(r?(()=>{ const q=posAt(r.dirs[b.dir]||r.dirs[0],b.s); return [q.lat,q.lng]; })():CENTER); let best=null,bd=1e18;
  for(const id of S.depots){ const dp=D.depotById[id]; if(!dp) continue; const dd=dist(p,dp.p); if(dd<bd){ bd=dd; best=dp; } } return best; }
/* gọi mỗi bước mô phỏng cho xe đang 'ok' có tuyến; trả về true nếu xe không chạy tuyến bình thường */
function overnightBus(b,r,M,dt){
  if(inService()){
    if(b.park){ b.park=0; b.ret=0; b.endT=undefined; placeBus(b,b.r); b.dw=Math.random()*18; }
    return false; }
  if(b.park) return true;
  if(b.endT===undefined) b.endT=S.t;
  if(b.l>0&&S.t-b.endT<45&&busDrivers(b).length) return 'drive';   // trả nốt khách tại trạm của họ
  // còn khách sau 45 phút: cho xuống hết ở trạm kế tiếp, rồi về bãi
  const dr=r.dirs[b.dir]||r.dirs[0], q=posAt(dr,b.s);
  if(b.l>0){ const si=dr.si[Math.min(b.k,dr.si.length-1)]; const ss=S.ss[si]||(S.ss[si]=[0,0]); ss[1]+=b.l; b.l=0; b.dest={}; }
  const dp=busDepot(b); b.park=1; b.from=[q.lat,q.lng]; b.depot=dp?dp.id:null; b.retS=S.t;
  const d=dp?dist(b.from,dp.p):0; b.ret=S.t+Math.min(60,d/(M.speed*1.3)); return true; }
function skipNight(){ if(inService()) return; let n=0; while(!inService()&&n<1500){ step(2); n++; } toast('Đã tua tới giờ xe chạy lại '+fmtH(svcS()),'sunrise'); save(); }
function svcPill(){ const el=$('#nightpill'); if(!el) return; const on=!inService()&&S.buses.length>0;
  el.classList.toggle('hidden',!on||!!cab); if(!on) return;
  const back=S.buses.filter(b=>b.r&&b.st==='ok'&&!b.park).length, ret=S.buses.filter(b=>b.park&&S.t<b.ret).length;
  const ff=S.opt.nightFF&&!back&&!ret;
  setHtml('nighttxt',`<b>Nghỉ đêm</b> · chạy lại lúc ${fmtH(svcS())}${back?` · ${back} xe trả nốt khách`:ret?` · ${ret} xe đang về bãi`:''}${ff?' · <i>đang tua nhanh ×10</i>':''}`); }
/* vẽ xe đang về bãi và số xe nghỉ ở mỗi bãi */
function drawOvernight(g,W,H,z){
  const parked={}; const sc=clamp(1+(z-13)*.3,.7,1.9);
  for(const b of S.buses){ if(!b.park) continue;
    if(S.t<b.ret&&b.from&&b.depot&&D.depotById[b.depot]){ const dp=D.depotById[b.depot], f=clamp((S.t-b.retS)/((b.ret-b.retS)||1),0,1), la=b.from[0]+(dp.p[0]-b.from[0])*f, ln=b.from[1]+(dp.p[1]-b.from[1])*f;
      const pt=map.project([ln,la]); if(pt.x<-40||pt.y<-40||pt.x>W+40||pt.y>H+40) continue; const pd=map.project([dp.p[1],dp.p[0]]), ang=Math.atan2(pd.y-pt.y,pd.x-pt.x), sp=spriteFor(b);
      g.save(); g.translate(pt.x,pt.y); g.rotate(ang); g.scale(sc,sc); g.globalAlpha=.85; g.drawImage(sp.c,-sp.w/2,-sp.h/2,sp.w,sp.h); g.restore(); g.globalAlpha=1;
      g.font='800 10px system-ui,sans-serif'; g.textAlign='center'; g.textBaseline='middle'; const tw=g.measureText('về bãi').width+10; g.fillStyle='rgba(30,41,59,.85)'; g.beginPath(); g.roundRect(pt.x-tw/2,pt.y-12*sc-16,tw,15,7); g.fill(); g.fillStyle='#fde68a'; g.fillText('về bãi',pt.x,pt.y-12*sc-8.5); }
    else if(b.depot) parked[b.depot]=(parked[b.depot]||0)+1; }
  for(const id in parked){ const dp=D.depotById[id]; if(!dp) continue; const q=map.project([dp.p[1],dp.p[0]]); if(q.x<-40||q.y<-40||q.x>W+40||q.y>H+40) continue;
    const s=z>=13?34:24, x=q.x+s/2-2, y=q.y-s-2, t=`${parked[id]} xe`; g.font='900 11px system-ui,sans-serif'; g.textAlign='center'; g.textBaseline='middle'; const tw=g.measureText(t).width+26;
    g.fillStyle='#1e293b'; g.beginPath(); g.roundRect(x-4,y-9,tw,18,9); g.fill(); if(iconImg.sleep.ok) g.drawImage(iconImg.sleep,x-2,y-8,16,16); g.fillStyle='#fff'; g.fillText(t,x+12+tw/2-13,y+.5); }
  g.textBaseline='alphabetic'; }
/* ---------- Map (MapLibre, kiểu bản đồ tối giản tự làm) ---------- */
function lightStyle(){
  const roadW=(a,b)=>['interpolate',['exponential',1.5],['zoom'],10,a,16,b];
  return {version:8,glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources:{omt:{type:'vector',url:'https://tiles.openfreemap.org/planet',attribution:'<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank">OpenMapTiles</a> · Dữ liệu © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'}},
    layers:[
      {id:'bg',type:'background',paint:{'background-color':'#eef2ea'}},
      {id:'green',type:'fill',source:'omt','source-layer':'park',minzoom:10,paint:{'fill-color':'#d3ebcb','fill-opacity':.8}},
      {id:'wood',type:'fill',source:'omt','source-layer':'landcover',minzoom:9,filter:['in',['get','class'],['literal',['wood','grass','wetland']]],paint:{'fill-color':'#dcefd4','fill-opacity':.7}},
      {id:'water',type:'fill',source:'omt','source-layer':'water',paint:{'fill-color':'#a7d8f2'}},
      {id:'river',type:'line',source:'omt','source-layer':'waterway',minzoom:11,filter:['in',['get','class'],['literal',['river','canal']]],paint:{'line-color':'#a7d8f2','line-width':['interpolate',['linear'],['zoom'],11,1,16,4]}},
      {id:'minor',type:'line',source:'omt','source-layer':'transportation',minzoom:14.5,filter:['in',['get','class'],['literal',['minor','service']]],layout:{'line-cap':'round'},paint:{'line-color':'#ffffff','line-width':['interpolate',['linear'],['zoom'],14.5,1,18,6]}},
      {id:'sec-case',type:'line',source:'omt','source-layer':'transportation',minzoom:12,filter:['in',['get','class'],['literal',['secondary','tertiary']]],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#dfe3e8','line-width':roadW(1.4,8)}},
      {id:'sec',type:'line',source:'omt','source-layer':'transportation',minzoom:12,filter:['in',['get','class'],['literal',['secondary','tertiary']]],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ffffff','line-width':roadW(.8,6)}},
      {id:'maj-case',type:'line',source:'omt','source-layer':'transportation',minzoom:9,filter:['in',['get','class'],['literal',['motorway','trunk','primary']]],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#e8cf9a','line-width':roadW(1.6,11)}},
      {id:'maj',type:'line',source:'omt','source-layer':'transportation',minzoom:9,filter:['in',['get','class'],['literal',['motorway','trunk','primary']]],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':['match',['get','class'],'motorway','#ffd98a','#fff3cf'],'line-width':roadW(.9,8.5)}},
      {id:'roadname',type:'symbol',source:'omt','source-layer':'transportation_name',minzoom:15,filter:['in',['get','class'],['literal',['trunk','primary','secondary']]],layout:{'symbol-placement':'line','text-field':['coalesce',['get','name:vi'],['get','name']],'text-font':['Noto Sans Regular'],'text-size':11},paint:{'text-color':'#8a7f6a','text-halo-color':'#fff','text-halo-width':1.4}},
      {id:'place',type:'symbol',source:'omt','source-layer':'place',minzoom:9,filter:['in',['get','class'],['literal',['city','town','suburb']]],layout:{'text-field':['coalesce',['get','name:vi'],['get','name']],'text-font':['Noto Sans Bold'],'text-size':['interpolate',['linear'],['zoom'],9,10,14,13],'text-transform':'uppercase','text-letter-spacing':.06,'text-max-width':8},paint:{'text-color':'#5b6b7a','text-halo-color':'rgba(255,255,255,.9)','text-halo-width':1.6}},
    ]};
}
function worldMask(){ const g=boundary.geometry; const rings=g.type==='Polygon'?[g.coordinates[0]]:g.coordinates.map(p=>p[0]);
  return {type:'Feature',geometry:{type:'Polygon',coordinates:[[[-180,-85],[180,-85],[180,85],[-180,85],[-180,-85]],...rings.map(r=>[...r].reverse())]}}; }
function bbox(g){ let a=[999,999,-999,-999]; const walk=c=>{ if(typeof c[0]==='number'){ a[0]=Math.min(a[0],c[0]);a[1]=Math.min(a[1],c[1]);a[2]=Math.max(a[2],c[0]);a[3]=Math.max(a[3],c[1]); } else c.forEach(walk); }; walk(g.coordinates); return a; }
const fc=f=>({type:'FeatureCollection',features:f});
const lineF=(r,dir=0)=>({type:'Feature',properties:{ref:r.ref,color:r.color},geometry:{type:'LineString',coordinates:r.dirs[dir].ll}});
function initMap(){
  const b=bbox(boundary.geometry),pad=.06; dpr=Math.min(devicePixelRatio||1,2);
  map=new maplibregl.Map({container:'map',style:lightStyle(),center:[106.70,10.776],zoom:13.2,minZoom:9,maxZoom:18,
    maxBounds:[[b[0]-pad,b[1]-pad],[b[2]+pad,b[3]+pad]],dragRotate:false,pitchWithRotate:false,touchPitch:false,
    pixelRatio:Math.min(devicePixelRatio||1,1.5),fadeDuration:0,attributionControl:false,maxTileCacheSize:200});
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
    map.addLayer({id:'open',type:'line',source:'open',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':['get','color'],'line-width':['interpolate',['linear'],['zoom'],10,2.4,16,7],'line-offset':['interpolate',['linear'],['zoom'],12,0,16,['case',['==',['get','dir'],1],3,0]]}});
    themeLayers(); mapReady=true; applyTheme(true); drawNetwork(); fitOpen(false);
  });
  map.on('click',onMapClick);
}
function drawNetwork(){ servedCache=null; viewDirty=true; if(!mapReady) return;
  map.getSource('net').setData(fc(D.routes.filter(r=>!S.opened[r.ref]).map(r=>lineF(r))));
  const f=[]; for(const r of openRoutes()){ f.push(lineF(r,0)); if(r.two){ const x=lineF(r,1); x.properties.dir=1; f.push(x); } }
  map.getSource('open').setData(fc(f)); }
function setPreview(r,geo){ previewRef=r&&!S.opened[r.ref]?r.ref:null; viewDirty=true; if(!mapReady) return;
  map.getSource('preview').setData(geo?fc([geo]):fc(previewRef?[lineF(r)]:[])); }
function fitOpen(anim=true){ const o=openRoutes(); if(!o.length){ map.flyTo({center:[106.70,10.776],zoom:13.2}); return; } fitRoutes(o,anim); }
function fitLL(ll,anim=true,bottom=40){ let b=[999,999,-999,-999]; ll.forEach(p=>{b[0]=Math.min(b[0],p[0]);b[1]=Math.min(b[1],p[1]);b[2]=Math.max(b[2],p[0]);b[3]=Math.max(b[3],p[1]);});
  map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:{top:130,left:24,right:24,bottom:bottom+90},maxZoom:15,duration:anim?700:0}); }
function fitRoutes(rs,anim=true,bottom=40){ fitLL(rs.flatMap(r=>r.dirs[0].ll),anim,bottom); }
function onMapClick(e){
  const p=e.point,z=map.getZoom();
  if(createMode){ let bs=null,sd=20; for(const s of stopScreen){ const d=Math.hypot(s[1]-p.x,s[2]-p.y); if(d<sd){sd=d;bs=s[0];} } if(bs!==null) createToggle(bs); else if(z<14) toast('Phóng to để chọn trạm','plus'); return; }
  let best=null,bd=22; for(const b of S.buses){ if(!b._p) continue; const d=Math.hypot(b._p[0]-p.x,b._p[1]-p.y); if(d<bd){bd=d;best=b;} }
  if(best) return showBus(best.id);
  if(z>=12){ let bs=null,sd=16; for(const s of stopScreen){ const d=Math.hypot(s[1]-p.x,s[2]-p.y); if(d<sd){sd=d;bs=s[0];} } if(bs!==null) return showStop(bs); }
  for(const id of S.depots){ const dp=D.depotById[id]; if(!dp) continue; const q=map.project([dp.p[1],dp.p[0]]); if(Math.hypot(q.x-p.x,q.y-p.y+12)<22){ sub.fleet='depot'; setTab('fleet'); return; } }
  const f=map.queryRenderedFeatures([[p.x-10,p.y-10],[p.x+10,p.y+10]],{layers:['open','preview','net']});
  if(f.length) return showRoute(f[0].properties.ref);
  if(curTab==='map') closeSheet();
}

/* ---------- Tự tạo tuyến ---------- */
function startCreate(){ closeSheet(); createMode={stops:[],busy:false}; setTab('routes',true); viewDirty=true; if(map.getZoom()<14) map.easeTo({zoom:14.5}); renderCreate(); }
function cancelCreate(){ createMode=null; setPreview(null); viewDirty=true; closeSheet(); }
function createToggle(si){ const st=createMode.stops; const i=st.indexOf(si); if(i>=0&&i===st.length-1) st.pop(); else if(i<0){ if(st.length>=25) return toast('Tối đa 25 trạm','warn'); st.push(si); sfx('click'); } else return toast('Trạm này đã chọn','info'); createMode.geo=null; viewDirty=true; renderCreate(); }
function dpJS(pts,eps){ if(pts.length<3) return pts; const keep=new Uint8Array(pts.length); keep[0]=keep[pts.length-1]=1; const st=[[0,pts.length-1]];
  while(st.length){ const [i,j]=st.pop(); let mx=-1,mi=-1; const a=pts[i],b=pts[j]; for(let k=i+1;k<j;k++){ const d=segDist(pts[k],a,b).d; if(d>mx){mx=d;mi=k;} } if(mx>eps){ keep[mi]=1; st.push([i,mi],[mi,j]); } }
  return pts.filter((p,i)=>keep[i]); }
function segDist(p,a,b){ const bx=(b[1]-a[1])*109000,by=(b[0]-a[0])*111320,px=(p[1]-a[1])*109000,py=(p[0]-a[0])*111320,L=bx*bx+by*by,t=L?clamp((px*bx+py*by)/L,0,1):0; return {d:Math.hypot(px-t*bx,py-t*by),t,L:Math.sqrt(L)}; }
async function finishCreate(){
  const st=createMode.stops; if(st.length<4) return toast('Chọn ít nhất 4 trạm','warn');
  createMode.busy=true; renderCreate();
  let g=null, routed=false;
  try{ const coords=st.map(si=>D.stops[si][2]+','+D.stops[si][1]).join(';');
    const ctl=new AbortController(); setTimeout(()=>ctl.abort(),9000);
    const res=await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,{signal:ctl.signal}); const j=await res.json();
    if(j.code==='Ok'){ g=j.routes[0].geometry.coordinates.map(c=>[+c[1].toFixed(5),+c[0].toFixed(5)]); routed=true; } }catch(e){}
  if(!g) g=st.map(si=>[D.stops[si][1],D.stops[si][2]]);
  g=dpJS(g,6); const cum=[0]; for(let i=1;i<g.length;i++) cum.push(cum[i-1]+dist(g[i-1],g[i]));
  let last=0; const s=st.map(si=>{ const p=[D.stops[si][1],D.stops[si][2]]; let bd=1e18,bs=last; for(let i=0;i<g.length-1;i++){ const q=segDist(p,g[i],g[i+1]); const v=cum[i]+q.t*q.L; if(q.d<bd&&v>=last-5){bd=q.d;bs=v;} } last=bs; return [si,Math.round(bs)]; });
  for(let i=1;i<s.length;i++) if(s[i][1]<=s[i-1][1]) s[i][1]=s[i-1][1]+20;
  const ref='R'+((S.custom||[]).length+1), km=cum[cum.length-1]/1000;
  createMode.geo={g,s,ref,routed,km,cost:Math.round((5000000+km*250000+st.length*40000)/1e5)*1e5};
  setPreview(null,{type:'Feature',properties:{color:'#0f766e'},geometry:{type:'LineString',coordinates:g.map(p=>[p[1],p[0]])}});
  createMode.busy=false; renderCreate();
}
function confirmCreate(){ const c=createMode&&createMode.geo; if(!c) return; if(S.money<c.cost) return toast('Không đủ tiền','coin');
  const st=createMode.stops, rec={ref:c.ref,name:`${D.stops[st[0]][0]} – ${D.stops[st[st.length-1]][0]}`,stops:[...st],g:c.g,s:c.s,color:rnd(PALETTE),routed:c.routed};
  S.custom.push(rec); const r=addCustomRoute(rec); r.cost=c.cost; createMode=null; setPreview(null); openRoute(r.ref); showRoute(r.ref); }
/* ---------- v7: Phong cách riêng. Ngày = A "bản đồ giấy Sài Gòn xưa", Đêm = B "neon Sài Gòn" ---------- */
let TH=0, thLast=-1, thT=0;           // TH: 0 = kiểu A (ngày), 1 = kiểu B (đêm)
function themeTarget(){ const m=S.opt.theme||'auto'; if(m==='A') return 0; if(m==='B') return 1;
  const h=(S.t%1440)/60; if(h>=17.5&&h<18.5) return h-17.5; if(h>=18.5||h<5) return 1; if(h<6) return 1-(h-5); return 0; }
const hx=c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)];
function mixC(a,b,t){ const A=hx(a),B=hx(b); return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join(''); }
function neon(c){ return mixC(c,'#ffffff',.28); }
/* [layer, paint prop, ngày, đêm] */
const TH_PAINT=[
  ['bg','background-color','#f1e0bd','#060b22'],
  ['green','fill-color','#c9d49a','#0a1a30'],['wood','fill-color','#d6d6a4','#09162b'],
  ['water','fill-color','#5fb0ad','#0a2747'],['water-edge','line-color','#2f8486','#1d6fb0'],['river','line-color','#4fa3a2','#14508a'],
  ['minor','line-color','#fbf0d8','#141f45'],['sec-case','line-color','#cfa877','#0b1333'],['sec','line-color','#fdf5e2','#1f2a63'],
  ['maj-case','line-color','#a85a34','#2a1b5e'],['maj','line-color','#eba16b','#3b47a8'],
  ['roadname','text-color','#7a4a24','#a5b4fc'],['roadname','text-halo-color','#f6e8c8','#060b22'],
  ['place','text-color','#6b3a1a','#c4b5fd'],['place','text-halo-color','#f6e8c8','#060b22'],
  ['mask','fill-color','#6b4024','#00000c'],['hcm-line','line-color','#8b4a1f','#22d3ee'],['hcm-glow','line-color','#c08a4a','#22d3ee'],
  ['net','line-color','#8b6a45','#6366f1'],['open-case','line-color','#4a2c14','#4a2c14'],['open-dash','line-color','#fff6dc','#ffffff'],
];
const TH_NUM=[ ['open-case','line-opacity',1,0],['open-glow','line-opacity',0,.6],['open-dash','line-opacity',.95,.75],['mask','fill-opacity',.42,.7],
  ['hcm-glow','line-opacity',.25,.45],['net','line-opacity',.32,.4],['water-edge','line-opacity',.8,.9],['maj-case','line-opacity',1,.9] ];
let paperEl=null;
function makePaper(){ // giấy cũ: hạt, sợi giấy, ố vàng (tạo 1 lần)
  const c=document.createElement('canvas'); c.width=c.height=256; const g=c.getContext('2d');
  for(let i=0;i<2600;i++){ const a=Math.random()*.09; g.fillStyle=`rgba(${110+Math.random()*40|0},${70+Math.random()*30|0},30,${a})`; g.fillRect(Math.random()*256,Math.random()*256,1+Math.random()*1.5,1+Math.random()*1.5); }
  g.lineWidth=.6; for(let i=0;i<90;i++){ const x=Math.random()*256,y=Math.random()*256,a=Math.random()*6.28,l=4+Math.random()*14; g.strokeStyle=`rgba(120,80,40,${.04+Math.random()*.06})`; g.beginPath(); g.moveTo(x,y); g.quadraticCurveTo(x+Math.cos(a+.5)*l/2,y+Math.sin(a+.5)*l/2,x+Math.cos(a)*l,y+Math.sin(a)*l); g.stroke(); }
  for(let i=0;i<7;i++){ const x=Math.random()*256,y=Math.random()*256,r=14+Math.random()*30,gr=g.createRadialGradient(x,y,0,x,y,r); gr.addColorStop(0,'rgba(160,110,50,.07)'); gr.addColorStop(1,'rgba(160,110,50,0)'); g.fillStyle=gr; g.fillRect(x-r,y-r,r*2,r*2); }
  return c.toDataURL(); }
function initTheme(){ paperEl=document.createElement('div'); paperEl.id='paper'; paperEl.style.backgroundImage=`url(${makePaper()}),radial-gradient(ellipse at center,rgba(0,0,0,0) 55%,rgba(110,62,20,.28) 100%)`; $('#tint').after(paperEl);
  TH=themeTarget(); thLast=-1; applyTheme(true); }
function applyTheme(force){
  const tgt=themeTarget(); // chuyển mượt: tối đa ~ 1.5%/khung khi chọn tay, theo đồng hồ khi tự động
  TH+=clamp(tgt-TH,-.04,.04); if(Math.abs(tgt-TH)<.005) TH=tgt;
  if(!force&&Math.abs(TH-thLast)<.02&&!(TH===tgt&&thLast!==TH)) return; thLast=TH;
  const B=TH>.5; document.body.classList.toggle('thB',B); document.body.classList.toggle('thA',!B);
  if(paperEl) paperEl.style.opacity=(1-TH).toFixed(2);
  const mc=document.querySelector('meta[name=theme-color]'); if(mc) mc.content=B?'#060b22':'#8a5428';
  lastTint=''; if(!mapReady) return;
  for(const [l,p,a,b] of TH_PAINT) if(map.getLayer(l)) map.setPaintProperty(l,p,mixC(a,b,TH));
  for(const [l,p,a,b] of TH_NUM) if(map.getLayer(l)) map.setPaintProperty(l,p,+(a+(b-a)*TH).toFixed(3));
}
function themeLayers(){ // gọi khi map load: thêm viền nước nét cọ, gân phát sáng, vạch giữa tuyến
  map.addLayer({id:'water-edge',type:'line',source:'omt','source-layer':'water',paint:{'line-color':'#2f8486','line-width':['interpolate',['linear'],['zoom'],10,1,16,3.5],'line-blur':1.2,'line-opacity':.8}},'river');
  const off=map.getPaintProperty('open','line-offset');
  map.addLayer({id:'open-glow',type:'line',source:'open',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':['get','color'],'line-width':['interpolate',['linear'],['zoom'],10,9,16,26],'line-blur':['interpolate',['linear'],['zoom'],10,5,16,12],'line-opacity':0,...(off?{'line-offset':off}:{})}},'open-case');
  map.addLayer({id:'open-dash',type:'line',source:'open',minzoom:12.5,layout:{'line-join':'round'},paint:{'line-color':'#fff6dc','line-width':['interpolate',['linear'],['zoom'],12.5,.8,16,2.2],'line-dasharray':[2.2,2.2],'line-opacity':.95,...(off?{'line-offset':off}:{})}});
  map.setPaintProperty('open','line-width',['interpolate',['linear'],['zoom'],10,3,16,9]);
  map.setPaintProperty('open-case','line-width',['interpolate',['linear'],['zoom'],10,5.5,16,14]);
}
/* ---- Trạm: nón lá (ngày) / đèn lồng (đêm) ---- */
const stopSpr={};
function hatSprite(col,r){ const k='h'+col+r; if(stopSpr[k]) return stopSpr[k];
  const W=Math.ceil(r*4+8),H=Math.ceil(r*3.6+8),sc=3,c=document.createElement('canvas'); c.width=W*sc; c.height=H*sc; const g=c.getContext('2d'); g.scale(sc,sc);
  const ax=W/2,ay=H-2.5,ry=ay-r*1.05,rx=r*1.85,top=ry-r*2.05;
  g.fillStyle='rgba(70,35,10,.32)'; g.beginPath(); g.ellipse(ax,ay,r*1.1,r*.42,0,0,6.283); g.fill();
  g.strokeStyle='#5b3417'; g.lineWidth=1.4; g.beginPath(); g.moveTo(ax,ay); g.lineTo(ax,ry); g.stroke();
  g.fillStyle='#c48f3e'; g.beginPath(); g.ellipse(ax,ry,rx,r*.5,0,0,6.283); g.fill(); g.lineWidth=.8; g.strokeStyle='#6b3e17'; g.stroke();
  const gr=g.createLinearGradient(ax-rx,0,ax+rx,0); gr.addColorStop(0,'#f8e1a0'); gr.addColorStop(.45,'#ecc46f'); gr.addColorStop(1,'#b47c33');
  g.fillStyle=gr; g.beginPath(); g.moveTo(ax-rx*.97,ry); g.quadraticCurveTo(ax-rx*.3,ry-r*1.1,ax,top); g.quadraticCurveTo(ax+rx*.3,ry-r*1.1,ax+rx*.97,ry); g.closePath(); g.fill(); g.stroke();
  g.save(); g.clip(); g.strokeStyle='rgba(120,75,25,.35)'; g.lineWidth=.5; for(let i=-2;i<=2;i++){ g.beginPath(); g.moveTo(ax,top); g.lineTo(ax+i*rx*.42,ry+1); g.stroke(); }
  g.fillStyle=col; g.fillRect(ax-rx,ry-r*.62,rx*2,r*.42); g.restore();
  g.fillStyle='rgba(255,255,255,.55)'; g.beginPath(); g.arc(ax-r*.25,top+r*.55,r*.22,0,6.283); g.fill();
  return stopSpr[k]={c,w:W,h:H,ax,ay}; }
function lanternSprite(col,r,lit){ const k='l'+col+r+lit; if(stopSpr[k]) return stopSpr[k];
  const W=Math.ceil(r*5+10),H=Math.ceil(r*4.8+10),sc=3,c=document.createElement('canvas'); c.width=W*sc; c.height=H*sc; const g=c.getContext('2d'); g.scale(sc,sc);
  const ax=W/2,ay=H-2,cy=ay-r*2.35,bx=r*1.2,by=r*1.38;
  if(lit){ const gl=g.createRadialGradient(ax,cy,0,ax,cy,r*2.5); gl.addColorStop(0,col+'aa'); gl.addColorStop(.5,col+'44'); gl.addColorStop(1,col+'00'); g.fillStyle=gl; g.fillRect(0,0,W,H);
    const gp=g.createRadialGradient(ax,ay,0,ax,ay,r*1.4); gp.addColorStop(0,col+'88'); gp.addColorStop(1,col+'00'); g.fillStyle=gp; g.beginPath(); g.ellipse(ax,ay,r*1.6,r*.6,0,0,6.283); g.fill(); }
  g.strokeStyle=lit?'#fde68a':'#64748b'; g.lineWidth=.8; g.beginPath(); g.moveTo(ax,cy+by); g.lineTo(ax,ay-1); g.stroke();
  const bg=g.createRadialGradient(ax-bx*.3,cy-by*.3,0,ax,cy,bx*1.3); bg.addColorStop(0,lit?'#fffbe8':'#94a3b8'); bg.addColorStop(.35,col); bg.addColorStop(1,lit?mixC(col,'#000000',.45):'#1e293b');
  g.fillStyle=bg; g.beginPath(); g.ellipse(ax,cy,bx,by,0,0,6.283); g.fill();
  g.strokeStyle=lit?'rgba(120,40,0,.45)':'rgba(15,23,42,.6)'; g.lineWidth=.6; for(const f of [-.5,0,.5]){ g.beginPath(); g.ellipse(ax,cy,bx*Math.abs(f)||.01,by,0,0,6.283); g.stroke(); }
  g.fillStyle=lit?'#f59e0b':'#475569'; g.fillRect(ax-bx*.55,cy-by-1.6,bx*1.1,2); g.fillRect(ax-bx*.55,cy+by-.4,bx*1.1,2);
  return stopSpr[k]={c,w:W,h:H,ax,ay}; }
const moodCol=w=>w<15?'#22c55e':w<35?'#facc15':w<55?'#fb923c':'#ef4444';
const lanCol=w=>w<15?'#4ade80':w<35?'#fde047':w<55?'#fb923c':'#f43f5e';
function drawStopPin(g,x,y,r,w,closed){ // trả về chiều cao để đặt mặt cười
  let hgt=0; const draw=(s,a)=>{ if(a<=0) return; g.globalAlpha=a; g.drawImage(s.c,x-s.ax,y-s.ay,s.w,s.h); hgt=Math.max(hgt,s.ay); };
  const R=Math.round(r*2)/2;
  if(TH<.98) draw(hatSprite(closed?'#94a3b8':moodCol(w),R),TH>.02?1-TH:1);
  if(TH>.02) draw(lanternSprite(closed?'#475569':lanCol(w),R,!closed),TH<.98?TH:1);
  g.globalAlpha=1; return hgt; }
/* ---- Xe: tròn trịa kiểu Sài Gòn (ngày) / viên nang phát sáng (đêm) ---- */
function makeSpriteA(model,color){
  const M=MODELS[model],sc=3,L_=M.len+1,W=11,c=document.createElement('canvas'); c.width=(L_+6)*sc; c.height=(W+6)*sc;
  const g=c.getContext('2d'); g.scale(sc,sc); g.translate(3,3); const rr=(x,y,w,h,r)=>{g.beginPath();g.roundRect(x,y,w,h,r);};
  const col=color||M.color;
  g.shadowColor='rgba(60,30,10,.45)'; g.shadowBlur=2.5; g.shadowOffsetY=1.6; g.fillStyle='#3b2412'; rr(-1.1,-1.1,L_+2.2,W+2.2,5.2); g.fill(); g.shadowColor='transparent';
  g.fillStyle=col; rr(0,0,L_,W,4.4); g.fill();
  g.fillStyle=mixC(col.length===7?col:'#16a34a','#000000',.18); rr(0,W-2.6,L_,2.6,1.2); g.fill();
  g.fillStyle='#fff3d1'; rr(2.4,W/2-2.1,L_-8,4.2,2.1); g.fill(); g.fillStyle=model==='ev'?'#a3e635':model==='dd'?'#facc15':'#f59e0b'; rr(3.4,W/2-.6,L_-10,1.2,.6); g.fill();
  g.fillStyle='#1f4250'; for(let x=2.6;x<L_-6;x+=3.5){ rr(x,.7,2.5,1.5,.7); g.fill(); rr(x,W-2.2,2.5,1.5,.7); g.fill(); }
  g.fillStyle='#bfeaf2'; rr(L_-4.4,1.3,3.4,W-2.6,1.6); g.fill(); g.fillStyle='rgba(255,255,255,.7)'; rr(L_-3.9,2,1,W-4,.5); g.fill();
  g.fillStyle='rgba(255,255,255,.3)'; rr(1.2,.9,L_-6,1.4,.7); g.fill();
  g.fillStyle='#fef08a'; g.beginPath(); g.arc(L_-.6,1.9,.9,0,6.283); g.arc(L_-.6,W-1.9,.9,0,6.283); g.fill(); g.fillStyle='#f87171'; g.fillRect(0,1.2,.8,1.6); g.fillRect(0,W-2.8,.8,1.6);
  return {c,w:L_+6,h:W+6};
}
function makeSpriteB(model,color){
  const M=MODELS[model],sc=3,L_=M.len,W=10,P=5,c=document.createElement('canvas'); c.width=(L_+P*2)*sc; c.height=(W+P*2)*sc;
  const g=c.getContext('2d'); g.scale(sc,sc); g.translate(P,P); const rr=(x,y,w,h,r)=>{g.beginPath();g.roundRect(x,y,w,h,r);};
  const col=neon((color||M.color).length===7?(color||M.color):'#22d3ee');
  g.shadowColor=col; g.shadowBlur=5; g.fillStyle='#0a1030'; rr(0,0,L_,W,W/2); g.fill(); g.lineWidth=1.2; g.strokeStyle=col; g.stroke();
  g.shadowBlur=3; g.fillStyle=col; rr(3,W/2-.9,L_-8,1.8,.9); g.fill(); g.shadowBlur=0;
  g.fillStyle='#fef9c3'; for(let x=3;x<L_-6;x+=3.2){ rr(x,1.4,2.2,1.2,.6); g.fill(); rr(x,W-2.6,2.2,1.2,.6); g.fill(); }
  g.fillStyle='#a5f3fc'; rr(L_-3.6,1.8,2.2,W-3.6,1.1); g.fill();
  g.shadowColor='#fff'; g.shadowBlur=4; g.fillStyle='#fff'; g.beginPath(); g.arc(L_-.8,2.4,.8,0,6.283); g.arc(L_-.8,W-2.4,.8,0,6.283); g.fill();
  g.shadowColor='#f43f5e'; g.fillStyle='#fb7185'; g.fillRect(.2,2,.8,1.4); g.fillRect(.2,W-3.4,.8,1.4);
  return {c,w:L_+P*2,h:W+P*2};
}
function plateStyle(rc){ return TH>.5?{bg:'#0a0f2a',bd:neon(rc),tx:neon(rc)}:{bg:'#fff6e0',bd:rc,tx:'#3b2412'}; }
/* ---- Công trình nổi tiếng vẽ tay kiểu isometric ---- */
const LANDMARKS=[
  {k:'benthanh',n:'Chợ Bến Thành',p:[10.77253,106.69802],c:'#fbbf24',h:62},
  {k:'ducba',n:'Nhà thờ Đức Bà',p:[10.77978,106.69905],c:'#f472b6',h:80},
  {k:'bitexco',n:'Bitexco',p:[10.77166,106.70436],c:'#22d3ee',h:110},
  {k:'lm81',n:'Landmark 81',p:[10.79484,106.72183],c:'#a78bfa',h:140},
  {k:'dinh',n:'Dinh Độc Lập',p:[10.77697,106.69531],c:'#e2e8f0',h:56},
  {k:'nhahat',n:'Nhà hát Thành phố',p:[10.77661,106.70313],c:'#fb7185',h:56},
  {k:'cholon',n:'Chợ Bình Tây',p:[10.74967,106.65097],c:'#fde047',h:66},
];
const LM_DAY={wall:['#fdeac0','#f2cf8a','#d6a961'],roof:['#d9663f','#c4552d','#953c1d'],brick:['#cf7148','#b4532a','#8a3a1a'],glass:['#a9dcef','#5fa9d0','#3b78a6'],
  white:['#fffaf0','#efe5d0','#d2c6ac'],spire:['#9dbbab','#7f9c8f','#5b7769'],yel:['#fde68a','#f3c64b','#d39e2c'],line:'#4a2c14',win:'#6b4220',lw:.9};
function lmPal(night,neonC){ if(!night) return LM_DAY; const d=['#1d2758','#141c45','#0d1433'];
  return {wall:d,roof:d,brick:d,glass:['#1d2f78','#172566','#101a4a'],white:d,spire:d,yel:d,line:neonC,win:'#fde68a',lw:1.1,glow:neonC}; }
const isoP=(X,Y,Z)=>[(X-Y)*.866,(X+Y)*.5-Z];
function lmFace(g,pts,fill,P){ g.beginPath(); pts.forEach((p,i)=>{ const q=isoP(p[0],p[1],p[2]); i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]); }); g.closePath(); g.fillStyle=fill; g.fill(); g.stroke(); }
function lmBox(g,X,Y,Z,w,d,h,c,P){ lmFace(g,[[X,Y+d,Z],[X+w,Y+d,Z],[X+w,Y+d,Z+h],[X,Y+d,Z+h]],c[1],P); lmFace(g,[[X+w,Y,Z],[X+w,Y+d,Z],[X+w,Y+d,Z+h],[X+w,Y,Z+h]],c[2],P); lmFace(g,[[X,Y,Z+h],[X+w,Y,Z+h],[X+w,Y+d,Z+h],[X,Y+d,Z+h]],c[0],P); }
function lmRoof(g,X,Y,Z,w,d,rh,c,P,e){ e=e??w/2; const ay=Y+d/2,t=Z+rh; lmFace(g,[[X,Y+d,Z],[X+w,Y+d,Z],[X+w-e,ay,t],[X+e,ay,t]],c[1],P); lmFace(g,[[X+w,Y,Z],[X+w,Y+d,Z],[X+w-e,ay,t]],c[2],P); }
function lmWins(g,face,X,Y,Z,w,d,h,rows,cols,P,sz=1.6){ g.save(); g.shadowBlur=P.glow?3:0; g.fillStyle=P.win; for(let j=0;j<rows;j++) for(let i=0;i<cols;i++){ const fx=(i+.5)/cols,fz=Z+(j+.5)/rows*h;
  const q=face==='L'?isoP(X+fx*w,Y+d,fz):isoP(X+w,Y+fx*d,fz); g.fillRect(q[0]-sz/2,q[1]-sz/2,sz,sz*1.3); } g.restore(); }
function lmTree(g,X,Y,P,s=1){ if(P.glow) return; const q=isoP(X,Y,0); g.fillStyle='#6b4220'; g.fillRect(q[0]-.6,q[1]-4*s,1.2,4*s); g.fillStyle='#4f8f35'; g.beginPath(); g.arc(q[0],q[1]-5.5*s,3.4*s,0,6.283); g.fill(); g.fillStyle='#78b04f'; g.beginPath(); g.arc(q[0]-1*s,q[1]-6.6*s,1.8*s,0,6.283); g.fill(); }
function lmPlate(g,s,P){ const pts=[[-s,-s,0],[s,-s,0],[s,s,0],[-s,s,0]]; g.save(); if(P.glow){ g.globalAlpha=.55; lmFace(g,pts,'rgba(20,30,80,.5)',P); } else { g.strokeStyle='#7a5a2a'; lmFace(g,pts,'#b7cf86',P); g.fillStyle='#9fbb6c'; } g.restore(); }
const LM_DRAW={
  benthanh(g,P){ lmPlate(g,22,P); lmBox(g,-17,-11,0,34,22,10,P.yel,P); lmWins(g,'L',-17,-11,0,34,22,10,1,6,P); lmRoof(g,-17,-11,10,34,22,7,P.roof,P,0); lmBox(g,-4.5,7,0,9,6,24,P.yel,P); lmRoof(g,-4.5,7,24,9,6,7,P.roof,P);
    const q=isoP(0,13,18); g.fillStyle=P.glow?P.win:'#fffaf0'; g.beginPath(); g.arc(q[0],q[1],2.3,0,6.283); g.fill(); g.stroke(); lmTree(g,-19,16,P); lmTree(g,18,-14,P); lmTree(g,16,18,P,.8); },
  ducba(g,P){ lmPlate(g,20,P); lmBox(g,-9,-15,0,18,24,14,P.brick,P); lmRoof(g,-9,-15,14,18,24,8,P.roof,P,9); lmWins(g,'R',-9,-15,0,18,24,14,2,4,P);
    for(const x of [-9,3]){ lmBox(g,x,9,0,6.5,6.5,32,P.brick,P); lmWins(g,'L',x,9,0,6.5,6.5,32,4,1,P); lmRoof(g,x,9,32,6.5,6.5,16,P.spire,P); } lmTree(g,15,15,P); lmTree(g,-17,-12,P); },
  bitexco(g,P){ lmPlate(g,16,P); lmBox(g,-6,-6,0,12,12,62,P.glass,P); lmWins(g,'L',-6,-6,0,12,12,62,12,2,P,1.3); lmWins(g,'R',-6,-6,0,12,12,62,12,2,P,1.3); lmBox(g,-4,-4,62,8,8,10,P.glass,P);
    const q=isoP(4,4,54); g.fillStyle=P.glow?'#0d1433':'#7f9c8f'; g.beginPath(); g.ellipse(q[0]+7,q[1],9,4.2,0,0,6.283); g.fill(); g.stroke(); g.strokeStyle=P.glow?P.win:'#fffaf0'; g.beginPath(); g.ellipse(q[0]+7,q[1],5,2.2,0,0,6.283); g.stroke(); g.strokeStyle=P.line;
    const t=isoP(0,0,72); g.beginPath(); g.moveTo(t[0],t[1]); g.lineTo(t[0],t[1]-12); g.stroke(); lmTree(g,12,12,P); },
  lm81(g,P){ lmPlate(g,16,P); lmBox(g,-8,-8,0,16,16,58,P.glass,P); lmWins(g,'L',-8,-8,0,16,16,58,12,3,P,1.3); lmWins(g,'R',-8,-8,0,16,16,58,12,3,P,1.3); lmBox(g,-6,-6,58,12,12,22,P.glass,P); lmWins(g,'L',-6,-6,58,12,12,22,4,2,P,1.3); lmBox(g,-3.5,-3.5,80,7,7,14,P.glass,P);
    const t=isoP(0,0,94); g.beginPath(); g.moveTo(t[0],t[1]); g.lineTo(t[0],t[1]-16); g.stroke(); lmTree(g,13,12,P); lmTree(g,-12,13,P,.8); },
  dinh(g,P){ lmPlate(g,22,P); lmBox(g,-18,-9,0,36,18,8,P.white,P); lmWins(g,'L',-18,-9,0,36,18,8,2,9,P); lmBox(g,-18,-9,8,36,18,4,P.white,P); lmWins(g,'L',-18,-9,8,36,18,4,1,9,P,1.2); lmBox(g,-6,-4,12,12,8,4,P.white,P);
    const t=isoP(0,0,16); g.beginPath(); g.moveTo(t[0],t[1]); g.lineTo(t[0],t[1]-12); g.stroke(); g.fillStyle=P.glow?'#f43f5e':'#da251d'; g.fillRect(t[0],t[1]-12,6,4); g.fillStyle='#ffde00'; g.fillRect(t[0]+2.4,t[1]-10.6,1.2,1.2);
    lmTree(g,-19,15,P); lmTree(g,-10,17,P); lmTree(g,17,15,P); lmTree(g,19,-12,P); },
  nhahat(g,P){ lmPlate(g,18,P); lmBox(g,-12,-10,0,24,20,14,P.white,P); lmRoof(g,-12,-10,14,24,20,4,P.roof,P,4); lmWins(g,'R',-12,-10,0,24,20,14,2,4,P);
    const a=isoP(0,10,7); g.fillStyle=P.glow?P.win:'#7a4a24'; g.beginPath(); g.ellipse(a[0],a[1],5,6,0,Math.PI,0); g.lineTo(a[0]+5,a[1]+5); g.lineTo(a[0]-5,a[1]+5); g.closePath(); g.fill(); g.stroke(); lmTree(g,15,14,P); lmTree(g,-15,13,P); },
  cholon(g,P){ lmPlate(g,22,P); lmBox(g,-16,-16,0,32,32,8,P.yel,P); lmWins(g,'L',-16,-16,0,32,32,8,1,7,P); lmWins(g,'R',-16,-16,0,32,32,8,1,7,P); lmRoof(g,-16,-16,8,32,32,7,P.roof,P);
    lmBox(g,-4,-4,10,8,8,14,P.yel,P); lmRoof(g,-4.5,-4.5,24,9,9,7,P.roof,P); const q=isoP(0,4,18); g.fillStyle=P.glow?P.win:'#fffaf0'; g.beginPath(); g.arc(q[0],q[1],1.9,0,6.283); g.fill(); lmTree(g,19,18,P); lmTree(g,-19,18,P,.8); },
};
const lmCache={};
function lmSprite(L,night){ const k=L.k+night; if(lmCache[k]) return lmCache[k];
  const sc=2.5,W=64,H=L.h+14,c=document.createElement('canvas'); c.width=W*sc; c.height=H*sc; const g=c.getContext('2d'); g.scale(sc,sc); g.translate(W/2,H-24);
  const P=lmPal(night,L.c); g.lineJoin='round'; g.strokeStyle=P.line; g.lineWidth=P.lw; if(P.glow){ g.shadowColor=P.glow; g.shadowBlur=4; }
  LM_DRAW[L.k](g,P); return lmCache[k]={c,w:W,h:H,ay:H-24}; }
function drawLandmarks(g,W,H,z){ if(z<12.3) return; const s=clamp(.5+(z-13)*.3,.42,1.35);
  for(const L of LANDMARKS){ const q=map.project([L.p[1],L.p[0]]); if(q.x<-80||q.y<-40||q.x>W+80||q.y>H+L.h*s+40) continue;
    const draw=(n,a)=>{ const sp=lmSprite(L,n); g.globalAlpha=a; g.drawImage(sp.c,q.x-sp.w*s/2,q.y-sp.ay*s,sp.w*s,sp.h*s); };
    if(TH<.98) draw(0,TH>.02?1-TH:1); if(TH>.02) draw(1,TH<.98?TH:1); g.globalAlpha=1;
    if(z>=13.8){ const B=TH>.5; g.font='800 10.5px system-ui,sans-serif'; g.textAlign='center'; g.textBaseline='middle'; const tw=g.measureText(L.n).width+12, y=q.y+12*s+6;
      g.fillStyle=B?'rgba(6,11,34,.85)':'#fbefd2'; g.beginPath(); g.roundRect(q.x-tw/2,y-8,tw,16,4); g.fill(); g.lineWidth=1.2; g.strokeStyle=B?L.c:'#7a4a24'; g.stroke(); g.fillStyle=B?L.c:'#5b3417'; g.fillText(L.n,q.x,y+.5); g.textBaseline='alphabetic'; } } }
/* ---------- Sprites ---------- */
function makeSprite(model,color){
  const M=MODELS[model],sc=3,L_=M.len,W=10,c=document.createElement('canvas'); c.width=(L_+6)*sc; c.height=(W+6)*sc;
  const g=c.getContext('2d'); g.scale(sc,sc); g.translate(3,3); const rr=(x,y,w,h,r)=>{g.beginPath();g.roundRect(x,y,w,h,r);};
  g.shadowColor='rgba(0,0,0,.35)'; g.shadowBlur=3; g.shadowOffsetY=1.5; g.fillStyle='#fff'; rr(-1.2,-1.2,L_+2.4,W+2.4,4); g.fill(); g.shadowColor='transparent';
  g.fillStyle=color||M.color; rr(0,0,L_,W,3); g.fill(); g.fillStyle='rgba(255,255,255,.25)'; rr(1,1,L_-2,3,1.5); g.fill();
  g.fillStyle='#bae6fd'; rr(L_-4.2,1.2,3.2,W-2.4,1.2); g.fill();
  g.fillStyle='rgba(15,23,42,.55)'; for(let x=2.5;x<L_-6;x+=3.4){ rr(x,.6,2.4,1.4,.5); g.fill(); rr(x,W-2,2.4,1.4,.5); g.fill(); }
  g.fillStyle=model==='ev'?'#d9f99d':model==='dd'?'#fde047':'#fff'; rr(3,W/2-1.2,L_-9,2.4,1.2); g.fill();
  if(model==='dd'){ g.fillStyle='rgba(255,255,255,.35)'; rr(2,2.5,L_-7,W-5,1.5); g.fill(); }
  g.fillStyle='#fef08a'; g.fillRect(L_-.8,1,.8,1.6); g.fillRect(L_-.8,W-2.6,.8,1.6); g.fillStyle='#f87171'; g.fillRect(0,1,.7,1.6); g.fillRect(0,W-2.6,.7,1.6);
  return {c,w:L_+6,h:W+6};
}
const spriteFor=b=>{ const n=TH>.5?1:0, k=b.m+'|'+(b.color||'')+'|'+n; return sprites[k]||(sprites[k]=n?makeSpriteB(b.m,b.color):makeSpriteA(b.m,b.color)); };
function loadIcons(){ return Promise.all(['face1','face2','face3','face4','office','fest','shelter','depot','broken','sleep','pin','bench','board','lamp','tree','bay'].map(n=>new Promise(res=>{ const im=new Image(); im.onload=()=>{im.ok=1;res();}; im.onerror=()=>res(); im.src=ICON_SRC(n); iconImg[n]=im; }))); }

/* ---------- Render ---------- */
function resize(){ for(const c of [$('#fx'),$('#rain')]){ c.width=innerWidth*dpr; c.height=innerHeight*dpr; c.style.width=innerWidth+'px'; c.style.height=innerHeight+'px'; c.getContext('2d').setTransform(dpr,0,0,dpr,0,0); } viewDirty=true; }
const drops=[]; for(let i=0;i<110;i++) drops.push({x:Math.random(),y:Math.random(),v:.6+Math.random()*.6});
function tintFor(h){ const K=[[0,.42],[4.5,.38],[6,.12],[7.5,0],[16.5,0],[18,.1],[19.3,.36],[24,.42]]; for(let i=0;i<K.length-1;i++){ const [a,va]=K[i],[b,vb]=K[i+1]; if(h>=a&&h<=b) return va+(vb-va)*(h-a)/(b-a); } return 0; }
let uiT=0,slowT=0,lastTint='';
function frame(ts){
  requestAnimationFrame(frame);
  if(S.opt.fps===30&&(frameSkip^=1)) return;
  const dtR=Math.min(.1,(ts-(lastTs||ts))/1000); lastTs=ts;
  if(speedMul>0&&!createMode){ const nff=S.opt.nightFF&&!cab&&!inService()&&!S.buses.some(b=>b.r&&b.st==='ok'&&(!b.park||S.t<b.ret)); let dt=dtR*MIN_PER_SEC*speedMul*(cab&&cab.slow?CAB_RATE:1)*(nff?10:1); while(dt>0){ const d=Math.min(dt,1); step(d); dt-=d; } }
  if(mapReady) render(dtR);
  uiT+=dtR; slowT+=dtR;
  if(uiT>.3){ uiT=0; updateHud(); }
  if(slowT>1.2){ slowT=0; if(sheetCtx&&['finance','stop','sat','route','bus','missions'].includes(sheetCtx.t)&&!document.activeElement.matches('input,select')) refreshSheet(); }
}
function projectStops(){
  stopScreen=[]; const z=map.getZoom(),W=innerWidth,H=innerHeight;
  let ids;
  if(createMode){ if(z<13.5) return; const bb=map.getBounds(); ids=new Set(createMode.stops);
    for(let a=Math.floor(bb.getSouth()*50);a<=Math.floor(bb.getNorth()*50);a++) for(let b=Math.floor(bb.getWest()*50);b<=Math.floor(bb.getEast()*50);b++) for(const si of (stopGrid[a+':'+b]||[])) ids.add(si); }
  else { if(z<12) return; ids=new Set(servedStops()); if(previewRef) routeById[previewRef].allStops.forEach(s=>ids.add(s)); }
  for(const si of ids){ const s=D.stops[si],p=map.project([s[2],s[1]]); if(p.x<-20||p.y<-20||p.x>W+20||p.y>H+20) continue; stopScreen.push([si,p.x,p.y]); }
}
function render(dt){
  const g=fxCtx,W=innerWidth,H=innerHeight; g.clearRect(0,0,W,H);
  if(cab){ cabFrame(dt); if(cab){ cabRender(g,dt); if(rainCtx._on){ rainCtx.clearRect(0,0,W,H); rainCtx._on=0; } return; } }
  const h=hour(),night=h<5.5||h>19,z=map.getZoom();
  applyTheme(); const a=(tintFor(h)*(1-TH)).toFixed(2); if(a!==lastTint){ lastTint=a; $('#tint').style.background=`rgba(18,28,78,${a})`; }
  if(viewDirty){ projectStops(); viewDirty=false; }
  // bãi xe
  for(const id of S.depots){ const dp=D.depotById[id]; if(!dp) continue; const q=map.project([dp.p[1],dp.p[0]]); if(q.x<-40||q.y<-40||q.x>W+40||q.y>H+40) continue; const s=z>=13?34:24; if(iconImg.depot.ok) g.drawImage(id==='bt'?iconImg.office:iconImg.depot,q.x-s/2,q.y-s,s,s); }
  drawLandmarks(g,W,H,z);
  // trạm
  if(stopScreen.length){
    const closed=!inService(), rad=z>=16?7:z>=14?5.5:z>=13?4:3, showFace=z>=14.5&&!createMode&&!closed;
    for(const [si,x,y] of stopScreen){
      const w=S.waiting[si]||0;
      if(createMode){ const i=createMode.stops.indexOf(si);
        g.beginPath(); g.arc(x,y,i>=0?10:rad+1,0,6.283); g.fillStyle=i>=0?'#0f766e':'#fff'; g.fill(); g.lineWidth=2; g.strokeStyle='#0f766e'; g.stroke();
        if(i>=0){ g.fillStyle='#fff'; g.font='800 11px system-ui,sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(i+1,x,y+.5); g.textBaseline='alphabetic'; }
        continue; }
      const isPrev=previewRef&&!stopRoutes[si].some(r=>S.opened[r]);
      const nu=suCount(si); if(nu||S.shelters[si]){ g.beginPath(); g.ellipse(x,y,rad+3,(rad+3)*.5,0,0,6.283); g.lineWidth=2.2; g.strokeStyle=nu>=SU_KEYS.length?'#f59e0b':nu>=3?'#a855f7':'#3b82f6'; g.stroke(); }
      if(nu&&z>=15.5&&!isPrev){ let ix=x-(nu*16)/2; const iy=y+rad+4; g.fillStyle='rgba(255,255,255,.94)'; g.beginPath(); g.roundRect(ix-3,iy-2,nu*16+5,19,9); g.fill(); for(const k of SU_KEYS) if(hasSU(si,k)){ const im=iconImg[STOP_UPS[k].ic]; if(im&&im.ok) g.drawImage(im,ix,iy,16,16); ix+=16; } }
      if(isPrev){ g.beginPath(); g.arc(x,y,rad,0,6.283); g.fillStyle='#fff'; g.fill(); g.lineWidth=2; g.strokeStyle=routeById[previewRef].color; g.stroke(); continue; }
      const ph=z>=13?drawStopPin(g,x,y,rad*1.35,w,closed):(g.beginPath(),g.arc(x,y,rad,0,6.283),g.fillStyle=closed?'#64748b':(TH>.5?lanCol(w):moodCol(w)),g.fill(),rad), fy=y-ph;
      if(closed&&z>=15&&iconImg.sleep.ok) g.drawImage(iconImg.sleep,x+rad+2,fy-6,13,13);
      if(showFace){ const im=iconImg[faceOf(stopMood(si))]; if(im&&im.ok) g.drawImage(im,x+rad+2,fy-6,16,16);
        if(w>=1){ const B=TH>.5; g.font='800 10px system-ui,sans-serif'; g.textAlign='left'; g.lineWidth=3; g.strokeStyle=B?'#060b22':'#fbefd2'; g.strokeText(Math.floor(w),x+rad+19,fy+3); g.fillStyle=B?'#fde68a':'#3b2412'; g.fillText(Math.floor(w),x+rad+19,fy+3); } }
    }
    if(createMode&&createMode.stops.length>1&&!createMode.geo){ g.strokeStyle='rgba(15,118,110,.7)'; g.lineWidth=3; g.setLineDash([6,5]); g.beginPath(); createMode.stops.forEach((si,i)=>{ const p=map.project([D.stops[si][2],D.stops[si][1]]); i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y); }); g.stroke(); g.setLineDash([]); }
  }
  // xe buýt
  const sc=clamp(1+(z-13)*.3,.7,1.9); g.textAlign='center'; g.textBaseline='middle';
  drawOvernight(g,W,H,z);
  for(const b of S.buses){ b._p=null; if(!b.r||b.st==='maint'||b.st==='repair'||b.park) continue; const r=routeById[b.r]; if(!r) continue; const dr=r.dirs[b.dir]||r.dirs[0];
    const p=posAt(dr,b.s),pt=map.project([p.lng,p.lat]); if(pt.x<-40||pt.y<-40||pt.x>W+40||pt.y>H+40) continue; b._p=[pt.x,pt.y];
    const A=dr.g[p.i],B=dr.g[Math.min(p.i+1,dr.g.length-1)],pa=map.project([A[1],A[0]]),pb=map.project([B[1],B[0]]);
    const ang=Math.atan2(pb.y-pa.y,pb.x-pa.x), sp=spriteFor(b), act=b.st==='ok'&&(activeDriver(b,h)||(!inService()&&b.l>0&&busDrivers(b).length>0));
    g.save(); g.translate(pt.x,pt.y); g.rotate(ang); g.scale(sc,sc); if(!act) g.globalAlpha=.55;
    if(night&&act&&TH<.5){ g.fillStyle='rgba(255,240,170,.35)'; g.beginPath(); g.moveTo(sp.w/2-2,0); g.arc(sp.w/2-2,0,30,-.42,.42); g.fill(); }
    g.drawImage(sp.c,-sp.w/2,-sp.h/2,sp.w,sp.h); g.restore(); g.globalAlpha=1;
    const fs=z>=15?12:z>=13?11:10,label=r.ref; g.font=`900 ${fs}px system-ui,sans-serif`;
    const tw=Math.max(g.measureText(label).width+10,20),bx=pt.x,by=pt.y-10*sc-fs;
    const ps=plateStyle(r.color); g.fillStyle=ps.bg; g.strokeStyle=ps.bd; g.lineWidth=2; g.beginPath(); g.roundRect(bx-tw/2-1,by-fs/2-3,tw+2,fs+6,(fs+6)/2); g.fill(); g.stroke();
    g.fillStyle=ps.bd; g.beginPath(); g.moveTo(bx-4,by+fs/2+3); g.lineTo(bx+4,by+fs/2+3); g.lineTo(bx,by+fs/2+7); g.fill();
    g.fillStyle=ps.tx; g.fillText(label,bx,by+.5);
    if(b.st==='broken'&&iconImg.broken.ok){ const t=performance.now()/300; g.drawImage(iconImg.broken,bx+tw/2,by-14+Math.sin(t)*2,22,22); }
    else if(!act&&iconImg.sleep.ok) g.drawImage(iconImg.sleep,bx+tw/2,by-12,18,18);
    if(z>=15&&act){ const M=MODELS[b.m],f=b.l/M.cap,ly=pt.y+10*sc+8; g.font='700 10px system-ui,sans-serif';
      g.fillStyle='rgba(15,23,42,.8)'; g.beginPath(); g.roundRect(bx-17,ly-7,34,14,7); g.fill(); g.fillStyle=f>.9?'#fca5a5':f>.6?'#fde047':'#86efac'; g.fillText(`${b.l}/${M.cap}`,bx,ly+.5); }
  }
  g.textBaseline='alphabetic';
  for(const f of floaters){ f.life-=dt*.7; if(z<12) continue; const pt=map.project([f.lng,f.lat]),y=pt.y-24-(1-f.life)*34; g.globalAlpha=clamp(f.life*1.5,0,1);
    g.font='900 14px system-ui,sans-serif'; g.lineWidth=4; g.strokeStyle='#fff'; g.strokeText(f.txt,pt.x,y); g.fillStyle='#15803d'; g.fillText(f.txt,pt.x,y); g.globalAlpha=1; }
  floaters=floaters.filter(f=>f.life>0);
  if(S.event&&S.event.type==='fest'){ const pt=map.project([S.event.p[1],S.event.p[0]]),t=performance.now()/600;
    g.strokeStyle='rgba(244,63,94,.55)'; g.lineWidth=3; g.beginPath(); g.arc(pt.x,pt.y,26+((t*20)%30),0,6.283); g.stroke(); if(iconImg.fest.ok) g.drawImage(iconImg.fest,pt.x-16,pt.y-38+Math.sin(t)*4,32,32); }
  for(const c of S.contracts.active){ const pt=map.project([D.stops[c.si][2],D.stops[c.si][1]]); if(pt.x<-30||pt.y<-30||pt.x>W+30||pt.y>H+30) continue;
    g.strokeStyle='rgba(14,165,233,.6)'; g.setLineDash([5,4]); g.lineWidth=2; const mpp=40075016*Math.cos(D.stops[c.si][1]*Math.PI/180)/(512*Math.pow(2,z)); g.beginPath(); g.arc(pt.x,pt.y,800/mpp,0,6.283); g.stroke(); g.setLineDash([]);
    if(iconImg.pin.ok) g.drawImage(iconImg.pin,pt.x-12,pt.y-26,24,24); }
  const rg=rainCtx;
  if(raining()){ rg.clearRect(0,0,W,H); rg.strokeStyle='rgba(190,210,255,.6)'; rg.lineWidth=1.2; rg.beginPath(); const n=wxNow()==='storm'?110:70;
    for(let i=0;i<n;i++){ const d=drops[i]; d.y+=d.v*dt*1.6; d.x-=dt*.15; if(d.y>1){d.y=0;d.x=Math.random()*1.2;} const x=d.x*W,y=d.y*H; rg.moveTo(x,y); rg.lineTo(x-4,y+14); } rg.stroke(); rg._on=1;
    if(wxNow()==='storm'&&Math.random()<.004){ rg.fillStyle='rgba(255,255,255,.35)'; rg.fillRect(0,0,W,H); } }
  else if(rg._on){ rg.clearRect(0,0,W,H); rg._on=0; }
}
/* ---------- UI core ---------- */
let sheetBig=false; const PEEK=['route','stop','bus'];
function openSheet(html,ctx,cls){ $('#sheet-body').innerHTML=html; const sh=$('#sheet'); sh.classList.remove('closed'); sh.classList.toggle('mini',cls==='mini'); sh.classList.toggle('peek',!!ctx&&PEEK.includes(ctx.t)&&!sheetBig&&cls!=='mini'); sh.classList.toggle('canpeek',!!ctx&&PEEK.includes(ctx.t)); sheetCtx=ctx; }
function toggleSheetSize(big){ const sh=$('#sheet'); if(!sh.classList.contains('canpeek')) return; sheetBig=big??!sheetBig; sh.classList.toggle('peek',!sheetBig); }
function closeSheet(){ if(createMode){ cancelCreate(); return; } sheetBig=false; $('#sheet').classList.add('closed'); sheetCtx=null; setPreview(null); setTab('map',true); }
const SHEETS={routes:()=>renderRoutes(),route:c=>showRoute(c.ref,true),fleet:()=>renderFleet(),finance:()=>renderFinance(),stop:c=>showStop(c.si),more:()=>renderMore(),sat:()=>renderSat(),bus:c=>showBus(c.id,true),create:()=>renderCreate()};
function refreshSheet(){ if(!sheetCtx) return; const c=sheetCtx, el=$('#sheet-body'), sc=el.scrollTop; SHEETS[c.t]?.(c); el.scrollTop=sc; }
function setTab(t,noOpen){ curTab=t; document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t)); if(noOpen) return; setPreview(null);
  if(createMode&&t!=='routes'){ createMode=null; viewDirty=true; }
  if(t==='map') closeSheet(); else if(t==='routes') renderRoutes(); else if(t==='fleet') renderFleet(); else if(t==='finance') renderFinance(); else { sub.more=null; renderMore(); } }
const badge=(r,small)=>`<span class="badge${small?' sm':''}" style="background:${r.color}">${esc(r.ref)}</span>`;
const fires=n=>`<span class="fires">${ICON('fire',14).repeat(n)}</span>`;
const segBtns=(key,cur,items)=>`<div class="seg">${items.map(([v,l,ic])=>`<button data-sub="${key}:${v}" class="${cur===v?'on':''}">${ic?ICON(ic,16):''}${l}</button>`).join('')}</div>`;

const condColor=c=>c>=70?'#22c55e':c>=45?'#eab308':'#ef4444';
const tAgo=t=>`N${Math.floor(t/1440)+1} ${hhmm(t)}`;

/* ---------- Routes ---------- */
function renderRoutes(){
  if(createMode) return renderCreate();
  const q=routeQuery.toLowerCase();
  const list=D.routes.filter(r=>{ if(routeFilter==='open'&&!S.opened[r.ref]) return false; if(routeFilter==='new'&&S.opened[r.ref]) return false; if(routeFilter==='mine'&&!r.custom) return false;
    return !q||(r.ref+' '+r.name+' '+r.si.map(s=>D.stops[s][0]).join(' ')).toLowerCase().includes(q); });
  const items=list.slice(0,60).map(r=>{ const o=S.opened[r.ref], comp=S.comp.routes.includes(r.ref);
    return `<div class="card" data-route="${esc(r.ref)}">${badge(r)}<div class="grow"><div class="t">${esc(r.title)}</div><div class="m">${r.km.toFixed(1)} km · ${r.si.length} trạm · ${fires(r.fire)}${r.two?` · ${ICON('swap',13)}`:''}${o?` · ${ICON('bus',14)} ${busCount(r.ref)}`:''}${comp?` · ${ICON('rival',14)}`:''}</div></div>
      ${o?`<span class="mood">${ICON(faceOf(rsat(r.ref)),30)}<small>${Math.round(rsat(r.ref))}%</small></span>`:`<button class="btn y" data-open="${esc(r.ref)}" ${S.money<r.cost?'disabled':''}>${fmt(r.cost)}</button>`}</div>`; }).join('');
  openSheet(`<h2>${ICON('stop',28)} Tuyến xe buýt thật</h2><div class="sub">${D.routes.length} tuyến TP.HCM từ OpenStreetMap · ${ICON('fire',13)} = độ đông khách · ${ICON('swap',13)} = có lộ trình 2 chiều thật</div>
    <button class="btn g full" data-create ${S.level<2?'disabled':''}>${ICON('newroute',22)} Tự tạo tuyến mới từ trạm thật ${S.level<2?'· cần cấp 2':''}</button>
    <input class="search" id="rq" placeholder="Tìm số tuyến hoặc tên trạm (vd: Bến Thành)" value="${esc(routeQuery)}">
    <div class="seg"><button data-f="all" class="${routeFilter==='all'?'on':''}">Tất cả</button><button data-f="open" class="${routeFilter==='open'?'on':''}">Đã mở (${Object.keys(S.opened).length})</button><button data-f="new" class="${routeFilter==='new'?'on':''}">Chưa mở</button><button data-f="mine" class="${routeFilter==='mine'?'on':''}">Tự tạo</button></div>
    ${items||'<div class="empty">Không tìm thấy tuyến nào</div>'}${list.length>60?'<div class="empty">…gõ để tìm thêm tuyến</div>':''}`,{t:'routes'});
  const el=$('#rq'); el.oninput=()=>{ routeQuery=el.value; const p=el.selectionStart; renderRoutes(); const n=$('#rq'); n.focus(); n.setSelectionRange(p,p); };
}
function renderCreate(){ const c=createMode; if(!c) return; const st=c.stops, g=c.geo;
  openSheet(`<div class="row"><h2 style="flex:1">${ICON('newroute',26)} Tự tạo tuyến</h2><button class="btn r mini" data-ccancel>${ICON('close',16)} Hủy</button></div>
    <div class="sub">${map.getZoom()<13.5?'<b>Phóng to bản đồ</b> để thấy trạm. ':''}Chạm các trạm thật theo thứ tự (4–25 trạm). Chạm trạm cuối lần nữa để bỏ.</div>
    <div class="chips">${st.map((si,i)=>`<span class="chip"><b>${i+1}</b>${esc(D.stops[si][0])}</span>`).join('')||'<span class="m">Chưa chọn trạm nào</span>'}</div>
    ${g?`<div class="kpi"><div>Chiều dài<b>${g.km.toFixed(1)} km</b></div><div>Chi phí mở<b>${fmt(g.cost)}</b></div></div><div class="m">${g.routed?'Đường đi theo đường phố thật (OSRM / OpenStreetMap).':'Không kết nối được dịch vụ tìm đường, nối thẳng giữa các trạm.'}</div>
      <div class="row"><button class="btn g" style="flex:1" data-cundo>${ICON('undo',18)} Sửa</button><button class="btn y" style="flex:2" data-cok ${S.money<g.cost?'disabled':''}>${ICON('check',18)} Mở tuyến ${esc(g.ref)}</button></div>`
     :`<div class="row"><button class="btn g" style="flex:1" data-cundo ${st.length?'':'disabled'}>${ICON('undo',18)} Bỏ trạm cuối</button><button class="btn" style="flex:2" data-cdone ${st.length<4||c.busy?'disabled':''}>${c.busy?'Đang tìm đường…':ICON('check',18)+' Xong, vẽ tuyến'}</button></div>`}`,{t:'create'},'mini'); }
function factorBars(f){ return FACTORS.map(F=>{ const v=Math.round(f[F.k]??0); return `<div class="fac">${ICON(F.ic,22)}<span class="fn">${F.n}</span><div class="fbar"><i style="width:${v}%;background:${satColor(v)}"></i></div><b>${v}</b></div>`; }).join(''); }
function tipsFor(f,max=3){ return FACTORS.map(F=>({F,v:f[F.k]??0})).filter(x=>x.v<70).sort((a,b)=>a.v-b.v).slice(0,max).map(x=>`<div class="tip">${ICON(x.F.ic,20)}<span><b>${x.F.n} (${Math.round(x.v)})</b>: ${x.F.tip}</span></div>`).join('') || `<div class="tip">${ICON('check',20)}<span>Mọi thứ đang rất ổn, tiếp tục phát huy!</span></div>`; }
function showRoute(ref,keep){
  const r=routeById[ref]; if(!r) return; const o=S.opened[ref];
  if(!keep){ setPreview(r); setTimeout(()=>focusRoute(r),60); }
  const buses=S.buses.filter(b=>b.r===ref), idle=S.buses.filter(b=>!b.r), rs=S.rsat[ref], comp=S.comp.routes.includes(ref);
  const top=[...r.allStops].sort((a,b)=>stopW[b]-stopW[a]).slice(0,5).map(s=>esc(D.stops[s][0]));
  const A=r.dirs[0],B=r.dirs[1];
  const ups=o?Object.entries(UPGRADES).map(([k,U])=>{ const has=o.up[k], lock=S.level<U.lvl, c=U.cost(r);
    return `<div class="utile ${has?'has':''} ${lock?'lock':''}">${ICON(U.ic,32)}<b>${U.n}</b><small>${U.d}</small>${has?`<span class="tag ok">${ICON('check',12)} Đã có</span>`:lock?`<span class="tag lock">${ICON('lock',12)} Cấp ${U.lvl}</span>`:`<button class="btn y mini" data-up="${esc(ref)}:${k}" ${S.money<c?'disabled':''}>${fmt(c)}</button>`}</div>`; }).join(''):'';
  openSheet(`<h2>${badge(r)} <span class="h2t">${esc(r.title)}</span></h2>
    <div class="sub">${r.op?esc(r.op)+' · ':''}${r.km.toFixed(1)} km · ${r.allStops.length} trạm thật · ${fires(r.fire)}</div>
    <div class="row qrow"><button class="btn g mini" data-fitroute="${esc(r.ref)}">${ICON('eyemap',18)} Xem cả tuyến</button>${o?`<button class="btn y mini" data-jump="ups">${ICON('up',18)} Nâng cấp</button>`:''}</div>
    <div class="dirs"><div>${ICON('up',16)} <b>Chiều đi</b> ${esc(D.stops[A.si[0]][0])} → ${esc(D.stops[A.si[A.si.length-1]][0])} · ${A.si.length} trạm</div>
      <div style="transform:none">${ICON('swap',16)} <b>Chiều về</b> ${esc(D.stops[B.si[0]][0])} → ${esc(D.stops[B.si[B.si.length-1]][0])} · ${B.si.length} trạm${r.two?'':' <i>(cùng đường, ngược chiều)</i>'}</div></div>
    ${comp?`<div class="tip warn">${ICON('rival',22)}<span><b>${esc(S.comp.name)}</b> đang chạy song song tuyến này và giành khách (-20%). Giữ hài lòng ≥78% để đẩy họ đi.</span></div>`:''}
    ${o?`<div class="kpi"><div class="p">Khách hôm nay<b>${(o.pax||0).toLocaleString('vi-VN')}</b></div><div class="p">Doanh thu hôm nay<b>${fmt(o.rev||0)}</b></div><div>Sự cố hôm nay<b>${o.bd||0}</b></div><div>Xe trên tuyến<b>${buses.length}</b></div></div>`:''}
    ${o&&rs?`<div class="satbox"><div class="row">${ICON(faceOf(rs.s),44)}<div class="grow"><b style="font-size:17px">${Math.round(rs.s)}% · ${moodTxt(rs.s)}</b><div class="m">${buses.length?`Cứ ~${Math.round(rs.hw||0)} phút có 1 chuyến mỗi chiều`:'Chưa có xe chạy'}</div></div></div>${rs.f?factorBars(rs.f):''}<h3>Lời khuyên</h3>${rs.f?tipsFor(rs.f):''}</div>`:''}
    <div class="m" style="margin:8px 0">Trạm đông: ${top.join(' · ')}</div>
    ${o?`<div class="ubox" id="ups"><div class="ubh">${ICON('lane',22)}<b>Nâng cấp tuyến</b></div><div class="ugrid">${ups}</div></div>${routeStopUpBox(r)}
      <h3>Xe trên tuyến (${buses.length})</h3>${buses.map(b=>busCard(b)).join('')||'<div class="empty">Chưa có xe. Mua hoặc giao xe đang rảnh!</div>'}
      ${idle.length?`<button class="btn full" data-assignidle="${esc(ref)}">Giao ${idle.length} xe đang rảnh cho tuyến này</button>`:''}
      <div class="row wrap">${Object.entries(MODELS).filter(([k,M])=>S.level>=M.lvl).map(([k,M])=>`<button class="btn y buyq" data-buy="${k}" ${S.money<M.price?'disabled':''}>${ICON(M.icon,26)}<span>${fmt(M.price)}</span></button>`).join('')}</div>
      <button class="btn r full" data-close-route="${esc(ref)}">Đóng tuyến</button>`
     :`<button class="btn y full" data-open="${esc(ref)}" ${S.money<r.cost?'disabled':''}>Mở tuyến · ${fmt(r.cost)}</button>`}`,{t:'route',ref});
}

/* ---------- Fleet ---------- */
function busStatus(b){ if(b.st==='broken') return ['r','Hư giữa đường','broken']; if(b.st==='repair') return ['y','Đang sửa · xong '+hhmm(b.until),'tow']; if(b.st==='maint') return ['y','Bảo dưỡng · xong '+hhmm(b.until),'wrench'];
  if(!b.r) return ['g','Đậu ở bãi','depot'];
  if(b.park) return S.t<b.ret?['g','Hết giờ · đang về bãi','depot']:['g','Nghỉ đêm ở bãi · chạy lại '+fmtH(svcS()),'sleep'];
  if(!inService()) return ['y','Hết giờ · trả nốt khách','sleep']; if(!busDrivers(b).length) return ['r','Thiếu tài xế!','driver']; if(!activeDriver(b)) return ['g','Ngoài ca, nghỉ','sleep']; return ['ok','Đang chạy','play']; }
function busCard(b){
  const M=MODELS[b.m], r=b.r&&routeById[b.r], [sc,stx,sic]=busStatus(b), f=b.l/M.cap, c=Math.round(b.cond??100);
  return `<div class="card bus" data-bus="${b.id}"><div class="bico" style="--c:${b.color||M.color}">${ICON(M.icon,44)}</div><div class="grow"><div class="t">${r?badge(r,1):'<span class="badge sm park">P</span>'} #${b.id} ${M.name}</div>
    <div class="m"><span class="st ${sc}">${ICON(sic,13)} ${stx}</span> · ${ICON('people',13)} <b style="color:${f>.9?'#dc2626':f>.6?'#ca8a04':'#16a34a'}">${b.l}/${M.cap}</b></div>
    <div class="cond"><i style="width:${c}%;background:${condColor(c)}"></i></div></div>
    ${b.st==='broken'?`<button class="btn r mini" data-tow="${b.id}">${ICON('tow',16)} Cứu hộ</button>`:`<span class="chev">›</span>`}</div>`;
}
function showBus(id,keep){
  const b=S.buses.find(x=>x.id===id); if(!b) return renderFleet(); const M=MODELS[b.m], r=b.r&&routeById[b.r], [sc,stx,sic]=busStatus(b), c=Math.round(b.cond??100), mc=Math.round(maxCond(b));
  if(!keep&&b._p&&curTab==='map'){ const p=map.unproject([b._p[0],b._p[1]]); map.easeTo({center:p,offset:[0,-innerHeight*.22],duration:500}); }
  const opts=['<option value="">Về bãi xe</option>'].concat(openRoutes().map(x=>`<option value="${esc(x.ref)}" ${x.ref===b.r?'selected':''}>Tuyến ${esc(x.ref)} · ${esc(x.title.slice(0,30))}</option>`)).join('');
  const drv=busDrivers(b), free=S.drivers.filter(d=>d.bus===null), mcost=Math.round(M.price*.03/1e4)*1e4, ages=Math.floor((S.t-(b.born||0))/1440);
  const dests=Object.entries(b.dest||{}).filter(([k,v])=>v>0).sort((a,c)=>+a[0]-+c[0]).slice(0,4);
  const dr=r&&r.dirs[b.dir];
  openSheet(`<h2>${ICON(M.icon,34)} Xe #${b.id} <span class="h2t">${M.name}</span></h2>
    <div class="sub"><span class="st ${sc}">${ICON(sic,14)} ${stx}</span>${r&&dr&&!b.park?` · ${badge(r,1)} hướng về ${esc(D.stops[dr.si[dr.si.length-1]][0])}`:''}</div>
    <div class="kpi"><div>${ICON('people',16)} Khách trên xe<b>${b.l}/${M.cap}</b></div><div>${ICON('chart',16)} Đã chạy<b>${Math.round(b.km)} km · ${b.trips||0} lượt</b></div>
      <div>${ICON('wrench',16)} Tình trạng<b style="color:${condColor(c)}">${c}%</b></div><div>${ICON('calendar',16)} Tuổi xe<b>${ages} ngày · tối đa ${mc}%</b></div></div>
    ${b.r&&b.st!=='maint'&&b.st!=='repair'?`<div class="row cabrow"><button class="btn cabgo" data-cab="${b.id}:driver">${ICON('driver',20)} Góc nhìn trong xe</button><button class="btn y" data-cab="${b.id}:passenger">${ICON('people',20)} Ghế khách</button></div>`:''}
    ${dests.length?`<div class="m">${ICON('pin',14)} Khách sắp xuống: ${dests.map(([k,v])=>`${esc(D.stops[dr.si[+k]]?.[0]||'')} (${v})`).join(' · ')}</div>`:''}
    <h3>${ICON('stop',20)} Tuyến chạy</h3><select class="full" data-assign="${b.id}">${opts}</select>
    <h3>${ICON('driver',20)} Tài xế (${drv.length})</h3>
    ${drv.map(d=>`<div class="card drv">${ICON('driver',30)}<div class="grow"><div class="t">${esc(d.name)} <span class="stars">${stars(d.skill)}</span></div><div class="m">${SHIFTS[d.shift].n} · ${fmt(driverWage(d))}/ngày ${onShift(d,hour())?'· <b style="color:#16a34a">đang làm</b>':''}</div></div><button class="btn g mini" data-unassign="${d.id}">Gỡ</button></div>`).join('')||'<div class="empty">Chưa có tài xế, xe sẽ không chạy!</div>'}
    ${free.length?`<select class="full" data-adddrv="${b.id}"><option value="">+ Giao tài xế đang rảnh…</option>${free.map(d=>`<option value="${d.id}">${esc(d.name)} · ${'★'.repeat(d.skill)} · ${SHIFTS[d.shift].n}</option>`).join('')}</select>`:`<div class="m">Thuê thêm tài xế ở Đội xe › Tài xế. Hai tài xế ca sáng + ca chiều rẻ hơn một người cả ngày.</div>`}
    <h3>${ICON('palette',20)} Màu sơn xe</h3><div class="swatches">${[[null,'Mặc định']].concat(LIVERIES).map(([col,n])=>`<button class="sw ${b.color===col?'on':''}" data-livery="${b.id}:${col||''}" title="${n}" style="background:${col||M.color}"></button>`).join('')}</div>
    <div class="row" style="margin-top:12px">
      ${b.st==='broken'?`<button class="btn r" style="flex:1" data-tow="${b.id}">${ICON('tow',18)} Gọi cứu hộ</button>`:`<button class="btn g" style="flex:1" data-maint="${b.id}" ${b.st!=='ok'||c>=mc-1?'disabled':''}>${ICON('wrench',18)} Bảo dưỡng · ${fmt(mcost)}</button>`}
      <button class="btn r" style="flex:1" data-sell="${b.id}">Bán · ${fmt(Math.round(M.price*.5*c/100/1e4)*1e4)}</button></div>
    <div class="sub" style="margin-top:8px">Xe xuống cấp theo số km; xe càng cũ thì tối đa càng thấp. Xe dưới 35% dễ hư giữa đường. Có bãi xe gần tuyến thì sửa nhanh & rẻ hơn.</div>`,{t:'bus',id});
}
function renderFleet(){
  const tab=sub.fleet, head=`<h2>${ICON('bus',28)} Đội xe</h2>`+segBtns('fleet',tab,[['bus','Xe buýt','bus'],['drv','Tài xế','driver'],['depot','Bãi xe','depot'],['shop','Mua xe','cart']]);
  if(tab==='drv') return renderDrivers(head); if(tab==='depot') return renderDepots(head);
  if(tab==='shop'){ const models=Object.entries(MODELS).map(([k,M])=>{ const lock=S.level<M.lvl;
    return `<div class="card model ${lock?'lock':''}"><img src="${M.img}" alt="${M.name}" loading="lazy"><div class="in">
      <div class="t row">${ICON(M.icon,30)} ${M.name} ${lock?`<span class="tag lock">${ICON('lock',12)} Cấp ${M.lvl}</span>`:''}</div><div class="m">${M.desc}</div>
      <div class="stats"><div>${ICON('people',18)}<b>${M.cap}</b>chỗ</div><div>${ICON('fast',18)}<b>${Math.round(M.speed*.06)}</b>km/h</div><div>${ICON('star',18)}<b>${M.comfort}</b>tiện nghi</div><div>${ICON('wrench',18)}<b>${M.rel<1?'Bền':M.rel>1?'Hay hư':'Vừa'}</b>độ bền</div></div>
      <div class="m">${ICON(k==='ev'?'bolt':'fuel',14)} ${fmt(M.fuel)}/km · ${ICON('wrench',14)} ${fmt(M.upk)}/ngày</div>
      <button class="btn y full" data-buy="${k}" ${lock||S.money<M.price?'disabled':''}>${ICON('cart',20)} Mua · ${fmt(M.price)}</button></div></div>`; }).join('');
    return openSheet(`${head}<div class="sub">Chỗ đậu: ${S.buses.length}/${fleetCap()} · Mua xe sẽ tự thuê 1 tài xế nếu chưa có tài xế rảnh.</div>${models}`,{t:'fleet'}); }
  const broken=S.buses.filter(b=>b.st==='broken').length, nod=S.buses.filter(b=>!busDrivers(b).length).length;
  openSheet(`${head}<div class="sub">${S.buses.length}/${fleetCap()} xe · ${S.buses.filter(b=>!b.r).length} xe rảnh${broken?` · <b style="color:#dc2626">${broken} xe hư</b>`:''}${nod?` · <b style="color:#dc2626">${nod} xe thiếu tài xế</b>`:''}</div>
    ${S.buses.length?`<button class="btn g full" data-maintall>${ICON('wrench',18)} Bảo dưỡng mọi xe dưới 60%</button>`:''}
    ${S.buses.map(b=>busCard(b)).join('')||`<div class="empty">Bạn chưa có xe nào.</div><button class="btn y full" data-sub="fleet:shop">${ICON('cart',20)} Đến cửa hàng xe</button>`}`,{t:'fleet'});
}
function renderDrivers(head){
  const total=S.drivers.reduce((a,d)=>a+driverWage(d),0);
  const busOpts=d=>['<option value="">Chưa giao xe</option>'].concat(S.buses.map(b=>`<option value="${b.id}" ${d.bus===b.id?'selected':''}>Xe #${b.id} ${b.r?'· tuyến '+esc(b.r):'· ở bãi'}</option>`)).join('');
  openSheet(`${head}<div class="sub">${S.drivers.length} tài xế · lương ${fmt(total)}/ngày. Xe chỉ chạy khi có tài xế trong ca. Tài xế giỏi chạy nhanh, êm, ít hư xe.</div>
    ${S.drivers.map(d=>`<div class="card drv col"><div class="row">${ICON('driver',34)}<div class="grow"><div class="t">${esc(d.name)} <span class="stars">${stars(d.skill)}</span></div><div class="m">${fmt(driverWage(d))}/ngày · ${onShift(d,hour())?'<b style="color:#16a34a">đang trong ca</b>':'ngoài ca'}</div></div><button class="btn r mini" data-fire="${d.id}">Cho nghỉ</button></div>
      <div class="row"><select data-shift="${d.id}">${Object.entries(SHIFTS).map(([k,s])=>`<option value="${k}" ${d.shift===k?'selected':''}>${s.n} ${shiftTxt(k)}${s.mul>1?' (lương ×'+s.mul+')':''}</option>`).join('')}</select><select data-drvbus="${d.id}">${busOpts(d)}</select></div></div>`).join('')||'<div class="empty">Chưa có tài xế.</div>'}
    <h3>${ICON('people',20)} Ứng viên hôm nay</h3><div class="sub">Danh sách đổi mỗi ngày.</div>
    ${S.cands.map(d=>`<div class="card drv">${ICON('driver',30)}<div class="grow"><div class="t">${esc(d.name)} <span class="stars">${stars(d.skill)}</span></div><div class="m">Lương ${fmt(d.wage)}/ngày (ca cả ngày ×1.6)</div></div><button class="btn y mini" data-hire="${d.id}">Thuê</button></div>`).join('')||'<div class="empty">Hết ứng viên, quay lại ngày mai.</div>'}`,{t:'fleet'});
}
function renderDepots(head){
  openSheet(`${head}<div class="sub">Mỗi bãi xe chứa ${DEPOT_CAP} xe, mở rộng thêm được 5 (hiện ${S.buses.length}/${fleetCap()}). Bãi của bạn có ô nâng cấp ngay bên dưới. Tuyến chạy gần bãi (≤2,5 km) được cứu hộ, sửa chữa & bảo dưỡng nhanh gấp đôi, rẻ hơn. Bãi đặt cạnh các bến xe thật.</div>
    ${D.depots.map(dp=>{ const own=S.depots.includes(dp.id), near=openRoutes().filter(r=>nearDepot(r)===dp).length;
      return `<div class="card">${ICON(dp.id==='bt'?'office':'depot',36)}<div class="grow"><div class="t">${esc(dp.n)}</div><div class="m">${ICON('pin',13)} ${esc(D.stops[dp.si][0])}${own?` · phục vụ ${near} tuyến`:''}</div></div>
        <button class="btn g mini" data-goto="${dp.p[0]},${dp.p[1]}">${ICON('target',16)}</button>${own?`<span class="tag ok">${ICON('check',12)} Của bạn</span>`:`<button class="btn y mini" data-depot="${dp.id}" ${S.money<dp.cost?'disabled':''}>${fmt(dp.cost)}</button>`}</div>${own?depotUpRow(dp.id):''}`; }).join('')}`,{t:'fleet'});
}
/* ---------- Satisfaction ---------- */
function renderSat(){
  const o=openRoutes(); const avg={}; let wt=0; for(const F of FACTORS) avg[F.k]=0;
  for(const r of o){ const s=S.rsat[r.ref]; if(!s||!s.f) continue; const w=1+(S.opened[r.ref].pax||0); wt+=w; for(const F of FACTORS) avg[F.k]+=s.f[F.k]*w; }
  if(wt) for(const F of FACTORS) avg[F.k]/=wt;
  const bonusTxt=S.sat>=75?`Nếu giữ ≥75% tới cuối ngày bạn được <b>thưởng</b> từ thành phố.`:S.sat<35?`Dưới 35% sẽ bị <b>phạt chất lượng</b> cuối ngày!`:`Đạt 75% để nhận thưởng hài lòng mỗi ngày.`;
  openSheet(`<h2>${ICON('star',28)} Độ hài lòng của khách</h2>
    <div class="satbox big"><div class="row">${ICON(faceOf(S.sat),64)}<div class="grow"><b style="font-size:26px">${Math.round(S.sat)}%</b><div class="m">${moodTxt(S.sat)} · ${bonusTxt}</div></div></div>
    <div class="m" style="margin-top:6px">Khách vui thì đi xe nhiều hơn (tới +50% khách), lên cấp nhanh hơn (+20% XP khi ≥80%). Đối thủ ${esc(S.comp.name)}: ${Math.round(S.comp.sat)}%.</div></div>
    ${o.length?`<h3>Các yếu tố</h3>${factorBars(avg)}<h3>Lời khuyên</h3>${tipsFor(avg)}`:'<div class="empty">Mở tuyến đầu tiên để bắt đầu đo độ hài lòng.</div>'}
    <h3>${ICON('ticket',20)} Giá vé</h3><div class="seg">${FARES.map(f=>`<button data-fare="${f}" class="${S.fare===f?'on':''}">${f/1000}k</button>`).join('')}</div>
    <div class="m">Vé rẻ: khách vui & đi nhiều hơn. Vé đắt: thu nhiều mỗi khách nhưng khách bực.</div>
    ${o.length?`<h3>Theo tuyến</h3>${o.sort((a,b)=>rsat(a.ref)-rsat(b.ref)).map(r=>`<div class="card" data-route="${esc(r.ref)}">${badge(r)}<div class="grow"><div class="t">${esc(r.title)}</div><div class="fbar"><i style="width:${rsat(r.ref)}%;background:${satColor(rsat(r.ref))}"></i></div></div><span class="mood">${ICON(faceOf(rsat(r.ref)),30)}<small>${Math.round(rsat(r.ref))}%</small></span></div>`).join('')}`:''}`,{t:'sat'});
}

/* ---------- Finance ---------- */
function renderFinance(){
  const tab=sub.fin, head=`<h2>${ICON('chart',28)} Tài chính</h2>`+segBtns('fin',tab,[['sum','Tổng quan','chart'],['bank','Ngân hàng','bank'],['stops','Trạm','stop']]);
  if(tab==='bank') return renderBank(head); if(tab==='stops') return renderStopStats(head);
  const t=today(), inc=t.fare+t.sub+t.contract, exp=t.fuel+t.upk+t.wage+t.repair+t.interest;
  openSheet(`${head}<div class="sub">Ngày ${day()} · ${hhmm(S.t)} · giá vé ${fmt(S.fare)}</div>
    <div class="kpi"><div class="p">${ICON('ticket',18)} Tiền vé<b>${fmt(t.fare)}</b></div><div class="p">${ICON('coin',18)} Trợ giá TP<b>${fmt(t.sub)}</b></div>
    <div class="p">${ICON('contract',18)} Hợp đồng<b>${fmt(t.contract)}</b></div><div class="n">${ICON('fuel',18)} Nhiên liệu / điện<b>${fmt(t.fuel)}</b></div>
    <div class="n">${ICON('driver',18)} Lương tài xế<b>${fmt(t.wage)}</b></div><div class="n">${ICON('wrench',18)} Bảo dưỡng xe<b>${fmt(t.upk)}</b></div>
    <div class="n">${ICON('tow',18)} Sửa chữa, cứu hộ<b>${fmt(t.repair)}</b></div><div class="n">${ICON('bank',18)} Lãi vay<b>${fmt(t.interest)}</b></div>
    <div>${ICON('cart',18)} Đầu tư<b>${fmt(t.build)}</b></div><div class="${inc-exp>=0?'p':'n'}">${ICON('chart',18)} Lãi vận hành<b>${fmt(inc-exp)}</b></div></div>
    <canvas id="chart"></canvas><div class="legend"><span><i style="background:#22c55e"></i>Thu</span><span><i style="background:#f87171"></i>Chi vận hành</span><span><i style="background:#0f766e"></i>Lãi</span><span><i style="background:#f59e0b"></i>Thưởng/phạt</span></div>
    <div class="kpi"><div>${ICON('people',18)} Tổng hành khách<b>${S.paxTotal.toLocaleString('vi-VN')}</b></div><div>${ICON('bus',18)} Xe đang chạy<b>${S.buses.filter(busActive).length}/${S.buses.length}</b></div>
    <div>${ICON('stop',18)} Tuyến đang mở<b>${Object.keys(S.opened).length}</b></div><div>${ICON('bank',18)} Nợ ngân hàng<b>${fmt(debt())}</b></div></div>
    <div class="sub">Trợ giá ${fmt(SUBSIDY_KM)}/km xe chạy. Thưởng/phạt hài lòng tính lúc hết ngày.</div>`,{t:'finance'});
  drawChart();
}
function drawChart(){
  const c=$('#chart'); if(!c) return; const r=Math.min(devicePixelRatio||1,2), W=c.clientWidth, H=c.clientHeight; c.width=W*r; c.height=H*r;
  const g=c.getContext('2d'); g.scale(r,r);
  const days=S.ledger.slice(-7), inc=days.map(d=>d.fare+d.sub+(d.contract||0)), exp=days.map(d=>d.fuel+d.upk+(d.wage||0)+(d.repair||0)+(d.interest||0)), mx=Math.max(1,...inc,...exp), pad=28, bw=(W-pad-10)/days.length, Y=v=>12+(H-34)*(1-v/mx);
  g.font='10px sans-serif'; g.fillStyle='#94a3b8'; g.strokeStyle='#e2e8f0';
  for(let i=0;i<=3;i++){ const y=Y(mx*i/3); g.beginPath(); g.moveTo(pad,y); g.lineTo(W-6,y); g.stroke(); g.fillText(fmt(mx*i/3).replace(' tr','tr'),2,y+3); }
  days.forEach((d,i)=>{ const x=pad+i*bw+bw*.12, w=bw*.3; g.fillStyle='#22c55e'; bar(g,x,Y(inc[i]),w,H-22-Y(inc[i])); g.fillStyle='#f87171'; bar(g,x+w+2,Y(exp[i]),w,H-22-Y(exp[i]));
    if(d.bonus){ g.fillStyle='#f59e0b'; g.beginPath(); g.arc(x+w*2+8,Y(Math.min(mx,Math.abs(d.bonus))),3.5,0,7); g.fill(); }
    g.fillStyle='#64748b'; g.fillText('N'+d.day,x,H-8); });
  g.strokeStyle='#0f766e'; g.lineWidth=2.5; g.beginPath(); days.forEach((d,i)=>{ const x=pad+i*bw+bw*.5, y=Y(clamp(inc[i]-exp[i],0,mx)); i?g.lineTo(x,y):g.moveTo(x,y); }); g.stroke();
}
function bar(g,x,y,w,h){ if(h<=0) return; g.beginPath(); g.roundRect(x,y,w,h,[4,4,0,0]); g.fill(); }
function renderBank(head){
  const lim=loanLimit(), d=debt(), room=lim-d, daily=S.loans.reduce((a,l)=>a+l.amt*l.rate,0);
  const amts=[5e6,10e6,20e6,50e6,100e6].filter(a=>a<=Math.max(room,0));
  openSheet(`${head}<div class="satbox"><div class="row">${ICON('bank',48)}<div class="grow"><b style="font-size:17px">Ngân hàng Sài Gòn Xe Buýt</b><div class="m">Hạn mức theo cấp: ${fmt(lim)} · đang nợ ${fmt(d)}</div></div></div>
    <div class="fbar"><i style="width:${clamp(d/lim*100,0,100)}%;background:${d/lim>.8?'#ef4444':'#0ea5e9'}"></i></div></div>
    <div class="sub">Lãi 1,5%/ngày (khoản từ 50 tr: 1,2%/ngày), trừ lúc hết ngày. Hiện trả lãi ${fmt(daily)}/ngày. Trả nợ bất cứ lúc nào, không phạt.</div>
    <h3>${ICON('coin',20)} Vay thêm</h3>${amts.length?`<div class="row wrap">${amts.map(a=>`<button class="btn y" data-borrow="${a}">${fmt(a)}</button>`).join('')}</div>`:'<div class="empty">Đã hết hạn mức. Lên cấp để vay thêm.</div>'}
    <h3>${ICON('book',20)} Khoản vay</h3>${S.loans.map(l=>`<div class="card">${ICON('bank',28)}<div class="grow"><div class="t">${fmt(l.amt)}</div><div class="m">Vay ngày ${l.day} · lãi ${(l.rate*100).toFixed(1).replace('.',',')}%/ngày = ${fmt(l.amt*l.rate)}</div></div><button class="btn g mini" data-repay="${l.id}" ${S.money<l.amt?'disabled':''}>Trả hết</button></div>`).join('')||'<div class="empty">Không có khoản vay nào.</div>'}`,{t:'finance'});
}
function renderStopStats(head){
  const sv=servedStops(), td=S.td.ss||{};
  const rows=sv.map(si=>({si,a:(S.ss[si]||[0,0]),t:(td[si]||[0,0])})).sort((x,y)=>y.t[0]-x.t[0]||y.a[0]-x.a[0]).slice(0,25);
  const mx=Math.max(1,...rows.map(r=>r.t[0]));
  openSheet(`${head}<div class="sub">${sv.length} trạm đang phục vụ · xếp theo lượt lên xe hôm nay. Chạm để xem trạm.</div>
    ${rows.map((r,i)=>`<div class="card stopst" data-stop="${r.si}"><b class="rk">${i+1}</b><div class="grow"><div class="t">${esc(D.stops[r.si][0])} ${S.shelters[r.si]?ICON('shelter',14):''}</div>
      <div class="fbar"><i style="width:${r.t[0]/mx*100}%;background:#0ea5e9"></i></div><div class="m">Hôm nay ${ICON('up',12)} ${r.t[0]} lên · ${r.t[1]} xuống · Tổng ${r.a[0].toLocaleString('vi-VN')} lên · đang chờ ${Math.floor(S.waiting[r.si]||0)}</div></div>${ICON(faceOf(stopMood(r.si)),26)}</div>`).join('')||'<div class="empty">Mở tuyến để có thống kê trạm.</div>'}`,{t:'finance'});
}
function showStop(si){
  const st=D.stops[si], w=Math.floor(S.waiting[si]||0), sh=S.shelters[si], rs=stopRoutes[si].map(x=>routeById[x]).filter(Boolean), mood=stopMood(si), a=S.ss[si]||[0,0], t=(S.td.ss||{})[si]||[0,0];
  const ct=S.contracts.active.filter(c=>nearSet(c).has(si));
  openSheet(`<h2>${ICON(sh?'shelter':'stop',28)} <span class="h2t">${esc(st[0])}</span>${'★'.repeat(suCount(si))?`<span class="sstars">${'★'.repeat(suCount(si))}</span>`:''}</h2><div class="sub">Trạm thật trên OpenStreetMap · ${fires(stopFire(si))}</div>
    <div class="kpi"><div>${ICON('people',18)} Khách đang chờ<b>${w}</b></div><div>${ICON(faceOf(mood),18)} Tâm trạng<b>${moodTxt(mood)}</b></div>
      <div>${ICON('up',18)} Lên xe hôm nay<b>${t[0]}</b></div><div>${ICON('pin',18)} Xuống xe hôm nay<b>${t[1]}</b></div>
      <div>Tổng lượt lên<b>${a[0].toLocaleString('vi-VN')}</b></div><div>Tổng lượt xuống<b>${a[1].toLocaleString('vi-VN')}</b></div></div>
    ${ct.length?`<div class="tip">${ICON('contract',20)}<span>Thuộc vùng hợp đồng: ${ct.map(c=>esc(c.n)).join(', ')}</span></div>`:''}
    ${!inService()?`<div class="tip warn">${ICON('sleep',20)}<span><b>Ngoài giờ chạy</b> (${fmtH(svcE())} – ${fmtH(svcS())}): trạm tạm đóng, khách về nhà, không tính điểm chờ.</span></div>`:''}
    <div class="m">Tuyến đi qua: ${rs.map(r=>`<span data-route="${esc(r.ref)}">${badge(r,1)}</span>`).join(' ')}</div>
    <div class="ubox"><div class="ubh">${ICON('up',22)}<b>Ô nâng cấp trạm</b><span class="ucnt">${suCount(si)}/${SU_KEYS.length}</span></div>${stopUpGrid(si)}</div>`,{t:'stop',si});
}

/* ---------- More hub ---------- */
const HUB=[['missions','Nhiệm vụ','mission'],['ach','Thành tựu','medal'],['contracts','Hợp đồng','contract'],['rival','Đối thủ & Kỷ lục','rival'],['weather','Thời tiết','cloudsun'],['notes','Thông báo','bell'],['settings','Cài đặt','gear'],['guide','Hướng dẫn','book'],['credits','Nguồn','info']];
function renderMore(){
  const s=sub.more;
  const back=`<button class="btn g mini back" data-sub="more:">‹ Thêm</button>`;
  if(s==='missions') return renderMissions(back); if(s==='ach') return renderAch(back); if(s==='contracts') return renderContracts(back); if(s==='rival') return renderRival(back);
  if(s==='weather') return renderWeather(back); if(s==='notes') return renderNotes(back); if(s==='settings') return renderSettings(back); if(s==='credits') return renderCredits(back);
  const dots={missions:pendingClaims(),notes:S.unread||0,contracts:S.contracts.offers.length};
  openSheet(`<h2>${ICON('gear',28)} Thêm</h2><div class="hub">${HUB.map(([k,n,ic])=>`<button class="tile" data-${k==='guide'?'tut':'sub="more:'+k+'"'}>${ICON(ic,36)}<span>${n}</span>${dots[k]?`<i class="dot">${dots[k]}</i>`:''}</button>`).join('')}</div>
    <div class="sub" style="text-align:center;margin-top:10px">Xe Buýt Sài Gòn v7 · dữ liệu © OpenStreetMap</div>`,{t:'more'});
}
function renderMissions(back){
  const L=S.missions?S.missions.list:[], W=S.weekly;
  const row=(m,i)=>{ const p=i==='w'?m.prog:missionProg(m), pct=clamp(p/m.target*100,0,100);
    return `<div class="card mis ${m.claimed?'done':''}">${ICON(i==='w'?'gift':m.ic,32)}<div class="grow"><div class="t">${i==='w'?`Chở ${m.target.toLocaleString('vi-VN')} khách trong tuần`:esc(m.n)}</div><div class="fbar"><i style="width:${pct}%;background:${m.done?'#22c55e':'#0ea5e9'}"></i></div><div class="m">${m.type==='fare'?fmt(p)+' / '+fmt(m.target):Math.floor(p).toLocaleString('vi-VN')+' / '+m.target.toLocaleString('vi-VN')}${m.type==='sat'?' · tính lúc hết ngày':''} · thưởng ${fmt(m.rw)}</div></div>
      ${m.claimed?`<span class="tag ok">${ICON('check',12)}</span>`:m.done?`<button class="btn y mini" data-claim="${i}">Nhận</button>`:''}</div>`; };
  openSheet(`${back}<h2>${ICON('mission',28)} Nhiệm vụ</h2><div class="sub">Nhiệm vụ ngày làm mới mỗi sáng. Nhiệm vụ tuần đổi sau 7 ngày.</div>
    <h3>Hôm nay (ngày ${day()})</h3>${L.map((m,i)=>row(m,i)).join('')}<h3>Tuần này</h3>${W?row(W,'w'):''}`,{t:'more'});
}
function renderAch(back){ const n=Object.keys(S.ach).length;
  openSheet(`${back}<h2>${ICON('medal',28)} Thành tựu</h2><div class="sub">${n}/${ACH.length} đã mở khóa</div><div class="achs">${ACH.map(a=>`<div class="ach ${S.ach[a.id]?'on':''}">${ICON(S.ach[a.id]?a.ic:'lock',34)}<b>${a.n}</b><small>${a.d}</small><small class="rw">${S.ach[a.id]?'Ngày '+S.ach[a.id]:'+'+fmt(a.rw)}</small></div>`).join('')}</div>`,{t:'more'}); }
function renderContracts(back){ const C=S.contracts;
  openSheet(`${back}<h2>${ICON('contract',28)} Hợp đồng thành phố</h2><div class="sub">Chở đủ số khách lên xe tại các trạm trong bán kính 800 m quanh điểm hẹn trước hạn. Mỗi ngày đang chạy còn được trả trước một phần.</div>
    <h3>Đang thực hiện (${C.active.length}/3)</h3>${C.active.map(c=>`<div class="card mis">${ICON('contract',30)}<div class="grow"><div class="t">${esc(c.n)}</div><div class="fbar"><i style="width:${clamp(c.prog/c.need*100,0,100)}%;background:#0ea5e9"></i></div><div class="m">${c.prog}/${c.need} khách · hạn hết ngày ${c.deadline} · thưởng ${fmt(c.reward)} + ${fmt(c.perDay)}/ngày</div></div><button class="btn g mini" data-goto="${D.stops[c.si][1]},${D.stops[c.si][2]}">${ICON('target',16)}</button></div>`).join('')||'<div class="empty">Chưa có hợp đồng nào.</div>'}
    <h3>Đề nghị mới</h3>${C.offers.map(c=>`<div class="card mis">${ICON('pin',30)}<div class="grow"><div class="t">${esc(c.n)}</div><div class="m">${c.need} khách trong ${c.days} ngày · thưởng ${fmt(c.reward)} + ${fmt(c.perDay)}/ngày · đề nghị hết hạn ngày ${c.exp}</div></div><div class="col"><button class="btn y mini" data-accept="${c.id}">Nhận</button><button class="btn g mini" data-goto="${D.stops[c.si][1]},${D.stops[c.si][2]}">${ICON('target',16)}</button></div></div>`).join('')||'<div class="empty">Thành phố sẽ gửi đề nghị mới vào sáng hôm sau (từ ngày 2).</div>'}`,{t:'more'}); }
function renderRival(back){ const c=S.comp, R=S.rec, myBus=S.buses.length, myPax=today().fare/Math.max(1,S.fare);
  const cmp=(n,a,b,f=x=>x)=>`<div class="vs"><span>${n}</span><b class="${a>=b?'win':''}">${f(a)}</b><b class="${b>a?'win':''}">${f(b)}</b></div>`;
  const recs=[['people','Khách nhiều nhất 1 ngày',(R.bestPax||0).toLocaleString('vi-VN')],['coin','Lãi cao nhất 1 ngày',fmt(R.bestProfit||0)],['ticket','Tiền vé cao nhất 1 ngày',fmt(R.bestFare||0)],['bus','Đội xe lớn nhất',(R.maxBuses||0)+' xe'],['stop','Nhiều tuyến nhất',(R.maxRoutes||0)+' tuyến'],['star','Hài lòng cao nhất',(R.maxSat||0)+'%'],['broken','Tổng số lần hư xe',(S.stat.breakdowns||0)],['rival','Đẩy lùi đối thủ',(S.stat.beatComp||0)+' lần']];
  openSheet(`${back}<h2>${ICON('rival',28)} Đối thủ & Kỷ lục</h2>
    <div class="satbox"><div class="row">${ICON('rival',44)}<div class="grow"><b style="font-size:17px">${esc(c.name)}</b><div class="m">${c.routes.length?'Đang cạnh tranh trên tuyến: '+c.routes.map(r=>routeById[r]?badge(routeById[r],1):'').join(' '):'Chưa chen vào tuyến nào của bạn'}</div></div></div>
    <div class="vs head"><span></span><b>Bạn</b><b>Đối thủ</b></div>${cmp('Số xe',myBus,c.buses)}${cmp('Hài lòng',Math.round(S.sat),Math.round(c.sat),x=>x+'%')}${cmp('Khách/ngày (ước)',Math.round(myPax),c.pax,x=>x.toLocaleString('vi-VN'))}</div>
    <div class="sub">Đối thủ chạy song song tuyến của bạn sẽ lấy bớt 20% khách. Giữ hài lòng tuyến ≥78% qua đêm để họ rút lui.</div>
    <h3>${ICON('trophy',20)} Kỷ lục cá nhân</h3><div class="kpi">${recs.map(([ic,n,v])=>`<div>${ICON(ic,16)} ${n}<b>${v}</b></div>`).join('')}</div>`,{t:'more'}); }
function renderWeather(back){
  openSheet(`${back}<h2>${ICON('cloudsun',28)} Dự báo thời tiết</h2><div class="sub">12 giờ tới ở TP.HCM. Mưa: xe chậm hơn, khách ở trạm không có mái che bực bội. Xây mái che trước cơn mưa!</div>
    <div class="fc">${S.fc.map((f,i)=>`<div class="${i?'':'now'}"><small>${i?String(f.h%24).padStart(2,'0')+'h':'Bây giờ'}</small>${ICON(WX[f.w].ic,34)}<span>${WX[f.w].n}</span></div>`).join('')}</div>
    <div class="tip">${ICON('info',20)}<span>Dự báo đúng khoảng 3 giờ tới, xa hơn có thể thay đổi.</span></div>`,{t:'more'}); }
function renderNotes(back){ S.unread=0;
  openSheet(`${back}<h2>${ICON('bell',28)} Thông báo</h2>${S.notes.map(n=>`<div class="note">${ICON(n.ic||'info',22)}<div class="grow"><div>${esc(n.txt)}</div><small>${tAgo(n.t)}</small></div></div>`).join('')||'<div class="empty">Chưa có thông báo.</div>'}
    <h3>${ICON('news',20)} Tin tức</h3>${(S.newsQ||[]).map(t=>`<div class="note">${ICON('news',20)}<div class="grow">${esc(t)}</div></div>`).join('')||'<div class="empty">Chưa có tin.</div>'}`,{t:'more'}); }
function renderSettings(back){ const o=S.opt, onoff=v=>`<b class="${v?'on':'off'}">${v?'BẬT':'TẮT'}</b>`;
  openSheet(`${back}<h2>${ICON('gear',28)} Cài đặt</h2>
    <button class="btn g full set" data-opt="sfx">${ICON('sound',22)}<span>Hiệu ứng âm thanh</span>${onoff(o.sfx)}</button>
    <button class="btn g full set" data-opt="music">${ICON('music',22)}<span>Nhạc nền (tự tạo)</span>${onoff(o.music)}</button>
    <button class="btn g full set" data-opt="automaint">${ICON('wrench',22)}<span>Tự bảo dưỡng xe dưới 35%</span>${onoff(o.automaint)}</button>
    <button class="btn g full set" data-opt="fps">${ICON('battery',22)}<span>Tiết kiệm pin (30 FPS)</span>${onoff(o.fps===30)}</button>
    <h3>${ICON('palette',20)} Phong cách đồ hoạ</h3>
    <div class="seg thseg">${[['auto','Tự động','Ngày giấy · đêm neon'],['A','Giấy xưa','Luôn kiểu A'],['B','Neon','Luôn kiểu B']].map(([k,n,d])=>`<button data-theme="${k}" class="${(o.theme||'auto')===k?'on':''}"><b>${n}</b><small>${d}</small></button>`).join('')}</div>
    <div class="sub" style="margin:0 0 8px">Tự động: chuyển dần sang neon lúc chạng vạng (~18:00) và về giấy lúc rạng sáng (~5:30).</div>
    <h3>${ICON('moon',20)} Giờ chạy xe</h3>
    <div class="svcrow"><label>Bắt đầu<select data-svc="start">${[240,270,300,330,360].map(m=>`<option value="${m}" ${o.svcStart===m?'selected':''}>${fmtH(m/60)}</option>`).join('')}</select></label>
      <label>Kết thúc<select data-svc="end">${[1260,1290,1320,1350,1380,1440].map(m=>`<option value="${m}" ${o.svcEnd===m?'selected':''}>${m===1440?'24:00':fmtH(m/60)}</option>`).join('')}</select></label></div>
    <div class="sub" style="margin:4px 0 8px">Hết giờ: xe ngừng đón khách, trả nốt khách rồi về bãi. Ca sáng ${shiftTxt('sang')}, ca chiều ${shiftTxt('chieu')}.</div>
    <button class="btn g full set" data-opt="nightFF">${ICON('fast',22)}<span>Tự tua nhanh ban đêm (×10)</span>${onoff(o.nightFF)}</button>
    <h3>${ICON('textsize',20)} Cỡ chữ</h3><div class="seg">${[['sm','Nhỏ'],['md','Vừa'],['lg','Lớn'],['xl','Rất lớn']].map(([k,n])=>`<button data-fs="${k}" class="${o.fs===k?'on':''}">${n}</button>`).join('')}</div>
    <button class="btn g full" data-saveg>${ICON('save',20)} Lưu game ngay</button>
    <button class="btn r full" data-reset>${ICON('reset',20)} Chơi lại từ đầu</button>`,{t:'more'}); }
function renderCredits(back){
  openSheet(`${back}<h2>${ICON('info',28)} Nguồn dữ liệu & hình ảnh</h2><div class="credits" id="cred">Đang tải…</div>`,{t:'more'});
  fetch('credits.json').then(r=>r.json()).then(c=>{ const el=$('#cred'); if(!el) return;
    el.innerHTML='<ul>'+c.map(x=>`<li><b>${esc(x.what)}</b>: ${x.title?esc(x.title)+' – ':''}${esc(x.author)} · ${x.licenseUrl?`<a href="${esc(x.licenseUrl)}" target="_blank" rel="noopener">${esc(x.license)}</a>`:esc(x.license)}${x.source?` · <a href="${esc(x.source)}" target="_blank" rel="noopener">nguồn</a>`:''}</li>`).join('')+'</ul><p>Dữ liệu tuyến có thể khác thực tế hiện tại. Âm thanh và nhạc được tạo bằng code (WebAudio), không dùng file có bản quyền.</p>'; }).catch(()=>{}); }
function applyFs(){ document.body.dataset.tsz=S.opt.fs||'md'; }

/* ---------- Toast / modal / tutorial ---------- */
function toast(t,ic){ const d=document.createElement('div'); d.className='toast'; d.innerHTML=(ic?ICON(ic,20):'')+'<span>'+esc(t)+'</span>'; const box=$('#toasts'); box.appendChild(d); setTimeout(()=>d.remove(),3200); while(box.children.length>3) box.firstChild.remove(); }
function modal(h){ const m=$('#modal'); m.innerHTML=`<div class="dlg">${h}</div>`; m.classList.remove('hidden'); }
const closeModal=()=>$('#modal').classList.add('hidden');
const TUT=[
  ['bus','Chào mừng giám đốc!','Bạn vừa lập công ty xe buýt ở <b>TP.HCM</b>. Bản đồ, <b>{R} tuyến</b> và <b>{S} trạm</b> trong game đều là thật, lấy từ OpenStreetMap.'],
  ['stop','Bước 1: Mở tuyến','Vào tab <b>Tuyến</b>, chọn một tuyến rồi bấm nút giá để mở. Gợi ý: tìm <b>"Bến Thành"</b>, nơi đông khách nhất. Xe chạy <b>2 chiều</b>, khách có <b>điểm đến riêng</b>.'],
  ['cart','Bước 2: Mua xe & thuê tài xế','Vào <b>Đội xe</b> mua xe, game tự thuê sẵn 1 tài xế. Xe chỉ chạy khi có <b>tài xế trong ca</b>. Thuê thêm tài xế giỏi ở mục <b>Tài xế</b>.'],
  ['wrench','Giữ xe tốt','Xe <b>xuống cấp</b> theo km và tuổi. Xe yếu dễ <b>hư giữa đường</b>: bấm <b>Cứu hộ</b>. Mua thêm <b>bãi xe</b> gần tuyến để sửa nhanh hơn và chứa thêm xe.'],
  ['star','Giữ khách hài lòng','Bấm <b>ngôi sao</b> trên cùng để xem khách vui hay bực và vì sao. Nâng cấp tuyến: <b>làn xe buýt</b>, <b>đèn ưu tiên</b>, <b>máy lạnh</b>. Coi chừng <b>đối thủ</b>!'],
  ['cloudsun','Thời tiết & sự kiện','Xem <b>dự báo</b> bằng nút mây. Khách đông lúc <b>6h–8h30</b>, <b>16h30–19h</b>. Bấm trạm để xây <b>mái che</b> trước khi mưa.'],
  ['mission','Nhiệm vụ & hợp đồng','Tab <b>Thêm</b> có nhiệm vụ ngày/tuần, thành tựu, hợp đồng thành phố, ngân hàng ở <b>Tài chính</b>. Từ cấp 2 bạn còn <b>tự tạo tuyến</b> từ trạm thật!'],
];
function showTut(i){ if(i>=TUT.length){ closeModal(); S.seen.tut=1; save(); return; } const [ic,h,p]=TUT[i];
  modal(`<div class="big">${ICON(ic,76)}</div><h2>${h}</h2><p>${p.replace('{R}',D.routes.length).replace('{S}',D.stops.length.toLocaleString('vi-VN'))}</p><div class="dots">${TUT.map((_,k)=>`<i class="${k===i?'on':''}"></i>`).join('')}</div>
    <div class="row"><button class="btn g" style="flex:1" data-tutskip>Bỏ qua</button><button class="btn" style="flex:2" data-tutnext="${i+1}">${i===TUT.length-1?'Bắt đầu chơi!':'Tiếp theo'}</button></div>`); }
function showWhatsNew(){ modal(`<div class="big">${ICON('gift',72)}</div><h2>Cập nhật mới!</h2><ul class="wn">
  <li>${ICON('swap',18)} Xe chạy 2 chiều, khách có điểm đến</li><li>${ICON('driver',18)} Tài xế, ca làm, lương, tay nghề</li><li>${ICON('broken',18)} Hư xe, cứu hộ, bảo dưỡng, xe lão hóa</li>
  <li>${ICON('depot',18)} Nhiều bãi xe ở bến thật</li><li>${ICON('newroute',18)} Tự tạo tuyến từ trạm thật</li><li>${ICON('lane',18)} Làn xe buýt, đèn ưu tiên, máy lạnh</li>
  <li>${ICON('mission',18)} Nhiệm vụ, thành tựu, hợp đồng, ngân hàng</li><li>${ICON('rival',18)} Đối thủ, tin tức, dự báo thời tiết</li><li>${ICON('palette',18)} Màu sơn xe, âm thanh, cỡ chữ</li></ul>
  <p class="m">Xe cũ của bạn đã được giao tài xế tự động.</p><button class="btn full" data-close>Chơi tiếp</button>`); S.seen.v3=1; save(); }

/* ---------- HUD ---------- */
let hudCache={};
function setTxt(id,v){ if(hudCache[id]!==v){ hudCache[id]=v; document.getElementById(id).textContent=v; } }
function setHtml(id,v){ if(hudCache[id]!==v){ hudCache[id]=v; document.getElementById(id).innerHTML=v; } }
function updTicker(){ const q=S&&S.newsQ; if(!q||!q.length||!$('#ticker')) return; const txt=q.slice(0,5).join('   •   ');
  if(hudCache.tick===txt) return; hudCache.tick=txt; const sp=$('#ticker span'); sp.textContent=txt; sp.style.animationDuration=Math.max(14,txt.length*.14)+'s'; sp.style.animation='none'; void sp.offsetWidth; sp.style.animation=''; }
function updateHud(){
  setTxt('money',fmt(S.money)); $('#money').parentElement.classList.toggle('neg',S.money<0);
  setTxt('clock',hhmm(S.t)); setTxt('daylbl','Ngày '+day());
  const h=hour(); setHtml('dayicon',ICON(h<5.5||h>=19?'moon':h<7||h>=17.5?'sunrise':'sun',22));
  setHtml('rush',isRush(h)?ICON('fire',18):'');
  setTxt('lvl',S.level); const a=LEVEL_XP[S.level-1]||0, b=LEVEL_XP[S.level]||a+1; $('#xpbar').style.width=clamp((S.xp-a)/(b-a)*100,0,100).toFixed(1)+'%';
  setTxt('sat',Math.round(S.sat)+'%'); setHtml('satface',ICON(faceOf(S.sat),24));
  let pax=0; for(const x of S.buses) pax+=x.l; setTxt('paxnow',pax);
  setHtml('wxic',ICON(WX[wxNow()].ic,24));
  const u=(S.unread||0); setHtml('belldot',u?`<i>${u>9?'9+':u}</i>`:'');
  const pc=pendingClaims()+(S.contracts.offers.length?1:0); setHtml('moredot',pc?'<i></i>':'');
  const br=S.buses.some(b=>b.st==='broken'); setHtml('fleetdot',br?'<i class="r"></i>':'');
  const cg=$('#cabgo'), sb=sheetCtx&&sheetCtx.t==='bus'&&S.buses.find(x=>x.id===sheetCtx.id), okb=sb&&sb.r&&sb.st!=='maint'&&sb.st!=='repair';
  if(cg){ cg.classList.toggle('hidden',!okb||!!cab); if(okb) { cg.dataset.cab=sb.id+':driver'; setTxt('cabgoid','#'+sb.id); } }
  svcPill();
  const ev=$('#event'); if(S.event){ setHtml('event',ICON(evIcon(S.event),22)+'<span>'+esc(S.event.txt)+'</span>'); ev.classList.remove('hidden'); } else ev.classList.add('hidden');
}
/* ---------- WebAudio: âm thanh tự tạo bằng code ---------- */
let AC=null, master=null, musicTimer=null, musicBus=null, lastSfx={};
function audioInit(){ if(AC) { if(AC.state==='suspended') AC.resume(); return; } try{ AC=new (window.AudioContext||window.webkitAudioContext)(); master=AC.createGain(); master.gain.value=.5; master.connect(AC.destination); if(S.opt.music) startMusic(); }catch(e){ AC=null; } }
function tone(f,t0,dur,type='sine',vol=.2,dest=master,slide){ const o=AC.createOscillator(),g=AC.createGain(); o.type=type; o.frequency.setValueAtTime(f,t0); if(slide) o.frequency.exponentialRampToValueAtTime(slide,t0+dur);
  g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(vol,t0+.01); g.gain.exponentialRampToValueAtTime(.0001,t0+dur); o.connect(g); g.connect(dest); o.start(t0); o.stop(t0+dur+.02); }
function sfx(n){ if(!AC||!S||!S.opt.sfx) return; const now=performance.now(); if(now-(lastSfx[n]||0)<120) return; lastSfx[n]=now; const t=AC.currentTime;
  if(n==='coin'){ tone(988,t,.08,'square',.06); tone(1319,t+.07,.18,'square',.06); }
  else if(n==='click'){ tone(660,t,.05,'triangle',.12); }
  else if(n==='buy'||n==='good'){ tone(523,t,.12,'triangle',.15); tone(659,t+.09,.12,'triangle',.15); tone(784,t+.18,.22,'triangle',.15); }
  else if(n==='level'){ [523,659,784,1047].forEach((f,i)=>tone(f,t+i*.1,.3,'triangle',.16)); tone(1568,t+.42,.5,'sine',.08); }
  else if(n==='chime'){ tone(1175,t,.9,'sine',.13); tone(1568,t,.5,'sine',.04); tone(880,t+.38,1.2,'sine',.13); tone(1175,t+.38,.6,'sine',.04); }
  else if(n==='bad'){ tone(330,t,.25,'sawtooth',.08,master,180); tone(220,t+.18,.3,'sawtooth',.07,master,110); } }
const SCALE=[0,2,4,7,9], CH=[[0,4,7],[9,12,16],[5,9,12],[7,11,14]];
function startMusic(){ if(!AC||musicTimer) return; const bus=AC.createGain(); bus.gain.value=.11; const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1800; bus.connect(lp); lp.connect(master);
  let next=AC.currentTime+.1, beat=0; const base=220*Math.pow(2,3/12);
  musicTimer=setInterval(()=>{ if(!S.opt.music){ stopMusic(); return; } while(next<AC.currentTime+.6){ const bar=Math.floor(beat/8)%4, ch=CH[bar];
      if(beat%8===0) ch.forEach(s=>tone(base/2*Math.pow(2,s/12),next,1.9,'sine',.18,bus));
      if(beat%2===0||Math.random()<.35){ const s=SCALE[Math.floor(Math.random()*5)]+(Math.random()<.4?12:0); tone(base*Math.pow(2,s/12),next,.4,'triangle',.12,bus); }
      if(beat%4===2) tone(base/4*Math.pow(2,ch[0]/12),next,.3,'sine',.25,bus);
      next+=.25; beat++; } },200); musicBus=bus; }
function stopMusic(){ if(musicTimer){ clearInterval(musicTimer); try{ musicBus&&musicBus.disconnect(); }catch(e){} musicTimer=null; } }
/* ---------- Góc nhìn trong xe (ghế tài xế / ghế khách) + Ảnh thật Mapillary ---------- */
let cab=null;
const CAB_RATE=1/30;           // chế độ "Thực tế": thời gian trong game chạy chậm 30 lần để xe trôi qua phố tự nhiên
const CAB_FOCAL=1.5;           // MapLibre fov 36.87° → tiêu cự = 1.5 × chiều cao màn hình
const XCFG=window.XB_CONFIG||{};
const rad=d=>d*Math.PI/180;
const angDiff=(a,b)=>((b-a+540)%360)-180;
function geoBrg(a,b){ return (Math.atan2((b[1]-a[1])*Math.cos(rad(a[0])),b[0]-a[0])*180/Math.PI+360)%360; }
function offLL(p,brg,m){ return [p[0]+Math.cos(rad(brg))*m/111320, p[1]+Math.sin(rad(brg))*m/(111320*Math.cos(rad(p[0])))]; }
function cabBus(){ return cab&&S.buses.find(x=>x.id===cab.id); }
function busPose(b){ const r=routeById[b.r]; if(!r) return null; const dr=r.dirs[b.dir]||r.dirs[0];
  const p=posAt(dr,b.s), q=posAt(dr,Math.min(dr.len,b.s+18)); let a=[p.lat,p.lng], c=[q.lat,q.lng];
  if(dist(a,c)<2){ const z=posAt(dr,Math.max(0,b.s-18)); c=a; a=[z.lat,z.lng]; }
  return {ll:[p.lat,p.lng],brg:geoBrg(a,c),r,dr}; }
const cabLow=()=>S.opt.fps===30;
function cabCamCfg(){ const lowp=cabLow();
  if(cab.seat==='driver') return lowp?{pitch:60,zoom:18}:{pitch:82,zoom:20.4};
  return lowp?{pitch:60,zoom:18.2}:{pitch:82.5,zoom:19.9}; }

/* ---------- Vào / ra ---------- */
function enterCab(id,seat){
  if(!mapReady) return toast('Bản đồ chưa tải xong','warn');
  const b=S.buses.find(x=>x.id===id); if(!b) return;
  if(!b.r||!routeById[b.r]) return toast('Xe đang đậu ở bãi, hãy giao tuyến trước','depot');
  if(b.st==='maint'||b.st==='repair') return toast('Xe đang ở xưởng, chưa lên xe được','wrench');
  if(b.park) return toast('Xe đang nghỉ đêm ở bãi, '+fmtH(svcS())+' chạy lại','sleep');
  if(cab){ setSeat(seat||cab.seat); return; }
  const c=map.getCenter();
  cab={id,seat:seat||'driver',saved:{center:[c.lng,c.lat],zoom:map.getZoom(),bearing:map.getBearing(),pitch:map.getPitch()},
    pos:null,brg:null,wheel:0,turn:0,spd:0,lastS:b.s,lastT:S.t,lastDir:b.dir,chime:'',slow:true,real:false,drops:[],streaks:[],wipe:0,wipePrev:0,hudT:9,phase:'',low:cabLow(),
    rq:{busy:false,at:null,brg:0,cur:null,cache:{},none:false}};
  closeSheet(); closeModal();
  const ui=$('#cab'); ui.innerHTML=cabHTML(); ui.classList.remove('hidden'); document.body.classList.add('incab');
  ['dragPan','scrollZoom','touchZoomRotate','doubleClickZoom','keyboard','boxZoom'].forEach(k=>map[k]&&map[k].disable());
  map.setMaxPitch(85); map.setMaxZoom(21);
  cabStyle(true); if(!cab.low) addBuildings();
  cabSky(true); setSeat(cab.seat,true); cabResize(); sfx('good');
  toast(cab.low?'Chế độ tiết kiệm pin: góc nhìn đơn giản, không dựng nhà 3D':'Đang ngồi trên xe #'+id+' · tuyến '+b.r,'bus');
}
function exitCab(){
  if(!cab) return; const s=cab.saved; cabStyle(false); cab=null; realHide();
  document.body.classList.remove('incab'); const ui=$('#cab'); ui.classList.add('hidden'); ui.innerHTML='';
  removeBuildings(); try{ map.setSky&&map.setSky({'sky-color':'#cfe8f3','horizon-color':'#eef2ea','fog-color':'#eef2ea','sky-horizon-blend':.5,'horizon-fog-blend':.5,'fog-ground-blend':.5,'atmosphere-blend':0}); }catch(e){}
  map.setMaxZoom(18); map.jumpTo({center:s.center,zoom:Math.min(18,s.zoom),bearing:0,pitch:0}); map.setMaxPitch(60);
  ['dragPan','scrollZoom','doubleClickZoom','keyboard','boxZoom'].forEach(k=>map[k]&&map[k].enable()); map.touchZoomRotate.enable(); map.touchZoomRotate.disableRotation();
  lastTint=''; viewDirty=true; $('#rain').getContext('2d').clearRect(0,0,innerWidth,innerHeight); rainCtx._on=0;
}
function setSeat(seat,first){ if(!cab) return; cab.seat=seat; const ui=$('#cab'); ui.className='seat-'+seat; cab.hudT=9; cab.drops=[]; cab.streaks=[];
  ui.querySelectorAll('[data-seat]').forEach(x=>x.classList.toggle('on',x.dataset.seat===seat)); if(!first) sfx('click');
  cabResize(); if(cab.real){ cab.rq.at=null; realTick(true); } }
function cabResize(){ const c=$('#cabfx'); if(!c) return; c.width=innerWidth*dpr; c.height=innerHeight*dpr; c.getContext('2d').setTransform(dpr,0,0,dpr,0,0); cab.glass=null; }
function glassRect(){ if(cab.glass) return cab.glass; const el=$('#cab .glass'); const r=el?el.getBoundingClientRect():{left:0,top:0,right:innerWidth,bottom:innerHeight*.5};
  return cab.glass={x0:r.left,y0:r.top,x1:r.right,y1:r.bottom}; }

/* ---------- Kiểu phố khi ngồi trong xe (đường nhựa, vỉa hè) ---------- */
const CAB_PAINT=[['bg','background-color','#cfc9bd'],['minor','line-color','#7d8389'],['sec-case','line-color','#bdb6aa'],['sec','line-color','#6f757b'],['maj-case','line-color','#c4bcae'],['maj','line-color','#61676d'],
  ['open-case','line-opacity',0],['open','line-opacity',.55],['net','line-opacity',0],['green','fill-color','#a9cf98'],['roadname','text-color','#ffffff'],['roadname','text-halo-color','#3f454b']];
const wideW=(a,b)=>['interpolate',['exponential',2],['zoom'],10,a,16,b,21,b*32];
const CAB_W=[['minor',wideW(1,4)],['sec-case',wideW(1.4,9)],['sec',wideW(.8,7.5)],['maj-case',wideW(1.6,12)],['maj',wideW(.9,10.5)]];
function cabStyle(on){ try{
  if(on){ cab.orig=[]; for(const [l,k,v] of CAB_PAINT.concat(CAB_W.map(([l,v])=>[l,'line-width',v]))){ if(!map.getLayer(l)) continue; cab.orig.push([l,k,map.getPaintProperty(l,k)]); map.setPaintProperty(l,k,v); }
    if(!map.getLayer('cab-mark')) map.addLayer({id:'cab-mark',type:'line',source:'omt','source-layer':'transportation',minzoom:16,filter:['in',['get','class'],['literal',['primary','secondary','tertiary','trunk']]],
      paint:{'line-color':'#f8fafc','line-width':['interpolate',['exponential',2],['zoom'],16,.6,21,6],'line-dasharray':[3,4],'line-opacity':.85}},'mask'); }
  else { for(const [l,k,v] of (cab.orig||[]).reverse()) if(map.getLayer(l)) map.setPaintProperty(l,k,v===undefined?null:v); if(map.getLayer('cab-mark')) map.removeLayer('cab-mark'); }
  }catch(e){ console.warn('cabStyle',e); } }

/* ---------- Lớp nhà 3D & bầu trời ---------- */
function addBuildings(){ if(map.getLayer('bld3d')) return; try{
  map.addLayer({id:'bld3d',type:'fill-extrusion',source:'omt','source-layer':'building',minzoom:14,
    paint:{'fill-extrusion-color':['interpolate',['linear'],['coalesce',['get','render_height'],10],4,'#eadfcb',20,'#e4cfb0',60,'#cdd7de'],
      'fill-extrusion-height':['coalesce',['get','render_height'],9],'fill-extrusion-base':['coalesce',['get','render_min_height'],0],'fill-extrusion-opacity':.92}},'mask');
  }catch(e){ console.warn('bld',e); } }
function removeBuildings(){ try{ if(map.getLayer('bld3d')) map.removeLayer('bld3d'); }catch(e){} }
function dayPhase(h){ return h<5.3||h>=19.2?'night':h<6.6?'dawn':h>=17.2?'dusk':'day'; }
const SKY={day:['#7cc4ec','#d9eef7','#eef2ea'],dawn:['#7aa3d6','#ffd9b0','#f3e2d0'],dusk:['#5a6fb5','#ffb27a','#f1c9a3'],night:['#0b1430','#2a3560','#1b2236']};
const BLD={day:'#eadfcb',dawn:'#e6cdb4',dusk:'#e5b991',night:'#5d6282'};
function cabSky(force){ const ph=dayPhase(hour())+(raining()?'-r':''); if(!force&&ph===cab.phase) return; cab.phase=ph;
  const k=ph.split('-')[0], c=SKY[k], wet=raining();
  try{ map.setSky({'sky-color':wet?(k==='night'?'#0d1426':'#7d8a99'):c[0],'horizon-color':wet?(k==='night'?'#232b45':'#aab4bf'):c[1],'fog-color':wet?(k==='night'?'#1a2032':'#b5bec8'):c[2],
    'sky-horizon-blend':.6,'horizon-fog-blend':.7,'fog-ground-blend':.35,'atmosphere-blend':0}); }catch(e){}
  if(map.getLayer('bld3d')) try{ map.setPaintProperty('bld3d','fill-extrusion-color',BLD[k]); }catch(e){}
  const t=$('#cabtint'); if(t) t.dataset.ph=k; }

/* ---------- Mỗi khung hình ---------- */
function cabFrame(dt){
  const b=cabBus(); if(!b){ exitCab(); return; }
  if(b.st==='maint'||b.st==='repair'){ toast('Xe vào xưởng, bạn đã xuống xe','wrench'); exitCab(); return; }
  if(!b.r||!routeById[b.r]||b.park){ toast(b.park?'Hết giờ chạy, xe đã về bãi nghỉ đêm':'Xe đã về bãi','depot'); exitCab(); return; }
  const P=busPose(b); if(!P) return;
  // vị trí & hướng mượt
  if(!cab.pos){ cab.pos=P.ll.slice(); cab.brg=P.brg; }
  const jump=dist(cab.pos,P.ll)>250; const kp=jump?1:1-Math.exp(-dt*9);
  cab.pos[0]+=(P.ll[0]-cab.pos[0])*kp; cab.pos[1]+=(P.ll[1]-cab.pos[1])*kp;
  const prevB=cab.brg, d=angDiff(cab.brg,P.brg); cab.brg=(cab.brg+d*(jump?1:1-Math.exp(-dt*2.6))+360)%360;
  const rate=dt>0?angDiff(prevB,cab.brg)/dt:0; cab.turn+=(rate-cab.turn)*Math.min(1,dt*4);
  cab.wheel+=(clamp(cab.turn*9,-140,140)-cab.wheel)*Math.min(1,dt*5);
  // tốc độ (km/h theo thời gian trong game)
  const gdt=S.t-cab.lastT; if(gdt>0.02){ let v=0; if(b.dir===cab.lastDir&&b.s>=cab.lastS) v=(b.s-cab.lastS)/gdt*.06; cab.lastS=b.s; cab.lastT=S.t; cab.lastDir=b.dir; cab.vT=b.st==='ok'?v:0; }
  cab.spd+=((cab.vT||0)+(cab.vT>2?Math.sin(performance.now()/900)*1.2:0)-cab.spd)*Math.min(1,dt*2.5);
  // camera
  const cc=cabCamCfg(), H=innerHeight, mpp=40075016*Math.cos(rad(cab.pos[0]))/(512*Math.pow(2,cc.zoom)), camD=CAB_FOCAL*H*mpp;
  const vb=cab.seat==='driver'?cab.brg:(cab.brg+90)%360, back=camD*Math.sin(rad(cc.pitch));
  const eye=cab.seat==='driver'?offLL(cab.pos,cab.brg,2):offLL(cab.pos,(cab.brg+90)%360,1);
  const ctr=offLL(eye,vb,back); cab.eye=eye; cab.vb=vb; cab.alt=camD*Math.cos(rad(cc.pitch));
  map.jumpTo({center:[ctr[1],ctr[0]],zoom:cc.zoom,pitch:cc.pitch,bearing:vb});
  // trạm sắp tới
  const dr=P.dr, last=b.k>=dr.si.length; const ns=last?null:dr.si[b.k]; cab.next=ns;
  if(ns!=null&&b.st==='ok'){ const rem=dr.sd[b.k]-b.s, key=b.r+':'+b.dir+':'+b.k+':'+(b.trips||0);
    if(rem<140&&rem>=0&&cab.chime!==key){ cab.chime=key; sfx('chime'); toast('Sắp tới trạm: '+D.stops[ns][0],'stop'); } }
  cab.hudT+=dt; if(cab.hudT>.3){ cab.hudT=0; cabHud(b,P); }
  const ui=$('#cab'); const w=ui.querySelector('#wheel'); if(w) w.setAttribute('transform',`rotate(${cab.wheel.toFixed(1)} 150 212)`);
  const nd=ui.querySelector('#needle'); if(nd) nd.setAttribute('transform',`rotate(${(-135+clamp(cab.spd,0,120)*2.25).toFixed(1)} 150 100)`);
  cabSky(false);
  if(cab.real) realTick(false);
}
function cabArrive(b,si,on,off){ if(!cab||cab.id!==b.id) return;
  const el=$('#cabboard'); if(!el) return; el.innerHTML=`<b>${esc(D.stops[si][0])}</b><span class="on">▲ ${on} lên</span><span class="off">▼ ${off} xuống</span>`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); clearTimeout(cab.bT); cab.bT=setTimeout(()=>el.classList.remove('show'),4200);
  if(on+off>0) sfx('click'); }
function cabTemp(b){ const r=routeById[b.r], ac=r&&S.opened[r.ref]&&S.opened[r.ref].up&&S.opened[r.ref].up.ac; if(ac||b.m==='ev') return 24+(b.l>MODELS[b.m].cap*.8?1:0);
  const h=hour(); return Math.round(27+5*Math.max(0,Math.sin((h-7)/12*Math.PI))-(raining()?3:0)+b.l/MODELS[b.m].cap*2); }
function cabHud(b,P){ const ui=$('#cab'), M=MODELS[b.m], h=hour(), w=wxNow(), ns=cab.next;
  const set=(sel,v,html)=>{ ui.querySelectorAll(sel).forEach(e=>{ if(e._v!==v){ e._v=v; html?e.innerHTML=v:e.textContent=v; } }); };
  const nm=ns!=null?D.stops[ns][0]:(D.stops[P.dr.si[P.dr.si.length-1]][0]);
  set('[data-k=ref]',P.r.ref); ui.querySelectorAll('[data-k=refbg]').forEach(e=>e.style.background=P.r.color);
  set('[data-k=next]',nm); set('[data-k=pax]',`${b.l}/${M.cap}`); set('[data-k=clock]',hhmm(S.t)); set('[data-k=wx]',ICON(WX[w].ic,30),1); set('[data-k=wxn]',WX[w].n);
  set('[data-k=spd]',String(Math.round(cab.spd)));
  set('[data-k=spax]',String(b.l)); set('[data-k=temp]',cabTemp(b)+'°C');
  const fu=ui.querySelector('#fuel'); if(fu){ const f=1-((b.km||0)%240)/240*.85; fu.setAttribute('transform',`rotate(${(-60+f*120).toFixed(0)} 236 114)`); }
  const sb=ui.querySelector('[data-k=sbar]'); if(sb) sb.style.width=Math.round(b.l/M.cap*100)+'%';
  const st=b.st==='broken'?'Xe hư · chờ cứu hộ':!activeDriver(b)?'Ngoài ca · xe đang nghỉ':b.dw>0?'Đang đón trả khách':'';
  set('[data-k=state]',st); ui.querySelector('[data-k=state]')?.classList.toggle('hidden',!st);
  set('[data-k=led]',`Tuyến ${P.r.ref} · Trạm kế tiếp: ${nm}`);
  const sp=ui.querySelector('[data-cabspeed]'); if(sp) sp.classList.toggle('on',!cab.slow);
  ui.classList.toggle('wet',raining()); ui.dataset.ph=dayPhase(h);
}

/* ---------- Vẽ thế giới (trên #fx) khi ngồi trong xe ---------- */
function cabRender(g,dt){
  const W=innerWidth,H=innerHeight, b=cabBus(); if(!b||!cab.eye) return; const night=dayPhase(hour())==='night'||(raining()&&dayPhase(hour())!=='day');
  const F=CAB_FOCAL*H, eye=cab.eye, alt=cab.alt;
  const items=[];
  const look=(ll,hgt)=>{ const dh=dist(eye,ll); const a=Math.abs(angDiff(cab.vb,geoBrg(eye,ll))); if(dh>650||a>62||dh<3) return null; const p=map.project([ll[1],ll[0]]); const d=Math.hypot(dh,alt); return {x:p.x,y:p.y,s:F/d,d}; };
  // xe khác
  for(const o of S.buses){ if(o===b||!o.r||o.st==='maint'||o.st==='repair') continue; const P=busPose(o); if(!P) continue; const q=look(P.ll); if(q) items.push({k:'bus',q,o,P}); }
  // trạm sắp tới của tuyến
  const P=busPose(b), dr=P.dr;
  for(let j=b.k;j<Math.min(dr.si.length,b.k+4);j++){ const sp=posAt(dr,dr.sd[j]), q2=posAt(dr,Math.min(dr.len,dr.sd[j]+10)), hb=geoBrg([sp.lat,sp.lng],[q2.lat,q2.lng]);
    const ll=offLL([sp.lat,sp.lng],hb+90,7); const q=look(ll); if(q) items.push({k:'stop',q,si:dr.si[j],ref:P.r.ref,col:P.r.color}); }
  // đèn đường dọc tuyến
  for(let s=Math.floor(b.s/60)*60+60;s<b.s+520&&s<dr.len;s+=60){ const sp=posAt(dr,s), q2=posAt(dr,Math.min(dr.len,s+8)), hb=geoBrg([sp.lat,sp.lng],[q2.lat,q2.lng]);
    for(const side of [-1,1]){ const q=look(offLL([sp.lat,sp.lng],hb+90*side,9)); if(q) items.push({k:'lamp',q}); } }
  items.sort((a,c)=>c.q.d-a.q.d);
  for(const it of items){ const {x,y,s}=it.q; if(s<.15) continue;
    if(it.k==='lamp'){ const ph=7.5*s; g.strokeStyle=night?'#39404f':'rgba(100,116,139,.75)'; g.lineWidth=Math.max(1,.14*s); g.beginPath(); g.moveTo(x,y); g.lineTo(x,y-ph); g.stroke();
      if(night){ const r=Math.max(6,2.6*s); const gr=g.createRadialGradient(x,y-ph,0,x,y-ph,r); gr.addColorStop(0,'rgba(255,226,150,.95)'); gr.addColorStop(.25,'rgba(255,200,110,.5)'); gr.addColorStop(1,'rgba(255,190,90,0)'); g.fillStyle=gr; g.fillRect(x-r,y-ph-r,2*r,2*r);
        const gp=g.createRadialGradient(x,y,0,x,y,r*1.6); gp.addColorStop(0,'rgba(255,210,120,.28)'); gp.addColorStop(1,'rgba(255,210,120,0)'); g.fillStyle=gp; g.fillRect(x-r*1.6,y-r*.6,r*3.2,r*1.2); }
      else { g.fillStyle='#cbd5e1'; g.fillRect(x-.5*s,y-ph-.15*s,1*s,.3*s); } continue; }
    if(it.k==='stop'){ const ph=2.9*s, sw=.9*s, sh=1.1*s; g.fillStyle='#64748b'; g.fillRect(x-.05*s,y-ph,Math.max(1.5,.1*s),ph);
      g.fillStyle='#fff'; g.beginPath(); g.roundRect(x-sw/2-.06*s,y-ph-sh-.06*s,sw+.12*s,sh+.12*s,.12*s); g.fill();
      g.fillStyle='#1d4ed8'; g.beginPath(); g.roundRect(x-sw/2,y-ph-sh,sw,sh,.1*s); g.fill();
      if(s>14){ g.fillStyle='#fff'; g.textAlign='center'; g.textBaseline='middle'; g.font=`900 ${(.3*s).toFixed(0)}px system-ui,sans-serif`; g.fillText(it.ref,x,y-ph-sh*.76);
        g.fillRect(x-.25*s,y-ph-sh*.5,.5*s,.24*s); g.fillStyle='#1d4ed8'; g.fillRect(x-.2*s,y-ph-sh*.47,.4*s,.08*s);
        if(s>28){ g.fillStyle='#fff'; g.font=`700 ${(.11*s).toFixed(0)}px system-ui,sans-serif`; g.fillText(D.stops[it.si][0].slice(0,18),x,y-ph-sh*.14); } }
      if(s>8){ const nm=D.stops[it.si][0]; g.font=`800 ${clamp(.32*s,10,15).toFixed(0)}px system-ui,sans-serif`; g.textAlign='center'; const tw=g.measureText(nm).width+12;
        g.fillStyle='rgba(15,23,42,.72)'; g.beginPath(); g.roundRect(x-tw/2,y-ph-sh-22-.2*s,tw,18,9); g.fill(); g.fillStyle='#fff'; g.textBaseline='middle'; g.fillText(nm,x,y-ph-sh-13-.2*s); }
      continue; }
    if(it.k==='bus'){ const o=it.o, M=MODELS[o.m], same=Math.abs(angDiff(cab.vb,it.P.brg))<90, bw=2.5*s, bh=(o.m==='dd'?4.2:3.1)*s, col=o.color||M.color;
      g.fillStyle='rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x,y,bw*.6,.25*s,0,0,6.283); g.fill();
      g.fillStyle=col; g.beginPath(); g.roundRect(x-bw/2,y-bh,bw,bh*.95,.3*s); g.fill();
      g.fillStyle='rgba(20,30,45,.85)'; g.beginPath(); g.roundRect(x-bw*.42,y-bh*.86,bw*.84,bh*.42,.15*s); g.fill();
      g.fillStyle='#111'; g.fillRect(x-bw*.32,y-bh*.99,bw*.64,bh*.1); g.fillStyle='#fbbf24'; g.textAlign='center'; g.textBaseline='middle'; if(s>6){ g.font=`900 ${(.26*s).toFixed(0)}px system-ui`; g.fillText(o.r,x,y-bh*.94); }
      const lc=same?(night?'#ff3b3b':'#ef4444'):(night?'#fff7d6':'#fde68a'); g.fillStyle=lc;
      g.beginPath(); g.arc(x-bw*.38,y-bh*.2,.13*s,0,6.283); g.arc(x+bw*.38,y-bh*.2,.13*s,0,6.283); g.fill();
      if(night){ for(const sx of [-1,1]){ const gr=g.createRadialGradient(x+sx*bw*.38,y-bh*.2,0,x+sx*bw*.38,y-bh*.2,.9*s); gr.addColorStop(0,same?'rgba(255,60,60,.6)':'rgba(255,245,200,.7)'); gr.addColorStop(1,'rgba(255,80,80,0)'); g.fillStyle=gr; g.fillRect(x+sx*bw*.38-.9*s,y-bh*.2-.9*s,1.8*s,1.8*s); } } }
  }
  g.textBaseline='alphabetic';
  cabGlass(dt,night);
}
/* kính: mưa đọng, cần gạt, đèn pha */
function cabGlass(dt,night){
  const c=$('#cabfx'); if(!c) return; const g=c.getContext('2d'), W=innerWidth,H=innerHeight; g.clearRect(0,0,W,H);
  const R=glassRect(), gw=R.x1-R.x0, gh=R.y1-R.y0, drv=cab.seat==='driver';
  g.save(); g.beginPath(); g.rect(R.x0,R.y0,gw,gh); g.clip();
  if(drv&&night){ const cx=R.x0+gw*.5, cy=R.y1; const gr=g.createRadialGradient(cx,cy,10,cx,cy,gh*.9); gr.addColorStop(0,'rgba(255,236,170,.32)'); gr.addColorStop(.6,'rgba(255,230,160,.10)'); gr.addColorStop(1,'rgba(255,230,160,0)');
    g.fillStyle=gr; g.beginPath(); g.moveTo(cx-gw*.12,cy); g.lineTo(R.x0-gw*.2,R.y0+gh*.45); g.lineTo(R.x1+gw*.2,R.y0+gh*.45); g.lineTo(cx+gw*.12,cy); g.fill(); }
  if(raining()){ const storm=wxNow()==='storm', D_=cab.drops, n=storm?160:95;
    for(let i=0;i<(storm?5:3);i++) if(D_.length<n&&Math.random()<.6) D_.push({x:R.x0+Math.random()*gw,y:R.y0+Math.random()*gh,r:1+Math.random()*(drv?2.6:3.4),v:0});
    // vệt nước chảy (ghế khách) / gió tạt (ghế tài xế)
    for(const d of D_){ if(d.r>3.2||Math.random()<.002){ d.v+=dt*(drv?18:40); } d.y+=d.v*dt; if(!drv) d.x-=dt*d.v*.15; }
    for(let i=D_.length-1;i>=0;i--) if(D_[i].y>R.y1+6) D_.splice(i,1);
    // cần gạt
    if(drv){ cab.wipePrev=cab.wipe; cab.wt=(cab.wt||0)+dt*(storm?1.5:1); const ph=1-Math.abs((cab.wt*.9)%2-1); cab.wipe=18+ph*144;
      const piv=[[R.x0+gw*.22,R.y1-8],[R.x0+gw*.66,R.y1-8]], L=gw*.52, a0=Math.min(cab.wipe,cab.wipePrev)-4, a1=Math.max(cab.wipe,cab.wipePrev)+4;
      for(let i=D_.length-1;i>=0;i--){ const d=D_[i]; for(const p of piv){ const dx=d.x-p[0],dy=p[1]-d.y, ang=Math.atan2(dy,-dx)*180/Math.PI; if(Math.hypot(dx,dy)<L&&ang>=180-a1&&ang<=180-a0){ D_.splice(i,1); break; } } }
      // vẽ giọt
      cabDrawDrops(g,D_,night);
      g.strokeStyle='#15191c'; g.lineCap='round';
      for(const p of piv){ const a=rad(180-cab.wipe), ex=p[0]+Math.cos(a)*L*-1, ey=p[1]-Math.sin(a)*L; g.lineWidth=5; g.beginPath(); g.moveTo(p[0],p[1]); g.lineTo(ex,ey); g.stroke(); g.lineWidth=2; g.strokeStyle='#2b3237'; g.beginPath(); g.moveTo(p[0]+(ex-p[0])*.35,p[1]+(ey-p[1])*.35); g.lineTo(ex,ey); g.stroke(); g.strokeStyle='#15191c'; }
    } else cabDrawDrops(g,D_,night);
    // mưa rơi bên ngoài
    g.strokeStyle=night?'rgba(170,190,230,.35)':'rgba(220,230,245,.45)'; g.lineWidth=1; g.beginPath(); const t=performance.now()/1000;
    for(let i=0;i<(storm?70:40);i++){ const dx=(i*97.13%1), dy=((i*0.6180339+t*(1.2+(i%5)*.15))%1); const x=R.x0+dx*gw, y=R.y0+dy*gh; g.moveTo(x,y); g.lineTo(x-2,y+11); } g.stroke();
    if(storm&&Math.random()<.003){ g.fillStyle='rgba(255,255,255,.4)'; g.fillRect(R.x0,R.y0,gw,gh); }
  } else if(cab.drops.length) cab.drops.length=0;
  g.restore();
}
function cabDrawDrops(g,D_,night){ for(const d of D_){ g.beginPath(); g.ellipse(d.x,d.y,d.r,d.r*(d.v>0?1.6:1.1),0,0,6.283);
  g.fillStyle=night?'rgba(150,170,210,.22)':'rgba(230,240,255,.28)'; g.fill(); g.lineWidth=.8; g.strokeStyle=night?'rgba(255,220,160,.35)':'rgba(255,255,255,.55)'; g.stroke();
  if(d.v>0){ g.strokeStyle=night?'rgba(150,170,210,.18)':'rgba(230,240,255,.22)'; g.lineWidth=d.r*.8; g.beginPath(); g.moveTo(d.x,d.y-d.r*5); g.lineTo(d.x,d.y); g.stroke(); } } }

/* ---------- Ảnh thật (Mapillary) ---------- */
const MLY_FIELDS='id,thumb_1024_url,computed_compass_angle,compass_angle,geometry,is_pano,creator';
async function mlyFetch(b4,depth){ const tk=XCFG.mapillaryToken;
  const url=`https://graph.mapillary.com/images?access_token=${encodeURIComponent(tk)}&fields=${MLY_FIELDS}&bbox=${b4.map(v=>v.toFixed(5)).join(',')}&limit=60`;
  const ctl=new AbortController(), to=setTimeout(()=>ctl.abort(),15000);
  try{ const j=await (await fetch(url,{signal:ctl.signal})).json(); clearTimeout(to);
    if(j.data) return j.data.filter(x=>!x.is_pano&&x.thumb_1024_url&&x.geometry);
    if(j.error&&depth<2){ const [w,s,e,n]=b4, mx=(w+e)/2, my=(s+n)/2; const parts=await Promise.all([[w,s,mx,my],[mx,s,e,my],[w,my,mx,n],[mx,my,e,n]].map(q=>mlyFetch(q,depth+1))); return parts.flat(); }
    return []; }catch(e){ clearTimeout(to); return null; } }
function mlyCell(ll){ const k=Math.floor(ll[0]/.0012)+':'+Math.floor(ll[1]/.0012); const rq=cab.rq;
  if(rq.cache[k]) return rq.cache[k]; const la=Math.floor(ll[0]/.0012)*.0012, ln=Math.floor(ll[1]/.0012)*.0012;
  return rq.cache[k]=mlyFetch([ln,la,ln+.0012,la+.0012],0).then(r=>{ if(r===null) delete rq.cache[k]; return r||[]; }); }
async function realTick(force){
  const rq=cab.rq; if(rq.busy||!cab.eye) return; const now=performance.now(); if(!force&&now-(rq.t||0)<1200) return; rq.t=now;
  const vb=cab.vb, tgt=cab.seat==='driver'?offLL(cab.eye,vb,12):offLL(cab.eye,vb,4);
  if(!force&&rq.at&&dist(rq.at,tgt)<14&&Math.abs(angDiff(rq.brg,vb))<20) return;
  rq.busy=true; rq.at=tgt; rq.brg=vb; const myCab=cab;
  try{ const cells=new Set([0,1,2,3].map(i=>{ const o=offLL(tgt,i*90+45,45); return Math.floor(o[0]/.0012)+':'+Math.floor(o[1]/.0012)+'|'+o[0]+'|'+o[1]; }));
    const lists=await Promise.all([...cells].map(c=>{ const [, a, b2]=c.split('|'); return mlyCell([+a,+b2]); }));
    if(cab!==myCab||!cab.real) return;
    let best=null,bs=1e9; for(const im of lists.flat()){ const p=[im.geometry.coordinates[1],im.geometry.coordinates[0]], dd=dist(p,tgt); const ca=im.computed_compass_angle??im.compass_angle; if(ca==null) continue;
      const ad=Math.abs(angDiff(ca,vb)); if(dd>70||ad>55) continue; const sc=dd+ad*.9; if(sc<bs){ bs=sc; best=im; } }
    if(!best){ realNone(true); return; }
    realNone(false); if(rq.cur===best.id) return; rq.cur=best.id;
    await new Promise(res=>{ const im=new Image(); im.crossOrigin='anonymous'; im.onload=()=>{ if(cab===myCab&&cab.real) realShow(im.src,best); res(); }; im.onerror=res; im.src=best.thumb_1024_url; });
  } finally { rq.busy=false; } }
function realShow(src,meta){ const box=$('#cabreal'); if(!box) return; const imgs=box.querySelectorAll('img'); const cur=box.querySelector('img.on')||imgs[0], nx=cur===imgs[0]?imgs[1]:imgs[0];
  nx.src=src; nx.classList.add('on'); cur.classList.remove('on'); box.classList.add('show');
  const cr=$('#cabreal .mcred'); if(cr) cr.innerHTML=`Ảnh: © ${esc(meta.creator&&meta.creator.username||'Mapillary')} · <a href="https://www.mapillary.com/app/?pKey=${esc(meta.id)}" target="_blank" rel="noopener">Mapillary</a> · CC BY-SA`; }
function realNone(v){ if(!cab) return; cab.rq.none=v; const box=$('#cabreal'); if(!box) return; box.classList.toggle('show',!v); const n=$('#cab .mnone'); if(n) n.classList.toggle('hidden',!v); }
function realHide(){ const box=$('#cabreal'); if(box){ box.classList.remove('show'); box.querySelectorAll('img').forEach(i=>{ i.classList.remove('on'); i.removeAttribute('src'); }); } }
function toggleReal(){ if(!cab) return;
  if(!XCFG.mapillaryToken) return toast('Chưa cấu hình mã Mapillary nên chưa xem được ảnh thật','warn');
  cab.real=!cab.real; $('#cab [data-cabreal]').classList.toggle('on',cab.real);
  if(cab.real){ cab.rq.cur=null; cab.rq.at=null; toast('Ảnh thật từ Mapillary: ảnh chụp đường phố gần xe nhất, đổi theo xe chạy','info'); realTick(true); }
  else { realHide(); realNone(false); $('#cab .mnone').classList.add('hidden'); } }

/* ---------- Giao diện cabin (SVG/CSS tự vẽ) ---------- */
const CI={
 seat:`<svg viewBox="0 0 48 48" width="44" height="44"><path d="M15 6h9a3 3 0 0 1 3 3v16h9a4 4 0 0 1 4 4v9H16a4 4 0 0 1-4-4V9a3 3 0 0 1 3-3z" fill="currentColor"/><rect x="10" y="40" width="30" height="4" rx="2" fill="currentColor"/><circle cx="34" cy="12" r="5" fill="currentColor" opacity=".9"/></svg>`,
 pass:`<svg viewBox="0 0 48 48" width="44" height="44"><circle cx="24" cy="8" r="5" fill="currentColor"/><path d="M18 16h10l2 14h8v4H27l-2-10h-4v8h-6z" fill="currentColor"/><path d="M12 22v16h22" stroke="currentColor" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M16 38v6M32 38v6" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>`,
 wheel:`<svg viewBox="0 0 48 48" width="44" height="44"><circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="24" cy="26" r="5" fill="currentColor"/><path d="M7 22c6-3 28-3 34 0M24 31v11" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`,
 exit:`<svg viewBox="0 0 48 48" width="44" height="44"><path d="M20 6H9v36h11" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linejoin="round"/><path d="M18 24h22M32 15l9 9-9 9" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
 clock:`<svg viewBox="0 0 24 24" width="30" height="30"><circle cx="12" cy="12" r="9.5" fill="currentColor" fill-opacity=".1" stroke="currentColor" stroke-width="2.2"/><path d="M12 6.5V12l3.6 2.2" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`,
 cam:`<svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 7h3l1.6-2h6.8L17 7h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 7z" fill="currentColor"/><circle cx="12" cy="12.8" r="3.6" fill="#0f172a" stroke="#fff" stroke-width="1.4"/></svg>`,
 fast:`<svg viewBox="0 0 24 24" width="18" height="18"><path d="M3 6l8 6-8 6zM12 6l8 6-8 6z" fill="currentColor"/></svg>`,
 pin:`<svg viewBox="0 0 24 24" width="26" height="26"><path d="M12 22s-7-7.2-7-12a7 7 0 0 1 14 0c0 4.8-7 12-7 12z" fill="#ea580c"/><circle cx="12" cy="10" r="2.8" fill="#fff"/></svg>`,
};
function dashSVG(){
  const cx=150,cy=100,r=52, fx=236,fy=114; let ticks='',nums='';
  for(let v=0;v<=120;v+=5){ const a=rad(-135+v*2.25), big=v%20===0, r1=big?r-10:r-5; ticks+=`<line x1="${(cx+Math.sin(a)*r1).toFixed(1)}" y1="${(cy-Math.cos(a)*r1).toFixed(1)}" x2="${(cx+Math.sin(a)*(r-2)).toFixed(1)}" y2="${(cy-Math.cos(a)*(r-2)).toFixed(1)}" stroke="${v>=100?'#f97316':'#e5e7eb'}" stroke-width="${big?2.2:1.1}"/>`;
    if(v%20===0) nums+=`<text x="${(cx+Math.sin(a)*(r-19)).toFixed(1)}" y="${(cy-Math.cos(a)*(r-19)+3.5).toFixed(1)}">${v}</text>`; }
  let fticks=''; for(let i=0;i<=4;i++){ const a=rad(-60+i*30); fticks+=`<line x1="${(fx+Math.sin(a)*17).toFixed(1)}" y1="${(fy-Math.cos(a)*17).toFixed(1)}" x2="${(fx+Math.sin(a)*23).toFixed(1)}" y2="${(fy-Math.cos(a)*23).toFixed(1)}" stroke="${i===0?'#ef4444':'#e5e7eb'}" stroke-width="2"/>`; }
  const wx=150,wy=212,wr=170;
  return `<svg class="dash" viewBox="0 0 390 440" preserveAspectRatio="xMidYMin slice">
  <defs><linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4448"/><stop offset=".25" stop-color="#262d31"/><stop offset="1" stop-color="#14181b"/></linearGradient>
   <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#444d52"/><stop offset=".5" stop-color="#262c30"/><stop offset="1" stop-color="#15191c"/></linearGradient>
   <radialGradient id="gf" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#1c2328"/><stop offset="1" stop-color="#07090b"/></radialGradient>
   <radialGradient id="hub" cx=".45" cy=".35" r=".7"><stop offset="0" stop-color="#2f383d"/><stop offset="1" stop-color="#161b1e"/></radialGradient></defs>
  <path d="M0 26 Q195 0 390 26 V440 H0z" fill="url(#dg)"/><path d="M0 26 Q195 0 390 26" stroke="#59646a" stroke-width="2" fill="none"/>
  <path d="M0 32 Q195 8 390 32" stroke="#0b0e10" stroke-width="5" fill="none" opacity=".6"/>
  <g opacity=".85">${[0,1,2,3,4,5].map(i=>`<rect x="6" y="${70+i*11}" width="34" height="6" rx="3" fill="#0e1214"/>`).join('')}</g>
  <rect x="72" y="36" width="210" height="128" rx="36" fill="#0d1114" stroke="#2f383d" stroke-width="2"/>
  <circle cx="${cx}" cy="${cy}" r="${r+5}" fill="#2a3237"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#gf)" stroke="#8b969c" stroke-width="2"/>
  ${ticks}<g font-size="10" font-weight="700" fill="#e5e7eb" text-anchor="middle" font-family="system-ui,sans-serif">${nums}</g>
  <text x="${cx}" y="${cy-18}" font-size="8" fill="#9ca3af" text-anchor="middle" font-family="system-ui">km/h</text>
  <rect x="${cx-21}" y="${cy+15}" width="42" height="22" rx="5" fill="#120c05" stroke="#3b2a14"/><text data-k="spd" x="${cx}" y="${cy+32}" font-size="17" font-weight="900" fill="#fb923c" text-anchor="middle" font-family="ui-monospace,Consolas,monospace">0</text>
  <g id="needle"><path d="M${cx-2.6} ${cy} L${cx} ${cy-r+8} L${cx+2.6} ${cy}z" fill="#f97316"/></g><circle cx="${cx}" cy="${cy}" r="5" fill="#30383d" stroke="#9ca3af"/>
  <circle cx="${fx}" cy="${fy}" r="30" fill="#2a3237"/><circle cx="${fx}" cy="${fy}" r="25" fill="url(#gf)" stroke="#8b969c" stroke-width="1.6"/>${fticks}
  <text x="${fx-16}" y="${fy+15}" font-size="8" fill="#ef4444" font-weight="800" font-family="system-ui">E</text><text x="${fx+10}" y="${fy+15}" font-size="8" fill="#e5e7eb" font-weight="800" font-family="system-ui">F</text>
  <path d="M${fx-4} ${fy+12}h7v-8h-7zM${fx+3} ${fy+5}l3 2v5" fill="none" stroke="#e5e7eb" stroke-width="1.2"/>
  <g id="fuel"><path d="M${fx-1.4} ${fy} L${fx} ${fy-20} L${fx+1.4} ${fy}z" fill="#f97316"/></g><circle cx="${fx}" cy="${fy}" r="3" fill="#30383d"/>
  <rect x="206" y="150" width="12" height="8" rx="2" fill="#ea580c"/><rect x="222" y="150" width="12" height="8" rx="2" fill="#4b5563"/>
  <rect x="306" y="40" width="78" height="112" rx="10" fill="#060a08" stroke="#2f3d36" stroke-width="2"/><rect x="311" y="45" width="68" height="102" rx="6" fill="#0b2318" stroke="#22c55e" stroke-opacity=".35"/>
  <g font-family="system-ui,sans-serif" text-anchor="middle"><text x="345" y="61" font-size="8" font-weight="800" fill="#86efac">HÀNH KHÁCH</text><text data-k="spax" x="345" y="82" font-size="20" font-weight="900" fill="#ecfdf5">0</text>
  <text x="345" y="99" font-size="8" font-weight="800" fill="#86efac">NHIỆT ĐỘ</text><text data-k="temp" x="345" y="120" font-size="17" font-weight="900" fill="#ecfdf5">28°C</text></g>
  <rect x="318" y="129" width="44" height="6" rx="3" fill="#14532d"/><foreignObject x="318" y="129" width="44" height="6"><div xmlns="http://www.w3.org/1999/xhtml" class="sbarw"><i data-k="sbar"></i></div></foreignObject>
  <circle cx="370" cy="132" r="5" fill="none" stroke="#22c55e" stroke-width="1.5"/><path d="M367.7 132l1.6 1.6 3-3" stroke="#22c55e" stroke-width="1.5" fill="none"/>
  <g transform="translate(334 166)"><rect width="46" height="32" rx="7" fill="#22863a" stroke="#4ade80" stroke-width="1.5"/><path d="M13 8h20a2 2 0 0 1 2 2v10H11V10a2 2 0 0 1 2-2zM11 20h24v3H11z" fill="#fff"/><circle cx="16" cy="24" r="2" fill="#fff"/><circle cx="30" cy="24" r="2" fill="#fff"/>
   <rect y="40" width="46" height="32" rx="7" fill="#20272b" stroke="#3a454b"/><path d="M17 48h9v16h-9zM26 52l4 3v7" fill="none" stroke="#e5e7eb" stroke-width="2"/>
   <rect y="80" width="46" height="32" rx="7" fill="#20272b" stroke="#3a454b"/><path d="M16 96a7 7 0 0 1 12-5M30 96a7 7 0 0 1-12 5" fill="none" stroke="#e5e7eb" stroke-width="2"/>
   <rect y="120" width="46" height="32" rx="7" fill="#20272b" stroke="#3a454b"/><path d="M23 127l9 16H14z" fill="none" stroke="#ef4444" stroke-width="2.4" stroke-linejoin="round"/></g>
  <g id="wheel">
   <circle cx="${wx}" cy="${wy}" r="${wr}" fill="none" stroke="#0b0e10" stroke-width="34" opacity=".45"/>
   <circle cx="${wx}" cy="${wy}" r="${wr}" fill="none" stroke="url(#wg)" stroke-width="27"/><path d="M${wx-150} ${wy-80} A${wr} ${wr} 0 0 1 ${wx+150} ${wy-80}" fill="none" stroke="#5d6a72" stroke-width="2.5" opacity=".75"/>
   <path d="M${wx-160} ${wy+8} Q${wx-90} ${wy-14} ${wx-48} ${wy-6} L${wx-42} ${wy+34} Q${wx-90} ${wy+44} ${wx-158} ${wy+52}z" fill="#20272b"/>
   <path d="M${wx+160} ${wy+8} Q${wx+90} ${wy-14} ${wx+48} ${wy-6} L${wx+42} ${wy+34} Q${wx+90} ${wy+44} ${wx+158} ${wy+52}z" fill="#20272b"/>
   <path d="M${wx-26} ${wy+40} h52 l10 130 h-72z" fill="#1d2326"/>
   <circle cx="${wx}" cy="${wy+8}" r="56" fill="url(#hub)" stroke="#384349" stroke-width="3"/><circle cx="${wx}" cy="${wy+8}" r="34" fill="#14532d" stroke="#0d3b20" stroke-width="3"/>
   <path d="M${wx-4} ${wy+16}c-9-4-12-13-9-23 9 2 12 11 9 23zM${wx+3} ${wy+16}c2-12 9-19 19-19-1 10-9 17-19 19z" fill="#86efac"/><text x="${wx}" y="${wy+31}" font-size="8.5" font-weight="900" fill="#dcfce7" text-anchor="middle" font-family="system-ui">SG BUS</text>
  </g></svg>`;
}
function frameSVG(){ return `<svg class="frame" viewBox="0 0 390 520" preserveAspectRatio="none">
  <path d="M0 0 H390 V84 H0z" fill="#1b2326"/><path d="M0 84 H390" stroke="#2f3a3e" stroke-width="3"/>
  <path d="M0 84 L34 84 L44 520 L0 520z" fill="#1e272a"/><path d="M390 84 L360 84 L352 520 L390 520z" fill="#1e272a"/>
  <path d="M34 84 L44 520" stroke="#34424a" stroke-width="2"/><path d="M360 84 L352 520" stroke="#34424a" stroke-width="2"/></svg>`; }
function mirrorSVG(){ return `<svg class="mirror" viewBox="0 0 90 130"><path d="M40 20 L62 20" stroke="#222a2e" stroke-width="7"/>
  <rect x="2" y="2" width="44" height="98" rx="12" fill="#1b2225" stroke="#363f44" stroke-width="3"/><rect x="7" y="7" width="34" height="88" rx="9" fill="url(#mg)"/>
  <defs><linearGradient id="mg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9cc7e4" class="m1"/><stop offset=".55" stop-color="#c8d6de" class="m2"/><stop offset="1" stop-color="#5f6b72" class="m3"/></linearGradient></defs>
  <path d="M10 70 L38 60 L38 64 L10 76z" fill="#8a8f94" opacity=".7"/><path d="M12 14 L22 14 L12 40z" fill="#fff" opacity=".35"/></svg>`; }
function seatsSVG(){ return `<svg class="seats" viewBox="0 0 390 300" preserveAspectRatio="xMidYMax slice">
  <defs><linearGradient id="fab" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c4166"/><stop offset="1" stop-color="#18253f"/></linearGradient>
  <pattern id="fp" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 10L10 0" stroke="#3a5280" stroke-width="1" opacity=".5"/></pattern></defs>
  <rect x="0" y="40" width="390" height="260" fill="#173634"/><path d="M0 52 H390" stroke="#1f4a47" stroke-width="5"/>
  <g><path d="M-30 70 q0-26 26-26 h70 q26 0 26 26 v170 h-122z" fill="#d97706"/><path d="M-22 78 q0-22 22-22 h58 q22 0 22 22 v160 h-102z" fill="url(#fab)"/><path d="M-22 78 q0-22 22-22 h58 q22 0 22 22 v160 h-102z" fill="url(#fp)"/></g>
  <g><path d="M110 56 q0-26 26-26 h70 q26 0 26 26 v150 h-122z" fill="#c2620d"/><path d="M118 64 q0-22 22-22 h58 q22 0 22 22 v140 h-102z" fill="url(#fab)"/><path d="M118 64 q0-22 22-22 h58 q22 0 22 22 v140 h-102z" fill="url(#fp)"/>
   <path d="M100 200 h150 q14 0 14 14 v26 h-178 v-26 q0-14 14-14z" fill="#1d2d4d"/></g>
  <g><path d="M330 80 q0-20 20-20 h60 v200 h-80z" fill="#c2620d"/><path d="M338 86 q0-16 16-16 h56 v190 h-72z" fill="url(#fab)"/></g>
  <path d="M300 40 L390 -10" stroke="#3a8f6a" stroke-width="10" stroke-linecap="round"/><path d="M300 40 L300 180" stroke="#3a8f6a" stroke-width="10" stroke-linecap="round"/></svg>`; }
function cabHTML(){
  return `<div id="cabreal"><img alt=""><img alt=""><div class="mcred"></div></div>
  <div id="cabtint"></div><canvas id="cabfx"></canvas>
  <div class="drv-only">${frameSVG()}${mirrorSVG()}<div class="charm"><i></i><b></b></div>${dashSVG()}</div>
  <div class="pas-only"><div class="win"></div><div class="ceil"><i></i></div><div class="pole"></div><div class="rail"></div>${seatsSVG()}<div class="brand">${ICON('shelter',26)}<span><b>XE BUÝT SÀI GÒN</b><small>AN TOÀN · THÔNG MINH · THÂN THIỆN</small></span></div></div>
  <div class="glass"></div>
  <div class="ctop d-only"><div class="cref" data-k="refbg"><span data-k="ref">--</span></div><div class="ccard grow">${CI.pin}<span><small>Trạm kế tiếp:</small><b data-k="next">…</b></span></div>
    <div class="ccard c2">${ICON('people',28)}<span><b data-k="pax">0/0</b><small>Hành khách</small></span></div><div class="ccard c3">${CI.clock}<span><b data-k="clock">--:--</b><small>Thời tiết</small></span><i data-k="wx"></i></div></div>
  <div class="ptop p-only"><div class="led-ic">≡</div><div class="led"><span data-k="led"></span></div><div class="sig"><svg viewBox="0 0 60 16" width="60" height="16"><path d="M2 6a10 10 0 0 1 14 0M5 9a6 6 0 0 1 8 0" stroke="#fff" stroke-width="1.8" fill="none"/><circle cx="9" cy="12" r="1.6" fill="#fff"/><rect x="22" y="3" width="18" height="10" rx="2" fill="none" stroke="#fff" stroke-width="1.4"/><rect x="24" y="5" width="12" height="6" fill="#22c55e"/><path d="M46 13v-3M50 13v-6M54 13v-9M58 13v-11" stroke="#fff" stroke-width="2"/></svg></div></div>
  <div class="pcards p-only"><div class="pc l">${ICON('people',30)}<span><b data-k="pax">0/0</b><small>Hành khách <i class="gdot"></i></small></span></div>
    <div class="pc r">${CI.clock}<span><b data-k="clock">--:--</b><small>Thời gian</small></span></div><div class="pc r2"><i data-k="wx"></i><span><b data-k="wxn">Nắng</b></span></div></div>
  <div class="ctools"><button data-cabreal>${CI.cam}<span>Ảnh thật</span></button><button data-cabspeed>${CI.fast}<span>Tua nhanh</span></button></div>
  <div class="mnone hidden">Đoạn này chưa có ảnh thật trên Mapillary · đang hiện 3D</div>
  <div class="cstate hidden" data-k="state"></div>
  <div id="cabboard"></div>
  <div class="cbtns"><button data-seat="driver">${cab&&cab.seat==='passenger'?CI.wheel:CI.seat}<span>Ghế tài xế</span></button><button data-seat="passenger">${CI.pass}<span>Ghế khách</span></button><button data-cabexit>${CI.exit}<span>Thoát</span></button></div>
  <div class="cattr">© OpenFreeMap © OpenMapTiles © OpenStreetMap</div>`;
}
function bindCab(){ const ui=$('#cab');
  ui.addEventListener('click',e=>{ const t=e.target.closest('[data-seat],[data-cabexit],[data-cabreal],[data-cabspeed]'); if(!t) return; e.stopPropagation(); const ds=t.dataset;
    if(ds.seat){ setSeat(ds.seat); const btn=ui.querySelector('[data-seat=driver]'); btn.innerHTML=(ds.seat==='passenger'?CI.wheel:CI.seat)+'<span>Ghế tài xế</span>'; }
    else if(ds.cabexit!==undefined){ sfx('click'); exitCab(); }
    else if(ds.cabreal!==undefined){ sfx('click'); toggleReal(); }
    else if(ds.cabspeed!==undefined){ sfx('click'); cab.slow=!cab.slow; toast(cab.slow?'Thời gian chạy chậm cho giống thật':'Tua nhanh: thời gian chạy như ngoài bản đồ','fast'); cabHud(cabBus(),busPose(cabBus())); } });
  addEventListener('resize',()=>{ if(cab) cabResize(); });
}
/* ---------- Events ---------- */
function bindUI(){
  document.querySelectorAll('[data-ic]').forEach(el=>el.insertAdjacentHTML('afterbegin',ICON(el.dataset.ic,+el.dataset.s||24)));
  document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
  document.querySelectorAll('.speed button').forEach(b=>b.onclick=()=>{ speedMul=+b.dataset.sp; document.querySelectorAll('.speed button').forEach(x=>x.classList.toggle('on',x===b)); });
  $('#satpill').onclick=()=>{ setTab('map',true); renderSat(); };
  $('#wxbtn').onclick=()=>{ setTab('more',true); sub.more='weather'; renderMore(); };
  $('#bellbtn').onclick=()=>{ setTab('more',true); sub.more='notes'; renderMore(); };
  $('#ticker').onclick=()=>{ setTab('more',true); sub.more='notes'; renderMore(); };
  $('#zin').onclick=()=>map.zoomIn(); $('#zout').onclick=()=>map.zoomOut(); $('#zhome').onclick=()=>fitOpen();
  addEventListener('pointerdown',audioInit,{passive:true});
  document.body.addEventListener('click',e=>{
    const t=e.target.closest('[data-open],[data-theme],[data-route],[data-buy],[data-sell],[data-shelter],[data-close],[data-tutnext],[data-tutskip],[data-tut],[data-reset],[data-saveg],[data-f],[data-assignidle],[data-close-route],[data-fare],[data-sub],[data-bus],[data-tow],[data-maint],[data-maintall],[data-livery],[data-hire],[data-fire],[data-unassign],[data-depot],[data-goto],[data-up],[data-borrow],[data-repay],[data-claim],[data-accept],[data-opt],[data-fs],[data-create],[data-ccancel],[data-cundo],[data-cdone],[data-cok],[data-stop],[data-cab],[data-su],[data-bulk],[data-du],[data-fitroute],[data-jump]');
    if(!t||t.disabled) return; const ds=t.dataset; if(t.tagName==='BUTTON') sfx('click');
    if(ds.open!==undefined){ e.stopPropagation(); openRoute(ds.open); }
    else if(ds.tow){ e.stopPropagation(); const b=S.buses.find(x=>x.id===+ds.tow); if(b){ towBus(b,false); refreshSheet(); } }
    else if(ds.buy) buyBus(ds.buy); else if(ds.sell){ if(confirm('Bán xe #'+ds.sell+'?')) sellBus(+ds.sell); } else if(ds.shelter) buildShelter(+ds.shelter);
    else if(ds.close!==undefined) closeModal(); else if(ds.tutnext) showTut(+ds.tutnext); else if(ds.tutskip!==undefined) showTut(99); else if(ds.tut!==undefined) showTut(0);
    else if(ds.saveg!==undefined){ save(); toast('Đã lưu','save'); }
    else if(ds.reset!==undefined){ if(confirm('Xóa toàn bộ tiến trình và chơi lại?')){ localStorage.removeItem(SAVE_KEY); location.reload(); } }
    else if(ds.f){ routeFilter=ds.f; renderRoutes(); }
    else if(ds.fare) setFare(+ds.fare);
    else if(ds.sub!==undefined){ const [k,v]=ds.sub.split(':'); sub[k]=v||null; if(k==='more') renderMore(); else if(k==='fleet'){ if(curTab!=='fleet') setTab('fleet',true); renderFleet(); } else renderFinance(); }
    else if(ds.assignidle){ S.buses.filter(b=>!b.r).forEach(b=>assign(b,ds.assignidle,true)); toast('Đã giao xe cho tuyến '+ds.assignidle,'bus'); refreshSheet(); }
    else if(ds.closeRoute){ if(confirm('Đóng tuyến '+ds.closeRoute+'? Xe sẽ về bãi.')) closeRoute(ds.closeRoute); }
    else if(ds.maint){ const b=S.buses.find(x=>x.id===+ds.maint); if(b){ startMaint(b,false); save(); refreshSheet(); checkMissionsLive(); } }
    else if(ds.maintall!==undefined){ let n=0; for(const b of S.buses) if(b.st==='ok'&&b.cond<60&&S.money>0){ startMaint(b,true); n++; } toast(n?`Đã đưa ${n} xe vào bảo dưỡng`:'Không có xe nào dưới 60%','wrench'); checkMissionsLive(); save(); refreshSheet(); }
    else if(ds.livery){ const [id,c]=ds.livery.split(':'); setLivery(+id,c||null); }
    else if(ds.hire){ const d=S.cands.find(x=>x.id===+ds.hire); if(d){ hireDriver(d); const nb=S.buses.find(b=>!busDrivers(b).length); if(nb){ d.bus=nb.id; toast(`${d.name} nhận lái xe #${nb.id}`,'driver'); } save(); refreshSheet(); } }
    else if(ds.fire){ if(confirm('Cho tài xế này nghỉ việc?')) fireDriver(+ds.fire); }
    else if(ds.unassign) assignDriver(+ds.unassign,null);
    else if(ds.depot) buyDepot(ds.depot);
    else if(ds.goto){ const [la,ln]=ds.goto.split(',').map(Number); map.flyTo({center:[ln,la],zoom:15,offset:[0,-innerHeight*.2]}); }
    else if(ds.up){ const [r,k]=ds.up.split(':'); buyUpgrade(r,k); }
    else if(ds.borrow) borrow(+ds.borrow); else if(ds.repay) repay(+ds.repay);
    else if(ds.claim!==undefined) claimMission(ds.claim==='w'?'w':+ds.claim);
    else if(ds.accept) acceptContract(ds.accept);
    else if(ds.opt){ const k=ds.opt; if(k==='fps') S.opt.fps=S.opt.fps===30?60:30; else S.opt[k]=S.opt[k]?0:1; if(k==='music'){ audioInit(); S.opt.music?startMusic():stopMusic(); } save(); renderMore(); }
    else if(ds.theme){ S.opt.theme=ds.theme; save(); renderMore(); }
    else if(ds.fs){ S.opt.fs=ds.fs; applyFs(); save(); renderMore(); }
    else if(ds.create!==undefined) startCreate();
    else if(ds.ccancel!==undefined) cancelCreate();
    else if(ds.cundo!==undefined){ if(createMode.geo){ createMode.geo=null; setPreview(null); } else createMode.stops.pop(); viewDirty=true; renderCreate(); }
    else if(ds.cdone!==undefined) finishCreate();
    else if(ds.cok!==undefined) confirmCreate();
    else if(ds.cab){ e.stopPropagation(); const [id,seat]=ds.cab.split(':'); enterCab(+id,seat||'driver'); }
    else if(ds.su){ const [si,k]=ds.su.split(':'); buyStopUp(+si,k); }
    else if(ds.bulk){ const i=ds.bulk.lastIndexOf(':'); bulkRoute(ds.bulk.slice(0,i),ds.bulk.slice(i+1)); }
    else if(ds.du){ const [id,k]=ds.du.split(':'); buyDepotUp(id,k); }
    else if(ds.fitroute){ fitWhole(ds.fitroute); }
    else if(ds.jump){ toggleSheetSize(true); setTimeout(()=>{ const el=document.getElementById(ds.jump); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); },60); }
    else if(ds.stop) showStop(+ds.stop);
    else if(ds.bus) showBus(+ds.bus);
    else if(ds.route) showRoute(ds.route);
  });
  document.body.addEventListener('change',e=>{ const s=e.target, ds=s.dataset;
    if(ds.assign){ const b=S.buses.find(x=>x.id===+ds.assign); if(b){ assign(b,s.value||null); refreshSheet(); } }
    else if(ds.svc){ S.opt[ds.svc==='start'?'svcStart':'svcEnd']=+s.value; save(); toast(`Giờ chạy: ${fmtH(svcS())} – ${svcE()>=24?'24:00':fmtH(svcE())}`,'calendar'); renderMore(); }
    else if(ds.shift) setShift(+ds.shift,s.value);
    else if(ds.drvbus) assignDriver(+ds.drvbus,s.value||null);
    else if(ds.adddrv&&s.value) assignDriver(+s.value,+ds.adddrv); });
  $('#nightskip').onclick=()=>{ sfx('click'); skipNight(); };
  $('.grab').onclick=()=>{ if($('#sheet').classList.contains('canpeek')) toggleSheetSize(); else closeSheet(); }; $('#sheetx').onclick=e=>{ e.stopPropagation(); closeSheet(); }; bindCab();
  let y0=null; $('#sheet').addEventListener('touchstart',e=>{ if($('#sheet-body').scrollTop<=0) y0=e.touches[0].clientY; },{passive:true});
  $('#sheet').addEventListener('touchmove',e=>{ if(y0===null) return; const dy=e.touches[0].clientY-y0, sh=$('#sheet');
    if(dy>70){ y0=null; if(sh.classList.contains('canpeek')&&!sh.classList.contains('peek')) toggleSheetSize(false); else closeSheet(); }
    else if(dy<-60&&sh.classList.contains('peek')){ y0=null; toggleSheetSize(true); } },{passive:true});
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) save(); }); addEventListener('pagehide',save);
}
/* ---------- Boot ---------- */
async function boot(){
  let stopmap;
  [D,boundary,stopmap]=await Promise.all([fetch('data/hcm-v3.json').then(r=>r.json()),fetch('data/hcm-boundary.json').then(r=>r.json()),fetch('data/stopmap-v1.json').then(r=>r.json()).catch(()=>null)]);
  prepData();
  const old=load(stopmap); S=old||newState(); const upgraded=!!(old&&old._needDrivers);
  for(const c of S.custom||[]) if(!routeById[c.ref]) addCustomRoute(c);
  if(S.event&&S.event.type==='rain') S.event=null;
  const pc={}; for(const b of S.buses){ if(b.r&&!routeById[b.r]) b.r=null; if(b._reset){ delete b._reset; if(b.r){ pc[b.r]=(pc[b.r]||0); placeBus(b,b.r,pc[b.r]++); } } b.dest=b.dest||{}; b.st=b.st||'ok'; if(b.cond===undefined) b.cond=90; }
  if(S._needDrivers){ for(const b of S.buses) if(!busDrivers(b).length){ const d=genDriver(); d.skill=3; d.wage=250000+3*90000; d.bus=b.id; S.drivers.push(d); } delete S._needDrivers; }
  fillForecast(); S._lastWx=wxNow();
  if(!S.missions||S.missions.day!==day()) genMissions(); if(!S.weekly) genWeekly();
  if(!S.cands.length) S.cands=[genDriver(),genDriver(),genDriver()];
  if(!S.newsQ||!S.newsQ.length) S.newsQ=['Chào mừng đến với Xe Buýt Sài Gòn! Dữ liệu tuyến và trạm lấy từ OpenStreetMap.',rnd(NEWS_FLAVOR)];
  await loadIcons();
  applyFs(); initTheme(); initMap(); fxCtx=$('#fx').getContext('2d'); rainCtx=$('#rain').getContext('2d'); resize(); addEventListener('resize',resize);
  bindUI(); updateSat(1); updateHud(); updTicker();
  $('#loading').style.opacity=0; setTimeout(()=>$('#loading').remove(),500);
  if(!S.seen.tut) showTut(0); else if(upgraded||!S.seen.v3) showWhatsNew();
  if(S.seen.tut&&S.seen.v3&&!S.seen.v4) setTimeout(()=>notify('Mới: Góc nhìn trong xe! Chọn một xe buýt rồi bấm "Vào xe" để ngồi ghế tài xế hoặc ghế khách','bus'),1500);
  if(S.seen.tut&&S.seen.v4&&!S.seen.v5) setTimeout(()=>notify('Mới: Ô nâng cấp trạm (mái che, ghế, bảng điện tử, đèn, cây xanh, vịnh đỗ), nâng cấp bãi xe, và chọn tuyến không còn tự thu nhỏ bản đồ','up'),1800);
  if(S.seen.tut&&S.seen.v5&&!S.seen.v6) setTimeout(()=>notify('Mới: Giờ chạy xe 4:30 – 22:00. Hết giờ xe ngừng đón khách và về bãi nghỉ đêm; chỉnh giờ trong Thêm › Cài đặt','moon'),2100);
  if(S.seen.tut&&S.seen.v6&&!S.seen.v7) setTimeout(()=>notify('Mới: Đồ hoạ riêng! Ban ngày bản đồ giấy Sài Gòn xưa, ban đêm tự chuyển sang neon. Chọn kiểu trong Thêm › Cài đặt','palette'),2300);
  S.seen.v3=1; S.seen.v4=1; S.seen.v5=1; S.seen.v6=1; S.seen.v7=1; save();
  setInterval(save,10000);
  window.__game={get S(){return S;},D,MODELS,step,openRoute,buyBus,routeById,breakdown,newDay,hourly,startCreate,createToggle,enterCab,exitCab,inService,skipNight,applyTheme,get TH(){return TH;},showBus,save,buyStopUp,bulkRoute,buyDepotUp,showRoute,showStop,setSeat,toggleReal,get cab(){return cab;},finishCreate,confirmCreate,get map(){return map;}};
  requestAnimationFrame(frame);
}
boot().catch(e=>{ const p=$('#loading p'); if(p) p.textContent='Lỗi tải game: '+e.message; console.error(e); });
})();
