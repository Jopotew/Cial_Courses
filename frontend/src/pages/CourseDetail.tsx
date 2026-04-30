import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { coursesApi } from '@/api/courses'
import { modulesApi, type CourseModule } from '@/api/modules'
import { courseFilesApi, type CourseFile } from '@/api/courseFiles'
import { Badge, StarRating } from '@/components/ui'
import { PurchaseCard } from '@/components/shared/PurchaseCard'
import { useAuthStore } from '@/store/authStore'

function fmtDuration(totalSeconds: number): string {
  if (!totalSeconds) return ''
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h > 0) return `${h}h${m > 0 ? ` ${m}min` : ''}`
  if (m > 0) return `${m}min`
  return `${totalSeconds}s`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ type }: { type: string }) {
  const isPdf = type.includes('pdf')
  const isDoc = type.includes('word') || type.includes('doc')
  const isXls = type.includes('excel') || type.includes('sheet')
  const isPpt = type.includes('powerpoint') || type.includes('presentation')
  const isZip = type.includes('zip')
  const isImg = type.startsWith('image/')

  const color = isPdf ? '#dc2626' : isDoc ? '#2563eb' : isXls ? '#059669' : isPpt ? '#d97706' : isZip ? '#6b7280' : isImg ? '#7c3aed' : '#64748b'
  const label = isPdf ? 'PDF' : isDoc ? 'DOC' : isXls ? 'XLS' : isPpt ? 'PPT' : isZip ? 'ZIP' : isImg ? 'IMG' : 'FILE'

  return (
    <div
      style={{
        width: 38, height: 38, borderRadius: 8, flexShrink: 0,
        background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 800, color, letterSpacing: 0.5,
      }}
    >
      {label}
    </div>
  )
}

