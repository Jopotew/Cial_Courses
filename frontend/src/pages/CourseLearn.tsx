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
  const { isAuthenticated } = useAuthStore()
  const videoRef = useRef<HTMLVideoElement>(null)

  const [activeVideo, setActiveVideo] = useState<Video | null>(null)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [loadingStream, setLoadingStream] = useState(false)

  const { data: course } = useQuery({
    queryKey: ['course', id],
    queryFn: () => coursesApi.get(id!),
    enabled: !!id,
  })

  const { data: videos = [], isError: videosError } = useQuery({
    queryKey: ['videos', id],
    queryFn: () => videosApi.list(id!),
    enabled: !!id && isAuthenticated,
    retry: false,
  })

  const { data: progress = 0 } = useQuery({
    queryKey: ['progress', id],
    queryFn: () => progressApi.getCourse(id!),
    enabled: !!id && isAuthenticated,
  })

  // Not enrolled (403) → redirect to course detail
  useEffect(() => {
    if (videosError) navigate(`/courses/${id}`, { replace: true })
  }, [videosError, id, navigate])

  // Auto-select first video
  useEffect(() => {
    if (videos.length > 0 && !activeVideo) {
      handleSelectVideo(videos[0])
    }
  }, [videos])

  async function handleSelectVideo(video: Video) {
    if (activeVideo?.id === video.id) return
    setActiveVideo(video)
    setStreamUrl(null)
    setLoadingStream(true)
    try {
      const url = await videosApi.stream(video.id)
      setStreamUrl(url)
    } catch {
      setStreamUrl(null)
    } finally {
      setLoadingStream(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Top bar */}
      <header
        className="flex items-center gap-4 px-5 py-3 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #1e0a3c, #3b1a7a)' }}
      >
        <Link
          to={`/courses/${id}`}
          className="text-white/60 hover:text-white text-sm font-medium no-underline flex items-center gap-1.5 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 12L6 8l4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver al curso
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate">{course?.title ?? '...'}</p>
        </div>
        <Link
          to="/dashboard"
          className="text-white/60 hover:text-white text-sm no-underline transition-colors"
        >
          Mi aprendizaje
        </Link>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Sidebar */}
        <aside
          className="w-[300px] flex-shrink-0 border-r border-[#e2d9f7] bg-white overflow-y-auto hidden md:flex flex-col"
        >
          <div className="px-4 py-3 border-b border-[#f0ebfd]">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Contenido del curso
            </p>
            {videos.length > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">{videos.length} clases · {progress}% completado</p>
            )}
          </div>

          {videos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center mb-3">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <circle cx="11" cy="11" r="10" fill="#ede9fe" />
                  <path d="M8 7.5l7 3.5-7 3.5V7.5z" fill="#7c3aed" />
                </svg>
              </div>
              <p className="text-sm text-slate-500 font-medium">Sin clases disponibles aún</p>
              <p className="text-xs text-slate-400 mt-1">El instructor está preparando el contenido.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {videos.map((video, index) => {
                const isActive = activeVideo?.id === video.id
                return (
                  <button
                    key={video.id}
                    onClick={() => handleSelectVideo(video)}
                    className="flex items-start gap-3 px-4 py-3.5 text-left border-none cursor-pointer transition-all border-b border-[#f8f5ff] w-full font-sans"
                    style={{
                      background: isActive ? '#f5f3ff' : 'transparent',
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
                      {index + 1}
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
                    {isActive && (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5">
                        <circle cx="8" cy="8" r="7" fill="#7c3aed" />
                        <path d="M6 5.5l5 2.5-5 2.5V5.5z" fill="#fff" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {/* Video player */}
          <div className="w-full bg-black" style={{ aspectRatio: '16/9', maxHeight: '65vh' }}>
            {loadingStream ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
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
            ) : activeVideo ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="22" fill="#3b1a7a" opacity="0.5" />
                  <path d="M19 16l16 8-16 8V16z" fill="white" opacity="0.7" />
                </svg>
                <p className="text-white/60 text-sm">Error al cargar el video</p>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="30" fill="#3b1a7a" opacity="0.4" />
                  <path d="M25 20l22 12-22 12V20z" fill="white" opacity="0.5" />
                </svg>
                <p className="text-white/50 text-sm">Seleccioná una clase para comenzar</p>
              </div>
            )}
          </div>

          {/* Video info */}
          <div className="px-6 py-5 max-w-3xl">
            {activeVideo ? (
              <>
                <h1 className="text-xl font-extrabold text-ink mb-1 tracking-tight">{activeVideo.title}</h1>
                {activeVideo.description && (
                  <p className="text-[14px] text-slate-600 leading-relaxed mt-2">{activeVideo.description}</p>
                )}
              </>
            ) : (
              <>
                <h1 className="text-xl font-extrabold text-ink mb-1 tracking-tight">{course?.title}</h1>
                <p className="text-sm text-slate-500 mt-1">{course?.subtitle}</p>
              </>
            )}

            {/* Mobile video list */}
            {videos.length > 0 && (
              <div className="md:hidden mt-6 border-t border-[#f0ebfd] pt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Clases ({videos.length})
                </p>
                <div className="flex flex-col gap-1">
                  {videos.map((video, index) => {
                    const isActive = activeVideo?.id === video.id
                    return (
                      <button
                        key={video.id}
                        onClick={() => handleSelectVideo(video)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left border-none cursor-pointer font-sans transition-all w-full"
                        style={{ background: isActive ? '#f5f3ff' : 'transparent' }}
                      >
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{
                            background: isActive ? '#7c3aed' : '#ede9fe',
                            color: isActive ? '#fff' : '#7c3aed',
                          }}
                        >
                          {index + 1}
                        </span>
                        <span className="text-[13px] font-medium text-ink truncate flex-1">{video.title}</span>
                        {video.durationFormatted && (
                          <span className="text-[11px] text-slate-400 flex-shrink-0">{video.durationFormatted}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
