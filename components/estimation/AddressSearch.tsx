'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { searchAddress, type AddressSuggestion } from '@/lib/geocode'

interface Props {
  id?: string
  value: AddressSuggestion | null
  onChange: (v: AddressSuggestion | null) => void
}

export function AddressSearch({ id = 'adresse', value, onChange }: Props) {
  const [query, setQuery] = useState(value?.label ?? '')
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const abort = useRef<AbortController | null>(null)

  useEffect(() => {
    if (value || query.trim().length < 4) {
      setSuggestions([])
      return
    }
    const t = setTimeout(async () => {
      abort.current?.abort()
      const ctrl = new AbortController()
      abort.current = ctrl
      try {
        setSuggestions(await searchAddress(query.trim(), ctrl.signal))
      } catch {
        /* annulé */
      }
    }, 250)
    return () => clearTimeout(t)
  }, [query, value])

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" aria-hidden />
        <input
          id={id}
          className="w-full min-h-[44px] rounded-lg border border-input bg-white pl-10 pr-3 text-base focus:outline-none focus:ring-2 focus:ring-ring"
          value={query}
          autoComplete="off"
          placeholder="12 rue de la République, Lyon"
          onChange={(e) => {
            setQuery(e.target.value)
            onChange(null)
          }}
          aria-autocomplete="list"
          aria-controls={`${id}-suggestions`}
        />
      </div>
      {suggestions.length > 0 && (
        <ul id={`${id}-suggestions`} role="listbox" className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <li key={s.label + s.lat}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="w-full text-left min-h-[44px] px-3 py-2 text-sm hover:bg-blue-50"
                onClick={() => {
                  onChange(s)
                  setQuery(s.label)
                  setSuggestions([])
                }}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {value && <p className="mt-1 text-xs text-emerald-700">Adresse reconnue.</p>}
    </div>
  )
}
