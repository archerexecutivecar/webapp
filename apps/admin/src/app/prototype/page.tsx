'use client';

import React, { useState } from 'react';
import {
  Inbox,
  Home,
  Calendar as CalendarIcon,
  Heart,
  CheckSquare,
  BarChart2,
  Key,
  Send,
  Grid,
  HelpCircle,
  Settings as SettingsIcon,
  Search,
  Plus,
  Compass,
  BookOpen,
  Sparkles,
  Trash2,
  Check,
  X,
  Sliders,
  Award,
  Layers,
  Clock,
  MessageSquare
} from 'lucide-react';

export default function AdminPrototypePage() {
  const [currentView, setCurrentView] = useState<'guest' | 'inbox'>('guest');
  const [activeTab, setActiveTab] = useState<'pending' | 'reviews'>('pending');
  const [activeSubItem, setActiveSubItem] = useState<string>('Overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accessType, setAccessType] = useState<'full' | 'custom'>('custom');

  return (
    <div className="hospitable-root">
      {/* Top Demo Bar */}
      <div className="prototype-top-bar">
        <div className="bar-left">
          <span className="bar-bold">ARCHER ADMIN PROTOTYPE</span>
          <span className="bar-sub">• Exact Figtree Typography, Compact SaaS Scale & Archer Luxury Palette</span>
        </div>
        <div className="bar-right">
          <button
            className={`view-btn ${currentView === 'guest' ? 'active' : ''}`}
            onClick={() => {
              setCurrentView('guest');
              setActiveSubItem('Overview');
            }}
          >
            1. Guest Experience (Image 3)
          </button>
          <button
            className={`view-btn ${currentView === 'inbox' ? 'active' : ''}`}
            onClick={() => {
              setCurrentView('inbox');
              setActiveSubItem('All Messages');
            }}
          >
            2. Inbox & Messages (Image 1)
          </button>
          <button className="view-btn modal-btn" onClick={() => setIsModalOpen(true)}>
            3. Access Modal (Image 2)
          </button>
        </div>
      </div>

      <div className="app-layout">
        {/* ========================================================
            COLUMN 1: PRIMARY DARK SIDEBAR (~185px)
            ======================================================== */}
        <aside className="primary-dark-rail">
          <div className="brand-box">
            <div className="brand-crest">A</div>
            <span className="brand-wordmark">archer</span>
          </div>

          <nav className="rail-menu">
            <button
              className={`rail-item ${currentView === 'inbox' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('inbox');
                setActiveSubItem('All Messages');
              }}
            >
              <Inbox size={15} />
              <span>Inbox</span>
            </button>

            <button className="rail-item">
              <Home size={15} />
              <span>Properties</span>
            </button>

            <button className="rail-item">
              <CalendarIcon size={15} />
              <span>Calendar</span>
            </button>

            <button
              className={`rail-item ${currentView === 'guest' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('guest');
                setActiveSubItem('Overview');
              }}
            >
              <Heart size={15} className="active-heart" />
              <span>Guest experience</span>
            </button>

            <button className="rail-item">
              <CheckSquare size={15} />
              <span>Operations</span>
            </button>

            <button className="rail-item">
              <BarChart2 size={15} />
              <span>Metrics</span>
            </button>

            <button className="rail-item">
              <Key size={15} />
              <span>Connected accounts</span>
            </button>

            <button className="rail-item">
              <Send size={15} />
              <span>Direct</span>
              <span className="soon-badge">Coming soon</span>
            </button>
          </nav>

          <div className="rail-footer">
            <button className="rail-item">
              <Grid size={15} />
              <span>Apps</span>
            </button>
            <button className="rail-item">
              <HelpCircle size={15} />
              <span>Help</span>
              <span className="help-badge">10</span>
            </button>
            <button className="rail-item" onClick={() => setIsModalOpen(true)}>
              <SettingsIcon size={15} />
              <span>Settings</span>
            </button>

            <div className="profile-pill" onClick={() => setIsModalOpen(true)}>
              <div className="avatar-dot">AM</div>
              <span className="profile-name">Anthony Monaco</span>
            </div>
          </div>
        </aside>

        {/* ========================================================
            COLUMN 2: SECONDARY SUB-RAIL (~210px)
            ======================================================== */}
        <aside className="secondary-sub-rail">
          {currentView === 'guest' ? (
            <>
              <div className="subrail-head">
                <span className="subrail-title">Guest experience</span>
                <Layers size={14} className="text-gray-400" />
              </div>

              <ul className="subrail-nav">
                {[
                  { label: 'Overview', icon: Heart },
                  { label: 'Messaging rules', icon: Inbox },
                  { label: 'Review rules', icon: Award },
                  { label: 'Questions', icon: HelpCircle },
                  { label: 'Custom codes', icon: Sliders },
                  { label: 'Canned responses', icon: MessageSquare },
                  { label: 'Log', icon: Clock },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = activeSubItem === item.label;
                  return (
                    <li key={item.label}>
                      <button
                        className={`subrail-btn ${active ? 'active' : ''}`}
                        onClick={() => setActiveSubItem(item.label)}
                      >
                        <Icon size={14} />
                        <span>{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <>
              <div className="subrail-head" style={{ paddingBottom: '8px' }}>
                <span className="subrail-title" style={{ fontSize: '18px' }}>Inbox</span>
              </div>
              <div className="subrail-category">
                <Inbox size={14} />
                <span>Status</span>
              </div>
              <ul className="subrail-nav">
                {['All Messages', 'Unread Messages', 'Awaiting Reply', 'Resolved', 'Starred'].map((s) => {
                  const active = activeSubItem === s;
                  return (
                    <li key={s}>
                      <button
                        className={`subrail-btn ${active ? 'active' : ''}`}
                        style={{ paddingLeft: '14px' }}
                        onClick={() => setActiveSubItem(s)}
                      >
                        <span>{s}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </aside>

        {/* ========================================================
            COLUMN 3: MAIN WORKSPACE
            ======================================================== */}
        <main className="main-content-view">
          {currentView === 'guest' ? (
            <>
              {/* 3 KPI Cards (Image 3) */}
              <div className="kpi-grid-row">
                <div className="kpi-card-box">
                  <div className="kpi-count">10</div>
                  <div className="kpi-tag-label">Active Messaging rules</div>
                  <p className="kpi-copy">
                    Rules are the building blocks that will create messages to your guests. They can be triggered after an event, scheduled ahead of time, or reply to a question.
                  </p>
                </div>

                <div className="kpi-card-box">
                  <div className="kpi-count">4</div>
                  <div className="kpi-tag-label">Active Review rules</div>
                  <p className="kpi-copy">
                    Review rules allow you to always publish reviews at the best time for your social proof. You always have control to publish the feedback you want to your guests.
                  </p>
                </div>

                <div className="kpi-card-box">
                  <div className="kpi-count">0</div>
                  <div className="kpi-tag-label">Active Question rules</div>
                  <p className="kpi-copy">
                    Life was not made to send instructions. We have created machine learning models for your guest's most common questions. You only need to create the replies.
                  </p>
                </div>
              </div>

              {/* Underline Tabs */}
              <div className="segmented-tabs-strip">
                <button
                  className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
                  onClick={() => setActiveTab('pending')}
                >
                  Pending messages
                </button>
                <button
                  className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
                  onClick={() => setActiveTab('reviews')}
                >
                  Pending reviews
                </button>
              </div>

              {/* Row List */}
              <div className="table-rows-container">
                {[
                  { rule: 'First morning', name: 'Frances Rebollido', time: 'in 2 days' },
                  { rule: 'Review request', name: 'Alyssa Ward', time: 'in 3 days' },
                  { rule: 'Check-in instructions', name: 'Hanna Rosol', time: 'in 6 days' },
                  { rule: 'Check-out instructions', name: 'Frances Rebollido', time: 'in 7 days' },
                  { rule: 'First morning', name: 'Hanna Rosol', time: 'in 10 days' },
                  { rule: 'Review request', name: 'Frances Rebollido', time: 'in 11 days' },
                  { rule: 'Check-in instructions', name: 'Lisa Prins', time: 'in 14 days' },
                  { rule: 'Check-out instructions', name: 'Hanna Rosol', time: 'in 15 days' },
                  { rule: 'First morning', name: 'Lisa Prins', time: 'in 18 days' },
                  { rule: 'Review request', name: 'Hanna Rosol', time: 'in 19 days' },
                ].map((row, idx) => (
                  <div key={idx} className="guest-row-item">
                    <div className="rule-title-col">{row.rule}</div>
                    <div className="guest-col">
                      <div className="user-avatar-mini">8</div>
                      <span className="guest-name">{row.name}</span>
                    </div>
                    <div className="prop-col">
                      <div className="prop-thumb">IMG</div>
                      <span className="prop-name">Amazing 4 bedroom close to Old Town Arvada</span>
                    </div>
                    <div className="time-col">{row.time}</div>
                    <button className="edit-btn-action">Edit</button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Header & Subtitle (Image 1) */}
              <h1 className="inbox-title">All Messages</h1>
              <p className="inbox-subtitle">
                Never miss a message with the Hospitable Inbox. This allows you to send and receive messages from all booking platforms in one place.
              </p>

              <div className="tour-chips-bar">
                <a className="tour-link">
                  <Compass size={13} />
                  <span>Take a tour</span>
                </a>
                <a className="tour-link">
                  <BookOpen size={13} />
                  <span>Change check-in and check-out times</span>
                </a>
                <a className="tour-link">
                  <Sparkles size={13} />
                  <span>Get suggested replies with AI</span>
                  <span className="badge-new-green">NEW</span>
                </a>
              </div>

              {/* Filter Toolbar (Image 1) */}
              <div className="inbox-filter-bar">
                <div className="left-filters">
                  <button className="pill-dropdown-btn">
                    <MessageSquare size={13} />
                    <span>Conversation Status : All</span>
                  </button>
                  <button className="pill-dropdown-btn">
                    <Plus size={13} />
                    <span>Filter</span>
                  </button>
                </div>

                <div className="right-search-actions">
                  <div className="search-field-wrap">
                    <Search size={14} />
                    <input
                      type="text"
                      className="search-field-input"
                      placeholder="Reservation code, guest name, email or phone..."
                    />
                  </div>
                  <button className="btn-add-booking" onClick={() => setIsModalOpen(true)}>
                    <span>+ Add booking</span>
                  </button>
                </div>
              </div>

              {/* Inbox Rows (Image 1) */}
              <div className="table-rows-container">
                {[
                  {
                    name: 'Jane Doe',
                    gender: '♀',
                    snippet: 'Hi Jane, and thanks for your reservation! I wanted to confirm your reserv...',
                    status: 'Check-in in 2 weeks',
                    prop: 'Nice house with a room',
                    time: '22 days ago',
                  },
                  {
                    name: 'Jane Doe',
                    gender: '♀',
                    snippet: 'Hi Jane, It was a pleasure hosting you in Murrieta. We will certainly be lea...',
                    status: 'Checked out',
                    prop: 'Nice house with a room',
                    time: 'a month ago',
                  },
                  {
                    name: 'Jane Doe',
                    gender: '♀',
                    snippet: 'Hi Jane, I hope that you are having an excellent stay so far at Oasis in Murrieta! I would like to remind you that check-out time is by 11:00 AM, unless explicitly ...',
                    status: '',
                    prop: '',
                    time: 'a year ago',
                  },
                  {
                    name: 'John Doe',
                    gender: '♀',
                    snippet: 'Hi John, and thanks for your reservation! I wanted to confirm your reservation at Oasis in Murrieta starting on Wednesday, May 17 for 2 nights nights with 2 pe...',
                    status: '',
                    prop: '',
                    time: 'a year ago',
                  },
                ].map((row, idx) => (
                  <div key={idx} className="inbox-row-item">
                    <input type="checkbox" className="row-check-box" />
                    <div className="inbox-avatar-circle">
                      <HelpCircle size={15} />
                    </div>
                    <div className="inbox-content-col">
                      <div className="inbox-name-line">
                        <span className="guest-bold-name">{row.name}</span>
                        <span className="gender-symbol">{row.gender}</span>
                      </div>
                      <div className="inbox-snippet-text">{row.snippet}</div>
                    </div>
                    {row.status ? (
                      <div className="inbox-property-preview">
                        <div className="prop-thumb">IMG</div>
                        <div className="prop-details-vertical">
                          <span className="prop-status-label">{row.status}</span>
                          <span className="prop-title-sub">{row.prop}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="inbox-property-preview" />
                    )}
                    <div className="inbox-date-tag">{row.time}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      {/* ========================================================
          MODAL: ACCESS & PERMISSIONS (IMAGE 2 EXACT REPLICA)
          ======================================================== */}
      {isModalOpen && (
        <div className="modal-backdrop-veil" onClick={() => setIsModalOpen(false)}>
          <div className="modal-dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top-header">
              <h2 className="modal-headline">Access</h2>
            </div>

            <div className="modal-inner-scroll">
              {/* Access Level Cards */}
              <div className="access-level-cards-row">
                <div
                  className={`access-choice-box ${accessType === 'full' ? 'active' : ''}`}
                  onClick={() => setAccessType('full')}
                >
                  <div className="choice-header">
                    <span className="choice-title">Full access</span>
                    <span className="choice-radio" />
                  </div>
                  <ul className="bullet-checklist">
                    <li><Check size={13} className="text-emerald-500" /> Full access to all features.</li>
                    <li><Check size={13} className="text-emerald-500" /> Full access to all properties.</li>
                    <li><Check size={13} className="text-emerald-500" /> Can view financial data.</li>
                    <li><X size={13} className="text-red-500" /> Can not view subscription details.</li>
                    <li><X size={13} className="text-red-500" /> Can not invite new users.</li>
                  </ul>
                </div>

                <div
                  className={`access-choice-box ${accessType === 'custom' ? 'active' : ''}`}
                  onClick={() => setAccessType('custom')}
                >
                  <div className="choice-header">
                    <span className="choice-title">Custom access</span>
                    <span className="choice-radio" />
                  </div>
                  <ul className="bullet-checklist">
                    <li><Check size={13} className="text-emerald-500" /> Access to selected features.</li>
                    <li><Check size={13} className="text-emerald-500" /> Access to selected properties.</li>
                    <li><Check size={13} className="text-emerald-500" /> Optional access to financial data.</li>
                    <li><X size={13} className="text-red-500" /> Can not view subscription details.</li>
                    <li><X size={13} className="text-red-500" /> Can not invite new users.</li>
                  </ul>
                </div>
              </div>

              {/* Permissions Header */}
              <div className="perm-header-line">
                <HelpCircle size={14} className="text-gray-400" />
                <span className="font-bold text-gray-900 text-xs">Permissions</span>
                <span className="text-xs text-gray-500 ml-1">Select accessible features and properties for this user.</span>
              </div>

              {/* Dual Panel Box */}
              <div className="dual-permissions-frame">
                {/* Left: Features */}
                <div className="perm-pane-col border-r border-gray-200">
                  <div className="pane-head-bar">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" className="custom-check" />
                      <span>Features</span>
                    </label>
                    <button className="link-clear-btn">Clear selection</button>
                  </div>
                  <div className="tree-scroll-container">
                    <div>
                      <label className="tree-row-parent">
                        <input type="checkbox" className="custom-check" />
                        <span>Reservations</span>
                      </label>
                      <div className="tree-row-child">
                        <input type="checkbox" className="custom-check" />
                        <span>Display financial data</span>
                      </div>
                      <div className="tree-row-child">
                        <input type="checkbox" className="custom-check" />
                        <span>Manage Reservations</span>
                      </div>
                    </div>

                    <div>
                      <label className="tree-row-parent mt-1.5">
                        <input type="checkbox" defaultChecked className="custom-check" />
                        <span>Inbox</span>
                      </label>
                      <div className="tree-row-child">
                        <input type="checkbox" className="custom-check" />
                        <span>Purchase additional services</span>
                      </div>
                    </div>

                    <div>
                      <label className="tree-row-parent mt-1.5">
                        <input type="checkbox" className="custom-check" />
                        <span>Calendar</span>
                      </label>
                      <div className="tree-row-child">
                        <input type="checkbox" className="custom-check" />
                        <span>Display pricing</span>
                      </div>
                      <div className="tree-row-child">
                        <input type="checkbox" className="custom-check" />
                        <span>Update pricing</span>
                      </div>
                    </div>

                    <div className="mt-1.5">
                      <label className="tree-row-parent">
                        <input type="checkbox" className="custom-check" />
                        <span>Properties</span>
                      </label>
                    </div>

                    <div className="mt-1.5">
                      <label className="tree-row-parent">
                        <input type="checkbox" className="custom-check" />
                        <span>Guest experience</span>
                        <span className="all-pill-berry">All properties</span>
                      </label>
                    </div>

                    <div className="mt-1.5">
                      <label className="tree-row-parent">
                        <input type="checkbox" defaultChecked className="custom-check" />
                        <span>Operations</span>
                        <span className="all-pill-berry">All properties</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Right: Properties */}
                <div className="perm-pane-col">
                  <div className="pane-head-bar">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" defaultChecked className="custom-check" />
                      <span>Properties</span>
                    </label>
                    <button className="link-clear-btn">Clear selection</button>
                  </div>
                  <div className="props-search-box">
                    <Search size={12} className="search-icon-inside" />
                    <input type="text" className="search-input-mini" placeholder="Search..." />
                  </div>
                  <div className="props-items-scroll">
                    {[
                      'Your property started on August 25, 2026',
                      'Your property started on August 25, 2026',
                      'Your property started on August 24, 2026',
                      'Your property started on July 28, 2026',
                      'Your property started on July 23, 2026',
                      '1 bedroom apartment in Dulwich Village - Apartment with Balcony',
                      '1 bedroom apartment in Dulwich Village - Bungalow with Patio',
                      "Aaron's Humble Abode",
                      'Amazing villa in Saint Raphael - Apartment',
                    ].map((name, i) => (
                      <label key={i} className="prop-list-entry">
                        <input type="checkbox" defaultChecked className="custom-check" />
                        <span>{name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Footer */}
            <div className="modal-bottom-actions">
              <button className="delete-btn-label">
                <Trash2 size={13} />
                <span>Delete user</span>
              </button>
              <div className="flex items-center gap-2">
                <button className="btn-secondary-cancel" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button className="btn-primary-update" onClick={() => setIsModalOpen(false)}>
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scoped CSS using exact Figtree Font & Compact Measurements */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&display=swap');

        .hospitable-root {
          font-family: 'Figtree', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #FFFFFF;
          color: #4A5568;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          font-size: 13px;
          line-height: 1.45;
          -webkit-font-smoothing: antialiased;
        }

        /* Top Demo Bar */
        .prototype-top-bar {
          height: 34px;
          background: #090C11;
          border-bottom: 1px solid #1E2738;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          font-size: 11.5px;
          color: #94A3B8;
          flex-shrink: 0;
          z-index: 50;
        }
        .bar-bold {
          color: #FFFFFF;
          font-weight: 700;
          margin-right: 6px;
        }
        .bar-sub {
          color: #64748B;
        }
        .bar-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .view-btn {
          height: 24px;
          padding: 0 10px;
          background: transparent;
          border: 1px solid #283347;
          border-radius: 4px;
          color: #CBD5E1;
          font-size: 11px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.12s;
        }
        .view-btn:hover {
          background: #19202E;
          color: #FFFFFF;
        }
        .view-btn.active {
          background: #D96E1B;
          border-color: #D96E1B;
          color: #FFFFFF;
          font-weight: 600;
        }
        .view-btn.modal-btn {
          background: #1E2738;
          border-color: #334155;
          color: #F8FAFC;
        }

        .app-layout {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        /* 1. PRIMARY DARK SIDEBAR */
        .primary-dark-rail {
          width: 185px;
          background: #10141D;
          border-right: 1px solid #1E2738;
          display: flex;
          flex-direction: column;
          padding: 16px 0 12px;
          flex-shrink: 0;
          color: #94A3B8;
        }
        .brand-box {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 16px 18px;
        }
        .brand-crest {
          width: 22px;
          height: 22px;
          background: #D96E1B;
          border-radius: 5px;
          color: #FFFFFF;
          font-size: 12px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .brand-wordmark {
          color: #FFFFFF;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .rail-menu {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 1px;
          padding: 0 8px;
          flex: 1;
        }
        .rail-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 7px 10px;
          border-radius: 5px;
          background: transparent;
          border: none;
          color: #94A3B8;
          font-size: 13px;
          font-weight: 400;
          cursor: pointer;
          font-family: inherit;
          text-align: left;
          width: 100%;
          transition: all 0.1s;
        }
        .rail-item:hover {
          background: #19202E;
          color: #FFFFFF;
        }
        .rail-item.active {
          color: #FFFFFF;
          font-weight: 500;
        }
        .rail-item.active .active-heart {
          color: #D96E1B;
        }
        .soon-badge {
          background: #E11D48;
          color: #FFFFFF;
          font-size: 9px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 10px;
          margin-left: auto;
          line-height: 1.3;
        }
        .rail-footer {
          padding: 12px 8px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .help-badge {
          background: #10B981;
          color: #FFFFFF;
          font-size: 9px;
          font-weight: 800;
          padding: 1px 5px;
          border-radius: 8px;
          margin-left: auto;
        }
        .profile-pill {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 8px 10px;
          margin-top: 6px;
          border-radius: 5px;
          cursor: pointer;
          color: #E2E8F0;
        }
        .profile-pill:hover {
          background: #19202E;
        }
        .avatar-dot {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #334155;
          border: 1.5px solid #D96E1B;
          color: #FFFFFF;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .profile-name {
          font-size: 12px;
          font-weight: 500;
          color: #E2E8F0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* 2. SECONDARY SUB-RAIL */
        .secondary-sub-rail {
          width: 210px;
          background: #FFFFFF;
          border-right: 1px solid #EAEDF1;
          display: flex;
          flex-direction: column;
          padding: 18px 12px;
          flex-shrink: 0;
          overflow-y: auto;
        }
        .subrail-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 6px 14px;
        }
        .subrail-title {
          font-size: 15px;
          font-weight: 700;
          color: #1A1F2C;
        }
        .subrail-category {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
          font-weight: 700;
          color: #1A1F2C;
          padding: 6px 8px 6px;
          margin-top: 4px;
        }
        .subrail-nav {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .subrail-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          border-radius: 4px;
          border: none;
          background: transparent;
          font-size: 13px;
          font-weight: 400;
          color: #475569;
          cursor: pointer;
          font-family: inherit;
          text-align: left;
          transition: all 0.1s;
        }
        .subrail-btn:hover {
          color: #1A1F2C;
          background: #F8FAFC;
        }
        .subrail-btn.active {
          color: #D96E1B;
          font-weight: 600;
        }

        /* 3. MAIN WORKSPACE */
        .main-content-view {
          flex: 1;
          overflow-y: auto;
          padding: 24px 32px 40px;
          background: #FFFFFF;
        }

        /* KPI Cards */
        .kpi-grid-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 24px;
        }
        .kpi-card-box {
          border: 1px solid #E5E7EB;
          border-radius: 4px;
          padding: 16px 18px;
          background: #FFFFFF;
        }
        .kpi-count {
          font-size: 24px;
          font-weight: 700;
          color: #1A1F2C;
          line-height: 1.1;
          margin-bottom: 3px;
        }
        .kpi-tag-label {
          font-size: 12.5px;
          font-weight: 600;
          color: #D96E1B;
          margin-bottom: 8px;
        }
        .kpi-copy {
          font-size: 11.5px;
          color: #64748B;
          line-height: 1.45;
        }

        /* Tabs */
        .segmented-tabs-strip {
          display: flex;
          gap: 24px;
          border-bottom: 1px solid #E5E7EB;
          margin-bottom: 16px;
        }
        .tab-btn {
          padding: 6px 0 10px;
          font-size: 13.5px;
          font-weight: 400;
          color: #64748B;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          cursor: pointer;
          font-family: inherit;
        }
        .tab-btn.active {
          color: #1A1F2C;
          font-weight: 600;
          border-bottom-color: #D96E1B;
        }

        /* Rows */
        .table-rows-container {
          border-top: 1px solid #E5E7EB;
        }
        .guest-row-item {
          display: flex;
          align-items: center;
          padding: 12px 8px;
          border-bottom: 1px solid #E5E7EB;
          gap: 14px;
          transition: background 0.1s;
        }
        .guest-row-item:hover {
          background: #FAFAFC;
        }
        .rule-title-col {
          width: 200px;
          font-weight: 500;
          font-size: 13px;
          color: #1E2530;
          flex-shrink: 0;
        }
        .guest-col {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }
        .user-avatar-mini {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #E2E8F0;
          color: #64748B;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .guest-name {
          font-size: 12.5px;
          color: #4B5563;
        }
        .prop-col {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 320px;
          flex-shrink: 0;
        }
        .prop-thumb {
          width: 38px;
          height: 26px;
          border-radius: 3px;
          background: #1E293B;
          border: 1px solid #E5E7EB;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #D96E1B;
          font-size: 10px;
          font-weight: 700;
        }
        .prop-name {
          font-size: 12px;
          color: #4B5563;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .time-col {
          width: 80px;
          text-align: right;
          font-size: 11.5px;
          color: #94A3B8;
          flex-shrink: 0;
        }
        .edit-btn-action {
          height: 25px;
          padding: 0 10px;
          background: #FFFFFF;
          border: 1px solid #CBD5E1;
          border-radius: 3px;
          font-size: 11.5px;
          font-weight: 500;
          color: #4A5568;
          cursor: pointer;
          font-family: inherit;
        }
        .edit-btn-action:hover {
          border-color: #94A3B8;
        }

        /* Inbox Header & Toolbar */
        .inbox-title {
          font-size: 20px;
          font-weight: 700;
          color: #1A1F2C;
          margin-bottom: 5px;
          letter-spacing: -0.01em;
        }
        .inbox-subtitle {
          font-size: 13px;
          color: #64748B;
          line-height: 1.4;
          margin-bottom: 10px;
          max-width: 900px;
        }
        .tour-chips-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 22px;
          flex-wrap: wrap;
        }
        .tour-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: #10B981;
          cursor: pointer;
          text-decoration: none;
        }
        .tour-link:hover {
          text-decoration: underline;
        }
        .badge-new-green {
          background: #10B981;
          color: #FFFFFF;
          font-size: 9.5px;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 3px;
        }

        .inbox-filter-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .left-filters {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .pill-dropdown-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #F8F9FA;
          border: 1px solid #E5E7EB;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          color: #4A5568;
          cursor: pointer;
          font-family: inherit;
        }
        .right-search-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          justify-content: flex-end;
          max-width: 600px;
        }
        .search-field-wrap {
          position: relative;
          flex: 1;
          max-width: 420px;
        }
        .search-field-wrap svg {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #94A3B8;
        }
        .search-field-input {
          width: 100%;
          height: 32px;
          padding: 0 10px 0 32px;
          border: 1px solid #E5E7EB;
          border-radius: 4px;
          font-size: 12.5px;
          font-family: inherit;
          color: #1A1F2C;
          outline: none;
        }
        .search-field-input:focus {
          border-color: #D96E1B;
        }
        .btn-add-booking {
          height: 32px;
          padding: 0 14px;
          background: #D96E1B;
          color: #FFFFFF;
          border: none;
          border-radius: 4px;
          font-size: 12.5px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.12s;
        }
        .btn-add-booking:hover {
          background: #BF5B11;
        }

        .inbox-row-item {
          display: flex;
          align-items: center;
          padding: 12px 8px;
          border-bottom: 1px solid #E5E7EB;
          gap: 14px;
        }
        .inbox-row-item:hover {
          background: #FAFAFC;
        }
        .row-check-box {
          width: 15px;
          height: 15px;
          border-radius: 3px;
          border: 1px solid #CBD5E1;
          accent-color: #D96E1B;
          cursor: pointer;
        }
        .inbox-avatar-circle {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748B;
          flex-shrink: 0;
        }
        .inbox-content-col {
          flex: 1;
          min-width: 0;
        }
        .inbox-name-line {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 2px;
        }
        .guest-bold-name {
          font-size: 13px;
          font-weight: 600;
          color: #1A1F2C;
        }
        .gender-symbol {
          color: #E11D48;
          font-size: 11px;
        }
        .inbox-snippet-text {
          font-size: 12px;
          color: #64748B;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .inbox-property-preview {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 220px;
          flex-shrink: 0;
        }
        .prop-details-vertical {
          display: flex;
          flex-direction: column;
          line-height: 1.25;
        }
        .prop-status-label {
          font-size: 12px;
          font-weight: 500;
          color: #1A1F2C;
        }
        .prop-title-sub {
          font-size: 11.5px;
          color: #94A3B8;
        }
        .inbox-date-tag {
          width: 100px;
          text-align: right;
          font-size: 11.5px;
          color: #94A3B8;
          flex-shrink: 0;
        }

        /* MODAL */
        .modal-backdrop-veil {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .modal-dialog-box {
          background: #FFFFFF;
          width: 100%;
          max-width: 640px;
          border-radius: 6px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          font-size: 12.5px;
        }
        .modal-top-header {
          padding: 16px 20px 10px;
        }
        .modal-headline {
          font-size: 14.5px;
          font-weight: 700;
          color: #1A1F2C;
        }
        .modal-inner-scroll {
          padding: 10px 20px 20px;
          max-height: 76vh;
          overflow-y: auto;
        }
        .access-level-cards-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 20px;
        }
        .access-choice-box {
          border: 1px solid #E5E7EB;
          border-radius: 5px;
          padding: 14px 16px;
          cursor: pointer;
        }
        .access-choice-box.active {
          border-color: #34D399;
          background: #F0FDF4;
        }
        .choice-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .choice-title {
          font-size: 13px;
          font-weight: 700;
          color: #1A1F2C;
        }
        .choice-radio {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 1.5px solid #CBD5E1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .access-choice-box.active .choice-radio {
          border-color: #10B981;
        }
        .access-choice-box.active .choice-radio::after {
          content: '';
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10B981;
        }
        .bullet-checklist {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 5px;
          font-size: 11.5px;
          color: #4A5568;
        }
        .bullet-checklist li {
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .perm-header-line {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 10px;
        }
        .dual-permissions-frame {
          border: 1px solid #E5E7EB;
          border-radius: 4px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          overflow: hidden;
        }
        .perm-pane-col {
          padding: 12px 14px;
        }
        .pane-head-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 12.5px;
          font-weight: 700;
          color: #1A1F2C;
        }
        .link-clear-btn {
          font-size: 11px;
          font-weight: 500;
          color: #10B981;
          background: none;
          border: none;
          cursor: pointer;
        }
        .tree-scroll-container {
          max-height: 240px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .tree-row-parent {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #1A1F2C;
          cursor: pointer;
        }
        .tree-row-child {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-left: 20px;
          margin-top: 3px;
          font-size: 11.5px;
          color: #4A5568;
          cursor: pointer;
        }
        .all-pill-berry {
          background: #F43F5E;
          color: #FFFFFF;
          font-size: 9.5px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 8px;
          margin-left: 4px;
        }
        .props-search-box {
          position: relative;
          margin-bottom: 8px;
        }
        .search-icon-inside {
          position: absolute;
          left: 7px;
          top: 50%;
          transform: translateY(-50%);
          color: #94A3B8;
        }
        .search-input-mini {
          width: 100%;
          height: 28px;
          padding: 0 8px 0 24px;
          border: 1px solid #E5E7EB;
          border-radius: 4px;
          font-size: 11.5px;
          font-family: inherit;
          outline: none;
        }
        .props-items-scroll {
          max-height: 200px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .prop-list-entry {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          color: #4A5568;
          cursor: pointer;
        }
        .custom-check {
          accent-color: #D96E1B;
          cursor: pointer;
        }
        .modal-bottom-actions {
          padding: 12px 20px;
          border-top: 1px solid #E5E7EB;
          background: #FAFAFA;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .delete-btn-label {
          color: #10B981;
          font-size: 12px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: none;
          border: none;
          cursor: pointer;
        }
        .btn-secondary-cancel {
          height: 32px;
          padding: 0 16px;
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          color: #4A5568;
          cursor: pointer;
          font-family: inherit;
        }
        .btn-primary-update {
          height: 32px;
          padding: 0 20px;
          background: #D96E1B;
          color: #FFFFFF;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.12s;
        }
        .btn-primary-update:hover {
          background: #BF5B11;
        }
      `}</style>
    </div>
  );
}
