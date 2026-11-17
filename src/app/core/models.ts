export interface Page<T> {
  content: T[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
}
export type Role = 'ADMIN' | 'TREASURER' | 'VIEWER';
export interface Profile { id: string; email: string; fullName: string; role: Role; tenantName: string; }
export interface AuthResponse { accessToken: string; expiresIn: number; user: Profile; }

/** Convierte el ProblemDetail del backend en un mensaje legible. */
export function errorMessage(e: any): string {
  const body = e?.error;
  if (body?.errors) return Object.values(body.errors).join('. ');
  if (body?.detail) return body.detail;
  if (e?.status === 0) return 'No hay conexión con el servidor';
  return 'Ocurrió un error inesperado';
}
