import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="bg-hero-footer text-white/55 pt-10 pb-7 px-6">
      <div className="max-w-[1100px] mx-auto">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-8 mb-9">
          {/* Brand */}
          <div>
            <p className="text-xl font-extrabold text-white mb-3">
              CIAL<span className="text-accent-bright">cursos</span>
            </p>
            <p className="text-[13px] leading-relaxed">
              Formación continua para profesionales de la salud bucal en toda Latinoamérica.
            </p>
          </div>

          {/* Platform links */}
          <div>
            <p className="text-[13px] font-bold text-white mb-3.5 uppercase tracking-[.5px]">
              Plataforma
            </p>
            {['Catálogo de cursos', 'Sobre CIAL', 'Instructores'].map((l) => (
              <Link
                key={l}
                to="/catalog"
                className="block text-[13px] mb-2.5 text-white/55 hover:text-white/80 no-underline transition-colors"
              >
                {l}
              </Link>
            ))}
          </div>

          {/* Account links */}
          <div>
            <p className="text-[13px] font-bold text-white mb-3.5 uppercase tracking-[.5px]">
              Cuenta
            </p>
            {[
              { label: 'Iniciar sesión', to: '/login' },
              { label: 'Registrarse', to: '/register' },
              { label: 'Mi aprendizaje', to: '/dashboard' },
            ].map(({ label, to }) => (
              <Link
                key={label}
                to={to}
                className="block text-[13px] mb-2.5 text-white/55 hover:text-white/80 no-underline transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t border-white/[.08] pt-5 text-xs text-center">
          © 2026 CIAL · Todos los derechos reservados
        </div>
      </div>
    </footer>
  )
}