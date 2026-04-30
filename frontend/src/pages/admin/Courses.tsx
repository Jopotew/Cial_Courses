import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { coursesApi } from '@/api/courses'
import type { Course } from '@/types'
import { Badge, Button, Modal } from '@/components/ui'
import { formatPrice } from '@/lib/utils'

export function AdminCourses() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: courseList = [] } = useQuery({
    queryKey: ['courses-admin'],
    queryFn: coursesApi.listAdmin,
  })

  const publishMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      coursesApi.publish(id, isPublished),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses-admin'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => coursesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['courses-admin'] }); setDeleteConfirm(null) },
  })

  return (
    <div style={{ padding: 'clamp(24px,3vw,40px)' }}>
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-[26px] font-black text-ink tracking-tight mb-1">Cursos</h1>
          <p className="text-sm text-slate-500">{courseList.length} cursos en la plataforma</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/admin/editor/new')}>+ Nuevo curso</Button>
      </div>

      <div className="bg-white rounded-[20px] border border-[#f0ebfd] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-canvas">
                {['Curso', 'Categoría', 'Nivel', 'Precio', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[.5px] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {courseList.map((course, i) => (
                <CourseRow
                  key={course.id}
                  course={course}
                  index={i}
                  onEdit={() => navigate(`/admin/editor/${course.id}`)}
                  onView={() => window.open(`/courses/${course.id}`, '_blank')}
                  onTogglePublish={() =>
                    publishMutation.mutate({ id: course.id, isPublished: !course.isPublished })
                  }
                  onDelete={() => setDeleteConfirm(course.id)}
                  publishing={publishMutation.isPending}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {deleteConfirm != null && (
        <Modal onClose={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-[20px] px-8 py-7 max-w-[420px] w-[90vw]">
            <h2 className="text-xl font-extrabold text-ink mb-3">¿Eliminar curso?</h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Esta acción no se puede deshacer. Se perderán todas las matrículas asociadas.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" fullWidth onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
              <Button
                variant="danger"
                fullWidth
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteConfirm)}
              >
                {deleteMutation.isPending ? 'Eliminando…' : 'Sí, eliminar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function CourseRow({
  course,
  index,
  onEdit,
  onView,
  onTogglePublish,
  onDelete,
  publishing,
}: {
  course: Course
  index: number
  onEdit: () => void
  onView: () => void
  onTogglePublish: () => void
  onDelete: () => void
  publishing: boolean
}) {
  return (
    <tr
      className="border-t border-[#f0ebfd]"
      style={{ background: index % 2 === 0 ? '#fff' : '#fefefe' }}
    >
      <td className="px-5 py-3.5 max-w-[260px]">
        <div className="flex items-center gap-3">
          <div
            className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${course.cardColor}cc, ${course.cardColor}66)` }}
          >
            {course.instructorInitials}
          </div>
          <div>
            <p className="text-sm font-semibold text-ink leading-[1.3]">{course.title}</p>
            <p className="text-xs text-slate-400">{course.instructor}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <Badge>{course.category || '—'}</Badge>
      </td>
      <td className="px-5 py-3.5 text-[13px] text-gray-700">{course.level || '—'}</td>
      <td className="px-5 py-3.5 text-sm font-bold whitespace-nowrap" style={{ color: course.free ? '#059669' : '#1a1a2e' }}>
        {formatPrice(course.price)}
      </td>
      <td className="px-5 py-3.5">
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontWeight: 700, borderRadius: 8, padding: '3px 10px',
            background: course.isPublished ? '#dcfce7' : '#f3f4f6',
            color: course.isPublished ? '#16a34a' : '#6b7280',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
          {course.isPublished ? 'Publicado' : 'Borrador'}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex gap-2 flex-wrap">
          <Button variant="primary" size="sm" onClick={onEdit}>Editor</Button>
          <Button variant="ghost" size="sm" onClick={onView}>Ver</Button>
          <button
            onClick={onTogglePublish}
            disabled={publishing}
            style={{
              fontSize: 12, fontWeight: 700, borderRadius: 10, padding: '6px 14px', cursor: 'pointer',
              border: `1.5px solid ${course.isPublished ? '#fde68a' : '#bbf7d0'}`,
              background: 'transparent',
              color: course.isPublished ? '#92400e' : '#065f46',
            }}
          >
            {course.isPublished ? 'Deshabilitar' : 'Habilitar'}
          </button>
          <button
            onClick={onDelete}
            className="text-sm text-red-500 border-[1.5px] border-red-200 bg-transparent rounded-[10px] px-4 py-2 cursor-pointer font-semibold hover:bg-red-50 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  )
}
