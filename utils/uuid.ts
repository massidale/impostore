/**
 * Genera un UUID semplice per identificare l'host
 */
export function generateHostId(): string {
  return 'host-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

