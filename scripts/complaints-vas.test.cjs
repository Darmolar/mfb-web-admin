const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const compile=file=>ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
function apiFor(response){const modules={},seen=[];function load(file){if(modules[file])return modules[file];const exports={};modules[file]=exports;vm.runInNewContext(compile(file),{exports,require:n=>n==='./config'?{API_BASE_URL:'https://backend.test/api/v1',ADMIN_API_KEY:''}:n==='./kycConfiguration'?load('src/api/kycConfiguration.ts'):n==='./productCodes'?load('src/api/productCodes.ts'):n==='./types'?load('src/api/types.ts'):(()=>{throw Error(n)})(),localStorage:{getItem:()=>null,removeItem:()=>{}},sessionStorage:{removeItem:()=>{}},window:{location:{reload:()=>{}}},fetch:async(url,init)=>{seen.push({url,init});return{ok:true,status:200,json:async()=>response}}});return exports}return{api:load('src/api/index.ts'),seen}}

test('complaints paginate, filter, fetch full details and respond with authenticated admin identity', async () => {
 const s=apiFor({success:true,data:{content:[],totalElements:0,totalPages:0}});
 await s.api.getComplaints({status:'OPEN',page:2,size:20});
 assert.equal(s.seen[0].url,'https://backend.test/api/v1/bank-admin/complaints?status=OPEN&page=2&size=20');
 await s.api.getComplaint('complaint-1'); assert.ok(s.seen[1].url.endsWith('/complaints/complaint-1'));
 await s.api.respondToComplaint('complaint-1',{adminId:'admin-1',response:'Resolved.',status:'RESOLVED'});
 assert.equal(s.seen[2].init.method,'POST');
 assert.deepEqual(JSON.parse(s.seen[2].init.body),{adminId:'admin-1',response:'Resolved.',status:'RESOLVED'});
 await s.api.getComplaints(); assert.ok(!s.seen[3].url.includes('status='));
});
test('VAS updates retain account strings, numeric rates and partial payloads',async()=>{
 const s=apiFor({success:true,message:'Updated'});
 await s.api.updateVasAccounts({cashbackAccount:'1100000004'});
 assert.deepEqual(JSON.parse(s.seen[0].init.body),{cashbackAccount:'1100000004'});
 await s.api.updateVasCashback({airtime:0.01}); assert.deepEqual(JSON.parse(s.seen[1].init.body),{airtime:0.01});
 await s.api.updateVasCharges({airtimeCharge:0}); assert.deepEqual(JSON.parse(s.seen[2].init.body),{airtimeCharge:0});
 assert.throws(()=>s.api.setVasEntry('other.setting','x'),/vas/);
});

// Exact samples from the backend's 2026-10-16 release notes.
test('backend sample: admin complaint list, detail and respond replies pass through unchanged', async () => {
 const item={id:'9c4d',submitterName:'Adewale James',submitterEmail:'adewale@gmail.com',subject:'Unable to make transfer',message:'I keep getting an error...',status:'OPEN',adminResponse:null,createdAt:'2026-09-28T17:00:00'};
 const list=apiFor({success:true,data:{content:[item],totalElements:14,totalPages:1}});
 const page=(await list.api.getComplaints({status:'OPEN'})).data;
 assert.equal(page.totalElements,14); assert.equal(page.content[0].submitterEmail,'adewale@gmail.com');
 assert.equal(list.seen[0].url,'https://backend.test/api/v1/bank-admin/complaints?status=OPEN&page=0&size=20');
 const one=apiFor({success:true,data:item});
 assert.equal((await one.api.getComplaint('9c4d')).data.message,'I keep getting an error...');
 const reply=apiFor({success:true,message:'Response sent to customer.',data:{id:'9c4d',status:'RESOLVED',adminResponse:'We have investigated...',respondedAt:'2026-09-28T18:05:00',respondedBy:'a1b2c3d4'}});
 const sent=await reply.api.respondToComplaint('9c4d',{adminId:'a1b2c3d4',response:'We have investigated and resolved the issue.'});
 assert.deepEqual(JSON.parse(reply.seen[0].init.body),{adminId:'a1b2c3d4',response:'We have investigated and resolved the issue.'});
 assert.equal(sent.data.status,'RESOLVED'); assert.equal(sent.message,'Response sent to customer.');
});
test('backend sample: VAS settings map and every update payload match the documented fields', async () => {
 const map={'vas.account.suspense':'1100000001','vas.account.prepayment':'1100000002','vas.account.income':'1100000003','vas.account.cashback':'1100000004','vas.charge.airtime':'0','vas.cashback.airtime':'0.01','vas.cashback.data':'0.005','vas.cashback.electricity':'0.02','vas.cashback.cable_tv':'0.015'};
 const get=apiFor({success:true,data:map});
 assert.deepEqual(JSON.parse(JSON.stringify((await get.api.getVasSettings()).data)),map);
 assert.ok(get.seen[0].url.endsWith('/bank-admin/settings/vas'));
 const s=apiFor({success:true,message:'Updated'});
 const accounts={suspenseAccount:'1100000001',prepaymentAccount:'1100000002',incomeAccount:'1100000003',bvnExpensesAccount:'1100000005',cashbackAccount:'1100000004'};
 await s.api.updateVasAccounts(accounts); assert.deepEqual(JSON.parse(s.seen[0].init.body),accounts); assert.equal(s.seen[0].init.method,'PUT');
 const charges={bvnCharge:50,ninCharge:50,billCharge:0,airtimeCharge:0,dataCharge:0,electricityCharge:0,cableTvCharge:0};
 await s.api.updateVasCharges(charges); assert.deepEqual(JSON.parse(s.seen[1].init.body),charges);
 const cashback={airtime:0.01,data:0.005,electricity:0.02,cableTv:0.015};
 await s.api.updateVasCashback(cashback); assert.deepEqual(JSON.parse(s.seen[2].init.body),cashback);
 await s.api.setVasEntry('vas.account.cashback','1100000004');
 assert.ok(s.seen[3].url.endsWith('/bank-admin/settings/vas/entry/vas.account.cashback'));
 assert.deepEqual(JSON.parse(s.seen[3].init.body),{value:'1100000004'});
});
test('VAS form shows the documented fractions as percentages', () => {
 const src=fs.readFileSync('src/components/settings/VasSettings.tsx','utf8');
 const fn=src.match(/const fractionToPercent = (\(v: string\) => .*)/)[1].replace('(v: string)','(v)');
 const toPercent=eval(fn);
 assert.deepEqual(['0.01','0.005','0.02','0.015'].map(toPercent),['1','0.5','2','1.5']);
 for (const key of ['vas.account.cashback','vas.cashback.airtime','vas.cashback.data','vas.cashback.electricity','vas.cashback.cable_tv']) assert.ok(src.includes(`'${key}'`),key);
});
