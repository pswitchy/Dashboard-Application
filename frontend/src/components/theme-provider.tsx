// src/components/theme-provider.tsx
"use client" // This component needs to be a client component

import * as React from "react"
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes" // Alias to avoid naming conflict

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Pass all props (like attribute, defaultTheme, etc.) to the underlying provider
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}