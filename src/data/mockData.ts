import type {
  RetailCustomer, CorporateEntity, Transaction, AuditLog,
  KYCApplication, LimitOverride, LoginHistory
} from '../types'

export const mockCustomers: RetailCustomer[] = [
  {
    id: 'RC001', name: 'Oluwaseun Adebayo', email: 'o.adebayo@email.com', phone: '+234 803 456 7890',
    accountNo: '1234567890', kycTier: 'Tier 3', status: 'Verified', balance: 4850000,
    lastActive: '2 hours ago', riskLevel: 'Low', memberSince: '2021-03-14',
    dateOfBirth: '1988-07-22', country: 'Nigeria', address: '14 Admiralty Way, Lekki, Lagos',
    gender: 'Male', bvn: '22312345678', nin: '98765432100', type: 'Individual',
  },
  {
    id: 'RC002', name: 'Ngozi Eze', email: 'ngozi.e@email.com', phone: '+234 802 345 6789',
    accountNo: '0987654321', kycTier: 'Tier 2', status: 'Verified', balance: 320000,
    lastActive: '1 day ago', riskLevel: 'Low', memberSince: '2022-06-05',
    dateOfBirth: '1994-03-10', country: 'Nigeria', address: '22 Aba Road, Port Harcourt',
    gender: 'Female', bvn: '22398765432', nin: '12345678900', type: 'Individual',
  },
  {
    id: 'RC003', name: 'Julian Knight', email: 'j.knight@email.com', phone: '+44 7700 900123',
    accountNo: '1122334455', kycTier: 'Tier 3', status: 'Flagged', balance: 12400000,
    lastActive: '3 days ago', riskLevel: 'High', memberSince: '2020-11-20',
    dateOfBirth: '1975-09-15', country: 'United Kingdom', address: '8 Baker St, London',
    gender: 'Male', bvn: '22311223344', nin: '55667788990', type: 'Individual',
  },
  {
    id: 'RC004', name: 'Chioma Nwosu', email: 'c.nwosu@email.com', phone: '+234 706 789 0123',
    accountNo: '5566778899', kycTier: 'Tier 1', status: 'Unverified', balance: 15000,
    lastActive: '5 days ago', riskLevel: 'Low', memberSince: '2024-01-18',
    dateOfBirth: '2000-12-01', country: 'Nigeria', address: '5 Ring Road, Enugu',
    gender: 'Female', bvn: '22356789012', nin: '', type: 'Individual',
  },
  {
    id: 'RC005', name: 'Marcus Chen', email: 'm.chen@email.com', phone: '+234 810 234 5678',
    accountNo: '6677889900', kycTier: 'Tier 2', status: 'Verified', balance: 980000,
    lastActive: '12 hours ago', riskLevel: 'Medium', memberSince: '2023-04-09',
    dateOfBirth: '1991-05-28', country: 'Nigeria', address: '30 Victoria Island, Lagos',
    gender: 'Male', bvn: '22367890123', nin: '11223344556', type: 'SME',
  },
  {
    id: 'RC006', name: 'Elara Vance', email: 'e.vance@email.com', phone: '+234 703 567 8901',
    accountNo: '7788990011', kycTier: 'Tier 3', status: 'Verified', balance: 22100000,
    lastActive: '1 hour ago', riskLevel: 'Low', memberSince: '2019-08-30',
    dateOfBirth: '1982-02-14', country: 'Nigeria', address: '12 Maitama District, Abuja',
    gender: 'Female', bvn: '22378901234', nin: '99887766554', type: 'Individual',
  },
  {
    id: 'RC007', name: 'Adamu Bello', email: 'a.bello@email.com', phone: '+234 817 890 1234',
    accountNo: '8899001122', kycTier: 'Tier 1', status: 'Pending', balance: 45000,
    lastActive: '8 hours ago', riskLevel: 'Low', memberSince: '2024-03-22',
    dateOfBirth: '1998-10-07', country: 'Nigeria', address: '7 Tudun Wada, Kaduna',
    gender: 'Male', bvn: '22389012345', nin: '', type: 'Individual',
  },
]

