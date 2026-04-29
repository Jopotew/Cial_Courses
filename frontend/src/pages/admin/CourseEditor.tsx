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

  const [activePanel, setActivePanel] = useState<ActivePanel>({ type: 'info' })
  const [savingInfo, setSavingInfo] = useState(false)
  const [unsaved, setUnsaved] = useState(false)

  // Raw API data (includes unpublished fields)
  const { data: course } = useQuery<Record<string, unknown>>({
    queryKey: ['course-admin', courseId],
    queryFn: () => coursesApi.getAdmin(courseId!),
    enabled: !!courseId,
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

  // ── Info form state ──────────────────────────────────────────────────────

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

  // ── Modules ops ─────────────────────────────────────────────────────────

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
    const newVideo = res.data
    await refetchModules()
    setActivePanel({ type: 'lesson', id: newVideo.id, moduleId })
  }

  async function deleteLesson(lessonId: string) {
    await api.delete(`/videos/${lessonId}`)
    await refetchModules()
    setActivePanel({ type: 'info' })
  }

  // ── Derive active data ───────────────────────────────────────────────────

  const activeModule =
    activePanel.type === 'module' ? modules.find((m) => m.id === activePanel.id) ?? null : null

  const activeLesson =
    activePanel.type === 'lesson'
      ? modules.flatMap((m) => m.videos).find((v) => v.id === activePanel.id) ?? null
      : null

  const activeLessonModuleId = activePanel.type === 'lesson' ? activePanel.moduleId : null

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col bg-white" style={{ fontFamily: 'inherit' }}>
      {/* ── Top bar ── */}
      <header
        className="flex items-center gap-4 px-6 h-14 flex-shrink-0 border-b z-10 bg-white"
        style={{ borderColor: '#e5e7eb' }}
      >
        <button
          onClick={() => navigate('/admin/courses')}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-primary transition-colors bg-transparent border-none cursor-pointer p-0"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10 12L6 8l4-4" />
          </svg>
          Cursos
        </button>

        <div className="w-px h-5 bg-slate-200 flex-shrink-0" />

        <span className="text-[14px] font-bold text-ink flex-1 truncate">
          {(course?.title as string) ?? '…'}
        </span>

        {unsaved && (
          <span className="text-[12px] text-amber-500 font-semibold hidden sm:block flex-shrink-0">
            Cambios sin guardar
          </span>
        )}

        <button
          onClick={handleSaveInfo}
          disabled={savingInfo || activePanel.type !== 'info'}
          className="px-5 py-2 rounded-[10px] text-[13px] font-bold border-none cursor-pointer transition-colors flex-shrink-0 disabled:opacity-50"
          style={{ background: '#7c3aed', color: '#fff' }}
        >
          {savingInfo ? 'Guardando…' : 'Guardar cambios'}
        </button>

        <Link
          to={`/courses/${courseId}`}
          target="_blank"
          className="flex items-center gap-1.5 text-[13px] font-semibold text-primary no-underline hover:opacity-75 transition-opacity flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M7 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9" strokeLinecap="round" />
            <path d="M10 2h4v4M14 2l-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Vista previa
        </Link>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left panel (dark sidebar) ── */}
        <nav
          className="w-[280px] flex-shrink-0 flex flex-col overflow-y-auto"
          style={{ background: '#1e0a3c', borderRight: '1px solid rgba(255,255,255,.08)' }}
        >
          {/* Course info item */}
          <button
            onClick={() => setActivePanel({ type: 'info' })}
            className="flex items-center gap-3 px-4 py-3.5 text-left border-none cursor-pointer transition-all w-full"
            style={{
              background: activePanel.type === 'info' ? 'rgba(124,58,237,.35)' : 'transparent',
              borderLeft: activePanel.type === 'info' ? '3px solid #a78bfa' : '3px solid transparent',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="1.5" strokeLinecap="round">
              <rect x="1" y="1" width="13" height="13" rx="2" />
              <path d="M4 5h7M4 8h5M4 11h3" />
            </svg>
            <span className="text-[13px] font-semibold" style={{ color: activePanel.type === 'info' ? '#a78bfa' : 'rgba(255,255,255,.75)' }}>
              Información del curso
            </span>
          </button>

          {/* Modules section */}
          <div className="px-4 pt-4 pb-1 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Módulos</span>
            <button
              onClick={addModule}
              className="w-6 h-6 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all border-none bg-transparent cursor-pointer"
              title="Agregar módulo"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 1v10M1 6h10" />
              </svg>
            </button>
          </div>

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

          {modules.length === 0 && (
            <p className="px-4 py-2 text-[12px] text-white/30 italic">Sin módulos aún</p>
          )}

          {/* Course files item */}
          <button
            onClick={() => setActivePanel({ type: 'files' })}
            className="flex items-center gap-3 px-4 py-3.5 mt-2 text-left border-none cursor-pointer transition-all w-full"
            style={{
              background: activePanel.type === 'files' ? 'rgba(124,58,237,.35)' : 'transparent',
              borderLeft: activePanel.type === 'files' ? '3px solid #a78bfa' : '3px solid transparent',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 1H10L13 4V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" />
              <path d="M10 1v4h3" />
            </svg>
            <span className="text-[13px] font-semibold" style={{ color: activePanel.type === 'files' ? '#a78bfa' : 'rgba(255,255,255,.75)' }}>
              Archivos del curso {courseFiles.length > 0 ? `(${courseFiles.length})` : ''}
            </span>
          </button>
        </nav>

        {/* ── Right panel ── */}
        <main className="flex-1 overflow-y-auto bg-white p-8">
          {activePanel.type === 'info' && course && (
            <InfoPanel
              form={infoForm}
              categories={categories}
              onChange={(updates) => {
                setInfoForm((f) => ({ ...f, ...updates }))
                setUnsaved(true)
              }}
            />
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
              onSelectLesson={(vid) => setActivePanel({ type: 'lesson', id: vid.id, moduleId: activeModule.id })}
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
  const isModActive = activePanel.type === 'module' && activePanel.id === mod.id

  return (
    <div>
      <div
        className="flex items-center gap-2 px-4 py-2.5 group"
        style={{
          background: isModActive ? 'rgba(124,58,237,.25)' : 'transparent',
          borderLeft: isModActive ? '3px solid #a78bfa' : '3px solid transparent',
        }}
      >
        <button
          onClick={() => setExpanded((e) => !e)}
          className="border-none bg-transparent cursor-pointer p-0 text-white/40 hover:text-white/70 transition-colors flex-shrink-0"
        >
          <svg
            width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8"
            style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}
          >
            <path d="M3 2l4 3-4 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          onClick={onSelectModule}
          className="flex-1 text-left border-none bg-transparent cursor-pointer p-0 min-w-0"
        >
          <span className="text-[11px] font-bold text-white/40 mr-1.5">M{index + 1}</span>
          <span
            className="text-[13px] font-semibold truncate"
            style={{ color: isModActive ? '#a78bfa' : 'rgba(255,255,255,.75)' }}
          >
            {mod.title}
          </span>
        </button>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onAddLesson() }}
            className="w-5 h-5 flex items-center justify-center text-white/50 hover:text-white border-none bg-transparent cursor-pointer rounded"
            title="Agregar clase"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 1v8M1 5h8" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteModule() }}
            className="w-5 h-5 flex items-center justify-center text-red-400 hover:text-red-300 border-none bg-transparent cursor-pointer rounded"
            title="Eliminar módulo"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l8 8M9 1L1 9" />
            </svg>
          </button>
        </div>
      </div>

      {expanded &&
        mod.videos.map((vid) => {
          const isActive = activePanel.type === 'lesson' && activePanel.id === vid.id
          return (
            <div
              key={vid.id}
              className="flex items-center gap-2 pl-10 pr-4 py-2 group"
              style={{
                background: isActive ? 'rgba(124,58,237,.2)' : 'transparent',
                borderLeft: isActive ? '3px solid #a78bfa' : '3px solid transparent',
              }}
            >
              <button
                onClick={() => onSelectLesson(vid)}
                className="flex-1 text-left border-none bg-transparent cursor-pointer p-0 min-w-0"
              >
                <span
                  className="text-[12px] truncate block"
                  style={{ color: isActive ? '#a78bfa' : 'rgba(255,255,255,.55)' }}
                >
                  {vid.title}
                </span>
                {!vid.is_published && (
                  <span className="text-[10px] text-white/25">Sin video</span>
                )}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteLesson(vid) }}
                className="w-5 h-5 flex items-center justify-center text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100 border-none bg-transparent cursor-pointer rounded flex-shrink-0 transition-all"
              >
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 1l7 7M8 1L1 8" />
                </svg>
              </button>
            </div>
          )
        })}
    </div>
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
    <div className="max-w-[720px]">
      <h2 className="text-[22px] font-black text-ink mb-7 flex items-center gap-3">
        <span className="text-2xl">📋</span> Información del curso
      </h2>

      <div className="flex flex-col gap-5">
        <Field label="Título del curso">
          <input className={INPUT_CLS} {...field('title')} placeholder="Endodoncia Clínica Avanzada" />
        </Field>

        <Field label="Subtítulo">
          <input className={INPUT_CLS} {...field('subtitle')} placeholder="Una descripción corta del curso" />
        </Field>

        <div className="grid grid-cols-2 gap-5">
          <Field label="Instructor">
            <input className={INPUT_CLS} {...field('instructor_name')} placeholder="Dr. Martín Rodríguez" />
          </Field>
          <Field label="Título del instructor">
            <input className={INPUT_CLS} {...field('instructor_title')} placeholder="Especialista en Endodoncia · UBA" />
          </Field>
        </div>

        <Field label="Descripción">
          <textarea
            className={INPUT_CLS}
            rows={5}
            style={{ resize: 'vertical' }}
            {...field('description')}
            placeholder="Descripción detallada del curso…"
          />
        </Field>

        <div className="grid grid-cols-2 gap-5">
          <Field label="Categoría">
            <select className={INPUT_CLS} {...field('category_id')}>
              <option value="">Seleccionar…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Nivel">
            <select className={INPUT_CLS} {...field('level')}>
              <option value="basico">Básico</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzado">Avanzado</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <Field label="Precio ($)">
            <input className={INPUT_CLS} type="number" {...field('price')} placeholder="0 = gratis" />
          </Field>
          <Field label="Precio original ($)">
            <input className={INPUT_CLS} type="number" {...field('original_price')} placeholder="Sin descuento" />
          </Field>
        </div>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.featured as boolean}
            onChange={(e) => onChange({ featured: e.target.checked })}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm font-semibold text-gray-700">Destacado en la landing</span>
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
    setSaving(true)
    try { await onUpdateTitle(title) } finally { setSaving(false) }
  }

  return (
    <div className="max-w-[720px]">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <h2 className="text-[22px] font-black text-ink flex items-center gap-3">
          <span className="text-2xl">📁</span> {mod.title}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onAddLesson}
            className="px-4 py-2 rounded-[10px] text-[13px] font-semibold border-none cursor-pointer transition-colors"
            style={{ background: '#7c3aed', color: '#fff' }}
          >
            + Agregar clase
          </button>
          <button
            onClick={onDeleteModule}
            className="px-4 py-2 rounded-[10px] text-[13px] font-semibold border-[1.5px] cursor-pointer transition-colors bg-white text-red-500 border-red-200 hover:bg-red-50"
          >
            Eliminar módulo
          </button>
        </div>
      </div>

      <Field label="Título del módulo">
        <div className="flex gap-3">
          <input
            className={INPUT_CLS + ' flex-1'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={save}
            placeholder="Título del módulo"
          />
          {saving && <span className="self-center text-xs text-slate-400">Guardando…</span>}
        </div>
      </Field>

      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-7 mb-3">
        Clases ({mod.videos.length})
      </p>

      <div className="flex flex-col gap-2">
        {mod.videos.map((vid, i) => (
          <div
            key={vid.id}
            className="flex items-center gap-3 p-4 rounded-[14px] border cursor-pointer hover:border-primary/40 transition-colors group"
            style={{ borderColor: '#f0ebfd' }}
            onClick={() => onSelectLesson(vid)}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
              style={{ background: '#7c3aed', color: '#fff' }}
            >
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink truncate">{vid.title}</p>
              <p className="text-xs text-slate-400">
                {vid.is_published ? (vid.duration_seconds ? formatDuration(vid.duration_seconds) : 'Sin duración') : 'Sin video'}
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteLesson(vid) }}
              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 border-none bg-transparent cursor-pointer p-1 rounded transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>
        ))}

        {mod.videos.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">
            Sin clases. Hacé clic en "+ Agregar clase" para empezar.
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
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total))
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
    <div className="max-w-[720px]">
      <h2 className="text-[22px] font-black text-ink mb-7 flex items-center gap-3">
        <span className="text-2xl">🎬</span> {lesson.title}
      </h2>

      <Field label="Título de la clase">
        <div className="flex gap-3">
          <input
            className={INPUT_CLS + ' flex-1'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
          />
          {saving && <span className="self-center text-xs text-slate-400">Guardando…</span>}
        </div>
      </Field>

      <div className="mt-6">
        <p className="text-[13px] font-semibold text-gray-700 mb-3">Video</p>

        {lesson.is_published ? (
          <div
            className="rounded-[14px] border-2 p-5 flex items-center gap-4"
            style={{ borderColor: '#d1fae5', background: '#f0fdf4' }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: '#d1fae5' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9l4 4 8-8" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-green-700">Video subido</p>
              <p className="text-xs text-green-600">
                {lesson.duration_seconds ? formatDuration(lesson.duration_seconds) : 'Duración desconocida'}
              </p>
            </div>
            <button
              onClick={() => videoInputRef.current?.click()}
              className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold text-primary border border-primary/30 bg-white cursor-pointer hover:bg-primary/5 transition-colors"
            >
              Reemplazar
            </button>
          </div>
        ) : (
          <div
            onClick={() => !uploading && videoInputRef.current?.click()}
            className="rounded-[14px] border-2 border-dashed p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all"
            style={{ borderColor: '#c4b5fd' }}
          >
            {uploading ? (
              <>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-3 max-w-[200px]">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm font-semibold text-primary">{uploadProgress}% subido…</p>
              </>
            ) : (
              <>
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="mb-3">
                  <circle cx="18" cy="18" r="17" stroke="#7c3aed" strokeWidth="1.5" opacity=".3" />
                  <path d="M18 12v12M12 18h12" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="text-sm font-semibold text-primary">Subir video</p>
                <p className="text-xs text-slate-400 mt-1">MP4, MOV, AVI — hasta 2GB</p>
              </>
            )}
          </div>
        )}

        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleVideoUpload}
        />
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
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="max-w-[720px]">
      <h2 className="text-[22px] font-black text-ink mb-2 flex items-center gap-3">
        <span className="text-2xl">📎</span> Archivos del curso
      </h2>
      <p className="text-sm text-slate-500 mb-7 leading-relaxed">
        Estos archivos estarán disponibles para descargar en la página del curso, visibles solo para los estudiantes inscriptos.
      </p>

      {/* Drop zone */}
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        className="rounded-[16px] border-2 border-dashed p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all mb-6"
        style={{ borderColor: '#c4b5fd' }}
      >
        {uploading ? (
          <>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-3 max-w-[200px]">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="text-sm font-semibold text-primary">{uploadProgress}% subido…</p>
          </>
        ) : (
          <>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mb-3" style={{ color: '#7c3aed' }}>
              <path d="M16 4v16M8 12l8-8 8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 24h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".4" />
            </svg>
            <p className="text-sm font-semibold text-primary">Subir archivos</p>
            <p className="text-xs text-slate-400 mt-1">PDF, DOC, PPT, XLS, ZIP — hasta 50 MB</p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt"
        className="hidden"
        onChange={handleUpload}
      />

      {/* File list */}
      <div className="flex flex-col gap-2">
        {files.map((f) => (
          <div
            key={f.id}
            className="flex items-center gap-4 p-4 rounded-[14px] border"
            style={{ borderColor: '#f0ebfd' }}
          >
            <FileTypeBadge type={f.file_type} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink truncate">{f.name}</p>
              {f.file_size_bytes && (
                <p className="text-xs text-slate-400">{formatFileSize(f.file_size_bytes)}</p>
              )}
            </div>
            <button
              onClick={() => handleDelete(f.id)}
              disabled={deleting === f.id}
              className="text-red-400 hover:text-red-500 border-none bg-transparent cursor-pointer p-1 rounded transition-colors disabled:opacity-40"
            >
              {deleting === f.id ? (
                <svg width="14" height="14" viewBox="0 0 14 14" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="7" cy="7" r="5" strokeOpacity=".3" />
                  <path d="M7 2a5 5 0 0 1 5 5" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 1l12 12M13 1L1 13" />
                </svg>
              )}
            </button>
          </div>
        ))}

        {files.length === 0 && !uploading && (
          <p className="text-sm text-slate-400 text-center py-6">Sin archivos subidos aún.</p>
        )}
      </div>
    </div>
  )
}

// ─── Small shared components ──────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
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
    <div
      className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[11px] font-bold flex-shrink-0"
      style={{ background: bg, color }}
    >
      {type.toUpperCase().slice(0, 3)}
    </div>
  )
}

const INPUT_CLS =
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
