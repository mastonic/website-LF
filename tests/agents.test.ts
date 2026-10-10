import { describe, it, expect } from 'vitest'
import { AGENTS, MVP_AGENTS, V2_AGENTS, getAgent } from '@/lib/agents'
import { needsFollowUp, RELANCE_DELAI_JOURS } from '@/lib/workspace'

describe('équipe d’agents (PRD design)', () => {
  it('contient 8 agents avec des prénoms uniques', () => {
    expect(AGENTS).toHaveLength(8)
    expect(new Set(AGENTS.map((a) => a.prenom)).size).toBe(8)
  })

  it('place Alex, Victor, Sophie, Julien et Emma dans le MVP', () => {
    expect(MVP_AGENTS.map((a) => a.prenom)).toEqual(['Alex', 'Victor', 'Sophie', 'Julien', 'Emma'])
  })

  it('place Hugo, Thomas et Chloé en V2', () => {
    expect(V2_AGENTS.map((a) => a.prenom)).toEqual(['Hugo', 'Thomas', 'Chloé'])
  })

  it('retrouve un agent par identifiant', () => {
    expect(getAgent('victor').role).toBe('Prospection vendeurs')
  })
})

describe('relances d’Emma', () => {
  const now = new Date('2026-10-10T12:00:00Z')
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString()

  it('signale un contact sans échange depuis le délai', () => {
    expect(needsFollowUp({ statut_pipeline: 'prospect', last_contact_at: daysAgo(RELANCE_DELAI_JOURS), created_at: daysAgo(30) }, now)).toBe(true)
  })

  it('ne signale pas un contact récent', () => {
    expect(needsFollowUp({ statut_pipeline: 'visite', last_contact_at: daysAgo(2), created_at: daysAgo(30) }, now)).toBe(false)
  })

  it('utilise la date de création si aucun échange', () => {
    expect(needsFollowUp({ statut_pipeline: 'prospect', last_contact_at: null, created_at: daysAgo(10) }, now)).toBe(true)
    expect(needsFollowUp({ statut_pipeline: 'prospect', last_contact_at: null, created_at: daysAgo(1) }, now)).toBe(false)
  })

  it('ignore les dossiers perdus ou conclus', () => {
    expect(needsFollowUp({ statut_pipeline: 'perdu', last_contact_at: null, created_at: daysAgo(90) }, now)).toBe(false)
    expect(needsFollowUp({ statut_pipeline: 'acte', last_contact_at: null, created_at: daysAgo(90) }, now)).toBe(false)
  })
})
