import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { coursesApi } from '@/api/courses'
import { modulesApi, type CourseModule, type ModuleVideo } from '@/api/modules'
import { courseFilesApi, type CourseFile } from '@/api/courseFiles'
import { categoriesApi } from '@/api/categories'
import { client as api } from '@/lib/axios'

// ─── Types ───────────────────────────────────────────────────────────────────

type ActivePanel =
  | { type: 'info' }
  | { type: 'module'; id: string }
  | { type: 'lesson'; id: string; moduleId: string }
  | { type: 'files' }

// ─── Main component ───────────────────────────────────────────────────────────

export function CourseEditor() {
  const { id: courseId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const isNew = courseId === 'new'

  const [activePanel, setActivePanel] = useState<ActivePanel>({ type: 'info' })
  const [savingInfo, setSavingInfo] = useState(false)
  const [unsaved, setUnsaved] = useState(false)

  const { data: course } = useQuery<Record<string, unknown>>({
    queryKey: ['course-admin', courseId],
    queryFn: () => coursesApi.getAdmin(courseId!),
    enabled: !!courseId && !isNew,
  })

  const { data: modules = [], refetch: refetchModules } = useQuery({
    queryKey: ['modules', courseId],
    queryFn: () => modulesApi.list(courseId!),
    enabled: !!courseId,
  })

  const { data: courseFiles = [], refetch: refetchFiles } = useQuery({
    queryKey: ['course-files', courseId],
    queryFn: () => courseFilesApi.list(courseId!),
    enabled: !!courseId,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  })

  // ── Info form state ─────────────────────────────────────────────────────────

  const [createError, setCreateError] = useState('')

  const [infoForm, setInfoForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    instructor_name: '',
    instructor_title: '',
    category_id: '',
    level: 'basico',
    price: '',
    original_price: '',
    featured: false,
  })

  useEffect(() => {
    if (course) {
      setInfoForm({
        title: (course.title as string) ?? '',
        subtitle: (course.subtitle as string) ?? '',
        description: (course.description as string) ?? '',
        instructor_name: (course.instructor_name as string) ?? '',
        instructor_title: (course.instructor_title as string) ?? '',
        category_id: (course.category_id as string) ?? '',
        level: (course.level as string) ?? 'basico',
        price: String(course.price ?? ''),
        original_price: String(course.original_price ?? ''),
        featured: (course.featured as boolean) ?? false,
      })
    }
  }, [course])

  // When creating new, auto-select first category
  useEffect(() => {
    if (isNew && categories.length > 0) {
      setInfoForm((f) => ({ ...f, category_id: f.category_id || categories[0].id }))
    }
  }, [isNew, categories])

  async function handleCreate() {
    if (!infoForm.title.trim()) {
      setCreateError('El título es obligatorio.')
      return
    }
    setCreateError('')
    setSavingInfo(true)
    try {
      const res = await api.post('/courses', {
        title: infoForm.title,
        subtitle: infoForm.subtitle || '',
        description: infoForm.description || '',
        category_id: infoForm.category_id || categories[0]?.id,
        instructor_name: infoForm.instructor_name || '',
        price: Number(infoForm.price) || 0,
        original_price: infoForm.original_price ? Number(infoForm.original_price) : null,
        level: infoForm.level || 'basico',
        featured: infoForm.featured,
        is_published: false,
      })
      qc.invalidateQueries({ queryKey: ['courses-admin'] })
      navigate(`/admin/editor/${res.data.id}`, { replace: true })
    } finally {
      setSavingInfo(false)
    }
  }

  async function handleSaveInfo() {
    if (!courseId) return
    setSavingInfo(true)
    try {
      await coursesApi.updateAdmin(courseId, {
        title: infoForm.title,
        subtitle: infoForm.subtitle || undefined,
        description: infoForm.description,
        instructor_name: infoForm.instructor_name,
        instructor_title: infoForm.instructor_title || undefined,
        category_id: infoForm.category_id || undefined,
        level: infoForm.level,
        price: Number(infoForm.price),
        original_price: infoForm.original_price ? Number(infoForm.original_price) : undefined,
        featured: infoForm.featured,
      })
      await qc.invalidateQueries({ queryKey: ['course-admin', courseId] })
      await qc.invalidateQueries({ queryKey: ['courses'] })
      setUnsaved(false)
    } finally {
      setSavingInfo(false)
    }
  }

  // ── Module ops ──────────────────────────────────────────────────────────────

  async function addModule() {
    if (!courseId) return
    const m = await modulesApi.create(courseId, 'Nuevo módulo')
    await refetchModules()
    setActivePanel({ type: 'module', id: m.id })
  }

  async function deleteModule(id: string) {
    await modulesApi.delete(id)
    await refetchModules()
    setActivePanel({ type: 'info' })
  }

  async function addLesson(moduleId: string) {
    if (!courseId) return
    const res = await api.post(`/videos/courses/${courseId}/videos/metadata`, {
      title: 'Nueva clase',
      module_id: moduleId,
    })
    await refetchModules()
    setActivePanel({ type: 'lesson', id: res.data.id, moduleId })
  }

  async function deleteLesson(lessonId: string) {
    await api.delete(`/videos/${lessonId}`)
    await refetchModules()
    setActivePanel({ type: 'info' })
  }

  // ── Derived data ────────────────────────────────────────────────────────────

  const activeModule =
    activePanel.type === 'module' ? modules.find((m) => m.id === activePanel.id) ?? null : null

  const activeLesson =
    activePanel.type === 'lesson'
      ? modules.flatMap((m) => m.videos).find((v) => v.id === activePanel.id) ?? null
      : null

  const activeLessonModuleId = activePanel.type === 'lesson' ? activePanel.moduleId : null

  const courseTitle = isNew ? 'Nuevo curso' : ((course?.title as string) ?? '…')

  // ─── Render ────────────────────────────────────────────────────────────────
  // Uses calc(100vh - 64px) to fill the AdminLayout content area exactly
  return (
    <div
      style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', background: '#fff' }}
    >
      {/* ── Top bar ── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '0 24px',
          height: 56,
          flexShrink: 0,
          borderBottom: '1px solid #e5e7eb',
          background: '#fff',
        }}
      >
        <button
          onClick={() => navigate('/admin/editor')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 600, color: '#64748b',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: 'inherit',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10 12L6 8l4-4" />
          </svg>
          Cursos
        </button>

        <div style={{ width: 1, height: 20, background: '#e2e8f0', flexShrink: 0 }} />

        <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {courseTitle}
        </span>

        {unsaved && !isNew && (
          <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600, flexShrink: 0 }}>
            Cambios sin guardar
          </span>
        )}

        {isNew ? (
          <button
            onClick={handleCreate}
            disabled={savingInfo}
            style={{
              padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: 'none', cursor: savingInfo ? 'not-allowed' : 'pointer',
              background: '#7c3aed', color: '#fff', flexShrink: 0,
              opacity: savingInfo ? 0.6 : 1, fontFamily: 'inherit',
            }}
          >
            {savingInfo ? 'Creando…' : 'Crear curso'}
          </button>
        ) : (
          <>
            <button
              onClick={handleSaveInfo}
              disabled={savingInfo || activePanel.type !== 'info'}
              style={{
                padding: '8px 20px',
                borderRadius: 10, fontSize: 13, fontWeight: 700,
                border: 'none', cursor: savingInfo || activePanel.type !== 'info' ? 'not-allowed' : 'pointer',
                background: '#7c3aed', color: '#fff', flexShrink: 0,
                opacity: activePanel.type !== 'info' ? 0.4 : 1,
                fontFamily: 'inherit',
              }}
            >
              {savingInfo ? 'Guardando…' : 'Guardar cambios'}
            </button>

            <Link
              to={`/courses/${courseId}`}
              target="_blank"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 13, fontWeight: 600, color: '#7c3aed',
                textDecoration: 'none', flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M7 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9" strokeLinecap="round" />
                <path d="M10 2h4v4M14 2l-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Vista previa
            </Link>
          </>
        )}
      </header>

      {/* ── Body: tree + panel ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Left: course tree ── */}
        <nav
          style={{
            width: 260,
            flexShrink: 0,
            background: '#2d1558',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            borderRight: '1px solid rgba(255,255,255,.07)',
          }}
        >
          {/* Info item */}
          <TreeButton
            active={activePanel.type === 'info'}
            onClick={() => setActivePanel({ type: 'info' })}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="1.5" strokeLinecap="round">
              <rect x="1" y="1" width="12" height="12" rx="1.5" />
              <path d="M3.5 4.5h7M3.5 7h5M3.5 9.5h3" />
            </svg>
            <span>Información del curso</span>
          </TreeButton>

          {!isNew && (
            <>
              {/* Modules heading */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 16px 6px',
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Módulos
                </span>
                <button
                  onClick={addModule}
                  style={{
                    width: 22, height: 22, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255,255,255,.08)', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,.6)',
                  }}
                  title="Agregar módulo"
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M5.5 1v9M1 5.5h9" />
                  </svg>
                </button>
              </div>

              {modules.length === 0 && (
                <p style={{ padding: '6px 16px', fontSize: 12, color: 'rgba(255,255,255,.25)', fontStyle: 'italic' }}>
                  Sin módulos
                </p>
              )}

              {modules.map((mod, mi) => (
                <ModuleTreeItem
                  key={mod.id}
                  mod={mod}
                  index={mi}
                  activePanel={activePanel}
                  onSelectModule={() => setActivePanel({ type: 'module', id: mod.id })}
                  onSelectLesson={(vid) => setActivePanel({ type: 'lesson', id: vid.id, moduleId: mod.id })}
                  onAddLesson={() => addLesson(mod.id)}
                  onDeleteModule={() => deleteModule(mod.id)}
                  onDeleteLesson={(vid) => deleteLesson(vid.id)}
                />
              ))}

              {/* Files item */}
              <TreeButton
                active={activePanel.type === 'files'}
                onClick={() => setActivePanel({ type: 'files' })}
                style={{ marginTop: 8 }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 1H9L12 4V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" />
                  <path d="M9 1v4h3" />
                </svg>
                <span>
                  Archivos del curso{courseFiles.length > 0 ? ` (${courseFiles.length})` : ''}
                </span>
              </TreeButton>
            </>
          )}
        </nav>

        {/* ── Right: editor panel ── */}
        <main style={{ flex: 1, overflowY: 'auto', background: '#fff', padding: '32px 40px' }}>
          {activePanel.type === 'info' && (isNew || course) && (
            <>
              {createError && (
                <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: '#fef2f2', border: '1.5px solid #fecaca', color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
                  {createError}
                </div>
              )}
              <InfoPanel
                form={infoForm}
                categories={categories}
                onChange={(updates) => {
                  setInfoForm((f) => ({ ...f, ...updates }))
                  if (!isNew) setUnsaved(true)
                  if (createError) setCreateError('')
                }}
              />
            </>
          )}
          {activePanel.type === 'module' && activeModule && (
            <ModulePanel
              mod={activeModule}
              onUpdateTitle={async (title) => {
                await modulesApi.update(activeModule.id, { title })
                await refetchModules()
              }}
              onAddLesson={() => addLesson(activeModule.id)}
              onDeleteModule={() => deleteModule(activeModule.id)}
              onSelectLesson={(vid) =>
                setActivePanel({ type: 'lesson', id: vid.id, moduleId: activeModule.id })
              }
              onDeleteLesson={(vid) => deleteLesson(vid.id)}
            />
          )}
          {activePanel.type === 'lesson' && activeLesson && activeLessonModuleId && courseId && (
            <LessonPanel
              courseId={courseId}
              lesson={activeLesson}
              moduleId={activeLessonModuleId}
              onUpdated={async () => { await refetchModules() }}
            />
          )}
          {activePanel.type === 'files' && courseId && (
            <FilesPanel
              courseId={courseId}
              files={courseFiles}
              onUploaded={async () => { await refetchFiles() }}
              onDeleted={async () => { await refetchFiles() }}
            />
          )}
        </main>
      </div>
    </div>
  )
}

// ─── Tree button ──────────────────────────────────────────────────────────────

function TreeButton({
  active,
  onClick,
  children,
  style,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 16px', textAlign: 'left',
        background: active ? 'rgba(124,58,237,.4)' : 'transparent',
        borderLeft: active ? '3px solid #a78bfa' : '3px solid transparent',
        border: 'none', borderRight: 'none', borderTop: 'none', borderBottom: 'none',
        borderLeftStyle: 'solid', borderLeftWidth: 3, borderLeftColor: active ? '#a78bfa' : 'transparent',
        cursor: 'pointer', width: '100%', fontFamily: 'inherit',
        fontSize: 13, fontWeight: 600,
        color: active ? '#a78bfa' : 'rgba(255,255,255,.7)',
        transition: 'all .15s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ─── Module tree item ─────────────────────────────────────────────────────────

function ModuleTreeItem({
  mod,
  index,
  activePanel,
  onSelectModule,
  onSelectLesson,
  onAddLesson,
  onDeleteModule,
  onDeleteLesson,
}: {
  mod: CourseModule
  index: number
  activePanel: ActivePanel
  onSelectModule: () => void
  onSelectLesson: (v: ModuleVideo) => void
  onAddLesson: () => void
  onDeleteModule: () => void
  onDeleteLesson: (v: ModuleVideo) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [hovered, setHovered] = useState(false)
  const isActive = activePanel.type === 'module' && activePanel.id === mod.id

  return (
    <div>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex', alignItems: 'center',
          padding: '9px 12px 9px 16px',
          background: isActive ? 'rgba(124,58,237,.3)' : 'transparent',
          borderLeft: `3px solid ${isActive ? '#a78bfa' : 'transparent'}`,
        }}
      >
        {/* expand toggle */}
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '0 6px 0 0',
            color: 'rgba(255,255,255,.35)', flexShrink: 0,
          }}
        >
          <svg
            width="10" height="10" viewBox="0 0 10 10" fill="none"
            stroke="currentColor" strokeWidth="1.8"
            style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}
          >
            <path d="M3 2l4 3-4 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* module label */}
        <button
          onClick={onSelectModule}
          style={{
            flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', padding: 0, minWidth: 0, overflow: 'hidden',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.35)', marginRight: 6 }}>
            M{index + 1}
          </span>
          <span
            style={{
              fontSize: 13, fontWeight: 600,
              color: isActive ? '#a78bfa' : 'rgba(255,255,255,.72)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {mod.title}
          </span>
        </button>

        {/* action buttons */}
        <div style={{ display: 'flex', gap: 4, opacity: hovered ? 1 : 0, transition: 'opacity .15s', flexShrink: 0 }}>
          <ActionBtn title="Agregar clase" onClick={(e) => { e.stopPropagation(); onAddLesson() }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 1v8M1 5h8" />
            </svg>
          </ActionBtn>
          <ActionBtn title="Eliminar módulo" color="#f87171" onClick={(e) => { e.stopPropagation(); onDeleteModule() }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l8 8M9 1L1 9" />
            </svg>
          </ActionBtn>
        </div>
      </div>

      {expanded &&
        mod.videos.map((vid) => {
          const isLessonActive = activePanel.type === 'lesson' && activePanel.id === vid.id
          return (
            <LessonTreeItem
              key={vid.id}
              vid={vid}
              isActive={isLessonActive}
              onSelect={() => onSelectLesson(vid)}
              onDelete={() => onDeleteLesson(vid)}
            />
          )
        })}
    </div>
  )
}

function LessonTreeItem({
  vid,
  isActive,
  onSelect,
  onDelete,
}: {
  vid: ModuleVideo
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center',
        paddingLeft: 40, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
        background: isActive ? 'rgba(124,58,237,.2)' : 'transparent',
        borderLeft: `3px solid ${isActive ? '#a78bfa' : 'transparent'}`,
      }}
    >
      <button
        onClick={onSelect}
        style={{
          flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', padding: 0, minWidth: 0,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 500, color: isActive ? '#a78bfa' : 'rgba(255,255,255,.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {vid.title}
        </div>
        {!vid.is_published && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.25)' }}>Sin video</div>
        )}
      </button>
      <button
        onClick={onDelete}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 2,
          color: '#f87171', opacity: hovered ? 0.8 : 0, transition: 'opacity .15s', flexShrink: 0,
        }}
      >
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M1 1l7 7M8 1L1 8" />
        </svg>
      </button>
    </div>
  )
}

