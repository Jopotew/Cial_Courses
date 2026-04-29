import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Course } from '@/types'
import { Button } from '@/components/ui'
import { formatPrice } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { paymentsApi } from '@/api/payments'
import { enrollmentsApi } from '@/api/enrollments'

interface PurchaseCardProps {
  course: Course
  sticky?: boolean
}

const includes = [
  ['▶', (c: Course) => `${c.duration || 'Acceso'} de video`],
  ['◉', (c: Course) => `${c.lessons || 'Múltiples'} clases`],
  ['∞', () => 'Acceso de por vida'],
  ['✦', () => 'Certificado de finalización'],
] as const

export function PurchaseCard({ course, sticky }: PurchaseCardProps) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [purchasing, setPurchasing] = useState(false)

  // Use the same cached query as Dashboard — zero extra requests if already fetched
  const { data: enrolledCourses = [] } = useQuery({
    queryKey: ['my-courses'],
    queryFn: enrollmentsApi.myCourses,
    enabled: isAuthenticated,
  })

  const isEnrolled = enrolledCourses.some((c) => c.id === course.id)

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
        style={{ background: `linear-gradient(135deg, ${course.cardColor}dd, ${course.cardColor}88)` }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-[22px] font-extrabold text-white"
          style={{ background: 'rgba(255,255,255,.25)' }}
        >
          {course.instructorInitials}
        </div>
      </div>

      <div className="p-[22px]">
        {isEnrolled ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-accent-light flex items-center justify-center mx-auto mb-3">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M6 14l6 6 10-12" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-base font-bold text-accent mb-4">¡Ya estás inscripto!</p>
            <Button variant="primary" fullWidth size="lg" onClick={() => navigate(`/courses/${course.id}/learn`)}>
              Ir a mi aprendizaje
            </Button>
          </div>
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
          </>
        )}

        {/* Includes */}
        <div className="mt-5 pt-4 border-t border-[#f0ebfd]">
          <p className="text-xs font-bold text-gray-700 mb-2.5">Este curso incluye:</p>
          {includes.map(([icon, getLabel]) => (
            <div key={icon} className="flex items-center gap-2.5 text-[13px] text-gray-700 mb-2">
              <span className="text-primary text-sm">{icon}</span>
              {getLabel(course)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
