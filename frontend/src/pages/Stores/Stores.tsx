// src/pages/Stores/Stores.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  storesService,
  type Store,
  type CreateStorePayload,
  type UpdateStorePayload,
  type StoreStatus,
  type StoreEdgeStatus,
} from '../../services/stores';
import toast from 'react-hot-toast';

const STATUS_OPTIONS: Array<{ value: StoreStatus; label: string }> = [
  { value: 'active', label: 'Ativa' },
  { value: 'inactive', label: 'Inativa' },
  { value: 'trial', label: 'Trial' },
  { value: 'blocked', label: 'Bloqueada' },
];

const ONLINE_MAX_AGE_SEC = 120;

const isRecent = (iso?: string | null, maxAgeSec = ONLINE_MAX_AGE_SEC) => {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const diffSec = (Date.now() - date.getTime()) / 1000;
  return diffSec >= 0 && diffSec <= maxAgeSec;
};

const formatRelativeTime = (iso?: string | null) => {
  if (!iso) return 'Nunca';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 10) return 'agora';
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  if (diffSec < 60) return rtf.format(-diffSec, 'second');
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return rtf.format(-diffMin, 'minute');
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return rtf.format(-diffHour, 'hour');
  const diffDay = Math.floor(diffHour / 24);
  return rtf.format(-diffDay, 'day');
};

const getLastSeenAt = (status?: StoreEdgeStatus | null) =>
  status?.last_seen_at || status?.last_heartbeat_at || status?.last_heartbeat || null;

const formatTimestampFull = (iso?: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR');
};

const formatLastSeenDisplay = (iso?: string | null) => {
  if (!iso) return 'Nunca';
  return formatRelativeTime(iso);
};

const DEMO_URL = 'https://app.dalevision.com/agendar-demo';
const WHATSAPP_URL = `https://wa.me/?text=${encodeURIComponent(
  'Olá! Quero fazer upgrade do meu trial do Dale Vision.'
)}`;

type PaywallState = {
  open: boolean;
  title: string;
  message: string;
};

const PaywallModal = ({ state, onClose }: { state: PaywallState; onClose: () => void }) => {
  if (!state.open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{state.title}</h3>
            <p className="text-sm text-gray-600 mt-2">{state.message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Fechar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <a
            href={DEMO_URL}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            target="_blank"
            rel="noreferrer"
          >
            Agendar demonstração
          </a>
          <a
            href={WHATSAPP_URL}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            target="_blank"
            rel="noreferrer"
          >
            Falar no WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};

// =======================
// Create Store Modal
// =======================
const CreateStoreModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [paywall, setPaywall] = useState<PaywallState>({
    open: false,
    title: '',
    message: '',
  });
  const [formData, setFormData] = useState<CreateStorePayload>({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    status: 'active',
  });

  const createMutation = useMutation({
    mutationFn: storesService.createStore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Loja criada com sucesso!');
      onClose();
      setFormData({
        name: '',
        description: '',
        address: '',
        city: '',
        state: '',
        status: 'active',
      });
    },
    onError: (error: unknown) => {
      const payload = (error as { response?: { data?: { code?: string } } })?.response?.data;
      if (payload?.code === 'TRIAL_EXPIRED' || payload?.code === 'SUBSCRIPTION_REQUIRED') {
        toast.custom((t) => (
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
            <div className="text-sm text-gray-700">
              Trial expirado. Assine para continuar.
            </div>
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              onClick={() => {
                toast.dismiss(t.id);
                navigate('/app/upgrade');
              }}
            >
              Ver planos
            </button>
          </div>
        ));
        return;
      }
      if (payload?.code === 'PAYWALL_TRIAL_LIMIT') {
        setPaywall({
          open: true,
          title: 'Disponível no plano Pro',
          message: 'Seu trial permite 1 loja. Fale com nosso time para liberar mais lojas.',
        });
        return;
      }

      toast.error('Erro ao criar loja. Tente novamente.');
      console.error('Create store error:', error);
    },
  });

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Nova Loja</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Fechar modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(formData);
          }}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Loja *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Loja Centro"
                  disabled={createMutation.isPending}
                  aria-label="Nome da loja"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Descreva sua loja..."
                  disabled={createMutation.isPending}
                  aria-label="Descrição da loja"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="São Paulo"
                    disabled={createMutation.isPending}
                    aria-label="Cidade"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="SP"
                    maxLength={2}
                    disabled={createMutation.isPending}
                    aria-label="Estado"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    status: e.target.value as StoreStatus
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={createMutation.isPending}
                  aria-label="Status da loja"
                  title="Selecione o status da loja"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={createMutation.isPending}
                aria-label="Cancelar criação de loja"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                aria-label={createMutation.isPending ? "Criando loja..." : "Criar loja"}
              >
                {createMutation.isPending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Criando...
                  </>
                ) : (
                  'Criar Loja'
                )}
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>
      <PaywallModal
        state={paywall}
        onClose={() => setPaywall({ open: false, title: '', message: '' })}
      />
    </>
  );
};

