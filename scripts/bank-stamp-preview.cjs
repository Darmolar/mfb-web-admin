// Offline preview of the production component; no authenticated API or bank stamp is used.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const tools = process.env.PREVIEW_TOOLS;
const esbuild = require(require.resolve('esbuild', { paths: [tools] }));
const { chromium } = require(require.resolve('playwright', { paths: [tools] }));
const output = path.resolve('../builds/bank-stamp-preview');
(async () => {
 fs.mkdirSync(output, { recursive: true });
 await esbuild.build({stdin:{contents:`import React from 'react'; import {createRoot} from 'react-dom/client'; import {BankStampSettings} from './src/components/settings/BankStampSettings'; createRoot(document.getElementById('root')).render(<main className="max-w-5xl mx-auto p-4"><p className="mb-4 text-sm text-slate-500">Admin / Settings / Bank Stamp · Offline preview</p><BankStampSettings /></main>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,jsx:'automatic',plugins:[{
  name:'offline-stamp-api',
  setup(build) {
   build.onResolve({filter:/^\.\.\/\.\.\/api$/},args=>args.importer.endsWith('BankStampSettings.tsx')?{path:'stamp-api',namespace:'offline'}:undefined);
   build.onLoad({filter:/.*/,namespace:'offline'},()=>({loader:'js',resolveDir:process.cwd(),contents:`
    import {ApiError} from './src/api/types';
    window.stampCalls=[];
    let state=null;
    const saved=next=>({stampId:'preview',isEnabled:false,version:1,contentType:'image/png',width:300,height:120,sizeBytes:2048,previewUrl:null,updatedAt:'2026-10-15T12:00:00Z',updatedBy:'preview-admin',...next});
    export async function getBankStamp(){window.stampCalls.push('GET');if(!state)throw new ApiError('Bank stamp not found.',404,'NOT_FOUND');return {data:{success:true,data:{...state}}};}
    export async function uploadBankStamp(file){window.stampCalls.push('PUT');if(!file.size)throw Error('Empty file');state=saved({version:(state?.version??0)+1});return {};}
    export async function updateBankStamp(next){window.stampCalls.push('PATCH');state=saved({...state,isEnabled:next.enabled,version:state.version+1});return {};}
    export async function deleteBankStamp(){window.stampCalls.push('DELETE');state=null;return {};}
   `}));
  }
 }],outfile:path.join(output,'app.js')});
 const css = fs.readdirSync('dist/assets').find(name=>name.endsWith('.css'));
 fs.copyFileSync(path.join('dist/assets',css),path.join(output,'style.css'));
 fs.writeFileSync(path.join(output,'index.html'),'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin bank stamp preview</title><link rel="stylesheet" href="style.css"></head><body><div id="root"></div><script src="app.js"></script></body></html>');
 const server=http.createServer((req,res)=>{const name=({'/':'index.html','/app.js':'app.js','/style.css':'style.css'})[req.url]; if(!name){res.writeHead(404);return res.end();} res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(path.join(output,name)));});
 await new Promise(resolve=>server.listen(5189,'0.0.0.0',resolve));
 const browser=await chromium.launch({headless:true,executablePath:process.env.PREVIEW_BROWSER});
 try {
  const page=await browser.newPage({viewport:{width:1100,height:900}});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5189');
  const file=page.getByLabel('Scanned bank stamp'), toggle=page.getByRole('checkbox');
  await page.getByText('No stamp has been uploaded yet.').waitFor();
  assert.equal(await page.getByRole('button',{name:'Upload stamp'}).isDisabled(),true);
  await file.setInputFiles({name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});
  await page.getByRole('alert').filter({hasText:'Choose a PNG or JPEG'}).waitFor();
  await file.setInputFiles({name:'large.png',mimeType:'image/png',buffer:Buffer.alloc(2097153)});
  await page.getByRole('alert').filter({hasText:'no larger than 2 MB'}).waitFor();
  await file.setInputFiles({name:'broken.png',mimeType:'image/png',buffer:Buffer.from('broken')});
  await page.getByRole('alert').filter({hasText:'could not be read'}).waitFor();
  const png=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=300;canvas.height=120;const c=canvas.getContext('2d');c.fillStyle='#334155';c.font='24px sans-serif';c.fillText('SAMPLE — NOT VALID',12,65);return canvas.toDataURL().split(',')[1];});
  await file.setInputFiles({name:'sample-only.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await page.getByAltText('Selected bank stamp').waitFor();
  await page.getByRole('button',{name:'Upload stamp'}).click();
  await page.getByText('Stamp uploaded. Review it below and turn stamped statements on when ready.').waitFor();
  await toggle.check();
  await page.getByRole('button',{name:'Save setting'}).click();
  await page.getByText('Stamp setting saved.').waitFor();
  await page.getByRole('button',{name:'Refresh settings'}).click();
  await page.getByText('Settings refreshed.').waitFor();
  assert.equal(await toggle.isChecked(),true);
  await page.screenshot({path:path.join(output,'admin-form.png'),fullPage:true});
  page.on('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Delete saved stamp'}).click();
  await page.getByText('Stamp deleted.').waitFor();
  assert.equal(await toggle.isChecked(),false);
  const methods=await page.evaluate(()=>window.stampCalls);
  assert.equal(methods.filter(m=>m==='PUT').length,1);
  assert.equal(methods.filter(m=>m==='PATCH').length,1);
  assert.equal(methods.filter(m=>m==='DELETE').length,1);
  assert.ok(methods.filter(m=>m==='GET').length>=5);
  await page.setViewportSize({width:412,height:915});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),412);
  assert.deepEqual(errors,[]);
  console.log('Bank stamp checks passed: type, size, decoding, upload, save, read-back, deletion, mobile width. Preview http://127.0.0.1:5189');
 } finally { await browser.close(); if(!process.env.KEEP_PREVIEW)server.close(); }
})().catch(error=>{console.error(error);process.exit(1)});
