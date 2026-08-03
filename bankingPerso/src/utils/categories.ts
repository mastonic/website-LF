import { Category } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'salaire', name: 'Salaire', icon: 'Briefcase', color: '#10b981', type: 'income' },
  { id: 'freelance', name: 'Freelance', icon: 'Laptop', color: '#14b8a6', type: 'income' },
  { id: 'investissements', name: 'Investissements', icon: 'TrendingUp', color: '#06b6d4', type: 'income' },
  { id: 'autres-revenus', name: 'Autres revenus', icon: 'PlusCircle', color: '#64748b', type: 'income' },

  { id: 'logement', name: 'Logement', icon: 'Home', color: '#ef4444', type: 'expense' },
  { id: 'alimentation', name: 'Alimentation', icon: 'ShoppingCart', color: '#f97316', type: 'expense' },
  { id: 'transport', name: 'Transport', icon: 'Car', color: '#f59e0b', type: 'expense' },
  { id: 'loisirs', name: 'Loisirs', icon: 'Gamepad2', color: '#a855f7', type: 'expense' },
  { id: 'sante', name: 'Santé', icon: 'HeartPulse', color: '#ec4899', type: 'expense' },
  { id: 'abonnements', name: 'Abonnements', icon: 'Repeat', color: '#6366f1', type: 'expense' },
  { id: 'shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#d946ef', type: 'expense' },
  { id: 'autres-depenses', name: 'Autres dépenses', icon: 'MoreHorizontal', color: '#94a3b8', type: 'expense' },
];

export const getCategoryById = (categories: Category[], id: string): Category | undefined =>
  categories.find((c) => c.id === id);
