import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import { ConfirmDialogProvider } from '@/components/dialogs/use-confirm-dialog'
import { Header } from '@/components/layout/header'

export const metadata: Metadata = {
  title: 'Video Auto Clipper',
  description: 'AI-powered automatic video editing tool',
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-linear-to-br from-claude-cream-50 via-white to-claude-cream-100/80 text-claude-dark-900">
        <ConfirmDialogProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
          </div>
          <Toaster position="top-center" richColors />
        </ConfirmDialogProvider>
      </body>
    </html>
  )
}
