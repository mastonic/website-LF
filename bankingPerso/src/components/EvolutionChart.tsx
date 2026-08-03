import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Transaction } from '../types';
import { lastNMonthsTotals } from '../utils/analytics';
import { formatCurrency, monthLabel } from '../utils/format';

interface Props {
  transactions: Transaction[];
  months?: number;
}

const EvolutionChart: React.FC<Props> = ({ transactions, months = 6 }) => {
  const data = useMemo(
    () =>
      lastNMonthsTotals(transactions, months).map((m) => ({
        label: monthLabel(m.month),
        Revenus: m.income,
        Dépenses: m.expense,
      })),
    [transactions, months],
  );

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={40} />
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Bar dataKey="Revenus" fill="#10b981" radius={[6, 6, 0, 0]} />
        <Bar dataKey="Dépenses" fill="#ef4444" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default EvolutionChart;
