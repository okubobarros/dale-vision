import { useEffect, useState } from "react"

export function useIsMobile(breakpointPx: number = 768) {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.innerWidth < breakpointPx
  })

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpointPx)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [breakpointPx])

  return isMobile
}
