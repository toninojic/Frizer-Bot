import Constants from 'expo-constants';
import { Platform } from 'react-native';

const configuredApiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export const API_BASE_URL = resolveApiBaseUrl(configuredApiBaseUrl);

export const apiConfig = {
  baseUrl: API_BASE_URL,
  healthUrl: `${API_BASE_URL}/health`,
};

function resolveApiBaseUrl(baseUrl: string) {
  if (Platform.OS === 'web' || !isLocalhostUrl(baseUrl)) {
    return baseUrl;
  }

  const expoHost = getExpoHost();

  if (!expoHost) {
    return baseUrl;
  }

  try {
    const url = new URL(baseUrl);
    url.hostname = expoHost;

    return url.toString().replace(/\/$/, '');
  } catch {
    return baseUrl.replace('localhost', expoHost).replace('127.0.0.1', expoHost);
  }
}

function isLocalhostUrl(baseUrl: string) {
  return baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
}

function getExpoHost() {
  const constants = Constants as typeof Constants & {
    manifest?: {
      debuggerHost?: string;
    };
    manifest2?: {
      extra?: {
        expoClient?: {
          hostUri?: string;
        };
      };
    };
  };
  const hostUri =
    Constants.expoConfig?.hostUri ??
    constants.manifest2?.extra?.expoClient?.hostUri ??
    constants.manifest?.debuggerHost;

  return hostUri?.split(':')[0];
}
