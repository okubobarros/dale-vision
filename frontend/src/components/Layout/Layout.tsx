import { Outlet } from "react-router-dom"
import { useState } from "react"
import { Header, Sidebar } from "./index"
import { useIsMobile } from "../../hooks/useIsMobile"

import BottomNav from "./BottomNav"
import { AgentModal } from "../Agent/AgentModal"

const Layout = () => {
  const isMobile = useIsMobile(768)
  const [agentOpen, setAgentOpen] = useState(false)

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <Header />

        <div className="flex">
          {!isMobile && <Sidebar />}

          {/* ✅ no mobile: dá folga pro bottom nav */}
          <main className={`flex-1 p-4 sm:p-6 ${isMobile ? "pb-bottomnav" : ""}`}>
            <Outlet />
          </main>
        </div>
      </div>

      {isMobile && (
        <>
          <BottomNav onOpenAgent={() => setAgentOpen(true)} />
          <AgentModal open={agentOpen} onClose={() => setAgentOpen(false)} />
        </>
      )}
    </>
  )
}

export default Layout
