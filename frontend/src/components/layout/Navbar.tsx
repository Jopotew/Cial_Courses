import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui'

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  function handleLogout() {
    logout()
    setMenuOpen(false)
    navigate('/')
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="bg-white border-b border-[#f0ebfd] sticky top-0 z-[100] shadow-nav">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-9 h-9 rounded-[10px] bg-primary-grad flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L3 6v8l7 4 7-4V6L10 2z" fill="rgba(255,255,255,.3)" stroke="#fff" strokeWidth="1.2" />
              <path d="M10 2v12M3 6l7 4 7-4" stroke="#fff" strokeWidth="1.2" />
            </svg>
          </div>
          <span className="text-[18px] font-extrabold text-primary tracking-tight">
            CIAL<span className="text-accent">cursos</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink to="/" active={isActive('/')}>Inicio</NavLink>
          <NavLink to="/catalog" active={isActive('/catalog')}>Cursos</NavLink>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2.5">
          {isAuthenticated && user ? (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-[10px] transition-colors cursor-pointer border-none bg-transparent ${menuOpen ? 'bg-primary-light' : 'hover:bg-primary-light'}`}
              >
                <div className="w-[34px] h-[34px] rounded-full bg-avatar-grad flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0">
                  {user.initials}
                </div>
                <span className="hidden sm:block text-sm font-semibold text-gray-700">
                  {user.name.split(' ')[0]}
                </span>
                <svg
                  width="16" height="16" viewBox="0 0 16 16" fill="#94a3b8"
                  style={{ transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
                >
                  <path d="M4 6l4 4 4-4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-[50px] bg-white border border-[#f0ebfd] rounded-[14px] shadow-[0_8px_32px_rgba(0,0,0,.12)] min-w-[200px] overflow-hidden z-[200]">
                  <div className="px-[18px] py-3.5 border-b border-[#f0ebfd]">
                    <p className="text-sm font-bold text-ink">{user.name}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </div>
                  <DropItem to="/dashboard" onClick={() => setMenuOpen(false)}>Mi aprendizaje</DropItem>
                  <DropItem to="/profile" onClick={() => setMenuOpen(false)}>Mi perfil</DropItem>
                  {user.isAdmin && (
                    <DropItem to="/admin" onClick={() => setMenuOpen(false)}>Panel Admin</DropItem>
                  )}
                  <DropItem to="/" onClick={handleLogout} danger>Cerrar sesión</DropItem>
                </div>
              )}
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Iniciar sesión
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
                Registrarse
              </Button>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden bg-transparent border-none cursor-pointer p-1.5"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h16M3 11h16M3 16h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-[#f0ebfd] px-6 pb-5 pt-3 flex flex-col gap-1">
          <NavLink to="/" active={isActive('/')}>Inicio</NavLink>
          <NavLink to="/catalog" active={isActive('/catalog')}>Cursos</NavLink>
          {isAuthenticated && (
            <>
              <NavLink to="/dashboard" active={isActive('/dashboard')}>Mi aprendizaje</NavLink>
              <NavLink to="/profile" active={isActive('/profile')}>Mi perfil</NavLink>
            </>
          )}
        </div>
      )}
    </nav>
  )
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`px-3.5 py-[7px] rounded-lg text-sm font-medium transition-all no-underline block ${
        active
          ? 'bg-primary-light text-primary font-bold'
          : 'text-gray-700 hover:bg-primary-light hover:text-primary'
      }`}
    >
      {children}
    </Link>
  )
}

function DropItem({
  to,
  onClick,
  danger,
  children,
}: {
  to: string
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`block w-full text-left px-[18px] py-3 text-sm font-medium no-underline transition-colors ${
        danger
          ? 'text-red-500 hover:bg-red-50'
          : 'text-gray-700 hover:bg-primary-light'
      }`}
    >
      {children}
    </Link>
  )
}