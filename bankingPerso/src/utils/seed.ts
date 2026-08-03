import { Budget, Transaction } from '../types';

const iso = (monthsAgo: number, day: number): string => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsAgo);
  d.setDate(Math.min(day, 28));
  return d.toISOString().slice(0, 10);
};

export const seedTransactions = (): Transaction[] => {
  const rows: Array<[number, number, number, Transaction['type'], string, string]> = [
    // monthsAgo, day, amount, type, categoryId, description
    [2, 1, 2600, 'income', 'salaire', 'Salaire net'],
    [2, 3, 850, 'income', 'freelance', 'Mission freelance'],
    [2, 5, 1100, 'expense', 'logement', 'Loyer'],
    [2, 7, 320, 'expense', 'alimentation', 'Courses'],
    [2, 10, 65, 'expense', 'transport', 'Carte de transport'],
    [2, 12, 45, 'expense', 'abonnements', 'Streaming & musique'],
    [2, 15, 90, 'expense', 'loisirs', 'Sortie ciné + resto'],
    [2, 20, 55, 'expense', 'sante', 'Pharmacie'],

    [1, 1, 2600, 'income', 'salaire', 'Salaire net'],
    [1, 4, 120, 'income', 'investissements', 'Dividendes'],
    [1, 5, 1100, 'expense', 'logement', 'Loyer'],
    [1, 8, 280, 'expense', 'alimentation', 'Courses'],
    [1, 9, 150, 'expense', 'shopping', 'Vêtements'],
    [1, 11, 65, 'expense', 'transport', 'Carte de transport'],
    [1, 13, 45, 'expense', 'abonnements', 'Streaming & musique'],
    [1, 18, 130, 'expense', 'loisirs', 'Concert'],
    [1, 22, 40, 'expense', 'sante', 'Consultation'],

    [0, 1, 2650, 'income', 'salaire', 'Salaire net'],
    [0, 3, 400, 'income', 'freelance', 'Mission freelance'],
    [0, 5, 1100, 'expense', 'logement', 'Loyer'],
    [0, 6, 300, 'expense', 'alimentation', 'Courses'],
    [0, 9, 65, 'expense', 'transport', 'Carte de transport'],
    [0, 12, 45, 'expense', 'abonnements', 'Streaming & musique'],
    [0, 14, 75, 'expense', 'loisirs', 'Sortie'],
  ];

  return rows.map(([monthsAgo, day, amount, type, categoryId, description], i) => ({
    id: `seed-${i}`,
    date: iso(monthsAgo, day),
    amount,
    type,
    categoryId,
    description,
  }));
};

export const seedBudgets = (): Budget[] => [
  { categoryId: 'logement', monthlyLimit: 1200 },
  { categoryId: 'alimentation', monthlyLimit: 350 },
  { categoryId: 'transport', monthlyLimit: 100 },
  { categoryId: 'loisirs', monthlyLimit: 150 },
  { categoryId: 'sante', monthlyLimit: 80 },
  { categoryId: 'abonnements', monthlyLimit: 60 },
  { categoryId: 'shopping', monthlyLimit: 150 },
  { categoryId: 'autres-depenses', monthlyLimit: 100 },
];
