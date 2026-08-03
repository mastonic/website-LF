import { Category, Transaction } from '../types';
import { monthKey } from './format';

export const filterByMonth = (transactions: Transaction[], month: string): Transaction[] =>
  transactions.filter((t) => monthKey(t.date) === month);

export const totalByType = (transactions: Transaction[], type: Transaction['type']): number =>
  transactions.filter((t) => t.type === type).reduce((sum, t) => sum + t.amount, 0);

export const balanceOf = (transactions: Transaction[]): number =>
  transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

export interface CategoryTotal {
  category: Category;
  total: number;
}

export const expensesByCategory = (transactions: Transaction[], categories: Category[]): CategoryTotal[] => {
  const totals = new Map<string, number>();
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount));

  return Array.from(totals.entries())
    .map(([categoryId, total]) => ({
      category: categories.find((c) => c.id === categoryId) ?? {
        id: categoryId,
        name: categoryId,
        icon: 'MoreHorizontal',
        color: '#94a3b8',
        type: 'expense' as const,
      },
      total,
    }))
    .sort((a, b) => b.total - a.total);
};

export interface MonthlyTotals {
  month: string;
  income: number;
  expense: number;
}

export const lastNMonthsTotals = (transactions: Transaction[], n: number): MonthlyTotals[] => {
  const months: string[] = [];
  const cursor = new Date();
  cursor.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }

  return months.map((month) => {
    const rows = filterByMonth(transactions, month);
    return {
      month,
      income: totalByType(rows, 'income'),
      expense: totalByType(rows, 'expense'),
    };
  });
};
