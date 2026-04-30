import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { coursesApi } from '@/api/courses'
import { videosApi, type Video } from '@/api/videos'
import { progressApi } from '@/api/progress'
import { useAuthStore } from '@/store/authStore'

export function CourseLearn() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const isAdmin = user?.isAdmin ?? false
  const videoRef = useRef<HTMLVideoElement>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeVideo, setActiveVideo] = useState<Video | null>(null)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [loadingStream, setLoadingStream] = useState(false)

  const { data: course } = useQuery({
    queryKey: ['course', id, isAdmin],
    queryFn: async () => {
      if (isAdmin) {
        const raw = await coursesApi.getAdmin(id!)
        // map raw admin response to Course shape minimally needed by learn page
        return {
          title: raw.title as string,
          subtitle: (raw.subtitle as string | null) ?? '',
          instructor: (raw.instructor_name as string) ?? '',
          cardColor: '#7c3aed',
        } as { title: string; subtitle: string; instructor: string; cardColor: string }
      }
      return coursesApi.get(id!)
    },
    enabled: !!id && isAuthenticated,
  })

  const { data: videos = [], isError: videosError, error: videosRawError } = useQuery({
    queryKey: ['videos', id, isAdmin],
    queryFn: () => videosApi.list(id!),
    enabled: !!id && isAuthenticated,
    retry: false,
  })

  const { data: progress = 0 } = useQuery({
    queryKey: ['progress', id],
    queryFn: () => progressApi.getCourse(id!),
    enabled: !!id && isAuthenticated,
  })

  // Solo redirigir si el usuario NO es admin y el error es de matriculación (403)
  useEffect(() => {
    if (!videosError || isAdmin) return
    const status = (videosRawError as { response?: { status?: number } })?.response?.status
    if (status === 403 || status === 404) {
      navigate(`/courses/${id}`, { replace: true })
    }
  }, [videosError, videosRawError, id, navigate, isAdmin])

  useEffect(() => {
    if (videos.length > 0 && !activeVideo) loadVideo(videos[0])
  }, [videos])

  const activeIndex = videos.findIndex((v) => v.id === activeVideo?.id)
  const canGoPrev = activeIndex > 0
  const canGoNext = activeIndex >= 0 && activeIndex < videos.length - 1

  async function loadVideo(video: Video) {
    if (activeVideo?.id === video.id) return
    setActiveVideo(video)
    setStreamUrl(null)
    setLoadingStream(true)
    setSidebarOpen(false)
    try {
      const url = await videosApi.stream(video.id)
      setStreamUrl(url)
    } catch {
      setStreamUrl(null)
    } finally {
      setLoadingStream(false)
    }
  }

  function goPrev() { if (canGoPrev) loadVideo(videos[activeIndex - 1]) }
  function goNext() { if (canGoNext) loadVideo(videos[activeIndex + 1]) }

  const cardColor = course?.cardColor ?? '#7c3aed'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f8f7ff' }}>
      {/* ── Top bar — white, light ── */}
      <header className="flex items-center gap-4 px-5 h-14 flex-shrink-0 bg-white border-b border-[#ede9fe] z-10">
        <Link
          to={`/courses/${id}`}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-primary transition-colors no-underline"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10 12L6 8l4-4" />
          </svg>
          Volver
        </Link>

        <div className="w-px h-5 bg-slate-200 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-ink truncate">{course?.title ?? '…'}</p>
          {videos.length > 0 && (
            <p className="text-[11px] text-slate-400">
              Clase {Math.max(activeIndex + 1, 1)} de {videos.length}
            </p>
          )}
        </div>

        {/* Progress pill — desktop */}
        {videos.length > 0 && (
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            <div className="w-[72px] h-1.5 rounded-full overflow-hidden" style={{ background: '#ede9fe' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#7c3aed,#a78bfa)' }}
              />
            </div>
            <span className="text-xs font-bold text-primary">{progress}%</span>
          </div>
        )}

        {/* Mobile sidebar toggle */}
        <button
          className="md:hidden p-1.5 bg-transparent border-none cursor-pointer text-slate-500 hover:text-primary transition-colors"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        </button>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>

        {/* ── Main ── */}
        <main className="flex-1 overflow-y-auto flex flex-col">

          {/* Video player — stays dark for contrast */}
          <div
            className="w-full bg-black flex-shrink-0"
            style={{ aspectRatio: '16/9', maxHeight: '65vh' }}
          >
            {loadingStream ? (
              <div className="w-full h-full flex items-center justify-center">
                <div
                  className="w-10 h-10 rounded-full border-4 animate-spin"
                  style={{
                    borderColor: `${cardColor}33`,
                    borderTopColor: cardColor,
                  }}
                />
              </div>
            ) : streamUrl ? (
              <video
                ref={videoRef}
                key={streamUrl}
                src={streamUrl}
                controls
                autoPlay
                className="w-full h-full"
                style={{ outline: 'none' }}
              />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center gap-3"
                style={{ background: `linear-gradient(160deg, ${cardColor}18, #000)` }}
              >
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center border-2"
                  style={{ background: 'rgba(255,255,255,.08)', borderColor: 'rgba(255,255,255,.15)' }}
                >
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="white" opacity="0.5">
                    <path d="M10 6l18 10L10 26V6z" />
                  </svg>
                </div>
                <p className="text-white/40 text-sm">
                  {activeVideo ? 'Error al cargar el video' : 'Seleccioná una clase para comenzar'}
                </p>
              </div>
            )}
          </div>

          {/* ── Video info + prev/next — light ── */}
          <div className="bg-white border-b border-[#ede9fe] px-6 py-5 flex-shrink-0">
            <div className="max-w-3xl flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                {activeVideo ? (
                  <>
                    <h1 className="text-[18px] font-extrabold text-ink mb-1 tracking-tight leading-snug">
                      {activeVideo.title}
                    </h1>
                    {course?.instructor && (
                      <p className="text-sm text-slate-500">{course.instructor}</p>
                    )}
                    {activeVideo.description && (
                      <p className="text-[14px] text-slate-600 leading-relaxed mt-2">{activeVideo.description}</p>
                    )}
                  </>
                ) : (
                  <>
                    <h1 className="text-[18px] font-extrabold text-ink mb-1 tracking-tight">{course?.title}</h1>
                    <p className="text-sm text-slate-500">{course?.subtitle}</p>
                  </>
                )}
              </div>

              {/* Prev / Next */}
              {videos.length > 1 && (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={goPrev}
                    disabled={!canGoPrev}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold border transition-all font-sans"
                    style={{
                      background: 'white',
                      borderColor: '#e2d9f7',
                      color: canGoPrev ? '#1a1a2e' : '#c4b5fd',
                      cursor: canGoPrev ? 'pointer' : 'default',
                    }}
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={goNext}
                    disabled={!canGoNext}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold border-none transition-all font-sans"
                    style={{
                      background: canGoNext ? '#7c3aed' : '#ede9fe',
                      color: canGoNext ? '#fff' : '#c4b5fd',
                      cursor: canGoNext ? 'pointer' : 'default',
                    }}
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Mobile video list (inline) ── */}
          {videos.length > 0 && (
            <div className="md:hidden bg-white mt-2 border-t border-[#ede9fe]">
              <div className="px-4 py-3 border-b border-[#ede9fe]">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clases del curso</p>
              </div>
              {videos.map((video, index) => (
                <VideoRow
                  key={video.id}
                  video={video}
                  index={index}
                  isActive={activeVideo?.id === video.id}
                  onClick={() => loadVideo(video)}
                />
              ))}
            </div>
          )}
        </main>

        {/* ── Desktop sidebar — white, light ── */}
        <aside className="w-[280px] flex-shrink-0 bg-white border-l border-[#ede9fe] hidden md:flex flex-col overflow-y-auto">
          <SidebarHeader videos={videos} progress={progress} />
          {videos.length === 0 ? (
            <EmptyVideos />
          ) : (
            <div className="flex flex-col flex-1 overflow-y-auto">
              {videos.map((video, index) => (
                <VideoRow
                  key={video.id}
                  video={video}
                  index={index}
                  isActive={activeVideo?.id === video.id}
                  onClick={() => loadVideo(video)}
                />
              ))}
            </div>
          )}
        </aside>

        {/* ── Mobile sidebar overlay ── */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/30 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside
          className="md:hidden fixed top-14 right-0 bottom-0 z-40 w-[280px] bg-white flex flex-col border-l border-[#ede9fe] shadow-xl transition-transform duration-300"
          style={{ transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)' }}
        >
          <SidebarHeader videos={videos} progress={progress} />
          <div className="flex flex-col flex-1 overflow-y-auto">
            {videos.map((video, index) => (
              <VideoRow
                key={video.id}
                video={video}
                index={index}
                isActive={activeVideo?.id === video.id}
                onClick={() => { loadVideo(video); setSidebarOpen(false) }}
              />
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

function SidebarHeader({ videos, progress }: { videos: Video[]; progress: number }) {
  return (
    <div className="px-4 py-4 border-b border-[#ede9fe] flex-shrink-0">
      <p className="text-[13px] font-bold text-ink">Contenido del curso</p>
      {videos.length > 0 && (
        <>
          <p className="text-xs text-slate-400 mt-0.5">{videos.length} clases · {progress}% completado</p>
          <div className="h-1.5 rounded-full mt-2.5 overflow-hidden" style={{ background: '#ede9fe' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#7c3aed,#a78bfa)' }}
            />
          </div>
        </>
      )}
    </div>
  )
}

function EmptyVideos() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: '#ede9fe' }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M8 7.5l7 3.5-7 3.5V7.5z" fill="#7c3aed" />
        </svg>
      </div>
      <p className="text-sm text-slate-500 font-medium">Sin clases disponibles aún</p>
      <p className="text-xs text-slate-400 mt-1">El instructor está preparando el contenido.</p>
    </div>
  )
}

function VideoRow({
  video,
  index,
  isActive,
  onClick,
}: {
  video: Video
  index: number
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 px-4 py-3.5 text-left border-none cursor-pointer transition-all border-b w-full font-sans"
      style={{
        background: isActive ? '#f5f3ff' : 'transparent',
        borderColor: '#f0ebfd',
        borderLeft: isActive ? '3px solid #7c3aed' : '3px solid transparent',
      }}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-bold"
        style={{
          background: isActive ? '#7c3aed' : '#ede9fe',
          color: isActive ? '#fff' : '#7c3aed',
        }}
      >
        {isActive ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
            <path d="M2 1.5l6 3.5-6 3.5V1.5z" />
          </svg>
        ) : (
          index + 1
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-[13px] font-semibold leading-[1.3] truncate"
          style={{ color: isActive ? '#7c3aed' : '#1a1a2e' }}
        >
          {video.title}
        </p>
        {video.durationFormatted && (
          <p className="text-[11px] text-slate-400 mt-0.5">{video.durationFormatted}</p>
        )}
      </div>
    </button>
  )
}
