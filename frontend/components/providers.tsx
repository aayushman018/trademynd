"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes"
import { GoogleOAuthProvider } from "@react-oauth/google"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";
  
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <NextThemesProvider {...props}>{children}</NextThemesProvider>
    </GoogleOAuthProvider>
  )
}
