import React, { useState } from 'react';
import { Budget, Page, Transaction } from './types';
import { DEFAULT_CATEGORIES } from './utils/categories';
import { seedBudgets, seedTransactions } from './utils/seed';
import { useLocalStorage } from './hooks/useLocalStorage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TransactionsPage from './components/TransactionsPage';
import BudgetsPage from './components/BudgetsPage';
import TransactionModal from './components/TransactionModal';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('dashboard');
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('bankingperso.transactions', seedTransactions);
  const [budgets, setBudgets] = useLocalStorage<Budget[]>('bankingperso.budgets', seedBudgets);
  const [modalTransaction, setModalTransaction] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openAddModal = () => {
    setModalTransaction(null);
    setIsModalOpen(true);
  };

  const openEditModal = (t: Transaction) => {
    setModalTransaction(t);
    setIsModalOpen(true);
  };

  const handleSave: React.ComponentProps<typeof TransactionModal>['onSave'] = (data) => {
    if (data.id) {
      setTransactions((prev) => prev.map((t) => (t.id === data.id ? { ...t, ...data, id: data.id! } : t)));
    } else {
      setTransactions((prev) => [...prev, { ...data, id: crypto.randomUUID() }]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUpdateBudget = (categoryId: string, monthlyLimit: number) => {
    setBudgets((prev) => {
      const exists = prev.some((b) => b.categoryId === categoryId);
      if (exists) return prev.map((b) => (b.categoryId === categoryId ? { ...b, monthlyLimit } : b));
      return [...prev, { categoryId, monthlyLimit }];
    });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      <Sidebar page={page} onNavigate={setPage} onAddTransaction={openAddModal} />

      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
        {page === 'dashboard' && <Dashboard transactions={transactions} categories={DEFAULT_CATEGORIES} />}
        {page === 'transactions' && (
          <TransactionsPage
            transactions={transactions}
            categories={DEFAULT_CATEGORIES}
            onAdd={openAddModal}
            onEdit={openEditModal}
            onDelete={handleDelete}
          />
        )}
        {page === 'budgets' && (
          <BudgetsPage
            transactions={transactions}
            categories={DEFAULT_CATEGORIES}
            budgets={budgets}
            onUpdateBudget={handleUpdateBudget}
          />
        )}
      </main>

      {isModalOpen && (
        <TransactionModal
          categories={DEFAULT_CATEGORIES}
          initial={modalTransaction}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default App;
