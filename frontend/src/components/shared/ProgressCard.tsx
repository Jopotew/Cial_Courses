import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Course } from '@/types'
import { Button } from '@/components/ui'

interface ProgressCardProps {
  course: Course
  progress: number
}

export function ProgressCard({ course, progress }: ProgressCardProps) {
  const [hov, setHov] = useState(false)
  const navigate = useNavigate()

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="bg-white rounded-2xl border-[1.5px] border-[#f0ebfd] overflow-hidden flex transition-all duration-200"
      style={{
        boxShadow: hov ? '0 6px 24px rgba(124,58,237,.1)' : '0 2px 8px rgba(0,0,0,.04)',
      }}
    >
      {/* Color strip */}
      <div
        className="w-1.5 flex-shrink-0"
        style={{ background: `linear-gradient(to bottom, ${course.cardColor}, ${course.cardColor}66)` }}
      />

      {/* Thumbnail */}
      <div
        className="w-[100px] flex-shrink-0 hidden sm:flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${course.cardColor}dd, ${course.cardColor}77)` }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[15px] font-extrabold text-white"
          style={{ background: 'rgba(255,255,255,.25)' }}
        >
          {course.instructorInitials}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-4 flex-1 flex flex-col gap-2">
        <p
          className="text-[11px] font-semibold uppercase tracking-[.5px]"
          style={{ color: course.cardColor }}
        >
          {course.category}
        </p>
        <p className="text-[15px] font-bold text-ink leading-[1.3]">{course.title}</p>
        <p className="text-xs text-slate-500">{course.instructor}</p>

        {/* Progress bar */}
        <div className="mt-1">
          <div className="flex justify-between mb-1.5">
            <span className="text-xs text-slate-500">Progreso</span>
            <span
              className="text-xs font-bold"
              style={{ color: progress >= 80 ? '#059669' : '#7c3aed' }}
            >
              {progress}%
            </span>
          </div>
          <div className="h-1.5 bg-primary-lighter rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-600"
              style={{
                width: `${progress}%`,
                background:
                  progress >= 80
                    ? 'linear-gradient(90deg, #059669, #34d399)'
                    : 'linear-gradient(90deg, #7c3aed, #a78bfa)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="px-5 py-4 flex items-center flex-shrink-0">
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate(`/courses/${course.id}`)}
        >
          {progress > 0 ? 'Continuar' : 'Comenzar'}
        </Button>
      </div>
    </div>
  )
}