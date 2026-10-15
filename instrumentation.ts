// Runs once when the Next.js server starts.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { assertJwtSecretConfigured } = await import('./lib/auth');
  try {
    assertJwtSecretConfigured();
  } catch (error) {
    // Without this exit Next keeps running and answers 500 to every request
    console.error(`[lumina] Configuración inválida: ${(error as Error).message}`);
    process.exit(1);
  }
}
