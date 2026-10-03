'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export default function CopyButton({
  text,
  label,
  dark = false,
}: {
  text: string
  label?: string
  dark?: boolean
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 ${
        dark
          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
      } ${copied ? 'opacity-80' : ''}`}
    >
      {copied ? (
        <><Check className="h-3.5 w-3.5" /> Copié !</>
      ) : (
        <><Copy className="h-3.5 w-3.5" />{label ?? 'Copier'}</>
      )}
    </button>
  )
}