function ActionBtn({
  title,
  color = 'rgba(255,255,255,.5)',
  onClick,
  children,
}: {
  title: string
  color?: string
  onClick: React.MouseEventHandler
  children: React.ReactNode
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 20, height: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'none', border: 'none', cursor: 'pointer',
        color, borderRadius: 4, fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  )
}

// ─── Info panel ───────────────────────────────────────────────────────────────

function InfoPanel({
  form,
  categories,
  onChange,
}: {
  form: Record<string, string | boolean>
  categories: { id: string; name: string }[]
  onChange: (u: Partial<typeof form>) => void
}) {
  function field(key: string) {
    return {
      value: form[key] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        onChange({ [key]: e.target.value }),
    }
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1a1a2e', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>📋</span> Información del curso
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Field label="Título del curso">
          <input className={INPUT} {...field('title')} placeholder="Endodoncia Clínica Avanzada" />
        </Field>

        <Field label="Subtítulo">
          <input className={INPUT} {...field('subtitle')} placeholder="Una descripción corta del curso" />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Field label="Instructor">
            <input className={INPUT} {...field('instructor_name')} placeholder="Dr. Martín Rodríguez" />
          </Field>
          <Field label="Título del instructor">
            <input className={INPUT} {...field('instructor_title')} placeholder="Especialista en Endodoncia · UBA" />
          </Field>
        </div>

        <Field label="Descripción">
          <textarea
            className={INPUT}
            rows={5}
            style={{ resize: 'vertical' }}
            {...field('description')}
            placeholder="Descripción detallada del curso…"
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Field label="Categoría">
            <select className={INPUT} {...field('category_id')}>
              <option value="">Seleccionar…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Nivel">
            <select className={INPUT} {...field('level')}>
              <option value="basico">Básico</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzado">Avanzado</option>
            </select>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Field label="Precio ($)">
            <input className={INPUT} type="number" {...field('price')} placeholder="0 = gratis" />
          </Field>
          <Field label="Precio original ($)">
            <input className={INPUT} type="number" {...field('original_price')} placeholder="Sin descuento" />
          </Field>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={form.featured as boolean}
            onChange={(e) => onChange({ featured: e.target.checked })}
            style={{ width: 16, height: 16, accentColor: '#7c3aed' }}
          />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Destacado en la landing</span>
        </label>
      </div>
    </div>
  )
}

