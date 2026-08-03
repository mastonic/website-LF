# Bridge (sandbox) → Firestore

Backend Firebase (Cloud Functions + Firestore) qui connecte un compte bancaire
via Bridge Connect et synchronise les transactions dans Firestore. Pas de
frontend, pas d'alertes, pas d'agent IA — uniquement l'ingestion de données.

## ⚠️ Limite rencontrée pendant le développement

Cet environnement d'exécution **bloque au niveau réseau** l'accès sortant
vers `docs.bridgeapi.io` et `api.bridgeapi.io` (politique de proxy —
confirmé : `403 Host not in allowlist: api.bridgeapi.io`). Concrètement :

- Je n'ai **pas pu vérifier la doc actuelle en direct** malgré la demande —
  les endpoints/headers/champs ci-dessous viennent de snippets de recherche
  web sur `docs.bridgeapi.io`, pas d'une lecture directe de la doc.
- Je n'ai **pas pu appeler l'API Bridge sandbox réelle** depuis cet
  environnement — `npm run test:sync-sandbox` échouera ici avec la même
  erreur 403 réseau. J'ai vérifié la partie que je contrôle (normalisation
  Firestore, upsert, absence de doublons) en simulant les réponses Bridge ;
  voir "Ce qui a été vérifié" plus bas.
- **Action attendue de votre côté** : lancez `npm run test:sync-sandbox`
  depuis une machine/CI qui a un accès réseau normal, et vérifiez surtout
  ces deux points avant toute mise en prod :
  - le champ `merchant` sur une transaction (son existence et son nom exact
    ne sont pas confirmés dans la version 2025 de l'API) ;
  - la forme de la pagination (`pagination.next_uri` vs paramètre `after`) —
    le code suit `next_uri`, ajustez `listAllTransactionsSince` dans
    `functions/src/lib/bridge-client.ts` si la doc réelle diffère.

## Ce qui a été vérifié

- `npm install`, `npx tsc --noEmit` et `npm run build` passent sans erreur.
- L'émulateur Firestore a été lancé localement, et `syncTransactionsForUser`
  a été exécuté deux fois avec des réponses Bridge simulées (fetch mocké) :
  les 3 transactions de test sont normalisées avec le schéma attendu, et le
  deuxième passage produit exactement le même nombre de documents (upsert
  par ID Bridge = pas de doublons).
- Le flux réel Bridge (création user → token → connect-session →
  transactions) n'a **pas** pu être exercé de bout en bout ici, faute de
  réseau vers `api.bridgeapi.io`.

## Architecture

```
backend/
  firebase.json            # projet Firebase : functions + firestore
  firestore.rules          # tout est verrouillé (accès Admin SDK only)
  firestore.indexes.json
  .firebaserc.example      # à copier en .firebaserc avec votre project id
  functions/
    package.json
    .env.local             # créds sandbox Bridge (gitignored, ne pas committer)
    .env.example
    src/
      index.ts             # exporte les Cloud Functions
      types.ts
      lib/
        bridge-client.ts   # tous les appels HTTP Bridge + retry/backoff
        token-crypto.ts    # chiffrement AES-256-GCM du token stocké
        firestore-admin.ts # init Admin SDK + noms de collections
      functions/
        connect-bridge-account.ts
        sync-bridge-transactions.ts
    scripts/
      test-sync-sandbox.ts
```

## Étapes manuelles restantes (dashboard Bridge / Firebase)

1. **Firebase** : créez un projet Firebase (ou utilisez un projet existant),
   plan **Blaze** requis pour Cloud Scheduler. `firebase login`, puis copiez
   `.firebaserc.example` → `.firebaserc` avec votre vrai project id (ou
   `firebase use --add`). Activez Firestore (mode natif) dans la console.

2. **Bridge dashboard** (dashboard.bridgeapi.io) : les identifiants sandbox
   fournis sont déjà dans `functions/.env.local`. Repérez dans le dashboard
   la section "Sandbox" / banques de test pour obtenir les identifiants de
   connexion factices (nécessaires pour terminer manuellement le webview
   Bridge Connect au moins une fois par utilisateur de test).

3. **Chiffrement des tokens** (recommandé avant prod) : générez une clé avec
   `openssl rand -hex 32`, mettez-la dans `BRIDGE_TOKEN_ENCRYPTION_KEY`
   (local) et en secret déployé :
   `firebase functions:secrets:set BRIDGE_TOKEN_ENCRYPTION_KEY`. Sans elle,
   le token est stocké en clair dans `bridgeAccounts` (collection verrouillée
   côté client, mais non chiffrée).

4. **Secret de l'endpoint de test** : `SYNC_TRIGGER_SECRET` est auto-généré
   dans `.env.local` pour les tests locaux. Avant tout déploiement atteignable
   depuis l'extérieur, régénérez-en un et déployez-le en secret :
   `firebase functions:secrets:set SYNC_TRIGGER_SECRET`.

5. **Déploiement** : `firebase deploy --only functions,firestore:rules`.
   Vérifiez ensuite dans la console GCP (Cloud Scheduler) que le job créé
   pour `syncBridgeTransactionsDaily` existe et est actif.

6. **Mapping des catégories** (hors périmètre de cette étape) : les
   transactions stockent `category_id` (numérique, tel que renvoyé par
   Bridge) converti en string. Pour afficher un libellé, appelez une fois
   `GET /v3/aggregation/categories` et mettez le résultat en cache — non
   implémenté ici volontairement.

## Utilisation

### Connecter un compte (par utilisateur Firebase Auth)

```
POST /connectBridgeAccount
Authorization: Bearer <Firebase ID token>
```

Crée/authentifie l'utilisateur Bridge correspondant, ouvre une session
Connect, stocke le token dans `bridgeAccounts/{uid}` et renvoie
`{ connectUrl }` — à ouvrir dans un navigateur pour terminer la liaison
bancaire (choix de la banque test en sandbox).

### Synchroniser manuellement (test)

```
POST /syncBridgeTransactions
x-sync-secret: <SYNC_TRIGGER_SECRET>
Content-Type: application/json

{ "userId": "sandbox-test-user" }
```

### Synchronisation automatique

`syncBridgeTransactionsDaily` (Cloud Scheduler, tous les jours à 03:00)
parcourt tous les documents `bridgeAccounts` et resynchronise chaque
utilisateur.

### Tester en local

```bash
cd functions
npm install
npm run build

# Terminal 1 : émulateur Firestore
npx firebase emulators:start --only firestore --project demo-bankingperso

# Terminal 2 : script de test sandbox
npm run test:sync-sandbox
```

Le script crée/authentifie l'utilisateur sandbox `BRIDGE_SANDBOX_TEST_USER_ID`,
ouvre une session Connect (affiche l'URL — à ouvrir manuellement la première
fois pour lier une banque de test), synchronise deux fois de suite, et échoue
si le deuxième passage change le nombre de documents Firestore.
