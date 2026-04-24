import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { courses as initialCourses, categories } from '@/data/mock'
import type { Course, CourseFormData } from '@/types'
import { Badge, Button, Input, Modal, FormSelect } from '@/components/ui'
import { formatPrice } from '@/lib/utils'

export function AdminCourses() {
  const navigate = useNavigate()
  const [courseList, setCourseList] = useState<Course[]>([...initialCourses])
  const [modal, setModal] = useState<Course | 'new' | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  function handleDelete(id: number) {
    setCourseList((prev) => prev.filter((c) => c.id !== id))
    setDeleteConfirm(null)
  }

  function handleSave(data: CourseFormData & { id?: number }) {
    if (data.id) {
      setCourseList((prev) =>
        prev.map((c) =>
          c.id === data.id
            ? {
                ...c,
                ...data,
                price: Number(data.price),
                originalPrice: Number(data.originalPrice),
                free: Number(data.price) === 0,
              }
            : c,
        ),
      )
    } else {
      const newCourse: Course = {
        id: Date.now(),
        title: data.title,
        subtitle: '',
        instructor: data.instructor,
        instructorInitials: data.instructor.split(' ').map((w) => w[0]).slice(0, 2).join(''),
        instructorTitle: '',
        price: Number(data.price),
        originalPrice: Number(data.originalPrice),
        rating: 0,
        reviewCount: 0,
        students: 0,
        duration: '',
        lessons: 0,
        level: data.level,
        categoryId: data.categoryId,
        category: data.category,
        featured: false,
        free: Number(data.price) === 0,
        cardColor: '#7c3aed',
        description: data.description,
        modules: [],
      }
      setCourseList((prev) => [...prev, newCourse])
    }
    setModal(null)
  }

  return (
    <div style={{ padding: 'clamp(24px,3vw,40px)' }}>
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-[26px] font-black text-ink tracking-tight mb-1">Cursos</h1>
          <p className="text-sm text-slate-500">{courseList.length} cursos en la plataforma</p>
        </div>
        <Button variant="primary" onClick={() => setModal('new')}>+ Nuevo curso</Button>
      </div>

      <div className="bg-white rounded-[20px] border border-[#f0ebfd] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-canvas">
                {['Curso', 'Categoría', 'Nivel', 'Precio', 'Estudiantes', 'Acciones'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[.5px] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {courseList.map((course, i) => (
                <tr
                  key={course.id}
                  className="border-t border-[#f0ebfd]"
                  style={{ background: i % 2 === 0 ? '#fff' : '#fefefe' }}
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
                    <Badge>{course.category}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-gray-700">{course.level}</td>
                  <td className="px-5 py-3.5 text-sm font-bold whitespace-nowrap" style={{ color: course.free ? '#059669' : '#1a1a2e' }}>
                    {formatPrice(course.price)}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-700">{course.students}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setModal(course)}>Editar</Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/courses/${course.id}`)}>Ver</Button>
                      <button
                        onClick={() => setDeleteConfirm(course.id)}
                        className="text-sm text-red-500 border-[1.5px] border-red-200 bg-transparent rounded-[10px] px-4 py-2 cursor-pointer font-semibold hover:bg-red-50 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <CourseModal
          course={modal === 'new' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {deleteConfirm != null && (
        <Modal onClose={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-[20px] px-8 py-7 max-w-[420px] w-[90vw]">
            <h2 className="text-xl font-extrabold text-ink mb-3">¿Eliminar curso?</h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Esta acción no se puede deshacer. Se perderán todas las matrículas asociadas.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" fullWidth onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
              <Button variant="danger" fullWidth onClick={() => handleDelete(deleteConfirm)}>Sí, eliminar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function CourseModal({
  course,
  onSave,
  onClose,
}: {
  course: Course | null
  onSave: (data: CourseFormData & { id?: number }) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<CourseFormData>({
    title: course?.title ?? '',
    instructor: course?.instructor ?? '',
    category: course?.category ?? 'Endodoncia',
    categoryId: course?.categoryId ?? 1,
    level: course?.level ?? 'Básico',
    price: String(course?.price ?? ''),
    originalPrice: String(course?.originalPrice ?? ''),
    description: course?.description ?? '',
  })

  function set(k: keyof CourseFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))
  }

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const cat = categories.find((c) => c.name === e.target.value)
    setForm((f) => ({ ...f, category: e.target.value, categoryId: cat?.id ?? 1 }))
  }

  return (
    <Modal onClose={onClose}>
      <div className="bg-white rounded-[20px] px-8 py-7 max-w-[560px] w-[90vw] max-h-[85vh] overflow-y-auto">
        <h2 className="text-xl font-extrabold text-ink mb-6">
          {course ? 'Editar curso' : 'Nuevo curso'}
        </h2>
        <div className="flex flex-col gap-4">
          <Input label="Título del curso" value={form.title} onChange={set('title')} placeholder="Ej: Endodoncia Avanzada" />
          <Input label="Instructor" value={form.instructor} onChange={set('instructor')} placeholder="Ej: Dr. Martín Rodríguez" />
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Categoría" value={form.category} onChange={handleCategoryChange}>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </FormSelect>
            <FormSelect label="Nivel" value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value as CourseFormData['level'] }))}>
              {['Básico', 'Intermedio', 'Avanzado'].map((l) => <option key={l} value={l}>{l}</option>)}
            </FormSelect>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Precio ($)" type="number" value={form.price} onChange={set('price')} placeholder="0 = gratis" />
            <Input label="Precio original ($)" type="number" value={form.originalPrice} onChange={set('originalPrice')} placeholder="Sin descuento" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-gray-700">Descripción</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={4}
              placeholder="Descripción del curso…"
              className="px-4 py-3 rounded-[10px] border-[1.5px] border-[#e2d9f7] text-sm font-sans resize-y outline-none text-ink leading-relaxed focus:border-primary transition-colors"
            />
          </div>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" fullWidth onClick={onClose}>Cancelar</Button>
            <Button
              variant="primary"
              fullWidth
              onClick={() => onSave({ ...form, id: course?.id })}
            >
              {course ? 'Guardar cambios' : 'Crear curso'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
