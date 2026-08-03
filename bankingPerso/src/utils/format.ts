export const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

export const formatDate = (isoDate: string): string =>
  new Date(isoDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

export const monthKey = (isoDate: string): string => isoDate.slice(0, 7); // yyyy-mm

export const monthLabel = (key: string): string => {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
};

export const currentMonthKey = (): string => new Date().toISOString().slice(0, 7);
