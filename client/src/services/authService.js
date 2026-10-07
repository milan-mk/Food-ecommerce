import api, { body } from './api';
export const register = (payload) => body(api.post('/auth/register', payload));
export const login = (payload) => body(api.post('/auth/login', payload));
export const logout = () => body(api.post('/auth/logout'));
export const me = () => body(api.get('/auth/me'));
