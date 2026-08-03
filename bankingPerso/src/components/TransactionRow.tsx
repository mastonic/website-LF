import React from 'react';
import { ArrowDownRight, ArrowUpRight, Pencil, Trash2 } from 'lucide-react';
import { Category, Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import CategoryIcon from './CategoryIcon';

interface Props {
  transaction: Transaction;
  category?: Category;
  onEdit?: (t: Transaction) => void;
  onDelete?: (id: string) => void;
}

const TransactionRow: React.FC<Props> = ({ transaction, category, onEdit, onDelete }) => {
  const isIncome = transaction.type === 'income';
  return (
    <div className="flex items-center gap-4 py-3 px-1 group">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${category?.color ?? '#94a3b8'}1a`, color: category?.color ?? '#94a3b8' }}
      >
        <CategoryIcon name={category?.icon ?? 'MoreHorizontal'} size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-900 truncate">
          {transaction.description || category?.name || 'Transaction'}
        </div>
        <div className="text-xs text-slate-400">{category?.name} · {formatDate(transaction.date)}</div>
      </div>
      <div className={`flex items-center gap-1 text-sm font-semibold shrink-0 ${isIncome ? 'text-emerald-600' : 'text-slate-900'}`}>
        {isIncome ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
      </div>
      {(onEdit || onDelete) && (
        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
          {onEdit && (
            <button onClick={() => onEdit(transaction)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
              <Pencil size={14} />
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(transaction.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionRow;
