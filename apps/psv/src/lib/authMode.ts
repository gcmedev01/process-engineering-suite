export function getSharedAuthApiBaseUrl(
  useLocalStorage: boolean,
  authApiBaseUrl: string | undefined,
): string | undefined {
  if (useLocalStorage) return undefined;
  return authApiBaseUrl;
}
