import React from 'react';
import { LayoutDashboard, List, PiggyBank, Wallet, Plus } from 'lucide-react';
import { Page } from '../types';

interface Props {
  page: Page;
  onNavigate: (page: Page) => void;
  onAddTransaction: () => void;
}

const NAV: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard size={18} /> },
  { id: 'transactions', label: 'Transactions', icon: <List size={18} /> },
  { id: 'budgets', label: 'Budgets', icon: <PiggyBank size={18} /> },
];

const Sidebar: React.FC<Props> = ({ page, onNavigate, onAddTransaction }) => (
  <aside className="w-full md:w-64 md:h-screen md:sticky md:top-0 bg-white border-r border-slate-200 flex md:flex-col justify-between">
    <div className="p-6 flex md:flex-col items-center md:items-stretch gap-8 w-full">
      <div className="flex items-center gap-2 text-slate-900">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
          <Wallet size={18} />
        </div>
        <span className="font-bold text-lg tracking-tight">bankingPerso</span>
      </div>

      <nav className="flex md:flex-col gap-1 flex-1">
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              page === item.id
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {item.icon}
            <span className="hidden md:inline">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>

    <div className="p-6 hidden md:block">
      <button
        onClick={onAddTransaction}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl py-3 transition-colors"
      >
        <Plus size={16} /> Nouvelle transaction
      </button>
    </div>
  </aside>
);

export default Sidebar;
