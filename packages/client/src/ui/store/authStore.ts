import create from 'zustand';
import axios from 'axios';

type Profile = {
  id: string;
  nickname: string;
  balance: number;
  role: 'user' | 'admin';
};

type AuthState = {
  token: string | null;
  profile: Profile | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nickname: string) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  profile: null,
  async login(email, password) {
    const response = await axios.post('/auth/login', { email, password });
    localStorage.setItem('token', response.data.token);
    set({ token: response.data.token });
    await get().fetchProfile();
  },
  async register(email, password, nickname) {
    const response = await axios.post('/auth/register', { email, password, nickname });
    localStorage.setItem('token', response.data.token);
    set({ token: response.data.token });
    await get().fetchProfile();
  },
  logout() {
    localStorage.removeItem('token');
    set({ token: null, profile: null });
  },
  async fetchProfile() {
    const token = get().token ?? localStorage.getItem('token');
    if (!token) return;
    const response = await axios.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    set({ profile: response.data });
  }
}));

axios.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
