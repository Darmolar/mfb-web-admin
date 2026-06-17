import { useAuth } from '../../context/AuthContext'

export function ProfileSettings() {
  const { user } = useAuth()

  if (!user) {
    return <div className="p-4 bg-white rounded-lg border border-slate-200">Loading user data...</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">My Profile</h2>
          <p className="text-sm text-slate-500">View and manage your super admin details.</p>
        </div>
        
        <div className="p-6">
          <div className="flex items-center space-x-6 mb-8">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
              {user.name?.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{user.name}</h3>
              <p className="text-slate-500">{user.email}</p>
              <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {user.role || 'Super Admin'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-800">
                {user.name}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-800">
                {user.email}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-800">
                <span className="flex items-center text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