export function CourseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const [openModuleId, setOpenModuleId] = useState<string | null>(null)

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: () => coursesApi.get(id!),
    enabled: !!id,
  })

  const { data: modules = [] } = useQuery({
    queryKey: ['modules', id],
    queryFn: () => modulesApi.list(id!),
    enabled: !!id && isAuthenticated,
    retry: false,
  })

  const { data: courseFiles = [] } = useQuery({
    queryKey: ['course-files', id],
    queryFn: () => courseFilesApi.list(id!),
    enabled: !!id && isAuthenticated,
    retry: false,
    throwOnError: false,
  })

  // Compute totals from real module data
  const allVideos = modules.flatMap((m: CourseModule) => m.videos)
  const totalLessons = allVideos.length
  const totalSeconds = allVideos.reduce((sum, v) => sum + (v.duration_seconds ?? 0), 0)
  const totalDuration = fmtDuration(totalSeconds)

  if (isLoading || !course) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Hero */}
      <div
        className="px-6"
        style={{
          background: 'linear-gradient(135deg, #1e0a3c, #3b1a7a)',
          padding: 'clamp(32px,5vw,56px) 24px',
        }}
      >
        <div className="max-w-[1100px] mx-auto detail-hero gap-10 items-start">
          <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Link to="/catalog" className="text-[13px] text-white/60 no-underline hover:text-white/80">
                Cursos
              </Link>
              <span className="text-white/30">/</span>
              <Link
                to={`/catalog?categoryId=${course.categoryId}`}
                className="text-[13px] text-white/60 no-underline hover:text-white/80"
              >
                {course.category}
              </Link>
            </div>

            <Badge variant={course.free ? 'green' : 'default'}>
              {course.free ? 'Gratis' : course.level ?? 'General'}
            </Badge>

            <h1
              className="font-black text-white mt-3 mb-2.5 leading-[1.15] tracking-tight"
              style={{ fontSize: 'clamp(22px,3.5vw,36px)' }}
            >
              {course.title}
            </h1>
            {course.subtitle && (
              <p className="text-base text-white/75 leading-relaxed mb-5">{course.subtitle}</p>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${course.cardColor}, ${course.cardColor}99)` }}
                >
                  {course.instructorInitials}
                </div>
                <div>
                  <p className="text-[13px] text-white font-semibold">{course.instructor}</p>
                  {course.instructorTitle && (
                    <p className="text-[11px] text-white/55">{course.instructorTitle}</p>
                  )}
                </div>
              </div>
              {course.rating > 0 && (
                <>
                  <span className="text-white/30">|</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-amber-400">{course.rating}</span>
                    <StarRating rating={course.rating} small />
                    <span className="text-[13px] text-white/55">({course.reviewCount} reseñas)</span>
                  </div>
                </>
              )}
              {course.students > 0 && (
                <>
                  <span className="text-white/30">|</span>
                  <span className="text-[13px] text-white/60">
                    {course.students.toLocaleString('es-AR')} estudiantes
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Purchase card in hero on desktop */}
          <div className="hidden md:block">
            <PurchaseCard course={course} totalLessons={totalLessons} totalDuration={totalDuration} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-[1100px] mx-auto px-6 py-10 detail-body gap-10 items-start">
        <div>
          {/* About */}
          <ContentSection title="Sobre este curso">
            <p className="text-[15px] text-gray-700 leading-[1.7]">{course.description}</p>
            <div className="flex gap-5 mt-5 flex-wrap">
              {([
                [totalLessons > 0 ? `${totalLessons} clases` : null, 'Clases en video'],
                [totalDuration || null, 'Duración total'],
                [course.level, 'Nivel'],
              ] as [string | null, string][])
                .filter(([v]) => v != null)
                .map(([v, l]) => (
                  <div
                    key={l}
                    className="text-center flex-1 min-w-[100px] bg-primary-light rounded-xl py-3.5 px-2.5"
                  >
                    <p className="text-[18px] font-extrabold text-primary">{v}</p>
                    <p className="text-xs text-slate-500 mt-1">{l}</p>
                  </div>
                ))}
            </div>
          </ContentSection>

          {/* Curriculum — real modules from API */}
          {modules.length > 0 && (
            <ContentSection
              title={`Contenido del curso${totalLessons > 0 ? ` · ${totalLessons} clases` : ''}${totalDuration ? ` · ${totalDuration}` : ''}`}
            >
              <div className="flex flex-col gap-2">
                {modules.map((mod: CourseModule) => {
                  const modSeconds = mod.videos.reduce((s, v) => s + (v.duration_seconds ?? 0), 0)
                  const modDuration = fmtDuration(modSeconds)
                  const isOpen = openModuleId === mod.id
                  return (
                    <div key={mod.id} className="border-[1.5px] border-[#e2d9f7] rounded-xl overflow-hidden">
                      <button
                        onClick={() => setOpenModuleId(isOpen ? null : mod.id)}
                        className="w-full flex items-center justify-between px-[18px] py-3.5 border-none cursor-pointer font-sans transition-colors text-left"
                        style={{ background: isOpen ? '#f5f3ff' : '#fff' }}
                      >
                        <span className="text-sm font-semibold text-ink">{mod.title}</span>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-slate-400">
                            {mod.videos.length} {mod.videos.length === 1 ? 'clase' : 'clases'}
                            {modDuration ? ` · ${modDuration}` : ''}
                          </span>
                          <svg
                            width="16" height="16" viewBox="0 0 16 16" fill="none"
                            stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"
                            style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
                          >
                            <path d="M4 6l4 4 4-4" />
                          </svg>
                        </div>
                      </button>
                      {isOpen && (
                        <div className="px-[18px] py-3 bg-canvas border-t border-[#f0ebfd]">
                          {mod.videos.map((vid) => (
                            <div
                              key={vid.id}
                              className="flex items-center gap-3 py-2 border-b border-[#f0ebfd] last:border-0"
                            >
                              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <circle cx="9" cy="9" r="8" fill="#ede9fe" />
                                <path d="M7 6.5l5 2.5-5 2.5V6.5z" fill="#7c3aed" />
                              </svg>
                              <span className="text-[13px] text-gray-700 flex-1">{vid.title}</span>
                              {vid.duration_seconds != null && (
                                <span className="text-[11px] text-slate-400 flex-shrink-0">
                                  {fmtDuration(vid.duration_seconds)}
                                </span>
                              )}
                            </div>
                          ))}
                          {mod.videos.length === 0 && (
                            <p className="text-xs text-slate-400 py-2">Sin clases aún.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ContentSection>
          )}

          {/* Recursos descargables — only shown when enrolled (backend returns 403 otherwise) */}
          {courseFiles.length > 0 && (
            <ContentSection title="Recursos descargables">
              <div className="flex flex-col gap-2">
                {(courseFiles as CourseFile[]).map((file) => (
                  <a
                    key={file.id}
                    href={file.file_url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-[#e2d9f7] hover:bg-[#f8f5ff] transition-colors"
                  >
                    <FileIcon type={file.file_type} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        className="text-[13px] font-semibold text-ink"
                        style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {file.name}
                      </p>
                      {file.file_size_bytes != null && (
                        <p className="text-[11px] text-slate-400" style={{ margin: 0 }}>
                          {formatFileSize(file.file_size_bytes)}
                        </p>
                      )}
                    </div>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
                      <path d="M8 3v7M5 7l3 3 3-3M3 13h10" />
                    </svg>
                  </a>
                ))}
              </div>
            </ContentSection>
          )}
        </div>

        {/* Purchase card sticky on desktop (right column) */}
        <div className="hidden md:block">
          <PurchaseCard course={course} sticky totalLessons={totalLessons} totalDuration={totalDuration} />
        </div>

        {/* Purchase card mobile (bottom) */}
        <div className="md:hidden">
          <PurchaseCard course={course} totalLessons={totalLessons} totalDuration={totalDuration} />
        </div>
      </div>

      {/* Mobile back */}
      <div className="md:hidden px-6 pb-8">
        <button
          onClick={() => navigate('/catalog')}
          className="text-sm text-primary font-semibold bg-transparent border-none cursor-pointer"
        >
          ← Volver al catálogo
        </button>
      </div>
    </div>
  )
}

function ContentSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[20px] px-7 py-6 mb-5 border border-[#f0ebfd]">
      <h2 className="text-xl font-extrabold text-ink mb-[18px] tracking-tight">{title}</h2>
      {children}
    </div>
  )
}
