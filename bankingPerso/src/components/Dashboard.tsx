import React, { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, PiggyBank, Wallet } from 'lucide-react';
import { Category, Transaction } from '../types';
import { balanceOf, expensesByCategory, filterByMonth, totalByType } from '../utils/analytics';
import { currentMonthKey, formatCurrency } from '../utils/format';
import { getCategoryById } from '../utils/categories';
import StatCard from './StatCard';
import CategoryPieChart from './CategoryPieChart';
import EvolutionChart from './EvolutionChart';
import TransactionRow from './TransactionRow';

interface Props {
  transactions: Transaction[];
  categories: Category[];
}

const Dashboard: React.FC<Props> = ({ transactions, categories }) => {
  const monthTransactions = useMemo(() => filterByMonth(transactions, currentMonthKey()), [transactions]);
  const income = totalByType(monthTransactions, 'income');
  const expense = totalByType(monthTransactions, 'expense');
  const balance = balanceOf(transactions);
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

  const topCategories = useMemo(
    () => expensesByCategory(monthTransactions, categories).slice(0, 4),
    [monthTransactions, categories],
  );

  const recent = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
    [transactions],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="text-sm text-slate-500 mt-1">Vue d'ensemble de vos finances ce mois-ci</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Solde total"
          value={formatCurrency(balance)}
          icon={<Wallet size={16} />}
          accent="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Revenus (mois)"
          value={formatCurrency(income)}
          icon={<ArrowUpRight size={16} />}
          accent="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Dépenses (mois)"
          value={formatCurrency(expense)}
          icon={<ArrowDownRight size={16} />}
          accent="bg-red-50 text-red-600"
        />
        <StatCard
          label="Taux d'épargne"
          value={`${savingsRate}%`}
          icon={<PiggyBank size={16} />}
          accent="bg-amber-50 text-amber-600"
          hint={income - expense >= 0 ? 'Épargne positive' : 'Dépenses > revenus'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Dépenses par catégorie (mois)</h3>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <CategoryPieChart transactions={monthTransactions} categories={categories} />
            </div>
            <div className="flex flex-col gap-2 w-full md:w-40">
              {topCategories.map(({ category, total }) => (
                <div key={category.id} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
                  <span className="text-slate-600 truncate flex-1">{category.name}</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(total)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Évolution (6 derniers mois)</h3>
          <EvolutionChart transactions={transactions} months={6} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Transactions récentes</h3>
        <div className="divide-y divide-slate-100">
          {recent.map((t) => (
            <TransactionRow key={t.id} transaction={t} category={getCategoryById(categories, t.categoryId)} />
          ))}
          {recent.length === 0 && <p className="text-sm text-slate-400 py-4">Aucune transaction encore.</p>}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
