# bankingPerso

Application de gestion de budget personnel : suivi des revenus/dépenses, catégories, soldes et graphiques d'évolution.

## Démarrer en local

```bash
cd bankingPerso
npm install
npm run dev
```

L'app tourne sur `http://localhost:3001`. Les données (transactions et budgets) sont stockées dans le `localStorage` du navigateur ; un jeu de données de démonstration est chargé au premier lancement.

## Fonctionnalités

- **Tableau de bord** : solde total, revenus/dépenses du mois, taux d'épargne, répartition des dépenses par catégorie, évolution sur 6 mois.
- **Transactions** : ajout, édition, suppression, recherche et filtres par type/catégorie.
- **Budgets** : définition d'une limite mensuelle par catégorie avec suivi visuel de la consommation.

## Stack

React 19, TypeScript, Vite, Tailwind CSS (CDN), Recharts, lucide-react.
