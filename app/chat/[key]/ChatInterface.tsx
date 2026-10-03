'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Building2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

const SESSION_KEY = 'immoai_session'

export default function ChatInterface({
  apiKey,
  agencyName,
  brandColor,
}: {
  apiKey: string
  agencyName: string
  brandColor: string
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => {
    if (typeof window === 'undefined') return generateUUID()
    try {
      const stored = sessionStorage.getItem(SESSION_KEY + apiKey.slice(0, 8))
      if (stored) return stored
      const id = generateUUID()
      sessionStorage.setItem(SESSION_KEY + apiKey.slice(0, 8), id)
      return id
    } catch {
      return generateUUID()
    }
  })
  const [started, setStarted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function startChat() {
    setStarted(true)
    setLoading(true)
    try {
      const res = await fetch('/api/widget/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ messages: [], session_id: sessionId }),
      })
      const data = await res.json()
      if (data.message) {
        setMessages([{ role: 'assistant', content: data.message }])
      } else {
        setMessages([{ role: 'assistant', content: `Bonjour ! Je suis l'assistant de ${agencyName}. Comment puis-je vous aider ?` }])
      }
    } catch {
      setMessages([{ role: 'assistant', content: `Bonjour ! Je suis l'assistant de ${agencyName}. Comment puis-je vous aider ?` }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const next: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setLoading(true)

    try {
      const res = await fetch('/api/widget/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ messages: next, session_id: sessionId }),
      })
      const data = await res.json()
      if (!res.ok || data.error || !data.message) {
        setMessages([...next, { role: 'assistant', content: 'Désolé, une erreur est survenue. Réessayez dans quelques instants.' }])
      } else {
        setMessages([...next, { role: 'assistant', content: data.message }])
      }
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Désolé, une erreur est survenue. Réessayez dans quelques instants.' }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-6 text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg"
          style={{ backgroundColor: brandColor }}
        >
          <Building2 className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{agencyName}</h2>
        <p className="text-gray-500 mb-2 max-w-xs">
          Notre assistant immobilier est disponible 24h/24 pour répondre à vos questions.
        </p>
        <p className="text-xs text-gray-400 mb-8 max-w-xs">
          Dites-nous ce que vous recherchez et nous vous trouverons le bien idéal.
        </p>
        <button
          onClick={startChat}
          className="px-8 py-3.5 rounded-xl text-white font-semibold text-base shadow-md active:scale-95 transition-transform"
          style={{ backgroundColor: brandColor }}
        >
          Démarrer la conversation
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5"
                style={{ backgroundColor: brandColor }}
              >
                <Building2 className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div
              className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'rounded-br-sm text-white'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
              style={m.role === 'user' ? { backgroundColor: brandColor } : {}}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: brandColor }}
            >
              <Building2 className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-white px-4 py-3 flex gap-2 items-end">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Écrivez votre message..."
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
          style={{ '--tw-ring-color': brandColor } as React.CSSProperties}
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95 transition-transform"
          style={{ backgroundColor: brandColor }}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : (
            <Send className="w-4 h-4 text-white" />
          )}
        </button>
      </div>
    </div>
  )
}
