// Shared UI components for CIAL Cursos

const { useState, useEffect, useRef } = React;

// ── Helpers ──────────────────────────────────────────────
function formatPrice(n) {
  return n === 0 ? 'Gratis' : '$' + n.toLocaleString('es-AR');
}

function StarRating({ rating, small }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const size = small ? 14 : 16;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 16 16" fill={i <= full ? '#f59e0b' : (i === full+1 && half ? 'url(#half)' : '#d1d5db')}>
          <defs>
            <linearGradient id="half">
              <stop offset="50%" stopColor="#f59e0b"/>
              <stop offset="50%" stopColor="#d1d5db"/>
            </linearGradient>
          </defs>
          <path d="M8 1l1.8 3.6 4 .6-2.9 2.8.7 4L8 10l-3.6 1.9.7-4L2.2 5.2l4-.6z"/>
        </svg>
      ))}
    </span>
  );
}

// ── Badge ─────────────────────────────────────────────────
function Badge({ children, variant = 'default' }) {
  const styles = {
    default: { background: '#f5f3ff', color: '#7c3aed' },
    green:   { background: '#d1fae5', color: '#059669' },
    gray:    { background: '#f1f5f9', color: '#64748b' },
    blue:    { background: '#e0f2fe', color: '#0284c7' },
  };
  return (
    <span style={{
      ...styles[variant],
      padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
      display: 'inline-block', whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

// ── Button ────────────────────────────────────────────────
function Btn({ children, onClick, variant = 'primary', size = 'md', fullWidth, style: extraStyle, disabled }) {
  const [hov, setHov] = useState(false);
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, fontFamily: 'inherit', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none', borderRadius: 10, transition: 'all .18s ease',
    width: fullWidth ? '100%' : undefined, opacity: disabled ? 0.6 : 1,
    fontSize: size === 'sm' ? 13 : size === 'lg' ? 16 : 14,
    padding: size === 'sm' ? '8px 16px' : size === 'lg' ? '14px 28px' : '11px 22px',
  };
  const variants = {
    primary: { background: hov ? '#6d28d9' : '#7c3aed', color: '#fff', boxShadow: hov ? '0 4px 16px rgba(124,58,237,.35)' : 'none' },
    secondary: { background: hov ? '#d1fae5' : '#ecfdf5', color: '#059669', boxShadow: 'none' },
    outline: { background: 'transparent', color: '#7c3aed', border: '1.5px solid #7c3aed', boxShadow: 'none' },
    ghost: { background: hov ? '#f5f3ff' : 'transparent', color: '#7c3aed', boxShadow: 'none' },
    danger: { background: hov ? '#dc2626' : '#ef4444', color: '#fff', boxShadow: 'none' },
  };
  return (
    <button
      style={{ ...base, ...variants[variant], ...extraStyle }}
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
    >{children}</button>
  );
}

// ── Input ─────────────────────────────────────────────────
function Input({ label, type = 'text', value, onChange, placeholder, error, autoFocus }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</label>}
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          padding: '12px 16px', borderRadius: 10, fontSize: 15,
          border: `1.5px solid ${error ? '#ef4444' : focused ? '#7c3aed' : '#e2d9f7'}`,
          outline: 'none', fontFamily: 'inherit', color: '#1a1a2e',
          background: '#fff', transition: 'border .15s',
          boxShadow: focused ? '0 0 0 3px rgba(124,58,237,.1)' : 'none',
          width: '100%', boxSizing: 'border-box',
        }}
      />
      {error && <span style={{ fontSize: 12, color: '#ef4444' }}>{error}</span>}
    </div>
  );
}

