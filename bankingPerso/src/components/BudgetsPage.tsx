import React, { useMemo } from 'react';
import { Budget, Category, Transaction } from '../types';
import { currentMonthKey, formatCurrency } from '../utils/format';
import { filterByMonth } from '../utils/analytics';
import CategoryIcon from './CategoryIcon';

interface Props {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  onUpdateBudget: (categoryId: string, monthlyLimit: number) => void;
}

const BudgetsPage: React.FC<Props> = ({ transactions, categories, budgets, onUpdateBudget }) => {
  const monthTransactions = useMemo(() => filterByMonth(transactions, currentMonthKey()), [transactions]);
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  const spentByCategory = useMemo(() => {
    const totals = new Map<string, number>();
    monthTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount));
    return totals;
  }, [monthTransactions]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Budgets mensuels</h1>
        <p className="text-sm text-slate-500 mt-1">Définissez une limite par catégorie et suivez vos dépenses</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {expenseCategories.map((category) => {
          const budget = budgets.find((b) => b.categoryId === category.id);
          const limit = budget?.monthlyLimit ?? 0;
          const spent = spentByCategory.get(category.id) ?? 0;
          const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
          const over = limit > 0 && spent > limit;

          return (
            <div key={category.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${category.color}1a`, color: category.color }}
                  >
                    <CategoryIcon name={category.icon} size={16} />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{category.name}</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <input
                    type="number"
                    min="0"
                    value={limit || ''}
                    onChange={(e) => onUpdateBudget(category.id, parseFloat(e.target.value) || 0)}
                    className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                  />
                  <span className="text-slate-400">€</span>
                </div>
              </div>

              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : 'bg-indigo-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex items-center justify-between mt-2 text-xs">
                <span className={over ? 'text-red-600 font-semibold' : 'text-slate-500'}>
                  {formatCurrency(spent)} dépensés
                </span>
                <span className="text-slate-400">sur {limit > 0 ? formatCurrency(limit) : '—'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BudgetsPage;
