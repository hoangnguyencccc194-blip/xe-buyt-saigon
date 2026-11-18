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
  {k:'wait',n:'Thời gian chờ',ic:'stop',w:.17,tip:'Thêm xe cho tuyến để khách không phải chờ lâu ở trạm.'},
  {k:'freq',n:'Tần suất chuyến',ic:'calendar',w:.13,tip:'Tuyến dài cần nhiều xe và đủ tài xế cả hai ca.'},
  {k:'crowd',n:'Độ chật trên xe',ic:'people',w:.15,tip:'Xe quá tải: dùng xe lớn hơn (CNG, 2 tầng) hoặc thêm xe.'},
  {k:'comfort',n:'Tiện nghi xe',ic:'bus',w:.12,tip:'Xe điện, máy lạnh & wifi và tài xế giỏi làm khách vui hơn.'},
  {k:'shelter',n:'Mái che trạm',ic:'shelter',w:.10,tip:'Bấm vào trạm đông khách để xây mái che.'},
  {k:'weather',n:'Mưa & kẹt xe',ic:'rain',w:.10,tip:'Mái che và làn xe buýt riêng giúp khách đỡ bực khi mưa, kẹt xe.'},
  {k:'fare',n:'Giá vé',ic:'ticket',w:.13,tip:'Giá vé cao làm khách khó chịu và đi ít hơn.'},
  {k:'reliab',n:'Đúng giờ',ic:'jam',w:.10,tip:'Bảo dưỡng xe để tránh hư giữa đường; đèn ưu tiên giúp xe đúng giờ.'},
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
  ledger:[newLedger(1)],paxTotal:0,event:null,seen:{},fare:7000,rsat:{},opt:{fps:60,sfx:1,music:0,fs:'md',automaint:1},
  drivers:[],cands:[],depots:['bt'],custom:[],missions:null,weekly:null,ach:{},contracts:{offers:[],active:[]},loans:[],
  comp:{name:'Xe buýt Phương Nam',buses:4,routes:[],sat:62,pax:0},notes:[],fc:[],rec:{},stat:{},ss:{},td:{}}; }
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
function hourFactor(h){ if(h<5) return .05; if(h<6) return .5; if(h<8.5) return 1.9; if(h<11) return 1; if(h<13) return 1.2; if(h<16.5) return .9; if(h<19) return 2; if(h<22) return .8; return .2; }

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
const fleetCap=()=>S.depots.length*DEPOT_CAP;
function nearDepot(r){ for(const id of S.depots){ const dp=D.depotById[id]; if(!dp) continue; for(let i=0;i<r.dirs[0].g.length;i+=3) if(dist(r.dirs[0].g[i],dp.p)<2500) return dp; } return null; }
/* ---------- Drivers / bus status ---------- */
function busDrivers(b){ return S.drivers.filter(d=>d.bus===b.id); }
function onShift(d,h){ const r=SHIFTS[d.shift].h; return h>=r[0]&&h<r[1]; }
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
  f.freq=n?clamp(100-(headway-15)*.9,0,100):(hour()>=22||hour()<5?60:0);
  f.crowd=n?clamp(100-act.reduce((a,b)=>a+Math.max(0,b.l/MODELS[b.m].cap-.75),0)/n*250,0,100):50;
  let cf=buses.length?buses.reduce((a,b)=>{ const d=activeDriver(b); return a+MODELS[b.m].comfort+(d?(d.skill-3)*4-(d.shift==='full'?4:0):0); },0)/buses.length:50;
  f.comfort=clamp(cf+(up.ac?12:0),0,100);
  const sh=r.allStops.filter(si=>S.shelters[si]).length/r.allStops.length, shf=Math.min(1,sh*2.5); f.shelter=35+65*shf;
  const e=S.event, jam=e&&e.type==='jam'&&e.route===r.ref; f.weather=100;
  if(raining()) f.weather=100-(wxNow()==='storm'?75:60)*(1-shf); if(jam) f.weather=Math.min(f.weather,up.lane?80:45);
  f.fare=FARE_SAT[S.fare];
  f.reliab=clamp((isRush(hour())?(up.lane?90:72):95)+(up.signal?15:0)-(jam?(up.lane?10:35):0)-(raining()?10:0)-(o.bd||0)*8-(S.comp.routes.includes(r.ref)?5:0),0,100);
  let target=0; for(const F of FACTORS) target+=F.w*f[F.k];
  return {target,f,headway};
}
function updateSat(rate){
  let tot=0,wt=0;
  for(const r of openRoutes()){ const c=computeRouteSat(r); const o=S.rsat[r.ref]||(S.rsat[r.ref]={s:70});
    o.s=clamp(o.s+(c.target-o.s)*rate,0,100); o.f=c.f; o.hw=c.headway; const w=1+(S.opened[r.ref].pax||0); tot+=o.s*w; wt+=w; }
  if(wt) S.sat=tot/wt;
}
function stopMood(si){ const w=S.waiting[si]||0, sh=S.shelters[si]; let m=100-w*1.3+(sh?10:0); if(raining()&&!sh) m-=25; return clamp(m,0,100); }
function stopSatFactor(si){ let best=0, comp=false; for(const ref of stopRoutes[si]) if(S.opened[ref]){ best=Math.max(best,rsat(ref)); if(S.comp.routes.includes(ref)) comp=true; } return (.5+best/100)*(comp?.8:1); }

