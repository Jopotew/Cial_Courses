import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import { Badge, Button } from '@/components/ui'

export function AdminUsers() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminApi.getUsers,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      adminApi.toggleUserActive(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div style={{ padding: 'clamp(24px,3vw,40px)' }}>
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-[26px] font-black text-ink tracking-tight mb-1">Usuarios</h1>
          <p className="text-sm text-slate-500">
            {users.filter((u) => u.active).length} activos de {users.length} totales
          </p>
        </div>
        <div className="bg-white rounded-[10px] border-[1.5px] border-[#e2d9f7] flex items-center overflow-hidden w-60">
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round"
            className="ml-3 flex-shrink-0"
          >
            <circle cx="7" cy="7" r="4" />
            <path d="m10 10 2.5 2.5" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuario…"
            className="flex-1 px-3 py-2.5 border-none outline-none text-[13px] font-sans text-ink bg-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-[20px] border border-[#f0ebfd] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-canvas">
                {['Usuario', 'Email', 'Matrículas', 'Ingresó', 'Estado', 'Acción'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[.5px] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr
                  key={u.id}
                  className="border-t border-[#f0ebfd]"
                  style={{ background: i % 2 === 0 ? '#fff' : '#fefefe' }}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-[34px] h-[34px] rounded-full bg-avatar-grad flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {u.initials}
                      </div>
                      <span className="text-sm font-semibold text-ink">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-slate-500">{u.email}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-700 text-center">{u.enrolled}</td>
                  <td className="px-5 py-3.5 text-[13px] text-slate-500 whitespace-nowrap">{u.joined}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={u.active ? 'green' : 'gray'}>
                      {u.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <Button
                      size="sm"
                      variant={u.active ? 'ghost' : 'secondary'}
                      disabled={toggleMutation.isPending}
                      onClick={() => toggleMutation.mutate({ id: u.id, active: !u.active })}
                    >
                      {u.active ? 'Desactivar' : 'Activar'}
                    </Button>
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
