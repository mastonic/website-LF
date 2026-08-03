import React from 'react';

interface Props {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string; // tailwind classes for icon bg/text
  hint?: string;
}

const StatCard: React.FC<Props> = ({ label, value, icon, accent, hint }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>{icon}</div>
    </div>
    <div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  </div>
);

export default StatCard;