// =======================
// Edit Store Modal
// =======================
const EditStoreModal = ({ 
  store, 
  isOpen, 
  onClose 
}: { 
  store: Store | null; 
  isOpen: boolean; 
  onClose: () => void 
}) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<UpdateStorePayload>(() => ({
    name: store?.name || '',
    description: store?.description || '',
    address: store?.address || '',
    city: store?.city || '',
    state: store?.state || '',
    status: store?.status || 'active',
  }));

  const updateMutation = useMutation({
    mutationFn: ({ storeId, payload }: { storeId: string; payload: UpdateStorePayload }) =>
      storesService.updateStore(storeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Loja atualizada com sucesso!');
      onClose();
    },
    onError: (error: unknown) => {
      const payload = (error as { response?: { data?: { code?: string } } })?.response?.data;
      if (payload?.code === 'TRIAL_EXPIRED' || payload?.code === 'SUBSCRIPTION_REQUIRED') {
        toast.custom((t) => (
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
            <div className="text-sm text-gray-700">
              Trial expirado. Assine para continuar.
            </div>
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              onClick={() => {
                toast.dismiss(t.id);
                navigate('/app/upgrade');
              }}
            >
              Ver planos
            </button>
          </div>
        ));
        return;
      }
      toast.error('Erro ao atualizar loja. Tente novamente.');
      console.error('Update store error:', error);
    },
  });

  if (!isOpen || !store) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Editar Loja</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Fechar modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (store) {
              updateMutation.mutate({ storeId: store.id, payload: formData });
            }
          }}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Loja *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Loja Centro"
                  disabled={updateMutation.isPending}
                  aria-label="Nome da loja"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Descreva sua loja..."
                  disabled={updateMutation.isPending}
                  aria-label="Descrição da loja"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="São Paulo"
                    disabled={updateMutation.isPending}
                    aria-label="Cidade"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="SP"
                    maxLength={2}
                    disabled={updateMutation.isPending}
                    aria-label="Estado"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    status: e.target.value as StoreStatus
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={updateMutation.isPending}
                  aria-label="Status da loja"
                  title="Selecione o status da loja"
                >
                  <option value="active">Ativa</option>
                  <option value="inactive">Inativa</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={updateMutation.isPending}
                aria-label="Cancelar edição"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                aria-label={updateMutation.isPending ? "Atualizando loja..." : "Salvar alterações"}
              >
                {updateMutation.isPending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// =======================
// Store Card Component
// =======================
interface StoreCardProps {
  store: Store;
  onEdit: (store: Store) => void;
  trialExpired: boolean;
}

const StoreCard = ({ store, onEdit, trialExpired }: StoreCardProps) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showActions, setShowActions] = useState(false);
  const actionsDisabled =
    trialExpired ||
    (store.status === "blocked" && store.blocked_reason === "trial_expired");
  const storeLastSeenAt = store.last_seen_at ?? null;
  const shouldFetchEdgeStatus = !storeLastSeenAt;
  const { data: edgeStatus } = useQuery<StoreEdgeStatus>({
    queryKey: ['store-edge-status', store.id],
    queryFn: () => storesService.getStoreEdgeStatus(store.id),
    enabled: shouldFetchEdgeStatus,
    refetchInterval: 20000,
    refetchIntervalInBackground: true,
  });
  const lastSeenAt = storeLastSeenAt ?? getLastSeenAt(edgeStatus);
  const lastError = store.last_error ?? edgeStatus?.last_error ?? null;
  const edgeOnlineFromStatus =
    typeof edgeStatus?.online === 'boolean' ? edgeStatus.online : undefined;
  const isEdgeOnline =
    edgeOnlineFromStatus !== undefined
      ? edgeOnlineFromStatus
      : isRecent(lastSeenAt);
  const edgeStatusLabel = isEdgeOnline ? 'Online' : 'Offline';
  const edgeStatusClass = isEdgeOnline
    ? 'bg-green-100 text-green-800'
    : 'bg-gray-100 text-gray-800';
  const lastSeenTitle = formatTimestampFull(lastSeenAt);
  const storeStatusLabel =
    store.status === 'active'
      ? 'Ativa'
      : store.status === 'inactive'
      ? 'Inativa'
      : store.status === 'trial'
      ? 'Trial'
      : store.status === 'blocked'
      ? 'Bloqueada'
      : 'Inativa';
  const storeStatusClass =
    store.status === 'active'
      ? 'bg-green-100 text-green-800'
      : store.status === 'blocked'
      ? 'bg-red-100 text-red-800'
      : store.status === 'trial'
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-gray-100 text-gray-800';

  const deleteMutation = useMutation({
    mutationFn: () => storesService.deleteStore(store.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Loja excluída com sucesso!');
    },
    onError: (error: unknown) => {
      const payload = (error as { response?: { data?: { code?: string } } })?.response?.data;
      if (payload?.code === 'TRIAL_EXPIRED' || payload?.code === 'SUBSCRIPTION_REQUIRED') {
        toast.custom((t) => (
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
            <div className="text-sm text-gray-700">
              Trial expirado. Assine para continuar.
            </div>
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              onClick={() => {
                toast.dismiss(t.id);
                navigate('/app/upgrade');
              }}
            >
              Ver planos
            </button>
          </div>
        ));
        return;
      }
      toast.error('Erro ao excluir loja. Tente novamente.');
      console.error('Delete store error:', error);
    },
  });

  const handleDelete = () => {
    if (window.confirm(`Tem certeza que deseja excluir a loja "${store.name}"?`)) {
      deleteMutation.mutate();
    }
  };

  const handleEdit = () => {
    onEdit(store);
    setShowActions(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow relative">
      {/* Actions Dropdown */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setShowActions(!showActions)}
          className={`p-1 ${
            actionsDisabled
              ? "text-gray-300 cursor-not-allowed"
              : "text-gray-400 hover:text-gray-600"
          }`}
          aria-label="Ações da loja"
          title="Menu de ações"
          disabled={actionsDisabled}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
        
        {showActions && !actionsDisabled && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowActions(false)}
              aria-hidden="true"
            ></div>
            <div 
              className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[140px] z-20"
              role="menu"
              aria-label="Menu de ações da loja"
            >
              <button 
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={handleEdit}
                role="menuitem"
                aria-label="Editar loja"
              >
                Editar
              </button>
              <button 
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                role="menuitem"
                aria-label="Excluir loja"
              >
                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Store Info */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 pr-8">{store.name}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${storeStatusClass}`}
            aria-label={`Status: ${storeStatusLabel}`}
          >
            {storeStatusLabel}
          </span>
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${edgeStatusClass}`}
            aria-label={`Status do edge: ${edgeStatusLabel}`}
          >
            {edgeStatusLabel}
          </span>
        </div>
      </div>
{store.description && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{store.description}</p>
      )}
      
      <div className="space-y-2 text-sm">
        {store.city && store.state && (
          <div className="flex items-center text-gray-500">
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <span aria-label={`Localização: ${store.city}, ${store.state}`}>
              {store.city}, {store.state}
            </span>
          </div>
        )}
        
        <div className="flex items-center text-gray-500">
          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3a1 1 0 00.293.707l2 2a1 1 0 001.414-1.414L11 9.586V7z"
              clipRule="evenodd"
            />
          </svg>
          <span
            aria-label={`Última comunicação: ${formatLastSeenDisplay(lastSeenAt)}`}
            title={lastSeenTitle || undefined}
          >
            Última comunicação: {formatLastSeenDisplay(lastSeenAt)}
          </span>
        </div>

        {lastError && (
          <div className="flex items-center text-red-600">
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.721-1.36 3.486 0l6.518 11.59c.75 1.335-.214 3.011-1.743 3.011H3.482c-1.53 0-2.493-1.676-1.743-3.011l6.518-11.59zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-2a1 1 0 01-1-1V7a1 1 0 112 0v4a1 1 0 01-1 1z"
                clipRule="evenodd"
              />
            </svg>
            <span aria-label={`Erro: ${lastError}`}>Erro: {lastError}</span>
          </div>
        )}
        
        <div className="flex items-center text-gray-500">
          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          <span aria-label={`Criada em: ${new Date(store.created_at).toLocaleDateString('pt-BR')}`}>
            Criada em {new Date(store.created_at).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-100">
        <button 
          className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
          onClick={() => toast('Detalhes da loja em desenvolvimento', { icon: '🔧' })}
          aria-label="Ver detalhes da loja"
          title="Ver detalhes completos da loja"
        >
          Ver detalhes
        </button>
        {actionsDisabled && (
          <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
            Trial expirado. Para liberar edição ou exclusão, faça upgrade.
            <div className="mt-2">
              <button
                type="button"
                onClick={() => navigate("/app/upgrade")}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Assinar agora
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// =======================
// Stores Page Component
// =======================
const Stores = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [storeToEdit, setStoreToEdit] = useState<Store | null>(null);
  const navigate = useNavigate();
  
  const { data: stores, isLoading, error } = useQuery({
    queryKey: ['stores'],
    queryFn: storesService.getStores,
  });

  const handleEditStore = (store: Store) => {
    setStoreToEdit(store);
  };
  const trialExpired =
    (stores ?? []).some(
      (store) => store.status === "blocked" && store.blocked_reason === "trial_expired"
    );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse mb-4"></div>
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse mb-4"></div>
              <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <strong>Erro ao carregar lojas:</strong> {(error as Error).message}
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
          aria-label="Tentar carregar lojas novamente"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Lojas</h1>
          <p className="text-gray-600 mt-1">
            {stores?.length || 0} loja{stores?.length !== 1 ? 's' : ''} encontrada{stores?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button 
          onClick={() => {
            if (trialExpired) {
              navigate("/app/upgrade");
              return;
            }
            setIsCreateModalOpen(true);
          }}
          disabled={trialExpired}
          className={`px-4 py-2 rounded-lg font-medium flex items-center ${
            trialExpired
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
          aria-label="Criar nova loja"
          title="Abrir formulário para criar nova loja"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nova Loja
        </button>
      </div>
      {trialExpired && (
        <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
          Seu trial expirou. Faça upgrade para criar novas lojas e liberar edição.
          <div className="mt-3">
            <button
              type="button"
              onClick={() => navigate("/app/upgrade")}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Assinar agora
            </button>
          </div>
        </div>
      )}

      {stores && stores.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store: Store) => (
            <StoreCard 
              key={store.id} 
              store={store} 
              onEdit={handleEditStore}
              trialExpired={trialExpired}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-200">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Nenhuma loja encontrada</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-8">
            Você ainda não tem lojas cadastradas. Crie sua primeira loja para começar a monitorar com a DALE Vision.
          </p>
          <button 
            onClick={() => {
              if (trialExpired) {
                navigate("/app/upgrade");
                return;
              }
              setIsCreateModalOpen(true);
            }}
            disabled={trialExpired}
            className={`px-8 py-3 rounded-lg font-medium text-lg inline-flex items-center ${
              trialExpired
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
            aria-label="Criar primeira loja"
            title="Criar sua primeira loja"
          >
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Criar primeira loja
          </button>
        </div>
      )}

      {/* Create Store Modal */}
      <CreateStoreModal 
        isOpen={isCreateModalOpen && !trialExpired} 
        onClose={() => setIsCreateModalOpen(false)} 
      />

      {/* Edit Store Modal */}
      <EditStoreModal
        key={storeToEdit?.id ?? "empty"}
        store={storeToEdit}
        isOpen={!!storeToEdit}
        onClose={() => setStoreToEdit(null)}
      />
    </div>
  );
};

export default Stores;
