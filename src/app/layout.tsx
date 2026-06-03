import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import QuickCapture from '@/components/QuickCapture'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Homebase',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100`}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
          <QuickCapture />
        </div>
      </body>
    </html>
  )
}
