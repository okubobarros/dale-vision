import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { useAuth } from "../../contexts/useAuth"
import { Helmet } from "@vuer-ai/react-helmet-async"
import logo from "../../assets/logo.png"

const WHATSAPP_DEMO =
  "https://api.whatsapp.com/send/?phone=5511996918070&text=Olá! Quero agendar meu Plano de Recuperação de Margem e o teste de 72h da DaleVision.&type=phone_number&app_absent=0"

function GradientTitle({ children }: { children: ReactNode }) {
  return (
    <span className="bg-gradient-to-r from-emerald-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent animate-pulse">
      {children}
    </span>
  )
}

function BrandButton({
  children,
  href,
  className = "",
  variant = "primary",
  onClick,
}: {
  children: ReactNode
  href?: string
  className?: string
  variant?: "primary" | "secondary"
  onClick?: () => void
}) {
  const baseClass =
    "dv-cta inline-flex items-center justify-center rounded-2xl px-8 py-5 text-center font-black text-lg shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 "
  const variants = {
    primary:
      "bg-gradient-to-r from-emerald-500 to-blue-600 text-white hover:shadow-emerald-500/50 hover:shadow-2xl",
    secondary:
      "bg-white/10 text-white border-2 border-white/30 hover:bg-white/20 hover:border-white/50",
  }

  const Component = href ? "a" : "button"

  return (
    <Component
      {...(href ? { href, target: "_blank", rel: "noopener noreferrer" } : { onClick })}
      className={baseClass + variants[variant] + " " + className}
    >
      {children}
    </Component>
  )
}

function LiveDetectionSimulator() {
  const [detections, setDetections] = useState<
    Array<{ id: string; x: number; y: number; label: string; color: "emerald" | "yellow" | "red" }>
  >([])
  const [alerts, setAlerts] = useState<Array<{ id: string; type: string; message: string; time: number }>>([])

  useEffect(() => {
    const detectionInterval = setInterval(() => {
      const newDetection = {
        id: Math.random().toString(),
        x: Math.random() * 80 + 10,
        y: Math.random() * 70 + 10,
        label: ["Pessoa", "Fila", "Celular"][Math.floor(Math.random() * 3)],
        color: ["emerald", "yellow", "red"][Math.floor(Math.random() * 3)] as "emerald" | "yellow" | "red",
      }
      setDetections((prev) => [...prev.slice(-5), newDetection])
    }, 2000)

    const alertInterval = setInterval(() => {
      const alertTypes = [
        { type: "queue", message: "⚠️ Fila Longa Detectada" },
        { type: "idle", message: "🔴 Ociosidade Crítica" },
        { type: "phone", message: "📱 Uso de Celular Detectado" },
      ]
      const randomAlert = alertTypes[Math.floor(Math.random() * alertTypes.length)]
      const newAlert = {
        id: Math.random().toString(),
        ...randomAlert,
        time: Date.now(),
      }
      setAlerts((prev) => [...prev.slice(-3), newAlert])
    }, 3500)

    return () => {
      clearInterval(detectionInterval)
      clearInterval(alertInterval)
    }
  }, [])

  const colorMap = {
    emerald: "border-emerald-500 bg-emerald-500/10",
    yellow: "border-yellow-500 bg-yellow-500/10",
    red: "border-red-500 bg-red-500/10",
  }

  const labelMap = {
    emerald: "bg-emerald-600",
    yellow: "bg-yellow-600",
    red: "bg-red-600",
  }

  return (
    <div className="relative w-full aspect-video bg-slate-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center opacity-50">
          <div className="text-6xl mb-4">📹</div>
          <p className="text-white/40 font-bold">Câmera IP - Feed ao Vivo</p>
        </div>
      </div>

      {detections.map((detection) => (
        <div
          key={detection.id}
          className={`absolute border-2 rounded-lg transition-all duration-500 ${colorMap[detection.color]}`}
          style={{
            left: `${detection.x}%`,
            top: `${detection.y}%`,
            width: "120px",
            height: "100px",
            animation: "pulse 1s infinite",
          }}
        >
          <div className={`text-xs font-black px-2 py-1 rounded ${labelMap[detection.color]} text-white absolute -top-6`}>
            {detection.label}
          </div>
        </div>
      ))}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl p-3 animate-slide-in"
          >
            <div
              className={`w-2 h-2 rounded-full ${
                alert.type === "queue"
                  ? "bg-yellow-500"
                  : alert.type === "idle"
                  ? "bg-red-500"
                  : "bg-orange-500"
              } animate-pulse`}
            />
            <span className="text-sm font-bold text-white">{alert.message}</span>
            <span className="text-xs text-white/40 ml-auto">Agora</span>
          </div>
        ))}
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600/80 text-white text-xs font-black px-3 py-2 rounded-full animate-pulse">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        REC
      </div>
    </div>
  )
}