// ─── Module panel ─────────────────────────────────────────────────────────────

function ModulePanel({
  mod,
  onUpdateTitle,
  onAddLesson,
  onDeleteModule,
  onSelectLesson,
  onDeleteLesson,
}: {
  mod: CourseModule
  onUpdateTitle: (t: string) => Promise<void>
  onAddLesson: () => void
  onDeleteModule: () => void
  onSelectLesson: (v: ModuleVideo) => void
  onDeleteLesson: (v: ModuleVideo) => void
}) {
  const [title, setTitle] = useState(mod.title)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setTitle(mod.title) }, [mod.title])

  async function save() {
    if (title === mod.title) return
    setSaving(true)
    try { await onUpdateTitle(title) } finally { setSaving(false) }
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 12, margin: 0 }}>
          <span>📁</span> {mod.title}
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onAddLesson}
            style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', background: '#7c3aed', color: '#fff', fontFamily: 'inherit' }}
          >
            + Agregar clase
          </button>
          <button
            onClick={onDeleteModule}
            style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: '1.5px solid #fecaca', cursor: 'pointer', background: '#fff', color: '#ef4444', fontFamily: 'inherit' }}
          >
            Eliminar módulo
          </button>
        </div>
      </div>

      <Field label="Título del módulo">
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            className={INPUT}
            style={{ flex: 1 }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={save}
            placeholder="Título del módulo"
          />
          {saving && <span style={{ alignSelf: 'center', fontSize: 12, color: '#94a3b8' }}>Guardando…</span>}
        </div>
      </Field>

      <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 28, marginBottom: 12 }}>
        Clases ({mod.videos.length})
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {mod.videos.map((vid, i) => (
          <div
            key={vid.id}
            onClick={() => onSelectLesson(vid)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: 16, borderRadius: 14, border: '1.5px solid #f0ebfd',
              cursor: 'pointer', background: '#fff',
              transition: 'border-color .15s',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#c4b5fd')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = '#f0ebfd')}
          >
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#7c3aed', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
              {i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vid.title}</p>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                {vid.is_published && vid.duration_seconds ? formatDuration(vid.duration_seconds) : 'Sin video'}
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteLesson(vid) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 4, borderRadius: 4 }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>
        ))}

        {mod.videos.length === 0 && (
          <p style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center', padding: '24px 0' }}>
            Sin clases. Hacé clic en "+ Agregar clase".
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Lesson panel ─────────────────────────────────────────────────────────────

function LessonPanel({
  courseId,
  lesson,
  moduleId,
  onUpdated,
}: {
  courseId: string
  lesson: ModuleVideo
  moduleId: string
  onUpdated: () => Promise<void>
}) {
  const [title, setTitle] = useState(lesson.title)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const videoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setTitle(lesson.title) }, [lesson.title])

  async function saveTitle() {
    if (title === lesson.title) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title', title)
      await api.patch(`/videos/${lesson.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      await onUpdated()
    } finally { setSaving(false) }
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadProgress(0)
    try {
      const fd = new FormData()
      fd.append('title', title)
      fd.append('module_id', moduleId)
      fd.append('video_file', file)
      await api.patch(`/videos/${lesson.id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (ev) => {
          if (ev.total) setUploadProgress(Math.round((ev.loaded * 100) / ev.total))
        },
      })
      await onUpdated()
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (videoInputRef.current) videoInputRef.current.value = ''
    }
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1a1a2e', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>🎬</span> {lesson.title}
      </h2>

      <Field label="Título de la clase">
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            className={INPUT}
            style={{ flex: 1 }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
          />
          {saving && <span style={{ alignSelf: 'center', fontSize: 12, color: '#94a3b8' }}>Guardando…</span>}
        </div>
      </Field>

      <div style={{ marginTop: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Video</p>

        {lesson.is_published ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, borderRadius: 14, border: '2px solid #d1fae5', background: '#f0fdf4' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9l4 4 8-8" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#065f46', margin: 0 }}>Video subido</p>
              <p style={{ fontSize: 12, color: '#047857', margin: 0 }}>
                {lesson.duration_seconds ? formatDuration(lesson.duration_seconds) : 'Duración desconocida'}
              </p>
            </div>
            <button
              onClick={() => videoInputRef.current?.click()}
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#7c3aed', border: '1px solid #c4b5fd', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Reemplazar
            </button>
          </div>
        ) : (
          <div
            onClick={() => !uploading && videoInputRef.current?.click()}
            style={{
              borderRadius: 14, border: '2px dashed #c4b5fd', padding: '40px 32px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: uploading ? 'default' : 'pointer', background: '#faf9ff',
            }}
          >
            {uploading ? (
              <>
                <div style={{ width: 200, background: '#ede9fe', borderRadius: 99, height: 8, marginBottom: 12 }}>
                  <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#7c3aed', borderRadius: 99, transition: 'width .3s' }} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#7c3aed', margin: 0 }}>{uploadProgress}% subido…</p>
              </>
            ) : (
              <>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ marginBottom: 12 }}>
                  <circle cx="20" cy="20" r="19" stroke="#c4b5fd" strokeWidth="1.5" />
                  <path d="M20 13v14M13 20h14" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#7c3aed', margin: '0 0 4px' }}>Subir video</p>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>MP4, MOV, AVI — hasta 2GB</p>
              </>
            )}
          </div>
        )}
        <input ref={videoInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleVideoUpload} />
      </div>
    </div>
  )
}

