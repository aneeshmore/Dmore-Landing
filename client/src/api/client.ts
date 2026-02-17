import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://api.paintos.in';

export const api = axios.create({
  baseURL: `${baseURL.replace(/\/$/, '')}/api`,
});

export const setAuthToken = (token?: string | null) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};