// ── Course Card ───────────────────────────────────────────
function CourseCard({ course, onNavigate, enrolled }) {
  const [hov, setHov] = useState(false);
  const { data } = window.CIAL;
  const cat = data.categories.find(c => c.id === course.categoryId) || {};

  return (
    <div
      onClick={() => onNavigate('course', { courseId: course.id })}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: '#fff', borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
        boxShadow: hov ? '0 8px 32px rgba(124,58,237,.15)' : '0 2px 12px rgba(0,0,0,.06)',
        transform: hov ? 'translateY(-3px)' : 'none',
        transition: 'all .2s ease', border: '1px solid #f0ebfd',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Thumbnail */}
      <div style={{
        height: 140, background: `linear-gradient(135deg, ${course.cardColor}dd, ${course.cardColor}88)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: 16, background: 'rgba(255,255,255,.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: -1,
        }}>{course.instructorInitials}</div>
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          {course.free
            ? <Badge variant="green">Gratis</Badge>
            : <span style={{ background: 'rgba(255,255,255,.9)', color: course.cardColor, borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{course.level}</span>}
        </div>
        {enrolled && (
          <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(255,255,255,.95)', borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="5" fill="#059669"/><path d="M3 5l1.5 1.5L7 3.5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/></svg>
            Inscripto
          </div>
        )}
      </div>
      {/* Body */}
      <div style={{ padding: '16px 18px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: cat.color || '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.5 }}>{course.category}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.35, textWrap: 'pretty' }}>{course.title}</div>
        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4, flex: 1 }}>{course.instructor}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>{course.rating}</span>
          <StarRating rating={course.rating} small />
          <span style={{ fontSize: 12, color: '#94a3b8' }}>({course.reviewCount})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#64748b' }}>
          <span>{course.lessons} clases</span>
          <span style={{ color: '#d1d5db' }}>·</span>
          <span>{course.duration}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: course.free ? '#059669' : '#1a1a2e' }}>
            {formatPrice(course.price)}
          </span>
          {!course.free && course.originalPrice > course.price && (
            <span style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'line-through' }}>
              {formatPrice(course.originalPrice)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────
function Nav({ page, onNavigate, user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handler(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <nav style={{
      background: '#fff', borderBottom: '1px solid #f0ebfd',
      position: 'sticky', top: 0, zIndex: 100,
      boxShadow: '0 2px 12px rgba(124,58,237,.06)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <div onClick={() => onNavigate('home')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L3 6v8l7 4 7-4V6L10 2z" fill="rgba(255,255,255,.3)" stroke="#fff" strokeWidth="1.2"/>
              <path d="M10 2v12M3 6l7 4 7-4" stroke="#fff" strokeWidth="1.2"/>
            </svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#7c3aed', letterSpacing: -0.5 }}>CIAL<span style={{ color: '#059669' }}>cursos</span></span>
        </div>

        {/* Desktop Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="nav-links">
          <NavLink active={page === 'home'} onClick={() => onNavigate('home')}>Inicio</NavLink>
          <NavLink active={page === 'catalog'} onClick={() => onNavigate('catalog')}>Cursos</NavLink>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user ? (
            <div ref={menuRef} style={{ position: 'relative' }}>
              <div onClick={() => setMenuOpen(!menuOpen)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', borderRadius: 10, background: menuOpen ? '#f5f3ff' : 'transparent', transition: 'background .15s' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>{user.initials}</div>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }} className="hide-mobile">{user.name.split(' ')[0]}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="#94a3b8" style={{ transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><path d="M4 6l4 4 4-4"/></svg>
              </div>
              {menuOpen && (
                <div style={{ position: 'absolute', right: 0, top: 50, background: '#fff', border: '1px solid #f0ebfd', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,.12)', minWidth: 200, overflow: 'hidden', zIndex: 200 }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0ebfd' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{user.name}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{user.email}</div>
                  </div>
                  <DropItem onClick={() => { onNavigate('dashboard'); setMenuOpen(false); }}>Mi aprendizaje</DropItem>
                  <DropItem onClick={() => { onNavigate('profile'); setMenuOpen(false); }}>Mi perfil</DropItem>
                  {user.isAdmin && <DropItem onClick={() => { onNavigate('admin'); setMenuOpen(false); }}>Panel Admin</DropItem>}
                  <DropItem onClick={() => { onLogout(); setMenuOpen(false); }} danger>Cerrar sesión</DropItem>
                </div>
              )}
            </div>
          ) : (
            <>
              <Btn variant="ghost" size="sm" onClick={() => onNavigate('login')}>Iniciar sesión</Btn>
              <Btn variant="primary" size="sm" onClick={() => onNavigate('register')}>Registrarse</Btn>
            </>
          )}
          {/* Mobile menu toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="mobile-menu-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h16M3 11h16M3 16h16"/>
            </svg>
          </button>
        </div>
      </div>
      {/* Mobile dropdown */}
      {mobileOpen && (
        <div style={{ background: '#fff', borderTop: '1px solid #f0ebfd', padding: '12px 24px 20px' }} className="mobile-menu">
          <NavLink active={page === 'home'} onClick={() => { onNavigate('home'); setMobileOpen(false); }}>Inicio</NavLink>
          <NavLink active={page === 'catalog'} onClick={() => { onNavigate('catalog'); setMobileOpen(false); }}>Cursos</NavLink>
        </div>
      )}
    </nav>
  );
}

function NavLink({ children, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: active || hov ? '#f5f3ff' : 'transparent', color: active ? '#7c3aed' : '#374151', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 14, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', display: 'block', width: '100%', textAlign: 'left' }}>
      {children}
    </button>
  );
}

function DropItem({ children, onClick, danger }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'block', width: '100%', textAlign: 'left', background: hov ? (danger ? '#fff5f5' : '#f5f3ff') : 'transparent', color: danger ? '#ef4444' : '#374151', border: 'none', padding: '12px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'background .15s' }}>
      {children}
    </button>
  );
}

// ── Auth Illustration SVG ─────────────────────────────────
function AuthIllustration() {
  return (
    <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 340 }}>
      {/* Background circles */}
      <circle cx="200" cy="200" r="180" fill="#f5f3ff"/>
      <circle cx="200" cy="200" r="140" fill="#ede9fe"/>
      {/* Diploma/Certificate shape */}
      <rect x="110" y="130" width="180" height="140" rx="12" fill="#fff" stroke="#7c3aed" strokeWidth="2"/>
      <rect x="126" y="148" width="148" height="8" rx="4" fill="#ede9fe"/>
      <rect x="126" y="164" width="120" height="8" rx="4" fill="#ede9fe"/>
      <rect x="126" y="180" width="100" height="8" rx="4" fill="#ede9fe"/>
      {/* Ribbon */}
      <rect x="158" y="240" width="84" height="20" rx="4" fill="#7c3aed"/>
      <rect x="174" y="244" width="52" height="12" rx="3" fill="#6d28d9"/>
      {/* Star badge */}
      <circle cx="290" cy="130" r="32" fill="#059669"/>
      <path d="M290 116l3.6 7.2 8 1.2-5.8 5.6 1.4 8-7.2-3.8-7.2 3.8 1.4-8-5.8-5.6 8-1.2z" fill="#fff"/>
      {/* Book stack */}
      <rect x="80" y="240" width="70" height="14" rx="4" fill="#7c3aed"/>
      <rect x="84" y="228" width="62" height="14" rx="4" fill="#a78bfa"/>
      <rect x="88" y="216" width="54" height="14" rx="4" fill="#c4b5fd"/>
      {/* Play button circle */}
      <circle cx="310" cy="260" r="28" fill="#7c3aed"/>
      <path d="M304 252l18 8-18 8V252z" fill="#fff"/>
      {/* Small dots decoration */}
      <circle cx="140" cy="100" r="6" fill="#059669"/>
      <circle cx="160" cy="90" r="4" fill="#7c3aed" opacity=".5"/>
      <circle cx="260" cy="320" r="8" fill="#7c3aed" opacity=".3"/>
      <circle cx="240" cy="336" r="5" fill="#059669" opacity=".5"/>
      <circle cx="330" cy="180" r="5" fill="#059669"/>
    </svg>
  );
}

Object.assign(window, { StarRating, Badge, Btn, Input, CourseCard, Nav, AuthIllustration, formatPrice });
