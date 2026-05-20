import apiClient from './client';

export const requestOtp = (phone: string, school_id?: string) =>
  apiClient.post('/auth/otp/request', { phone, ...(school_id && { school_id }) }).then((r) => r.data);

export const verifyOtp = (phone: string, otp: string, school_id?: string) =>
  apiClient.post('/auth/otp/verify', { phone, otp, ...(school_id ? { school_id } : {}) }).then((r) => r.data);

export const getMe = () => apiClient.get('/auth/me').then((r) => r.data);
