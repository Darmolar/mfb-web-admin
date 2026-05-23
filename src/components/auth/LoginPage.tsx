import { useState } from 'react'
import { ShieldCheck, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('admin@memphismfb.com')
  const [password, setPassword] = useState('••••••••')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await login(email, password)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#fdf4f4] flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
          <ShieldCheck size={30} className="text-white" />
        </div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Memphis Bank</h1>
        <p className="text-xs font-bold text-slate-400 tracking-[0.2em] uppercase mt-1">Super Admin Portal</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-700"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Password
              </label>
              <button type="button" className="text-xs font-bold text-blue-500 hover:text-blue-700 cursor-pointer">
                FORGOT?
              </button>
            </div>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-700"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 cursor-pointer"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-700 hover:bg-slate-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 text-sm tracking-widest uppercase mt-2"
          >
            {loading ? 'Signing In...' : (
              <>Sign In <ArrowRight size={16} /></>
            )}
          </button>
        </form>
      </div>

      <div className="mt-8 flex flex-col items-center gap-1">
        <Lock size={12} className="text-slate-300" />
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Authorized Personnel Only</p>
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Access is Monitored & Logged</p>
      </div>
    </div>
  )
}
