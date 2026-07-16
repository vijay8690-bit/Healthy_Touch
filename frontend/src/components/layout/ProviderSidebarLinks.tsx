import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  Beaker,
  Ambulance,
  User,
  DollarSign,
  ShoppingCart,
  PlusCircle,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { User as AppUser } from '@/types/api.types';

type ProviderSidebarLink = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  href: string;
  categories?: string[];
};

const normalizeCategory = (value?: string) =>
  value?.trim().toLowerCase().replace(/[\s_-]+/g, '');

const LAB_CATEGORIES = ['labtechnician', 'lab', 'laboratory'];
const AMBULANCE_CATEGORIES = ['ambulance'];

export const providerSidebarLinks: ProviderSidebarLink[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/provider/dashboard' },
  { icon: Calendar, label: 'Appointments', href: '/provider/appointments' },
  { icon: Users, label: 'Patients', href: '/provider/patients' },
  { icon: Beaker, label: 'Manage Lab Tests', href: '/provider/lab-tests', categories: LAB_CATEGORIES },
  { icon: PlusCircle, label: 'Add Test From Master', href: '/provider/lab-tests/master', categories: LAB_CATEGORIES },
  { icon: Ambulance, label: 'Ambulance Requests', href: '/provider/ambulance', categories: AMBULANCE_CATEGORIES },
  { icon: FileText, label: 'Notes', href: '/provider/notes' },
  { icon: DollarSign, label: 'Earnings', href: '/provider/earnings' },
  { icon: ShoppingCart, label: 'Coins Cart', href: '/provider/coins' },
  { icon: User, label: 'Profile', href: '/provider/profile' },
];

export const getProviderSidebarLinks = (user?: Pick<AppUser, 'providerCategory' | 'category'> | null) => {
  const providerCategory = normalizeCategory(user?.providerCategory || user?.category);

  return providerSidebarLinks.filter((link) => {
    if (!link.categories) return true;
    return providerCategory ? link.categories.includes(providerCategory) : false;
  });
};
