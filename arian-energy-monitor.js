/* Arian Energy Monitor — v0.3.0 beta, MIT */
(() => {
  'use strict';
  const tag = 'arian-energy-monitor';
  const editorTag = tag + '-editor';
  const units = { Wh: 0.001, kWh: 1, MWh: 1000 };
  const palette = ['#35c9b3','#8fa8ff','#f5b465','#e68bc5','#6acbfa','#a6d875','#c6a0ff','#f18c80'];
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
  if(typeof module==='object'&&module.exports){module.exports={energy,calculate,normalize};return;}
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
    @container(max-width:560px){.wrap{padding:14px}.summary{grid-template-columns:1fr 1fr}.metric:last-child{grid-column:1/-1}.title{font-size:22px}.list{grid-template-columns:repeat(2,minmax(0,1fr))}.tile{padding:10px}.price{font-size:17px}}
    @container(max-width:310px){.list,.summary{grid-template-columns:1fr}}
  `;
  class Card extends HTMLElement {
    constructor(){super();this.attachShadow({mode:'open'});}
    static getConfigElement(){return document.createElement(editorTag);}
    static getStubConfig(){return {type:'custom:'+tag,tariff:0.36,devices:[]};}
    setConfig(c){this.config=normalize(c);this.render();}
    set hass(h){const old=this._hass;this._hass=h;if(!old||old.language!==h.language||this.config?.devices.some(d=>old.states[d.entity]!==h.states[d.entity]))this.render();}
    getCardSize(){return 3+Math.ceil((this.config?.devices.length||0)/2);}
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
      const top=rows.find(d=>d.v!==null);
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
      wrap.append(list,el('div',t[14],'note'));card.append(wrap);const style=el('style');style.textContent=css;this.shadowRoot.replaceChildren(style,card);
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
