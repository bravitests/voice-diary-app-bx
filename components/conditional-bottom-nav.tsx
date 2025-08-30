"use client"

import { usePathname } from "next/navigation"
import { BottomNav } from "./bottom-nav"

export function ConditionalBottomNav() {
  const pathname = usePathname()

  if (pathname === "/") {
    return null
  }

  return <BottomNav />
}
