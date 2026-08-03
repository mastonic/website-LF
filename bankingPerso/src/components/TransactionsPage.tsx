import React, { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Category, Transaction, TransactionType } from '../types';
import { getCategoryById } from '../utils/categories';
import TransactionRow from './TransactionRow';

interface Props {
  transactions: Transaction[];
  categories: Category[];
  onAdd: () => void;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
}

const TransactionsPage: React.FC<Props> = ({ transactions, categories, onAdd, onEdit, onDelete }) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return [...transactions]
      .filter((t) => (typeFilter === 'all' ? true : t.type === typeFilter))
      .filter((t) => (categoryFilter === 'all' ? true : t.categoryId === categoryFilter))
      .filter((t) => {
        if (!search) return true;
        const category = getCategoryById(categories, t.categoryId);
        const haystack = `${t.description} ${category?.name ?? ''}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, typeFilter, categoryFilter, search, categories]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} transaction(s)</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl px-4 py-2.5 transition-colors"
        >
          <Plus size={16} /> Ajouter
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TransactionType | 'all')}
          className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Tous les types</option>
          <option value="income">Revenus</option>
          <option value="expense">Dépenses</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="divide-y divide-slate-100">
          {filtered.map((t) => (
            <TransactionRow
              key={t.id}
              transaction={t}
              category={getCategoryById(categories, t.categoryId)}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
          {filtered.length === 0 && <p className="text-sm text-slate-400 py-4">Aucune transaction ne correspond.</p>}
        </div>
      </div>
    </div>
  );
};

export default TransactionsPage;
