const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const compile=file=>ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
function apiFor(response){const modules={},seen=[];function load(file){if(modules[file])return modules[file];const exports={};modules[file]=exports;vm.runInNewContext(compile(file),{exports,require:n=>n==='./config'?{API_BASE_URL:'https://backend.test/api/v1',ADMIN_API_KEY:''}:n==='./productCodes'?load('src/api/productCodes.ts'):n==='./types'?load('src/api/types.ts'):(()=>{throw Error(n)})(),localStorage:{getItem:()=>null,removeItem:()=>{}},sessionStorage:{removeItem:()=>{}},window:{location:{reload:()=>{}}},fetch:async(url,init)=>{seen.push({url,init});return{ok:true,status:200,json:async()=>response}}});return exports}return{api:load('src/api/index.ts'),seen}}

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
