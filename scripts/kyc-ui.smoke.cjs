const { chromium } = require(require.resolve('playwright', { paths: [process.env.KYC_BROWSER_TOOLS || process.cwd()] }));
const assert = require('node:assert/strict');
const path = require('node:path');
const output = process.env.KYC_DEMO_OUTPUT || path.resolve(__dirname, '../../docs/kyc-demo');
require('node:fs').mkdirSync(output, { recursive: true });
const fixture = structuredClone(require('../../docs/kyc-demo/fixtures.json'));
(async () => {
 const browser = await chromium.launch({...(process.env.KYC_BROWSER_PATH ? { executablePath: process.env.KYC_BROWSER_PATH } : {}), headless:true});
 const page = await browser.newPage({viewport:{width:1440,height:1080}});
 const errors=[]; page.on('pageerror', e=>{errors.push(e.message);console.error('Browser error:',e.message)});
 const calls=[]; let failDelete=false, failReview=false, failDetails=false;
 const submissions=[{id:'submission-1',processCode:'ADDRESS_CHANGE',customerName:'Test customer',status:'PENDING',submittedAt:'2026-10-02'}, {id:'submission-2',processCode:'NAME_CHANGE',customerName:'Test customer',status:'PENDING'}];
 await page.route('**/api/v1/**', async route=>{
  const req=route.request(), url=new URL(req.url()), pathname=url.pathname;
  let data={content:[],unreadCount:0}, status=200, message='';
  if(req.method()!=='GET') calls.push({url:pathname,method:req.method(),body:req.postData()?req.postDataJSON():undefined});
  const code=decodeURIComponent(pathname.split('/').at(-2));
  const id=decodeURIComponent(pathname.split('/').at(-1));
  if(pathname.endsWith('/kyc/processes')) {
   if(req.method()==='POST') { const p=req.postDataJSON(); fixture.processes.push({...p,active:true}); fixture.requirements[p.code]=[]; }
   data=fixture.processes;
  } else if(pathname.includes('/kyc/processes/')&&pathname.endsWith('/requirements')) {
   if(req.method()==='POST') fixture.requirements[code].push({...req.postDataJSON(),id:'new-'+calls.length,processCode:code});
   data=fixture.requirements[code]||[];
  } else if(pathname.includes('/kyc/processes/')&&req.method()==='PUT') {
   Object.assign(fixture.processes.find(p=>p.code===id),req.postDataJSON());
  } else if(pathname.includes('/kyc/requirements/')) {
   const rows=Object.values(fixture.requirements).find(items=>items.some(r=>r.id===id));
   if(req.method()==='PUT') Object.assign(rows.find(r=>r.id===id),req.postDataJSON());
   if(req.method()==='DELETE') {
    if(failDelete) {status=409;message='Requirement is in use';} else rows.splice(rows.findIndex(r=>r.id===id),1);
   }
  } else if(pathname.endsWith('/kyc/submissions')) {
   const filter=url.searchParams.get('status'); const rows=submissions.filter(r=>!filter||r.status===filter);
   data={content:rows,totalPages:rows.length?1:0,totalElements:rows.length};
  } else if(pathname.includes('/kyc/submissions/')) {
   const sid=pathname.endsWith('/review')||pathname.endsWith('/files')?code:id;
   const row=submissions.find(r=>r.id===sid);
   if(pathname.endsWith('/review')) {
    if(failReview){status=409;message='Review conflict';}else row.status=req.postDataJSON().decision;
   } else if(failDetails){status=503;message='Documents unavailable';}
   else if(pathname.endsWith('/files')) data=[{fieldKey:'UTILITY_BILL',fileName:'test-bill.pdf',url:'https://documents.example.test/test-bill.pdf'}, {url:'javascript:alert(1)'}];
   else data={...row,fieldAnswers:{new_address:'5 Broad Street',additional_answer:'Shown without dropping unknown fields'}};
  }
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify({success:status===200,data,message})});
 });
 await page.addInitScript(()=>localStorage.setItem('mfb_auth',JSON.stringify({adminId:'demo-admin',name:'Demo reviewer',email:'reviewer@example.test',role:'SUPER_ADMIN',accessToken:'demo-token',tokenType:'Bearer'})));
 await page.goto(`${process.env.KYC_ADMIN_URL || 'http://127.0.0.1:5178'}/kyc`);
 await page.getByRole('button',{name:'Process Configuration',exact:true}).click();
 await page.getByLabel('Existing processes').selectOption('ADDRESS_CHANGE');
 const processForm=page.locator('form').nth(0), requirement=page.locator('form').nth(1);
 await page.getByRole('button',{name:'Edit New Residential Address',exact:true}).click();
 assert.equal(await processForm.getByLabel('Name',{exact:true}).inputValue(),'Change of Address');
 assert.equal(await requirement.getByLabel('Customer-facing label').inputValue(),'New Residential Address');
 await requirement.getByLabel('Customer-facing label').fill('Updated address label');
 await requirement.getByLabel('Required',{exact:true}).uncheck();
 await requirement.getByRole('button',{name:'Save requirement changes'}).click();
 await page.getByRole('button',{name:'Edit Updated address label'}).waitFor();
 assert.equal(calls.at(-1).body.required,false);
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:path.join(output,'admin-edit.png'),fullPage:true});
 const remove=page.getByRole('button',{name:'Remove Updated address label'});
 const count=calls.length;
 page.once('dialog',d=>d.dismiss());await remove.click();assert.equal(calls.length,count);
 failDelete=true;page.once('dialog',d=>d.accept());await remove.click();await page.getByRole('alert').filter({hasText:'Requirement is in use'}).waitFor();
 assert.equal(await remove.count(),1);
 failDelete=false;page.once('dialog',d=>d.accept());await remove.click();await remove.waitFor({state:'detached'});
 assert.equal(calls.at(-1).method,'DELETE');
 await page.getByLabel('Existing processes').selectOption('');
 await processForm.getByLabel('Process code',{exact:true}).fill('CUSTOM_UPDATE');
 await processForm.getByLabel('Name',{exact:true}).fill('Custom Update');
 await processForm.getByLabel('Description',{exact:true}).fill('Configurable update');
 await processForm.getByRole('button',{name:'Create process',exact:true}).click();
 await page.getByRole('status').filter({hasText:'CUSTOM_UPDATE created'}).waitFor();
 for(const type of ['FIELD','DOCUMENT']) {
  await requirement.getByLabel('Requirement type').selectOption(type);
  await requirement.getByLabel('Field key').fill(type==='FIELD'?'custom_answer':'CUSTOM_DOCUMENT');
  await requirement.getByLabel('Customer-facing label').fill(type==='FIELD'?'Custom answer':'Custom document');
  await requirement.getByRole('button',{name:'Add requirement',exact:true}).click();
  await page.getByRole('button',{name:type==='FIELD'?'Edit Custom answer':'Edit Custom document',exact:true}).waitFor();
 }
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:path.join(output,'admin-create.png'),fullPage:true});
 await page.getByLabel('Existing processes').selectOption('CUSTOM_UPDATE');
 await processForm.getByLabel('Active —').uncheck();
 await processForm.getByRole('button',{name:'Save process changes'}).click();
 await page.getByRole('status').filter({hasText:'CUSTOM_UPDATE updated'}).waitFor();
 assert.equal(calls.at(-1).body.active,false);
 await page.getByRole('button',{name:'Process Submissions',exact:true}).click();
 failDetails=true;await page.getByRole('button',{name:'View submission'}).first().click();
 await page.getByRole('alert').filter({hasText:'Documents unavailable'}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Approve submission',exact:true}).count(),0);
 failDetails=false;await page.getByRole('button',{name:'Reload submission'}).click();
 await page.getByText('5 Broad Street',{exact:true}).waitFor();
 assert.equal(await page.locator('a[href^="javascript:"]').count(),0);
 assert.equal(await page.locator('a[href="https://documents.example.test/test-bill.pdf"]').count(),1);
 await page.getByLabel('Review notes').fill('All documents verified successfully.');await page.getByRole('checkbox').check();
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:path.join(output,'admin-review.png'),fullPage:true});
 failReview=true;await page.getByRole('button',{name:'Approve submission',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Review conflict'}).waitFor();
 assert.equal(await page.getByLabel('Review notes').inputValue(),'All documents verified successfully.');
 failReview=false;await page.getByRole('button',{name:'Approve submission',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Submission approved.'}).waitFor();
 await page.getByRole('button',{name:'View submission'}).first().click();
 await page.getByLabel('Decision').selectOption('REJECTED');
 await page.getByLabel('Review notes').fill('Utility bill is older than 3 months.');await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'Reject submission',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Submission rejected.'}).waitFor();
 await page.getByText('No submissions found for this filter.').waitFor();
 await page.getByLabel('Submission status').selectOption('APPROVED');
 await page.getByRole('button',{name:'View submission'}).click();
 await page.getByText('5 Broad Street',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Approve submission',exact:true}).count(),0);
 assert.deepEqual(errors,[]);
 console.log('PASS: configuration loading, populated editing, field/document creation, deactivation, confirmed deletion and failure recovery, submission browsing/filtering, details/files, unsafe-link rejection, approve/reject and retry. All writes mocked.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
