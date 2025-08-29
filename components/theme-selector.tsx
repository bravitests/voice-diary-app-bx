"use client"

import { useTheme } from "@/contexts/theme-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Monitor, Moon, Sun } from "lucide-react"

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  const themes = [
    {
      value: "system" as const,
      label: "System",
      description: "Use system preference",
      icon: Monitor,
    },
    {
      value: "light" as const,
      label: "Light",
      description: "Light theme",
      icon: Sun,
    },
    {
      value: "dark" as const,
      label: "Dark",
      description: "Dark theme",
      icon: Moon,
    },
  ]

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-base text-card-foreground flex items-center gap-2">
          <Monitor className="w-4 h-4" />
          Theme
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {themes.map((themeOption) => {
          const Icon = themeOption.icon
          return (
            <Button
              key={themeOption.value}
              variant={theme === themeOption.value ? "default" : "outline"}
              className="w-full justify-start gap-3 h-12"
              onClick={() => setTheme(themeOption.value)}
            >
              <Icon className="w-4 h-4" />
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">{themeOption.label}</span>
                <span className="text-xs opacity-70">{themeOption.description}</span>
              </div>
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
}
