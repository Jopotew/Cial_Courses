import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { courses } from '@/data/mock'
import { Badge, StarRating } from '@/components/ui'
import { PurchaseCard } from '@/components/shared/PurchaseCard'

export function CourseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const course = courses.find((c) => c.id === Number(id)) ?? courses[0]
  const [openModule, setOpenModule] = useState<number | null>(null)

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
              {course.free ? 'Gratis' : course.level}
            </Badge>

            <h1
              className="font-black text-white mt-3 mb-2.5 leading-[1.15] tracking-tight"
              style={{ fontSize: 'clamp(22px,3.5vw,36px)' }}
            >
              {course.title}
            </h1>
            <p className="text-base text-white/75 leading-relaxed mb-5">{course.subtitle}</p>

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
                  <p className="text-[11px] text-white/55">{course.instructorTitle}</p>
                </div>
              </div>
              <span className="text-white/30">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-amber-400">{course.rating}</span>
                <StarRating rating={course.rating} small />
                <span className="text-[13px] text-white/55">({course.reviewCount} reseñas)</span>
              </div>
              <span className="text-white/30">|</span>
              <span className="text-[13px] text-white/60">
                {course.students.toLocaleString('es-AR')} estudiantes
              </span>
            </div>
          </div>

          {/* Purchase card in hero on desktop */}
          <div className="hidden md:block">
            <PurchaseCard course={course} />
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
              {[
                [`${course.lessons} clases`, 'Clases en video'],
                [course.duration, 'Duración total'],
                [course.level, 'Nivel'],
              ].map(([v, l]) => (
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

          {/* Curriculum */}
          <ContentSection title={`Contenido del curso · ${course.lessons} clases · ${course.duration}`}>
            <div className="flex flex-col gap-2">
              {course.modules.map((mod, i) => (
                <div key={i} className="border-[1.5px] border-[#e2d9f7] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenModule(openModule === i ? null : i)}
                    className="w-full flex items-center justify-between px-[18px] py-3.5 border-none cursor-pointer font-sans transition-colors text-left"
                    style={{ background: openModule === i ? '#f5f3ff' : '#fff' }}
                  >
                    <span className="text-sm font-semibold text-ink">{mod.title}</span>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-slate-400">
                        {mod.lessons} clases · {mod.duration}
                      </span>
                      <svg
                        width="16" height="16" viewBox="0 0 16 16" fill="none"
                        stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"
                        style={{
                          transform: openModule === i ? 'rotate(180deg)' : 'none',
                          transition: 'transform .2s',
                        }}
                      >
                        <path d="M4 6l4 4 4-4" />
                      </svg>
                    </div>
                  </button>
                  {openModule === i && (
                    <div className="px-[18px] py-3 bg-canvas border-t border-[#f0ebfd]">
                      {Array.from({ length: Math.min(mod.lessons, 4) }).map((_, j) => (
                        <div
                          key={j}
                          className="flex items-center gap-3 py-2 border-b border-[#f0ebfd] last:border-0"
                        >
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <circle cx="9" cy="9" r="8" fill="#ede9fe" />
                            <path d="M7 6.5l5 2.5-5 2.5V6.5z" fill="#7c3aed" />
                          </svg>
                          <span className="text-[13px] text-gray-700">
                            Clase {j + 1}: {mod.title} — parte {j + 1}
                          </span>
                          {j === 0 && course.free && (
                            <span className="ml-auto text-[11px] text-accent font-semibold">
                              Vista previa
                            </span>
                          )}
                        </div>
                      ))}
                      {mod.lessons > 4 && (
                        <p className="text-xs text-slate-400 pt-2.5">
                          + {mod.lessons - 4} clases más
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ContentSection>
        </div>

        {/* Purchase card sticky on desktop (right column) */}
        <div className="hidden md:block">
          <PurchaseCard course={course} sticky />
        </div>

        {/* Purchase card mobile (bottom) */}
        <div className="md:hidden">
          <PurchaseCard course={course} />
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
