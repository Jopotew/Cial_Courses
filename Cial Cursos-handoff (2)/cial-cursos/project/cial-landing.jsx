// Landing page for CIAL Cursos

const { useState: useLandState } = React;

function LandingPage({ onNavigate }) {
  const { data } = window.CIAL;
  const featured = data.courses.filter(c => c.featured);

  return (
    <div style={{ background: '#fff' }}>
      <HeroSection onNavigate={onNavigate} />
      <StatsBar />
      <CategoriesSection categories={data.categories} onNavigate={onNavigate} />
      <FeaturedSection courses={featured} onNavigate={onNavigate} />
      <CtaBanner onNavigate={onNavigate} />
      <Footer onNavigate={onNavigate} />
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────
function HeroSection({ onNavigate }) {
  const [search, setSearch] = useLandState('');

  function handleSearch(e) {
    e.preventDefault();
    onNavigate('catalog', { search });
  }

  return (
    <section style={{
      background: 'linear-gradient(135deg, #1e0a3c 0%, #3b1a7a 50%, #4c1d95 100%)',
      padding: 'clamp(60px,10vw,100px) 24px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative blobs */}
      <div style={{ position: 'absolute', top: -80, right: -80, width: 360, height: 360, borderRadius: '50%', background: 'rgba(124,58,237,.25)', filter: 'blur(60px)', pointerEvents: 'none' }}/>
      <div style={{ position: 'absolute', bottom: -60, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'rgba(5,150,105,.2)', filter: 'blur(50px)', pointerEvents: 'none' }}/>

      <div style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.1)', borderRadius: 99, padding: '6px 16px', marginBottom: 28 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6ee7b7', display: 'inline-block' }}></span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,.85)', fontWeight: 500 }}>Plataforma oficial de formación CIAL</span>
        </div>

        <h1 style={{
          fontSize: 'clamp(32px,6vw,58px)', fontWeight: 900, color: '#fff',
          lineHeight: 1.1, margin: '0 0 20px', letterSpacing: -1.5,
          textWrap: 'balance',
        }}>
          Formación clínica de <span style={{ color: '#a78bfa' }}>excelencia</span> para odontólogos
        </h1>

        <p style={{ fontSize: 'clamp(16px,2vw,20px)', color: 'rgba(255,255,255,.75)', lineHeight: 1.6, margin: '0 0 40px', maxWidth: 580, marginLeft: 'auto', marginRight: 'auto' }}>
          Cursos 100% online, a tu ritmo. Aprendé con los mejores especialistas del país y potenciá tu práctica clínica.
        </p>

        {/* Search bar */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 0, maxWidth: 560, margin: '0 auto 36px', background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,.3)' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscá un curso (ej: endodoncia, estética…)"
            style={{ flex: 1, padding: '16px 20px', border: 'none', outline: 'none', fontSize: 15, fontFamily: 'inherit', color: '#1a1a2e', background: 'transparent' }}
          />
          <button type="submit" style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '0 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', borderRadius: '0 14px 14px 0', whiteSpace: 'nowrap' }}>Buscar</button>
        </form>

        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['Endodoncia', 'Estética Dental', 'Cirugía Oral'].map(tag => (
            <span key={tag} onClick={() => onNavigate('catalog', { category: tag })}
              style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', cursor: 'pointer', textDecoration: 'underline' }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Stats bar ─────────────────────────────────────────────
function StatsBar() {
  const stats = [
    { value: '44+', label: 'Cursos disponibles' },
    { value: '3.200+', label: 'Estudiantes activos' },
    { value: '18', label: 'Instructores expertos' },
    { value: '4.8', label: 'Calificación promedio' },
  ];
  return (
    <div style={{ background: '#1e0a3c', padding: '28px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 24 }}>
        {stats.map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#a78bfa', letterSpacing: -1 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Categories ────────────────────────────────────────────
function CategoriesSection({ categories, onNavigate }) {
  return (
    <section style={{ padding: 'clamp(48px,6vw,80px) 24px', background: '#faf9ff' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionHeader title="Explorá por categoría" subtitle="Encontrá el área de especialización que más te interesa" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 16, marginTop: 36 }}>
          {categories.map(cat => <CategoryCard key={cat.id} cat={cat} onNavigate={onNavigate} />)}
        </div>
      </div>
    </section>
  );
}

function CategoryCard({ cat, onNavigate }) {
  const [hov, setHov] = useLandState(false);
  return (
    <div
      onClick={() => onNavigate('catalog', { categoryId: cat.id })}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? cat.bg : '#fff',
        border: `1.5px solid ${hov ? cat.color + '55' : '#f0ebfd'}`,
        borderRadius: 16, padding: '24px 20px', cursor: 'pointer',
        textAlign: 'center', transition: 'all .2s', transform: hov ? 'translateY(-2px)' : 'none',
        boxShadow: hov ? `0 8px 24px ${cat.color}22` : '0 2px 8px rgba(0,0,0,.04)',
      }}
    >
      <div style={{ width: 48, height: 48, borderRadius: 14, background: cat.bg, border: `1.5px solid ${cat.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" fill={cat.color + '33'} stroke={cat.color} strokeWidth="1.5"/>
          <path d="M12 2v14M3 7l9 5 9-5" stroke={cat.color} strokeWidth="1.2"/>
        </svg>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.3 }}>{cat.name}</div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{cat.count} cursos</div>
    </div>
  );
}

// ── Featured courses ──────────────────────────────────────
function FeaturedSection({ courses, onNavigate }) {
  return (
    <section style={{ padding: 'clamp(48px,6vw,80px) 24px', background: '#fff' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 36 }}>
          <SectionHeader title="Cursos destacados" subtitle="Los más elegidos por nuestros estudiantes" noMargin />
          <Btn variant="outline" size="sm" onClick={() => onNavigate('catalog')}>Ver todos los cursos</Btn>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 24 }}>
          {courses.map(c => <CourseCard key={c.id} course={c} onNavigate={onNavigate} />)}
        </div>
      </div>
    </section>
  );
}

// ── CTA Banner ────────────────────────────────────────────
function CtaBanner({ onNavigate }) {
  return (
    <section style={{ padding: 'clamp(40px,6vw,72px) 24px', background: 'linear-gradient(135deg,#7c3aed,#059669)' }}>
      <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(24px,4vw,38px)', fontWeight: 900, color: '#fff', margin: '0 0 16px', letterSpacing: -0.5 }}>
          Comenzá tu formación hoy
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,.8)', lineHeight: 1.6, margin: '0 0 32px' }}>
          Accedé a cursos gratuitos y de pago. Avanzá a tu ritmo y obtené tu certificado.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Btn size="lg" style={{ background: '#fff', color: '#7c3aed' }} onClick={() => onNavigate('register')}>Crear cuenta gratis</Btn>
          <Btn size="lg" style={{ background: 'transparent', color: '#fff', border: '2px solid rgba(255,255,255,.5)' }} onClick={() => onNavigate('catalog')}>Ver cursos</Btn>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────
function Footer({ onNavigate }) {
  return (
    <footer style={{ background: '#0f0520', padding: '40px 24px 28px', color: 'rgba(255,255,255,.55)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 32, marginBottom: 36 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 12 }}>CIAL<span style={{ color: '#6ee7b7' }}>cursos</span></div>
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>Formación continua para profesionales de la salud bucal en toda Latinoamérica.</p>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>Plataforma</div>
            {['Catálogo de cursos','Sobre CIAL','Instructores'].map(l => (
              <div key={l} style={{ fontSize: 13, marginBottom: 10, cursor: 'pointer' }} onClick={() => onNavigate('catalog')}>{l}</div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>Cuenta</div>
            {['Iniciar sesión','Registrarse','Mi aprendizaje'].map((l, i) => (
              <div key={l} style={{ fontSize: 13, marginBottom: 10, cursor: 'pointer' }} onClick={() => onNavigate(['login','register','dashboard'][i])}>{l}</div>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 20, fontSize: 12, textAlign: 'center' }}>
          © 2026 CIAL · Todos los derechos reservados
        </div>
      </div>
    </footer>
  );
}

// ── Helpers ───────────────────────────────────────────────
function SectionHeader({ title, subtitle, noMargin }) {
  return (
    <div style={{ marginBottom: noMargin ? 0 : 0 }}>
      <h2 style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 800, color: '#1a1a2e', margin: '0 0 8px', letterSpacing: -0.5 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 15, color: '#64748b', margin: 0 }}>{subtitle}</p>}
    </div>
  );
}

Object.assign(window, { LandingPage, Footer });
