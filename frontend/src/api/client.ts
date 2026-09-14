import axios from 'axios';

export const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Call once (App.tsx does this in a top-level effect) so every request after
// that carries a valid Clerk session token.
export function attachAuthToken(getToken: () => Promise<string | null>) {
  client.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
}
