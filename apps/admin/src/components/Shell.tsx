'use client';

import {
  Bell, Car, ChevronsLeft, ChevronsRight, ExternalLink, LogOut,
  type LucideIcon, Menu, Monitor, Moon, Sun, X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { ThemeMode, useTheme } from '@/lib/theme';
import { ArcherLogo } from './ArcherLogo';

const COLLAPSE_KEY = 'archer_admin_sidebar_collapsed';

export interface NavItemConfig {
  key: string;
  label: string;
  href: string;
  badge?: number | string;
  matchHrefs?: string[];
  description?: string;
}

export interface NavGroupConfig {
  key: string;
  label: string;
  items: NavItemConfig[];
}

export const ADMIN_SIDEBAR_GROUPS: NavGroupConfig[] = [
  {
    key: 'operations',
    label: 'OPERATIONS',
    items: [
      { key: 'dashboard', label: 'Dashboard', href: '/dashboard', matchHrefs: ['/dashboard', '/'] },
      { key: 'rides', label: 'Ride requests', href: '/rides', badge: 4, matchHrefs: ['/rides'] },
      { key: 'customers', label: 'Clients', href: '/customers', matchHrefs: ['/customers'] },
      { key: 'drivers', label: 'Drivers', href: '/drivers', badge: 1, matchHrefs: ['/drivers'] },
      { key: 'notices', label: 'Customer notices', href: '/notices', description: 'Broadcast notices, SMS updates, and customer advisories' },
    ],
  },
  {
    key: 'money',
    label: 'MONEY',
    items: [
      { key: 'pricing', label: 'Payments & earnings', href: '/pricing', matchHrefs: ['/pricing', '/payments'] },
      { key: 'payroll', label: 'Weekly payroll', href: '/payroll', description: 'Weekly chauffeur payroll calculations and direct disbursements' },
    ],
  },
  {
    key: 'setup',
    label: 'SETUP',
    items: [
      { key: 'fleet', label: 'Fleet & availability', href: '/site-vehicles', matchHrefs: ['/site-vehicles', '/fleet'] },
      { key: 'rates', label: 'Vehicles & rates', href: '/site-rates', matchHrefs: ['/site-rates', '/rates'] },
      { key: 'settings', label: 'Settings', href: '/settings', matchHrefs: ['/settings', '/site-content', '/site-tiers', '/testimonials'] },
    ],
  },
  {
    key: 'security_phase_2',
    label: 'SECURITY · PHASE 2',
    items: [
      { key: 'security-leads', label: 'Security leads', href: '/security/leads', badge: 1, description: 'Executive protection client inquiries, threat intake, and armed detail leads' },
      { key: 'contracts-shifts', label: 'Contracts & shifts', href: '/security/contracts', badge: 2, description: 'Security detail assignments, recurring client contracts, and armed officer shifts' },
      { key: 'swap-approvals', label: 'Swap approvals', href: '/security/swaps', badge: 1, description: 'Driver and security guard shift exchange requests and supervisor sign-offs' },
      { key: 'credentials', label: 'Credentials', href: '/security/credentials', badge: 2, description: 'Armed guard carry permits, law enforcement credentials, and background checks' },
      { key: 'announcements', label: 'Announcements', href: '/security/announcements', description: 'Operational bulletins, safety advisories, and driver briefing announcements' },
    ],
  },
];

export const DRIVER_SIDEBAR_GROUPS: NavGroupConfig[] = [
  {
    key: 'operations',
    label: 'OPERATIONS',
    items: [
      { key: 'driver-portal', label: 'My Assigned Rides', href: '/my-rides', matchHrefs: ['/my-rides'] },
    ],
  },
];

export function useCurrentItem() {
  const pathname = usePathname();
  const { me } = useSession();

  const groups = useMemo(() => {
    const isOnlyDriver = me?.roles?.includes('driver') && !me?.roles?.some(r => ['super_admin', 'dispatcher', 'driver_manager', 'content_editor', 'content_publisher'].includes(r));
    return isOnlyDriver ? DRIVER_SIDEBAR_GROUPS : ADMIN_SIDEBAR_GROUPS;
  }, [me]);

  return useMemo(() => {
    for (const g of groups) {
      for (const i of g.items) {
        if (pathname === i.href) return { group: g, item: i };
        if (i.matchHrefs?.includes(pathname)) return { group: g, item: i };
        if (i.href !== '/dashboard' && i.href !== '/' && pathname.startsWith(i.href + '/')) return { group: g, item: i };
      }
    }
    // Check aliases
    if (pathname === '/site-content') return { group: { key: 'setup', label: 'SETUP' }, item: { key: 'site-content', label: 'Page Content', href: '/site-content', description: 'Public website content, hero messaging, and service copy' } };
    if (pathname === '/site-tiers') return { group: { key: 'setup', label: 'SETUP' }, item: { key: 'site-tiers', label: 'Website Tiers', href: '/site-tiers', description: 'Chauffeur security credentials and Tier 1-4 requirements' } };
    if (pathname === '/testimonials') return { group: { key: 'setup', label: 'SETUP' }, item: { key: 'testimonials', label: 'Testimonials', href: '/testimonials', description: 'Verified executive and celebrity client reviews' } };
    if (pathname === '/my-rides') return { group: { key: 'operations', label: 'OPERATIONS' }, item: { key: 'my-rides', label: 'My Assigned Rides', href: '/my-rides', description: 'Assigned chauffeur dispatch manifests and trip notes' } };

    return null;
  }, [groups, pathname]);
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { me, logout } = useSession();
  const pathname = usePathname();
  const current = useCurrentItem();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);

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

  const isOnlyDriver = me?.roles?.includes('driver') && !me?.roles?.some(r => ['super_admin', 'dispatcher', 'driver_manager', 'content_editor', 'content_publisher'].includes(r));
  const groups = isOnlyDriver ? DRIVER_SIDEBAR_GROUPS : ADMIN_SIDEBAR_GROUPS;

  return (
    <div className={`shell${collapsed ? ' is-collapsed' : ''}${drawer ? ' drawer-open' : ''}`}>
      {/* Sleek Obsidian Single Sidebar (matching approved prototype) */}
      <aside className="sidebar" id="sidebar" aria-label="Main navigation">
        <div className="sb-head">
          <Link href="/dashboard" className="wordmark" aria-label="Archer Admin home">
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
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        className={`sb-link${active ? ' active' : ''}`}
                        aria-current={active ? 'page' : undefined}
                      >
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
          >
            {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /><span className="sb-text">Collapse</span></>}
          </button>
        </div>
      </aside>

      {drawer && <div className="scrim" onClick={() => setDrawer(false)} aria-hidden />}

      {/* Main Workspace Column */}
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

          <div className="crumbs">
            <nav aria-label="Breadcrumb">
              <ol>
                <li>Admin</li>
                {current && <li>{current.group.label}</li>}
                {current && <li aria-current="page">{current.item.label}</li>}
              </ol>
            </nav>
            <div className="page-title">{current?.item.label ?? 'Admin'}</div>
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
  ride_request_id?: string | null;
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

  const handleNotificationClick = (n: AdminNotification) => {
    setOpen(false);
    setLatestToast(null);
    router.push('/rides');
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
          <div className="popover wide notif-popover" role="dialog" aria-label="Notifications">
            <div className="notif-header">
              <div className="pop-title" style={{ margin: 0 }}>
                Operational Alerts {unreadCount > 0 && <span className="unread-dot"></span>}
              </div>
              {unreadCount > 0 && (
                <button type="button" onClick={markAllRead} className="mark-read-btn">
                  Mark all read
                </button>
              )}
            </div>

            <div className="notif-list">
              {notifications.length === 0 ? (
                <p className="empty-text" style={{ padding: '24px 12px', textAlign: 'center' }}>
                  No notifications yet. New customer bookings will appear here instantly.
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`notif-item ${n.is_read ? 'read' : 'unread'}`}
                  >
                    <div className="notif-indicator">
                      <div className="notif-icon-circle">
                        <Car size={13} />
                      </div>
                    </div>
                    <div className="notif-content">
                      <div className="notif-title-row">
                        <span className="notif-title">{n.title}</span>
                        {!n.is_read && <span className="new-badge">NEW</span>}
                      </div>
                      <p className="notif-message">{n.message}</p>
                      <span className="notif-time">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="notif-footer">
                <Link href="/rides" onClick={() => setOpen(false)} className="view-all-link">
                  Open Rides & Dispatch Center →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {latestToast && (
        <div className="floating-booking-toast">
          <div className="toast-left">
            <div className="toast-icon-box">
              <Bell size={18} className="toast-bell-icon" />
            </div>
            <div>
              <div className="toast-title">
                {latestToast.title}
                <span className="toast-live-badge">Live Booking</span>
              </div>
              <p className="toast-message">{latestToast.message}</p>
            </div>
          </div>
          <div className="toast-actions">
            <button
              onClick={() => {
                setLatestToast(null);
                router.push('/rides');
              }}
              className="toast-dispatch-btn"
            >
              Dispatch Now
            </button>
            <button
              onClick={() => setLatestToast(null)}
              className="toast-close-btn"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ProfileMenu({ name, roles, email, onLogout }: { name: string; roles: string[]; email: string; onLogout: () => void }) {
  const { open, setOpen, ref } = usePopover();
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';
  const roleText = roles.map((r) => r.replace(/_/g, ' ')).join(', ');
  return (
    <div className="pop-wrap" ref={ref}>
      <button className="profile-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="avatar" aria-hidden>{initials}</span>
        <span className="profile-text"><span className="p-name">{name}</span><span className="p-role">{roleText}</span></span>
      </button>
      {open && (
        <div className="popover" role="menu">
          <div className="pop-id"><div className="p-name">{name}</div><div className="p-role">{email}</div><div className="p-role">{roleText}</div></div>
          <button role="menuitem" className="menu-item" onClick={onLogout}><LogOut size={16} /> Sign out</button>
        </div>
      )}
    </div>
  );
}
