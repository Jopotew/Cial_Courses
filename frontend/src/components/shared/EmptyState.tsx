import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'

export function EmptyState() {
  const navigate = useNavigate()
  return (
    <div className="text-center py-[60px] px-5">
      <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center mx-auto mb-5">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M20 5L5 12v16l15 7 15-7V12L20 5z" fill="#ede9fe" stroke="#7c3aed" strokeWidth="1.5" />
          <path d="M20 5v24M5 12l15 8 15-8" stroke="#7c3aed" strokeWidth="1.3" />
        </svg>
      </div>
      <h3 className="text-xl font-extrabold text-ink mb-2">Todavía no tenés cursos</h3>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        Explorá el catálogo y comenzá tu formación hoy.
      </p>
      <Button variant="primary" onClick={() => navigate('/catalog')}>
        Ver catálogo de cursos
      </Button>
    </div>
  )
}