// src/services/auth.ts
import api from './api';

// ============ DEFINIR OS TYPES PRIMEIRO ============

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  expiry?: string;
}

// ============ AGORA A authService ============

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    console.log('Fazendo login com:', credentials);
    
    // Importante: não enviar Authorization header no login
    const response = await api.post('/accounts/login/', credentials, {
      headers: {
        Authorization: undefined // Garante que não envia token antigo
      }
    });
    
    console.log('Resposta do login:', response.data);
    
    if (response.data.token) {
      const token = response.data.token;
      
      // Salvar token e usuário
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(response.data.user));
      
      // O interceptor em api.ts já vai pegar este token automaticamente
      // nas próximas requisições
      
      return response.data;
    }
    
    throw new Error('Token não encontrado na resposta');
  },

  async logout(): Promise<void> {
    const token = localStorage.getItem('authToken');
    
    try {
      if (token) {
        // Enviar logout para a API
        await api.post('/accounts/logout/');
      }
    } catch (error) {
      console.warn('Erro no logout da API:', error);
    } finally {
      // Sempre limpa o localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
    }
  },

  getCurrentUser(): User | null {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  },

  getToken(): string | null {
    return localStorage.getItem('authToken');
  },

  // setupToken não é mais necessário - o interceptor cuida disso
  setupToken(): void {
    console.log('setupToken chamado - interceptor já cuida disso');
  },
};