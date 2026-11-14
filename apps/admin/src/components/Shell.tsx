'use client';

import {
  Calculator,
  Bell, CalendarCheck, CalendarClock, Car, ChevronsLeft, ChevronsRight, CircleCheckBig, ClipboardList, CreditCard,
  FileText, Image as ImageIcon, LayoutDashboard, LogOut, type LucideIcon, Menu, Monitor, Moon, Plug, Route, ScrollText,
  Search, Settings, ShieldCheck, MessageSquare, Sun, UserRound, Users, Wallet, X, Clock, Check, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { ThemeMode, useTheme } from '@/lib/theme';
import { ArcherLogo } from './ArcherLogo';

const ICONS: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard, route: Route, 'calendar-check': CalendarCheck, users: Users,
  'clipboard-list': ClipboardList, 'user-round': UserRound, 'shield-check': ShieldCheck, 'message-square': MessageSquare, car: Car,
  'calendar-clock': CalendarClock, 'credit-card': CreditCard, 'circle-check-big': CircleCheckBig, wallet: Wallet, calculator: Calculator,
  'file-text': FileText, image: ImageIcon, menu: Menu, search: Search, 'scroll-text': ScrollText, plug: Plug, settings: Settings,
};
const COLLAPSE_KEY = 'archer_admin_sidebar_collapsed';

export function useCurrentItem() {
  const { groups } = useSession();
  const pathname = usePathname();
  return useMemo(() => {
    for (const g of groups) for (const i of g.items) if (pathname === i.href || pathname.startsWith(i.href + '/')) return { group: g, item: i };
    return null;
  }, [groups, pathname]);
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { me, groups, logout } = useSession();
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

  return (
    <div className={`shell${collapsed ? ' is-collapsed' : ''}${drawer ? ' drawer-open' : ''}`}>
      <aside className="sidebar" id="sidebar" aria-label="Main navigation">
        <div className="sb-head">
          <Link href="/" className="wordmark" aria-label="Archer Admin home">
            <ArcherLogo size={34} />
            <div className="wm-text-group">
              <span className="wm-rest">ARCHER</span>
              <span className="wm-sub">Executive Black Car</span>
            </div>
          </Link>
          <button className="icon-btn sb-close" onClick={() => setDrawer(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <nav className="sb-nav">
          {groups.length === 0 && <p className="sb-empty">No sections assigned to your role.</p>}
          {groups.map((g) => (
            <div key={g.key} className="sb-group">
              <div className="sb-label">{g.label}</div>
              <ul>
                {g.items.map((i) => {
                  const Icon = ICONS[i.icon] ?? LayoutDashboard;
                  const active = current?.item.key === i.key;
                  return (
                    <li key={i.key}>
                      <Link href={i.href} className={`sb-link${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined} data-tip={i.label}>
                        <Icon size={18} aria-hidden /><span className="sb-text">{i.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <button className="sb-collapse" onClick={toggleCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} data-tip={collapsed ? 'Expand' : undefined}>
          {collapsed ? <ChevronsRight size={18} /> : <><ChevronsLeft size={18} /><span className="sb-text">Collapse</span></>}
        </button>
      </aside>
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} aria-hidden />}

      <div className="main-col">
        <header className="header">
          <button className="icon-btn menu-btn" onClick={() => setDrawer(true)} aria-label="Open menu" aria-controls="sidebar" aria-expanded={drawer}><Menu size={20} /></button>
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
            <ThemeMenu />
            <NotificationsMenu />
            <ProfileMenu name={me?.name ?? ''} roles={me?.roles ?? []} email={me?.email ?? ''} onLogout={logout} />
          </div>
        </header>
        <main className="content" id="content">{children}</main>
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
      
      // If a brand new notification arrived, show floating popup toast
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

      {/* Real-Time Floating Popup Toast for Admin */}
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
