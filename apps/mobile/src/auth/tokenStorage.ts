import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const accessTokenKey = 'ai-salon-access-token';

function canUseWebStorage() {
  return Platform.OS === 'web' && typeof window !== 'undefined';
}

export async function getStoredAccessToken() {
  if (canUseWebStorage()) {
    return window.localStorage.getItem(accessTokenKey);
  }

  return SecureStore.getItemAsync(accessTokenKey);
}

export async function storeAccessToken(accessToken: string) {
  if (canUseWebStorage()) {
    window.localStorage.setItem(accessTokenKey, accessToken);
    return;
  }

  await SecureStore.setItemAsync(accessTokenKey, accessToken);
}

export async function clearStoredAccessToken() {
  if (canUseWebStorage()) {
    window.localStorage.removeItem(accessTokenKey);
    return;
  }

  await SecureStore.deleteItemAsync(accessTokenKey);
}
