'use client';

import {
  Bell, CalendarCheck, CalendarClock, Car, ChevronsLeft, ChevronsRight, CircleCheckBig, ClipboardList, CreditCard,
  ExternalLink, FileText, Image as ImageIcon, LayoutDashboard, LogOut, type LucideIcon, Menu, Monitor, Moon, Plug, Route, ScrollText,
  Search, Settings, ShieldCheck, Sun, UserRound, Users, Wallet, X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from '@/lib/session';
import { ThemeMode, useTheme } from '@/lib/theme';

const ICONS: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard, route: Route, 'calendar-check': CalendarCheck, users: Users,
  'clipboard-list': ClipboardList, 'user-round': UserRound, 'shield-check': ShieldCheck, car: Car,
  'calendar-clock': CalendarClock, 'credit-card': CreditCard, 'circle-check-big': CircleCheckBig, wallet: Wallet,
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
            <span className="wm-a">A</span><span className="wm-rest">RCHER</span>
            <span className="wm-sub">Executive Services</span>
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
                        {!i.available && <span className="soon sb-text">Soon</span>}
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

function NotificationsMenu() {
  const { open, setOpen, ref } = usePopover();
  return (
    <div className="pop-wrap" ref={ref}>
      <button className="icon-btn" aria-label="Notifications" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)}><Bell size={18} /></button>
      {open && (
        <div className="popover wide" role="dialog" aria-label="Notifications">
          <div className="pop-title">Notifications</div>
          <p className="empty-text">You&apos;re all caught up. Operational alerts will appear here once the notifications module is live.</p>
        </div>
      )}
    </div>
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
