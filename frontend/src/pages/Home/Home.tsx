import { Link, useNavigate } from "react-router-dom"
import { useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"

export default function HomePage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) navigate("/app/dashboard")
  }, [isAuthenticated, navigate])

  return (
    <div className="min-h-screen bg-[#0B0F14] text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0F14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400" />
            <div>
              <div className="text-sm font-semibold leading-none">Dale Vision</div>
              <div className="text-[11px] text-white/60 leading-none">Radar Operacional</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/90 hover:bg-white/5"
            >
              Entrar
            </Link>
            <a
              href="#demo"
              className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-black hover:opacity-95"
            >
              Agendar Demo
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-4">
        <section className="py-14">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                Vision Intelligence Core • Active Scan
              </div>

              <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">
                Transforme câmeras em{" "}
                <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  inteligência operacional
                </span>
              </h1>

              <p className="mt-5 text-white/70 leading-relaxed">
                Dale Vision IA é uma plataforma de gestão remota baseada em visão computacional
                para multilojistas e franqueados. Use as câmeras existentes para monitoramento inteligente,
                alertas configuráveis e insights de produtividade, riscos e operação.
              </p>

              <div id="demo" className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a
                  className="rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-400 px-6 py-3 font-semibold text-black"
                  href="https://api.whatsapp.com/send/?phone=5511996918070&text=Quero%20uma%20demo%20do%20Dale%20Vision&type=phone_number&app_absent=0"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Agendar Demo Gratuita
                </a>

                <Link
                  to="/login"
                  className="rounded-2xl border border-white/15 px-6 py-3 font-semibold text-white/90 hover:bg-white/5"
                >
                  Ver Plataforma
                </Link>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Conv", "82%"],
                  ["Flow", "High"],
                  ["Staff", "Optm"],
                  ["Stock", "94%"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className="text-xs text-white/60">{k}</div>
                    <div className="mt-1 text-lg font-bold">{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual placeholder (sem imagem dependente) */}
            <div className="relative">
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                  <div className="text-sm text-white/70">Radar Operacional</div>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-white/60">Produtividade do time</div>
                      <div className="mt-2 text-2xl font-extrabold">+18%</div>
                      <div className="mt-1 text-xs text-white/50">
                        Sugestão: reforçar caixa 12–14h
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-white/60">Prevenção de perdas</div>
                      <div className="mt-2 text-2xl font-extrabold">–23%</div>
                      <div className="mt-1 text-xs text-white/50">
                        Alertas de zonas críticas e anomalias
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-white/60">Decisões em tempo real</div>
                      <div className="mt-2 text-2xl font-extrabold">Live</div>
                      <div className="mt-1 text-xs text-white/50">
                        Monitoramento e recomendações acionáveis
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pointer-events-none absolute -inset-10 -z-10 blur-3xl opacity-40">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-blue-500/30 to-cyan-400/20" />
              </div>
            </div>
          </div>
        </section>

        {/* Sections */}
        <section className="py-10">
          <h2 className="text-xl font-bold">Como funciona</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["Conecte", "Integra câmeras IP/RTSP e organiza por loja."],
              ["Analise", "Gera eventos, métricas e insights operacionais."],
              ["Ação", "Alertas em tempo real + recomendações acionáveis."],
            ].map(([t, d]) => (
              <div
                key={t}
                className="rounded-3xl border border-white/10 bg-white/5 p-6"
              >
                <div className="text-sm font-semibold">{t}</div>
                <div className="mt-2 text-sm text-white/70">{d}</div>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-white/10 py-10 text-sm text-white/60">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>© {new Date().getFullYear()} Dale Vision IA</div>
            <div className="flex gap-4">
              <Link className="hover:text-white" to="/login">Produto</Link>
              <a className="hover:text-white" href="#demo">Contato</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
