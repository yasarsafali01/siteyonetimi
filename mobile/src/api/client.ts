import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8081/api/v1";

export const apiClient = axios.create({ baseURL: API_URL });

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export async function getAccessToken() {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function storeTokens(accessToken: string, refreshToken: string) {
  await AsyncStorage.setMany({
    [ACCESS_TOKEN_KEY]: accessToken,
    [REFRESH_TOKEN_KEY]: refreshToken,
  });
}

export async function clearTokens() {
  await AsyncStorage.removeMany([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
}

apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new Error("refresh token yok");
  }
  const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
  await storeTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const newAccessToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch {
        await clearTokens();
      }
    }
    return Promise.reject(error);
  }
);
