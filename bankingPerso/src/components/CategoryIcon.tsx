import React from 'react';
import {
  Briefcase, Laptop, TrendingUp, PlusCircle, Home, ShoppingCart, Car,
  Gamepad2, HeartPulse, Repeat, ShoppingBag, MoreHorizontal, HelpCircle,
} from 'lucide-react';

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Briefcase, Laptop, TrendingUp, PlusCircle, Home, ShoppingCart, Car,
  Gamepad2, HeartPulse, Repeat, ShoppingBag, MoreHorizontal,
};

interface Props {
  name: string;
  size?: number;
  className?: string;
}

const CategoryIcon: React.FC<Props> = ({ name, size = 16, className }) => {
  const Icon = ICONS[name] ?? HelpCircle;
  return <Icon size={size} className={className} />;
};

export default CategoryIcon;
