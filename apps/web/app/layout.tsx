import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '대한P&S',
  description: '대한P&S 회원 서비스',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
