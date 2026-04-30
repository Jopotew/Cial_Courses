import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { coursesApi } from '@/api/courses'
import { formatPrice } from '@/lib/utils'

export function CourseEditorPicker() {
  const navigate = useNavigate()
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses-admin'],
    queryFn: coursesApi.listAdmin,
  })

  return (
    <div style={{ padding: 'clamp(24px,3vw,40px)' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1a1a2e', letterSpacing: '-0.5px', marginBottom: 4 }}>
          Editor de cursos
        </h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>
          Seleccioná un curso para editar su contenido, módulos y archivos.
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #7c3aed', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : courses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', fontSize: 14 }}>
          No hay cursos creados aún.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 20,
          }}
        >
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onEdit={() => navigate(`/admin/editor/${course.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CourseCard({
  course,
  onEdit,
}: {
  course: { id: string; title: string; instructor: string; category: string; price: number; cardColor: string; instructorInitials: string; isPublished: boolean }
  onEdit: () => void
}) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 18,
        border: '1.5px solid #f0ebfd',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow .15s, border-color .15s',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = '0 4px 24px rgba(124,58,237,.12)'
        el.style.borderColor = '#c4b5fd'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = 'none'
        el.style.borderColor = '#f0ebfd'
      }}
    >
      {/* Thumbnail stripe */}
      <div
        style={{
          height: 80,
          background: `linear-gradient(135deg, ${course.cardColor}cc, ${course.cardColor}55)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '-1px',
          position: 'relative',
        }}
      >
        {course.instructorInitials}
        <span
          style={{
            position: 'absolute', top: 8, right: 8,
            fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 8px',
            background: course.isPublished ? '#dcfce7' : 'rgba(0,0,0,.3)',
            color: course.isPublished ? '#16a34a' : '#fff',
          }}
        >
          {course.isPublished ? 'Publicado' : 'Borrador'}
        </span>
      </div>

      <div style={{ padding: '16px 18px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', lineHeight: 1.3, margin: 0 }}>
          {course.title}
        </p>
        <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
          {course.instructor}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span
            style={{
              fontSize: 11, fontWeight: 700, color: '#7c3aed',
              background: '#f3e8ff', borderRadius: 6, padding: '2px 8px',
            }}
          >
            {course.category || 'Sin categoría'}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e' }}>
            {formatPrice(course.price)}
          </span>
        </div>

        <button
          onClick={onEdit}
          style={{
            marginTop: 'auto',
            paddingTop: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '10px 0',
            borderRadius: 10,
            border: 'none',
            background: '#7c3aed',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background .15s',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#6d28d9')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '#7c3aed')}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 2l3 3-7 7H2V9L9 2z" />
          </svg>
          Editar
        </button>
      </div>
    </div>
  )
}
