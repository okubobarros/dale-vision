// src/main.tsx
import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { HelmetProvider } from "@vuer-ai/react-helmet-async"
import { Toaster } from "react-hot-toast"

import { AuthProvider } from "./contexts/AuthContext"
import { AgentProvider } from "./contexts/AgentContext"
import { alertsService } from "./services/alerts"

import App from "./App"
import "./index.css"

declare global {
  interface Window {
    alertsService: typeof alertsService
  }
}

window.alertsService = alertsService

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30000,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AgentProvider>
              <App />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: "#363636",
                    color: "#fff",
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: "green",
                      secondary: "black",
                    },
                  },
                }}
              />
            </AgentProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
)
