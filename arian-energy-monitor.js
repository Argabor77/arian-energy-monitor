/* Arian Energy Monitor - v0.3.3 beta, MIT */
(() => {
  'use strict';
  const tag = 'arian-energy-monitor';
  const editorTag = tag + '-editor';
  const units = { Wh: 0.001, kWh: 1, MWh: 1000 };
  const palette = ['#35c9b3','#8fa8ff','#f5b465','#e68bc5','#6acbfa','#a6d875','#c6a0ff','#f18c80','#f9dc68','#5196df','#b88469','#e0a3e0'];
  const messages = {
    en: ['Energy & Costs','ENERGY MONITOR','Household energy at a glance','sensors available','MEASURED ENERGY','ESTIMATED COST','TOP CONSUMER','Meter readings','Energy × tariff','of measured energy','Devices','Sorted by consumption','Unavailable','Offline','Meter readings since last reset. Only monitored devices; not a bill. Unavailable sensors excluded.','Card title','Tariff per kWh','Energy sensor','Display name','Icon (mdi: or local:)','Color (optional)','Remove device','Add device','Language','Currency','Select sensor'],
    de: ['Energie & Kosten','ENERGIE MONITOR','Haushaltsenergie auf einen Blick','Sensoren verfügbar','ERFASSTER VERBRAUCH','GESCHÄTZTE KOSTEN','GRÖSSTER VERBRAUCHER','Kumulierte Zählerstände','Verbrauch × Stromtarif','des erfassten Verbrauchs','Gerätezähler','Nach Verbrauch sortiert','Nicht verfügbar','Offline','Zählerstände seit letzter Rückstellung. Nur erfasste Geräte, keine Monatsabrechnung. Nicht verfügbare Sensoren ausgeschlossen.','Kartentitel','Strompreis pro kWh','Energiesensor','Anzeigename','Symbol (mdi: oder local:)','Farbe (optional)','Gerät entfernen','Gerät hinzufügen','Sprache','Währung','Sensor auswählen'],
    tr: ['Enerji ve Maliyet','ENERJİ MONİTÖRÜ','Ev enerjisi bir bakışta','sensör kullanılabilir','ÖLÇÜLEN ENERJİ','TAHMİNİ MALİYET','EN ÇOK TÜKETEN','Birikimli sayaçlar','Tüketim × tarife','ölçülen tüketimin','Cihazlar','Tüketime göre sıralı','Kullanılamıyor','Çevrimdışı','Son sıfırlamadan itibaren sayaç değerleri. Yalnız ölçülen cihazlar; fatura değildir. Kullanılamayan sensörler hariçtir.','Kart başlığı','kWh başına tarife','Enerji sensörü','Görünen ad','Simge (mdi: veya local:)','Renk (isteğe bağlı)','Cihazı çıkar','Cihaz ekle','Dil','Para birimi','Sensör seç']
  };
  function normalize(c={}) {
    const rate = c.tariff === '' || c.tariff == null ? NaN : Number(c.tariff);
    return {...c, type:'custom:'+tag, tariff:Number.isFinite(rate)&&rate>=0?rate:0.36,
      currency:/^[A-Z]{3}$/.test(c.currency||'')?c.currency:'EUR',
      devices:Array.isArray(c.devices)?c.devices.filter(d=>d&&typeof d==='object').map(d=>({...d})):[]};
  }
  function energy(s) {
    if (!s || typeof s.state !== 'string' || !s.state.trim()) return null;
    const v=Number(s.state), f=units[s.attributes?.unit_of_measurement];
    return Number.isFinite(v)&&v>=0&&typeof f==='number'&&Number.isFinite(v*f)?v*f:null;
  }
  function calculate(c, states={}) {
    const seen=new Set();
    const rows=normalize(c).devices.filter(d=>typeof d.entity==='string'&&d.entity.startsWith('sensor.')&&!seen.has(d.entity)&&seen.add(d.entity))
      .map((d,i)=>({...d, accent:/^#[0-9a-f]{6}$/i.test(d.color||'')?d.color:palette[i%palette.length],v:energy(states[d.entity])}))
      .sort((a,b)=>(b.v??-1)-(a.v??-1));
    return {rows,total:rows.reduce((sum,d)=>sum+(d.v??0),0),active:rows.filter(d=>d.v!==null).length};
  }
  const historyText={en:['Consumption history','Today','7 days','This month','This year','Energy','Cost','Loading statistics…','No recorded energy statistics for this period.','Statistics could not be loaded.','Recorded consumption','Estimated at current tariff; missing statistics are not zero.','Refresh','No data'],de:['Verbrauchsverlauf','Heute','7 Tage','Dieser Monat','Dieses Jahr','Energie','Kosten','Statistiken werden geladen…','Keine aufgezeichneten Energiestatistiken für diesen Zeitraum.','Statistiken konnten nicht geladen werden.','Erfasster Verbrauch','Geschätzt zum aktuellen Tarif; fehlende Statistiken sind nicht null.','Aktualisieren','Keine Daten'],tr:['Tüketim geçmişi','Bugün','7 gün','Bu ay','Bu yıl','Enerji','Maliyet','İstatistikler yükleniyor…','Bu dönem için kayıtlı enerji istatistiği yok.','İstatistikler yüklenemedi.','Kaydedilen tüketim','Mevcut tarifeye göre tahmin; eksik istatistik sıfır değildir.','Yenile','Veri yok']};
  function range(mode,now=new Date()){
    const start=new Date(now);start.setHours(0,0,0,0);
    if(mode==='week')start.setDate(start.getDate()-6);
    if(mode==='month')start.setDate(1);
    if(mode==='year'){start.setDate(1);start.setMonth(0);}
    return {start:start.toISOString(),end:now.toISOString(),period:mode==='day'?'hour':mode==='year'?'month':'day'};
  }
  function aggregateStats(data,ids){
    const map=new Map();
    for(const id of ids)for(const row of data?.[id]||[]){
      const stamp=typeof row.start==='number'?row.start:Date.parse(row.start);
      if(!Number.isFinite(stamp)||typeof row.change!=='number'||!Number.isFinite(row.change)||row.change<0)continue;
      if(!map.has(stamp))map.set(stamp,{});map.get(stamp)[id]=row.change;
    }
    return [...map].sort((a,b)=>a[0]-b[0]).map(([stamp,values])=>({stamp,values,total:Object.values(values).reduce((a,b)=>a+b,0)}));
  }
  const dashboardText={en:['Weekly comparison','Last 6 months','Explore a day','Device distribution','Hourly consumption','Previous day','Next day','Today','Selected day','Stacked','Grouped','No measured consumption','Show or hide device','Recorded data only'],de:['Wochenvergleich','Letzte 6 Monate','Tag ansehen','Geräteverteilung','Stündlicher Verbrauch','Vorheriger Tag','Nächster Tag','Heute','Gewählter Tag','Gestapelt','Gruppiert','Kein gemessener Verbrauch','Gerät ein- oder ausblenden','Nur aufgezeichnete Daten'],tr:['Haftalık karşılaştırma','Son 6 ay','Gün incele','Cihaz dağılımı','Saatlik tüketim','Önceki gün','Sonraki gün','Bugün','Seçilen gün','Yığılmış','Gruplu','Ölçülen tüketim yok','Cihazı göster veya gizle','Yalnız kayıtlı veriler']};
  function dayKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function moveDay(key,offset){const d=new Date(key+'T12:00:00');d.setDate(d.getDate()+offset);return dayKey(d);}
  function dashboardRange(mode,key,now=new Date()){
    if(mode==='six'){const start=new Date(now);start.setDate(1);start.setHours(0,0,0,0);start.setMonth(start.getMonth()-5);return {start:start.toISOString(),end:now.toISOString(),period:'month'};}
    if(mode==='selected'){const start=new Date(key+'T00:00:00'),end=new Date(start);end.setDate(end.getDate()+1);return {start:start.toISOString(),end:new Date(Math.min(end.getTime(),now.getTime())).toISOString(),period:'hour'};}
    return range(mode,now);
  }
  function deviceTotals(data,ids){return ids.map(id=>{const values=data.filter(d=>Object.hasOwn(d.values,id)).map(d=>d.values[id]);return {id,total:values.length?values.reduce((a,b)=>a+b,0):null};}).sort((a,b)=>(b.total??-1)-(a.total??-1));}
  if(typeof module==='object'&&module.exports){module.exports={energy,calculate,normalize,range,aggregateStats,dashboardRange,deviceTotals,dayKey,moveDay};return;}
  const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
  const icon=name=>{const e=el('ha-icon');e.setAttribute('icon',name);return e;};
  function locale(c,h){const lang=(c.language||h?.language||'en').split('-')[0];return messages[lang]?lang:'en';}
  const css=`
    :host{display:block;container-type:inline-size}
    .wrap{padding:20px;box-sizing:border-box}
    .header,.brand,.caption{display:flex;align-items:center;gap:12px}
    .header,.caption{justify-content:space-between;flex-wrap:wrap}
    .header{margin-bottom:18px}.brand-icon{display:grid;place-items:center;width:54px;height:54px;border-radius:17px;background:linear-gradient(145deg,#08756b,#19a894);color:white}
    .brand-icon ha-icon{--mdc-icon-size:30px}.eyebrow{font-size:10px;letter-spacing:.16em;color:#35c9b3;font-weight:700}
    .title{font-size:26px;font-weight:700;line-height:1.2;margin:3px 0}.subtitle,.sub,.note,.energy,.percent{color:var(--secondary-text-color)}
    .subtitle,.energy{font-size:12px}.status{font-size:11px;border:1px solid var(--divider-color);padding:7px 11px;border-radius:99px}
    .summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:19px}
    .metric,.tile{border:1px solid var(--divider-color);border-radius:14px;padding:13px;min-width:0;background:var(--secondary-background-color)}
    .metric{background:linear-gradient(130deg,color-mix(in srgb,var(--accent) 12%,var(--card-background-color)),var(--secondary-background-color))}
    .metric-top{display:flex;align-items:center;gap:6px;font-size:10px;letter-spacing:.06em;font-weight:700;color:var(--primary-text-color)}
    .metric-top ha-icon{color:var(--accent);--mdc-icon-size:17px}.value{font-size:clamp(17px,2.8cqi,29px);font-weight:750;margin:8px 0 3px;overflow-wrap:anywhere}.sub,.note{font-size:11px}
    .caption{font-size:15px;font-weight:650;margin-bottom:10px}.list{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:9px}
    .tile{appearance:none;font:inherit;text-align:left;color:var(--primary-text-color);cursor:pointer;transition:border-color .15s}
    .tile:hover,.tile:focus-visible{border-color:var(--accent);outline:2px solid var(--accent);outline-offset:2px}
    .tile-top{display:flex;align-items:center;gap:9px;margin-bottom:10px}.bubble{display:grid;place-items:center;border-radius:12px;width:33px;height:33px;flex:none;background:color-mix(in srgb,var(--accent) 18%,transparent);color:var(--accent)}
    .bubble ha-icon{--mdc-icon-size:21px}.name{font-size:13px;font-weight:650;overflow-wrap:anywhere}.vals{display:flex;justify-content:space-between;align-items:baseline;gap:7px;flex-wrap:wrap}
    .price{font-size:20px;color:var(--primary-text-color);font-weight:750;white-space:nowrap}.bar{display:flex;align-items:center;gap:8px;margin-top:9px}
    .track{height:5px;flex:1;background:var(--divider-color);border-radius:10px;overflow:hidden}.fill{height:100%;background:var(--accent);border-radius:10px}.percent{font-size:10px;white-space:nowrap}.note{margin-top:15px;line-height:1.5}
    .history{margin-top:20px;padding:15px;border:1px solid var(--divider-color);border-radius:16px;background:var(--secondary-background-color)}.controls,.legend{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.controls{margin:10px 0}.controls button{font:inherit;font-size:12px;color:var(--primary-text-color);background:transparent;border:1px solid var(--divider-color);border-radius:9px;padding:7px 10px;cursor:pointer}.controls button[aria-pressed=true]{background:#08756b;color:white;border-color:#08756b}.chart-scroll{overflow-x:auto}.plot{display:flex;gap:5px;align-items:end;height:180px;border-bottom:1px solid var(--divider-color)}.column{flex:1;min-width:15px;height:100%;display:flex;flex-direction:column;justify-content:end;align-items:center}.stack{display:flex;flex-direction:column-reverse;width:80%;max-width:45px;border-radius:5px 5px 0 0;overflow:hidden;min-height:1px}.segment{min-height:0}.axis{font-size:9px;color:var(--secondary-text-color);white-space:nowrap;margin-top:5px}.legend{margin-top:12px;font-size:11px;gap:10px}.legend span{display:flex;align-items:center;gap:5px}.dot{width:9px;height:9px;border-radius:3px;display:inline-block}.history-total{font-size:22px;font-weight:700;margin:5px 0}.history-msg{padding:24px 0;color:var(--secondary-text-color);text-align:center}
    @container(max-width:560px){.wrap{padding:14px}.summary{grid-template-columns:1fr 1fr}.metric:last-child{grid-column:1/-1}.title{font-size:22px}.list{grid-template-columns:repeat(2,minmax(0,1fr))}.tile{padding:10px}.price{font-size:17px}}
    @container(max-width:310px){.list,.summary{grid-template-columns:1fr}}
    .history .caption{margin-bottom:6px}.chart-area{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px;align-items:stretch;margin-top:12px}.scale{height:180px;display:flex;flex-direction:column;justify-content:space-between;text-align:right;font-size:10px;color:var(--secondary-text-color);padding-bottom:18px;box-sizing:border-box}.chart-area .plot{background:repeating-linear-gradient(to top,transparent 0,transparent calc(25% - 1px),var(--divider-color) calc(25% - 1px),var(--divider-color) 25%);height:180px}.group{display:flex;align-items:flex-end;justify-content:center;gap:2px;width:100%;height:82%;max-width:105px}.group-bar{flex:1;max-width:15px;border-radius:4px 4px 0 0;min-width:2px}.legend button{display:flex;align-items:center;gap:4px;font:inherit;background:none;border:0;color:var(--primary-text-color);cursor:pointer;padding:4px}.legend button[aria-pressed=false]{opacity:.4;text-decoration:line-through}.day-date{font:inherit;color:var(--primary-text-color);background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:8px;padding:7px;color-scheme:light dark}.distribution{display:grid;gap:9px;margin-top:12px}.distrow{display:grid;grid-template-columns:minmax(80px,1fr) minmax(60px,2fr) auto;align-items:center;gap:8px;font-size:12px}.distrow .track{height:11px}.day-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.day-grid .history{margin-top:8px;min-width:0}.chart-detail{font-size:11px;color:var(--secondary-text-color);min-height:17px;margin-top:8px;white-space:pre-wrap}.column:focus-visible{outline:1px solid var(--primary-color)}@container(max-width:720px){.day-grid{grid-template-columns:1fr}.distrow{grid-template-columns:minmax(65px,1fr) minmax(40px,1fr) auto}}
  `;
  class Card extends HTMLElement {
    constructor(){super();this.attachShadow({mode:'open'});this.mode='week';this.chartUnit='energy';this.cache=new Map();this.selectedDay=dayKey(new Date());this.hiddenDevices=new Map();this.chartStyle='grouped';}
    static getConfigElement(){return document.createElement(editorTag);}
    static getStubConfig(){return {type:'custom:'+tag,tariff:0.36,devices:[]};}
    setConfig(c){this.config=normalize(c);this.render();}
    set hass(h){const old=this._hass;this._hass=h;if(!old||old.language!==h.language||this.config?.devices.some(d=>old.states[d.entity]!==h.states[d.entity]))this.render();}
    getCardSize(){return 22+Math.ceil((this.config?.devices.length||0)/2);}
    loadHistory(ids,key,force=false,r=range(this.mode)){
      const old=this.cache.get(key);if(!force&&old&&(old.pending||Date.now()-old.time<300000))return;
      if(!ids.length)return;const entry={pending:true,time:Date.now()};this.cache.set(key,entry);if(this.cache.size>40)this.cache.delete(this.cache.keys().next().value);
      this._hass.callWS({type:'recorder/statistics_during_period',start_time:r.start,end_time:r.end,period:r.period,statistic_ids:ids,types:['change'],units:{energy:'kWh'}}).then(data=>{entry.data=aggregateStats(data,ids);entry.pending=false;this.render();}).catch(()=>{entry.error=true;entry.pending=false;this.render();});
    }
    extraCharts(rows,l,fmt,money,name){
      const t=dashboardText[l],h=historyText[l],root=el('div'),ids=rows.map(d=>d.entity).sort(),today=dayKey(new Date());
      const value=n=>this.chartUnit==='cost'?money(n*this.config.tariff):fmt(n,3)+' kWh';
      const button=(label,fn,pressed)=>{const b=el('button',label);b.type='button';if(pressed!==undefined)b.setAttribute('aria-pressed',String(pressed));b.addEventListener('click',fn);return b;};
      const keyFor=mode=>mode+'|'+(mode==='selected'?this.selectedDay+'|':'')+ids.join('|');
      const get=(mode,force=false)=>{const key=keyFor(mode);this.loadHistory(ids,key,force,dashboardRange(mode,this.selectedDay));return this.cache.get(key);};
      const message=entry=>entry?.pending?h[7]:entry?.error?h[9]:h[8];
      const chart=(mode,title)=>{
        const section=el('section',undefined,'history'),head=el('div',undefined,'caption');head.append(el('span',title),el('span',this.chartUnit==='cost'?this.config.currency:'kWh','subtitle'));section.append(head);
        const entry=get(mode),data=entry?.data;if(entry?.pending||entry?.error||!data?.length){section.append(el('div',message(entry),'history-msg'));return section;}
        const hidden=this.hiddenDevices.get(mode)||new Set(),visible=rows.filter(r=>!hidden.has(r.entity)),grouped=this.chartStyle==='grouped'&&mode!=='selected';
        const shown=data.map(d=>({...d,total:visible.reduce((sum,r)=>sum+(d.values[r.entity]??0),0)}));
        const max=Math.max(0.000001,...shown.map(d=>grouped?Math.max(0,...visible.map(r=>d.values[r.entity]??0)):d.total));
        section.append(el('div',value(shown.reduce((s,d)=>s+d.total,0)),'history-total'));
        const area=el('div',undefined,'chart-area'),scale=el('div',undefined,'scale');for(const f of [1,.75,.5,.25,0])scale.append(el('span',value(max*f)));const scroll=el('div',undefined,'chart-scroll'),plot=el('div',undefined,'plot');plot.style.minWidth=Math.max(250,data.length*(grouped?Math.max(38,visible.length*5):22))+'px';
        const date=new Intl.DateTimeFormat(l,mode==='selected'?{hour:'2-digit',minute:'2-digit'}:mode==='six'?{month:'short',year:'2-digit'}:{day:'numeric',month:'short'}),detail=el('div',t[13],'chart-detail');
        for(const d of shown){const col=el('div',undefined,'column'),bars=el('div',undefined,grouped?'group':'stack');if(!grouped)bars.style.height=d.total/max*82+'%';col.tabIndex=0;const description=date.format(d.stamp)+' — '+value(d.total)+'\n'+visible.map(r=>name(r)+': '+(Object.hasOwn(d.values,r.entity)?value(d.values[r.entity]):h[13])).join('\n');col.title=description;col.setAttribute('aria-label',description);for(const event of ['mouseenter','focus','click'])col.addEventListener(event,()=>detail.textContent=description);
          for(const r of visible){const v=d.values[r.entity];if(!grouped&&!(v>0))continue;const bar=el('div',undefined,grouped?'group-bar':'segment');bar.style.background=r.accent;if(grouped)bar.style.height=(v>0?v/max*100:0)+'%';else bar.style.flex=String(v);bars.append(bar);}col.append(bars,el('span',date.format(d.stamp),'axis'));plot.append(col);}
        scroll.append(plot);area.append(scale,scroll);section.append(area,detail);const legend=el('div',undefined,'legend');for(const r of rows){const b=button(name(r),()=>{const set=this.hiddenDevices.get(mode)||new Set();if(set.has(r.entity))set.delete(r.entity);else set.add(r.entity);this.hiddenDevices.set(mode,set);this.render();},!hidden.has(r.entity));const dot=el('i',undefined,'dot');dot.style.background=r.accent;b.prepend(dot);b.title=t[12];legend.append(b);}section.append(legend);return section;
      };
      const opts=el('div',undefined,'controls');opts.append(button(t[10],()=>{this.chartStyle='grouped';this.render();},this.chartStyle==='grouped'),button(t[9],()=>{this.chartStyle='stacked';this.render();},this.chartStyle==='stacked'),button(h[5],()=>{this.chartUnit='energy';this.render();},this.chartUnit==='energy'),button(h[6],()=>{this.chartUnit='cost';this.render();},this.chartUnit==='cost'));root.append(opts,chart('week',t[0]),chart('six',t[1]));
      const day=el('section',undefined,'history'),nav=el('div',undefined,'controls'),input=el('input',undefined,'day-date');input.type='date';input.max=today;input.value=this.selectedDay;input.setAttribute('aria-label',t[8]);const select=k=>{if(k&&k<=today){this.selectedDay=k;this.render();}};input.addEventListener('change',()=>select(input.value));const next=button('› '+t[6],()=>select(moveDay(this.selectedDay,1)));next.disabled=this.selectedDay>=today;nav.append(button('‹ '+t[5],()=>select(moveDay(this.selectedDay,-1))),input,next,button(t[7],()=>select(today)),button(h[12],()=>{get('selected',true);this.render();}));day.append(el('div',t[2],'caption'),nav);
      const grid=el('div',undefined,'day-grid'),dist=el('section',undefined,'history');dist.append(el('div',t[3],'caption'));const entry=get('selected');if(entry?.pending||entry?.error||!entry?.data?.length)dist.append(el('div',message(entry),'history-msg'));else{const d=deviceTotals(entry.data,ids),sum=d.reduce((s,x)=>s+(x.total??0),0),list=el('div',undefined,'distribution');dist.append(el('div',value(sum),'history-total'));for(const item of d){const row=rows.find(r=>r.entity===item.id),line=el('div',undefined,'distrow'),track=el('div',undefined,'track'),fill=el('div',undefined,'fill');fill.style.background=row.accent;fill.style.width=(sum>0?(item.total??0)/sum*100:0)+'%';track.append(fill);line.append(el('span',name(row)),track,el('span',item.total===null?h[13]:value(item.total)));list.append(line);}dist.append(list);}grid.append(dist,chart('selected',t[4]));day.append(grid,el('div',h[11],'note'));root.append(day);return root;
    }
    history(rows,l,fmt,money,name){
      const t=historyText[l],box=el('section',undefined,'history'),controls=el('div',undefined,'controls'),ids=rows.map(d=>d.entity).sort(),key=this.mode+'|'+ids.join('|');
      const button=(label,pressed,action)=>{const b=el('button',label);b.type='button';if(pressed!==null)b.setAttribute('aria-pressed',String(pressed));b.addEventListener('click',action);return b;};
      box.append(el('div',t[0],'caption'));
      for(const [i,mode] of ['day','week','month','year'].entries())controls.append(button(t[i+1],this.mode===mode,()=>{this.mode=mode;this.render();}));
      controls.append(button(t[5],this.chartUnit==='energy',()=>{this.chartUnit='energy';this.render();}),button(t[6],this.chartUnit==='cost',()=>{this.chartUnit='cost';this.render();}),button('↻ '+t[12],null,()=>{this.loadHistory(ids,key,true);this.render();}));box.append(controls);
      this.loadHistory(ids,key);const entry=this.cache.get(key),raw=entry?.data,hidden=this.hiddenDevices.get('history')||new Set(),visible=rows.filter(r=>!hidden.has(r.entity));
      const legend=el('div',undefined,'legend');
      const labels={en:['Select all','Clear all','No devices selected'],de:['Alle auswählen','Auswahl aufheben','Keine Geräte ausgewählt'],tr:['Tümünü seç','Seçimi kaldır','Cihaz seçilmedi']}[l];
      const setHidden=set=>{this.hiddenDevices.set('history',set);this.render();};
      const actions=el('div',undefined,'controls');actions.append(button(labels[0],null,()=>setHidden(new Set())),button(labels[1],null,()=>setHidden(new Set(ids))));
      for(const row of rows){const item=button(name(row),!hidden.has(row.entity),()=>{const set=new Set(hidden);if(set.has(row.entity))set.delete(row.entity);else set.add(row.entity);setHidden(set);}),dot=el('i',undefined,'dot');dot.style.background=row.accent;item.prepend(dot);item.title=dashboardText[l][12];legend.append(item);}
      box.append(actions,legend);
      if(!visible.length){box.append(el('div',labels[2],'history-msg'));return box;}
      const data=raw?.filter(d=>visible.some(r=>Object.hasOwn(d.values,r.entity))).map(d=>({...d,total:visible.reduce((sum,r)=>sum+(d.values[r.entity]??0),0)}));
      if(entry?.pending||entry?.error||!data?.length){box.append(el('div',entry?.pending?t[7]:entry?.error?t[9]:t[8],'history-msg'));return box;}
      const value=n=>this.chartUnit==='cost'?money(n*this.config.tariff):fmt(n,3)+' kWh';
      box.append(el('div',value(data.reduce((s,d)=>s+d.total,0)),'history-total'),el('div',t[10],'sub'));
      const scroll=el('div',undefined,'chart-scroll'),plot=el('div',undefined,'plot'),max=Math.max(...data.map(d=>d.total),0.000001);plot.style.minWidth=Math.max(250,data.length*22)+'px';
      const date=new Intl.DateTimeFormat(l,this.mode==='day'?{hour:'2-digit',minute:'2-digit'}:this.mode==='year'?{month:'short'}:{day:'numeric',month:'short'});
      for(const d of data){const column=el('div',undefined,'column'),stack=el('div',undefined,'stack');stack.style.height=Math.max(0,d.total/max*82)+'%';column.title=date.format(d.stamp)+' — '+value(d.total)+'\n'+visible.map(r=>name(r)+': '+(Object.hasOwn(d.values,r.entity)?value(d.values[r.entity]):t[13])).join('\n');
        for(const row of visible){const v=d.values[row.entity];if(!(v>0))continue;const segment=el('div',undefined,'segment');segment.style.background=row.accent;segment.style.flex=String(v);stack.append(segment);}column.append(stack,el('span',date.format(d.stamp),'axis'));plot.append(column);}
      scroll.append(plot);box.append(scroll,el('div',t[11],'note'));return box;
    }
    render(){
      if(!this.config||!this._hass)return;
      const c=this.config,h=this._hass,l=locale(c,h),t=messages[l],{rows,total,active}=calculate(c,h.states);
      const fmt=(n,d=2)=>new Intl.NumberFormat(l,{minimumFractionDigits:d,maximumFractionDigits:d}).format(n);
      const money=n=>new Intl.NumberFormat(l,{style:'currency',currency:c.currency}).format(n);
      const card=el('ha-card'),wrap=el('div',undefined,'wrap'),header=el('div',undefined,'header'),brand=el('div',undefined,'brand'),badge=el('div',undefined,'brand-icon'),titles=el('div');
      badge.append(icon('mdi:lightning-bolt'));titles.append(el('div',t[1],'eyebrow'),el('div',c.title||t[0],'title'),el('div',t[2],'subtitle'));brand.append(badge,titles);
      header.append(brand,el('span',active+'/'+rows.length+' '+t[3],'status'));wrap.append(header);
      const summary=el('div',undefined,'summary');
      function metric(label,value,i,accent,sub){const box=el('div',undefined,'metric'),top=el('div',undefined,'metric-top');box.style.setProperty('--accent',accent);top.append(icon(i),el('span',label));box.append(top,el('div',value,'value'),el('div',sub,'sub'));return box;}
      const name=d=>d.name||h.states[d.entity]?.attributes.friendly_name||d.entity;
      const top=rows.find(d=>d.v>0);
      summary.append(metric(t[4],fmt(total)+' kWh','mdi:lightning-bolt',palette[0],t[7]),metric(t[5],money(total*c.tariff),'mdi:currency-eur',palette[1],t[8]),metric(t[6],top?name(top):'—','mdi:chart-donut',palette[2],top&&total>0?fmt(top.v/total*100,1)+' % '+t[9]:'—'));
      const caption=el('div',undefined,'caption');caption.append(el('span',t[10]),el('span',t[11],'subtitle'));wrap.append(summary,caption);
      const list=el('div',undefined,'list');
      for(const d of rows){
        const tile=el('button',undefined,'tile');tile.type='button';tile.style.setProperty('--accent',d.v===null?'#87929d':d.accent);tile.setAttribute('aria-label',name(d));
        tile.addEventListener('click',()=>this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:d.entity},bubbles:true,composed:true})));
        const head=el('div',undefined,'tile-top'),bubble=el('div',undefined,'bubble');bubble.append(icon(d.icon||'mdi:flash'));head.append(bubble,el('span',name(d),'name'));
        const vals=el('div',undefined,'vals');vals.append(el('span',d.v===null?t[12]:fmt(d.v,3)+' kWh','energy'),el('strong',d.v===null?'—':money(d.v*c.tariff),'price'));
        const pct=d.v!==null&&total>0?d.v/total*100:0,bar=el('div',undefined,'bar'),track=el('div',undefined,'track'),fill=el('div',undefined,'fill');fill.style.width=pct+'%';track.append(fill);bar.append(track,el('span',d.v===null?t[13]:fmt(pct,1)+' %','percent'));tile.append(head,vals,bar);list.append(tile);
      }
      wrap.append(list,el('div',t[14],'note'),this.history(rows,l,fmt,money,name),this.extraCharts(rows,l,fmt,money,name));card.append(wrap);const style=el('style');style.textContent=css;this.shadowRoot.replaceChildren(style,card);
    }
  }
  class Editor extends HTMLElement {
    constructor(){super();this.attachShadow({mode:'open'});}
    setConfig(c){this.config=normalize(c);this.render();}
    set hass(h){this._hass=h;if(!this.ready)this.render();}
    change(c){this.config=normalize(c);this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:this.config},bubbles:true,composed:true}));this.render();}
    render(){
      if(!this.config||!this._hass)return;this.ready=true;
      const c=this.config,h=this._hass,t=messages[locale(c,h)],root=el('div'),style=el('style');style.textContent=':host{display:block;padding:8px}label{display:grid;gap:5px;font-weight:600;margin:8px 0}input,select,button{font:inherit;box-sizing:border-box;color:var(--primary-text-color);background:var(--secondary-background-color);border:1px solid var(--divider-color);border-radius:8px;padding:9px;width:100%}button{cursor:pointer}.device{padding:12px;border:1px solid var(--divider-color);border-radius:12px;margin:12px 0}';
      const field=(label,value,cb,type='text')=>{const l=el('label',label),x=el('input');x.type=type;x.value=value??'';if(type==='number'){x.min='0';x.step='0.001';}x.addEventListener('change',()=>{if(x.checkValidity())cb(x.value);});l.append(x);return l;};
      const select=(label,value,options,cb)=>{const l=el('label',label),x=el('select');for(const [id,title] of options){const o=el('option',title);o.value=id;x.append(o);}x.value=value;x.addEventListener('change',()=>cb(x.value));l.append(x);return l;};
      root.append(select(t[23],c.language||'', [['','Auto'],['en','English'],['de','Deutsch'],['tr','Türkçe']],v=>this.change({...this.config,language:v})),field(t[15],c.title||'',v=>this.change({...this.config,title:v})),field(t[16],c.tariff,v=>{if(v!=='')this.change({...this.config,tariff:Number(v)});},'number'),field(t[24],c.currency,v=>this.change({...this.config,currency:v.toUpperCase()})));
      const sensors=Object.entries(h.states).filter(([k,s])=>k.startsWith('sensor.')&&Object.hasOwn(units,s.attributes.unit_of_measurement)).map(([id,s])=>[id,(s.attributes.friendly_name||id)+' ('+s.attributes.unit_of_measurement+')']).sort((a,b)=>a[1].localeCompare(b[1]));
      root.append(el('h3',t[10]));
      c.devices.forEach((d,i)=>{const box=el('div',undefined,'device'),update=(key,value)=>this.change({...this.config,devices:this.config.devices.map((x,j)=>j===i?{...x,[key]:value}:x)}),options=[['',t[25]],...sensors];
        if(d.entity&&!sensors.some(([id])=>id===d.entity))options.push([d.entity,d.entity]);
        box.append(select(t[17],d.entity||'',options,v=>update('entity',v)),field(t[18],d.name,v=>update('name',v)),field(t[19],d.icon,v=>update('icon',v)),field(t[20],d.color,v=>update('color',v)));
        const btn=el('button',t[21]);btn.type='button';btn.addEventListener('click',()=>this.change({...this.config,devices:this.config.devices.filter((_,j)=>j!==i)}));box.append(btn);root.append(box);
      });
      const add=el('button','+ '+t[22]);add.type='button';add.addEventListener('click',()=>this.change({...this.config,devices:[...this.config.devices,{entity:'',name:'',icon:'mdi:flash'}]}));root.append(add);
      this.shadowRoot.replaceChildren(style,root);
    }
  }
  if(!customElements.get(editorTag))customElements.define(editorTag,Editor);
  if(!customElements.get(tag))customElements.define(tag,Card);
  window.customCards=window.customCards||[];
  if(!window.customCards.some(c=>c.type===tag))window.customCards.push({type:tag,name:'Arian Energy Monitor',description:'Device energy and costs • visual editor',preview:true});
})();
