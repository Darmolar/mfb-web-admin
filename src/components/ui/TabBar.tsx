interface Tab {
  id: string
  label: string
}

interface TabBarProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
  variant?: 'pills' | 'underline'
}

export function TabBar({ tabs, active, onChange, variant = 'pills' }: TabBarProps) {
  if (variant === 'underline') {
    return (
      <div className="flex gap-0 border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer -mb-px ${active === tab.id ? 'border-slate-700 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${active === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
