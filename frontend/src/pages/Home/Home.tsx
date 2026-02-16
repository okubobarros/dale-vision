import { Link, useNavigate } from "react-router-dom"
import React, { useEffect, useMemo, useState } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { Helmet } from "@vuer-ai/react-helmet-async"
import logo from "../../assets/logo.png"
import { useRevealOnScroll } from "../../hooks/useRevealOnScroll"

const WHATSAPP_DEMO =
  "https://api.whatsapp.com/send/?phone=5511996918070&text=Quero%20meu%20teste%20de%2072h%20da%20DaleVision&type=phone_number&app_absent=0"

// === BRAND (use sempre a mesma assinatura) ===
function GradientTitle({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500 bg-clip-text text-transparent">
      {children}
    </span>
  )
}

function BrandPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
      {children}
    </span>
  )
}

function BrandButton({
  children,
  href,
  className = "",
}: {
  children: React.ReactNode
  href: string
  className?: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        "dv-cta inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500 px-8 py-4 text-center font-bold text-black text-lg shadow-xl hover:opacity-95 hover:shadow-blue-500/25 transition-all " +
        className
      }
    >
      {children}
    </a>
  )
}

// Hook: rotaciona índice para o slide de frases (sem framer-motion)
function useRotatingIndex(length: number, delay = 4500) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (length <= 1) return
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % length)
    }, delay)
    return () => window.clearInterval(id)
  }, [length, delay])

  return index
}

