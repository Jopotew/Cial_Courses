import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { coursesApi } from '@/api/courses'
import { videosApi } from '@/api/videos'
import { modulesApi, type CourseModule, type ModuleVideo } from '@/api/modules'
import { progressApi } from '@/api/progress'
import { useAuthStore } from '@/store/authStore'

export function CourseLearn() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const isAdmin = user?.isAdmin ?? false
  const videoRef = useRef<HTMLVideoElement>(null)
  const queryClient = useQueryClient()

  const [activeVideoId, setActiveVideoId] = useState<string | null>(null)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [loadingStream, setLoadingStream] = useState(false)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Cache of videoId → signed URL so the next video plays instantly
  const urlCache = useRef<Map<string, string>>(new Map())

  // Course info
  const { data: course } = useQuery({
    queryKey: ['course', id, isAdmin],
    queryFn: async () => {
      if (isAdmin) {
        const raw = await coursesApi.getAdmin(id!)
        return { title: raw.title as string, subtitle: (raw.subtitle as string) ?? '', instructor: (raw.instructor_name as string) ?? '', instructorTitle: (raw.instructor_title as string) ?? '' }
      }
      const c = await coursesApi.get(id!)
      return { title: c.title, subtitle: c.subtitle ?? '', instructor: c.instructor, instructorTitle: c.instructorTitle ?? '' }
    },
    enabled: !!id && isAuthenticated,
  })

  // Modules with videos grouped
  const { data: modules = [] } = useQuery({
    queryKey: ['modules', id],
    queryFn: () => modulesApi.list(id!),
    enabled: !!id && isAuthenticated,
    retry: false,
  })

  const { data: progress = 0 } = useQuery({
    queryKey: ['progress', id],
    queryFn: () => progressApi.getCourse(id!),
    enabled: !!id && isAuthenticated,
  })

  const { data: serverCompletedIds } = useQuery({
    queryKey: ['progress-completed', id],
    queryFn: () => progressApi.getCompletedVideoIds(id!),
    enabled: !!id && isAuthenticated,
  })

  // Hydrate local completedIds from server on first load
  useEffect(() => {
    if (serverCompletedIds && serverCompletedIds.length > 0) {
      setCompletedIds((prev) => new Set([...prev, ...serverCompletedIds]))
    }
  }, [serverCompletedIds])

  // Flat list for sequential nav (only published for students, all for admin)
  const allVideos: ModuleVideo[] = modules.flatMap((m) => m.videos)
  const activeIndex = allVideos.findIndex((v) => v.id === activeVideoId)
  const activeVideo = activeIndex >= 0 ? allVideos[activeIndex] : null
  const activeModule = modules.find((m) => m.videos.some((v) => v.id === activeVideoId)) ?? null

  const canPrev = activeIndex > 0
  const canNext = activeIndex >= 0 && activeIndex < allVideos.length - 1

  // Auto-load first video and prefetch second
  useEffect(() => {
    if (allVideos.length > 0 && !activeVideoId) {
      loadVideo(allVideos[0].id)
      if (allVideos[1]) prefetchVideo(allVideos[1].id)
    }
  }, [modules])

  // Redirect non-admin non-enrolled users if modules fail
  const { isError: modulesError, error: modulesRawError } = useQuery({
    queryKey: ['modules', id],
    queryFn: () => modulesApi.list(id!),
    enabled: !!id && isAuthenticated,
    retry: false,
  })

  useEffect(() => {
    if (!modulesError || isAdmin) return
    const status = (modulesRawError as { response?: { status?: number } })?.response?.status
    if (status === 403 || status === 404) navigate(`/courses/${id}`, { replace: true })
  }, [modulesError, modulesRawError, id, navigate, isAdmin])

  async function prefetchVideo(videoId: string) {
    if (urlCache.current.has(videoId)) return
    try {
      const url = await videosApi.stream(videoId)
      urlCache.current.set(videoId, url)
    } catch { /* silent */ }
  }

  async function loadVideo(videoId: string) {
    if (videoId === activeVideoId) return
    setActiveVideoId(videoId)
    setSidebarOpen(false)

    const cached = urlCache.current.get(videoId)
    if (cached) {
      setStreamUrl(cached)
      setLoadingStream(false)
    } else {
      setStreamUrl(null)
      setLoadingStream(true)
      try {
        const url = await videosApi.stream(videoId)
        urlCache.current.set(videoId, url)
        setStreamUrl(url)
      } catch {
        setStreamUrl(null)
      } finally {
        setLoadingStream(false)
      }
    }

    // Prefetch the next video in the background
    const idx = allVideos.findIndex((v) => v.id === videoId)
    if (idx >= 0 && idx + 1 < allVideos.length) {
      prefetchVideo(allVideos[idx + 1].id)
    }
  }

  async function handleVideoEnd() {
    const finishedId = activeVideoId
    if (finishedId) {
      // Optimistic local update
      setCompletedIds((prev) => new Set([...prev, finishedId]))
      // Persist to backend and refresh progress bars
      try {
        await progressApi.markVideoComplete(finishedId)
        queryClient.invalidateQueries({ queryKey: ['progress', id] })
        queryClient.invalidateQueries({ queryKey: ['progress-completed', id] })
      } catch {
        // Local state already updated; backend failure is non-critical
      }
    }
    if (canNext) loadVideo(allVideos[activeIndex + 1].id)
  }

  const completedCount = completedIds.size
  const totalCount = allVideos.length

  return (
    <div style={{ background: '#f8f5ff', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#1a1a2e' }}>
      {/* ── Top bar ── */}
      <header
        style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '0 20px', height: 56, flexShrink: 0,
          background: '#1e0a3c', borderBottom: '1px solid rgba(255,255,255,.1)',
          zIndex: 10,
        }}
      >
        <Link
          to={`/courses/${id}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.55)',
            textDecoration: 'none', flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10 12L6 8l4-4" />
          </svg>
          Volver al curso
        </Link>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,.12)', flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
            {course?.title ?? '…'}
          </p>
          {totalCount > 0 && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', margin: 0 }}>
              Clase {Math.max(activeIndex + 1, 1)} de {totalCount}
            </p>
          )}
        </div>

        {totalCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ width: 72, height: 5, borderRadius: 99, background: 'rgba(255,255,255,.15)', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg,#7c3aed,#a78bfa)', borderRadius: 99, transition: 'width .5s' }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>{progress}%</span>
          </div>
        )}

        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.6)', padding: 4 }}
          className="md:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        </button>
      </header>

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 56px)' }}>

        {/* ── Main content ── */}
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Video player */}
          <div style={{ background: '#000', width: '100%', flexShrink: 0, aspectRatio: '16/9', maxHeight: '62vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {loadingStream ? (
              <div style={{ width: 40, height: 40, borderRadius: '50%', border: '4px solid rgba(124,58,237,.3)', borderTopColor: '#7c3aed', animation: 'spin .8s linear infinite' }} />
            ) : streamUrl ? (
              <video
                ref={videoRef}
                key={streamUrl}
                src={streamUrl}
                controls
                autoPlay
                onEnded={handleVideoEnd}
                style={{ width: '100%', height: '100%', outline: 'none' }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.06)', border: '2px solid rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="rgba(255,255,255,.4)">
                    <path d="M10 6l18 10L10 26V6z" />
                  </svg>
                </div>
                <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 14, margin: 0 }}>
                  {activeVideo ? 'Error al cargar el video' : 'Seleccioná una clase para comenzar'}
                </p>
              </div>
            )}
          </div>

          {/* ── Info strip below player ── */}
          <div style={{ flex: 1, background: '#fff', padding: '20px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', borderTop: '1px solid #f0ebfd' }}>
            {activeModule && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', background: '#ede9fe', borderRadius: 6, padding: '3px 10px', alignSelf: 'flex-start', marginBottom: 10 }}>
                {activeModule.title}
              </span>
            )}
            <h1 style={{ fontSize: 20, fontWeight: 900, color: '#1a1a2e', margin: '0 0 6px', lineHeight: 1.2, letterSpacing: '-0.3px' }}>
              {activeVideo?.title ?? course?.title ?? '…'}
            </h1>
            {course?.instructor && (
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>
                {course.instructor}{course.instructorTitle ? ` · ${course.instructorTitle}` : ''}
              </p>
            )}

            {/* Prev / Next */}
            {totalCount > 1 && (
              <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
                <button
                  onClick={() => canPrev && loadVideo(allVideos[activeIndex - 1].id)}
                  disabled={!canPrev}
                  style={{
                    padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                    border: '1.5px solid #e2d9f7', background: 'transparent',
                    color: canPrev ? '#1a1a2e' : '#c4b5fd',
                    cursor: canPrev ? 'pointer' : 'default', fontFamily: 'inherit',
                  }}
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => canNext && loadVideo(allVideos[activeIndex + 1].id)}
                  disabled={!canNext}
                  style={{
                    padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                    border: 'none', fontFamily: 'inherit',
                    background: canNext ? '#7c3aed' : '#ede9fe',
                    color: canNext ? '#fff' : '#a78bfa',
                    cursor: canNext ? 'pointer' : 'default',
                  }}
                >
                  Siguiente →
                </button>
              </div>
            )}
          </div>
        </main>

        {/* ── Desktop Sidebar ── */}
        <aside
          className="hidden md:flex"
          style={{
            width: 310, flexShrink: 0,
            background: '#f8f5ff',
            borderLeft: '1px solid #e2d9f7',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          <SidebarContent
            modules={modules}
            totalCount={totalCount}
            completedCount={completedCount}
            completedIds={completedIds}
            activeVideoId={activeVideoId}
            progress={progress}
            onSelect={loadVideo}
          />
        </aside>

        {/* ── Mobile sidebar overlay ── */}
        {sidebarOpen && (
          <div
            className="md:hidden"
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 30 }}
          />
        )}
        <aside
          className="md:hidden"
          style={{
            position: 'fixed', top: 56, right: 0, bottom: 0,
            width: 300, background: '#f8f5ff',
            borderLeft: '1px solid #e2d9f7',
            zIndex: 40, display: 'flex', flexDirection: 'column', overflowY: 'auto',
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform .3s',
          }}
        >
          <SidebarContent
            modules={modules}
            totalCount={totalCount}
            completedCount={completedCount}
            completedIds={completedIds}
            activeVideoId={activeVideoId}
            progress={progress}
            onSelect={(id) => { loadVideo(id); setSidebarOpen(false) }}
          />
        </aside>
      </div>
    </div>
  )
}

// ─── Sidebar Content ─────────────────────────────────────────────────────────

function SidebarContent({
  modules,
  totalCount,
  completedCount,
  completedIds,
  activeVideoId,
  progress,
  onSelect,
}: {
  modules: CourseModule[]
  totalCount: number
  completedCount: number
  completedIds: Set<string>
  activeVideoId: string | null
  progress: number
  onSelect: (videoId: string) => void
}) {
  return (
    <>
      {/* Header */}
      <div style={{ padding: '18px 20px', borderBottom: '1px solid #e2d9f7', flexShrink: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', margin: '0 0 4px' }}>Contenido del curso</p>
        {totalCount > 0 && (
          <>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px' }}>
              {completedCount} de {totalCount} clases completadas
            </p>
            <div style={{ height: 4, background: '#e2d9f7', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg,#7c3aed,#a78bfa)', borderRadius: 99, transition: 'width .5s' }} />
            </div>
          </>
        )}
      </div>

      {/* Modules */}
      {modules.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M8 7.5l7 3.5-7 3.5V7.5z" fill="#7c3aed" />
            </svg>
          </div>
          <p style={{ color: '#64748b', fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>Sin clases disponibles aún</p>
          <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>El instructor está preparando el contenido.</p>
        </div>
      ) : (
        modules.map((mod) => (
          <ModuleSection
            key={mod.id}
            module={mod}
            activeVideoId={activeVideoId}
            completedIds={completedIds}
            onSelect={onSelect}
          />
        ))
      )}
    </>
  )
}

// ─── Module section (accordion in sidebar) ───────────────────────────────────

function ModuleSection({
  module,
  activeVideoId,
  completedIds,
  onSelect,
}: {
  module: CourseModule
  activeVideoId: string | null
  completedIds: Set<string>
  onSelect: (videoId: string) => void
}) {
  const hasActive = module.videos.some((v) => v.id === activeVideoId)
  const [expanded, setExpanded] = useState(hasActive)

  const completedInModule = module.videos.filter((v) => completedIds.has(v.id)).length
  const totalInModule = module.videos.length

  const totalSeconds = module.videos.reduce((sum, v) => sum + (v.duration_seconds ?? 0), 0)
  const durationLabel = formatDuration(totalSeconds)

  return (
    <div style={{ borderBottom: '1px solid #e2d9f7' }}>
      {/* Module header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          width: '100%', textAlign: 'left', padding: '14px 20px',
          background: expanded ? '#ede9fe' : 'transparent',
          border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'flex-start', gap: 10,
        }}
      >
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"
          style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .2s', marginTop: 3, flexShrink: 0 }}
        >
          <path d="M4 2l4 4-4 4" />
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {module.title}
          </p>
          <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
            {completedInModule}/{totalInModule} clases{durationLabel ? ` · ${durationLabel}` : ''}
          </p>
        </div>
      </button>

      {/* Videos */}
      {expanded && module.videos.map((vid, idx) => {
        const isActive = vid.id === activeVideoId
        const isDone = completedIds.has(vid.id)
        return (
          <button
            key={vid.id}
            onClick={() => onSelect(vid.id)}
            style={{
              width: '100%', textAlign: 'left', padding: '10px 20px 10px 42px',
              background: isActive ? '#ede9fe' : 'transparent',
              border: 'none', borderRight: 'none', borderTop: 'none', borderBottom: 'none',
              borderLeftStyle: 'solid', borderLeftWidth: 3, borderLeftColor: isActive ? '#7c3aed' : 'transparent',
              cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            {/* Completion indicator */}
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isDone ? '#059669' : isActive ? '#7c3aed' : '#e2d9f7',
              border: 'none',
            }}>
              {isDone ? (
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M2 5.5l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : isActive ? (
                <svg width="9" height="9" viewBox="0 0 9 9" fill="white">
                  <path d="M2 1l6 3.5-6 3.5V1z" />
                </svg>
              ) : (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed' }}>{idx + 1}</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? '#7c3aed' : isDone ? '#94a3b8' : '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {vid.title}
              </p>
              {vid.duration_seconds != null && (
                <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>
                  {formatDuration(vid.duration_seconds)}
                </p>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}min`
  if (m > 0) return `${m}min ${s > 0 ? s + 's' : ''}`
  return `${s}s`
}
