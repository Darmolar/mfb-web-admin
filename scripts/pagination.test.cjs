const {test}=require('node:test');const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),ts=require('typescript');const ex={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/pagination.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:ex});
test('all records remain searchable beyond the first page',async()=>{const calls=[];const data=await ex.allPages(async page=>{calls.push(page);return {data:{totalElements:3,content:page===0?[{id:1},{id:2}]:[{id:3}]}}});assert.equal(data.content.length,3);assert.deepEqual(calls,[0,1]);});
test('valid empty dataset stays empty',async()=>{const data=await ex.allPages(async()=>({data:{totalElements:0,content:[]}}));assert.equal(data.content.length,0);});
test('missing or repeated pages are surfaced, not reported as complete',async()=>{await assert.rejects(ex.allPages(async()=>({data:{totalElements:3,content:[{id:1}]}})),/incomplete/);await assert.rejects(ex.allPages(async page=>({data:{totalElements:3,content:page?[]:[{id:1}]}})),/incomplete/);});
