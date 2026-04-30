// Course Editor — full inline editor for admin

const { useState: useEdState, useRef: useEdRef, useEffect: useEdEffect } = React;

// ── Entry: course picker ──────────────────────────────────
function CourseEditorPage({ onNavigate, target, onTargetChange }) {
  const { data } = window.CIAL;

  // target: null = picker, 'new' = create, number = edit existing
  const [localTarget, setLocalTarget] = useEdState(target ?? null);

  // Sync when parent changes target (e.g. clicking Editar from courses list)
  useEdEffect(() => {
    if (target !== undefined && target !== null) setLocalTarget(target);
  }, [target]);

  function goTo(t) {
    setLocalTarget(t);
    if (onTargetChange) onTargetChange(t);
  }

  // New empty course template
  const newCourseTpl = {
    id: null,
    title: '', subtitle: '', instructor: '', instructorTitle: '',
    description: '', price: 0, originalPrice: 0,
    level: 'Básico', categoryId: 1, category: 'Endodoncia',
    featured: false, free: true, cardColor: '#7c3aed',
    instructorInitials: '', rating: 0, reviewCount: 0, students: 0,
    duration: '0h', lessons: 0, modules: [], resources: [],
  };

  if (localTarget === 'new') {
    return <CourseEditor course={newCourseTpl} isNew onBack={() => goTo(null)} onNavigate={onNavigate} />;
  }

  if (localTarget !== null) {
    const course = data.courses.find(c => c.id === localTarget);
    if (!course) { goTo(null); return null; }
    return <CourseEditor course={course} onBack={() => goTo(null)} onNavigate={onNavigate} />;
  }

  return (
    <div style={{ padding: 'clamp(24px,3vw,40px)' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1a1a2e', letterSpacing: -.5, margin: '0 0 4px' }}>Editor de cursos</h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>Seleccioná un curso para editar su contenido</p>
      </div>
      <div style={{ marginBottom: 20 }}>
        <Btn variant="primary" onClick={() => goTo('new')}>+ Crear nuevo curso</Btn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
        {data.courses.map(c => (
          <CoursePickerCard key={c.id} course={c} onEdit={() => goTo(c.id)} />
        ))}
      </div>
    </div>
  );
}

function CoursePickerCard({ course, onEdit }) {
  const [hov, setHov] = useEdState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: '#fff', borderRadius: 16, border: `1.5px solid ${hov ? '#c4b5fd' : '#f0ebfd'}`, padding: '20px 22px', display: 'flex', gap: 16, alignItems: 'center', transition: 'all .18s', boxShadow: hov ? '0 6px 24px rgba(124,58,237,.1)' : 'none' }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg,${course.cardColor}cc,${course.cardColor}66)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{course.instructorInitials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.3, marginBottom: 3 }}>{course.title}</div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>{course.modules.length} módulos · {course.lessons} clases</div>
      </div>
      <Btn variant="primary" size="sm" onClick={onEdit}>Editar</Btn>
    </div>
  );
}

