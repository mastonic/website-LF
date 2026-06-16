export type Plan = 'starter' | 'pro' | 'agence' | 'trial'
export type AnnonceStatut = 'brouillon' | 'publie' | 'archive'
export type AnnonceTon = 'standard' | 'luxe' | 'familial' | 'investisseur'
export type LeadScore = 'chaud' | 'tiede' | 'froid'
export type LeadStatut = 'nouveau' | 'contacte' | 'rdv' | 'converti' | 'perdu'
export type ContactType = 'acheteur' | 'vendeur' | 'bailleur' | 'locataire'
export type StatutPipeline = 'prospect' | 'qualification' | 'visite' | 'offre' | 'compromis' | 'acte' | 'perdu'

export interface Workspace {
  id: string
  name: string
  slug: string
  plan: Plan
  plan_expires_at: string | null
  logo_url: string | null
  brand_color: string
  api_key: string
  ai_quota_used: number
  ai_quota_limit: number
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  created_at: string
}

export interface Annonce {
  id: string
  workspace_id: string
  created_by: string
  type_bien: string
  surface: number | null
  pieces: number | null
  localisation: string | null
  equipements: string[] | null
  points_forts: string | null
  ton: AnnonceTon
  titre: string | null
  description_longue: string | null
  description_courte: string | null
  description_en: string | null
  statut: AnnonceStatut
  tokens_used: number
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  workspace_id: string
  prenom: string | null
  nom: string | null
  email: string | null
  telephone: string | null
  budget_min: number | null
  budget_max: number | null
  type_recherche: string | null
  delai_projet: string | null
  score: LeadScore
  score_detail: string | null
  resume_ia: string | null
  statut: LeadStatut
  source: string
  rdv_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  workspace_id: string
  created_by: string
  nom_fichier: string
  storage_path: string
  type_document: 'copropriete' | 'diagnostic' | 'compromis' | 'mandat' | 'autre'
  resume: string | null
  extraction: Record<string, unknown> | null
  tokens_used: number
  created_at: string
}

export interface Contact {
  id: string
  workspace_id: string
  created_by: string
  prenom: string
  nom: string
  email: string | null
  telephone: string | null
  type_contact: ContactType
  statut_pipeline: StatutPipeline
  budget: number | null
  notes: string | null
  last_contact_at: string | null
  created_at: string
  updated_at: string
}

export interface AnnonceGenerateInput {
  type_bien: string
  surface?: number
  pieces?: number
  localisation?: string
  equipements?: string[]
  points_forts?: string
  ton: AnnonceTon
}

export interface AnnonceGenerateOutput {
  titre: string
  description_longue: string
  description_courte: string
  description_en: string
}
