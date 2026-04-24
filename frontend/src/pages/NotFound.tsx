import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'

export function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="min-h-[calc(100vh-64px)] bg-canvas flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-[96px] font-black text-primary-lighter leading-none mb-4">404</p>
        <h1 className="text-2xl font-extrabold text-ink mb-3">Página no encontrada</h1>
        <p className="text-sm text-slate-500 mb-8">El contenido que buscás no existe o fue movido.</p>
        <Button variant="primary" onClick={() => navigate('/')}>Volver al inicio</Button>
      </div>
    </div>
  )
}
