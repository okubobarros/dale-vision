import "@testing-library/jest-dom"
import { vi } from "vitest"

vi.stubEnv("VITE_SUPABASE_URL", "http://localhost")
vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key")
