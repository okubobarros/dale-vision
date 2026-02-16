import { Link } from "react-router-dom"
import { Helmet } from "@vuer-ai/react-helmet-async"
import logo from "../../assets/logo.png"

const Privacy = () => {
  return (
    <div className="min-h-screen bg-[#0B0F14] text-white relative overflow-hidden">
      <Helmet>
        <title>DaleVision – Política de Privacidade</title>
        <meta
          name="description"
          content="Política de Privacidade da DaleVision. Diretrizes de tratamento de dados e conformidade com a LGPD."
        />
        <link rel="canonical" href="https://app.dalevision.com/privacy" />
        <meta property="og:title" content="DaleVision – Política de Privacidade" />
        <meta
          property="og:description"
          content="Diretrizes de tratamento de dados e conformidade com a LGPD."
        />
        <meta property="og:type" content="article" />
        <meta property="og:locale" content="pt_BR" />
      </Helmet>

      <div className="absolute inset-0 dv-grid opacity-40" />
      <div className="absolute inset-0 dv-spotlight" />
      <div className="absolute inset-0 dv-noise" />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0F14]/85 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="DaleVision" className="h-9 w-auto" />
            <div>
              <div className="text-sm font-semibold">DaleVision</div>
              <div className="text-[11px] text-white/60">Política de Privacidade</div>
            </div>
          </Link>
          <div className="flex items-center gap-3 text-xs text-white/70">
            <Link to="/terms" className="hover:text-white">
              Termos
            </Link>
            <Link to="/login" className="hover:text-white">
              Login
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 relative z-10">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 sm:p-10 shadow-2xl">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">
              Política de Privacidade
            </p>
            <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold">
              POLÍTICA DE PRIVACIDADE – DALE VISION
            </h1>
            <p className="mt-2 text-white/70">DaleVision – Política de Privacidade</p>
            <p className="mt-3 text-xs text-white/60">
              Última atualização: 11 de fevereiro de 2026
            </p>
          </div>

          <div className="space-y-8 text-white/80 leading-relaxed">
            <section>
              <h2 className="text-lg font-bold text-white">1. Introdução</h2>
              <p className="mt-3">
                A DaleVision respeita a sua privacidade e cumpre a LGPD (Lei Geral
                de Proteção de Dados – Lei nº 13.709/2018).
              </p>
              <div className="mt-3 space-y-2 text-sm">
                <p><strong>Cliente:</strong> Controlador</p>
                <p><strong>DALE VISION:</strong> Operadora</p>
                <p>A DALE VISION processa dados exclusivamente sob instrução do Cliente.</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white">2. Dados Tratados</h2>
              <p className="mt-3">Podem ser processados:</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Imagens captadas por câmeras</li>
                <li>Metadados de movimentação</li>
                <li>Eventos operacionais</li>
                <li>Identificação funcional de colaboradores (quando configurado)</li>
              </ul>
              <p className="mt-3 text-sm">
                A DALE VISION não realiza reconhecimento facial biométrico por padrão.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white">3. Responsabilidade do Cliente</h2>
              <p className="mt-3">O Cliente é responsável por:</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Base legal</li>
                <li>Comunicação aos colaboradores</li>
                <li>Política interna de monitoramento</li>
                <li>Atendimento a titulares</li>
              </ul>
              <p className="mt-3 text-sm">
                A DALE VISION não responde por descumprimentos legais do Cliente.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white">4. Segurança</h2>
              <p className="mt-3">
                São aplicadas medidas técnicas e organizacionais adequadas, incluindo:
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Criptografia</li>
                <li>Controle de acesso</li>
                <li>Logs de auditoria</li>
                <li>Segregação por organização</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white">5. Retenção</h2>
              <p className="mt-3">
                Os dados são mantidos conforme:
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Configuração do Cliente</li>
                <li>Exigências legais</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white">6. Exclusão</h2>
              <p className="mt-3">
                O Cliente pode solicitar exclusão dos dados ao término do contrato.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white">
                Adendo Específico – Monitoramento de Colaboradores
              </h2>
              <p className="mt-3">O Cliente declara que:</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Incluiu cláusula expressa no contrato de trabalho autorizando monitoramento</li>
                <li>Informou a finalidade (segurança, auditoria, produtividade)</li>
                <li>Obteve ciência inequívoca do colaborador</li>
              </ul>
              <p className="mt-3 text-sm">A DALE VISION não se responsabiliza por:</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Alegações de vigilância abusiva</li>
                <li>Reclamações por dano moral</li>
                <li>Processos trabalhistas</li>
              </ul>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Privacy
