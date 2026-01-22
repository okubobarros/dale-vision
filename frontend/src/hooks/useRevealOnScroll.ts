import { useEffect } from "react"

type Options = {
  selector?: string
  rootMargin?: string
  threshold?: number
}

export function useRevealOnScroll(options: Options = {}) {
  const {
    selector = "[data-reveal]",
    rootMargin = "0px 0px -10% 0px",
    threshold = 0.12,
  } = options

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll(selector))
    if (!nodes.length) return

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("dv-reveal--in")
            io.unobserve(entry.target)
          }
        })
      },
      { rootMargin, threshold }
    )

    nodes.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [selector, rootMargin, threshold])
}