// ─── Files panel ──────────────────────────────────────────────────────────────

function FilesPanel({
  courseId,
  files,
  onUploaded,
  onDeleted,
}: {
  courseId: string
  files: CourseFile[]
  onUploaded: () => Promise<void>
  onDeleted: () => Promise<void>
}) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadProgress(0)
    try {
      await courseFilesApi.upload(courseId, file, setUploadProgress)
      await onUploaded()
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDelete(fileId: string) {
    setDeleting(fileId)
    try {
      await courseFilesApi.delete(fileId)
      await onDeleted()
    } finally { setDeleting(null) }
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1a1a2e', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>📎</span> Archivos del curso
      </h2>
      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 28, lineHeight: 1.6 }}>
        Disponibles para descargar solo para estudiantes inscriptos.
      </p>

      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          borderRadius: 16, border: '2px dashed #c4b5fd', padding: '32px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          cursor: uploading ? 'default' : 'pointer', background: '#faf9ff', marginBottom: 20,
        }}
      >
        {uploading ? (
          <>
            <div style={{ width: 200, background: '#ede9fe', borderRadius: 99, height: 8, marginBottom: 12 }}>
              <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#7c3aed', borderRadius: 99, transition: 'width .3s' }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#7c3aed', margin: 0 }}>{uploadProgress}%</p>
          </>
        ) : (
          <>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ marginBottom: 10, color: '#7c3aed' }}>
              <path d="M16 4v16M8 12l8-8 8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 24h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".4" />
            </svg>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#7c3aed', margin: '0 0 4px' }}>Subir archivos</p>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>PDF, DOC, PPT, XLS, ZIP — hasta 50 MB</p>
          </>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt" style={{ display: 'none' }} onChange={handleUpload} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {files.map((f) => (
          <div
            key={f.id}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, border: '1.5px solid #f0ebfd' }}
          >
            <FileTypeBadge type={f.file_type} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
              {f.file_size_bytes && <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{formatFileSize(f.file_size_bytes)}</p>}
            </div>
            <button
              onClick={() => handleDelete(f.id)}
              disabled={deleting === f.id}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 4, borderRadius: 4, opacity: deleting === f.id ? 0.4 : 1 }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>
        ))}
        {files.length === 0 && (
          <p style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center', padding: '24px 0' }}>Sin archivos subidos aún.</p>
        )}
      </div>
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const FILE_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  pdf:   { bg: '#fee2e2', color: '#dc2626' },
  doc:   { bg: '#dbeafe', color: '#2563eb' },
  ppt:   { bg: '#ffedd5', color: '#ea580c' },
  xls:   { bg: '#dcfce7', color: '#16a34a' },
  zip:   { bg: '#f3f4f6', color: '#6b7280' },
  video: { bg: '#ede9fe', color: '#7c3aed' },
  file:  { bg: '#f3f4f6', color: '#6b7280' },
}

function FileTypeBadge({ type }: { type: string }) {
  const { bg, color } = FILE_TYPE_COLORS[type] ?? FILE_TYPE_COLORS.file
  return (
    <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
      {type.toUpperCase().slice(0, 3)}
    </div>
  )
}

const INPUT =
  'px-4 py-3 rounded-[10px] border border-[#e2d9f7] text-sm font-sans outline-none text-ink bg-white focus:border-primary transition-colors w-full'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}min`
  if (m > 0) return `${m}min ${s}s`
  return `${s}s`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
