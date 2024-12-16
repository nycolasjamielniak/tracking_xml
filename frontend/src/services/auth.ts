import axios from 'axios';

const KEYCLOAK_URL = 'https://auth-homol.matrixcargo.com.br/realms/painel/protocol/openid-connect/token';
const CLIENT_ID = 'painel-api';

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export const authService = {
  async login(username: string, password: string): Promise<AuthResponse> {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    params.append('client_id', CLIENT_ID);
    params.append('grant_type', 'password');

    try {
      const response = await axios.post(KEYCLOAK_URL, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
      // Store tokens in localStorage
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
      
      return response.data;
    } catch (error) {
      throw new Error('Authentication failed');
    }
  },

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  },

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }
}; 