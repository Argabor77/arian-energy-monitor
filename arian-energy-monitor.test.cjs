const {test}=require('node:test');
const assert=require('node:assert/strict');
const {energy,calculate,normalize,range,aggregateStats,dashboardRange,deviceTotals,dayKey,moveDay}=require('./arian-energy-monitor.js');
const s=(state,unit)=>({state,attributes:{unit_of_measurement:unit}});
test('energy conversion',()=>{
  assert.equal(energy(s('1500','Wh')),1.5);
  assert.equal(energy(s('2','kWh')),2);
  assert.equal(energy(s('0.5','MWh')),500);
  assert.equal(energy(s('0','kWh')),0);
});
test('invalid, unavailable and non-energy values',()=>{
  for(const v of ['unavailable','unknown','',' ','NaN','-1','Infinity'])assert.equal(energy(s(v,'kWh')),null);
  assert.equal(energy(s('100','W')),null);
  assert.equal(energy(undefined),null);
});
test('totals, duplicates, sorting and offline',()=>{
  const c={devices:[{entity:'sensor.a'},{entity:'sensor.b'},{entity:'sensor.a'},{entity:'sensor.c'}]};
  const r=calculate(c,{'sensor.a':s('1500','Wh'),'sensor.b':s('3','kWh')});
  assert.equal(r.total,4.5);assert.equal(r.active,2);assert.equal(r.rows.length,3);
  assert.equal(r.rows[0].entity,'sensor.b');assert.equal(r.rows[2].v,null);
});
test('tariff defaults and free energy',()=>{
  assert.equal(normalize({tariff:-1}).tariff,.36);
  assert.equal(normalize({tariff:''}).tariff,.36);
  assert.equal(normalize({tariff:0}).tariff,0);
  assert.equal(normalize({tariff:.42}).tariff,.42);
  assert.deepEqual(normalize({devices:null}).devices,[]);
});
test('history aggregates devices without treating missing values as zero',()=>{
  const result=aggregateStats({'sensor.a':[{start:1000,change:1},{start:2000,change:null}], 'sensor.b':[{start:1000,change:2},{start:3000,change:0}]},['sensor.a','sensor.b']);
  assert.deepEqual(result.map(x=>x.total),[3,0]);
  assert.equal(Object.hasOwn(result[1].values,'sensor.a'),false);
});
test('historical time ranges',()=>{
  const now=new Date(2026,10,25,12);
  assert.equal(range('day',now).period,'hour');
  assert.equal(new Date(range('week',now).start).getDate(),19);
  assert.equal(new Date(range('month',now).start).getDate(),1);
  assert.equal(range('year',now).period,'month');
  assert.equal(new Date(range('year',now).start).getMonth(),0);
});
test('six month range spans calendar years and chosen day is bounded',()=>{
  const now=new Date(2026,0,15,12);
  const six=dashboardRange('six',null,now);
  assert.equal(dayKey(new Date(six.start)),'2025-08-01');
  assert.equal(six.period,'month');
  const selected=dashboardRange('selected','2026-01-15',now);
  assert.equal(selected.end,now.toISOString());
  assert.equal(selected.period,'hour');
  assert.equal(dayKey(new Date(dashboardRange('selected','2026-01-14',now).end)),'2026-01-15');
  assert.equal(moveDay('2026-01-01',-1),'2025-12-31');
});
test('day distribution distinguishes unavailable from measured zero',()=>{
  const data=aggregateStats({a:[{start:1000,change:2},{start:2000,change:1}],b:[{start:1000,change:0}]},['a','b','c']);
  assert.deepEqual(deviceTotals(data,['a','b','c']),[{id:'a',total:3},{id:'b',total:0},{id:'c',total:null}]);
});
test('single card renders all chart sections and handles date and unit switching',async()=>{
  const vm=require('node:vm'),fs=require('node:fs');
  class Element{constructor(tag='host'){this.tag=tag;this.children=[];this.textContent='';this.events={};this.attrs={};this.style={setProperty(){}};}append(...children){this.children.push(...children);}prepend(...children){this.children.unshift(...children);}replaceChildren(...children){this.children=children;}attachShadow(){this.shadowRoot=new Element();return this.shadowRoot;}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,fn){this.events[k]=fn;}}
  const registered=new Map(),context={HTMLElement:Element,document:{createElement:t=>new Element(t)},customElements:{get:t=>registered.get(t),define:(t,c)=>registered.set(t,c)},window:{}};
  vm.runInNewContext(fs.readFileSync(require.resolve('./arian-energy-monitor.js'),'utf8'),context);
  const card=new (registered.get('arian-energy-monitor'))(),requests=[];
  card.setConfig({devices:[{entity:'sensor.a',name:'Example'}],tariff:.36,language:'en'});
  card.hass={language:'en',states:{'sensor.a':s('10','kWh')},callWS:async r=>{requests.push(r);return {'sensor.a':[{start:Date.parse(r.start_time),change:2}]};}};
  await new Promise(resolve=>setImmediate(resolve));
  const walk=e=>[e,...e.children.flatMap(walk)],nodes=()=>walk(card.shadowRoot),find=t=>nodes().find(e=>e.textContent===t);
  for(const title of ['Consumption history','Weekly comparison','Last 6 months','Explore a day','Device distribution','Hourly consumption'])assert.ok(find(title),title);
  assert.ok(requests.some(r=>r.period==='month'));assert.ok(requests.some(r=>r.period==='hour'));
  find('Cost').events.click();assert.ok(nodes().some(e=>e.textContent.includes('€0.72')));
  const date=nodes().find(e=>e.tag==='input'&&e.type==='date');date.value='2025-12-01';date.events.change();await new Promise(resolve=>setImmediate(resolve));
  assert.ok(requests.some(r=>r.period==='hour'&&dayKey(new Date(r.start_time))==='2025-12-01'));
});
