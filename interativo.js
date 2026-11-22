/* Recursos interativos do painel de Autorizações (mesmo conjunto dos painéis PIT, FICO e Acidentes).
   Usa o estilo compartilhado saffp-paineis/assets/interativo.css e se liga ao código do index.html
   por cima das funções globais (pass, whereAut, render) sem substituir nenhum recurso existente. */
(function(){
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const P={k0:0,n:0,range:null,ext:false,extGeo:null,play:false,cur:null,inited:false,years:[],bbox:null,vis:null};
const store={get:(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
const dark=()=>document.documentElement.dataset.theme==='dark';
const T=()=>dark()?{ink:'#E8EDF5',ink2:'#B8C2D3',muted:'#93A0B5',grid:'#22304A',axis:'#2C3B57',card:'#111B2E'}:{ink:'#14213D',ink2:'#4A5568',muted:'#6A7486',grid:'#EDF0F4',axis:'#DDE3EB',card:'#fff'};
function toast(t){ let e=$('#ixToast'); if(!e){ e=document.createElement('div'); e.id='ixToast'; e.className='ix-toast'; document.body.appendChild(e);} e.textContent=t; e.classList.add('on'); clearTimeout(e._t); e._t=setTimeout(()=>e.classList.remove('on'),2200); }
const resizeAll=()=>setTimeout(()=>{ [cStatus,cReq,cUF,EP].forEach(c=>{ try{c&&c.resize();}catch(e){} }); },60);
const plabel=(i,long)=>{ const k=P.k0+i,y=Math.floor(k/12); return `${MES[k%12]}/${long?y:String(y).slice(2)}`; };

/* estilos específicos deste painel no modo escuro */
const st=document.createElement('style'); st.textContent=`
[data-theme="dark"] .toggle button.on{background:#2C3B57;color:var(--ink)}
[data-theme="dark"] .drawer,[data-theme="dark"] .ai{background:#111B2E;color:var(--ink)}
[data-theme="dark"] .ai:hover{background:#17233A}
[data-theme="dark"] .dp h3{color:var(--ink)}
[data-theme="dark"] .rg.on .bar i{background:#6AA5EA}
.rg.ix-hl{background:rgba(242,183,5,.18);border-radius:6px}`;
document.head.appendChild(st);

/* ---------- datas (publicação) ---------- */
function prepDates(){
  D.forEach(r=>{ r._p=null; r._yr=null; if(!r.pub) return; const d=new Date(r.pub); const y=d.getUTCFullYear(); r._yr=y; r._p=y*12+d.getUTCMonth(); });
  const ks=D.map(r=>r._p).filter(k=>k!=null); if(!ks.length) return false;
  P.k0=Math.min(...ks); P.n=Math.max(...ks)-P.k0+1; D.forEach(r=>{ if(r._p!=null) r._p-=P.k0; });
  P.years=[...new Set(D.map(r=>r._yr).filter(Boolean))].sort(); return true;
}
function bboxes(){ if(P.bbox||!window.AGEO_READY) return P.bbox; P.bbox={}; Object.entries(AGEO).forEach(([fid,paths])=>{ let x0=180,y0=90,x1=-180,y1=-90; (paths||[]).forEach(pa=>pa.forEach(p=>{ if(p[0]<x0)x0=p[0]; if(p[0]>x1)x1=p[0]; if(p[1]<y0)y0=p[1]; if(p[1]>y1)y1=p[1]; })); P.bbox[fid]=[x0,y0,x1,y1]; }); return P.bbox; }

/* ---------- filtros extras: período e área visível (por cima de pass/whereAut) ---------- */
const basePass=pass;
pass=function(r,skip){
  if(!basePass(r,skip)) return false;
  if(P.range&&skip!=='_range'){ if(r._p==null||r._p<P.range[0]||r._p>P.range[1]) return false; }
  if(P.ext&&P.extGeo&&skip!=='_map'){ const b=bboxes(), bb=b&&b[r.id], e=P.extGeo; if(bb&&(bb[2]<e.xmin||bb[0]>e.xmax||bb[3]<e.ymin||bb[1]>e.ymax)) return false; }
  return true;
};
const baseWhere=whereAut;
whereAut=function(){
  const w=baseWhere(); if(!P.range) return w;
  const ids=D.filter(r=>r._p!=null&&r._p>=P.range[0]&&r._p<=P.range[1]).map(r=>r.id);
  const c=ids.length?`FID IN (${ids.join(',')})`:'1=0'; return w==='1=1'?c:`${w} AND ${c}`;
};

/* ---------- estrutura ---------- */
const topIn=$('.top-in');
const tools=document.createElement('div'); tools.className='ix-tools';
tools.innerHTML=`<button class="ix-b gold" id="ixTour" title="Passeio guiado pelos dados">▶ <span>Apresentar</span></button>
  <button class="ix-b" id="ixCustom" title="Escolher e organizar os blocos">⚙ <span>Personalizar</span></button>
  <button class="ix-b" id="ixShare" title="Copiar um link com os filtros aplicados">🔗 <span>Compartilhar visão</span></button>
  <button class="ix-b" id="ixTheme" title="Alternar modo claro/escuro">☾ <span>Escuro</span></button>`;
topIn.appendChild(tools);
const BLOCKS=[]; const tag=(el,id,label)=>{ if(!el) return; el.dataset.ix=id; BLOCKS.push({id,label}); };
const cardOf=sel=>{ const e=$(sel); return e&&e.closest('.card'); };
tag($('#kpis'),'kpis','Indicadores');
tag(cardOf('#cStatus'),'status','Situação dos trechos');
tag(cardOf('#regBars'),'reg','Extensão por região');
const mapcard=$('#tabOv .mapcard'); tag(mapcard,'map','Mapa dos trechos');
tag(cardOf('#cReq'),'req','Requerentes');
const sec=document.createElement('section'); sec.className='card ix-period'; sec.id='ixPeriod';
sec.innerHTML=`<div class="card-h"><h2>Linha do tempo · data de publicação</h2><span class="hint">arraste as alças amarelas para escolher o período · trechos sem data de publicação ficam de fora quando um período é escolhido</span><span class="sp"></span>
  <span class="ix-per" id="ixPer"></span><select class="mapsel" id="ixSpeed" aria-label="Velocidade"><option value="800">Lenta</option><option value="380" selected>Normal</option><option value="160">Rápida</option></select>
  <button class="ix-play" id="ixPlay">▶ Reproduzir</button></div><div id="ixTime"></div>`;
$('#tabOv section.main').after(sec); tag(sec,'period','Linha do tempo');
tag(cardOf('#cUF'),'uf','Previsão de investimento por UF');
tag(cardOf('#tbl'),'table','Trechos (tabela)');
$$('[data-ix]').forEach(el=>{ const h=el.querySelector(':scope > .card-h'); if(!h) return; const b=document.createElement('button'); b.className='ix-h'; b.type='button'; b.title='Arraste para reorganizar'; b.textContent='⠿'; h.prepend(b); });
{ const mh=mapcard.querySelector('.card-h'), bl=mh.querySelector('label[for="baseSel"]');
  const lab=document.createElement('label'); lab.className='ix-ext'; lab.title='Números e gráficos contam só os trechos que aparecem no mapa';
  lab.innerHTML='<input type="checkbox" id="ixExt"> Só a área visível'; mh.insertBefore(lab,bl);
  mapcard.insertAdjacentHTML('beforeend','<div class="ix-hov" id="ixHov"></div><div class="ix-stamp" id="ixStamp"></div>'); }
document.body.insertAdjacentHTML('beforeend',`
<div class="ix-pop" id="ixPopC"><h4>Personalizar painel</h4><div id="ixList"></div>
  <div class="n">Arraste os blocos pela alça ⠿ para mudar a ordem dentro da coluna. As escolhas ficam salvas neste navegador.</div>
  <div class="r"><button class="ix-btn" id="ixReset">Restaurar padrão</button><button class="ix-btn pri" id="ixOk">Pronto</button></div></div>
<div class="ix-pop" id="ixPopS"><h4>Link desta visão</h4><input type="text" id="ixLink" readonly><div class="n">Copie o link acima (Ctrl+C). Ele abre o painel com os mesmos filtros, período e tema.</div>
  <div class="r"><button class="ix-btn pri" id="ixOkS">Fechar</button></div></div>
<div class="ix-tour" id="ixTourBox"><div class="s" id="ixTS"></div><h4 id="ixTT"></h4><p id="ixTX"></p><div class="r"><div class="dots" id="ixTD"></div><button class="ix-btn" id="ixTE">Sair</button><button class="ix-btn pri" id="ixTN">Próximo</button></div></div>`);

/* ---------- indicadores: contagem animada e tendência por ano de publicação ---------- */
const KM=[f=>sum(f,'km'),f=>sum(f,'inv'),f=>sum(f,'ed'),f=>sum(f,'ei'),f=>f.length];
const KDEC=[1,1,0,0,0];
const prevV={};
const nf2=(v,d)=>v.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
function spark(vals,color){
  const n=vals.length; if(n<2) return ''; const w=120,h=30,max=Math.max(1e-9,...vals);
  const pts=vals.map((v,i)=>[i*(w-6)/(n-1)+3,h-3-(v/max)*(h-8)]);
  const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(''), L=pts[n-1], id='g'+Math.random().toString(36).slice(2,8);
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="${line}L${L[0]} ${h}L3 ${h}Z" fill="url(#${id})"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke"/><circle cx="${L[0]}" cy="${L[1]}" r="2.6" fill="${color}"/><title>Por ano de publicação — ${P.years.map((y,i)=>`${y}: ${nf2(vals[i],KDEC[0]?1:0)}`).join(' · ')}</title></svg>`;
}
function kpiFx(f){
  $$('#kpis .kpi').forEach((el,i)=>{
    const fn=KM[i]; if(!fn) return; const v=fn(f), d=KDEC[i];
    const tn=el.querySelector('.vl').firstChild;
    if(tn&&tn.nodeType===3&&!document.hidden){ const from=prevV[i]??0; if(from!==v){ const t0=performance.now();
      const step=t=>{ const q=Math.min(1,(t-t0)/650),e=1-Math.pow(1-q,3); tn.nodeValue=nf2(from+(v-from)*e,d); if(q<1) requestAnimationFrame(step); }; tn.nodeValue=nf2(from,d); requestAnimationFrame(step); } }
    prevV[i]=v;
    if(P.years.length<2) return;
    const by=P.years.map(y=>fn(f.filter(r=>r._yr===y)));
    if(!by.some(x=>x)) return;
    const tr=document.createElement('div'); tr.className='ix-trend'; tr.innerHTML=spark(by,'#1C5FAD')+`<span class="ix-delta">por ano de<br>publicação</span>`;
    const ft=el.querySelector('.ft'); ft?el.insertBefore(tr,ft):el.appendChild(tr);
  });
}

/* ---------- linha do tempo ---------- */
let EP=null, suppress=false;
function periodOption(full){
  const f=rows('_range'), t=T();
  const op=i=>P.play&&P.cur!=null&&i>P.cur?.18:1;
  const series=STATUS.map(([s,c],k)=>{ const arr=new Array(P.n).fill(0); f.forEach(r=>{ if(r._p!=null&&r.status===s) arr[r._p]++; });
    return {id:'p'+k,name:s,type:'bar',stack:'t',barCategoryGap:'20%',itemStyle:{color:c},data:arr.map((v,i)=>({value:v,itemStyle:{color:c,opacity:op(i)}}))}; });
  series[0].markLine=P.play&&P.cur!=null?{silent:true,symbol:'none',lineStyle:{color:'#F2B705',width:3,type:'solid'},label:{formatter:plabel(P.cur),color:t.ink,fontWeight:700},data:[{xAxis:P.cur}]}:{data:[]};
  if(!full) return {series};
  const zr=P.range||[0,P.n-1];
  return {grid:{left:8,right:18,top:30,bottom:52,containLabel:true},legend:{top:0,right:8,itemWidth:12,itemHeight:12,textStyle:{color:t.ink2},type:'scroll'},
    tooltip:{trigger:'axis',axisPointer:{type:'shadow'},formatter:ps=>`<b>${plabel(ps[0].dataIndex,true)}</b><br>`+ps.filter(p=>p.value).map(p=>`${p.marker} ${esc(p.seriesName)}: <b>${p.value}</b>`).join('<br>')},
    xAxis:{type:'category',data:Array.from({length:P.n},(_,i)=>plabel(i)),axisTick:{show:false},axisLine:{lineStyle:{color:t.axis}},axisLabel:{color:t.muted,fontSize:11}},
    yAxis:{type:'value',minInterval:1,splitLine:{lineStyle:{color:t.grid}},axisLabel:{color:t.muted,fontSize:11}},
    dataZoom:[{type:'slider',startValue:zr[0],endValue:zr[1],height:20,bottom:8,borderColor:t.axis,fillerColor:'rgba(242,183,5,.22)',handleStyle:{color:'#F2B705',borderColor:'#C99700'},moveHandleStyle:{color:'#F2B705'},
      textStyle:{color:t.muted},labelFormatter:i=>plabel(i,true),dataBackground:{lineStyle:{color:t.muted},areaStyle:{color:t.grid}},selectedDataBackground:{lineStyle:{color:'#C99700'},areaStyle:{color:'rgba(242,183,5,.3)'}}},
      {type:'inside',zoomOnMouseWheel:false,moveOnMouseWheel:false}],series};
}
function periodChart(full){
  if(!P.n) return;
  if(!EP){ EP=echarts.init(document.getElementById('ixTime')); full=true;
    EP.on('datazoom',()=>{ if(suppress||P.play) return; const dz=EP.getOption().dataZoom[0]; const a=Math.round(dz.startValue),b=Math.round(dz.endValue);
      const nr=(a<=0&&b>=P.n-1)?null:[a,b]; if(JSON.stringify(nr)===JSON.stringify(P.range)) return; P.range=nr; lastKey=null; render(); });
    EP.on('mouseover',p=>{ if(p.componentType==='series'&&!P.play) hover(D.filter(r=>r._p===p.dataIndex).map(r=>r.id)); });
    EP.on('mouseout',()=>{ if(!P.play) hover(null); }); }
  EP.setOption(periodOption(full),full?{notMerge:true}:undefined);
  $('#ixPer').textContent=P.range?`${plabel(P.range[0],true)} – ${plabel(P.range[1],true)}`:`${plabel(0,true)} – ${plabel(P.n-1,true)} · todo o período`;
}
function syncZoom(){ if(!EP) return; suppress=true; const zr=P.range||[0,P.n-1]; EP.dispatchAction({type:'dataZoom',startValue:zr[0],endValue:zr[1]}); suppress=false; }
let playT=null;
function play(){
  if(P.play){ stopPlay(); return; }
  const a=P.range?P.range[0]:0, b=P.range?P.range[1]:P.n-1; let i=a;
  P.play=true; $('#ixPlay').textContent='❚❚ Pausar'; $('#ixStamp').classList.add('on');
  const tick=()=>{ P.cur=i; P.range=[a,i]; render(); const f=rows();
    $('#ixStamp').innerHTML=`<div class="m">${plabel(i,true)}</div><div class="c"><b>${f.filter(r=>r._p===i).length}</b> publicados no mês · ${f.length} acumulados</div>`;
    if(++i>b){ playT=setTimeout(()=>stopPlay(true),1100); return; } playT=setTimeout(tick,+$('#ixSpeed').value); };
  tick();
}
function stopPlay(done){ clearTimeout(playT); if(!P.play) return; P.play=false; P.cur=null; $('#ixPlay').textContent='▶ Reproduzir'; $('#ixStamp').classList.remove('on'); syncZoom(); render(); if(done) toast('Reprodução concluída'); }
$('#ixPlay').onclick=play;

/* ---------- ligação gráficos ↔ mapa ---------- */
let LV=null, hoverW=null;
function hover(x){ clearTimeout(P.ht); if(x==null){ P.ht=setTimeout(()=>{ hoverW=null; applyEffect(); },140); return; } hoverW=x; applyEffect(); }
function applyEffect(){
  if(!LV) return;
  const ids=a=>a.length?`FID IN (${a.join(',')})`:'1=0';
  if(P.play&&P.cur!=null){ LV.featureEffect={filter:{where:ids(D.filter(r=>r._p===P.cur).map(r=>r.id))},includedEffect:'brightness(1.12) drop-shadow(0px 0px 3px rgba(242,183,5,.6))',excludedEffect:'opacity(55%)'}; return; }
  if(hoverW){ LV.featureEffect={filter:{where:Array.isArray(hoverW)?ids(hoverW):hoverW},includedEffect:'brightness(1.08) drop-shadow(0px 0px 2px rgba(242,183,5,.55))',excludedEffect:'grayscale(65%) opacity(35%)'}; return; }
  LV.featureEffect=null;
}
cStatus.on('mouseover',p=>{ if(p.name&&!P.play) hover('STATUS='+q(p.name)); }); cStatus.on('mouseout',()=>hover(null));
cReq.on('mouseover',p=>{ const n=p.name||(p.componentType==='series'&&cReq.getOption().yAxis[0].data[p.dataIndex]); if(n&&!P.play) hover('REQUERENTE='+q(n)); }); cReq.on('mouseout',()=>hover(null));
cUF.on('mouseover',p=>{ if(p.name&&!P.play) hover('UF='+q(p.name)); }); cUF.on('mouseout',()=>hover(null));
$('#regBars').addEventListener('mouseover',e=>{ const b=e.target.closest('.rg'); if(b&&!P.play) hover('REGIAO='+q(b.dataset.r)); });
$('#regBars').addEventListener('mouseleave',()=>hover(null));
// legenda da situação e linhas da tabela também acendem os trechos no mapa
$('#lgStatus').addEventListener('mouseover',e=>{ const b=e.target.closest('.lg'); if(b&&!P.play){ hover('STATUS='+q(b.dataset.s)); const si=STATUS.findIndex(s=>s[0]===b.dataset.s); cStatus.dispatchAction({type:'downplay',seriesIndex:0}); if(si>=0) cStatus.dispatchAction({type:'highlight',seriesIndex:0,dataIndex:si}); } });
$('#lgStatus').addEventListener('mouseleave',()=>{ hover(null); cStatus.dispatchAction({type:'downplay',seriesIndex:0}); });
$('#tbl tbody').addEventListener('mouseover',e=>{ const tr=e.target.closest('tr[data-f]'); if(!tr||P.play) return; const r=D.find(x=>x.id===+tr.dataset.f); hover([+tr.dataset.f]); chartsHighlight(r); });
$('#tbl tbody').addEventListener('mouseleave',()=>{ hover(null); chartsHighlight(null); });
function chartsHighlight(r){
  try{ cStatus.dispatchAction({type:'downplay',seriesIndex:0}); cReq.dispatchAction({type:'downplay'}); cUF.dispatchAction({type:'downplay',seriesIndex:0}); }catch(e){}
  $$('#regBars .rg').forEach(b=>b.classList.toggle('ix-hl',!!r&&b.dataset.r===r.regiao));
  if(!r) return;
  try{ const si=STATUS.findIndex(s=>s[0]===r.status); if(si>=0) cStatus.dispatchAction({type:'highlight',seriesIndex:0,dataIndex:si});
    const ri=(cReq.getOption().yAxis[0].data||[]).indexOf(r.req); if(ri>=0&&si>=0) cReq.dispatchAction({type:'highlight',seriesIndex:si,dataIndex:ri});
    const ui=(cUF.getOption().xAxis[0].data||[]).indexOf(r.uf); if(ui>=0) cUF.dispatchAction({type:'highlight',seriesIndex:0,dataIndex:ui}); }catch(e){}
}
function moveHov(ev){ const h=$('#ixHov'),m=$('#map'); let x=ev.x+16,y=ev.y+14; if(x+310>view.width) x=ev.x-316; if(y+130>view.height) y=Math.max(4,ev.y-130); h.style.left=(m.offsetLeft+x)+'px'; h.style.top=(m.offsetTop+y)+'px'; }
function hookMap(lv){
  LV=lv; let last=null,pend=false,hl=null;
  view.highlightOptions={color:[242,183,5,1],haloOpacity:.6,fillOpacity:.1};
  view.on('pointer-move',ev=>{ if(pend) return; pend=true; requestAnimationFrame(()=>{ pend=false;
    view.hitTest(ev,{include:[lyr.aut]}).then(h=>{ const g=h.results.find(x=>x.graphic&&x.graphic.layer===lyr.aut); const id=g?g.graphic.attributes.FID:null;
      if(id!==last){ last=id; if(hl){hl.remove();hl=null;} const r=id!=null?D.find(x=>x.id===id):null;
        if(r){ hl=LV.highlight(g.graphic); const h2=$('#ixHov');
          h2.innerHTML=`<div class="t">${esc(r.trecho)}</div><div>${esc(r.req)}</div><div><span class="st"><i style="background:${SCOL[r.status]||'#999'}"></i>${esc(r.status)}</span></div><div>${nf(r.km,1)} km · R$ ${nf(r.inv,2)} bi · ${esc(r.uf)}</div><div class="m">clique para abrir a ficha do trecho</div>`;
          moveHov(ev); h2.classList.add('on'); chartsHighlight(r); view.container.style.cursor='pointer'; }
        else { $('#ixHov').classList.remove('on'); chartsHighlight(null); view.container.style.cursor=''; } }
      else if(id!=null) moveHov(ev); }).catch(()=>{}); }); });
  view.on('pointer-leave',()=>{ last=null; if(hl){hl.remove();hl=null;} $('#ixHov').classList.remove('on'); chartsHighlight(null); });
  view.on('click',()=>$('#ixHov').classList.remove('on'));
  require(['esri/core/reactiveUtils','esri/geometry/support/webMercatorUtils'],(ru,wmu)=>{ P.wmu=wmu;
    ru.when(()=>view.stationary,()=>{ if(!P.ext) return; P.extGeo=wmu.webMercatorToGeographic(view.extent); render(); });
    if(P.pendM){ const m=P.pendM; P.pendM=null; setTimeout(()=>view.goTo({center:[m[0],m[1]],zoom:m[2]},{animate:false}).then(()=>{ setExt(true); }).catch(()=>{}),900); } });
  applyEffect(); themeMaps();
}
const iv=setInterval(()=>{ if(typeof view!=='undefined'&&view&&lyr.aut){ clearInterval(iv); view.whenLayerView(lyr.aut).then(hookMap); } },300);
const ext=$('#ixExt');
function setExt(on){ P.ext=on; ext.checked=on; if(on){ ensureConn().then(()=>{ window.AGEO_READY=true; P.extGeo=P.wmu&&view?P.wmu.webMercatorToGeographic(view.extent):null; render(); }); } else render(); }
ext.onchange=()=>setExt(ext.checked);

/* ---------- tema ---------- */
function themeCharts(){
  const t=T();
  try{ cStatus.setOption({series:[{itemStyle:{borderColor:t.card},label:{rich:{v:{color:t.ink},l:{color:t.muted}}}}]}); }catch(e){}
  try{ const o=cReq.getOption(); cReq.setOption({xAxis:{splitLine:{lineStyle:{color:t.grid}},axisLabel:{color:t.muted}},yAxis:{axisLine:{lineStyle:{color:t.axis}},axisLabel:{color:t.ink}},
    series:o.series.map(s=>s.name==='_tot'?{label:{color:t.ink2}}:{itemStyle:{borderColor:t.card}})}); }catch(e){}
  try{ cUF.setOption({xAxis:{axisLine:{lineStyle:{color:t.axis}},axisLabel:{color:t.ink}},yAxis:{splitLine:{lineStyle:{color:t.grid}},axisLabel:{color:t.muted}},series:[{label:{color:t.ink2}}]}); }catch(e){}
}
function themeMaps(){
  const swap=(v,sel)=>{ if(!v) return; const s=$(sel); if(dark()&&s.value==='lgray'){ s.value='dgray'; v.map.basemap=BASEMAPS.dgray; s.dataset.ixAuto='1'; }
    else if(!dark()&&s.dataset.ixAuto&&s.value==='dgray'){ s.value='lgray'; v.map.basemap=BASEMAPS.lgray; delete s.dataset.ixAuto; } };
  swap(view,'#baseSel'); swap(typeof view2!=='undefined'?view2:null,'#baseSel2');
}
function setTheme(t,silent){
  document.documentElement.dataset.theme=t; $('#ixTheme').innerHTML=t==='dark'?'☀ <span>Claro</span>':'☾ <span>Escuro</span>'; store.set('saffp_tema',t);
  if(silent) return; render(); periodChart(true); themeMaps();
}
$('#ixTheme').onclick=()=>setTheme(dark()?'light':'dark');
setTheme(store.get('saffp_tema','light'),true);
document.querySelector('.tab[data-t="det"]').addEventListener('click',()=>setTimeout(themeMaps,1500));

/* ---------- personalizar ---------- */
const LKEY='saffp_layout:'+location.pathname;
const blockEl=id=>$(`[data-ix="${id}"]`);
function saveLayout(){ const order={}; $$('[data-ix]').forEach(el=>{ const p=el.parentElement; const k=(p.className||'p').split(' ')[0]+':'+[...p.parentElement.children].indexOf(p); (order[k]=order[k]||[]).push(el.dataset.ix); });
  store.set(LKEY,{hidden:BLOCKS.filter(b=>blockEl(b.id).classList.contains('ix-hide')).map(b=>b.id),order}); }
function layoutFix(){ $('#tabOv section.main').classList.toggle('ix-nomap',mapcard.classList.contains('ix-hide')); resizeAll(); }
function applyLayout(L){ if(!L) return; (L.hidden||[]).forEach(id=>{ const el=blockEl(id); if(el) el.classList.add('ix-hide'); });
  Object.values(L.order||{}).forEach(ids=>{ const els=ids.map(blockEl).filter(Boolean); if(els.length<2) return; const p=els[0].parentElement; if(els.some(e=>e.parentElement!==p)) return;
    const a=document.createComment('ix'); p.insertBefore(a,els[0]); els.forEach(e=>p.insertBefore(e,a)); a.remove(); }); layoutFix(); }
function openPop(id,btn){ $$('.ix-pop').forEach(p=>{ if(p.id!==id) p.classList.remove('on'); }); const p=$('#'+id); if(p.classList.contains('on')){ p.classList.remove('on'); return false; }
  const b=btn.getBoundingClientRect(); p.style.top=(b.bottom+8)+'px'; p.style.left=Math.max(10,Math.min(innerWidth-320,b.right-310))+'px'; p.classList.add('on'); return true; }
$('#ixCustom').onclick=e=>{ $('#ixList').innerHTML=BLOCKS.map(b=>`<label><input type="checkbox" data-id="${b.id}" ${blockEl(b.id).classList.contains('ix-hide')?'':'checked'}> ${esc(b.label)}</label>`).join('');
  $$('#ixList input').forEach(i=>i.onchange=()=>{ blockEl(i.dataset.id).classList.toggle('ix-hide',!i.checked); saveLayout(); layoutFix(); }); openPop('ixPopC',e.currentTarget); };
$('#ixOk').onclick=()=>$('#ixPopC').classList.remove('on');
$('#ixReset').onclick=()=>{ store.set(LKEY,null); location.reload(); };
let dragEl=null;
$$('[data-ix]').forEach(el=>{
  const h=el.querySelector('.ix-h'); if(h){ h.onmousedown=()=>{ el.draggable=true; }; h.onmouseup=()=>{ el.draggable=false; }; }
  el.addEventListener('dragstart',e=>{ if(!el.draggable) return; dragEl=el; el.classList.add('ix-drag'); e.dataTransfer.effectAllowed='move'; try{e.dataTransfer.setData('text/plain',el.dataset.ix);}catch(x){} });
  el.addEventListener('dragend',()=>{ el.classList.remove('ix-drag'); el.draggable=false; $$('.ix-before,.ix-after').forEach(x=>x.classList.remove('ix-before','ix-after')); dragEl=null; });
  el.addEventListener('dragover',e=>{ if(!dragEl||dragEl===el||dragEl.parentElement!==el.parentElement) return; e.preventDefault(); const r=el.getBoundingClientRect(); const after=e.clientY>r.top+r.height/2; el.classList.toggle('ix-after',after); el.classList.toggle('ix-before',!after); });
  el.addEventListener('dragleave',()=>el.classList.remove('ix-before','ix-after'));
  el.addEventListener('drop',e=>{ if(!dragEl||dragEl===el||dragEl.parentElement!==el.parentElement) return; e.preventDefault(); const after=el.classList.contains('ix-after'); el.classList.remove('ix-before','ix-after');
    el.parentElement.insertBefore(dragEl,after?el.nextSibling:el); saveLayout(); resizeAll(); toast('Ordem salva'); });
});
applyLayout(store.get(LKEY,null));

/* ---------- link da visão ---------- */
function viewLink(){ const s={}; Object.entries(S).forEach(([k,v])=>{ if(v!=null) s[k]=v; }); const o={f:s};
  if(P.range) o.p=[P.range[0]+P.k0,P.range[1]+P.k0]; if(dark()) o.t='dark';
  if(P.ext&&view) o.m=[+view.center.longitude.toFixed(4),+view.center.latitude.toFixed(4),+view.zoom.toFixed(2)];
  return location.href.split('#')[0]+'#visao='+encodeURIComponent(JSON.stringify(o)); }
function readLink(){ const m=/#visao=([^&]+)/.exec(location.hash); if(!m) return false;
  try{ const o=JSON.parse(decodeURIComponent(m[1])); Object.entries(o.f||{}).forEach(([k,v])=>{ if(k in S) S[k]=v; });
    if(o.p){ const a=o.p[0]-P.k0,b=o.p[1]-P.k0; if(b>=0&&a<P.n) P.range=[Math.max(0,a),Math.min(P.n-1,b)]; }
    if(o.t==='dark') setTheme('dark',true); if(o.m) P.pendM=o.m; return true; }catch(e){ return false; } }
$('#ixShare').onclick=async e=>{ const url=viewLink(), btn=e.currentTarget;
  try{ await navigator.clipboard.writeText(url); toast('Link desta visão copiado'); }catch(x){ $('#ixLink').value=url; if(openPop('ixPopS',btn)){ $('#ixLink').focus(); $('#ixLink').select(); } } };
$('#ixOkS').onclick=()=>$('#ixPopS').classList.remove('on');

/* ---------- etiquetas e "Limpar filtros" ---------- */
function extraTags(){
  const a=$('#fActive');
  if(P.range&&!P.play){ const b=document.createElement('button'); b.className='tag ix-range'; b.textContent=`${plabel(P.range[0],true)} – ${plabel(P.range[1],true)}`; b.title='Período de publicação'; b.onclick=()=>{ P.range=null; syncZoom(); lastKey=null; render(); }; a.appendChild(b); }
  if(P.ext){ const b=document.createElement('button'); b.className='tag'; b.textContent='Área visível no mapa'; b.onclick=()=>setExt(false); a.appendChild(b); }
  if((P.range&&!P.play)||P.ext) $('#fClear').hidden=false;
}
$('#fClear').addEventListener('click',()=>{ if(P.range||P.ext){ P.range=null; P.ext=false; ext.checked=false; syncZoom(); lastKey=null; render(); } });

/* ---------- passeio guiado ---------- */
let TS=0,STEPS=[];
function resetAll(){ Object.keys(S).forEach(k=>S[k]=null); P.range=null; P.ext=false; ext.checked=false; hoverW=null; syncZoom(); lastKey=null; }
function buildTour(){
  const tot=D.length, km=sum(D,'km');
  const reg=REGIOES.map(r=>[r,sum(D.filter(x=>x.regiao===r),'km')]).sort((a,b)=>b[1]-a[1])[0];
  const byReq={}; D.forEach(r=>byReq[r.req]=(byReq[r.req]||0)+r.km); const rq=Object.entries(byReq).sort((a,b)=>b[1]-a[1])[0];
  const cel=D.filter(r=>r.status==='Contrato Celebrado');
  STEPS=[
    {t:'Visão geral',x:`São ${tot} trechos de autorização ferroviária, somando ${nf(km,0)} km e R$ ${nf(sum(D,'inv'),1)} bilhões de investimento previsto. Indicadores, gráficos e mapa respondem juntos a cada filtro.`,spot:['kpis','map'],
      go:()=>{ resetAll(); render(); }},
    {t:'Onde se concentram',x:`A região ${reg[0]} reúne ${nf(reg[1],0)} km (${nf(100*reg[1]/km,0)}% da extensão). Com o filtro aplicado, o mapa se aproxima e destaca os estados da região.`,spot:['reg','map','kpis'],
      go:()=>{ resetAll(); S.regiao=reg[0]; render(); }},
    {t:'Maior requerente',x:`${rq[0]} é o requerente com mais extensão: ${nf(rq[1],0)} km. Os trechos dele acendem no mapa e os demais ficam em cinza — o mesmo acontece ao passar o mouse em qualquer barra ou fatia.`,spot:['req','map'],
      go:()=>{ resetAll(); render(); setTimeout(()=>{ hover('REQUERENTE='+q(rq[0])); const ri=(cReq.getOption().yAxis[0].data||[]).indexOf(rq[0]); if(ri>=0) cReq.dispatchAction({type:'highlight',seriesIndex:0,dataIndex:ri}); },400); }},
    {t:'Situação dos trechos',x:`${cel.length} trechos têm contrato celebrado (${nf(100*cel.length/tot,0)}%), somando ${nf(sum(cel,'km'),0)} km. Clique numa fatia ou num item da legenda para filtrar o painel inteiro.`,spot:['status','map'],
      go:()=>{ hover("STATUS='Contrato Celebrado'"); cStatus.dispatchAction({type:'highlight',seriesIndex:0,dataIndex:0}); }}];
  if(P.n>1&&!blockEl('period').classList.contains('ix-hide')) STEPS.push({t:'Evolução no tempo',x:'A linha do tempo reproduz as publicações mês a mês: os trechos publicados no mês acendem no mapa e os indicadores acompanham. Arraste as alças amarelas para escolher um período.',spot:['period','map','kpis'],
    go:()=>{ hover(null); blockEl('period').scrollIntoView({behavior:'smooth',block:'center'}); setTimeout(()=>{ if(!P.play) play(); },700); }});
  STEPS.push({t:'Agora é com você',x:'Passe o mouse em barras e trechos, clique para filtrar ou abrir a ficha, use “Só a área visível”, troque o tema e monte sua tela em “Personalizar”. A aba “Detalhes ferroviários”, a seleção de camadas e a legenda continuam como antes.',spot:[],
    go:()=>{ if(P.play) stopPlay(); resetAll(); render(); window.scrollTo({top:0,behavior:'smooth'}); }});
}
function tourGo(i){
  TS=i; const s=STEPS[i]; $('#ixTS').textContent=`Passo ${i+1} de ${STEPS.length}`; $('#ixTT').textContent=s.t; $('#ixTX').textContent=s.x;
  $('#ixTD').innerHTML=STEPS.map((x,j)=>`<i class="${j===i?'on':''}"></i>`).join(''); $('#ixTN').textContent=i===STEPS.length-1?'Concluir':'Próximo';
  if(P.play&&s.spot[0]!=='period') stopPlay(); hover(null); chartsHighlight(null);
  $$('.ix-spot').forEach(e=>e.classList.remove('ix-spot')); s.spot.forEach(id=>{ const el=blockEl(id); if(el&&!el.classList.contains('ix-hide')) el.classList.add('ix-spot'); });
  document.body.classList.toggle('ix-touring',s.spot.length>0); s.go();
  const first=s.spot.map(blockEl).find(e=>e&&!e.classList.contains('ix-hide')); if(first&&s.spot[0]!=='period') first.scrollIntoView({behavior:'smooth',block:'center'});
}
function tourEnd(){ $('#ixTourBox').classList.remove('on'); document.body.classList.remove('ix-touring'); $$('.ix-spot').forEach(e=>e.classList.remove('ix-spot')); if(P.play) stopPlay(); hover(null); chartsHighlight(null); }
$('#ixTour').onclick=()=>{ if(!P.inited) return; if(TAB!=='ov') showTab('ov'); buildTour(); $('#ixTourBox').classList.add('on'); tourGo(0); };
$('#ixTN').onclick=()=>{ TS<STEPS.length-1?tourGo(TS+1):tourEnd(); };
$('#ixTE').onclick=tourEnd;
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ if($('#ixTourBox').classList.contains('on')) tourEnd(); $$('.ix-pop').forEach(p=>p.classList.remove('on')); } });
document.addEventListener('click',e=>{ if(!e.target.closest('.ix-pop,#ixCustom,#ixShare')) $$('.ix-pop').forEach(p=>p.classList.remove('on')); });

/* ---------- a cada atualização ---------- */
const baseRender=render;
render=function(){
  if(!P.inited&&D.length){ P.inited=true; if(!prepDates()) sec.remove(); if(readLink()) lastKey=null; }
  baseRender();
  if(!P.inited) return;
  periodChart(!EP); themeCharts(); kpiFx(rows()); extraTags(); applyEffect();
};
window.addEventListener('resize',()=>{ if(EP) EP.resize(); });
document.querySelector('.tab[data-t="ov"]').addEventListener('click',resizeAll);
})();