// ── Main editor ───────────────────────────────────────────
function CourseEditor({ course: initialCourse, isNew, onBack, onNavigate }) {
  const [course, setCourse] = useEdState(() => JSON.parse(JSON.stringify({
    ...initialCourse,
    modules: (initialCourse.modules || []).map((mod, mi) => ({
      ...mod,
      id: mod.id || `mod-${mi}`,
      lessons: Array.from({ length: mod.lessons }, (_, li) => ({
        id: `${mi}-${li}`,
        title: `${mod.title} — parte ${li + 1}`,
        duration: '12:00',
        video: null,
        files: [],
        ...(mod.lessonData?.[li] || {}),
      })),
    })),
    resources: initialCourse.resources || [],
  })));

  const [selected, setSelected] = useEdState({ type: 'course' }); // {type:'course'} | {type:'module',mi} | {type:'lesson',mi,li}
  const [saved, setSaved] = useEdState(false);
  const [unsaved, setUnsaved] = useEdState(false);

  function update(fn) { setCourse(c => { const n = fn(JSON.parse(JSON.stringify(c))); return n; }); setUnsaved(true); }

  function save() {
    const saved_course = {
      ...window.CIAL.data.courses.find(c => c.id === course.id) || {},
      ...course,
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      instructor: course.instructor,
      instructorTitle: course.instructorTitle,
      instructorInitials: course.instructor.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() || course.instructorInitials,
      resources: course.resources,
      lessons: course.modules.reduce((acc, m) => acc + m.lessons.length, 0),
      modules: course.modules.map(m => ({
        ...m,
        lessons: m.lessons.length,
        lessonData: m.lessons,
      })),
      free: course.price === 0,
    };
    if (isNew || !course.id) {
      // Create new course
      const newId = Date.now();
      saved_course.id = newId;
      saved_course.cardColor = saved_course.cardColor || '#7c3aed';
      saved_course.rating = 0; saved_course.reviewCount = 0; saved_course.students = 0;
      window.CIAL.data.courses.push(saved_course);
    } else {
      const idx = window.CIAL.data.courses.findIndex(c => c.id === course.id);
      if (idx >= 0) window.CIAL.data.courses[idx] = saved_course;
    }
    setSaved(true); setUnsaved(false);
    setTimeout(() => setSaved(false), 2500);
  }

  function addModule() {
    update(c => {
      c.modules.push({ id: `mod-${Date.now()}`, title: 'Nuevo módulo', duration: '0h 00min', lessons: [] });
      return c;
    });
    setSelected({ type: 'module', mi: course.modules.length });
  }

  function deleteModule(mi) {
    update(c => { c.modules.splice(mi, 1); return c; });
    setSelected({ type: 'course' });
  }

  function addLesson(mi) {
    update(c => {
      c.modules[mi].lessons.push({ id: `${mi}-${Date.now()}`, title: 'Nueva clase', duration: '00:00', video: null, files: [] });
      return c;
    });
    setSelected({ type: 'lesson', mi, li: course.modules[mi].lessons.length });
  }

  function deleteLesson(mi, li) {
    update(c => { c.modules[mi].lessons.splice(li, 1); return c; });
    setSelected({ type: 'module', mi });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f0ebfd', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: 'inherit', padding: '6px 0' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 4L6 8l4 4"/></svg>
          Cursos
        </button>
        <div style={{ width: 1, height: 20, background: '#f0ebfd' }}/>
        <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isNew ? 'Nuevo curso' : course.title}</div>
        {unsaved && <span style={{ fontSize: 12, color: '#94a3b8' }}>Cambios sin guardar</span>}
        {saved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#059669', fontWeight: 600 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill="#d1fae5"/><path d="M4.5 7l2 2 3-3" stroke="#059669" strokeWidth="1.4" strokeLinecap="round"/></svg>
            Guardado
          </div>
        )}
        <Btn variant="primary" size="sm" onClick={save}>Guardar cambios</Btn>
        {!isNew && (
          <Btn variant="ghost" size="sm" onClick={() => onNavigate('course', { courseId: course.id })}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 7s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z"/><circle cx="7" cy="7" r="2"/></svg>
            Vista previa
          </Btn>
        )}
      </div>

      {/* 3-panel layout */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }} className="editor-layout">
        {/* Left: tree */}
        <div style={{ width: 280, background: '#fff', borderRight: '1px solid #f0ebfd', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
          {/* Course root */}
          <TreeItem
            label="Información del curso" icon="📋"
            active={selected.type === 'course'}
            onClick={() => setSelected({ type: 'course' })}
          />
          <div style={{ padding: '10px 16px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .6 }}>Módulos</span>
            <button onClick={addModule} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', fontSize: 18, lineHeight: 1, padding: '2px 4px', fontWeight: 700 }}>+</button>
          </div>
          {course.modules.map((mod, mi) => (
            <ModuleTreeItem key={mod.id} mod={mod} mi={mi}
              selectedType={selected.type} selectedMi={selected.mi} selectedLi={selected.li}
              onSelectModule={() => setSelected({ type: 'module', mi })}
              onSelectLesson={li => setSelected({ type: 'lesson', mi, li })}
              onAddLesson={() => addLesson(mi)}
              onDeleteModule={() => deleteModule(mi)}
            />
          ))}
          {/* Resources root */}
          <div style={{ borderTop: '1px solid #f0ebfd', marginTop: 8 }}>
            <TreeItem
              label={`Archivos del curso (${course.resources.length})`} icon="📎"
              active={selected.type === 'resources'}
              onClick={() => setSelected({ type: 'resources' })}
            />
          </div>
        </div>

        {/* Right: editor panel */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#faf9ff', padding: 'clamp(20px,3vw,36px)' }}>
          {selected.type === 'course'     && <CourseInfoPanel course={course} update={update} />}
          {selected.type === 'module'     && <ModulePanel course={course} mi={selected.mi} update={update} onDeleteModule={() => deleteModule(selected.mi)} onAddLesson={() => addLesson(selected.mi)} />}
          {selected.type === 'lesson'     && <LessonPanel course={course} mi={selected.mi} li={selected.li} update={update} onDeleteLesson={() => deleteLesson(selected.mi, selected.li)} />}
          {selected.type === 'resources'  && <ResourcesPanel course={course} update={update} />}
        </div>
      </div>
    </div>
  );
}

// ── Tree components ───────────────────────────────────────
function TreeItem({ label, icon, active, onClick, indent }) {
  const [hov, setHov] = useEdState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: '100%', textAlign: 'left', border: 'none', background: active ? '#f5f3ff' : hov ? '#faf9ff' : 'transparent', borderLeft: active ? '3px solid #7c3aed' : '3px solid transparent', padding: `9px ${indent ? 28 : 16}px 9px ${indent ? 40 : 16}px`, fontFamily: 'inherit', fontSize: 13, fontWeight: active ? 700 : 400, color: active ? '#7c3aed' : '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all .12s' }}>
      {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{label}</span>
    </button>
  );
}

function ModuleTreeItem({ mod, mi, selectedType, selectedMi, selectedLi, onSelectModule, onSelectLesson, onAddLesson, onDeleteModule }) {
  const [open, setOpen] = useEdState(selectedMi === mi);
  const isModActive = selectedType === 'module' && selectedMi === mi;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', borderLeft: isModActive ? '3px solid #7c3aed' : '3px solid transparent', background: isModActive ? '#f5f3ff' : 'transparent' }}>
        <button onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '9px 6px 9px 12px', color: '#94a3b8', flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}><path d="M4 3l4 3-4 3"/></svg>
        </button>
        <button onClick={onSelectModule} style={{ flex: 1, textAlign: 'left', border: 'none', background: 'transparent', padding: '9px 4px', fontFamily: 'inherit', fontSize: 13, fontWeight: isModActive ? 700 : 500, color: isModActive ? '#7c3aed' : '#1a1a2e', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 11, color: '#94a3b8', marginRight: 4 }}>M{mi + 1}</span>{mod.title}
        </button>
        <button onClick={e => { e.stopPropagation(); onAddLesson(); }} title="Agregar clase" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669', fontSize: 16, padding: '4px 6px', lineHeight: 1 }}>+</button>
        <button onClick={e => { e.stopPropagation(); onDeleteModule(); }} title="Eliminar módulo" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14, padding: '4px 10px 4px 2px', lineHeight: 1 }}>×</button>
      </div>
      {open && (
        <div>
          {mod.lessons.map((lesson, li) => {
            const isActive = selectedType === 'lesson' && selectedMi === mi && selectedLi === li;
            return (
              <button key={lesson.id} onClick={() => onSelectLesson(li)}
                style={{ width: '100%', textAlign: 'left', border: 'none', borderLeft: isActive ? '3px solid #7c3aed' : '3px solid transparent', background: isActive ? '#f5f3ff' : 'transparent', padding: '8px 16px 8px 40px', fontFamily: 'inherit', fontSize: 12, fontWeight: isActive ? 700 : 400, color: isActive ? '#7c3aed' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: isActive ? '#7c3aed' : '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {lesson.video
                    ? <svg width="8" height="8" viewBox="0 0 8 8" fill={isActive ? '#fff' : '#7c3aed'}><path d="M2 1l5 3-5 3V1z"/></svg>
                    : <span style={{ fontSize: 8, color: isActive ? '#fff' : '#94a3b8', fontWeight: 700 }}>{li + 1}</span>
                  }
                </div>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{lesson.title}</span>
                {lesson.files?.length > 0 && <span style={{ fontSize: 10, color: '#7c3aed', flexShrink: 0 }}>📎{lesson.files.length}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Editor panels ─────────────────────────────────────────
function CourseInfoPanel({ course, update }) {
  return (
    <EdPanel title="Información del curso" icon="📋">
      <EdField label="Título del curso">
        <EdInput value={course.title} onChange={v => update(c => { c.title = v; return c; })} placeholder="Título del curso" large />
      </EdField>
      <EdField label="Subtítulo">
        <EdInput value={course.subtitle || ''} onChange={v => update(c => { c.subtitle = v; return c; })} placeholder="Subtítulo descriptivo del curso" />
      </EdField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <EdField label="Instructor">
          <EdInput value={course.instructor} onChange={v => update(c => { c.instructor = v; return c; })} placeholder="Nombre del instructor" />
        </EdField>
        <EdField label="Título del instructor">
          <EdInput value={course.instructorTitle || ''} onChange={v => update(c => { c.instructorTitle = v; return c; })} placeholder="Especialidad · Institución" />
        </EdField>
      </div>
      <EdField label="Descripción">
        <textarea value={course.description || ''} onChange={e => update(c => { c.description = e.target.value; return c; })} rows={5} placeholder="Descripción completa del curso…"
          style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e2d9f7', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.6, color: '#1a1a2e', boxSizing: 'border-box' }}/>
      </EdField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <EdField label="Precio ($)">
          <EdInput value={course.price ?? ''} onChange={v => update(c => { c.price = Number(v); return c; })} placeholder="0 = gratis" type="number" />
        </EdField>
        <EdField label="Precio original ($)">
          <EdInput value={course.originalPrice ?? ''} onChange={v => update(c => { c.originalPrice = Number(v); return c; })} placeholder="Precio sin descuento" type="number" />
        </EdField>
      </div>
    </EdPanel>
  );
}

function ModulePanel({ course, mi, update, onDeleteModule, onAddLesson }) {
  const mod = course.modules[mi];
  return (
    <EdPanel title={`Módulo ${mi + 1}`} icon="📁"
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="secondary" size="sm" onClick={onAddLesson}>+ Agregar clase</Btn>
          <Btn size="sm" style={{ background: 'transparent', color: '#ef4444', border: '1.5px solid #fecaca' }} onClick={onDeleteModule}>Eliminar módulo</Btn>
        </div>
      }>
      <EdField label="Título del módulo">
        <EdInput value={mod.title} onChange={v => update(c => { c.modules[mi].title = v; return c; })} placeholder="Título del módulo" large />
      </EdField>
      <EdField label="Duración estimada">
        <EdInput value={mod.duration} onChange={v => update(c => { c.modules[mi].duration = v; return c; })} placeholder="Ej: 3h 45min" />
      </EdField>
      <EdField label={`Clases (${mod.lessons.length})`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mod.lessons.map((lesson, li) => (
            <div key={lesson.id} style={{ background: '#f5f3ff', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #e2d9f7' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{li + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.title}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{lesson.video ? '▶ Video adjunto' : 'Sin video'} {lesson.files?.length > 0 ? `· ${lesson.files.length} archivo(s)` : ''}</div>
              </div>
              <button onClick={() => update(c => { c.modules[mi].lessons.splice(li, 1); return c; })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, padding: 4 }}>×</button>
            </div>
          ))}
          {mod.lessons.length === 0 && <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>No hay clases en este módulo. Agregá una con el botón de arriba.</div>}
        </div>
      </EdField>
    </EdPanel>
  );
}

function LessonPanel({ course, mi, li, update, onDeleteLesson }) {
  const lesson = course.modules[mi]?.lessons[li];
  const fileInputRef = useEdRef(null);
  const videoInputRef = useEdRef(null);
  if (!lesson) return null;

  function addFiles(fileList) {
    const newFiles = Array.from(fileList).map(f => ({
      id: Date.now() + Math.random(),
      name: f.name, size: f.size,
      ext: f.name.split('.').pop().toUpperCase(),
      type: 'doc',
    }));
    update(c => { c.modules[mi].lessons[li].files = [...(c.modules[mi].lessons[li].files || []), ...newFiles]; return c; });
  }

  function setVideo(file) {
    if (!file) return;
    update(c => { c.modules[mi].lessons[li].video = { name: file.name, size: file.size, type: 'video' }; return c; });
  }

  return (
    <EdPanel
      title={`Clase ${li + 1} — Módulo ${mi + 1}`} icon="▶"
      actions={<Btn size="sm" style={{ background: 'transparent', color: '#ef4444', border: '1.5px solid #fecaca' }} onClick={onDeleteLesson}>Eliminar clase</Btn>}
    >
      <EdField label="Título de la clase">
        <EdInput value={lesson.title} onChange={v => update(c => { c.modules[mi].lessons[li].title = v; return c; })} placeholder="Título de la clase" large />
      </EdField>
      <EdField label="Duración">
        <EdInput value={lesson.duration} onChange={v => update(c => { c.modules[mi].lessons[li].duration = v; return c; })} placeholder="Ej: 12:30" />
      </EdField>

      {/* Video */}
      <EdField label="Video de la clase">
        {lesson.video ? (
          <div style={{ background: '#ede9fe', border: '1.5px solid #c4b5fd', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="white"><path d="M4 3l12 6-12 6V3z"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.video.name}</div>
              {lesson.video.size > 0 && <div style={{ fontSize: 11, color: '#7c3aed' }}>{(lesson.video.size / (1024*1024)).toFixed(1)} MB</div>}
            </div>
            <button onClick={() => update(c => { c.modules[mi].lessons[li].video = null; return c; })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16 }}>×</button>
          </div>
        ) : (
          <div onClick={() => videoInputRef.current?.click()}
            style={{ border: '2px dashed #c4b5fd', borderRadius: 12, padding: '24px', textAlign: 'center', cursor: 'pointer', background: '#faf9ff', transition: 'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#7c3aed'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#faf9ff'; e.currentTarget.style.borderColor = '#c4b5fd'; }}>
            <input ref={videoInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={e => setVideo(e.target.files[0])} />
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="#7c3aed"><path d="M4 3l14 7-14 7V3z"/></svg>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Subir video</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>MP4, MOV, AVI — hasta 2GB</div>
          </div>
        )}
      </EdField>

      {/* Files */}
      <EdField label={`Archivos adjuntos (${lesson.files?.length || 0})`}>
        <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(lesson.files || []).map(f => {
            const extColors = { PDF: ['#fee2e2','#ef4444'], DOC: ['#dbeafe','#2563eb'], DOCX: ['#dbeafe','#2563eb'], PPT: ['#ffedd5','#ea580c'], PPTX: ['#ffedd5','#ea580c'], XLS: ['#dcfce7','#16a34a'], XLSX: ['#dcfce7','#16a34a'] };
            const [bg, fg] = extColors[f.ext] || ['#f1f5f9','#64748b'];
            return (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#faf9ff', border: '1px solid #f0ebfd', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: fg }}>{f.ext}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                <button onClick={() => update(c => { c.modules[mi].lessons[li].files = c.modules[mi].lessons[li].files.filter(x => x.id !== f.id); return c; })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, padding: 4 }}>×</button>
              </div>
            );
          })}
          <button onClick={() => fileInputRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1.5px dashed #c4b5fd', borderRadius: 10, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: '#7c3aed', fontWeight: 600, transition: 'all .15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v10M3 8h10"/></svg>
            Adjuntar documento
          </button>
        </div>
      </EdField>

      <EdField label="Notas del instructor">
        <textarea value={lesson.notes || ''} onChange={e => update(c => { c.modules[mi].lessons[li].notes = e.target.value; return c; })} rows={3} placeholder="Notas internas, contexto o indicaciones para el alumno…"
          style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e2d9f7', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.6, color: '#1a1a2e', boxSizing: 'border-box' }}/>
      </EdField>
    </EdPanel>
  );
}

function ResourcesPanel({ course, update }) {
  const fileInputRef = useEdRef(null);

  function addFiles(fileList) {
    const newFiles = Array.from(fileList).map(f => ({
      id: Date.now() + Math.random(),
      name: f.name, size: f.size,
      ext: f.name.split('.').pop().toUpperCase(),
      type: f.type.startsWith('video') ? 'video' : 'doc',
    }));
    update(c => { c.resources = [...(c.resources || []), ...newFiles]; return c; });
  }

  return (
    <EdPanel title="Archivos del curso" icon="📎">
      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16, lineHeight: 1.6 }}>
        Estos archivos estarán disponibles para descargar en la página del curso, visibles solo para los estudiantes inscriptos.
      </p>
      <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,video/*" style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />

      {/* Drop zone */}
      <div onClick={() => fileInputRef.current?.click()}
        style={{ border: '2px dashed #c4b5fd', borderRadius: 14, padding: '28px', textAlign: 'center', cursor: 'pointer', background: '#faf9ff', marginBottom: 16, transition: 'all .2s' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#7c3aed'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#faf9ff'; e.currentTarget.style.borderColor = '#c4b5fd'; }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"><path d="M10 3v11M5 9l5-5 5 5"/><path d="M3 17h14"/></svg>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Subir archivos</div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>PDF, DOC, PPT, XLS, videos</div>
      </div>

      {(course.resources || []).length === 0 && (
        <div style={{ textAlign: 'center', fontSize: 13, color: '#94a3b8', padding: '8px 0' }}>No hay archivos todavía.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(course.resources || []).map(f => {
          const extColors = { PDF: ['#fee2e2','#ef4444'], DOC: ['#dbeafe','#2563eb'], DOCX: ['#dbeafe','#2563eb'], PPT: ['#ffedd5','#ea580c'], PPTX: ['#ffedd5','#ea580c'], XLS: ['#dcfce7','#16a34a'], XLSX: ['#dcfce7','#16a34a'], MP4: ['#ede9fe','#7c3aed'], MOV: ['#ede9fe','#7c3aed'] };
          const [bg, fg] = extColors[f.ext] || ['#f1f5f9','#64748b'];
          return (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #f0ebfd', borderRadius: 12, padding: '12px 16px' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: fg }}>{f.ext}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                {f.size > 0 && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{(f.size/1024).toFixed(0)} KB</div>}
              </div>
              <button onClick={() => update(c => { c.resources = c.resources.filter(x => x.id !== f.id); return c; })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, padding: 4 }}>×</button>
            </div>
          );
        })}
      </div>
    </EdPanel>
  );
}

// ── Helper components ─────────────────────────────────────
function EdPanel({ title, icon, children, actions }) {
  return (
    <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f0ebfd', padding: '24px 28px', maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon && <span>{icon}</span>}{title}
        </h2>
        {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{children}</div>
    </div>
  );
}

function EdField({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: .5 }}>{label}</label>
      {children}
    </div>
  );
}

function EdInput({ value, onChange, placeholder, large, type }) {
  const [focused, setFocused] = useEdState(false);
  return (
    <input type={type || 'text'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{ padding: large ? '13px 16px' : '11px 14px', borderRadius: 10, border: `1.5px solid ${focused ? '#7c3aed' : '#e2d9f7'}`, fontSize: large ? 16 : 14, fontFamily: 'inherit', color: '#1a1a2e', outline: 'none', boxShadow: focused ? '0 0 0 3px rgba(124,58,237,.1)' : 'none', transition: 'all .15s', width: '100%', boxSizing: 'border-box', fontWeight: large ? 600 : 400 }}
    />
  );
}

Object.assign(window, { CourseEditorPage });
