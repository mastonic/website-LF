import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Category, Transaction, TransactionType } from '../types';

interface Props {
  categories: Category[];
  initial?: Transaction | null;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'> & { id?: string }) => void;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

const TransactionModal: React.FC<Props> = ({ categories, initial, onClose, onSave }) => {
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [date, setDate] = useState(initial?.date ?? todayIso());
  const [description, setDescription] = useState(initial?.description ?? '');

  const availableCategories = categories.filter((c) => c.type === type);

  useEffect(() => {
    if (!availableCategories.some((c) => c.id === categoryId)) {
      setCategoryId(availableCategories[0]?.id ?? '');
    }
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0 || !categoryId || !date) return;
    onSave({ id: initial?.id, type, amount: parsedAmount, categoryId, date, description });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            {initial ? 'Modifier la transaction' : 'Nouvelle transaction'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 bg-slate-100 rounded-xl p-1">
            {(['expense', 'income'] as TransactionType[]).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setType(t)}
                className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                  type === t ? 'bg-white shadow text-slate-900' : 'text-slate-500'
                }`}
              >
                {t === 'expense' ? 'Dépense' : 'Revenu'}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Montant (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Catégorie</label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Optionnel"
            />
          </div>

          <button
            type="submit"
            className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl py-3 transition-colors"
          >
            Enregistrer
          </button>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
