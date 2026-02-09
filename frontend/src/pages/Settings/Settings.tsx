import { useState } from "react"
import { Link } from "react-router-dom"
import EdgeSetupModal from "../../components/EdgeSetupModal"

const Settings = () => {
  const [edgeSetupOpen, setEdgeSetupOpen] = useState(false)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-800">Analytics</h2>
        <p className="text-sm text-gray-600 mt-1">
          Acesse a página de analytics no desktop.
        </p>
        <Link
          to="/app/analytics"
          className="mt-4 inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Ir para Analytics
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-800">Edge Setup</h2>
        <p className="text-sm text-gray-600 mt-1">
          Gere o .env do agente e valide conexão com a API.
        </p>
        <button
          type="button"
          onClick={() => setEdgeSetupOpen(true)}
          className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Abrir Edge Setup
        </button>
      </div>

      <EdgeSetupModal open={edgeSetupOpen} onClose={() => setEdgeSetupOpen(false)} />
    </div>
  )
}

export default Settings