function SegmentCarousel() {
  const [activeSegment, setActiveSegment] = useState(0)

  const segments = [
    {
      icon: "🍦",
      name: "Gelatarias & Cafés",
      pain: "Filas longas = Clientes indo embora",
      metric: "+12% conversão",
      description: "Otimize o tempo de fila e aumente o giro de mesa com alertas em tempo real.",
      color: "from-pink-500 to-rose-600",
    },
    {
      icon: "👗",
      name: "Lojas de Moda",
      pain: "Funcionários ociosos = Vendas perdidas",
      metric: "-30% ociosidade",
      description: "Meça a produtividade real de cada vendedor e identifique os melhores.",
      color: "from-purple-500 to-pink-600",
    },
    {
      icon: "💊",
      name: "Farmácias",
      pain: "Ruptura de gôndola = Cliente vai pra concorrência",
      metric: "+8% receita",
      description: "Detecte prateleiras vazias e receba alertas para reposição imediata.",
      color: "from-blue-500 to-cyan-600",
    },
    {
      icon: "🛒",
      name: "Supermercados",
      pain: "Frente de caixa caótica = Experiência ruim",
      metric: "-25% tempo espera",
      description: "Controle filas, otimize caixas abertos e melhore a experiência do cliente.",
      color: "from-emerald-500 to-teal-600",
    },
  ]

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeSegment * 100}%)` }}
        >
          {segments.map((segment, idx) => (
            <div key={idx} className="min-w-full px-6">
              <div
                className={`bg-gradient-to-br ${segment.color} rounded-3xl p-12 text-white shadow-2xl border border-white/10 transform transition-all duration-500 hover:scale-105`}
              >
                <div className="text-7xl mb-6">{segment.icon}</div>
                <h3 className="text-4xl font-black mb-4">{segment.name}</h3>
                <div className="mb-6 space-y-3">
                  <div className="text-lg font-bold opacity-90">{segment.pain}</div>
                  <div className="inline-block bg-white/20 px-4 py-2 rounded-full font-black text-sm">
                    {segment.metric}
                  </div>
                </div>
                <p className="text-lg opacity-80 leading-relaxed">{segment.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        {segments.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveSegment(idx)}
            className={`transition-all duration-300 rounded-full ${
              activeSegment === idx ? "bg-emerald-500 w-8 h-3" : "bg-white/20 w-3 h-3 hover:bg-white/40"
            }`}
            aria-label={`Segmento ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

