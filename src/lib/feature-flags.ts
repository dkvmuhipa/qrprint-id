/**
 * Centralized Feature Flags for Ngeprint.
 * Set NEXT_PUBLIC_ENABLE_PASFOTO_GRID=true in .env when ready to release Pas Foto Grid.
 */
export const ENABLE_PASFOTO_GRID =
  process.env.NEXT_PUBLIC_ENABLE_PASFOTO_GRID === "true";
