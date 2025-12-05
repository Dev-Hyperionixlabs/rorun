import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - clear token and redirect to login
          await AsyncStorage.removeItem('auth_token');
        }
        return Promise.reject(error);
      },
    );
  }

  get instance() {
    return this.client;
  }

  async setAuthToken(token: string) {
    await AsyncStorage.setItem('auth_token', token);
  }

  async removeAuthToken() {
    await AsyncStorage.removeItem('auth_token');
  }
}

export const apiService = new ApiService();
export default apiService.instance;

