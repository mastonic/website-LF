# ImmoAI — Copilote IA pour agents immobiliers

SaaS B2B multi-tenant propulsé par Claude (Anthropic), destiné aux agents immobiliers indépendants et agences.

## Stack technique

- **Frontend / Backend** : Next.js 14 App Router + TypeScript strict
- **UI** : Tailwind CSS + shadcn/ui (Radix primitives)
- **Base de données** : Supabase (PostgreSQL + Auth + RLS + Storage)
- **IA** : Anthropic Claude `claude-sonnet-4-6`
- **Email** : Resend
- **Paiement** : Lemon Squeezy
- **Déploiement** : Vercel

## Architecture multi-tenant

Chaque agence/agent dispose d'un `workspace_id` isolé. La sécurité est assurée par Row Level Security Supabase. Chaque tenant a une clé API unique pour le widget chatbot.

## Modules

| # | Module | Statut |
|---|--------|--------|
| 1 | Générateur d'annonces IA | Implémenté |
| 2 | Chatbot qualificateur de leads | Implémenté (widget JS) |
| 3 | Assistant administratif (PDF) | Prochainement |
| 4 | Estimateur de prix IA | Prochainement |
| 5 | Générateur de contenu social | Prochainement |
| 6 | CRM & suivi client | Prochainement |

## Installation locale

```bash
# 1. Installer les dépendances
npm install

# 2. Copier et remplir les variables d'environnement
cp .env.local.example .env.local

# 3. Appliquer le schéma Supabase
# Copier le contenu de supabase/schema.sql dans l'éditeur SQL Supabase

# 4. Lancer en développement
npm run dev
```

## Variables d'environnement requises

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
```

## API publique

### Générer une annonce

```
POST /api/v1/annonce/generate
Authorization: Bearer {API_KEY}
Content-Type: application/json

{ "type_bien": "Appartement", "surface": 75, "pieces": 3, "localisation": "Paris 11e", "ton": "standard" }
```

### Ingérer un lead

```
POST /api/v1/leads/ingest
Authorization: Bearer {API_KEY}
Content-Type: application/json

{ "prenom": "...", "email": "...", "budget_max": 400000 }
```

## Widget chatbot

```html
<script src="https://immoai.fr/widget.js"
  data-key="VOTRE_CLE_API"
  data-color="#2563EB">
</script>
```

## Plans tarifaires

| Plan | Prix | Utilisateurs | Annonces IA |
|------|------|-------------|-------------|
| Starter | 29 EUR/mois | 1 | 20/mois |
| Pro | 59 EUR/mois | 3 | Illimite |
| Agence | 149 EUR/mois | 10 | Illimite + API |
