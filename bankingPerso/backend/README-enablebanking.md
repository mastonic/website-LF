# Enable Banking → Firestore

Deuxième source de données pour le même backend Firebase que Bridge
(`bankingPerso/backend/`) : Enable Banking, en mode **production restreinte**
(gratuit, comptes liés par vous-même uniquement). Pas de sandbox pour ce
fournisseur — chaque appel touche un vrai compte bancaire réel.

## ⚠️ Ce qui a pu être vérifié, et ce qui ne l'a pas pu

Comme pour Bridge, l'accès sortant vers `enablebanking.com` (doc *et* API)
est **bloqué au niveau réseau** dans cet environnement (`403`, politique de
proxy). Contrairement à Bridge, j'ai cependant pu atteindre
`raw.githubusercontent.com`, ce qui a changé la qualité de la vérification :

- **Vérifié sur du code source réel, pas seulement des snippets** :
  - le [repo d'exemples officiel d'Enable Banking](https://github.com/enablebanking/enablebanking-api-samples)
    (`python_example/account_information.py`) — flux complet `/auth` →
    `/sessions` → `/accounts/{uid}/balances` → `/accounts/{uid}/transactions`,
    format exact du JWT (`kid` = application id, `iss` = `"enablebanking.com"`,
    `aud` = `"api.enablebanking.com"`) ;
  - [ynabber](https://github.com/martinohansen/ynabber) (`reader/enablebanking/`),
    une intégration tierce réelle et maintenue, qui confirme les mêmes
    endpoints et les champs de la ressource transaction ;
  - des fichiers de schéma JSON communautaires (`api-evangelist/enable-banking`)
    qui détaillent `transaction_amount.amount` (chaîne décimale, pas un
    nombre !), `credit_debit_indicator` (`CRDT`/`DBIT`), `creditor`/`debtor`.
- **Non vérifié en direct** : la doc officielle elle-même n'a jamais été
  ouverte depuis cet environnement. Les limites de débit précises en mode
  "Restricted Production" viennent d'une source tierce (pas d'Enable Banking
  lui-même) qui cite la règle EBA RTS "4 appels AIS/jour/consentement sans
  PSU présent" — plausible et cohérente avec le standard PSD2, mais pas une
  confirmation officielle Enable Banking. Le cron quotidien (1x/jour) reste
  largement dans cette limite documentée.
- Le champ `transaction_id` peut être absent selon la banque (le propre blog
  d'Enable Banking a un article dédié à ce problème) — j'ai donc implémenté
  une clé de repli déterministe (hash SHA-256 de champs stables) pour que
  l'upsert reste sans doublon même sans identifiant unique. **Vérifié** avec
  l'émulateur Firestore et des réponses simulées (voir plus bas).
- **Aucun appel réel n'a été fait** contre l'API Enable Banking ni contre
  votre compte Revolut — ni pendant le développement, ni depuis. Le script de
  test a une porte de sécurité explicite (`I_UNDERSTAND_THIS_CALLS_PRODUCTION=yes`)
  qui bloque tout appel réel tant qu'elle n'est pas positionnée volontairement.

## Ce qui a été vérifié localement (sans réseau vers enablebanking.com)

- Génération du JWT : signé avec une clé RSA jetable, header (`alg: RS256`,
  `kid: <client_id>`) et claims (`iss`, `aud`, `iat`, `exp`) corrects, et
  signature vérifiée avec la clé publique correspondante.
- `syncEnableBankingTransactionsForUser` avec des réponses `/transactions`
  simulées : normalisation correcte (signe du montant selon
  `credit_debit_indicator`, marchand tiré de `creditor`/`debtor` selon le
  sens, `category: "uncategorized"`), et un deuxième passage ne crée aucun
  doublon — y compris pour une transaction sans `transaction_id` (clé de
  repli par hash).
- `npm install`, `npx tsc --noEmit`, `npm run build` passent sans erreur.

## Où placer la clé privée

```
bankingPerso/backend/functions/keys/enablebanking-private-key.pem
```

Ce chemin est déjà celui configuré dans `.env.local`
(`ENABLE_BANKING_PRIVATE_KEY_PATH=./keys/enablebanking-private-key.pem`,
relatif à `functions/`). Le dossier `keys/` et tout fichier `*.pem` sont
gitignorés — le fichier ne sera jamais commité. Le code Node accepte aussi
bien un `.pem` au format PKCS#1 (`BEGIN RSA PRIVATE KEY`) que PKCS#8
(`BEGIN PRIVATE KEY`) sans conversion.

La clé privée n'est **jamais loggée**, même partiellement : les erreurs de
lecture/parsing du fichier n'incluent que le chemin, jamais le contenu.

## Comment ça marche (mode Restricted Production)

Contrairement à Bridge, il n'y a pas de fonction `connectEnableBankingAccount`
ici — en mode restreint, la liaison du compte se fait via le **Control
Panel** d'Enable Banking directement (bouton "Activate by linking accounts"),
pas via un flux OAuth déclenché par notre backend pour un utilisateur final
quelconque.

Cela dit, l'API Enable Banking scope toujours l'accès aux comptes derrière
une **session** (`/auth` → consentement navigateur → `/sessions`), même en
mode restreint. Deux cas possibles, à clarifier ensemble avant d'aller plus
loin :

1. **Le Control Panel expose déjà un `session_id`** utilisable directement —
   dans ce cas on peut peupler `enableBankingSessions/{userId}` à la main
   avec ce `session_id` et la liste de comptes, sans script interactif.
2. **Aucun `session_id` n'est exposé** — il faut alors exécuter une fois
   `npm run bootstrap:enable-banking`, qui ouvre le flux `/auth` pour VOTRE
   propre compte Revolut, vous laisse compléter le consentement dans un
   navigateur, et enregistre la session obtenue dans Firestore.

**On confirme ensemble laquelle des deux situations s'applique avant de
lancer quoi que ce soit en réel.**

Une fois `enableBankingSessions/{userId}` peuplé (par l'une ou l'autre voie),
`syncEnableBankingTransactions` n'a plus besoin de refaire cette étape :
- récupère les comptes depuis Firestore,
- appelle `/accounts/{uid}/transactions` avec pagination (`continuation_key`)
  depuis la dernière synchro,
- upsert dans `transactions/enablebanking_{accountUid}_{id-ou-hash}`.

Le consentement PSD2 expire après un maximum de 180 jours (souvent moins,
selon la banque) — au-delà, `syncEnableBankingTransactions` échouera avec une
erreur d'autorisation claire, et il faudra relancer le bootstrap.

## Utilisation

### Synchroniser manuellement (test)

```
POST /syncEnableBankingTransactions
x-sync-secret: <SYNC_TRIGGER_SECRET>   # même secret que Bridge
Content-Type: application/json

{ "userId": "me" }
```

### Synchronisation automatique

`syncEnableBankingTransactionsDaily` (Cloud Scheduler, tous les jours à
04:00 — décalé d'une heure par rapport à Bridge) parcourt tous les documents
`enableBankingSessions` et resynchronise chaque compte.

### Tester en local

```bash
cd functions
npm install
npm run build

# Terminal 1 : émulateur Firestore
npx firebase emulators:start --only firestore --project demo-bankingperso

# Terminal 2, une seule fois : lier le compte (flux interactif, appel réel)
npm run bootstrap:enable-banking

# Terminal 2, ensuite : tester la synchro (appel réel — voir la porte de
# sécurité I_UNDERSTAND_THIS_CALLS_PRODUCTION dans .env.local)
npm run test:sync-enablebanking
```

`test:sync-enablebanking` liste les comptes de la session stockée, vérifie
(optionnellement) qu'un compte avec l'IBAN attendu (`ENABLE_BANKING_EXPECTED_IBAN`,
masqué dans les logs) est présent, puis synchronise deux fois de suite pour
confirmer l'absence de doublons.

## Dépannage

- **401 sur tout appel** : JWT invalide/expiré (durée de vie configurable via
  `ENABLE_BANKING_JWT_TTL_SECONDS`, max 24h imposé par Enable Banking), ou
  session expirée/révoquée côté banque → relancer le bootstrap.
- **429** : le client réessaie automatiquement avec backoff exponentiel
  (1s → 2s → 4s... plafonné à 60s, avec jitter, en respectant `Retry-After`
  si présent) jusqu'à 5 tentatives.
- **Format de clé rejeté** : convertir en PKCS#8 avec
  `openssl pkcs8 -topk8 -nocrypt -in key.pem -out key8.pem` si besoin.

## Hors périmètre (volontairement, pour cette étape)

- Pas de dashboard/UI, pas d'agent IA, pas de logique d'alertes/seuils.
- Pas de catégorisation automatique — tout est `"uncategorized"`, Enable
  Banking ne catégorise pas les transactions (contrairement à Bridge).
- Pas de gestion des transactions `pending` (non booked) — seules les
  transactions du tableau `transactions` (booked) de la réponse API sont
  synchronisées.
