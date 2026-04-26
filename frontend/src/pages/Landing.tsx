import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { coursesApi } from '@/api/courses'
import { categoriesApi } from '@/api/categories'
import type { Category, Course } from '@/types'
import { CourseCard } from '@/components/shared/CourseCard'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui'

export function Landing() {
  const { data: courses = [] } = useQuery({ queryKey: ['courses'], queryFn: coursesApi.list })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })

  return (
    <div className="bg-white">
      <HeroSection />
      <StatsBar />
      <CategoriesSection categories={categories} />
      <FeaturedSection courses={courses} />
      <CtaBanner />
      <Footer />
    </div>
  )
}

function HeroSection() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    navigate(`/catalog${search ? `?search=${encodeURIComponent(search)}` : ''}`)
  }

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #1e0a3c 0%, #3b1a7a 50%, #4c1d95 100%)',
        padding: 'clamp(60px,10vw,100px) 24px',
      }}
    >
      <div
        className="absolute -top-20 -right-20 w-[360px] h-[360px] rounded-full pointer-events-none"
        style={{ background: 'rgba(124,58,237,.25)', filter: 'blur(60px)' }}
      />
      <div
        className="absolute -bottom-16 -left-16 w-[280px] h-[280px] rounded-full pointer-events-none"
        style={{ background: 'rgba(5,150,105,.2)', filter: 'blur(50px)' }}
      />

      <div className="max-w-[820px] mx-auto text-center relative z-[1]">
        <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-7">
          <span className="w-2 h-2 rounded-full bg-accent-bright inline-block" />
          <span className="text-[13px] text-white/85 font-medium">Plataforma oficial de formación CIAL</span>
        </div>

        <h1
          className="font-black text-white leading-[1.1] mb-5 tracking-[-1.5px]"
          style={{ fontSize: 'clamp(32px,6vw,58px)' }}
        >
          Formación clínica de{' '}
          <span className="text-primary-muted">excelencia</span> para odontólogos
        </h1>

        <p
          className="text-white/75 leading-relaxed mx-auto mb-10"
          style={{ fontSize: 'clamp(16px,2vw,20px)', maxWidth: 580 }}
        >
          Cursos 100% online, a tu ritmo. Aprendé con los mejores especialistas del país y potenciá tu práctica clínica.
        </p>

        <form
          onSubmit={handleSearch}
          className="flex max-w-[560px] mx-auto mb-9 rounded-[14px] overflow-hidden"
          style={{ background: '#fff', boxShadow: '0 8px 40px rgba(0,0,0,.3)' }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscá un curso (ej: endodoncia, estética…)"
            className="flex-1 px-5 py-4 border-none outline-none text-[15px] font-sans text-ink bg-transparent"
          />
          <button
            type="submit"
            className="bg-primary text-white border-none px-6 font-bold text-sm cursor-pointer font-sans rounded-none whitespace-nowrap hover:bg-primary-dark transition-colors"
          >
            Buscar
          </button>
        </form>

        <div className="flex gap-5 justify-center flex-wrap">
          {['Endodoncia', 'Estética Dental', 'Cirugía Oral'].map((tag) => (
            <span
              key={tag}
              onClick={() => navigate(`/catalog?search=${encodeURIComponent(tag)}`)}
              className="text-[13px] text-white/70 cursor-pointer underline hover:text-white transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function StatsBar() {
  const stats = [
    { value: '44+', label: 'Cursos disponibles' },
    { value: '3.200+', label: 'Estudiantes activos' },
    { value: '18', label: 'Instructores expertos' },
    { value: '4.8', label: 'Calificación promedio' },
  ]
  return (
    <div className="bg-hero-bar px-6 py-7">
      <div className="max-w-[900px] mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-[30px] font-black text-primary-muted tracking-tight">{s.value}</p>
            <p className="text-[13px] text-white/55 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function CategoriesSection({ categories }: { categories: Category[] }) {
  const navigate = useNavigate()
  return (
    <section className="bg-canvas px-6" style={{ padding: 'clamp(48px,6vw,80px) 24px' }}>
      <div className="max-w-[1100px] mx-auto">
        <SectionHeader title="Explorá por categoría" subtitle="Encontrá el área de especialización que más te interesa" />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4 mt-9">
          {categories.map((cat) => (
            <CategoryCard key={cat.id} cat={cat} onNavigate={() => navigate(`/catalog?categoryId=${cat.id}`)} />
          ))}
        </div>
      </div>
    </section>
  )
}

function CategoryCard({ cat, onNavigate }: { cat: Category; onNavigate: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onNavigate}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="rounded-2xl p-6 cursor-pointer text-center transition-all duration-200"
      style={{
        background: hov ? cat.bg : '#fff',
        border: `1.5px solid ${hov ? cat.color + '55' : '#f0ebfd'}`,
        transform: hov ? 'translateY(-2px)' : 'none',
        boxShadow: hov ? `0 8px 24px ${cat.color}22` : '0 2px 8px rgba(0,0,0,.04)',
      }}
    >
      <div
        className="w-12 h-12 rounded-[14px] flex items-center justify-center mx-auto mb-3.5"
        style={{ background: cat.bg, border: `1.5px solid ${cat.color}44` }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" fill={cat.color + '33'} stroke={cat.color} strokeWidth="1.5" />
          <path d="M12 2v14M3 7l9 5 9-5" stroke={cat.color} strokeWidth="1.2" />
        </svg>
      </div>
      <p className="text-sm font-bold text-ink leading-[1.3]">{cat.name}</p>
      <p className="text-xs text-slate-400 mt-1">{cat.coursesCount} cursos</p>
    </div>
  )
}

function FeaturedSection({ courses }: { courses: Course[] }) {
  const navigate = useNavigate()
  const featured = courses.filter((c) => c.featured).slice(0, 3)
  const display = featured.length > 0 ? featured : courses.slice(0, 3)
  return (
    <section className="bg-white px-6" style={{ padding: 'clamp(48px,6vw,80px) 24px' }}>
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-9">
          <SectionHeader title="Cursos destacados" subtitle="Los más elegidos por nuestros estudiantes" />
          <Button variant="outline" size="sm" onClick={() => navigate('/catalog')}>
            Ver todos los cursos
          </Button>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
          {display.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      </div>
    </section>
  )
}

function CtaBanner() {
  const navigate = useNavigate()
  return (
    <section className="bg-cta-gradient px-6" style={{ padding: 'clamp(40px,6vw,72px) 24px' }}>
      <div className="max-w-[700px] mx-auto text-center">
        <h2
          className="font-black text-white mb-4 tracking-tight"
          style={{ fontSize: 'clamp(24px,4vw,38px)' }}
        >
          Comenzá tu formación hoy
        </h2>
        <p className="text-base text-white/80 leading-relaxed mb-8">
          Accedé a cursos gratuitos y de pago. Avanzá a tu ritmo y obtené tu certificado.
        </p>
        <div className="flex gap-3.5 justify-center flex-wrap">
          <Button
            size="lg"
            style={{ background: '#fff', color: '#7c3aed' }}
            onClick={() => navigate('/register')}
          >
            Crear cuenta gratis
          </Button>
          <Button
            size="lg"
            style={{ background: 'transparent', color: '#fff', border: '2px solid rgba(255,255,255,.5)' }}
            onClick={() => navigate('/catalog')}
          >
            Ver cursos
          </Button>
        </div>
      </div>
    </section>
  )
}
