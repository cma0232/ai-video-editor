import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import { ConfirmDialogProvider } from '@/components/dialogs/use-confirm-dialog'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'

export const metadata: Metadata = {
  title: '创剪视频工作流 - 基于 Gemini AI 的自动化视频剪辑',
  description:
    '创剪视频工作流（ChuangCut Video Workflow）- 基于 Google Gemini AI 的全自动视频剪辑工具，支持智能分镜、断点续传和多种解说风格',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
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
            <Footer />
          </div>
          <Toaster position="top-center" richColors />
        </ConfirmDialogProvider>
      </body>
    </html>
  )
}
