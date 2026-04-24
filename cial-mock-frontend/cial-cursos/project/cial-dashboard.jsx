// Student Dashboard

const { useState: useDashState } = React;

function DashboardPage({ onNavigate, user }) {
  const { data } = window.CIAL;
  const enrolled = data.courses.filter(c => data.enrolledIds.includes(c.id));
  const [activeTab, setActiveTab] = useDashState('learning');

  return (
    <div style={{ minHeight: '100vh', background: '#faf9ff' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1e0a3c,#3b1a7a)', padding: 'clamp(32px,5vw,52px) 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{user.initials}</div>
            <div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', marginBottom: 4 }}>Bienvenida de vuelta</div>
              <div style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>{user.name}</div>
            </div>
          </div>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 16 }}>
            {[
              { label: 'Cursos inscriptos', value: enrolled.length },
              { label: 'Cursos completados', value: Object.values(data.progress).filter(p => p === 100).length },
              { label: 'Horas aprendidas', value: '26h' },
              { label: 'Certificados', value: 0 },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,.08)', borderRadius: 14, padding: '16px 20px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.12)' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#a78bfa' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f0ebfd' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 4 }}>
          {[['learning','Mi aprendizaje'],['explore','Explorar más']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              style={{ padding: '16px 20px', border: 'none', borderBottom: activeTab === id ? '2px solid #7c3aed' : '2px solid transparent', background: 'transparent', color: activeTab === id ? '#7c3aed' : '#64748b', fontFamily: 'inherit', fontSize: 14, fontWeight: activeTab === id ? 700 : 500, cursor: 'pointer', transition: 'all .15s' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        {activeTab === 'learning' && (
          <div>
            {enrolled.length === 0 ? (
              <EmptyState onNavigate={onNavigate} />
            ) : (
              <>
                {/* Continue watching */}
                <div style={{ marginBottom: 40 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', margin: '0 0 20px', letterSpacing: -0.3 }}>Continuar aprendiendo</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {enrolled.map(course => (
                      <ProgressCard key={course.id} course={course} progress={data.progress[course.id] || 0} onNavigate={onNavigate} />
                    ))}
                  </div>
                </div>

                {/* Achievement */}
                <div style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', borderRadius: 20, padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 4l2.5 5.2 5.7.8-4.1 4 1 5.7L14 17l-5.1 2.7 1-5.7-4.1-4 5.7-.8z" fill="#fff"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 }}>¡Estás progresando muy bien!</div>
                    <div style={{ fontSize: 14, color: '#64748b' }}>Completaste el 87% de Cirugía Oral Básica. ¡Terminalo y obtené tu certificado!</div>
                  </div>
                  <Btn variant="primary" onClick={() => onNavigate('course', { courseId: 3 })}>Continuar curso</Btn>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'explore' && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', margin: '0 0 8px', letterSpacing: -0.3 }}>Cursos recomendados para vos</h2>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px' }}>Basados en tus cursos actuales</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20 }}>
              {data.courses.filter(c => !data.enrolledIds.includes(c.id)).map(c => (
                <CourseCard key={c.id} course={c} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressCard({ course, progress, onNavigate }) {
  const [hov, setHov] = useDashState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #f0ebfd', overflow: 'hidden', display: 'flex', boxShadow: hov ? '0 6px 24px rgba(124,58,237,.1)' : '0 2px 8px rgba(0,0,0,.04)', transition: 'all .2s' }}
    >
      {/* Left color strip */}
      <div style={{ width: 6, background: `linear-gradient(to bottom,${course.cardColor},${course.cardColor}66)`, flexShrink: 0 }}/>
      {/* Thumbnail */}
      <div style={{ width: 100, flexShrink: 0, background: `linear-gradient(135deg,${course.cardColor}dd,${course.cardColor}77)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="progress-thumb">
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff' }}>{course.instructorInitials}</div>
      </div>
      {/* Content */}
      <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: course.cardColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>{course.category}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.3 }}>{course.title}</div>
        <div style={{ fontSize: 12, color: '#64748b' }}>{course.instructor}</div>
        {/* Progress bar */}
        <div style={{ marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>Progreso</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: progress >= 80 ? '#059669' : '#7c3aed' }}>{progress}%</span>
          </div>
          <div style={{ height: 6, background: '#f0ebfd', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: progress >= 80 ? 'linear-gradient(90deg,#059669,#34d399)' : 'linear-gradient(90deg,#7c3aed,#a78bfa)', borderRadius: 99, transition: 'width .6s ease' }}/>
          </div>
        </div>
      </div>
      {/* Action */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <Btn variant="primary" size="sm" onClick={() => onNavigate('course', { courseId: course.id })}>
          {progress > 0 ? 'Continuar' : 'Comenzar'}
        </Btn>
      </div>
    </div>
  );
}

function EmptyState({ onNavigate }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M20 5L5 12v16l15 7 15-7V12L20 5z" fill="#ede9fe" stroke="#7c3aed" strokeWidth="1.5"/>
          <path d="M20 5v24M5 12l15 8 15-8" stroke="#7c3aed" strokeWidth="1.3"/>
        </svg>
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', margin: '0 0 8px' }}>Todavía no tenés cursos</h3>
      <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px', lineHeight: 1.6 }}>Explorá el catálogo y comenzá tu formación hoy.</p>
      <Btn variant="primary" onClick={() => onNavigate('catalog')}>Ver catálogo de cursos</Btn>
    </div>
  );
}

Object.assign(window, { DashboardPage });
