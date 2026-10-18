const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function fixture(body, status = 200) {
  const seen = [], modules = {};
  function load(file) {
    if (modules[file]) return modules[file];
    const exports = modules[file] = {};
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(source, { exports, require: name => name === './config' ? { API_BASE_URL: 'https://bank.test/api/v1', ADMIN_API_KEY: '' } : load(`src/api/${name.slice(2)}.ts`),
      localStorage: { getItem: () => JSON.stringify({ accessToken: 'session-token' }) },
      fetch: async (url, init) => { seen.push({ url, init }); return { ok: status < 400, status, json: async () => body }; },
    });
    return exports;
  }
  return { api: load('src/api/index.ts'), seen };
}
test('dynamic KYC write endpoints preserve documented methods, fields and false flags', async () => {
  const { api, seen } = fixture({ success: true });
  const process = { code: 'NEXT_OF_KIN_UPDATE', name: 'Next of Kin Update', description: 'Update next of kin', category: 'INFO_UPDATE' };
  const requirement = { requirementType: 'DOCUMENT', fieldKey: 'NOK_ID', label: 'Next of Kin ID', description: 'Government ID', required: false, sortOrder: 2 };
  const update = { name: 'Tier 2 Upgrade', description: 'Upgrade', category: 'TIER_UPGRADE', active: false };
  const requirementUpdate = { label: 'New label', description: 'New description', required: false, sortOrder: 3 };
  const review = { decision: 'REJECTED', notes: 'Please resubmit.' };
  await api.createKycProcess(process);
  await api.createKycRequirement(process.code, requirement);
  await api.updateKycProcess('TIER_2_UPGRADE', update);
  await api.updateKycRequirement('id/1', requirementUpdate);
  await api.reviewKycSubmission('id/2', review);
  const paths = ['/processes', '/processes/NEXT_OF_KIN_UPDATE/requirements', '/processes/TIER_2_UPGRADE', '/requirements/id%2F1', '/submissions/id%2F2/review'];
  [process, requirement, update, requirementUpdate, review].forEach((payload, i) => {
    assert.equal(seen[i].url, 'https://bank.test/api/v1/bank-admin/kyc' + paths[i]);
    assert.equal(seen[i].init.method, i < 2 ? 'POST' : 'PUT');
    assert.deepEqual(JSON.parse(seen[i].init.body), payload);
    assert.equal(seen[i].init.headers.Authorization, 'Bearer session-token');
  });
});
test('dynamic KYC propagates failed create and review responses', async () => {
  const { api } = fixture({ success: false, message: 'Permission denied' }, 403);
  await assert.rejects(api.createKycProcess({}), /Permission denied/);
  await assert.rejects(api.reviewKycSubmission('id', { decision: 'APPROVED', notes: 'Verified' }), /Permission denied/);
});

test('read endpoints validate live configuration and paginated submissions', async () => {
  const records = require('../../docs/kyc-demo/fixtures.json');
  let f = fixture({ success: true, data: records.processes });
  assert.equal((await f.api.getKycProcesses())[2].code, 'ADDRESS_CHANGE');
  f = fixture({ success: true, data: records.requirements.NAME_CHANGE });
  assert.equal((await f.api.getKycRequirements('NAME_CHANGE'))[0].required, false);
  f = fixture({ success: true, data: {content:[],totalPages:0,totalElements:0} });
  assert.equal((await f.api.getKycSubmissions('PENDING',2)).content.length,0);
  assert.match(f.seen[0].url, /status=PENDING&page=2&size=20$/);
  await assert.rejects(f.api.getKycProcesses(), /Unable to read/);
});
test('delete encodes IDs, accepts 204, and propagates rejection', async () => {
  const f = fixture(null,204);
  await f.api.deleteKycRequirement('id/1');
  assert.equal(f.seen[0].init.method,'DELETE');
  assert.match(f.seen[0].url,/requirements\/id%2F1$/);
  const denied = fixture({success:false,message:'Requirement is in use'},409);
  await assert.rejects(denied.api.deleteKycRequirement('id'),/in use/);
});
test('submission detail and files preserve returned fields without guessing their shape', async () => {
  const payload = {id:'submission-1',fieldAnswers:{new_address:'Example address'},extraInformation:{source:'test'}};
  const f = fixture({success:true,data:payload});
  assert.equal(JSON.stringify(await f.api.getKycSubmission('submission-1')),JSON.stringify(payload));
  await f.api.getKycSubmissionFiles('submission/1');
  assert.match(f.seen[1].url,/submissions\/submission%2F1\/files$/);
  await assert.rejects(fixture({success:true,data:null}).api.getKycSubmission('missing'),/Unable to read/);
  await assert.rejects(fixture({success:true,data:null}).api.getKycSubmissionFiles('missing'),/Unable to read/);
});

// Exact samples from the backend's 2026-10-17 KYC notes.
test('backend sample: field requirement and both review decisions are sent as documented', async () => {
  const { api, seen } = fixture({ success: true });
  const field = { requirementType: 'FIELD', fieldKey: 'nok_name', label: 'Next of Kin Full Name', description: 'Full legal name of your next of kin', required: true, sortOrder: 1 };
  const process = { code: 'NEXT_OF_KIN_UPDATE', name: 'Next of Kin Update', description: 'Update next of kin information', category: 'INFO_UPDATE' };
  const approve = { decision: 'APPROVED', notes: 'All documents verified successfully.' };
  const reject = { decision: 'REJECTED', notes: 'Utility bill is older than 3 months. Please resubmit.' };
  await api.createKycProcess(process);
  await api.createKycRequirement('NEXT_OF_KIN_UPDATE', field);
  await api.reviewKycSubmission('sub-1', approve);
  await api.reviewKycSubmission('sub-2', reject);
  assert.deepEqual(seen.map(s => [s.init.method, s.url.replace('https://bank.test/api/v1/bank-admin/kyc', ''), JSON.parse(s.init.body)]), [
    ['POST', '/processes', process],
    ['POST', '/processes/NEXT_OF_KIN_UPDATE/requirements', field],
    ['PUT', '/submissions/sub-1/review', approve],
    ['PUT', '/submissions/sub-2/review', reject],
  ]);
});

test('delete process sends DELETE with the encoded process code', async () => {
  const { api, seen } = fixture({ success: true });
  await api.deleteKycProcess('NEXT_OF_KIN/UPDATE');
  assert.equal(seen[0].url, 'https://bank.test/api/v1/bank-admin/kyc/processes/NEXT_OF_KIN%2FUPDATE');
  assert.equal(seen[0].init.method, 'DELETE');
});
