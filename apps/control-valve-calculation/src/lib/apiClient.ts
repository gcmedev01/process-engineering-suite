import { createApiClient } from "@eng-suite/api-client"

/**
 * Singleton API client for the control-valve-calculation app.
 * Uses NEXT_PUBLIC_API_URL env var (falls back to localhost:8000).
 */
export const apiClient = createApiClient(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  // No auth token — calculator apps have no login flow
  null
)
