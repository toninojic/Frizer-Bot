export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong';
}

export function formatPhone(phone: string) {
  return phone || '-';
}
