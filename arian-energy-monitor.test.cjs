const {test}=require('node:test');
const assert=require('node:assert/strict');
const {energy,calculate,normalize}=require('./arian-energy-monitor.js');
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
