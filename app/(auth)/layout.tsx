import { Building2 } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <Building2 className="h-8 w-8 text-blue-600" />
        <span className="text-2xl font-bold text-gray-900">ImmoAI</span>
      </Link>
      {children}
    </div>
  )
}