export const mockCorporates: CorporateEntity[] = [
  {
    id: 'CE001', name: 'Nexus Energy Plc', rcNumber: 'RC123456', taxId: '12345678-0001',
    hqAddress: '5 Energy Drive, Victoria Island, Lagos', status: 'Active',
    onboardedDate: '2020-05-12', authorizedPersonnel: 12, activeUsers: 8, accounts: 4,
    complianceClearances: ['CAC Verified', 'FIRS Registered', 'AMCON Compliant'],
    cacDocStatus: 'Verified', industry: 'Energy', defaultCurrency: 'NGN',
  },
  {
    id: 'CE002', name: 'Greenfield Agro Ltd', rcNumber: 'RC654321', taxId: '98765432-0002',
    hqAddress: '22 Abeokuta Expressway, Ogun State', status: 'Active',
    onboardedDate: '2021-11-03', authorizedPersonnel: 6, activeUsers: 5, accounts: 2,
    complianceClearances: ['CAC Verified', 'NAFDAC Certified'],
    cacDocStatus: 'Verified', industry: 'Agriculture', defaultCurrency: 'NGN',
  },
  {
    id: 'CE003', name: 'Apex Logistics Services', rcNumber: 'RC789012', taxId: '34567890-0003',
    hqAddress: '18 Trans-Amadi Industrial Layout, Port Harcourt', status: 'Suspended',
    onboardedDate: '2022-03-15', authorizedPersonnel: 9, activeUsers: 0, accounts: 3,
    complianceClearances: ['CAC Verified'],
    cacDocStatus: 'Pending', industry: 'Logistics', defaultCurrency: 'NGN',
  },
  {
    id: 'CE004', name: 'Skybridge Telecoms', rcNumber: 'RC345678', taxId: '56789012-0004',
    hqAddress: '3 Central Business District, Abuja', status: 'Active',
    onboardedDate: '2019-09-28', authorizedPersonnel: 25, activeUsers: 20, accounts: 6,
    complianceClearances: ['CAC Verified', 'NCC Licensed', 'FIRS Registered'],
    cacDocStatus: 'Verified', industry: 'Telecommunications', defaultCurrency: 'NGN',
  },
]

export const mockTransactions: Transaction[] = [
  {
    id: 'TX001', referenceId: 'MFB-2024-001234', type: 'Transfer', amount: 5000000,
    currency: 'NGN', channel: 'Web', date: '2024-05-22 09:14', status: 'Completed',
    beneficiary: 'Greenfield Agro Ltd', beneficiaryAccount: '0123456789', fee: 50,
    description: 'Bulk payment - supplier settlement', customerId: 'CE001',
  },
  {
    id: 'TX002', referenceId: 'MFB-2024-001235', type: 'Transfer', amount: 15000000,
    currency: 'NGN', channel: 'API', date: '2024-05-22 10:30', status: 'Pending',
    beneficiary: 'Skybridge Telecoms', beneficiaryAccount: '9876543210', fee: 100,
    description: 'Infrastructure lease payment', corporateId: 'CE001',
  },
  {
    id: 'TX003', referenceId: 'MFB-2024-001236', type: 'Transfer', amount: 2500000,
    currency: 'NGN', channel: 'Mobile', date: '2024-05-21 14:22', status: 'Failed',
    beneficiary: 'External Bank', beneficiaryAccount: '1122334455', fee: 25,
    description: 'Vendor payment', failureReason: 'Beneficiary account not found',
    customerId: 'RC003', flagged: true,
  },
  {
    id: 'TX004', referenceId: 'MFB-2024-001237', type: 'Deposit', amount: 8000000,
    currency: 'NGN', channel: 'POS', date: '2024-05-21 11:05', status: 'Completed',
    beneficiary: 'Nexus Energy Plc', beneficiaryAccount: '6677889900', fee: 0,
    description: 'Cash deposit at branch', corporateId: 'CE001',
  },
  {
    id: 'TX005', referenceId: 'MFB-2024-001238', type: 'Transfer', amount: 450000,
    currency: 'NGN', channel: 'Web', date: '2024-05-20 16:45', status: 'Reversed',
    beneficiary: 'Oluwaseun Adebayo', beneficiaryAccount: '1234567890', fee: 10,
    description: 'Salary disbursement reversal', customerId: 'RC001',
  },
  {
    id: 'TX006', referenceId: 'MFB-2024-001239', type: 'Transfer', amount: 750000,
    currency: 'NGN', channel: 'USSD', date: '2024-05-20 08:00', status: 'Completed',
    beneficiary: 'Chioma Nwosu', beneficiaryAccount: '5566778899', fee: 10,
    description: 'Personal transfer', customerId: 'RC002',
  },
]

export const mockAuditLogs: AuditLog[] = [
  {
    id: 'AL001', actor: 'admin@memphismfb.com', actorRole: 'Super Admin',
    action: 'KYC_TIER_UPGRADE_APPROVED', context: 'KYC Management',
    resourceId: 'KYC-APP-0421', payload: 'Customer RC003 upgraded from Tier 2 to Tier 3',
    timestamp: '2024-05-22 09:02:14', ipAddress: '102.89.45.12',
    severity: 'Info',
  },
  {
    id: 'AL002', actor: 'admin@memphismfb.com', actorRole: 'Super Admin',
    action: 'TRANSACTION_REVERSED', context: 'Transaction Oversight',
    resourceId: 'TX005', payload: 'Transfer MFB-2024-001238 reversed — customer dispute',
    timestamp: '2024-05-20 17:01:33', ipAddress: '102.89.45.12',
    severity: 'Warning',
  },
  {
    id: 'AL003', actor: 'compliance@memphismfb.com', actorRole: 'Compliance Officer',
    action: 'ENTITY_SUSPENDED', context: 'Corporate Banking',
    resourceId: 'CE003', payload: 'Apex Logistics Services suspended pending AML review',
    timestamp: '2024-05-19 11:45:00', ipAddress: '102.89.22.33',
    severity: 'Critical',
  },
  {
    id: 'AL004', actor: 'admin@memphismfb.com', actorRole: 'Super Admin',
    action: 'LIMIT_OVERRIDE_CREATED', context: 'Retail Limits',
    resourceId: 'LO-0089', payload: 'Daily transfer limit for RC006 set to ₦50,000,000',
    timestamp: '2024-05-19 09:30:00', ipAddress: '102.89.45.12',
    severity: 'Warning',
  },
  {
    id: 'AL005', actor: 'audit@memphismfb.com', actorRole: 'Auditor',
    action: 'REPORT_EXPORTED', context: 'Activity Logs',
    resourceId: 'RPT-MAY-22', payload: 'Monthly transaction report exported as PDF',
    timestamp: '2024-05-22 07:15:00', ipAddress: '102.89.11.55',
    severity: 'Info',
  },
]