/* ---------- Simulation ---------- */
function eventSpeed(r){ let f=1; const e=S.event, up=S.opened[r.ref].up||{};
  if(raining()) f*=wxNow()==='storm'?.78:.86; if(e&&e.type==='jam'&&e.route===r.ref) f*=up.lane?.85:.45; if(isRush(hour())) f*=up.lane?.96:.8; if(up.lane) f*=1.25; return f; }
function spawnFactor(si){
  let f=hourFactor(hour())*stopSatFactor(si)*FARE_DEMAND[S.fare];
  if(S.shelters[si]) f*=1.15;
  if(raining()) f*=S.shelters[si]?1.25:.9;
  const e=S.event; if(e&&e.type==='fest'&&dist([D.stops[si][1],D.stops[si][2]],e.p)<1600) f*=3;
  return f;
}
function addMoney(v,cat){ S.money+=v; const t=today(); t[cat]=(t[cat]||0)+Math.abs(v); }
function step(dt){
  const prevDay=day(),prevH=Math.floor(hour()),prev10=Math.floor(S.t/10);
  S.t+=dt; const h=hour();
  for(const si of servedStops()){ const cap=S.shelters[si]?120:80; S.waiting[si]=Math.min(cap,(S.waiting[si]||0)+.022*stopW[si]*spawnFactor(si)*dt); }
  for(const d of S.drivers) addMoney(-driverWage(d)/1440*dt,'wage');
  for(const b of S.buses){
    const M=MODELS[b.m]; addMoney(-M.upk/1440*dt,'upk');
    if(b.st!=='ok'){ if(S.t>=b.until) finishStatus(b); continue; }
    if(!b.r) continue; const r=routeById[b.r]; if(!r){ b.r=null; continue; }
    const drv=activeDriver(b,h); if(!drv) continue;
    if(b.dw>0){ b.dw-=dt; continue; }
    const dr=r.dirs[b.dir], before=b.s;
    b.s+=M.speed*eventSpeed(r)*(.94+.03*drv.skill)*dt;
    if(b.s>=dr.sd[b.k]){ b.s=dr.sd[b.k]; arrive(b,r,M); }
    const km=Math.max(0,b.s-before)/1000; b.km+=km; addMoney(-M.fuel*km,'fuel'); addMoney(SUBSIDY_KM*km,'sub');
    b.cond=Math.max(0,(b.cond??100)-km*.07);
    if(Math.random()<.00003*dt*(1+(100-b.cond)/12)*(1.4-.1*drv.skill)*M.rel*(raining()?1.3:1)) breakdown(b,r);
    else if(S.opt.automaint&&b.cond<35&&b.dw<=0&&b.l===0) startMaint(b,true);
  }
  if(Math.floor(S.t/10)!==prev10) updateSat(.18);
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
  if(last){ b.dir^=1; b.k=0; b.s=r.dirs[b.dir].sd[0]; b.dest={}; b.l=0; b.trips=(b.trips||0)+1; b.dw=8+off*.06; return; }
  const on=Math.min(Math.floor(S.waiting[si]||0),M.cap-b.l);
  S.waiting[si]=(S.waiting[si]||0)-on; b.l+=on; if(on>0) boardDest(b,dr,b.k,on);
  b.k++;
  if(on>0){ const rev=on*S.fare; addMoney(rev,'fare'); S.xp+=Math.round(on*(S.sat>=80?1.2:1)); S.paxTotal+=on; ss[0]+=on; t2[0]+=on;
    const o=S.opened[r.ref]; o.pax=(o.pax||0)+on; o.rev=(o.rev||0)+rev; S.td.pax=(S.td.pax||0)+on; S.td.fare=(S.td.fare||0)+rev;
    const so=S.td.stopOn||(S.td.stopOn={}); so[si]=(so[si]||0)+on; if(S.weekly) S.weekly.prog+=on;
    for(const c of S.contracts.active) if(nearSet(c).has(si)) c.prog+=on;
    if(on>=3&&floaters.length<20) floaters.push({lat:D.stops[si][1],lng:D.stops[si][2],txt:'+'+fmt(rev),life:1});
    if(on>=12) sfx('coin'); checkLevel(); }
  b.dw=.8+(on+off)*.08;
}
function breakdown(b,r){ b.st='broken'; b.until=S.t+60; b.lost=b.l; b.l=0; b.dest={}; S.opened[r.ref].bd=(S.opened[r.ref].bd||0)+1; S.rsat[r.ref]&&(S.rsat[r.ref].s=Math.max(0,S.rsat[r.ref].s-4));
  S.stat.breakdowns=(S.stat.breakdowns||0)+1; notify(`Xe #${b.id} (tuyến ${r.ref}) bị hư giữa đường! Gọi cứu hộ ngay`,'broken',true); sfx('bad'); news(`Một xe buýt tuyến ${r.ref} gặp sự cố kỹ thuật, hành khách chuyển sang xe khác.`); }
