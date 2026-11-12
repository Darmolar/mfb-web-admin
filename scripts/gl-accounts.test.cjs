// Savings GL (2026-11-08): GET /settings/gl lists gl.account.savings beside the loan and card fee accounts;
// PUT /settings/gl/accounts takes savingsGlAccount. Savings top-ups credit it, else savings.account.pool.
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const compile=file=>ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
function apiFor(response){const modules={},seen=[];function load(file){if(modules[file])return modules[file];const exports={};modules[file]=exports;vm.runInNewContext(compile(file),{exports,require:n=>n==='./config'?{API_BASE_URL:'https://backend.test/api/v1',ADMIN_API_KEY:''}:n==='./kycConfiguration'?load('src/api/kycConfiguration.ts'):n==='./productCodes'?load('src/api/productCodes.ts'):n==='./types'?load('src/api/types.ts'):(()=>{throw Error(n)})(),localStorage:{getItem:()=>null,removeItem:()=>{}},sessionStorage:{removeItem:()=>{}},window:{location:{reload:()=>{}}},fetch:async(url,init)=>{seen.push({url,init});return{ok:true,status:200,json:async()=>response}}});return exports}return{api:load('src/api/index.ts'),seen}}
const plain=v=>JSON.parse(JSON.stringify(v));

test('savings GL is read from gl.account.savings next to the loan and card fee accounts',async()=>{
  const s=apiFor({success:true,data:{'gl.account.loan':'1000200030','gl.account.card.fee':'1000200040','gl.account.savings':'1000200050','savings.account.pool':'1000999999'}});
  const res=await s.api.getGlAccounts();
  assert.equal(s.seen[0].url,'https://backend.test/api/v1/bank-admin/settings/gl');
  assert.deepEqual(plain(res.data),{loanGlAccount:'1000200030',savingsGlAccount:'1000200050',cardFeeAccount:'1000200040',savingsPoolAccount:'1000999999'});
});
test('camelCase and { key, value } list replies are read the same way; a missing savings GL stays empty',async()=>{
  assert.equal((await apiFor({success:true,data:{savingsGlAccount:'42'}}).api.getGlAccounts()).data.savingsGlAccount,'42');
  assert.equal((await apiFor({success:true,data:[{key:'gl.account.savings',value:'77'}]}).api.getGlAccounts()).data.savingsGlAccount,'77');
  assert.equal((await apiFor({success:true,data:{'gl.account.loan':'1','gl.account.savings':''}}).api.getGlAccounts()).data.savingsGlAccount,undefined);
});
test('saving sends savingsGlAccount to PUT /settings/gl/accounts with only the changed fields',async()=>{
  const s=apiFor({success:true,data:{}});
  await s.api.updateGlAccounts({savingsGlAccount:'1000200050'});
  assert.equal(s.seen[0].url,'https://backend.test/api/v1/bank-admin/settings/gl/accounts');
  assert.equal(s.seen[0].init.method,'PUT');
  assert.deepEqual(JSON.parse(s.seen[0].init.body),{savingsGlAccount:'1000200050'});
});
test('the GL settings screen offers the savings account and explains the pool fallback',()=>{
  const src=fs.readFileSync('src/components/settings/GlSettings.tsx','utf8');
  assert.match(src,/id: 'savingsGlAccount', label: 'Savings GL account'/);
  assert.match(src,/savings pool account/);
});
