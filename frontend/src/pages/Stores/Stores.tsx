// src/pages/Stores/Stores.tsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  storesService,
  type Store,
  type CreateStorePayload,
  type UpdateStorePayload,
  type StoreStatus,
  type StorePlan,
} from '../../services/stores';
import toast from 'react-hot-toast';

const PLAN_LABELS: Record<StorePlan, string> = {
  trial: 'Trial',
  basic: 'Basic',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const STATUS_OPTIONS: Array<{ value: StoreStatus; label: string }> = [
  { value: 'active', label: 'Ativa' },
  { value: 'inactive', label: 'Inativa' },
  { value: 'maintenance', label: 'Manutencao' },
];

// =======================
// Create Store Modal
// =======================
const CreateStoreModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateStorePayload>({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    email: '',
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
        phone: '',
        email: '',
        status: 'active',
      });
    },
    onError: (error) => {
      toast.error('Erro ao criar loja. Tente novamente.');
      console.error('Create store error:', error);
    },
  });

  if (!isOpen) return null;

  return (
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
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(11) 99999-9999"
                  disabled={createMutation.isPending}
                  aria-label="Telefone"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="loja@email.com"
                  disabled={createMutation.isPending}
                  aria-label="Email"
                />
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
  const [formData, setFormData] = useState<UpdateStorePayload>({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    email: '',
    status: 'active',
  });

  const updateMutation = useMutation({
    mutationFn: ({ storeId, payload }: { storeId: string; payload: UpdateStorePayload }) =>
      storesService.updateStore(storeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Loja atualizada com sucesso!');
      onClose();
    },
    onError: (error) => {
      toast.error('Erro ao atualizar loja. Tente novamente.');
      console.error('Update store error:', error);
    },
  });

  // Atualizar formData quando store muda
  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name || '',
        description: store.description || '',
        address: store.address || '',
        city: store.city || '',
        state: store.state || '',
        phone: store.phone || '',
        email: store.email || '',
        status: store.status || 'active',
      });
    }
  }, [store]);

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
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(11) 99999-9999"
                  disabled={updateMutation.isPending}
                  aria-label="Telefone"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="loja@email.com"
                  disabled={updateMutation.isPending}
                  aria-label="Email"
                />
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
                  <option value="maintenance">Manutenção</option>
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
}

const StoreCard = ({ store, onEdit }: StoreCardProps) => {
  const queryClient = useQueryClient();
  const [showActions, setShowActions] = useState(false);
  const planLabel = PLAN_LABELS[store.plan] ?? 'Trial';

  const deleteMutation = useMutation({
    mutationFn: () => storesService.deleteStore(store.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Loja excluída com sucesso!');
    },
    onError: (error) => {
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
          className="text-gray-400 hover:text-gray-600 p-1"
          aria-label="Ações da loja"
          title="Menu de ações"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
        
        {showActions && (
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
            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
              store.status === 'active' 
                ? 'bg-green-100 text-green-800'
                : store.status === 'inactive'
                ? 'bg-gray-100 text-gray-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
            aria-label={`Status: ${store.status === 'active' ? 'Ativa' : store.status === 'inactive' ? 'Inativa' : 'Manutencao'}`}
          >
            {store.status === 'active' ? 'Ativa' : 
             store.status === 'inactive' ? 'Inativa' : 'Manutencao'}
          </span>
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
            aria-label={`Plano: ${planLabel}`}
          >
            {planLabel}
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
        
        {store.phone && (
          <div className="flex items-center text-gray-500">
            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            <span aria-label={`Telefone: ${store.phone}`}>{store.phone}</span>
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
  
  const { data: stores, isLoading, error } = useQuery({
    queryKey: ['stores'],
    queryFn: storesService.getStores,
  });

  const handleEditStore = (store: Store) => {
    setStoreToEdit(store);
  };

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
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center"
          aria-label="Criar nova loja"
          title="Abrir formulário para criar nova loja"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nova Loja
        </button>
      </div>

      {stores && stores.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store: Store) => (
            <StoreCard 
              key={store.id} 
              store={store} 
              onEdit={handleEditStore}
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
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-medium text-lg inline-flex items-center"
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
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />

      {/* Edit Store Modal */}
      <EditStoreModal 
        store={storeToEdit}
        isOpen={!!storeToEdit}
        onClose={() => setStoreToEdit(null)}
      />
    </div>
  );
};

export default Stores;



