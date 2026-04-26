import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Course } from '@/types'
import { Badge, StarRating } from '@/components/ui'
import { formatPrice } from '@/lib/utils'

interface CourseCardProps {
  course: Course
  enrolled?: boolean
}

export function CourseCard({ course, enrolled }: CourseCardProps) {
  const [hov, setHov] = useState(false)
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/courses/${course.id}`)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="bg-white rounded-2xl overflow-hidden cursor-pointer flex flex-col border border-[#f0ebfd] transition-all duration-200"
      style={{
        boxShadow: hov
          ? '0 8px 32px rgba(124,58,237,.15)'
          : '0 2px 12px rgba(0,0,0,.06)',
        transform: hov ? 'translateY(-3px)' : 'none',
      }}
    >
      {/* Thumbnail */}
      <div
        className="h-[140px] flex items-center justify-center relative"
        style={{
          background: `linear-gradient(135deg, ${course.cardColor}dd, ${course.cardColor}88)`,
        }}
      >
        <div
          className="w-[60px] h-[60px] rounded-2xl flex items-center justify-center text-[26px] font-extrabold text-white tracking-tight"
          style={{ background: 'rgba(255,255,255,.2)' }}
        >
          {course.instructorInitials}
        </div>
        <div className="absolute top-3 right-3">
          {course.free ? (
            <Badge variant="green">Gratis</Badge>
          ) : (
            <span
              className="rounded-full px-[10px] py-[3px] text-xs font-bold"
              style={{ background: 'rgba(255,255,255,.9)', color: course.cardColor }}
            >
              {course.level}
            </span>
          )}
        </div>
        {enrolled && (
          <div className="absolute bottom-3 left-3 bg-white/95 rounded-full px-[10px] py-[3px] text-[11px] font-bold text-accent flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <circle cx="5" cy="5" r="5" fill="#059669" />
              <path d="M3 5l1.5 1.5L7 3.5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Inscripto
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-[18px] pt-4 pb-[18px] flex-1 flex flex-col gap-2">
        <p
          className="text-[11px] font-semibold uppercase tracking-[.5px]"
          style={{ color: course.cardColor }}
        >
          {course.category}
        </p>
        <p className="text-[15px] font-bold text-ink leading-[1.35]">{course.title}</p>
        <p className="text-xs text-slate-400 leading-relaxed flex-1">{course.instructor}</p>
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-bold text-amber-500">{course.rating}</span>
          <StarRating rating={course.rating} small />
          <span className="text-xs text-slate-400">({course.reviewCount})</span>
        </div>
        <div className="flex items-center gap-2.5 text-xs text-slate-500">
          <span>{course.lessons} clases</span>
          <span className="text-gray-200">·</span>
          <span>{course.duration}</span>
        </div>
        <div className="flex items-center gap-2.5 mt-1">
          <span
            className="text-[18px] font-extrabold"
            style={{ color: course.free ? '#059669' : '#1a1a2e' }}
          >
            {formatPrice(course.price)}
          </span>
          {!course.free && (course.originalPrice ?? 0) > course.price && (
            <span className="text-[13px] text-slate-400 line-through">
              {formatPrice(course.originalPrice!)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
