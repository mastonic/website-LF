import { describe, it, expect } from 'vitest'
import { parseAccessCodes, matchAccessCode, accessEmail, accessPassword } from '@/lib/access-code'

describe('connexion par code', () => {
  const entries = parseAccessCodes('Ludo:tilleul-4821, claire:noyer-7305 ,mauvais:abc, :vide,x y:codecode')

  it('lit les entrées valides seulement', () => {
    expect(entries).toEqual([
      { name: 'ludo', code: 'tilleul-4821' },
      { name: 'claire', code: 'noyer-7305' },
    ])
    expect(parseAccessCodes(undefined)).toEqual([])
  })

  it('reconnaît un code sans tenir compte de la casse ni des espaces', () => {
    expect(matchAccessCode(entries, '  Noyer-7305 ')?.name).toBe('claire')
    expect(matchAccessCode(entries, 'tilleul-4821')?.name).toBe('ludo')
  })

  it('refuse un mauvais code ou un code vide', () => {
    expect(matchAccessCode(entries, 'noyer-7306')).toBeNull()
    expect(matchAccessCode(entries, '')).toBeNull()
    expect(matchAccessCode([], 'tilleul-4821')).toBeNull()
  })

  it('dérive un compte stable et un mot de passe propre à chaque nom et secret', () => {
    expect(accessEmail('claire')).toBe('claire@acces.immoai.app')
    expect(accessPassword('claire', 's1')).toBe(accessPassword('claire', 's1'))
    expect(accessPassword('claire', 's1')).not.toBe(accessPassword('ludo', 's1'))
    expect(accessPassword('claire', 's1')).not.toBe(accessPassword('claire', 's2'))
  })
})
