// =============================================================================
// API Configuration
// =============================================================================
// Toggle USE_MOCK to false when real backend is ready.
// Services check this flag and route to real fetch calls or mock data.
// =============================================================================

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  USE_MOCK: false,
  MOCK_DELAY_MIN: 300,
  MOCK_DELAY_MAX: 800,
} as const;