export const mockKYCApplications: KYCApplication[] = [
  {
    id: 'KYC001', customerId: 'RC004', customerName: 'Chioma Nwosu',
    phone: '+234 706 789 0123', requestType: 'Tier 2 Upgrade', riskLevel: 'Low',
    submittedAt: '2024-05-22 08:12', status: 'Pending', bvnMatch: true,
    faceMatch: true, utilityBillValid: false,
    documents: [
      { name: 'Passport Photograph', status: 'Verified', uploadedAt: '2024-05-22' },
      { name: 'Valid ID Card', status: 'Verified', uploadedAt: '2024-05-22' },
      { name: 'Utility Bill', status: 'Pending', uploadedAt: '2024-05-22' },
    ],
  },
  {
    id: 'KYC002', customerId: 'RC007', customerName: 'Adamu Bello',
    phone: '+234 817 890 1234', requestType: 'Tier 1 Upgrade', riskLevel: 'Low',
    submittedAt: '2024-05-21 16:40', status: 'Pending', bvnMatch: true,
    faceMatch: true, utilityBillValid: true,
    documents: [
      { name: 'Passport Photograph', status: 'Verified', uploadedAt: '2024-05-21' },
      { name: 'Valid ID Card', status: 'Pending', uploadedAt: '2024-05-21' },
    ],
  },
  {
    id: 'KYC003', customerId: 'RC005', customerName: 'Marcus Chen',
    phone: '+234 810 234 5678', requestType: 'Tier 3 Upgrade', riskLevel: 'Medium',
    submittedAt: '2024-05-20 11:00', status: 'Pending', bvnMatch: true,
    faceMatch: false, utilityBillValid: true,
    documents: [
      { name: 'Passport Photograph', status: 'Verified', uploadedAt: '2024-05-20' },
      { name: 'Valid ID Card', status: 'Verified', uploadedAt: '2024-05-20' },
      { name: 'Utility Bill', status: 'Verified', uploadedAt: '2024-05-20' },
      { name: 'Indemnity Form', status: 'Pending', uploadedAt: '2024-05-20' },
    ],
  },
]

export const mockLimitOverrides: LimitOverride[] = [
  {
    id: 'LO001', customerId: 'RC006', customerName: 'Elara Vance',
    type: 'Daily Transfer', limit: 50000000, status: 'Active',
    setBy: 'admin@memphismfb.com', expiresAt: '2024-06-22',
  },
  {
    id: 'LO002', customerId: 'RC001', customerName: 'Oluwaseun Adebayo',
    type: 'Single Transaction', limit: 10000000, status: 'Active',
    setBy: 'admin@memphismfb.com', expiresAt: '2024-07-01',
  },
  {
    id: 'LO003', customerId: 'RC003', customerName: 'Julian Knight',
    type: 'Balance Cap', limit: 100000000, status: 'Pending',
    setBy: 'compliance@memphismfb.com',
  },
]

export const mockLoginHistory: LoginHistory[] = [
  {
    id: 'LH001', timestamp: '2024-05-22 09:14:02', ipAddress: '102.89.45.12',
    geolocation: 'Lagos, Nigeria', userAgent: 'Chrome 124 / macOS',
    status: 'Success', mfaMethod: 'Push Notification',
  },
  {
    id: 'LH002', timestamp: '2024-05-21 07:33:11', ipAddress: '102.89.45.12',
    geolocation: 'Lagos, Nigeria', userAgent: 'Chrome 124 / macOS',
    status: 'Success', mfaMethod: 'Push Notification',
  },
  {
    id: 'LH003', timestamp: '2024-05-18 22:01:44', ipAddress: '185.220.101.47',
    geolocation: 'Switzerland', userAgent: 'Unknown / Unknown',
    status: 'Failed', mfaMethod: '—',
  },
  {
    id: 'LH004', timestamp: '2024-05-15 14:55:30', ipAddress: '113.57.89.201',
    geolocation: 'China', userAgent: 'Firefox 125 / Windows',
    status: 'Suspicious', mfaMethod: '—',
  },
]

export const overviewStats = {
  totalAccounts: 18420,
  activeUsers: 12847,
  kycPending: 34,
  transactionVolumeToday: 284500000,
  corporateEntities: 127,
  safetyScore: 94,
  approvedToday: 21,
  rejectedToday: 3,
}
