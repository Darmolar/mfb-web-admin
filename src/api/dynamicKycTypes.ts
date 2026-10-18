export interface CreateKycProcess {
  code: string
  name: string
  description: string
  category: string
}
export interface UpdateKycProcess {
  name: string
  description: string
  category: CreateKycProcess['category']
  active: boolean
}
export interface CreateKycRequirement {
  requirementType: 'FIELD' | 'DOCUMENT'
  fieldKey: string
  label: string
  description: string
  required: boolean
  sortOrder: number
}
export type UpdateKycRequirement = Pick<CreateKycRequirement, 'label' | 'description' | 'required' | 'sortOrder'>
export interface ReviewKycSubmission {
  decision: 'APPROVED' | 'REJECTED'
  notes: string
}
