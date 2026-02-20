import type { ReactNode, ReactElement } from "react"
import { render } from "@testing-library/react"
import type { RenderOptions } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter } from "react-router-dom"
import { AuthProvider } from "../contexts/AuthContext"

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  })

type WrapperProps = {
  children: ReactNode
}

const buildWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: WrapperProps) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
  return Wrapper
}

export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => {
  const queryClient = createTestQueryClient()
  const Wrapper = buildWrapper(queryClient)
  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...options }),
  }
}
