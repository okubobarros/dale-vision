import { useAuth } from "../../contexts/useAuth"

export default function ProfilePage() {
  const { user } = useAuth()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-600">Dados da sua conta e preferências</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-white p-5">
          <div className="text-sm text-gray-500">Nome</div>
          <div className="mt-1 font-semibold text-gray-900">
            {user?.first_name || user?.username || "-"}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <div className="text-sm text-gray-500">Email</div>
          <div className="mt-1 font-semibold text-gray-900">
            {user?.email || "-"}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 sm:col-span-2">
          <div className="text-sm text-gray-500">Plano</div>
          <div className="mt-1 font-semibold text-gray-900">Trial</div>
          <div className="mt-2 text-sm text-gray-600">
            Em breve: gerenciar plano, cobrança e usuários.
          </div>
        </div>
      </div>
    </div>
  )
}
