import { Link } from "react-router-dom"
import { Helmet } from "react-helmet-async"
import logo from "../../assets/logo.png"

const Terms = () => {
  return (
    <div className="min-h-screen bg-[#0B0F14] text-white relative overflow-hidden">
      <Helmet>
        <title>DaleVision – Termos de Uso</title>
        <meta
          name="description"
          content="Termos e Condições de Uso da plataforma DaleVision."
        />
        <link rel="canonical" href="https://app.dalevision.com/terms" />
        <meta property="og:title" content="DaleVision – Termos de Uso" />
        <meta
          property="og:description"
          content="Termos e Condições de Uso da plataforma DaleVision."
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
              <div className="text-[11px] text-white/60">Termos de Uso</div>
            </div>
          </Link>
          <div className="flex items-center gap-3 text-xs text-white/70">
            <Link to="/privacy" className="hover:text-white">
              Privacidade
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
              Termos de Uso
            </p>
            <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold">
              TERMOS DE USO – DALE VISION
            </h1>
            <p className="mt-2 text-white/70">DaleVision – Termos e Condições de Uso</p>
            <p className="mt-3 text-xs text-white/60">
              Última atualização: 11 de fevereiro de 2026
            </p>
          </div>

          <div className="space-y-8 text-white/80 leading-relaxed">
            <section>
              <h2 className="text-lg font-bold text-white">1. Sobre a DaleVision</h2>
              <p className="mt-3">
                A DaleVision é uma plataforma SaaS de inteligência operacional para
                varejo, que utiliza visão computacional e análise de dados para gerar:
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Monitoramento operacional</li>
                <li>Métricas de conversão e fluxo</li>
                <li>Alertas em tempo real</li>
                <li>Relatórios executivos</li>
                <li>Automação com IA</li>
              </ul>
              <p className="mt-3 text-sm">
                O uso da plataforma implica aceitação integral destes Termos.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white">2. Objeto</h2>
              <p className="mt-3">
                A DALE VISION fornece solução tecnológica de análise de vídeo baseada
                em inteligência artificial para fins de:
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Monitoramento operacional</li>
                <li>Geração de métricas</li>
                <li>Alertas operacionais</li>
                <li>Auditoria interna</li>
                <li>Loss prevention</li>
                <li>Gestão remota de operações</li>
              </ul>
              <p className="mt-3 text-sm">
                A DALE VISION não é empresa de segurança privada, não realiza vigilância
                humana, não substitui compliance jurídico, nem atua como controladora de
                dados dos colaboradores do Cliente.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white">3. Natureza da Plataforma</h2>
              <p className="mt-3">
                A DALE VISION:
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Processa dados capturados pelas câmeras do Cliente</li>
                <li>Opera exclusivamente como operadora de dados nos termos da LGPD</li>
                <li>Não controla a instalação das câmeras</li>
                <li>Não determina as finalidades do monitoramento</li>
              </ul>
              <p className="mt-3 text-sm">
                O Cliente é o único e exclusivo Controlador dos dados pessoais captados.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white">4. Responsabilidade Integral do Cliente</h2>
              <p className="mt-3">O Cliente declara e garante que:</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Possui base legal para monitoramento por câmeras</li>
                <li>Informou previamente colaboradores e terceiros</li>
                <li>Incluiu cláusula contratual autorizando monitoramento</li>
                <li>Respeita a legislação trabalhista e sindical</li>
                <li>Possui sinalização adequada nas dependências</li>
                <li>Não utiliza a plataforma para discriminação ou perseguição</li>
              </ul>
              <p className="mt-3 text-sm">
                A DALE VISION não assume qualquer responsabilidade por:
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Reclamações trabalhistas</li>
                <li>Danos morais por monitoramento</li>
                <li>Uso indevido das imagens</li>
                <li>Interpretação equivocada de relatórios</li>
                <li>Decisões disciplinares tomadas com base na plataforma</li>
              </ul>
              <p className="mt-3 text-sm">
                Toda decisão disciplinar é de responsabilidade exclusiva do Cliente.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white">5. Identificação Individual</h2>
              <p className="mt-3">A plataforma pode:</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Gerar eventos vinculados a colaboradores cadastrados</li>
                <li>Associar eventos a uniformes ou padrões visuais</li>
                <li>Produzir métricas individuais quando configurado</li>
              </ul>
              <p className="mt-3 text-sm">O Cliente é integralmente responsável por:</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Informar colaboradores</li>
                <li>Incluir cláusulas contratuais específicas</li>
                <li>Obter consentimentos quando exigido</li>
                <li>Garantir base legal adequada</li>
              </ul>
              <p className="mt-3 text-sm">
                A DALE VISION não valida políticas internas do Cliente.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white">6. Limitação Absoluta de Responsabilidade</h2>
              <p className="mt-3">A responsabilidade da DALE VISION:</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Está limitada ao valor pago pelo Cliente nos últimos 12 meses</li>
                <li>Não inclui danos indiretos</li>
                <li>Não inclui danos morais</li>
                <li>Não inclui lucros cessantes</li>
                <li>Não inclui condenações trabalhistas</li>
                <li>Não inclui autuações da LGPD</li>
              </ul>
              <p className="mt-3 text-sm">Em nenhuma hipótese a DALE VISION responderá por:</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Uso indevido pelo Cliente</li>
                <li>Configuração incorreta</li>
                <li>Falhas de infraestrutura local</li>
                <li>Instalação inadequada das câmeras</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white">7. Trial (72 horas)</h2>
              <p className="mt-3">O período de Trial:</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Inicia na criação da primeira loja</li>
                <li>Dura 72 horas corridas</li>
                <li>Pode ser interrompido a qualquer momento</li>
              </ul>
              <p className="mt-3 text-sm">Ao final:</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>A loja é automaticamente bloqueada</li>
                <li>Relatório executivo poderá ser disponibilizado</li>
                <li>O acesso completo exige contratação de plano</li>
              </ul>
              <p className="mt-3 text-sm">
                A DALE VISION não garante disponibilidade contínua durante o trial.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white">8. Suspensão e Bloqueio</h2>
              <p className="mt-3">
                A DALE VISION poderá suspender o acesso imediatamente em caso de:
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Uso ilegal</li>
                <li>Violação trabalhista evidente</li>
                <li>Descumprimento da LGPD</li>
                <li>Ameaça à integridade da plataforma</li>
              </ul>
              <p className="mt-3 text-sm">
                Sem necessidade de aviso prévio.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white">9. Foro</h2>
              <p className="mt-3">
                Fica eleito o foro da comarca de [CIDADE], com renúncia a qualquer outro.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Terms
