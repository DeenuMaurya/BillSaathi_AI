import {
  ArrowLeftRight,
  Download,
  FileText,
  Landmark,
  LayoutDashboard,
  Receipt,
  ScrollText,
  Settings,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /**
   * False until the milestone that builds the destination lands.
   *
   * Unavailable items render as disabled text with a "Soon" marker rather than
   * as links to a 404. The navigation is the clearest statement of what this
   * app does, so it would be actively misleading for it to imply that
   * reconciliation works when no such screen exists yet.
   */
  available: boolean;
}

/** Sidebar order follows docs/APP_FLOW.md section 9. */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, available: true },
  { label: 'Clients', href: '/clients', icon: Users, available: false },
  { label: 'Documents', href: '/documents', icon: FileText, available: false },
  { label: 'Invoices', href: '/invoices', icon: Receipt, available: false },
  { label: 'Bank Statements', href: '/bank-statements', icon: Landmark, available: false },
  {
    label: 'Reconciliation',
    href: '/reconciliation',
    icon: ArrowLeftRight,
    available: false,
  },
  { label: 'Exports', href: '/exports', icon: Download, available: false },
  { label: 'Team', href: '/team', icon: UserCog, available: false },
  { label: 'Settings', href: '/settings', icon: Settings, available: false },
  { label: 'Audit Log', href: '/audit-log', icon: ScrollText, available: false },
];
