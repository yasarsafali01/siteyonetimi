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

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// React Native'de global atob/btoa garanti değil (Hermes'te yok) — elle çözülüyor.
function base64Decode(input: string): string {
  const clean = input.replace(/[^A-Za-z0-9+/]/g, "");
  let output = "";
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = BASE64_CHARS.indexOf(clean[i]);
    const c1 = BASE64_CHARS.indexOf(clean[i + 1]);
    const c2 = clean[i + 2] !== undefined ? BASE64_CHARS.indexOf(clean[i + 2]) : -1;
    const c3 = clean[i + 3] !== undefined ? BASE64_CHARS.indexOf(clean[i + 3]) : -1;

    const byte0 = (c0 << 2) | (c1 >> 4);
    output += String.fromCharCode(byte0);
    if (c2 >= 0) {
      const byte1 = ((c1 & 15) << 4) | (c2 >> 2);
      output += String.fromCharCode(byte1);
    }
    if (c3 >= 0) {
      const byte2 = ((c2 & 3) << 6) | c3;
      output += String.fromCharCode(byte2);
    }
  }
  return output;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = base64Decode(base64);
    const json = decodeURIComponent(
      decoded
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function getCurrentUserType(): Promise<"yonetici" | "sakin" | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  return (payload?.utype as "yonetici" | "sakin" | undefined) ?? null;
}

export async function getCurrentUserId(): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  return (payload?.uid as string | undefined) ?? null;
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
