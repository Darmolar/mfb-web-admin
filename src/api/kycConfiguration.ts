import type { CreateKycRequirement as KycRequirement } from './dynamicKycTypes';

export interface KycProcess { code: string; name: string; description: string; category: string; active: boolean }
export interface ConfiguredKycRequirement extends KycRequirement { id: string; processCode: string }

export function parseKycProcesses(value: unknown): KycProcess[] {
  if (!Array.isArray(value)) throw new Error('Unable to read KYC processes. Please retry.');
  const seen = new Set<string>();
  return value.map(p => {
    if (!p || typeof p.code !== 'string' || !p.code.trim() || seen.has(p.code) || typeof p.name !== 'string' || !p.name.trim() || typeof p.active !== 'boolean' || typeof p.category !== 'string') {
      throw new Error('The bank returned an invalid KYC process configuration.');
    }
    seen.add(p.code);
    return { code: p.code, name: p.name, description: typeof p.description === 'string' ? p.description : '', category: p.category, active: p.active };
  });
}

export function parseKycRequirements(value: unknown, code: string): ConfiguredKycRequirement[] {
  if (!Array.isArray(value)) throw new Error('Unable to read KYC requirements. Please retry.');
  const keys = new Set<string>(), ids = new Set<string>();
  return value.map(r => {
    if (!r || typeof r.id !== 'string' || !r.id || ids.has(r.id) || r.processCode !== code ||
        !['FIELD', 'DOCUMENT'].includes(r.requirementType) || typeof r.fieldKey !== 'string' || !r.fieldKey.trim() || r.fieldKey === 'fieldAnswers' || keys.has(r.fieldKey) ||
        typeof r.label !== 'string' || !r.label.trim() || typeof r.required !== 'boolean' || !Number.isInteger(r.sortOrder) || r.sortOrder < 0) {
      throw new Error('This process has unsupported or invalid requirements. Please contact the bank.');
    }
    keys.add(r.fieldKey); ids.add(r.id);
    return { id: r.id, processCode: code, requirementType: r.requirementType, fieldKey: r.fieldKey, label: r.label,
      description: typeof r.description === 'string' ? r.description : '', required: r.required, sortOrder: r.sortOrder };
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function kycRequirementsKey(requirements: KycRequirement[]): string {
  return JSON.stringify([...requirements].sort((a, b) => a.fieldKey.localeCompare(b.fieldKey)).map(r =>
    [r.fieldKey, r.requirementType, r.required, r.label, r.description || '', r.sortOrder]));
}
