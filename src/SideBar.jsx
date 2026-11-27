import React, { useState, useRef, useEffect } from "react";
import {
  Settings,
  CircleHelp,
  MoreHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
  LayoutDashboard,
  WalletCards,
  Plane,
  Smartphone,
  ReceiptText,
  Gift,
  Bitcoin,
  Wrench,
} from "lucide-react";
import cardNextLogo from "./assets/cardnext.png";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Wallet & Cards", icon: WalletCards },
  { label: "Global eSIMs", icon: Smartphone },
  { label: "Bills & Utilities", icon: ReceiptText },
  { label: "Gift Cards", icon: Gift },
  { label: "Crypto & RWA", icon: Bitcoin },
  { label: "Tools", icon: Wrench },
  { label: "Travel & Flights", icon: Plane },
];

export default function Sidebar({
  activePage,
  setActivePage,
  onGoToCardGod,
  mobileOpen,
  closeMobile,
  collapsed,
  setCollapsed,
  onSignOut,
}) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const popoverRef = useRef(null);

  const userEmail =
    localStorage.getItem("cardnext_user_email") || "john.doe@cardnext.io";
  const fullName =
    localStorage.getItem("cardnext_user_name") || "CardNext User";

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "CN";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileMenuOpen]);

  const handleNavigate = (page) => {
    setProfileMenuOpen(false);
    if (page === "CardGod") {
      if (typeof closeMobile === "function") {
        closeMobile();
      }
      if (typeof onGoToCardGod === "function") {
        onGoToCardGod();
        return;
      }
      if (typeof setActivePage === "function") {
        setActivePage("CardGod");
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("cardnext:navigate-cardgod", {
            detail: { from: activePage, target: "CardGod" },
          })
        );
      }
      return;
    }

    if (typeof setActivePage === "function") {
      setActivePage(page);
    }
    if (typeof closeMobile === "function") {
      closeMobile();
    }
    if (page === "Dashboard" && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cardnext:navigate-dashboard", {
          detail: { from: activePage, target: "Dashboard" },
        })
      );
    }
  };

  const handleSignOut = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setProfileMenuOpen(false);
    if (typeof closeMobile === "function") {
      closeMobile();
    }
    if (typeof onSignOut === "function") {
      onSignOut();
      return;
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cardnext:sign-out"));
    }
    if (typeof setActivePage === "function") {
      setActivePage("CardGod");
    }
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Close menu"
          onClick={closeMobile}
        />
      )}

      <aside
        className={`sidebar ${mobileOpen ? "sidebar-open" : ""} ${
          collapsed ? "collapsed" : ""
        }`}
      >
        <button
          type="button"
          className="collapse-toggle-embedded"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => {
            if (typeof setCollapsed === "function") setCollapsed(!collapsed);
          }}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        <div className="brand">
          <button
            type="button"
            className="brand-logo-btn"
            onClick={() => handleNavigate("CardGod")}
            title="Go to CardGod"
            aria-label="Go to CardGod"
          >
            <div className="brand-svg-container">
              <img
                src={cardNextLogo}
                alt="CardNext Logo"
                className="brand-svg-logo"
              />
            </div>
          </button>

          <button
            type="button"
            className="mobile-close"
            aria-label="Close navigation"
            onClick={closeMobile}
          >
            <X size={19} />
          </button>
        </div>

        {!collapsed && <p className="nav-caption">WORKSPACE</p>}

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navigation.map(({ label, icon: Icon }) => {
            const isActive = activePage === label;
            return (
              <button
                key={label}
                type="button"
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={() => handleNavigate(label)}
                aria-current={isActive ? "page" : undefined}
                title={collapsed ? label : undefined}
              >
                <Icon size={18} strokeWidth={1.9} />
                {!collapsed && <span>{label}</span>}
                {isActive && <span className="active-indicator" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          {!collapsed && <p className="nav-caption">PREFERENCES</p>}

          <button
            type="button"
            className={`nav-item ${activePage === "Settings" ? "active" : ""}`}
            onClick={() => handleNavigate("Settings")}
            title={collapsed ? "Settings" : undefined}
          >
            <Settings size={18} strokeWidth={1.9} />
            {!collapsed && <span>Settings</span>}
            {activePage === "Settings" && <span className="active-indicator" />}
          </button>

          <button
            type="button"
            className={`nav-item ${
              activePage === "Help & Support" ? "active" : ""
            }`}
            onClick={() => handleNavigate("Help & Support")}
            title={collapsed ? "Help & Support" : undefined}
          >
            <CircleHelp size={18} strokeWidth={1.9} />
            {!collapsed && <span>Help &amp; Support</span>}
            {activePage === "Help & Support" && (
              <span className="active-indicator" />
            )}
          </button>

          <div className="profile-container" ref={popoverRef}>
            {profileMenuOpen && (
              <div className="profile-popover">
                <div className="popover-user-info">
                  <strong>{fullName}</strong>
                  <span>{userEmail}</span>
                  <span className="popover-badge">
                    <ShieldCheck size={12} /> Premium Tier 3
                  </span>
                </div>
                <div className="popover-divider" />
                <button
                  type="button"
                  className="popover-action-btn logout"
                  onClick={handleSignOut}
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            )}

            <div
              className="profile"
              onClick={(e) => {
                e.stopPropagation();
                setProfileMenuOpen((prev) => !prev);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  setProfileMenuOpen((prev) => !prev);
                }
              }}
              title="Account Menu"
              role="button"
              tabIndex={0}
            >
              <div className="profile-image">{initials}</div>
              {!collapsed && (
                <>
                  <div className="profile-details">
                    <strong>{fullName}</strong>
                    <span className="premium-label">Premium Member</span>
                  </div>
                  <MoreHorizontal size={17} className="profile-more" />
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      <style>{`
        .sidebar {
          width: 260px;
          min-width: 260px;
          position: fixed;
          inset: 0 auto 0 0;
          z-index: 100;
          display: flex;
          flex-direction: column;
          padding: 28px 16px 20px;
          color: #202633;
          background: #f7f6f3;
          border-right: 1px solid #e9e7e2;
          overflow: visible !important;
          transition: width .28s cubic-bezier(0.4, 0, 0.2, 1), transform .28s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sidebar.collapsed {
          width: 80px;
          min-width: 80px;
          padding: 28px 10px 20px;
          align-items: center;
        }

        .collapse-toggle-embedded {
          position: absolute;
          top: 50%;
          right: -12px;
          transform: translateY(-50%);
          width: 24px;
          height: 44px;
          background: #ffffff;
          border: 1px solid #e5e1d8;
          border-radius: 6px;
          color: #713b17;
          display: grid;
          place-items: center;
          cursor: pointer;
          z-index: 120;
          box-shadow: 0 4px 12px rgba(37, 30, 22, 0.08);
          transition: background 0.2s, color 0.2s, transform 0.2s, border-color 0.2s;
        }
        .collapse-toggle-embedded:hover {
          background: #f4f1ec;
          color: #4a240c;
          border-color: #d2c2ac;
          transform: translateY(-50%) scale(1.05);
        }

        .brand {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 0 12px 0;
          width: 100%;
          color: #202633;
        }
        .sidebar.collapsed .brand {
          justify-content: center;
          padding: 0 0 20px;
        }

        .brand-logo-btn {
          background: transparent;
          border: 0;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          width: 100%;
          text-align: left;
          outline: none;
        }

        .brand-logo-btn:focus-visible {
          outline: 2px solid rgba(113, 59, 23, 0.45);
          border-radius: 6px;
        }

        .brand-svg-container {
          display: flex;
          align-items: center;
          overflow: visible;
          width: 100%;
          height: 72px;
          padding-left: 2px;
        }

        .sidebar.collapsed .brand-svg-container {
          width: 100%;
          height: 52px;
          padding-left: 0;
          justify-content: center;
        }

        .brand-svg-logo {
          height: 118px;
          width: auto;
          max-width: none;
          object-fit: contain;
          object-position: left center;
          margin-left: 0px;
          margin-right: -10px;
          filter: drop-shadow(0 3px 10px rgba(37, 30, 22, 0.12));
          transition: transform 0.18s ease;
        }

        .brand-logo-btn:hover .brand-svg-logo {
          transform: scale(1.02);
        }

        .sidebar.collapsed .brand-svg-logo {
          height: 76px;
          margin-left: 0;
          object-position: center;
        }

        .nav-caption {
          margin: 0 10px 10px;
          color: #8c857b;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.5px;
          white-space: nowrap;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }

        .nav-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          min-height: 46px;
          padding: 0 14px;
          border-radius: 10px;
          color: #5a564f;
          background: transparent;
          text-align: left;
          font-size: 12.5px;
          font-weight: 600;
          transition: color .2s, background .2s, transform .15s;
          white-space: nowrap;
          border: 0;
          cursor: pointer;
        }
        .sidebar.collapsed .nav-item {
          justify-content: center;
          padding: 0;
        }
        .nav-item:hover {
          color: #202633;
          background: rgba(113, 59, 23, 0.06);
        }
        .nav-item.active {
          color: #ffffff;
          background: linear-gradient(135deg, #713b17 0%, #4b240d 100%);
          box-shadow: inset 0 0 0 1px rgba(243, 199, 124, 0.25), 0 6px 14px rgba(113, 59, 23, 0.18);
          font-weight: 700;
        }
        .nav-item.active > svg {
          color: #f3c77c;
        }
        .active-indicator {
          width: 3.5px;
          height: 22px;
          position: absolute;
          right: -16px;
          border-radius: 4px 0 0 4px;
          background: #713b17;
        }
        .sidebar.collapsed .active-indicator {
          right: -10px;
        }

        .sidebar-bottom {
          margin-top: auto;
          padding-top: 24px;
          width: 100%;
          border-top: 1px solid #e9e7e2;
        }
        .sidebar-bottom .nav-caption {
          margin-bottom: 8px;
        }

        .profile-container {
          position: relative;
          width: 100%;
          margin-top: 14px;
        }
        .profile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 8px;
          cursor: pointer;
          border-radius: 10px;
          transition: background 0.2s, border-color 0.2s;
          background: #ffffff;
          border: 1px solid #e9e7e2;
          box-shadow: 0 4px 14px rgba(37, 30, 22, 0.03);
        }
        .profile:hover {
          background: #faf9f6;
          border-color: #d8cfc2;
        }
        .sidebar.collapsed .profile {
          justify-content: center;
          padding: 8px 0;
          border: none;
          background: transparent;
          box-shadow: none;
        }

        .profile-image {
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          color: #fff;
          background: linear-gradient(135deg, #8c522b 0%, #4b240d 100%);
          font-size: 11px;
          font-weight: 800;
          box-shadow: 0 2px 8px rgba(75, 36, 13, 0.2);
        }
        .profile-details {
          display: flex;
          flex: 1;
          min-width: 0;
          flex-direction: column;
          gap: 2px;
        }
        .profile-details strong {
          font-size: 11.5px;
          font-weight: 700;
          color: #202633;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .premium-label {
          color: #8c522b;
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.3px;
          white-space: nowrap;
        }
        .profile-more {
          color: #858b95;
          flex: 0 0 auto;
        }

        .profile-popover {
          position: absolute;
          bottom: calc(100% + 12px);
          left: 0;
          z-index: 9999;
          width: 230px;
          background: #ffffff;
          border: 1px solid #e5e1d8;
          border-radius: 12px;
          box-shadow: 0 18px 42px rgba(37, 30, 22, 0.14);
          padding: 14px;
          pointer-events: auto !important;
        }

        .popover-user-info {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding-bottom: 6px;
        }
        .popover-user-info strong {
          font-size: 12.5px;
          color: #202633;
          font-weight: 750;
        }
        .popover-user-info span {
          font-size: 10px;
          color: #858b95;
          word-break: break-word;
        }
        .popover-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 6px;
          width: fit-content;
          padding: 3px 8px;
          background: #f6efe6;
          color: #713b17;
          border: 1px solid #e5d6c3;
          border-radius: 5px;
          font-size: 9.5px;
          font-weight: 750;
        }
        .popover-divider {
          height: 1px;
          background: #e9e7e2;
          margin: 10px 0;
        }
        .popover-action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 12px;
          background: #fff4f3;
          color: #c53030;
          font-size: 12px;
          font-weight: 700;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
          text-align: left;
          border: 1px solid #f7d6d3;
          outline: none;
          pointer-events: auto !important;
        }
        .popover-action-btn:hover {
          background: #ffe5e2;
        }

        .mobile-close {
          display: none;
          background: transparent;
          border: 0;
          color: #202633;
          cursor: pointer;
        }
        .sidebar-scrim {
          display: none;
        }

        @media (max-width: 900px) {
          .sidebar {
            transform: translateX(-100%);
            width: 260px !important;
            min-width: 260px !important;
            padding: 28px 16px 20px !important;
            align-items: stretch !important;
          }
          .sidebar.sidebar-open {
            transform: translateX(0);
          }
          .sidebar .brand {
            padding: 0 0 12px 0;
          }
          .sidebar .brand-svg-container {
            height: 72px;
            padding-left: 2px;
          }
          .sidebar .brand-svg-logo {
            height: 118px;
            margin-left: 0px;
            margin-right: -10px;
          }
          .sidebar .nav-caption {
            margin: 0 10px 10px;
          }
          .sidebar .sidebar-nav {
            gap: 6px;
          }
          .sidebar .nav-item {
            gap: 14px;
            min-height: 46px;
            padding: 0 14px;
          }
          .sidebar .active-indicator {
            right: -16px;
          }
          .sidebar .sidebar-bottom {
            margin-top: auto;
            padding-top: 24px;
          }
          .sidebar-scrim {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(32, 24, 16, 0.35);
            z-index: 90;
          }
          .mobile-close {
            display: grid;
            place-items: center;
            margin-left: auto;
          }
          .collapse-toggle-embedded {
            display: none;
          }
        }
      `}</style>
    </>
  );
}