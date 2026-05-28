import { validate as validateUUID } from 'uuid';

export function isValidUUID(id: string): boolean {
  return validateUUID(id);
}

export function generateUUID(): string {
  return crypto.randomUUID();
}