// FAQ item com hover + click mobile
function FaqItem({
  q,
  a,
  icon,
  isOpen,
  onToggle,
  onHoverOpen,
  onHoverClose,
}: {
  q: string
  a: string
  icon: string
  isOpen: boolean
  onToggle: () => void
  onHoverOpen: () => void
  onHoverClose: () => void
}) {
  return (
    <div
      className="dv-card rounded-xl border border-white/10 bg-white/5 p-5 transition-all hover:bg-white/7 hover:border-white/20"
      onMouseEnter={onHoverOpen}
      onMouseLeave={onHoverClose}
    >
      <button
        type="button"
        className="w-full text-left"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <div className="text-lg">{icon}</div>
            </div>
            <h3 className="text-base md:text-lg font-semibold text-white/90">
              {q}
            </h3>
          </div>

          <div
            className={`text-white/60 transition-transform duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </button>

      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mt-4 pt-4 border-t border-white/10 text-white/70 leading-relaxed pl-14">
          {a}
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useRevealOnScroll({ selector: "[data-reveal]" })

  useEffect(() => {
    if (isAuthenticated) navigate("/app/dashboard")
  }, [isAuthenticated, navigate])

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "DaleVision | Visão Computacional Aplicada ao Varejo",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Reduza horas ociosas e não perca clientes por falta de atendimento. Teste 72h gratuito usando suas câmeras Intelbras/CFTV existentes.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
      description: "Teste 72h gratuito com relatório de ociosidade e filas",
    },
  }

  // DORES (frases rotativas — slide lateral)
  const pains = useMemo(
    () => [
      {
        title: "Enquanto você lê isso,",
        highlight: "há clientes indo embora",
        sub: "Fila estoura → cliente reclama. Quando você fica sabendo, a venda já se perdeu.",
      },
      {
        title: "Eu só descubro o problema",
        highlight: "depois que já aconteceu",
        sub: "Sem evidência, a operação vira reação — e isso não escala em 20+ lojas.",
      },
      {
        title: "Sempre falta alguém no turno",
        highlight: "e atrasos viraram rotina",
        sub: "Ociosidade de um lado, fila do outro. Margem vazando sem você perceber.",
      },
      {
        title: "Quebra, erro ou furto",
        highlight: "só aparece no fechamento",
        sub: "Sem histórico e prova, você age tarde — e paga caro pela falta de prevenção.",
      },
      {
        title: "Você confia nos líderes,",
        highlight: "mas não tem visibilidade",
        sub: "Relato não é dado. Intuição não replica. Você precisa de métricas por loja e turno.",
      },
    ],
    []
  )

  const painIndex = useRotatingIndex(pains.length, 4800)

  // FAQ ordenada (já está ordenada por fluxo de objeções)
  const faqs = useMemo(
    () => [
      {
        icon: "🚨",
        q: "Como são os alertas em tempo real?",
        a: "Alertas por WhatsApp/e-mail/painel quando detectamos filas acima do limite, cliente esperando, picos de fluxo sem cobertura, ociosidade crítica ou eventos em zonas sensíveis.",
      },
      {
        icon: "🤖",
        q: "Como funciona a classificação de comportamentos?",
        a: "A IA identifica padrões de atividade operacional (atendimento, espera, organização, inatividade) sem reconhecimento facial e sem identificar pessoas — foco é gestão da operação.",
      },
      {
        icon: "📊",
        q: "Como funciona o cálculo de ociosidade da equipe?",
        a: "Analisamos presença e atividade em zonas configuradas. Quando há baixa atividade produtiva por um período, contabilizamos como ociosidade. Os relatórios saem por turno, loja e contexto operacional (sem identificar pessoas).",
      },
      {
        icon: "📹",
        q: "Preciso trocar minhas câmeras atuais?",
        a: "Não. Funciona com câmeras IP/CFTV via RTSP/ONVIF. Intelbras, Hikvision, Dahua e similares geralmente são compatíveis.",
      },
      {
        icon: "👥",
        q: "Vocês fazem análise de fluxo de clientes?",
        a: "Sim. Contagem, variações por faixa de horário, heatmaps de zonas e tempo médio de permanência — para otimizar escala e layout.",
      },
      {
        icon: "🏪",
        q: "Funciona em múltiplas lojas simultaneamente?",
        a: "Sim. Dashboard central com visão por loja/turno e comparativos entre unidades, para replicar boas práticas.",
      },
      {
        icon: "⏱️",
        q: "Quanto tempo leva para ver resultados?",
        a: "Em até 72h você recebe o diagnóstico inicial. Com 2–4 semanas, já dá para ver queda de ociosidade e melhoria de cobertura em horários críticos.",
      },
      {
        icon: "🔄",
        q: "Posso cancelar a qualquer momento?",
        a: "Sim. Sem fidelidade. Você pode encerrar quando quiser.",
      },
      {
        icon: "🔒",
        q: "E a privacidade dos meus funcionários?",
        a: "Privacy-by-design: sem reconhecimento facial, sem áudio, com mascaramento de áreas sensíveis e dados criptografados. Pronto para operar com boas práticas LGPD.",
      },
    ],
    []
  )

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)

  return (
    <div className="min-h-screen bg-[#0B0F14] text-white relative overflow-hidden">
      <Helmet>
        <title>DaleVision IA</title>
        <meta
          name="description"
          content="Multilojistas reduzem custos e aumentam conversão com evidências: ociosidade, filas e fluxo em dashboards e alertas. Teste 72h grátis."
        />
        <link rel="canonical" href="https://dalevision.com/" />
        <meta property="og:title" content="DaleVision | Evidência operacional com IA" />
        <meta
          property="og:description"
          content="Transforme CFTV em provas e decisões: ociosidade, filas e fluxo. Teste 72h grátis com diagnóstico."
        />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="pt_BR" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* Backgrounds */}
      <div className="absolute inset-0 dv-grid opacity-40" />
      <div className="absolute inset-0 dv-spotlight" />
      <div className="absolute inset-0 dv-noise" />

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0F14]/85 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3">
          {/* MOBILE */}
          <div className="flex flex-col gap-3 sm:hidden">
            {/* Linha 1 — Brand */}
            <div className="flex items-center gap-3">
              <img src={logo} alt="DaleVision" className="h-9 w-auto" />
              <div className="leading-tight">
                <div className="text-sm font-semibold">
                  <GradientTitle>DaleVision</GradientTitle>
                </div>
                <div className="text-[11px] text-white/60">Eyes Everywhere</div>
              </div>
            </div>

            {/* Linha 2 — Actions */}
            <div className="flex items-center gap-3">
              {/* Login — secundário */}
              <Link
                to="/login"
                className="flex-1 rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 text-center"
              >
                Login
              </Link>

              {/* CTA principal */}
              <a
                href="/agendar-demo"
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500 px-4 py-2 text-sm font-semibold text-black text-center shadow-lg"
              >
                Agendar Demo →
              </a>
            </div>
          </div>

          {/* DESKTOP */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="DaleVision" className="h-10 w-auto" />
              <div>
                <div className="text-sm font-semibold leading-none">
                  <GradientTitle>DaleVision</GradientTitle>
                </div>
                <div className="text-[11px] text-white/60 leading-none">Eyes Everywhere</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/90 hover:bg-white/5"
              >
                Login
              </Link>
              <a
                href="/agendar-demo"
                className="rounded-xl bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500 px-6 py-2 text-sm font-semibold text-black shadow-lg hover:opacity-95"
              >
                Agendar Demo →
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 relative z-10">
        {/* HERO */}
        <section className="pt-14 pb-10">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            <div data-reveal className="dv-reveal">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/90">
                <span className="h-2 w-2 rounded-full bg-cyan-300 animate-pulse" />
                IA aplicada ao varejo físico • Controle de multilojas
              </div>

              <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Você não sabe o que acontece nas lojas,{" "}
                <GradientTitle>mas paga por tudo o que acontece nelas</GradientTitle>
              </h1>

              <div className="mt-4 p-4 border border-white/10 bg-white/5 rounded-2xl">
                <p className="text-base md:text-lg font-semibold text-white/90 leading-relaxed">
                  A DaleVision atua como um <strong>gestor operacional remoto</strong>, ampliando sua visão,
                  acelerando decisões e elevando resultados — <strong>em tempo real</strong>.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                {[
                  "📊 Ociosidade por turno e loja",
                  "💰 Economia estimada em folha",
                  "🚨 Fila/atendimento em risco",
                  "🎯 Escala ideal baseada em fluxo",
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                  >
                    <div className="text-cyan-300 mt-1">✓</div>
                    <span className="text-sm text-white/80">{item}</span>
                  </div>
                ))}
              </div>

              <div id="teste72h" className="mt-8">
                <BrandButton  href="/agendar-demo" className="w-full">
                  🚀 QUERO MEU DIAGNÓSTICO EM 72h
                </BrandButton>

                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  <BrandPill>✅ Setup em 1 chamada</BrandPill>
                  <BrandPill>✅ Sem custos no teste</BrandPill>
                  <BrandPill>✅ 100% Compatível Intelbras/CFTV</BrandPill>
                </div>
              </div>
            </div>

            {/* Dashboard */}
            <div data-reveal className="dv-reveal relative">
              <div className="rounded-[28px] border border-white/15 bg-white/5 p-4 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-medium text-white/90">LOJA CENTRO • AO VIVO</span>
                  </div>
                  <div className="text-xs bg-white/5 border border-white/10 text-white/80 px-3 py-1 rounded-full">
                    📊 3 alertas
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">⏰</div>
                        <div>
                          <div className="font-bold text-white/90">Ociosidade crítica</div>
                          <div className="text-sm text-white/60 mt-1">Turno 12–14h: 72% parado</div>
                        </div>
                      </div>
                      <div className="text-xs bg-white/5 border border-white/10 text-white/80 px-3 py-1 rounded-full whitespace-nowrap">
                        Ajustar escala
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">👥</div>
                        <div>
                          <div className="font-bold text-white/90">Clientes em risco</div>
                          <div className="text-sm text-white/60 mt-1">14 sem atendimento há 2+ min</div>
                        </div>
                      </div>
                      <div className="text-xs bg-white/5 border border-white/10 text-white/80 px-3 py-1 rounded-full whitespace-nowrap">
                        Reforçar caixa
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">💰</div>
                        <div>
                          <div className="font-bold text-white/90">Economia identificada</div>
                          <div className="text-sm text-white/60 mt-1">Escala ideal: -1 pessoa/turno</div>
                        </div>
                      </div>
                      <div className="text-xs bg-white/5 border border-white/10 text-white/80 px-3 py-1 rounded-full whitespace-nowrap">
                        R$2.400/mês
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10">
                  <div className="flex justify-between text-xs text-white/60">
                    <span>3 lojas monitoradas</span>
                    <span>18 câmeras ativas</span>
                  </div>
                </div>

                <div className="absolute -top-3 -right-3">
                  <div className="bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500 text-black text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                    📈 DADOS REAIS
                  </div>
                </div>
              </div>

              <div className="mt-4 text-center text-sm text-white/60">
                <p>
                  <strong>Visão • Evidência • Decisão</strong>
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="dv-divider my-6" />

        {/* DORES (com slide lateral) */}
        <section className="py-10 overflow-hidden">
          <div data-reveal className="dv-reveal">
            <div className="text-center mb-10">
              <div className="inline-block px-6 py-2 rounded-full bg-white/5 border border-white/10 mb-4">
                <span className="text-sm font-medium text-white/80">PARE E PENSE</span>
              </div>

              {/* SLIDER */}
              <div className="relative min-h-[220px] sm:min-h-[190px] md:min-h-[165px] overflow-hidden">
                {pains.map((item, i) => (
                  <div
                    key={i}
                    className={[
                      "absolute inset-0 flex flex-col items-center justify-center",
                      "transition-all duration-700 ease-in-out",
                      i === painIndex
                        ? "opacity-100 translate-x-0"
                        : i < painIndex
                        ? "opacity-0 -translate-x-full"
                        : "opacity-0 translate-x-full",
                    ].join(" ")}
                  >
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
                      {item.title}{" "}
                      <span className="block">
                        <GradientTitle>{item.highlight}</GradientTitle>
                      </span>
                    </h2>

                    <p className="mt-4 text-base sm:text-lg text-white/70 max-w-2xl mx-auto">
                      {item.sub}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <h3 className="text-2xl font-bold text-center mb-8">
              Você gerencia com <GradientTitle>informação incompleta</GradientTitle>
            </h3>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: "👁️",
                  title: "Visão incompleta",
                  description: "Você só descobre quando vira reclamação ou queda no caixa.",
                },
                {
                  icon: "⏳",
                  title: "Tempo perdido",
                  description: "Olhar câmeras não vira insight sem métrica e histórico.",
                },
                {
                  icon: "💸",
                  title: "Dinheiro na mesa",
                  description: "Paga tempo ocioso e perde venda no pico por falta de cobertura.",
                },
                {
                  icon: "🤷",
                  title: "Decisão no escuro",
                  description: "Escala baseada em feeling — e não em fluxo e atendimento reais.",
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="dv-card rounded-2xl border border-white/10 bg-white/5 p-6 text-center hover:border-white/20 transition-all"
                >
                  <div className="text-4xl mb-4">{item.icon}</div>
                  <h4 className="text-lg font-bold mb-2 text-white/90">{item.title}</h4>
                  <p className="text-sm text-white/60">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <BrandButton  href="/agendar-demo">Parar de perder clientes →</BrandButton>
              <p className="mt-3 text-sm text-white/60">
                Você vê o diagnóstico em 72h, com evidências e recomendações.
              </p>
            </div>
          </div>
        </section>

        <div className="dv-divider my-6" />

        {/* 3 vazamentos (menos vermelho/verde, mais coerência visual) */}
        <section className="py-10">
          <div data-reveal className="dv-reveal">
            <h2 className="text-2xl font-bold text-center mb-12">
              DaleVision resolve seus <GradientTitle>3 maiores vazamentos de lucro</GradientTitle>
            </h2>

            <div className="grid gap-8 lg:grid-cols-3">
              {[
                {
                  icon: "💰",
                  title: "Produtividade da equipe",
                  problem: "Horas ociosas consomem margem e distorcem a escala.",
                  solution: "Ociosidade por turno + recomendação de escala.",
                  metric: "↓ horas pagas • ↑ eficiência",
                },
                {
                  icon: "👥",
                  title: "Experiência do cliente",
                  problem: "Fila e espera viram abandono e conversão perdida.",
                  solution: "Alertas de atendimento em risco + tempo de espera.",
                  metric: "↑ cobertura em horários críticos",
                },
                {
                  icon: "🛡️",
                  title: "Prevenção de perdas",
                  problem: "Eventos sensíveis passam despercebidos até tarde.",
                  solution: "Zonas e eventos monitorados com evidência visual.",
                  metric: "Detecção mais cedo",
                },
              ].map((item, i) => (
                <div key={i} className="dv-card rounded-3xl border border-white/10 bg-white/5 p-8 text-center hover:border-white/20 transition-all">
                  <div className="text-4xl mb-4 mx-auto">{item.icon}</div>
                  <h3 className="text-xl font-bold mb-3 text-white/90">{item.title}</h3>

                  <div className="space-y-2 mb-6">
                    <div className="text-white/70">{item.problem}</div>
                    <div className="text-white/80 font-medium">{item.solution}</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="font-bold text-base">
                      <GradientTitle>{item.metric}</GradientTitle>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <BrandButton  href="/agendar-demo">Ver relatório do meu negócio →</BrandButton>
            </div>
          </div>
        </section>

        <div className="dv-divider my-6" />

        {/* O QUE SUA OPERAÇÃO RECEBE (normaliza cor nos cards) */}
        <section className="py-14">
          <div data-reveal className="dv-reveal">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">
                O que sua operação <GradientTitle>recebe na prática</GradientTitle>
              </h2>
              <p className="text-white/70 max-w-2xl mx-auto">
                Entregáveis claros: evidência, histórico, alertas e relatórios — sem “dashboard arco-íris”.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: "📈",
                  title: "Painel operacional ao vivo",
                  bullets: [
                    "Visão por loja e consolidada",
                    "KPIs em destaque (ociosidade, fila, fluxo)",
                    "Comparativo por turno/horário",
                  ],
                  tag: "AO VIVO",
                },
                {
                  icon: "📋",
                  title: "Histórico auditável de eventos",
                  bullets: [
                    "Linha do tempo por loja e período",
                    "Filtros e exportação",
                    "Evidência para decisões e alinhamento com líderes",
                  ],
                  tag: "RASTREÁVEL",
                },
                {
                  icon: "📊",
                  title: "Relatórios automáticos",
                  bullets: [
                    "Diário/semanal/mensal",
                    "Comparativos entre períodos",
                    "Envio para gestores",
                  ],
                  tag: "AGENDADO",
                },
                {
                  icon: "🚨",
                  title: "Alertas configuráveis",
                  bullets: [
                    "Fila/espera acima do limite",
                    "Ociosidade crítica por faixa",
                    "dashboard,email, whatsapp",
                  ],
                  tag: "AÇÃO",
                },
                {
                  icon: "🎥",
                  title: "Evidências com dados",
                  bullets: [
                    "Relatórios Operacionais",
                    "Contexto antes/depois do evento",
                    "Base para reuniões e correções",
                  ],
                  tag: "PROVA",
                },
                {
                  icon: "🧠",
                  title: "Insights inteligentes",
                  bullets: [
                    "Recomendação de escala por horário",
                    "Oportunidades por fluxo e layout",
                    "Riscos e padrões recorrentes",
                  ],
                  tag: "DECISÃO",
                },
              ].map((c, i) => (
                <div
                  key={i}
                  className="dv-card rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <div className="text-xl">{c.icon}</div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white/90">{c.title}</h3>
                      <div className="mt-1 text-xs text-white/60">
                        <GradientTitle>{c.tag}</GradientTitle>
                      </div>
                    </div>
                  </div>

                  <ul className="space-y-3">
                    {c.bullets.map((b, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-white/70">
                        <div className="text-cyan-300 mt-1">•</div>
                        <span className="text-sm">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <BrandButton  href="/agendar-demo">
                Quero esses entregáveis na minha operação →
              </BrandButton>
              <p className="mt-4 text-sm text-white/60">
                Implementação guiada • Compatível com câmeras atuais
              </p>
            </div>
          </div>
        </section>

        <div className="dv-divider my-6" />

        {/* COMO FUNCIONA (mantém seu bloco único) */}
        <section className="py-10">
          <div data-reveal className="dv-reveal">
            <h2 className="text-2xl font-bold text-center">
              De evidência a decisão em <GradientTitle>3 passos</GradientTitle>
            </h2>

            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Conecte suas câmeras",
                  desc: "Intelbras/CFTV via RTSP. Sem troca e sem parar operação.",
                  highlight: "Setup guiado",
                },
                {
                  step: "2",
                  title: "Capture 72h de operação real",
                  desc: "Métricas por turno: ociosidade, filas, fluxo e eventos.",
                  highlight: "Sem achismo",
                },
                {
                  step: "3",
                  title: "Receba relatório + alertas",
                  desc: "Dashboard, evidências e recomendações práticas + alertas.",
                  highlight: "Ações imediatas",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="dv-card rounded-3xl border border-white/10 bg-white/5 p-6 relative hover:border-white/20 transition-all"
                >
                  <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500 flex items-center justify-center text-black font-bold">
                    {item.step}
                  </div>
                  <div className="text-lg font-bold mt-4 text-white/90">{item.title}</div>
                  <div className="mt-3 text-sm text-white/70">{item.desc}</div>
                  <div className="mt-4 text-xs font-medium">
                    <GradientTitle>{item.highlight}</GradientTitle>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <BrandButton  href="/agendar-demo">
                👉 Começar meu teste 72h agora
              </BrandButton>
              <p className="mt-3 text-sm text-white/60">
                Sem trocar câmeras • Sem cartão • Sem fidelidade
              </p>
            </div>
          </div>
        </section>

        <div className="dv-divider my-6" />

        {/* PROVA SOCIAL (mantida, só reduzindo gradiente de fundo) */}
        <section className="py-10">
          <div data-reveal className="dv-reveal">
            <h2 className="text-2xl font-bold text-center">
              O que multilojistas <GradientTitle>descobriram na prática</GradientTitle>
            </h2>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {[
                {
                  icon: "🏪",
                  text:
                    "“Eu olhava câmeras 20x por dia e ainda assim não tinha prova objetiva. Agora mostro gráficos na reunião e todos entendem onde melhorar.”",
                  who: "Rede de Farmácias",
                  meta: "8 lojas • 32 câmeras",
                  badge: "−R$4.800/mês",
                },
                {
                  icon: "👔",
                  text:
                    "“No turno da tarde tínhamos muita ociosidade. Reorganizamos a escala para o pico e o atendimento melhorou sem custo adicional.”",
                  who: "Lojas de Moda",
                  meta: "5 lojas • 25 câmeras",
                  badge: "+18% conversão",
                },
              ].map((t, i) => (
                <div key={i} className="dv-card rounded-3xl border border-white/10 bg-white/5 p-6 hover:border-white/20 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{t.icon}</div>
                    <div>
                      <p className="text-sm text-white/80 leading-relaxed">{t.text}</p>
                      <div className="mt-4 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-white/90">{t.who}</div>
                          <div className="text-xs text-white/60">{t.meta}</div>
                        </div>
                        <div className="text-xs bg-white/5 border border-white/10 px-3 py-1 rounded-full text-white/80">
                          {t.badge}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="dv-divider my-6" />

        {/* FAQ (ordenada + hover/click stateful) */}
        <section id="faq" className="py-10">
          <div data-reveal className="dv-reveal">
            <h2 className="text-2xl font-bold text-center mb-4">Perguntas Frequentes</h2>
            <div className="text-sm text-white/60 text-center mb-10">
              Passe o mouse para abrir (desktop) ou toque para abrir (mobile).
            </div>

            <div className="max-w-3xl mx-auto space-y-4">
              {faqs.map((it, i) => (
                <FaqItem
                  key={i}
                  q={it.q}
                  a={it.a}
                  icon={it.icon}
                  isOpen={openFaqIndex === i}
                  onToggle={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                  onHoverOpen={() => setOpenFaqIndex(i)}
                  onHoverClose={() => setOpenFaqIndex((cur) => (cur === i ? null : cur))}
                />
              ))}
            </div>
          </div>
        </section>

        <div className="dv-divider my-6" />

        {/* CTA FINAL (mantém gradiente marca, sem dupla camada confusa) */}
        <section className="py-12">
          <div
            data-reveal
            className="dv-reveal rounded-[28px] border border-white/10 bg-white/5 p-8 text-center relative overflow-hidden"
          >
            <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-blue-400/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-56 h-56 rounded-full bg-purple-500/10 blur-3xl" />

            <h2 className="text-3xl font-extrabold relative z-10">
              Pare de pagar por horas que <GradientTitle>nunca foram trabalhadas</GradientTitle>
            </h2>

            <p className="mt-4 text-white/70 max-w-xl mx-auto relative z-10">
              Conectamos suas câmeras e em 72h você recebe um diagnóstico com evidências e recomendações.
            </p>

            <div className="mt-6 max-w-md mx-auto relative z-10">
              <div className="space-y-3 text-left">
                {[
                  "📊 Ociosidade por turno e loja",
                  "💰 Economia potencial na folha",
                  "👥 Atendimento em risco e filas",
                  "🎯 Escala ideal por horário",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-white/80">
                    <div className="text-cyan-300">✓</div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 relative z-10">
              <BrandButton  href="/agendar-demo" className="px-12 py-5">
                🎯 QUERO MEU RELATÓRIO GRÁTIS EM 72h
              </BrandButton>
              <p className="mt-4 text-sm text-white/60">
                <strong>Vagas limitadas esta semana</strong> • Sem cartão • Sem compromisso
              </p>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-white/10 py-10 text-sm text-white/60">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <img src={logo} alt="DaleVision" className="h-8 w-auto" />
                <div>
                  <div className="font-semibold">
                    <GradientTitle>DaleVision</GradientTitle>
                  </div>
                  <div className="text-xs text-white/40">Gestão inteligente para multilojistas</div>
                </div>
              </div>
              <div>© 2026 DaleVision. Smart Retail Surveillance </div>
            </div>

            <div className="flex flex-col sm:items-end gap-3">
              <div className="flex flex-wrap gap-4">
                <a className="hover:text-white" href={WHATSAPP_DEMO}>
                  Contato
                </a>
                <a className="hover:text-white" href="#faq">
                  Perguntas Frequentes
                </a>
                <Link className="hover:text-white" to="/terms">
                  Termos de Uso
                </Link>
                <Link className="hover:text-white" to="/privacy">
                  Política de Privacidade
                </Link>
              </div>
              <div className="text-xs text-white/40">LGPD • Criptografia • Governança</div>
            </div>
          </div>
        </footer>
      </main>

      {/* Mobile sticky CTA */}
      <div className="dv-sticky-cta sm:hidden">
        <a
          href="/agendar-demo"
          target="_blank"
          rel="noopener noreferrer"
          className="dv-cta block w-full rounded-2xl bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500 px-5 py-4 text-center font-bold text-black shadow-lg"
        >
          🚀 TESTE 72h GRÁTIS
        </a>
      </div>
    </div>
  )
}
