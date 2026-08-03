export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export interface Transaction {
  id: string;
  date: string; // ISO yyyy-mm-dd
  amount: number; // always positive, sign derived from `type`
  type: TransactionType;
  categoryId: string;
  description: string;
}

export interface Budget {
  categoryId: string;
  monthlyLimit: number;
}

export type Page = 'dashboard' | 'transactions' | 'budgets';