function towBus(b,auto){ if(b.st!=='broken') return; const r=routeById[b.r], dp=r&&nearDepot(r), M=MODELS[b.m];
  const cost=Math.round(((dp?300000:600000)*(auto?1.5:1)+M.price*.02)/1e4)*1e4; addMoney(-cost,'repair');
  b.st='repair'; b.until=S.t+(dp?45:90); notify(`${auto?'Tự động gọi':'Đã gọi'} cứu hộ xe #${b.id} về ${dp?dp.n:'xưởng'} (${fmt(cost)})`,'tow'); save(); }
function startMaint(b,auto){ if(b.st!=='ok') return; const M=MODELS[b.m], r=b.r&&routeById[b.r], dp=r&&nearDepot(r); const cost=Math.round(M.price*.03/1e4)*1e4;
  if(S.money<cost&&!auto) return toast('Không đủ tiền bảo dưỡng','coin'); addMoney(-cost,'repair'); b.st='maint'; b.until=S.t+(dp?60:120); b.l=0; b.dest={};
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
  if(hr===22&&S.buses.length) notify('22h: hết giờ làm, xe về nghỉ đêm. 5h sáng chạy lại','sleep');
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
  addMoney(-r.cost,'build'); S.opened[ref]={at:S.t,pax:0,rev:0,up:{},bd:0}; S.rsat[ref]={s:70}; setPreview(null); drawNetwork(); fitRoutes([r]); sfx('buy');
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
function buildShelter(si){ if(S.shelters[si]) return; if(S.money<SHELTER_COST) return toast('Không đủ tiền','coin'); addMoney(-SHELTER_COST,'build'); S.shelters[si]=1; S.td.shelters=(S.td.shelters||0)+1; viewDirty=true; sfx('buy');
  toast('Đã xây mái che ở trạm '+D.stops[si][0],'shelter'); checkAch(); checkMissionsLive(); save(); showStop(si); }
function setFare(f){ S.fare=f; toast('Giá vé mới: '+fmt(f),'ticket'); news(`Công ty điều chỉnh giá vé xe buýt thành ${fmt(f)}/lượt.`); save(); refreshSheet(); }
function buyUpgrade(ref,k){ const r=routeById[ref], U=UPGRADES[k], o=S.opened[ref]; if(!o||o.up[k]) return; if(S.level<U.lvl) return toast('Cần cấp '+U.lvl,'lock'); const c=U.cost(r); if(S.money<c) return toast('Không đủ tiền','coin');
  addMoney(-c,'build'); o.up[k]=1; sfx('buy'); toast(`Tuyến ${ref}: đã có ${U.n}`,U.ic); news(`Tuyến ${ref} được nâng cấp: ${U.n}.`); save(); refreshSheet(); }
function buyDepot(id){ const dp=D.depotById[id]; if(!dp||S.depots.includes(id)) return; if(S.money<dp.cost) return toast('Không đủ tiền','coin'); addMoney(-dp.cost,'build'); S.depots.push(id); sfx('buy'); viewDirty=true;
  toast(`Đã mua ${dp.n}: +${DEPOT_CAP} chỗ đậu, sửa xe nhanh hơn cho tuyến gần đó`,'depot'); news(`Công ty khai trương ${dp.n}.`); checkAch(); save(); refreshSheet(); }
function setLivery(id,c){ const b=S.buses.find(x=>x.id===id); if(!b) return; b.color=c; sfx('click'); save(); refreshSheet(); }
function assignDriver(did,bid){ const d=S.drivers.find(x=>x.id===did); if(!d) return; d.bus=bid?+bid:null; save(); refreshSheet(); }
function setShift(did,sh){ const d=S.drivers.find(x=>x.id===did); if(!d) return; d.shift=sh; save(); refreshSheet(); }
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
    mapReady=true; drawNetwork(); fitOpen(false);
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
const spriteFor=b=>{ const k=b.m+'|'+(b.color||''); return sprites[k]||(sprites[k]=makeSprite(b.m,b.color)); };
function loadIcons(){ return Promise.all(['face1','face2','face3','face4','office','fest','shelter','depot','broken','sleep','pin'].map(n=>new Promise(res=>{ const im=new Image(); im.onload=()=>{im.ok=1;res();}; im.onerror=()=>res(); im.src=ICON_SRC(n); iconImg[n]=im; }))); }

/* ---------- Render ---------- */
function resize(){ for(const c of [$('#fx'),$('#rain')]){ c.width=innerWidth*dpr; c.height=innerHeight*dpr; c.style.width=innerWidth+'px'; c.style.height=innerHeight+'px'; c.getContext('2d').setTransform(dpr,0,0,dpr,0,0); } viewDirty=true; }
const drops=[]; for(let i=0;i<110;i++) drops.push({x:Math.random(),y:Math.random(),v:.6+Math.random()*.6});
function tintFor(h){ const K=[[0,.42],[4.5,.38],[6,.12],[7.5,0],[16.5,0],[18,.1],[19.3,.36],[24,.42]]; for(let i=0;i<K.length-1;i++){ const [a,va]=K[i],[b,vb]=K[i+1]; if(h>=a&&h<=b) return va+(vb-va)*(h-a)/(b-a); } return 0; }
let uiT=0,slowT=0,lastTint='';
function frame(ts){
  requestAnimationFrame(frame);
  if(S.opt.fps===30&&(frameSkip^=1)) return;
  const dtR=Math.min(.1,(ts-(lastTs||ts))/1000); lastTs=ts;
  if(speedMul>0&&!createMode){ let dt=dtR*MIN_PER_SEC*speedMul; while(dt>0){ const d=Math.min(dt,1); step(d); dt-=d; } }
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
  const h=hour(),night=h<5.5||h>19,z=map.getZoom();
  const a=tintFor(h).toFixed(2); if(a!==lastTint){ lastTint=a; $('#tint').style.background=`rgba(18,28,78,${a})`; }
  if(viewDirty){ projectStops(); viewDirty=false; }
  // bãi xe
  for(const id of S.depots){ const dp=D.depotById[id]; if(!dp) continue; const q=map.project([dp.p[1],dp.p[0]]); if(q.x<-40||q.y<-40||q.x>W+40||q.y>H+40) continue; const s=z>=13?34:24; if(iconImg.depot.ok) g.drawImage(id==='bt'?iconImg.office:iconImg.depot,q.x-s/2,q.y-s,s,s); }
  // trạm
  if(stopScreen.length){
    const rad=z>=16?7:z>=14?5.5:z>=13?4:3, showFace=z>=14.5&&!createMode;
    for(const [si,x,y] of stopScreen){
      const w=S.waiting[si]||0;
      if(createMode){ const i=createMode.stops.indexOf(si);
        g.beginPath(); g.arc(x,y,i>=0?10:rad+1,0,6.283); g.fillStyle=i>=0?'#0f766e':'#fff'; g.fill(); g.lineWidth=2; g.strokeStyle='#0f766e'; g.stroke();
        if(i>=0){ g.fillStyle='#fff'; g.font='800 11px system-ui,sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(i+1,x,y+.5); g.textBaseline='alphabetic'; }
        continue; }
      const isPrev=previewRef&&!stopRoutes[si].some(r=>S.opened[r]);
      g.beginPath(); g.arc(x,y,rad+2,0,6.283); g.fillStyle=S.shelters[si]?'#1d4ed8':'#fff'; g.fill();
      g.beginPath(); g.arc(x,y,rad,0,6.283); g.fillStyle=isPrev?'#fff':(w<15?'#22c55e':w<35?'#facc15':w<55?'#fb923c':'#ef4444'); g.fill();
      if(isPrev){ g.lineWidth=2; g.strokeStyle=routeById[previewRef].color; g.stroke(); }
      if(showFace&&!isPrev){ const im=iconImg[faceOf(stopMood(si))]; if(im&&im.ok) g.drawImage(im,x+rad-2,y-rad-14,16,16);
        if(w>=1){ g.font='700 10px system-ui,sans-serif'; g.textAlign='left'; g.lineWidth=3; g.strokeStyle='#fff'; g.strokeText(Math.floor(w),x+rad+15,y-rad-3); g.fillStyle='#0f172a'; g.fillText(Math.floor(w),x+rad+15,y-rad-3); } }
    }
    if(createMode&&createMode.stops.length>1&&!createMode.geo){ g.strokeStyle='rgba(15,118,110,.7)'; g.lineWidth=3; g.setLineDash([6,5]); g.beginPath(); createMode.stops.forEach((si,i)=>{ const p=map.project([D.stops[si][2],D.stops[si][1]]); i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y); }); g.stroke(); g.setLineDash([]); }
  }
  // xe buýt
  const sc=clamp(1+(z-13)*.3,.7,1.9); g.textAlign='center'; g.textBaseline='middle';
  for(const b of S.buses){ b._p=null; if(!b.r||b.st==='maint'||b.st==='repair') continue; const r=routeById[b.r]; if(!r) continue; const dr=r.dirs[b.dir]||r.dirs[0];
    const p=posAt(dr,b.s),pt=map.project([p.lng,p.lat]); if(pt.x<-40||pt.y<-40||pt.x>W+40||pt.y>H+40) continue; b._p=[pt.x,pt.y];
    const A=dr.g[p.i],B=dr.g[Math.min(p.i+1,dr.g.length-1)],pa=map.project([A[1],A[0]]),pb=map.project([B[1],B[0]]);
    const ang=Math.atan2(pb.y-pa.y,pb.x-pa.x), sp=spriteFor(b), act=b.st==='ok'&&activeDriver(b,h);
    g.save(); g.translate(pt.x,pt.y); g.rotate(ang); g.scale(sc,sc); if(!act) g.globalAlpha=.55;
    if(night&&act){ g.fillStyle='rgba(255,240,170,.35)'; g.beginPath(); g.moveTo(sp.w/2-2,0); g.arc(sp.w/2-2,0,30,-.42,.42); g.fill(); }
    g.drawImage(sp.c,-sp.w/2,-sp.h/2,sp.w,sp.h); g.restore(); g.globalAlpha=1;
    const fs=z>=15?12:z>=13?11:10,label=r.ref; g.font=`900 ${fs}px system-ui,sans-serif`;
    const tw=Math.max(g.measureText(label).width+10,20),bx=pt.x,by=pt.y-10*sc-fs;
    g.fillStyle='#fff'; g.beginPath(); g.roundRect(bx-tw/2-2,by-fs/2-4,tw+4,fs+8,7); g.fill();
    g.fillStyle=r.color; g.beginPath(); g.roundRect(bx-tw/2,by-fs/2-2,tw,fs+4,6); g.fill();
    g.beginPath(); g.moveTo(bx-4,by+fs/2+2); g.lineTo(bx+4,by+fs/2+2); g.lineTo(bx,by+fs/2+6); g.fill();
    g.fillStyle='#fff'; g.fillText(label,bx,by+.5);
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
function openSheet(html,ctx,cls){ $('#sheet-body').innerHTML=html; const sh=$('#sheet'); sh.classList.remove('closed'); sh.classList.toggle('mini',cls==='mini'); sheetCtx=ctx; }
function closeSheet(){ if(createMode){ cancelCreate(); return; } $('#sheet').classList.add('closed'); sheetCtx=null; setPreview(null); setTab('map',true); }
const SHEETS={routes:()=>renderRoutes(),route:c=>showRoute(c.ref,true),fleet:()=>renderFleet(),finance:()=>renderFinance(),stop:c=>showStop(c.si),more:()=>renderMore(),sat:()=>renderSat(),bus:c=>showBus(c.id,true),create:()=>renderCreate()};
function refreshSheet(){ if(!sheetCtx) return; const c=sheetCtx, el=$('#sheet-body'), sc=el.scrollTop; SHEETS[c.t]?.(c); el.scrollTop=sc; }
function setTab(t,noOpen){ curTab=t; document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t)); if(noOpen) return; setPreview(null);
  if(createMode&&t!=='routes'){ createMode=null; viewDirty=true; }
  if(t==='map') closeSheet(); else if(t==='routes') renderRoutes(); else if(t==='fleet') renderFleet(); else if(t==='finance') renderFinance(); else { sub.more=null; renderMore(); } }
const badge=(r,small)=>`<span class="badge${small?' sm':''}" style="background:${r.color}">${esc(r.ref)}</span>`;
const fires=n=>`<span class="fires">${ICON('fire',14).repeat(n)}</span>`;
const segBtns=(key,cur,items)=>`<div class="seg">${items.map(([v,l,ic])=>`<button data-sub="${key}:${v}" class="${cur===v?'on':''}">${ic?ICON(ic,16):''}${l}</button>`).join('')}</div>`;
const SHIFT_TXT={sang:'5h–13h30',chieu:'13h30–22h',full:'5h–22h'};
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
  if(!keep){ setPreview(r); fitRoutes([r],true,innerHeight*.5); }
  const buses=S.buses.filter(b=>b.r===ref), idle=S.buses.filter(b=>!b.r), rs=S.rsat[ref], comp=S.comp.routes.includes(ref);
  const top=[...r.allStops].sort((a,b)=>stopW[b]-stopW[a]).slice(0,5).map(s=>esc(D.stops[s][0]));
  const A=r.dirs[0],B=r.dirs[1];
  const ups=o?Object.entries(UPGRADES).map(([k,U])=>{ const has=o.up[k], lock=S.level<U.lvl, c=U.cost(r);
    return `<div class="card up ${has?'has':''}">${ICON(U.ic,34)}<div class="grow"><div class="t">${U.n}</div><div class="m">${U.d}</div></div>${has?`<span class="tag ok">${ICON('check',12)} Đã có</span>`:lock?`<span class="tag lock">${ICON('lock',12)} Cấp ${U.lvl}</span>`:`<button class="btn y mini" data-up="${esc(ref)}:${k}" ${S.money<c?'disabled':''}>${fmt(c)}</button>`}</div>`; }).join(''):'';
  openSheet(`<h2>${badge(r)} <span class="h2t">${esc(r.title)}</span></h2>
    <div class="sub">${r.op?esc(r.op)+' · ':''}${r.km.toFixed(1)} km · ${r.allStops.length} trạm thật · ${fires(r.fire)}</div>
    <div class="dirs"><div>${ICON('up',16)} <b>Chiều đi</b> ${esc(D.stops[A.si[0]][0])} → ${esc(D.stops[A.si[A.si.length-1]][0])} · ${A.si.length} trạm</div>
      <div style="transform:none">${ICON('swap',16)} <b>Chiều về</b> ${esc(D.stops[B.si[0]][0])} → ${esc(D.stops[B.si[B.si.length-1]][0])} · ${B.si.length} trạm${r.two?'':' <i>(cùng đường, ngược chiều)</i>'}</div></div>
    ${comp?`<div class="tip warn">${ICON('rival',22)}<span><b>${esc(S.comp.name)}</b> đang chạy song song tuyến này và giành khách (-20%). Giữ hài lòng ≥78% để đẩy họ đi.</span></div>`:''}
    ${o?`<div class="kpi"><div class="p">Khách hôm nay<b>${(o.pax||0).toLocaleString('vi-VN')}</b></div><div class="p">Doanh thu hôm nay<b>${fmt(o.rev||0)}</b></div><div>Sự cố hôm nay<b>${o.bd||0}</b></div><div>Xe trên tuyến<b>${buses.length}</b></div></div>`:''}
    ${o&&rs?`<div class="satbox"><div class="row">${ICON(faceOf(rs.s),44)}<div class="grow"><b style="font-size:17px">${Math.round(rs.s)}% · ${moodTxt(rs.s)}</b><div class="m">${buses.length?`Cứ ~${Math.round(rs.hw||0)} phút có 1 chuyến mỗi chiều`:'Chưa có xe chạy'}</div></div></div>${rs.f?factorBars(rs.f):''}<h3>Lời khuyên</h3>${rs.f?tipsFor(rs.f):''}</div>`:''}
    <div class="m" style="margin:8px 0">Trạm đông: ${top.join(' · ')}</div>
    ${o?`<h3>${ICON('lane',20)} Nâng cấp tuyến</h3>${ups}
      <h3>Xe trên tuyến (${buses.length})</h3>${buses.map(b=>busCard(b)).join('')||'<div class="empty">Chưa có xe. Mua hoặc giao xe đang rảnh!</div>'}
      ${idle.length?`<button class="btn full" data-assignidle="${esc(ref)}">Giao ${idle.length} xe đang rảnh cho tuyến này</button>`:''}
      <div class="row wrap">${Object.entries(MODELS).filter(([k,M])=>S.level>=M.lvl).map(([k,M])=>`<button class="btn y buyq" data-buy="${k}" ${S.money<M.price?'disabled':''}>${ICON(M.icon,26)}<span>${fmt(M.price)}</span></button>`).join('')}</div>
      <button class="btn r full" data-close-route="${esc(ref)}">Đóng tuyến</button>`
     :`<button class="btn y full" data-open="${esc(ref)}" ${S.money<r.cost?'disabled':''}>Mở tuyến · ${fmt(r.cost)}</button>`}`,{t:'route',ref});
}

