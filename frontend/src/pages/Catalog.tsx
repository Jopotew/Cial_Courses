import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { courses, categories } from '@/data/mock'
import { CourseCard } from '@/components/shared/CourseCard'
import { useAuthStore } from '@/store/authStore'

export function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated, enrolledCourseIds } = useAuthStore()

  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [activeCat, setActiveCat] = useState<number | null>(
    searchParams.get('categoryId') ? Number(searchParams.get('categoryId')) : null,
  )
  const [level, setLevel] = useState('')
  const [sort, setSort] = useState('rating')

  function updateSearch(val: string) {
    setSearch(val)
    const next = new URLSearchParams(searchParams)
    if (val) next.set('search', val); else next.delete('search')
    setSearchParams(next, { replace: true })
  }

  function updateCat(id: number | null) {
    setActiveCat(id)
    const next = new URLSearchParams(searchParams)
    if (id != null) next.set('categoryId', String(id)); else next.delete('categoryId')
    setSearchParams(next, { replace: true })
  }

  const filtered = useMemo(() => {
    let list = [...courses]
    if (activeCat != null) list = list.filter((c) => c.categoryId === activeCat)
    if (level) list = list.filter((c) => c.level === level)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.instructor.toLowerCase().includes(q),
      )
    }
    if (sort === 'rating') list.sort((a, b) => b.rating - a.rating)
    if (sort === 'students') list.sort((a, b) => b.students - a.students)
    if (sort === 'price_asc') list.sort((a, b) => a.price - b.price)
    if (sort === 'price_desc') list.sort((a, b) => b.price - a.price)
    return list
  }, [activeCat, level, search, sort])

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div
        className="px-6"
        style={{
          background: 'linear-gradient(135deg, #1e0a3c, #3b1a7a)',
          padding: 'clamp(32px,5vw,56px) 24px',
        }}
      >
        <div className="max-w-[1100px] mx-auto">
          <h1
            className="font-black text-white mb-4 tracking-tight"
            style={{ fontSize: 'clamp(24px,4vw,40px)' }}
          >
            Catálogo de cursos
          </h1>
          <div
            className="flex bg-white rounded-xl overflow-hidden max-w-[520px]"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,.2)' }}
          >
            <input
              value={search}
              onChange={(e) => updateSearch(e.target.value)}
              placeholder="Buscar cursos…"
              className="flex-1 px-[18px] py-[13px] border-none outline-none text-[15px] font-sans text-ink"
            />
            <button className="bg-primary border-none px-5 cursor-pointer flex items-center">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                <circle cx="8" cy="8" r="5" />
                <path d="m12 12 3.5 3.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1100px] mx-auto px-6 py-8 catalog-grid gap-8 items-start">
        {/* Sidebar */}
        <aside>
          <FilterBlock title="Categoría">
            <FilterChip label="Todas" active={activeCat == null} onClick={() => updateCat(null)} />
            {categories.map((cat) => (
              <FilterChip
                key={cat.id}
                label={cat.name}
                count={cat.count}
                active={activeCat === cat.id}
                color={cat.color}
                onClick={() => updateCat(activeCat === cat.id ? null : cat.id)}
              />
            ))}
          </FilterBlock>
          <FilterBlock title="Nivel">
            <FilterChip label="Todos" active={!level} onClick={() => setLevel('')} />
            {['Básico', 'Intermedio', 'Avanzado'].map((l) => (
              <FilterChip
                key={l}
                label={l}
                active={level === l}
                onClick={() => setLevel(level === l ? '' : l)}
              />
            ))}
          </FilterBlock>
        </aside>

        {/* Results */}
        <div>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <span className="text-sm text-slate-500">
              <b className="text-ink">{filtered.length}</b> cursos encontrados
            </span>
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] text-slate-500">Ordenar por:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="px-3 py-2 rounded-lg border-[1.5px] border-[#e2d9f7] text-[13px] font-sans text-gray-700 outline-none cursor-pointer bg-white"
              >
                <option value="rating">Mejor calificación</option>
                <option value="students">Más populares</option>
                <option value="price_asc">Precio: menor a mayor</option>
                <option value="price_desc">Precio: mayor a menor</option>
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-[60px] px-5 text-slate-400">
              <p className="text-5xl mb-4">—</p>
              <p className="text-base font-semibold text-gray-700 mb-2">No encontramos cursos</p>
              <p className="text-sm">Probá con otro término o eliminá los filtros</p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
              {filtered.map((c) => (
                <CourseCard
                  key={c.id}
                  course={c}
                  enrolled={isAuthenticated && enrolledCourseIds.includes(c.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FilterBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-[18px] mb-4 border border-[#f0ebfd]">
      <p className="text-[13px] font-bold text-gray-700 uppercase tracking-[.5px] mb-3.5">{title}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

function FilterChip({
  label,
  active,
  onClick,
  count,
  color,
}: {
  label: string
  active: boolean
  onClick: () => void
  count?: number
  color?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between rounded-lg px-3 py-2 font-sans text-sm text-left transition-all cursor-pointer border-[1.5px] ${
        active
          ? 'bg-primary-light text-primary font-bold border-primary-border'
          : 'text-gray-700 font-normal border-transparent hover:bg-primary-light hover:text-primary'
      }`}
    >
      <span className="flex items-center gap-2">
        {color && active && (
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
        )}
        {label}
      </span>
      {count != null && <span className="text-xs text-slate-400">{count}</span>}
    </button>
  )
}
