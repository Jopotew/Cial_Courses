import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

const sections = [
  {
    to: '/admin',
    end: true,
    label: 'Inicio',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="6" height="6" rx="1" /><rect x="9" y="1" width="6" height="6" rx="1" />
        <rect x="1" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    to: '/admin/courses',
    end: false,
    label: 'Cursos',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 2h5a1 1 0 0 1 1 1v10a1 1 0 0 0-1-1H2V2zM14 2H9a1 1 0 0 0-1 1v10a1 1 0 0 1 1-1h5V2z" />
      </svg>
    ),
  },
  {
    to: '/admin/users',
    end: false,
    label: 'Usuarios',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="5" r="2.5" /><path d="M1 13c0-2.8 2.2-5 5-5s5 2.2 5 5" />
        <circle cx="12" cy="5" r="2" /><path d="M12 9.5c1.7 0 3 1.3 3 3" />
      </svg>
    ),
  },
]

export function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuthStore()

  return (
    <div className="min-h-[calc(100vh-64px)] bg-canvas flex relative">
      {/* Mobile overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/45 z-[200]"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Sidebar – desktop */}
      <aside className="hidden md:flex w-[220px] bg-hero flex-col flex-shrink-0 sticky top-16 h-[calc(100vh-64px)]">
        <SidebarContent user={user} onNavigate={(to) => navigate(to)} />
      </aside>

      {/* Sidebar – mobile drawer */}
      {drawerOpen && (
        <aside className="fixed top-16 left-0 w-[240px] h-[calc(100vh-64px)] bg-hero z-[300] flex flex-col">
          <SidebarContent
            user={user}
            onNavigate={(to) => { navigate(to); setDrawerOpen(false) }}
          />
        </aside>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="flex md:hidden bg-hero items-center gap-3.5 px-4 h-[52px] flex-shrink-0">
          <button
            onClick={() => setDrawerOpen((o) => !o)}
            className="bg-transparent border-none cursor-pointer p-1.5 text-white"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h16M3 11h16M3 16h16" />
            </svg>
          </button>
          <span className="text-[15px] font-bold text-white">Panel Admin</span>
        </div>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function SidebarContent({
  user,
  onNavigate,
}: {
  user: { name: string; email: string; initials: string } | null
  onNavigate: (to: string) => void
}) {
  return (
    <>
      <div className="px-4 py-5 border-b border-white/[.08]">
        <p className="text-[11px] font-bold text-white/40 uppercase tracking-[.8px]">
          Panel Admin
        </p>
        {user && (
          <div className="mt-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-avatar-grad flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {user.initials}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white leading-tight">{user.name.split(' ')[0]}</p>
              <p className="text-[11px] text-white/40">{user.email}</p>
            </div>
          </div>
        )}
      </div>
      <nav className="px-2.5 py-3 flex-1">
        {sections.map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            end={s.end}
            className={({ isActive }) =>
              `flex items-center gap-3 w-full px-3.5 py-2.5 rounded-[10px] mb-0.5 text-sm font-normal no-underline transition-all ${
                isActive
                  ? 'bg-primary/50 text-white font-bold'
                  : 'text-white/60 hover:bg-white/[.06] hover:text-white'
              }`
            }
          >
            {s.icon}
            {s.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-white/[.08]">
        <button
          onClick={() => onNavigate('/')}
          className="flex items-center gap-2.5 cursor-pointer px-3 py-2.5 rounded-[10px] text-white/50 text-[13px] w-full border-none bg-transparent hover:bg-white/[.06] hover:text-white/80 transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 8l5-5 5 5M4 7v6h3v-3h2v3h3V7" />
          </svg>
          Volver al sitio
        </button>
      </div>
    </>
  )
}