/* ---------- Fleet ---------- */
function busStatus(b){ if(b.st==='broken') return ['r','Hư giữa đường','broken']; if(b.st==='repair') return ['y','Đang sửa · xong '+hhmm(b.until),'tow']; if(b.st==='maint') return ['y','Bảo dưỡng · xong '+hhmm(b.until),'wrench'];
  if(!b.r) return ['g','Đậu ở bãi','depot']; if(!busDrivers(b).length) return ['r','Thiếu tài xế!','driver']; if(!activeDriver(b)) return ['g','Ngoài ca, nghỉ','sleep']; return ['ok','Đang chạy','play']; }
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
    <div class="sub"><span class="st ${sc}">${ICON(sic,14)} ${stx}</span>${r&&dr?` · ${badge(r,1)} hướng về ${esc(D.stops[dr.si[dr.si.length-1]][0])}`:''}</div>
    <div class="kpi"><div>${ICON('people',16)} Khách trên xe<b>${b.l}/${M.cap}</b></div><div>${ICON('chart',16)} Đã chạy<b>${Math.round(b.km)} km · ${b.trips||0} lượt</b></div>
      <div>${ICON('wrench',16)} Tình trạng<b style="color:${condColor(c)}">${c}%</b></div><div>${ICON('calendar',16)} Tuổi xe<b>${ages} ngày · tối đa ${mc}%</b></div></div>
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
      <div class="row"><select data-shift="${d.id}">${Object.entries(SHIFTS).map(([k,s])=>`<option value="${k}" ${d.shift===k?'selected':''}>${s.n} ${SHIFT_TXT[k]}${s.mul>1?' (lương ×'+s.mul+')':''}</option>`).join('')}</select><select data-drvbus="${d.id}">${busOpts(d)}</select></div></div>`).join('')||'<div class="empty">Chưa có tài xế.</div>'}
    <h3>${ICON('people',20)} Ứng viên hôm nay</h3><div class="sub">Danh sách đổi mỗi ngày.</div>
    ${S.cands.map(d=>`<div class="card drv">${ICON('driver',30)}<div class="grow"><div class="t">${esc(d.name)} <span class="stars">${stars(d.skill)}</span></div><div class="m">Lương ${fmt(d.wage)}/ngày (ca cả ngày ×1.6)</div></div><button class="btn y mini" data-hire="${d.id}">Thuê</button></div>`).join('')||'<div class="empty">Hết ứng viên, quay lại ngày mai.</div>'}`,{t:'fleet'});
}
function renderDepots(head){
  openSheet(`${head}<div class="sub">Mỗi bãi xe chứa ${DEPOT_CAP} xe (hiện ${S.buses.length}/${fleetCap()}). Tuyến chạy gần bãi (≤2,5 km) được cứu hộ, sửa chữa & bảo dưỡng nhanh gấp đôi, rẻ hơn. Bãi đặt cạnh các bến xe thật.</div>
    ${D.depots.map(dp=>{ const own=S.depots.includes(dp.id), near=openRoutes().filter(r=>nearDepot(r)===dp).length;
      return `<div class="card">${ICON(dp.id==='bt'?'office':'depot',36)}<div class="grow"><div class="t">${esc(dp.n)}</div><div class="m">${ICON('pin',13)} ${esc(D.stops[dp.si][0])}${own?` · phục vụ ${near} tuyến`:''}</div></div>
        <button class="btn g mini" data-goto="${dp.p[0]},${dp.p[1]}">${ICON('target',16)}</button>${own?`<span class="tag ok">${ICON('check',12)} Của bạn</span>`:`<button class="btn y mini" data-depot="${dp.id}" ${S.money<dp.cost?'disabled':''}>${fmt(dp.cost)}</button>`}</div>`; }).join('')}`,{t:'fleet'});
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
  openSheet(`<h2>${ICON(sh?'shelter':'stop',28)} <span class="h2t">${esc(st[0])}</span></h2><div class="sub">Trạm thật trên OpenStreetMap · ${fires(stopFire(si))}</div>
    <div class="kpi"><div>${ICON('people',18)} Khách đang chờ<b>${w}</b></div><div>${ICON(faceOf(mood),18)} Tâm trạng<b>${moodTxt(mood)}</b></div>
      <div>${ICON('up',18)} Lên xe hôm nay<b>${t[0]}</b></div><div>${ICON('pin',18)} Xuống xe hôm nay<b>${t[1]}</b></div>
      <div>Tổng lượt lên<b>${a[0].toLocaleString('vi-VN')}</b></div><div>Tổng lượt xuống<b>${a[1].toLocaleString('vi-VN')}</b></div></div>
    ${ct.length?`<div class="tip">${ICON('contract',20)}<span>Thuộc vùng hợp đồng: ${ct.map(c=>esc(c.n)).join(', ')}</span></div>`:''}
    <div class="m">Tuyến đi qua: ${rs.map(r=>`<span data-route="${esc(r.ref)}">${badge(r,1)}</span>`).join(' ')}</div>
    ${sh?`<div class="tip">${ICON('check',20)}<span>Đã có mái che: +15% khách, chứa 120 người, khách không bực khi mưa.</span></div>`:`<button class="btn y full" data-shelter="${si}" ${S.money<SHELTER_COST?'disabled':''}>${ICON('shelter',22)} Xây mái che · ${fmt(SHELTER_COST)}</button><div class="sub" style="margin-top:8px">Mái che: +15% khách, chứa 120 người, tăng điểm hài lòng của tuyến.</div>`}`,{t:'stop',si});
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
    <div class="sub" style="text-align:center;margin-top:10px">Xe Buýt Sài Gòn v3 · dữ liệu © OpenStreetMap</div>`,{t:'more'});
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
    const t=e.target.closest('[data-open],[data-route],[data-buy],[data-sell],[data-shelter],[data-close],[data-tutnext],[data-tutskip],[data-tut],[data-reset],[data-saveg],[data-f],[data-assignidle],[data-close-route],[data-fare],[data-sub],[data-bus],[data-tow],[data-maint],[data-maintall],[data-livery],[data-hire],[data-fire],[data-unassign],[data-depot],[data-goto],[data-up],[data-borrow],[data-repay],[data-claim],[data-accept],[data-opt],[data-fs],[data-create],[data-ccancel],[data-cundo],[data-cdone],[data-cok],[data-stop]');
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
    else if(ds.fs){ S.opt.fs=ds.fs; applyFs(); save(); renderMore(); }
    else if(ds.create!==undefined) startCreate();
    else if(ds.ccancel!==undefined) cancelCreate();
    else if(ds.cundo!==undefined){ if(createMode.geo){ createMode.geo=null; setPreview(null); } else createMode.stops.pop(); viewDirty=true; renderCreate(); }
    else if(ds.cdone!==undefined) finishCreate();
    else if(ds.cok!==undefined) confirmCreate();
    else if(ds.stop) showStop(+ds.stop);
    else if(ds.bus) showBus(+ds.bus);
    else if(ds.route) showRoute(ds.route);
  });
  document.body.addEventListener('change',e=>{ const s=e.target, ds=s.dataset;
    if(ds.assign){ const b=S.buses.find(x=>x.id===+ds.assign); if(b){ assign(b,s.value||null); refreshSheet(); } }
    else if(ds.shift) setShift(+ds.shift,s.value);
    else if(ds.drvbus) assignDriver(+ds.drvbus,s.value||null);
    else if(ds.adddrv&&s.value) assignDriver(+s.value,+ds.adddrv); });
  $('.grab').onclick=closeSheet;
  let y0=null; $('#sheet').addEventListener('touchstart',e=>{ if($('#sheet-body').scrollTop<=0) y0=e.touches[0].clientY; },{passive:true});
  $('#sheet').addEventListener('touchmove',e=>{ if(y0!==null&&e.touches[0].clientY-y0>70){ y0=null; closeSheet(); } },{passive:true});
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
  applyFs(); initMap(); fxCtx=$('#fx').getContext('2d'); rainCtx=$('#rain').getContext('2d'); resize(); addEventListener('resize',resize);
  bindUI(); updateSat(1); updateHud(); updTicker();
  $('#loading').style.opacity=0; setTimeout(()=>$('#loading').remove(),500);
  if(!S.seen.tut) showTut(0); else if(upgraded||!S.seen.v3) showWhatsNew();
  S.seen.v3=1; save();
  setInterval(save,10000);
  window.__game={get S(){return S;},D,MODELS,step,openRoute,buyBus,routeById,breakdown,newDay,hourly,startCreate,createToggle,finishCreate,confirmCreate,get map(){return map;}};
  requestAnimationFrame(frame);
}
boot().catch(e=>{ const p=$('#loading p'); if(p) p.textContent='Lỗi tải game: '+e.message; console.error(e); });
})();
