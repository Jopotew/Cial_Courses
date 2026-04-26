import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import { Button, Badge } from '@/components/ui'
import { formatPrice } from '@/lib/utils'

export function AdminOverview() {
  const navigate = useNavigate()

  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: adminApi.getStats })
  const { data: sales = [] } = useQuery({ queryKey: ['admin-sales'], queryFn: adminApi.getSales })

  const statCards = [
    {
      label: 'Usuarios totales',
      value: stats?.totalUsers ?? '—',
      sub: `${stats?.totalUsers ?? 0} registrados`,
      color: '#7c3aed',
    },
    {
      label: 'Cursos publicados',
      value: stats?.activeCourses ?? '—',
      sub: 'En la plataforma',
      color: '#059669',
    },
    {
      label: 'Matrículas activas',
      value: stats?.enrollments ?? '—',
      sub: 'Total acumulado',
      color: '#0284c7',
    },
    {
      label: 'Ingresos totales',
      value: stats ? formatPrice(stats.revenue) : '—',
      sub: `${sales.filter((s) => s.status === 'aprobado').length} ventas aprobadas`,
      color: '#b45309',
    },
  ]

  return (
    <div style={{ padding: 'clamp(24px,3vw,40px)' }}>
      <div className="mb-7">
        <h1 className="text-[26px] font-black text-ink tracking-tight mb-1">
          Panel de administración
        </h1>
        <p className="text-sm text-slate-500">Resumen general de la plataforma</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl px-[22px] py-5 border border-[#f0ebfd] shadow-[0_2px_8px_rgba(0,0,0,.04)]">
            <div className="flex items-center gap-3 mb-3.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
              <span className="text-xs text-slate-500 font-semibold">{s.label}</span>
            </div>
            <p className="text-[28px] font-black text-ink tracking-tight">{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent sales */}
      <div className="bg-white rounded-[20px] border border-[#f0ebfd] overflow-hidden">
        <div className="px-6 py-5 border-b border-[#f0ebfd] flex items-center justify-between">
          <h2 className="text-base font-extrabold text-ink">Ventas recientes</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/courses')}>
            Ver cursos
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-canvas">
                {['Estudiante', 'Curso', 'Monto', 'Fecha', 'Estado'].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[.5px] whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.map((sale, i) => (
                <tr
                  key={sale.id}
                  className="border-t border-[#f0ebfd]"
                  style={{ background: i % 2 === 0 ? '#fff' : '#fefefe' }}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-avatar-grad flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                        {sale.student.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-ink whitespace-nowrap">
                        {sale.student}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-gray-700 max-w-[200px]">
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap block">
                      {sale.course}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-bold text-ink whitespace-nowrap">
                    {formatPrice(sale.amount)}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-slate-500 whitespace-nowrap">
                    {sale.date}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={sale.status === 'aprobado' ? 'green' : 'gray'}>
                      {sale.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
