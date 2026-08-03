import React, { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Category, Transaction } from '../types';
import { expensesByCategory } from '../utils/analytics';
import { formatCurrency } from '../utils/format';

interface Props {
  transactions: Transaction[];
  categories: Category[];
}

const CategoryPieChart: React.FC<Props> = ({ transactions, categories }) => {
  const data = useMemo(
    () => expensesByCategory(transactions, categories).map((d) => ({
      name: d.category.name,
      value: d.total,
      color: d.category.color,
    })),
    [transactions, categories],
  );

  if (data.length === 0) {
    return <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">Aucune dépense ce mois-ci</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} stroke="none" />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default CategoryPieChart;
