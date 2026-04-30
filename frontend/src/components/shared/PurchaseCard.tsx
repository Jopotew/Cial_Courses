import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Course } from '@/types'
import { Button } from '@/components/ui'
import { formatPrice } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { paymentsApi } from '@/api/payments'
import { enrollmentsApi } from '@/api/enrollments'
import { progressApi } from '@/api/progress'

interface PurchaseCardProps {
  course: Course
  sticky?: boolean
  totalLessons?: number
  totalDuration?: string
}

export function PurchaseCard({ course, sticky, totalLessons = 0, totalDuration = '' }: PurchaseCardProps) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [purchasing, setPurchasing] = useState(false)

  const { data: enrolledCourses = [] } = useQuery({
    queryKey: ['my-courses'],
    queryFn: enrollmentsApi.myCourses,
    enabled: isAuthenticated,
  })

  const isEnrolled = enrolledCourses.some((c) => c.id === course.id)

  const { data: progress = 0 } = useQuery({
    queryKey: ['progress', course.id],
    queryFn: () => progressApi.getCourse(course.id),
    enabled: isEnrolled,
  })

  const completedCount = totalLessons > 0 ? Math.round((progress / 100) * totalLessons) : 0

  const discount =
    (course.originalPrice ?? 0) > course.price
      ? Math.round((1 - course.price / course.originalPrice!) * 100)
      : 0

  async function handleBuy() {
    if (!isAuthenticated) { navigate('/login', { state: { from: `/courses/${course.id}` } }); return }
    setPurchasing(true)
    try {
      if (course.free) {
        await enrollmentsApi.enroll(course.id)
        await queryClient.invalidateQueries({ queryKey: ['my-courses'] })
      } else {
        const { init_point } = await paymentsApi.create(course.id)
        if (init_point === '#mock-payment') {
          await queryClient.invalidateQueries({ queryKey: ['my-courses'] })
        } else {
          sessionStorage.setItem('mp_return_url', `/courses/${course.id}`)
          window.location.href = init_point
        }
      }
    } catch {
      // leave purchasing=false so button resets
    } finally {
      setPurchasing(false)
    }
  }

  return (
    <div
      className="bg-white rounded-[20px] overflow-hidden"
      style={{
        boxShadow: '0 8px 40px rgba(0,0,0,.15)',
        position: sticky ? 'sticky' : 'relative',
        top: sticky ? 80 : undefined,
      }}
    >
      {/* Thumbnail */}
      <div
        className="h-[140px] flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${course.cardColor}dd, ${course.cardColor}88)`,
          position: 'relative',
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-[22px] font-extrabold text-white"
          style={{ background: 'rgba(255,255,255,.25)' }}
        >
          {course.instructorInitials}
        </div>

        {isEnrolled && (
          <div
            style={{
              position: 'absolute', top: 12, right: 12,
              background: '#059669', color: '#fff',
              borderRadius: 8, padding: '4px 10px',
              fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M2 5.5l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Inscripto
          </div>
        )}
      </div>

      <div className="p-[22px]">
        {isEnrolled ? (
          <>
            <p className="text-sm font-bold text-gray-800 mb-3">Continuar donde dejaste</p>

            {/* Progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ flex: 1, height: 8, background: '#f0ebfd', borderRadius: 99, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${progress}%`, height: '100%',
                    background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
                    borderRadius: 99, transition: 'width .5s',
                  }}
                />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', flexShrink: 0 }}>
                {progress}%
              </span>
            </div>
            {totalLessons > 0 && (
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px' }}>
                {completedCount} de {totalLessons} clases completadas
              </p>
            )}

            <Button variant="primary" fullWidth size="lg" onClick={() => navigate(`/courses/${course.id}/learn`)}>
              ▶ Continuar curso
            </Button>

            {/* Stats 2×2 grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
              {([
                ['Duración total', totalDuration || '—'],
                ['Lecciones', totalLessons ? String(totalLessons) : '—'],
                ['Nivel', course.level || 'General'],
                ['Certificado', 'Incluido'],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} style={{ background: '#f8f5ff', borderRadius: 12, padding: '10px 12px' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', margin: '0 0 2px' }}>{value}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{label}</p>
                </div>
              ))}
            </div>

            <p style={{ textAlign: 'center', marginTop: 14, marginBottom: 0 }}>
              <Link
                to="/dashboard"
                style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}
              >
                Ver en Mi aprendizaje →
              </Link>
            </p>
          </>
        ) : (
          <>
            <div className="flex items-baseline gap-2.5 mb-1">
              <span
                className="text-[30px] font-black"
                style={{ color: course.free ? '#059669' : '#1a1a2e' }}
              >
                {formatPrice(course.price)}
              </span>
              {!course.free && (course.originalPrice ?? 0) > course.price && (
                <span className="text-base text-slate-400 line-through">
                  {formatPrice(course.originalPrice!)}
                </span>
              )}
            </div>
            {discount > 0 && (
              <p className="text-[13px] text-red-500 font-semibold mb-4">
                {discount}% de descuento
              </p>
            )}
            <div className="flex flex-col gap-2.5 mt-4">
              <Button variant="primary" fullWidth size="lg" onClick={handleBuy} disabled={purchasing}>
                {purchasing ? 'Procesando…' : course.free ? 'Inscribirse gratis' : 'Comprar ahora'}
              </Button>
            </div>
            {!course.free && (
              <p className="text-[11px] text-slate-400 text-center mt-3 leading-relaxed">
                Pago seguro a través de MercadoPago. Acceso ilimitado sin vencimiento.
              </p>
            )}

            {/* Includes */}
            <div className="mt-5 pt-4 border-t border-[#f0ebfd]">
              <p className="text-xs font-bold text-gray-700 mb-2.5">Este curso incluye:</p>
              {[
                ['▶', `${totalDuration || course.duration || 'Acceso'} de video`],
                ['◉', `${totalLessons || course.lessons || 'Múltiples'} clases`],
                ['∞', 'Acceso de por vida'],
                ['✦', 'Certificado de finalización'],
              ].map(([icon, label]) => (
                <div key={icon} className="flex items-center gap-2.5 text-[13px] text-gray-700 mb-2">
                  <span className="text-primary text-sm">{icon}</span>
                  {label}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
