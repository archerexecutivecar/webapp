'use client';

import {
  ArrowLeftRight, BadgeCheck, Bell, Calculator, CalendarCheck, Car,
  ChevronsLeft, ChevronsRight, CreditCard, ExternalLink, FileText,
  LayoutDashboard, LogOut, type LucideIcon, Megaphone, Menu, MessageSquare,
  Monitor, Moon, Route, Settings, ShieldAlert, ShieldCheck, Sun, Tag,
  UserCheck, Users, Wallet, X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { type NavGroup, type NavItem, useSession } from '@/lib/session';
import { ThemeMode, useTheme } from '@/lib/theme';
import { ArcherLogo } from './ArcherLogo';

const COLLAPSE_KEY = 'archer_admin_sidebar_collapsed';

const ICON_MAP: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  route: Route,
  users: Users,
  'user-check': UserCheck,
  car: Car,
  bell: Bell,
  'credit-card': CreditCard,
  calculator: Calculator,
  tag: Tag,
  settings: Settings,
  'file-text': FileText,
  'shield-check': ShieldCheck,
  'message-square': MessageSquare,
  'shield-alert': ShieldAlert,
  'calendar-check': CalendarCheck,
  'arrow-left-right': ArrowLeftRight,
  'badge-check': BadgeCheck,
  megaphone: Megaphone,
  wallet: Wallet,
};

export interface NavItemConfig {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number | string;
  matchHrefs?: string[];
  description?: string;
  available?: boolean;
}

export interface NavGroupConfig {
  key: string;
  label: string;
  items: NavItemConfig[];
}

function resolveIcon(name?: string): LucideIcon {
  if (!name) return LayoutDashboard;
  return ICON_MAP[name] ?? LayoutDashboard;
}

function mapServerGroups(groups: NavGroup[]): NavGroupConfig[] {
  return groups.map((g) => ({
    key: g.key,
    label: g.label,
    items: g.items.map((i: NavItem) => ({
      key: i.key,
      label: i.label,
      href: i.href,
      icon: resolveIcon(i.icon),
      badge: i.badge,
      available: i.available,
      matchHrefs: [i.href],
    })),
  }));
}

