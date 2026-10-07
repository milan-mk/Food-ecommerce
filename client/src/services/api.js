import axios from 'axios';
import { API_URL } from '../config';

const api = axios.create({ baseURL: API_URL, withCredentials: true, timeout: 20000 });

// Turns every failure into an Error with { message, status, errors } the UI can show directly.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);
    const status = error.response && error.response.status;
    const body = (error.response && error.response.data) || {};
    const message = body.message || (error.request ? 'Cannot reach the server. Check your connection and try again.' : 'Something went wrong. Please try again.');
    // A 401 on any page except the auth calls themselves means the session ended.
    if (status === 401 && !String(error.config && error.config.url).startsWith('/auth/')) window.dispatchEvent(new Event('auth:unauthorized'));
    return Promise.reject(Object.assign(new Error(message), { status, errors: body.errors || [] }));
  }
);

export const body = (promise) => promise.then((r) => r.data); // services return the API body: { success, data, pagination... }
export default api;