export default function HomePage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    if (isAuthenticated) navigate("/app/dashboard")
  }, [isAuthenticated, navigate])

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "DaleVision | Inteligência Operacional para Varejo Multilojas",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Transforme suas câmeras em olhos que geram lucro. Reduza ociosidade de RH, filas e perdas com IA. Agende seu Plano de Recuperação de Margem.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
      description: "Diagnóstico Operacional de 72h Gratuito",
    },
  }

  return (
    <div className="min-h-screen bg-[#0B0F14] text-white font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      <Helmet>
        <title>DaleVision | Gestão Multilojas e Inteligência Operacional com IA</title>
        <meta
          name="description"
          content="Sua loja está aberta, mas seus funcionários estão trabalhando? Recupere até 15% da sua margem ociosa com IA. Agende sua demo."
        />
        <meta
          name="keywords"
          content="gestão varejo multilojas, redução ociosidade varejo, IA câmeras, controle filas varejo, software franqueados, monitoramento operacional lojas"
        />
        <link rel="canonical" href="https://dalevision.com/" />
        <meta property="og:title" content="DaleVision | Recupere sua Margem Operacional com IA" />
        <meta
          property="og:description"
          content="Transforme câmeras em decisões: ociosidade, filas e fluxo. Agende seu Plano de Recuperação de Margem agora."
        />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <style>{`
          @keyframes slide-in {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          .animate-slide-in {
            animation: slide-in 0.3s ease-out;
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
        `}</style>
      </Helmet>

      <div className="fixed inset-0 dv-grid opacity-20 pointer-events-none" />
      <div className="fixed inset-0 dv-spotlight pointer-events-none" />

      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0B0F14]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="DaleVision" className="h-10 w-auto" />
            <span className="text-xl font-black tracking-tighter uppercase italic">
              <GradientTitle>DaleVision</GradientTitle>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-white/60 uppercase tracking-widest">
            <a href="#visao" className="hover:text-white transition-colors">
              A Solução
            </a>
            <a href="#segmentos" className="hover:text-white transition-colors">
              Segmentos
            </a>
            <a href="#impacto" className="hover:text-white transition-colors">
              Impacto
            </a>
          </div>
          <BrandButton href={WHATSAPP_DEMO} className="px-6 py-3 text-sm" variant="secondary">
            Agendar Demo
          </BrandButton>
        </div>
      </header>

      <section className="relative pt-32 pb-40 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ transform: `translateY(${scrollY * 0.5}px)` }} />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 mb-8 text-emerald-400 font-bold text-xs uppercase tracking-widest animate-pulse">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            IA Operacional para Multilojistas
          </div>

          <h1 className="text-6xl lg:text-8xl font-black mb-8 leading-[1.1] tracking-tight" style={{ opacity: 1 - scrollY / 500 }}>
            Sua loja está aberta, mas seus funcionários estão{" "}
            <span className="text-emerald-400 italic animate-pulse">trabalhando?</span>
          </h1>

          <p className="text-xl lg:text-2xl text-white/60 max-w-3xl mx-auto mb-12 leading-relaxed">
            Pare de gerir por intuição. Transforme suas câmeras em olhos que nunca piscam e recupere até{" "}
            <span className="text-white font-bold">15% da sua margem ociosa</span> em 30 dias.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <BrandButton href={WHATSAPP_DEMO}>Quero meu Plano de Recuperação →</BrandButton>
            <div className="text-sm font-bold text-white/40 uppercase tracking-widest animate-float">
              ⏱️ Diagnóstico 72h Gratuito
            </div>
          </div>
        </div>
      </section>

      <section id="visao" className="py-24 px-6 bg-white/5 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl lg:text-7xl font-black mb-6 leading-tight">
              Veja em <span className="text-emerald-400">Tempo Real</span> o que acontece na sua loja.
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Detecção automática de filas, ociosidade e comportamentos críticos. Alertas instantâneos no seu WhatsApp.
            </p>
          </div>
          <LiveDetectionSimulator />
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl lg:text-6xl font-black mb-16 text-center leading-tight">
            O que você <span className="text-red-500">acha</span> que acontece vs. A Realidade.
          </h2>

          <div className="grid lg:grid-cols-2 gap-12">
            {[
              { q: "Você acha que sua equipe está atendendo...", a: "Mas eles estão no celular nos pontos cegos.", icon: "📱" },
              { q: "Você acha que a fila está sob controle...", a: "Mas 15% dos clientes desistem antes de chegar ao caixa.", icon: "😤" },
              { q: "Você acha que sabe quem são seus melhores líderes...", a: "Mas não tem dados para provar quem realmente entrega resultado.", icon: "📊" },
              { q: "Você acha que está maximizando a loja...", a: "Mas há 3 horas por dia onde a equipe está ociosa e invisível.", icon: "👁️" },
            ].map((item, i) => (
              <div
                key={i}
                className="group p-8 bg-white/5 rounded-3xl border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all duration-300 transform hover:scale-105"
              >
                <div className="text-5xl mb-6">{item.icon}</div>
                <div className="text-sm font-bold text-white/40 uppercase mb-3 group-hover:text-emerald-400 transition-colors">
                  {item.q}
                </div>
                <div className="text-2xl font-black text-emerald-400">{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="segmentos" className="py-32 px-6 bg-white/5 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl lg:text-7xl font-black mb-6 leading-tight">
              Cada segmento tem uma <span className="text-emerald-400">dor diferente</span>.
            </h2>
            <p className="text-xl text-white/60">Nós temos a solução para cada uma.</p>
          </div>
          <SegmentCarousel />
        </div>
      </section>

      <section id="impacto" className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl lg:text-6xl font-black mb-16 text-center leading-tight">
            O varejo físico não perdoa a ineficiência. <br />
            <span className="text-emerald-400">Sua concorrência já está vendo o que você ignora.</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              { metric: "-30%", label: "Redução de Ociosidade", desc: "Média em redes de moda no 1º mês" },
              { metric: "+12%", label: "Conversão de Vendas", desc: "Otimização de frente de caixa" },
              { metric: "72h", label: "Tempo de Diagnóstico", desc: "Quando você descobre onde vazava dinheiro" },
            ].map((item, i) => (
              <div
                key={i}
                className="p-8 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 rounded-3xl border border-emerald-500/30 hover:border-emerald-500/70 transition-all duration-300 transform hover:scale-105"
              >
                <div className="text-5xl font-black text-emerald-400 mb-4">{item.metric}</div>
                <div className="text-sm font-bold uppercase tracking-widest text-white/60 mb-2">{item.label}</div>
                <p className="text-sm text-white/40 italic">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-3xl p-12 text-center">
            <p className="text-2xl font-black text-white mb-4">
              ⚠️ Vagas limitadas para diagnósticos gratuitos este mês.
            </p>
            <p className="text-lg text-white/60">
              Cada dia sem visibilidade operacional é um dia de margem que você não recupera.
            </p>
          </div>
        </div>
      </section>

      <section className="py-32 px-6 bg-gradient-to-b from-transparent to-emerald-900/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl lg:text-7xl font-black mb-10 leading-tight">Não perca mais um dia de lucro.</h2>
          <p className="text-xl text-white/60 mb-12">
            Agende agora seu <span className="text-white font-bold">Plano de Recuperação de Margem</span>. Nossos
            especialistas vão analisar sua operação e entregar um diagnóstico real em 72h.
          </p>
          <div className="flex flex-col items-center gap-6">
            <BrandButton href={WHATSAPP_DEMO} className="px-12 py-8 text-2xl">
              Agendar Diagnóstico Gratuito →
            </BrandButton>
            <p className="text-sm font-bold text-white/30 uppercase tracking-widest">
              Responderemos em até 2 horas
            </p>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-white/5 text-center text-white/20 text-xs font-bold uppercase tracking-[0.2em]">
        © 2026 DaleVision IA. Todos os direitos reservados. Eyes Everywhere.
      </footer>
    </div>
  )
}