export function useCurrentItem() {
  const pathname = usePathname();
  const { groups: serverGroups } = useSession();

  const groups = useMemo(() => mapServerGroups(serverGroups), [serverGroups]);

  return useMemo(() => {
    for (const g of groups) {
      for (const i of g.items) {
        if (pathname === i.href) return { group: g, item: i };
        if (i.matchHrefs?.includes(pathname)) return { group: g, item: i };
        if (i.href !== '/dashboard' && i.href !== '/' && pathname.startsWith(i.href + '/')) {
          return { group: g, item: i };
        }
      }
    }

    // Settings hub aliases when CMS pages are nested under settings UX
    if (pathname.startsWith('/settings')) {
      return {
        group: { key: 'setup', label: 'SETUP', items: [] },
        item: { key: 'settings', label: 'Settings', href: '/settings', icon: Settings },
      };
    }

    return null;
  }, [groups, pathname]);
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { me, groups: serverGroups, logout } = useSession();
  const pathname = usePathname();
  const current = useCurrentItem();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);

  const groups = useMemo(() => mapServerGroups(serverGroups), [serverGroups]);

  useEffect(() => { try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1'); } catch { /* ignore */ } }, []);
  useEffect(() => { setDrawer(false); }, [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function toggleCollapse() {
    setCollapsed((c) => { try { localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1'); } catch { /* ignore */ } return !c; });
  }

  return (
    <div className={`shell${collapsed ? ' is-collapsed' : ''}${drawer ? ' drawer-open' : ''}`}>
      <aside className="sidebar" id="sidebar" aria-label="Main navigation">
        <div className="sb-head">
          <Link href="/dashboard" className="wordmark" aria-label="Archer Admin home" title="Archer Admin Home">
            <ArcherLogo size={26} />
            <div className="wm-text-group">
              <span className="wm-rest">ARCHER</span>
              <span className="wm-sub">Executive</span>
            </div>
          </Link>
          <button className="icon-btn sb-close" onClick={() => setDrawer(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="sb-nav">
          {groups.map((group, gIdx) => (
            <div key={group.key} className="sb-group" style={{ marginTop: gIdx === 0 ? 4 : 22 }}>
              <div className="sb-label">{group.label}</div>
              <ul className="sb-list">
                {group.items.map((item) => {
                  const active = current?.item.key === item.key;
                  const Icon = item.icon;
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        className={`sb-link${active ? ' active' : ''}`}
                        aria-current={active ? 'page' : undefined}
                        title={item.label}
                      >
                        {Icon && <Icon size={18} className="sb-icon" aria-hidden />}
                        <span className="sb-text">{item.label}</span>
                        {item.badge != null && (
                          <span className="sb-badge">{item.badge}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="sb-footer">
          <button
            className="sb-collapse-btn"
            onClick={toggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            data-tip={collapsed ? 'Expand' : undefined}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /><span className="sb-text">Collapse</span></>}
          </button>
        </div>
      </aside>

      {drawer && <div className="scrim" onClick={() => setDrawer(false)} aria-hidden />}

      <div className="main-col">
        <header className="header">
          <button
            className="icon-btn menu-btn"
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
            aria-controls="sidebar"
            aria-expanded={drawer}
          >
            <Menu size={20} />
          </button>

          <div className="header-title-wrap">
            <h1 className="page-title">{current?.item.label ?? 'Admin'}</h1>
          </div>

          <div className="header-actions">
            <a
              href={process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-muted/60 hover:bg-muted text-foreground transition border border-border"
              title="Open public website in new tab"
            >
              <ExternalLink size={14} className="text-muted-foreground" />
              <span>Live Website</span>
            </a>
            <ThemeMenu />
            <NotificationsMenu />
            <ProfileMenu name={me?.name ?? ''} roles={me?.roles ?? []} email={me?.email ?? ''} onLogout={logout} />
          </div>
        </header>

        <main className="content" id="content">
          {children}
        </main>
      </div>
    </div>
  );
}

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return { open, setOpen, ref };
}

function ThemeMenu() {
  const { mode, setMode } = useTheme();
  const { open, setOpen, ref } = usePopover();
  const opts: { v: ThemeMode; label: string; Icon: LucideIcon }[] = [
    { v: 'light', label: 'Light', Icon: Sun }, { v: 'dark', label: 'Dark', Icon: Moon }, { v: 'system', label: 'System', Icon: Monitor },
  ];
  const Cur = opts.find((o) => o.v === mode)!.Icon;
  return (
    <div className="pop-wrap" ref={ref}>
      <button className="icon-btn" aria-label={`Theme: ${mode}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}><Cur size={18} /></button>
      {open && (
        <div className="popover" role="menu" aria-label="Theme">
          {opts.map(({ v, label, Icon }) => (
            <button key={v} role="menuitemradio" aria-checked={mode === v} className={`menu-item${mode === v ? ' selected' : ''}`} onClick={() => { setMode(v); setOpen(false); }}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export interface AdminNotification {
  id: string;
  ride_request_id?: string | number | null;
  ride_reference?: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

function NotificationsMenu() {
  const { open, setOpen, ref } = usePopover();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestToast, setLatestToast] = useState<AdminNotification | null>(null);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const res = await api<{ notifications: AdminNotification[]; unread_count: number }>('/admin/notifications', { auth: true });
      if (res.unread_count > unreadCount && res.notifications.length > 0) {
        const newest = res.notifications[0];
        if (!newest.is_read) {
          setLatestToast(newest);
          setTimeout(() => setLatestToast(null), 8000);
        }
      }
      setNotifications(res.notifications);
      setUnreadCount(res.unread_count);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 12000);
    return () => clearInterval(interval);
  }, [unreadCount]);

  const markAllRead = async () => {
    try {
      await api('/admin/notifications/all/read', { method: 'PUT', auth: true });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = async (n: AdminNotification) => {
    setOpen(false);
    setLatestToast(null);
    try {
      if (!n.is_read) {
        await api(`/admin/notifications/${n.id}/read`, { method: 'PUT', auth: true });
      }
    } catch {
      // ignore
    }
    if (n.ride_reference) {
      router.push(`/rides?q=${encodeURIComponent(n.ride_reference)}`);
    } else if (n.ride_request_id) {
      router.push(`/rides?id=${encodeURIComponent(String(n.ride_request_id))}`);
    } else {
      router.push('/rides');
    }
  };

  return (
    <>
      <div className="pop-wrap" ref={ref}>
        <button
          className="icon-btn notif-bell-btn"
          aria-label="Notifications"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>

        {open && (
          <div className="popover notif-popover" role="dialog" aria-label="Notifications">
            <div className="notif-head">
              <strong>Notifications</strong>
              {unreadCount > 0 && (
                <button className="text-xs text-primary" onClick={markAllRead}>Mark all read</button>
              )}
            </div>
            <ul className="notif-list">
              {notifications.length === 0 && <li className="notif-empty">No notifications</li>}
              {notifications.map((n) => (
                <li key={n.id}>
                  <button className={`notif-item${n.is_read ? '' : ' unread'}`} onClick={() => handleNotificationClick(n)}>
                    <span className="notif-title">{n.title}</span>
                    <span className="notif-msg">{n.message}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {latestToast && (
        <button className="notif-toast" onClick={() => handleNotificationClick(latestToast)}>
          <strong>{latestToast.title}</strong>
          <span>{latestToast.message}</span>
        </button>
      )}
    </>
  );
}

function ProfileMenu({ name, roles, email, onLogout }: { name: string; roles: string[]; email: string; onLogout: () => void }) {
  const { open, setOpen, ref } = usePopover();
  return (
    <div className="pop-wrap" ref={ref}>
      <button className="avatar-btn" aria-label="Account menu" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="avatar-initials">{(name || email || 'A').slice(0, 1).toUpperCase()}</span>
      </button>
      {open && (
        <div className="popover profile-popover" role="menu">
          <div className="profile-meta">
            <strong>{name || 'Staff'}</strong>
            <span>{email}</span>
            <span className="profile-roles">{roles.join(', ')}</span>
          </div>
          <button role="menuitem" className="menu-item danger" onClick={onLogout}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
