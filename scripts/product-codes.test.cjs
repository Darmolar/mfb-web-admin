const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const compile=file=>ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
function loadApi(response){const modules={};let request;
 function load(file){if(modules[file])return modules[file];const exports={};modules[file]=exports;vm.runInNewContext(compile(file),{exports,
  require:name=>name==='./config'?{API_BASE_URL:'https://backend.test/api/v1',ADMIN_API_KEY:''}:name==='./kycConfiguration'?load('src/api/kycConfiguration.ts'):name==='./productCodes'?load('src/api/productCodes.ts'):name==='./types'?load('src/api/types.ts'):(()=>{throw Error(name)})(),
  localStorage:{getItem:()=>null},fetch:async(url,init)=>{request={url,init};return {ok:response.ok,status:response.status,json:async()=>response.body}},
 });return exports;}
 return {api:load('src/api/index.ts'),get request(){return request}};
}
test('saves exact product codes as strings through the specified PUT path',async()=>{const s=loadApi({ok:true,status:200,body:{success:true}});await s.api.updateCbaProductCodes({individualProductCode:' 0208 ',corporateProductCode:'103'});assert.equal(s.request.url,'https://backend.test/api/v1/bank-admin/settings/cba/product-codes');assert.equal(s.request.init.method,'PUT');assert.deepEqual(JSON.parse(s.request.init.body),{individualProductCode:'0208',corporateProductCode:'103'});assert.equal(s.request.init.headers['X-Admin-Key'],undefined);});
test('invalid codes never send a request',()=>{const s=loadApi({});assert.throws(()=>s.api.updateCbaProductCodes({individualProductCode:'',corporateProductCode:'103'}),/digits/);assert.equal(s.request,undefined);});
test('empty 204 succeeds, explicit rejection does not claim success',async()=>{await loadApi({ok:true,status:204,body:null}).api.updateCbaProductCodes({individualProductCode:'208',corporateProductCode:'103'});await assert.rejects(loadApi({ok:true,status:200,body:{success:false,message:'Rejected'}}).api.updateCbaProductCodes({individualProductCode:'208',corporateProductCode:'103'}),/Rejected/);await assert.rejects(loadApi({ok:false,status:500,body:{message:'Failed'}}).api.updateCbaProductCodes({individualProductCode:'208',corporateProductCode:'103'}),/Failed/);});
test('development proxy injects server credentials only on the local authenticated settings route',()=>{
 const exports={};vm.runInNewContext(compile('vite.config.ts'),{exports,process:{cwd:()=>'.'},require:name=>name==='vite'?{defineConfig:v=>v,loadEnv:()=>({VITE_API_PROXY_TARGET:'https://backend.test',BANK_ADMIN_API_KEY:'test-only-key',BANK_ADMIN_USERNAME:'test-admin'})}:()=>null});
 const proxy=exports.default({mode:'development'}).server.proxy['/api'];let handler;proxy.configure({on:(_event,callback)=>{handler=callback}});
 function run(address,authorization,path='/api/v1/bank-admin/settings/cba/product-codes'){const headers={};handler({removeHeader:key=>{delete headers[key]},setHeader:(key,value)=>{headers[key]=value}},{method:'PUT',url:path,socket:{remoteAddress:address},headers:{authorization}});return headers;}
 assert.equal(run('127.0.0.1','Bearer test')['X-Admin-Username'],'test-admin');assert.equal(run('127.0.0.1','Bearer test')['X-Admin-Key'],'test-only-key');assert.deepEqual(run('192.168.1.10','Bearer test'),{});assert.deepEqual(run('127.0.0.1',undefined),{});assert.deepEqual(run('127.0.0.1','Bearer test','/api/v1/unrelated'),{});assert.equal(run('127.0.0.1','Bearer test','/api/v1/bank-admin/complaints')['X-Admin-Key'],'test-only-key');
});
