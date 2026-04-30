// Admin Portal

const { useState: useAdminState, useMemo: useAdminMemo, useEffect: useAdminEffect } = React;

// ── Layout ────────────────────────────────────────────────
function AdminPage({ onNavigate, user }) {
  const [section, setSection] = useAdminState('overview');
  const [editorTarget, setEditorTarget] = useAdminState(null); // null=picker, 'new'=new, id=edit
  const [sidebarOpen, setSidebarOpen] = useAdminState(false);

  function goEditor(target) {
    setEditorTarget(target);
    setSection('editor');
    setSidebarOpen(false);
  }

  const sections = [
    { id: 'overview', label: 'Inicio',           icon: <GridIcon /> },
    { id: 'courses',  label: 'Cursos',           icon: <BookIcon /> },
    { id: 'editor',   label: 'Editor de cursos', icon: <EditIcon /> },
    { id: 'users',    label: 'Usuarios',          icon: <UsersIcon /> },
  ];

  function handleSection(id) {
    if (id !== 'editor') setEditorTarget(null);
    setSection(id);
    setSidebarOpen(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf9ff', display: 'flex', position: 'relative' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200 }}/>
      )}

      {/* Sidebar */}
      <aside style={{
        width: 220, background: '#1e0a3c', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 64, height: 'calc(100vh - 64px)',
        transition: 'transform .25s ease',
      }} className="admin-sidebar">
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: .8 }}>Panel Admin</div>
        </div>
        <nav style={{ padding: '12px 10px', flex: 1 }}>
          {sections.map(s => (
            <SidebarItem key={s.id} active={section === s.id} icon={s.icon} label={s.label} onClick={() => handleSection(s.id)} />
          ))}
        </nav>
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <div onClick={() => onNavigate('home')} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 12px', borderRadius: 10, color: 'rgba(255,255,255,.5)', fontSize: 13, transition: 'background .15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 8l5-5 5 5M4 7v6h3v-3h2v3h3V7"/></svg>
            Volver al sitio
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile top bar */}
        <div className="admin-mobile-bar" style={{ background: '#1e0a3c', padding: '0 16px', height: 52, display: 'none', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#fff' }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h16M3 11h16M3 16h16"/>
            </svg>
          </button>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
            {sections.find(s => s.id === section)?.label || 'Admin'}
          </span>
        </div>

        {/* Mobile sidebar drawer */}
        {sidebarOpen && (
          <div style={{ position: 'fixed', top: 64, left: 0, width: 240, height: 'calc(100vh - 64px)', background: '#1e0a3c', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: .8 }}>Panel Admin</div>
            </div>
            <nav style={{ padding: '12px 10px', flex: 1 }}>
              {sections.map(s => (
                <SidebarItem key={s.id} active={section === s.id} icon={s.icon} label={s.label} onClick={() => handleSection(s.id)} />
              ))}
            </nav>
            <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
              <div onClick={() => onNavigate('home')} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 12px', borderRadius: 10, color: 'rgba(255,255,255,.5)', fontSize: 13 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 8l5-5 5 5M4 7v6h3v-3h2v3h3V7"/></svg>
                Volver al sitio
              </div>
            </div>
          </div>
        )}

        <main style={{ flex: 1, overflow: 'auto' }}>
          {section === 'overview' && <AdminOverview onNavigate={onNavigate} setSection={setSection} />}
          {section === 'courses'  && <AdminCourses onNavigate={onNavigate} goEditor={goEditor} />}
          {section === 'editor'   && <CourseEditorPage onNavigate={onNavigate} target={editorTarget} onTargetChange={setEditorTarget} />}
          {section === 'users'    && <AdminUsers />}
        </main>
      </div>
    </div>
  );
}

