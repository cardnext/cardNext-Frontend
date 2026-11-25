import React, { useState, useRef, useEffect } from "react";
import {
  Settings, CircleHelp, MoreHorizontal, X, ChevronLeft, ChevronRight, LogOut, ShieldCheck,
  LayoutDashboard, WalletCards, Plane, Smartphone, ReceiptText, Gift, Bitcoin
} from "lucide-react";
import cardNextLogo from "./assets/cardnext.png";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Wallet & Cards", icon: WalletCards },
  { label: "Global eSIMs", icon: Smartphone },
  { label: "Bills & Utilities", icon: ReceiptText },
  { label: "Gift Cards", icon: Gift },
  { label: "Crypto & RWA", icon: Bitcoin },
  { label: "Travel & Flights", icon: Plane },
];

export default function Sidebar({ activePage, setActivePage, mobileOpen, closeMobile, collapsed, setCollapsed }) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const popoverRef = useRef(null);

  // Read active user details dynamically from localStorage
  const userEmail = localStorage.getItem("cardnext_user_email") || "john.doe@cardnext.io";
  const fullName = localStorage.getItem("cardnext_user_name") || "CardNext User";

  // Compute initials for avatar (e.g. "John Doe" -> "JD")
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "CN";

  // Close popover when clicking outside
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
    if (typeof setActivePage === "function") {
      setActivePage(page);
    }
    if (typeof closeMobile === "function") {
      closeMobile();
    }
    if (page === "Dashboard" && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cardnext:navigate-dashboard", {
          detail: { from: activePage, target: "Dashboard" }
        })
      );
    }
  };

  const handleSignOut = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setProfileMenuOpen(false);
    if (typeof closeMobile === "function") closeMobile();
    if (typeof setActivePage === "function") {
      setActivePage("Auth");
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
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""} ${collapsed ? "collapsed" : ""}`}>

        {/* Embedded Center-Edge Toggle Button */}
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

        {/* Brand Header with Clickable Logo Navigation */}
        <div className="brand">
          <button
            type="button"
            className="brand-logo-btn"
            onClick={() => handleNavigate("Dashboard")}
            title="Go to Dashboard"
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

        {/* Main Navigation Items */}
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

        {/* Sidebar Bottom Section */}
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
            className={`nav-item ${activePage === "Help & Support" ? "active" : ""}`}
            onClick={() => handleNavigate("Help & Support")}
            title={collapsed ? "Help & Support" : undefined}
          >
            <CircleHelp size={18} strokeWidth={1.9} />
            {!collapsed && <span>Help &amp; Support</span>}
            {activePage === "Help & Support" && <span className="active-indicator" />}
          </button>

          {/* Premium Profile Section with Interactive Popover */}
          <div className="profile-container" ref={popoverRef}>
            {profileMenuOpen && (
              <div className="profile-popover">
                <div className="popover-user-info">
                  <strong>{fullName}</strong>
                  <span>{userEmail}</span>
                  <span className="popover-badge"><ShieldCheck size={12} /> Premium Tier 3</span>
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

      {/* EMBEDDED SIDEBAR STYLING */}
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
          color: #fff;
          background: linear-gradient(180deg, #131412 0%, #0c0d0c 100%);
          border-right: 1px solid rgba(255, 255, 255, 0.06);
          overflow: visible !important;
          transition: width .28s cubic-bezier(0.4, 0, 0.2, 1), transform .28s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sidebar.collapsed {
          width: 80px;
          min-width: 80px;
          padding: 28px 10px 20px;
          align-items: center;
        }

        /* Embedded Center-Edge Toggle Button */
        .collapse-toggle-embedded {
          position: absolute;
          top: 50%;
          right: -12px;
          transform: translateY(-50%);
          width: 24px;
          height: 44px;
          background: #1c1e1c;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 6px;
          color: #d4af37;
          display: grid;
          place-items: center;
          cursor: pointer;
          z-index: 120;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          transition: background 0.2s, color 0.2s, transform 0.2s;
        }
        .collapse-toggle-embedded:hover {
          background: #252825;
          color: #ffdf9b;
          transform: translateY(-50%) scale(1.05);
        }

        /* Brand Header Styling */
        .brand {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 0 12px 0;
          width: 100%;
          color: #fff;
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
          outline: 2px solid rgba(243, 199, 124, 0.5);
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
          filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.8));
          transition: transform 0.18s ease;
        }

        .brand-logo-btn:hover .brand-svg-logo {
          transform: scale(1.02);
        }

        /* Fixed larger logo size when collapsed so it's not too small */
        .sidebar.collapsed .brand-svg-logo {
          height: 76px;
          margin-left: 0;
          object-position: center;
        }

        .nav-caption {
          margin: 0 10px 10px;
          color: #636763;
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

        /* Navigation Items */
        .nav-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          min-height: 46px;
          padding: 0 14px;
          border-radius: 10px;
          color: #9a9e98;
          background: transparent;
          text-align: left;
          font-size: 12.5px;
          font-weight: 550;
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
          color: #fff;
          background: rgba(255, 255, 255, 0.05);
        }
        .nav-item.active {
          color: #fff;
          background: linear-gradient(135deg, rgba(113, 59, 23, 0.95) 0%, rgba(61, 31, 16, 0.95) 100%);
          box-shadow: inset 0 0 0 1px rgba(243, 199, 124, 0.25), 0 4px 12px rgba(113, 59, 23, 0.2);
          font-weight: 650;
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
          background: #f3c77c;
          box-shadow: 0 0 10px #f3c77c;
        }
        .sidebar.collapsed .active-indicator {
          right: -10px;
        }

        .sidebar-bottom {
          margin-top: auto;
          padding-top: 24px;
          width: 100%;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        .sidebar-bottom .nav-caption {
          margin-bottom: 8px;
        }

        /* Profile Section */
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
          transition: background 0.2s;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .profile:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.08);
        }
        .sidebar.collapsed .profile {
          justify-content: center;
          padding: 8px 0;
          border: none;
          background: transparent;
        }

        .profile-image {
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          color: #fff;
          background: linear-gradient(135deg, #b48a68 0%, #543424 100%);
          font-size: 11px;
          font-weight: 800;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
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
          color: #fff;
          white-space: nowrap;
        }
        .premium-label {
          color: #f3c77c;
          font-size: 9.5px;
          font-weight: 650;
          letter-spacing: 0.3px;
          white-space: nowrap;
        }
        .profile-more {
          color: #777b73;
          flex: 0 0 auto;
        }

        /* Profile Popover Menu */
        .profile-popover {
          position: absolute;
          bottom: calc(100% + 12px);
          left: 0;
          z-index: 9999;
          width: 230px;
          background: #181a18;
          border: 1px solid rgba(243, 199, 124, 0.3);
          border-radius: 12px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
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
          color: #fff;
          font-weight: 700;
        }
        .popover-user-info span {
          font-size: 10px;
          color: #8c928c;
        }
        .popover-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 5px;
          width: fit-content;
          padding: 3px 8px;
          background: rgba(243, 199, 124, 0.12);
          color: #f3c77c;
          border: 1px solid rgba(243, 199, 124, 0.2);
          border-radius: 5px;
          font-size: 9.5px;
          font-weight: 750;
        }
        .popover-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          margin: 10px 0;
        }
        .popover-action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 12px;
          background: transparent;
          color: #ef4444;
          font-size: 12px;
          font-weight: 700;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
          text-align: left;
          border: 0;
          outline: none;
          pointer-events: auto !important;
        }
        .popover-action-btn:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        .mobile-close {
          display: none;
          background: transparent;
          border: 0;
          color: #fff;
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
          .sidebar-scrim {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
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