function SidebarItem({ active, icon, label, onClick }) {
  const [hov, setHov] = useAdminState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', padding: '10px 14px', borderRadius: 10,
        background: active ? 'rgba(124,58,237,.5)' : hov ? 'rgba(255,255,255,.06)' : 'transparent',
        border: 'none', color: active ? '#fff' : 'rgba(255,255,255,.6)',
        fontFamily: 'inherit', fontSize: 14, fontWeight: active ? 700 : 400,
        cursor: 'pointer', textAlign: 'left', marginBottom: 2, transition: 'all .15s',
      }}>
      <span style={{ opacity: active ? 1 : 0.7 }}>{icon}</span>
      {label}
    </button>
  );
}

// ── Overview ──────────────────────────────────────────────
function AdminOverview({ setSection }) {
  const { data } = window.CIAL;
  const totalRevenue = data.recentSales.filter(s => s.status === 'aprobado').reduce((acc, s) => acc + s.amount, 0);

  const stats = [
    { label: 'Usuarios totales', value: data.allUsers.length, sub: `${data.allUsers.filter(u => u.active).length} activos`, color: '#7c3aed' },
    { label: 'Cursos publicados', value: data.courses.length, sub: '1 gratuito', color: '#059669' },
    { label: 'Matrículas activas', value: data.enrolledIds.length * 3 + 8, sub: 'Este mes', color: '#0284c7' },
    { label: 'Ingresos (últimos 7d)', value: '$' + totalRevenue.toLocaleString('es-AR'), sub: `${data.recentSales.filter(s => s.status === 'aprobado').length} ventas`, color: '#b45309' },
  ];

  return (
    <div style={{ padding: 'clamp(24px,3vw,40px)' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1a1a2e', letterSpacing: -.5, margin: '0 0 4px' }}>Panel de administración</h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>Resumen general de la plataforma</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 32 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', border: '1px solid #f0ebfd', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }}></div>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#1a1a2e', letterSpacing: -1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Recent sales */}
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f0ebfd', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0ebfd', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>Ventas recientes</h2>
          <Btn variant="ghost" size="sm" onClick={() => setSection('courses')}>Ver cursos</Btn>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#faf9ff' }}>
                {['Estudiante','Curso','Monto','Fecha','Estado'].map(h => (
                  <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .5, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recentSales.map((sale, i) => (
                <tr key={sale.id} style={{ borderTop: '1px solid #f0ebfd', background: i % 2 === 0 ? '#fff' : '#fefefe' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {sale.student.split(' ').map(w => w[0]).join('').slice(0,2)}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', whiteSpace: 'nowrap' }}>{sale.student}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#374151', maxWidth: 200 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sale.course}</div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 700, color: '#1a1a2e', whiteSpace: 'nowrap' }}>${sale.amount.toLocaleString('es-AR')}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>{sale.date}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 99,
                      background: sale.status === 'aprobado' ? '#d1fae5' : '#fef3c7',
                      color: sale.status === 'aprobado' ? '#059669' : '#b45309',
                    }}>{sale.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Courses Management ────────────────────────────────────
function AdminCourses({ onNavigate, goEditor }) {
  const { data } = window.CIAL;
  const [courses, setCourses] = useAdminState([...data.courses]);
  const [modal, setModal] = useAdminState(null); // null | 'create' | courseObj
  const [deleteConfirm, setDeleteConfirm] = useAdminState(null);

  function handleDelete(id) {
    setCourses(prev => prev.filter(c => c.id !== id));
    setDeleteConfirm(null);
  }

  function handleSave(courseData) {
    if (courseData.id) {
      setCourses(prev => prev.map(c => c.id === courseData.id ? { ...c, ...courseData } : c));
    } else {
      const newCourse = { ...courseData, id: Date.now(), instructorInitials: courseData.instructor.split(' ').map(w => w[0]).slice(0,2).join(''), cardColor: '#7c3aed', featured: false, free: courseData.price === 0, modules: [], rating: 0, reviewCount: 0, students: 0 };
      setCourses(prev => [...prev, newCourse]);
    }
    setModal(null);
  }

  return (
    <div style={{ padding: 'clamp(24px,3vw,40px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1a1a2e', letterSpacing: -.5, margin: '0 0 4px' }}>Cursos</h1>
          <p style={{ fontSize: 14, color: '#64748b' }}>{courses.length} cursos en la plataforma</p>
        </div>
        <Btn variant="primary" onClick={() => setModal({ isNew: true })}>+ Nuevo curso</Btn>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f0ebfd', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#faf9ff' }}>
                {['Curso','Categoría','Nivel','Precio','Estudiantes','Acciones'].map(h => (
                  <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .5, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {courses.map((course, i) => (
                <tr key={course.id} style={{ borderTop: '1px solid #f0ebfd', background: i % 2 === 0 ? '#fff' : '#fefefe' }}>
                  <td style={{ padding: '14px 20px', maxWidth: 260 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg,${course.cardColor}cc,${course.cardColor}66)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{course.instructorInitials}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', lineHeight: 1.3 }}>{course.title}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{course.instructor}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px' }}><Badge>{course.category}</Badge></td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#374151' }}>{course.level}</td>
                  <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 700, color: course.free ? '#059669' : '#1a1a2e', whiteSpace: 'nowrap' }}>{course.free ? 'Gratis' : '$' + course.price.toLocaleString('es-AR')}</td>
                  <td style={{ padding: '14px 20px', fontSize: 14, color: '#374151' }}>{course.students}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Btn variant="outline" size="sm" onClick={() => goEditor ? goEditor(course.id) : setModal(course)}>Editar</Btn>
                      <Btn variant="ghost" size="sm" onClick={() => onNavigate('course', { courseId: course.id })}>Ver</Btn>
                      <Btn size="sm" style={{ background: 'transparent', color: '#ef4444', border: '1.5px solid #fecaca' }} onClick={() => setDeleteConfirm(course.id)}>Eliminar</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Course modal */}
      {modal && <CourseModal course={modal.isNew ? null : modal} onSave={handleSave} onClose={() => setModal(null)} />}

      {/* Delete confirm */}
      {deleteConfirm && (
        <ModalOverlay onClose={() => setDeleteConfirm(null)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '28px 32px', maxWidth: 420, width: '90%' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', marginBottom: 12 }}>¿Eliminar curso?</div>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>Esta acción no se puede deshacer. Se perderán todas las matrículas asociadas.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <Btn variant="outline" fullWidth onClick={() => setDeleteConfirm(null)}>Cancelar</Btn>
              <Btn variant="danger" fullWidth onClick={() => handleDelete(deleteConfirm)}>Sí, eliminar</Btn>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

function CourseModal({ course, onSave, onClose }) {
  const { data } = window.CIAL;
  const [tab, setTab] = useAdminState('info');
  const [form, setForm] = useAdminState({
    title: course?.title || '',
    instructor: course?.instructor || '',
    category: course?.category || 'Endodoncia',
    categoryId: course?.categoryId || 1,
    level: course?.level || 'Básico',
    price: course?.price ?? '',
    originalPrice: course?.originalPrice ?? '',
    description: course?.description || '',
  });
  const [files, setFiles] = useAdminState(course?.resources || []);
  const [dragOver, setDragOver] = useAdminState(false);
  const fileInputRef = React.useRef(null);

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })); }
  function handleCat(e) {
    const cat = data.categories.find(c => c.name === e.target.value);
    setForm(f => ({ ...f, category: e.target.value, categoryId: cat?.id || 1 }));
  }

  function addFiles(fileList) {
    const newFiles = Array.from(fileList).map(f => ({
      id: Date.now() + Math.random(),
      name: f.name,
      size: f.size,
      type: f.type.startsWith('video') ? 'video' : 'doc',
      fakeUrl: '#',
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }

  function removeFile(id) { setFiles(prev => prev.filter(f => f.id !== id)); }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  function fmtSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  const MODAL_TABS = [['info','Información'],['files','Archivos' + (files.length ? ` (${files.length})` : '')]];

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, maxWidth: 600, width: '94%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '22px 28px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e' }}>{course ? 'Editar curso' : 'Nuevo curso'}</div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8', lineHeight: 1 }}>×</button>
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #f0ebfd' }}>
            {MODAL_TABS.map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{ padding: '10px 18px', border: 'none', borderBottom: tab === id ? '2px solid #7c3aed' : '2px solid transparent', background: 'transparent', color: tab === id ? '#7c3aed' : '#64748b', fontFamily: 'inherit', fontSize: 14, fontWeight: tab === id ? 700 : 500, cursor: 'pointer', marginBottom: -1 }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 28px', overflowY: 'auto', flex: 1 }}>
          {tab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input label="Título del curso" value={form.title} onChange={set('title')} placeholder="Ej: Endodoncia Avanzada" />
              <Input label="Instructor" value={form.instructor} onChange={set('instructor')} placeholder="Ej: Dr. Martín Rodríguez" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <FormSelect label="Categoría" value={form.category} onChange={handleCat}>
                  {data.categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </FormSelect>
                <FormSelect label="Nivel" value={form.level} onChange={set('level')}>
                  {['Básico','Intermedio','Avanzado'].map(l => <option key={l} value={l}>{l}</option>)}
                </FormSelect>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Input label="Precio ($)" type="number" value={form.price} onChange={set('price')} placeholder="0 = gratis" />
                <Input label="Precio original ($)" type="number" value={form.originalPrice} onChange={set('originalPrice')} placeholder="Sin descuento" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Descripción</label>
                <textarea value={form.description} onChange={set('description')} rows={4} placeholder="Descripción del curso…"
                  style={{ padding: '12px 16px', borderRadius: 10, border: '1.5px solid #e2d9f7', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', color: '#1a1a2e', lineHeight: 1.5 }}/>
              </div>
            </div>
          )}

          {tab === 'files' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{ border: `2px dashed ${dragOver ? '#7c3aed' : '#c4b5fd'}`, borderRadius: 14, padding: '32px 24px', textAlign: 'center', cursor: 'pointer', background: dragOver ? '#f5f3ff' : '#faf9ff', transition: 'all .2s' }}>
                <input ref={fileInputRef} type="file" multiple accept="video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
                <div style={{ width: 48, height: 48, borderRadius: 14, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Arrastrá archivos aquí o hacé click</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Videos (MP4, MOV), documentos (PDF, DOC, PPT, XLS)</div>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .5 }}>Archivos agregados ({files.length})</div>
                  {files.map(f => (
                    <FileRow key={f.id} file={f} onRemove={() => removeFile(f.id)} fmtSize={fmtSize} />
                  ))}
                </div>
              )}

              {files.length === 0 && (
                <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: '#94a3b8' }}>
                  Todavía no hay archivos en este curso.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px 22px', borderTop: '1px solid #f0ebfd', display: 'flex', gap: 12, flexShrink: 0 }}>
          <Btn variant="outline" fullWidth onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" fullWidth onClick={() => onSave({ ...form, id: course?.id, price: Number(form.price), originalPrice: Number(form.originalPrice), resources: files })}>
            {course ? 'Guardar cambios' : 'Crear curso'}
          </Btn>
        </div>
      </div>
    </ModalOverlay>
  );
}

function FileRow({ file, onRemove, fmtSize }) {
  const isVideo = file.type === 'video';
  const ext = file.name.split('.').pop().toUpperCase();
  const colors = { PDF: ['#fee2e2','#ef4444'], DOC: ['#dbeafe','#2563eb'], DOCX: ['#dbeafe','#2563eb'], PPT: ['#ffedd5','#ea580c'], PPTX: ['#ffedd5','#ea580c'], XLS: ['#dcfce7','#16a34a'], XLSX: ['#dcfce7','#16a34a'], MP4: ['#ede9fe','#7c3aed'], MOV: ['#ede9fe','#7c3aed'] };
  const [bg, fg] = colors[ext] || ['#f1f5f9','#64748b'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#faf9ff', border: '1px solid #f0ebfd', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {isVideo
          ? <svg width="16" height="16" viewBox="0 0 16 16" fill={fg}><path d="M2 4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4zm9 1.5l3-2v7l-3-2V5.5z"/></svg>
          : <span style={{ fontSize: 9, fontWeight: 800, color: fg, letterSpacing: -.3 }}>{ext}</span>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
        {file.size > 0 && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{fmtSize(file.size)}</div>}
      </div>
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, display: 'flex', alignItems: 'center' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 4L4 12M4 4l8 8"/></svg>
      </button>
    </div>
  );
}

// ── Users Management ──────────────────────────────────────
function AdminUsers() {
  const { data } = window.CIAL;
  const [users, setUsers] = useAdminState([...data.allUsers]);
  const [search, setSearch] = useAdminState('');

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  function toggleActive(id) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, active: !u.active } : u));
  }

  return (
    <div style={{ padding: 'clamp(24px,3vw,40px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1a1a2e', letterSpacing: -.5, margin: '0 0 4px' }}>Usuarios</h1>
          <p style={{ fontSize: 14, color: '#64748b' }}>{users.filter(u => u.active).length} activos de {users.length} totales</p>
        </div>
        <div style={{ background: '#fff', borderRadius: 10, border: '1.5px solid #e2d9f7', display: 'flex', alignItems: 'center', overflow: 'hidden', width: 240 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" style={{ marginLeft: 12, flexShrink: 0 }}><circle cx="7" cy="7" r="4"/><path d="m10 10 2.5 2.5"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar usuario…"
            style={{ flex: 1, padding: '10px 12px', border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', color: '#1a1a2e', background: 'transparent' }}/>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f0ebfd', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#faf9ff' }}>
                {['Usuario','Email','Matrículas','Ingresó','Estado','Acción'].map(h => (
                  <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .5, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} style={{ borderTop: '1px solid #f0ebfd', background: i % 2 === 0 ? '#fff' : '#fefefe' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{u.initials}</div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#64748b' }}>{u.email}</td>
                  <td style={{ padding: '14px 20px', fontSize: 14, color: '#374151', textAlign: 'center' }}>{u.enrolled}</td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>{u.joined}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 99, background: u.active ? '#d1fae5' : '#f1f5f9', color: u.active ? '#059669' : '#94a3b8' }}>
                      {u.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <Btn size="sm" variant={u.active ? 'ghost' : 'secondary'} onClick={() => toggleActive(u.id)}>
                      {u.active ? 'Desactivar' : 'Activar'}
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Shared modal helpers ──────────────────────────────────
function ModalOverlay({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function FormSelect({ label, value, onChange, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</label>}
      <select value={value} onChange={onChange}
        style={{ padding: '12px 16px', borderRadius: 10, border: '1.5px solid #e2d9f7', fontSize: 14, fontFamily: 'inherit', color: '#1a1a2e', background: '#fff', outline: 'none', cursor: 'pointer' }}>
        {children}
      </select>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────
function GridIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>;
}
function EditIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11.5 2.5z"/></svg>;
}
function BookIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2h5a1 1 0 0 1 1 1v10a1 1 0 0 0-1-1H2V2zM14 2H9a1 1 0 0 0-1 1v10a1 1 0 0 1 1-1h5V2z"/></svg>;
}
function UsersIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="5" r="2.5"/><path d="M1 13c0-2.8 2.2-5 5-5s5 2.2 5 5"/><circle cx="12" cy="5" r="2"/><path d="M12 9.5c1.7 0 3 1.3 3 3"/></svg>;
}

Object.assign(window, { AdminPage, ModalOverlay, FormSelect });
