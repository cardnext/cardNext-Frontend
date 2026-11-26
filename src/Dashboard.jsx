// Dashboard.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plane, Smartphone, ReceiptText, Bitcoin, ArrowDownLeft,
  Wallet, CreditCard, Zap, ArrowRight, ArrowLeft, Check, TrendingUp, MoreHorizontal, CircleDollarSign,
  Bell, ChevronDown, Plus, X, LayoutDashboard, Settings, MoreVertical, Clock,
  ArrowDownUp, Eye, EyeOff, Gift, HelpCircle, Sparkles
} from "lucide-react";
import Sidebar from "./SideBar";
import WalletPage from "./Wallet";
import TravelPage from "./Travel";
import EsimPage from "./Esim";
import BillsPage from "./Bills";
import GiftCardsPage from "./GiftCards";
import CryptoRwaPage from "./CryptoRwa";
import SettingsPage from "./Settings";
import HelpAndSupportPage from "./Helpandsupport";
import AuthPage from "./Auth";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";
const API_BASE_URL = `${API_BASE}/api`;
const ESIM_API_BASE_URL = API_BASE;
const MARKET_SESSION_CACHE_KEY = "cardnext_market_rates_v1";
const MARKET_SESSION_TTL = 5 * 60 * 1000;
const ACTIVE_PAGE_STORAGE_KEY = "cardnext_active_page";
const WALLET_CACHE_KEY = "cardnext_wallet_cache";
const USER_STORAGE_KEY = "cardnext_user";
const SESSION_TOKEN_STORAGE_KEY = "cardnext_session_token";
const WALLET_UPDATED_EVENT = "cardnext:wallet-updated";

const ALL_CURRENCIES = [
  { currency: "NGN", name: "Nigerian Naira", flagCode: "ng", rateToUSD: 1 / 1500, symbol: "₦" },
  { currency: "USD", name: "US Dollar", flagCode: "us", rateToUSD: 1.0, symbol: "$" },
  { currency: "GBP", name: "British Pound", flagCode: "gb", rateToUSD: 1.28, symbol: "£" },
  { currency: "EUR", name: "Euro", flagCode: "eu", rateToUSD: 1.08, symbol: "€" },
  { currency: "CAD", name: "Canadian Dollar", flagCode: "ca", rateToUSD: 0.73, symbol: "CA$" },
  { currency: "GHS", name: "Ghanaian Cedi", flagCode: "gh", rateToUSD: 0.075, symbol: "GH₵" },
];

const NAV_ITEMS = [
  { key: "Dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "Wallet & Cards", label: "Wallet & Cards", icon: Wallet },
  { key: "Travel & Flights", label: "Travel & Flights", icon: Plane },
  { key: "Global eSIMs", label: "Global eSIMs", icon: Smartphone },
  { key: "Bills & Utilities", label: "Bills & Utilities", icon: ReceiptText },
  { key: "Gift Cards", label: "Gift Cards", icon: Gift },
  { key: "Crypto & RWA", label: "Crypto & RWA", icon: Bitcoin },
  { key: "Settings", label: "Settings", icon: Settings },
  { key: "Help & Support", label: "Help & Support", icon: HelpCircle },
];

const VALID_PAGES = new Set([...NAV_ITEMS.map(item => item.key), "Auth"]);

const PAGE_ICONS = NAV_ITEMS.reduce((acc, item) => {
  acc[item.key] = item.icon;
  return acc;
}, {});

const getCardMeta = (name) => {
  const lower = (name || "").toLowerCase();
  if (lower.includes("apple") || lower.includes("itunes")) return { slug: "itunes", emoji: "🍎", priority: 100 };
  if (lower.includes("amazon")) return { slug: "amazon", emoji: "📦", priority: 95 };
  if (lower.includes("steam")) return { slug: "steam", emoji: "🎮", priority: 90 };
  if (lower.includes("google") || lower.includes("play")) return { slug: "google-play", emoji: "▶️", priority: 85 };
  if (lower.includes("sephora")) return { slug: "sephora", emoji: "💄", priority: 80 };
  if (lower.includes("roblox")) return { slug: "roblox", emoji: "🧱", priority: 78 };
  if (lower.includes("vanilla") || lower.includes("visa") || lower.includes("mastercard")) return { slug: "vanilla", emoji: "💳", priority: 76 };
  if (lower.includes("american express") || lower.includes("amex")) return { slug: "amex", emoji: "💳", priority: 75 };
  if (lower.includes("nike")) return { slug: "nike", emoji: "👟", priority: 72 };
  if (lower.includes("xbox")) return { slug: "xbox", emoji: "🟢", priority: 70 };
  if (lower.includes("playstation") || lower.includes("psn")) return { slug: "playstation", emoji: "🎮", priority: 68 };
  if (lower.includes("footlocker")) return { slug: "footlocker", emoji: "👟", priority: 65 };
  if (lower.includes("lululemon")) return { slug: "lululemon", emoji: "🧘", priority: 62 };
  if (lower.includes("macy")) return { slug: "macys", emoji: "🛍️", priority: 60 };
  if (lower.includes("nordstrom")) return { slug: "nordstrom", emoji: "👜", priority: 58 };
  if (lower.includes("walmart")) return { slug: "walmart", emoji: "🛒", priority: 55 };
  if (lower.includes("ebay")) return { slug: "ebay", emoji: "🏷️", priority: 50 };
  return { slug: "giftcard", emoji: "🎁", priority: 10 };
};

function getFlagFromCountryName(name = "") {
  const lower = String(name).toLowerCase();
  if (lower.includes("united states") || lower === "usa") return "🇺🇸";
  if (lower.includes("united kingdom") || lower === "uk") return "🇬🇧";
  if (lower.includes("emirates") || lower === "uae") return "🇦🇪";
  if (lower.includes("canada")) return "🇨🇦";
  if (lower.includes("france")) return "🇫🇷";
  if (lower.includes("germany")) return "🇩🇪";
  if (lower.includes("nigeria")) return "🇳🇬";
  return "🌐";
}

function parsePlanSizeToGb(planSizeStr = "", fallbackGb = 1.0) {
  const match = String(planSizeStr).match(/(\d+(?:\.\d+)?)\s*(MB|GB)/i);
  if (!match) {
    const numOnly = parseFloat(planSizeStr);
    return Number.isFinite(numOnly) && numOnly > 0 ? numOnly : fallbackGb;
  }
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (!Number.isFinite(value) || value <= 0) return fallbackGb;
  return unit === "MB" ? value / 1024 : value;
}

function mapOrdersToActiveSims(history = []) {
  if (!Array.isArray(history) || history.length === 0) return [];

  const topupBonusByIccid = {};
  history.forEach(order => {
    if (order?.status === "TOPUP_SUCCESS" && order?.iccid) {
      const addedGb = parsePlanSizeToGb(order.plan_size, 0);
      topupBonusByIccid[order.iccid] = (topupBonusByIccid[order.iccid] || 0) + addedGb;
    }
  });

  const primaryOrders = history.filter(order => order?.status !== "TOPUP_SUCCESS");
  return primaryOrders.map((order, idx) => {
    const baseGb = parsePlanSizeToGb(order.plan_size, 1.0);
    const extraGb = order.iccid ? (topupBonusByIccid[order.iccid] || 0) : 0;
    const expiryMatch = String(order.plan_size || "").match(/(\d+\s*Days?)/i);

    return {
      id: order.id ? `sim-${order.id}` : `sim-idx-${idx}`,
      orderId: order.id,
      country: order.country_name || "International",
      flag: getFlagFromCountryName(order.country_name),
      plan: order.plan_size || "1 GB",
      status: "Active",
      dataUsed: 0.0,
      dataTotal: Number((baseGb + extraGb).toFixed(2)),
      expiry: expiryMatch ? expiryMatch[1] : "30 Days",
      iccid: order.iccid || ""
    };
  });
}

function readInitialWalletCache() {
  try {
    const raw = localStorage.getItem(WALLET_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearAllSessionAndCaches() {
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
    localStorage.removeItem(WALLET_CACHE_KEY);
    localStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, "Dashboard");
  } catch {}

  try {
    sessionStorage.removeItem(MARKET_SESSION_CACHE_KEY);
  } catch {}
}

async function readJsonIfOk(response) {
  if (!response || !response.ok) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function MiniIconNavRail({
  mobileOpen,
  activePage,
  setActivePage,
  closeMobile,
}) {
  return (
    <aside
      className={`mobile-mini-icon-rail mobile-only ${mobileOpen ? "is-open" : ""}`}
      aria-label="Quick icon navigation"
      aria-hidden={!mobileOpen}
    >
      <nav className="mini-rail-list no-scrollbar">
        {NAV_ITEMS.map(({ key, label, icon: Icon }, idx) => {
          const isActive = activePage === key;
          return (
            <button
              key={key}
              type="button"
              className={`mini-rail-btn ${isActive ? "is-active" : ""}`}
              style={{ transitionDelay: mobileOpen ? `${Math.min(idx * 22, 160)}ms` : "0ms" }}
              aria-label={label}
              title={label}
              onClick={() => {
                setActivePage(key);
              }}
            >
              <Icon size={16} strokeWidth={isActive ? 2.4 : 1.95} />
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        className="mini-rail-close"
        aria-label="Close icon navigation"
        title="Close"
        onClick={closeMobile}
      >
        <X size={14} />
      </button>
    </aside>
  );
}

function Header({
  activePage,
  onAddMoney,
  currentUser,
  walletBalance,
  setActivePage,
  mobileOpen,
  onToggleMobileNav,
  onSignOut,
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const PageBadgeIcon = PAGE_ICONS[activePage] || LayoutDashboard;
  const userName = currentUser?.name || currentUser?.fullName || "User";
  const userInitials = userName.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";
  const safeBalance = Number(walletBalance) || 0;

  return (
    <header className="top-header">
      <div className="header-inner-wrap">
        <div className="header-left-cluster">
          <button
            type="button"
            className={`mobile-nav-arrow-btn mobile-only ${mobileOpen ? "is-open" : ""}`}
            onClick={onToggleMobileNav}
            aria-label={mobileOpen ? "Hide navigation bar" : "Show navigation bar"}
            aria-expanded={mobileOpen}
            title={mobileOpen ? "Hide navigation bar" : "Show navigation bar"}
          >
            {mobileOpen ? (
              <ArrowLeft size={17} strokeWidth={2.15} className="naked-glow-arrow" />
            ) : (
              <ArrowRight size={17} strokeWidth={2.15} className="naked-glow-arrow" />
            )}
          </button>

          <div className="header-title-block">
            <span className="sleek-page-icon" aria-label={activePage} title={activePage}>
              <PageBadgeIcon size={19} strokeWidth={2.05} />
            </span>
          </div>
        </div>

        <div className="header-right-cluster">
          <div className="header-wallet-badge desktop-only" onClick={() => setActivePage("Wallet & Cards")} title="View Wallet">
            <Wallet size={14} />
            <span className="tabular-nums">₦{safeBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <button type="button" className="header-primary desktop-only" onClick={onAddMoney}>
            <Plus size={16} /> <span>Add money</span>
          </button>

          <div className="header-popover-wrap desktop-only">
            <button
              type="button"
              className={`icon-button ${notificationsOpen ? "active" : ""}`}
              aria-label="Notifications"
              onClick={() => { setNotificationsOpen(v => !v); setProfileOpen(false); }}
            >
              <Bell size={18} />
              <span className="notification-dot" />
            </button>
            {notificationsOpen && (
              <div className="header-popover">
                <strong>Notifications</strong>
                <p>You’re all caught up with your wallet activity.</p>
              </div>
            )}
          </div>

          <div className="header-popover-wrap desktop-only">
            <button
              type="button"
              className="account-pill-button"
              onClick={() => { setProfileOpen(v => !v); setNotificationsOpen(false); }}
              aria-label="Account menu"
            >
              <span className="avatar-button">{userInitials}</span>
              <span className="account-name">{userName.split(" ")[0]}</span>
              <ChevronDown size={14} />
            </button>
            {profileOpen && (
              <div className="header-popover account-popover">
                <strong>{userName}</strong>
                <p>{currentUser?.email || "user@cardnext.io"}</p>
                <button type="button" onClick={() => { setActivePage("Settings"); setProfileOpen(false); }}>Settings</button>
                <button type="button" onClick={() => {
                  setProfileOpen(false);
                  onSignOut();
                }}>Sign out</button>
              </div>
            )}
          </div>

          <div className="mobile-actions-dropdown-wrap mobile-only">
            <button
              type="button"
              className={`mobile-actions-trigger ${mobileMenuOpen ? "active" : ""}`}
              onClick={() => setMobileMenuOpen(v => !v)}
              aria-label="Open mobile header menu"
            >
              <MoreVertical size={17} />
            </button>
            {mobileMenuOpen && (
              <div className="mobile-actions-popover">
                <div className="mobile-popover-wallet-info" onClick={() => { setMobileMenuOpen(false); setActivePage("Wallet & Cards"); }}>
                  <span className="mobile-popover-label"><Wallet size={13} /> Wallet Balance</span>
                  <strong className="tabular-nums">₦{safeBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
                <button type="button" className="mobile-popover-action-item" onClick={() => { setMobileMenuOpen(false); onAddMoney(); }}>
                  <Plus size={15} /> Add Money
                </button>
                <button type="button" className="mobile-popover-action-item" onClick={() => { setMobileMenuOpen(false); setNotificationsOpen(v => !v); }}>
                  <Bell size={15} /> Notifications <span className="mobile-badge-dot" />
                </button>
                <div className="mobile-popover-divider" />
                <div className="mobile-popover-user-row">
                  <span className="avatar-button">{userInitials}</span>
                  <div className="mobile-user-details">
                    <strong>{userName}</strong>
                    <span>{currentUser?.email || "user@cardnext.io"}</span>
                  </div>
                </div>
                <button type="button" className="mobile-popover-settings-btn" onClick={() => { setMobileMenuOpen(false); setActivePage("Settings"); }}>
                  <Settings size={14} /> Account Settings
                </button>
                <button type="button" className="mobile-popover-settings-btn" style={{ marginTop: "4px" }} onClick={() => { setMobileMenuOpen(false); onSignOut(); }}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function AddMoneyModal({ close }) {
  const [amount, setAmount] = useState("100000");
  const [method, setMethod] = useState("Bank card");
  const [notice, setNotice] = useState(false);
  return (
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) close(); }} role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="add-money-title">
        <div className="modal-header">
          <div><span className="modal-kicker">WALLET FUNDING</span><h2 id="add-money-title">Add money</h2><p>Choose an amount and preferred funding method.</p></div>
          <button type="button" className="modal-close" aria-label="Close modal" onClick={close}><X size={19} /></button>
        </div>
        <label className="modal-label" htmlFor="fund-amount">Amount to add</label>
        <div className="modal-input"><span>₦</span><input id="fund-amount" inputMode="decimal" value={amount} onChange={e => { setAmount(e.target.value.replace(/[^\d.]/g, "")); setNotice(false); }} /></div>
        <div className="fund-options">
          {["Bank card", "Bank transfer"].map((item, index) => (
            <button type="button" key={item} className={`fund-option ${method === item ? "selected" : ""}`} onClick={() => setMethod(item)}>
              {index === 0 ? <CreditCard size={19} /> : <Wallet size={19} />}
              <span>{item}<small>{index === 0 ? "Use a debit or credit card" : "Transfer from your bank app"}</small></span>
              {method === item && <Check size={17} />}
            </button>
          ))}
        </div>
        {notice && <p className="modal-notice">Demo only: connect a payment provider to fund the wallet securely.</p>}
        <button type="button" className="modal-submit" onClick={() => setNotice(true)} disabled={!amount || Number(amount) <= 0}>Continue with {method.toLowerCase()} <span style={{ marginLeft: "5px" }}>→</span></button>
        <p className="secure-note"><Check size={13} /> Secure demo flow · No payment will be processed</p>
      </section>
    </div>
  );
}

function ComingSoonModal({ featureName, close }) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  return (
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) close(); }} role="presentation">
      <section className="modal coming-soon-modal" role="dialog" aria-modal="true">
        <button type="button" className="modal-close" aria-label="Close modal" onClick={close}><X size={19} /></button>
        <div className="coming-soon-icon-badge"><Clock size={28} /></div>
        <span className="modal-kicker">CARDNEXT EXCLUSIVE</span>
        <h2>{featureName} is Coming Soon</h2>
        <p>We’re putting the final polish on our live GDS airline booking engine to bring you instant PNR confirmations and seamless fares.</p>
        {!subscribed ? (
          <div className="notify-form">
            <input type="email" placeholder="Enter your email for early access" value={email} onChange={e => setEmail(e.target.value)} />
            <button type="button" className="modal-submit" onClick={() => { if (email) setSubscribed(true); }} disabled={!email}>
              Notify me at launch <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className="success-notify-box">
            <Check size={20} />
            <span>You're on the VIP waitlist! We'll notify you as soon as {featureName} goes live.</span>
          </div>
        )}
        <button type="button" className="text-button" style={{ marginTop: "16px" }} onClick={close}>Back to dashboard</button>
      </section>
    </div>
  );
}

function TransactionDetailModal({ transaction, close }) {
  if (!transaction) return null;
  const safeTxAmount = Number(transaction.amount) || 0;
  return (
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) close(); }} role="presentation">
      <section className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <span className="modal-kicker">TRANSACTION RECEIPT</span>
            <h2>{transaction.title || transaction.narration || "Wallet Transaction"}</h2>
            <p>{transaction.created_at ? new Date(transaction.created_at).toLocaleString() : (transaction.date || "Recent")} · {transaction.type || transaction.tag || "Activity"}</p>
          </div>
          <button type="button" className="modal-close" aria-label="Close modal" onClick={close}><X size={19} /></button>
        </div>
        <div style={{ background: "#f9f6f0", padding: "16px", borderRadius: "12px", marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ color: "#858b95", fontSize: "12px" }}>Amount</span>
            <strong className={`transaction-amount tabular-nums ${transaction.type}`} style={{ fontSize: "16px" }}>
              {transaction.currency || "₦"}{safeTxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ color: "#858b95", fontSize: "12px" }}>Type</span>
            <span style={{ textTransform: "uppercase", fontSize: "11px", fontWeight: "700", color: transaction.type === "credit" || transaction.type === "deposit" ? "#139768" : "#df5c57" }}>
              {transaction.type || "Transaction"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ color: "#858b95", fontSize: "12px" }}>Reference</span>
            <span style={{ fontSize: "11px", fontFamily: "monospace" }}>{transaction.reference || transaction.id || "N/A"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#858b95", fontSize: "12px" }}>Status</span>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#139768" }}>{transaction.status ? transaction.status.toUpperCase() : "SUCCESSFUL"}</span>
          </div>
        </div>
        <button type="button" className="modal-submit" onClick={close}>Done</button>
      </section>
    </div>
  );
}

function BalanceCard({ balanceVisible, setBalanceVisible, walletBalance, cryptoBalance, cryptoRates, setActivePage, globalCurrency, setGlobalCurrency }) {
  const safeWallet = Number(walletBalance) || 0;
  const safeCrypto = Number(cryptoBalance) || 0;
  const combinedNGN = safeWallet + safeCrypto;

  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setCurrencyDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toGlobal = (amountInNGN) => {
    if (globalCurrency.currency === "NGN") return amountInNGN;
    const inUSD = amountInNGN * ALL_CURRENCIES[0].rateToUSD;
    return inUSD / (globalCurrency.rateToUSD || 1);
  };

  const fmt = (val) => `${globalCurrency.symbol}${toGlobal(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const cryptoSharePct = combinedNGN > 0 ? Math.min(100, Math.max(0, (safeCrypto / combinedNGN) * 100)) : 0;
  const walletSharePct = combinedNGN > 0 ? Math.max(0, 100 - cryptoSharePct) : 100;

  const topAssets = Array.isArray(cryptoRates) && cryptoRates.length > 0
    ? cryptoRates.slice(0, 3)
    : [
        { symbol: "BTC", name: "Bitcoin" },
        { symbol: "ETH", name: "Ethereum" },
        { symbol: "USDT", name: "Tether" }
      ];

  return (
    <section className="balance-card luxury-vault-card">
      <div className="shooting-star-layer" aria-hidden="true">
        <span className="shooting-star star-one" />
        <span className="shooting-star star-two" />
      </div>

      <div className="balance-card-top">
        <div className="vault-title-stack">
          <span className="vault-pill-tag"><i className="vault-pulse-dot" /> BALANCE</span>
        </div>

        <div className="balance-currency-switcher-wrap" ref={dropdownRef}>
          <button
            type="button"
            className="balance-currency-trigger"
            onClick={() => setCurrencyDropdownOpen(v => !v)}
            aria-label="Select display currency"
          >
            <CurrencyIcon currency={globalCurrency} size={16} />
            <span>{globalCurrency.currency}</span>
            <ChevronDown size={12} />
          </button>

          {currencyDropdownOpen && (
            <div className="balance-currency-popover">
              <span className="popover-title">Display Currency</span>
              <div className="popover-list no-scrollbar">
                {ALL_CURRENCIES.map(c => (
                  <button
                    type="button"
                    key={c.currency}
                    className={`popover-item ${globalCurrency.currency === c.currency ? "active" : ""}`}
                    onClick={() => { setGlobalCurrency(c); setCurrencyDropdownOpen(false); }}
                  >
                    <CurrencyIcon currency={c} size={18} />
                    <div className="popover-item-text">
                      <strong>{c.currency}</strong>
                      <small>{c.name}</small>
                    </div>
                    <span className="popover-symbol">{c.symbol}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="vault-hero-row">
        <h2 className="tabular-nums textured-balance-num">
          {balanceVisible ? fmt(combinedNGN) : `${globalCurrency.symbol} ••••••••`}
        </h2>
        <div className="lean-meta-cluster">
          <button
            type="button"
            className="balance-eye-btn"
            onClick={() => setBalanceVisible(v => !v)}
            aria-label={balanceVisible ? "Hide balance" : "Show balance"}
          >
            {balanceVisible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <span className="balance-change"><TrendingUp size={12} /> +8.4%</span>
        </div>
      </div>

      <div className="vault-ledger-grid">
        <div className="vault-ledger-cell" onClick={() => setActivePage("Wallet & Cards")}>
          <div className="vault-cell-top">
            <span className="vault-cell-icon cash"><Wallet size={12} /></span>
            <span className="vault-cell-label">Wallet Balance</span>
            <span className="vault-cell-pct tabular-nums">{walletSharePct.toFixed(0)}%</span>
          </div>
          <strong className="vault-cell-value tabular-nums">{balanceVisible ? fmt(safeWallet) : "••••••"}</strong>
          <small className="vault-cell-sub">Kuda · 7006572702</small>
        </div>

        <div className="vault-crypto-cell" onClick={() => setActivePage("Crypto & RWA")}>
          <div className="vault-cell-top">
            <span className="vault-cell-icon crypto"><Bitcoin size={12} /></span>
            <span className="vault-cell-label">Crypto Vault</span>
            <span className="vault-cell-pct gold tabular-nums">{cryptoSharePct.toFixed(0)}%</span>
          </div>
          <strong className="vault-cell-value gold textured-sub-num tabular-nums">{balanceVisible ? fmt(safeCrypto) : "••••••"}</strong>
          <div className="vault-mini-assets">
            {topAssets.map(a => (
              <span key={a.symbol} className="vault-asset-chip">
                <CoinsIcon symbol={a.symbol} size={12} />
                <span>{a.symbol}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickAccess({ setActivePage, onOpenComingSoon }) {
  const actions = [
    { title: "Book a flight", icon: Plane, color: "blue", action: () => onOpenComingSoon("Book a Flight") },
    { title: "Buy eSIM", icon: Smartphone, color: "green", page: "Global eSIMs" },
    { title: "Crypto", icon: Bitcoin, color: "orange", page: "Crypto & RWA" },
    { title: "Pay bills", icon: ReceiptText, color: "purple", page: "Bills & Utilities" },
  ];
  return (
    <section className="quick-section">
      <div className="section-heading">
        <div><h3>Quick access</h3><p>Jump straight into a service</p></div>
      </div>
      <div className="quick-grid">
        {actions.map(({ title, icon: Icon, color, page, action }) => (
          <button type="button" className="quick-card" key={title} onClick={() => action ? action() : setActivePage(page)}>
            <span className={`quick-icon ${color}`}><Icon size={20} /></span>
            <span>{title}</span>
            <ArrowRight className="quick-arrow" size={14} />
          </button>
        ))}
      </div>
    </section>
  );
}

function RecentTransactions({ transactions, setActivePage }) {
  const [selectedTx, setSelectedTx] = useState(null);
  const txArray = Array.isArray(transactions) ? transactions : [];
  const snippetTransactions = txArray.slice(0, 4);

  return (
    <>
      <section className="card transactions-card">
        <div className="section-heading transaction-heading">
          <div><h3>Recent transactions</h3><p>Your latest wallet activity snippet</p></div>
          <button type="button" className="text-button" onClick={() => setActivePage("Wallet & Cards")}>
            View all ({txArray.length}) <ArrowRight size={13} />
          </button>
        </div>

        <div className="transactions-list">
          {snippetTransactions.map((t, idx) => {
            let Icon = Zap;
            const tType = (t.type || "").toLowerCase();
            const tTag = (t.tag || "").toLowerCase();
            if (tType === "transfer" || tTag === "transfer") Icon = ArrowDownLeft;
            if (tTag === "travel") Icon = Plane;
            if (tTag === "crypto") Icon = Bitcoin;
            if (tTag === "esim") Icon = Smartphone;
            if (tType === "deposit" || tType === "credit") Icon = ArrowDownLeft;

            const isCredit = tType === "credit" || tType === "deposit";
            const safeAmount = Number(t.amount) || 0;
            const formattedAmount = `₦${safeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            const txDate = t.created_at ? new Date(t.created_at).toLocaleDateString() : (t.date || "Recent");
            const txTitle = t.title || (isCredit ? "Wallet Deposit" : "Wallet Debit");
            const txTag = t.tag || t.type || "Transaction";

            return (
              <div className="transaction" key={t.id || idx} onClick={() => setSelectedTx(t)} style={{ cursor: "pointer" }}>
                <div className={`transaction-icon ${isCredit ? "credit" : "debit"}`}><Icon size={16} /></div>
                <div className="transaction-info"><strong>{txTitle}</strong><span>{txDate} <i>·</i> {txTag}</span></div>
                <strong className={`transaction-amount tabular-nums ${isCredit ? "credit" : "debit"}`}>{isCredit ? "+" : "-"}{formattedAmount}</strong>
                <button type="button" className="transaction-more" aria-label={`More options for ${txTitle}`}><MoreHorizontal size={16} /></button>
              </div>
            );
          })}
          {snippetTransactions.length === 0 && <div className="empty-state">No recent transactions available.</div>}
        </div>

        {txArray.length > 4 && (
          <button
            type="button"
            className="balance-button mobile-full-history-btn"
            style={{ width: "100%", marginTop: "14px", background: "#f5f3ef", color: "var(--brown)" }}
            onClick={() => setActivePage("Wallet & Cards")}
          >
            Open full transaction history ({txArray.length} total) <ArrowRight size={13} />
          </button>
        )}
      </section>
      {selectedTx && <TransactionDetailModal transaction={selectedTx} close={() => setSelectedTx(null)} />}
    </>
  );
}

function ActiveEsimWidget({ activeEsims, isLoadingEsims, setActivePage }) {
  const simsArray = Array.isArray(activeEsims) ? activeEsims : [];

  return (
    <section className="card widget-card">
      <div className="section-heading">
        <div>
          <span className="section-kicker"><Smartphone size={11} /> CONNECTIVITY</span>
          <h3>Active eSIM Data Passes</h3>
          <p>Your ongoing roaming packages</p>
        </div>
        <button type="button" className="text-button" onClick={() => setActivePage("Global eSIMs")}>
          {simsArray.length > 0 ? "View All" : "Buy eSIM"} <ArrowRight size={13} />
        </button>
      </div>

      {isLoadingEsims && simsArray.length === 0 ? (
        <div className="empty-state" style={{ padding: "16px 6px" }}>Loading active eSIMs...</div>
      ) : simsArray.length > 0 ? (
        <div className="esim-widget-list">
          {simsArray.slice(0, 2).map((sim, idx) => {
            const safeTotal = Number(sim.dataTotal) || 0;
            const safeUsed = Number(sim.dataUsed) || 0;
            const usagePercent = safeTotal > 0
              ? Math.min(100, Math.max(0, Math.round((safeUsed / safeTotal) * 100)))
              : 0;
            const statusClass = String(sim.status || "Active").toLowerCase();

            return (
              <div
                className="esim-pass-item"
                key={sim.id || sim.iccid || idx}
                onClick={() => setActivePage("Global eSIMs")}
                style={{ cursor: "pointer" }}
              >
                <div className="esim-pass-header">
                  <div className="esim-country-info">
                    <span className="esim-flag">{sim.flag || "🌐"}</span>
                    <strong>{sim.country || "International"} eSIM</strong>
                  </div>
                  <span className={`esim-status-pill ${statusClass === "expired" ? "expired" : ""}`}>
                    {sim.status || "Active"}
                  </span>
                </div>
                <div className="esim-progress-info">
                  <span>
                    Plan: <strong>{sim.plan || `${safeTotal} GB`}</strong> · {safeUsed} / {safeTotal} GB
                  </span>
                  <span>Valid: <strong>{sim.expiry || "30 Days"}</strong></span>
                </div>
                <div className="esim-progress-bar-bg">
                  <div className="esim-progress-bar-fill" style={{ width: `${usagePercent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-esim-state" style={{ textAlign: "center", padding: "14px 6px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "#f5f3ef", display: "grid", placeItems: "center", margin: "0 auto 7px", color: "var(--brown)" }}>
            <Smartphone size={16} />
          </div>
          <strong style={{ fontSize: "11.5px", color: "#333842", display: "block", marginBottom: "3px" }}>No active eSIM passes</strong>
          <p style={{ color: "var(--muted)", fontSize: "10.5px", margin: "0 0 10px" }}>Purchase a global data plan to view live usage tracking here.</p>
          <button type="button" className="balance-button primary" style={{ width: "100%", minHeight: "36px", fontSize: "11px", background: "var(--brown)", color: "#fff" }} onClick={() => setActivePage("Global eSIMs")}>
            Explore eSIM Store →
          </button>
        </div>
      )}
    </section>
  );
}

function WealthAndAssetsMarketWidget({ setActivePage, cryptoRates, giftCardRates, loadingMarket, globalCurrency, cryptoBalance, balanceVisible }) {
  const [marketTab, setMarketTab] = useState("crypto");
  const safeCrypto = Number(cryptoBalance) || 0;

  const convertRate = (amountInNGN) => {
    const amountInUSD = amountInNGN * ALL_CURRENCIES[0].rateToUSD;
    return globalCurrency.currency === "NGN" ? amountInNGN : amountInUSD / (globalCurrency.rateToUSD || 1);
  };

  const formattedCryptoVault = `${globalCurrency.symbol}${convertRate(safeCrypto).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <section className="card widget-card executive-market-card">
      <div className="section-heading market-heading-wrap" style={{ marginBottom: "10px" }}>
        <div>
          <span className="section-kicker"><Bitcoin size={11} /> WEALTH & ASSETS</span>
          <h3>Live Market Rates</h3>
          <p>Real-time feeds in {globalCurrency.currency}</p>
        </div>
        <div className="calc-mode-switch" style={{ padding: "3px" }}>
          <button type="button" className={marketTab === "crypto" ? "active" : ""} onClick={() => setMarketTab("crypto")} style={{ padding: "5px 9px", fontSize: "10px" }}>Crypto</button>
          <button type="button" className={marketTab === "giftcards" ? "active" : ""} onClick={() => setMarketTab("giftcards")} style={{ padding: "5px 9px", fontSize: "10px" }}>Gift Cards</button>
        </div>
      </div>

      {marketTab === "crypto" && (
        <div className="crypto-vault-banner">
          <div className="crypto-banner-left">
            <span className="crypto-banner-badge"><Bitcoin size={13} /></span>
            <div>
              <small>YOUR CRYPTO VAULT</small>
              <strong className="tabular-nums">{balanceVisible ? formattedCryptoVault : `${globalCurrency.symbol} ••••••`}</strong>
            </div>
          </div>
          <span className="crypto-banner-pill">{cryptoRates.length} Pairs</span>
        </div>
      )}

      <div className="pane-animated-wrap">
        {marketTab === "crypto" ? (
          <div key="crypto" className="market-list-container no-scrollbar pane-fade-in">
            <div className="rates-sleek-list">
              {cryptoRates.map(c => (
                <div className="rate-sleek-row crypto-rate-row" key={c.symbol}>
                  <div className="rate-currency">
                    <CoinsIcon symbol={c.symbol} size={24} />
                    <div className="rate-asset-stack">
                      <strong>{c.name}</strong>
                      <small>{c.symbol} · {c.defaultNetwork || "Spot"}</small>
                    </div>
                  </div>
                  <div className="rate-price-col">
                    <span className="tabular-nums">{globalCurrency.symbol}{convertRate(c.displayRateForUser || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    <small>/ $100</small>
                  </div>
                  <small className="live-tag">Live</small>
                </div>
              ))}
              {cryptoRates.length === 0 && !loadingMarket && <div className="empty-state">No crypto rates available right now.</div>}
              {loadingMarket && cryptoRates.length === 0 && <div className="empty-state">Loading live crypto feeds...</div>}
            </div>
          </div>
        ) : (
          <div key="giftcards" className="market-list-container no-scrollbar pane-fade-in">
            <div className="rates-sleek-list">
              {giftCardRates.map(b => (
                <div className="rate-sleek-row" key={b.id || b.slug}>
                  <div className="rate-currency"><GiftCardIcon name={b.name} /><strong>{b.name}</strong></div>
                  <span className="tabular-nums">{globalCurrency.symbol}{convertRate(Number(b.rate) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}/$</span>
                  <small className="live-tag">Top Traded</small>
                </div>
              ))}
              {giftCardRates.length === 0 && !loadingMarket && <div className="empty-state">No gift card rates available right now.</div>}
              {loadingMarket && giftCardRates.length === 0 && <div className="empty-state">Loading top traded gift card feeds...</div>}
            </div>
          </div>
        )}
      </div>

      <button type="button" className="text-button" style={{ marginTop: "8px", width: "100%", justifyContent: "center" }} onClick={() => setActivePage(marketTab === "crypto" ? "Crypto & RWA" : "Gift Cards")}>
        View full exchange marketplace <ArrowRight size={13} />
      </button>
    </section>
  );
}

function AdvancedCalculator({ setActivePage, cryptoRates, giftCardRates, loadingMarket, globalCurrency }) {
  const [calcMode, setCalcMode] = useState("crypto");
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [cryptoAmountUSD, setCryptoAmountUSD] = useState("100");
  const [cryptoDropdownOpen, setCryptoDropdownOpen] = useState(false);
  const cryptoDropdownRef = useRef(null);

  const [selectedBrand, setSelectedBrand] = useState(null);
  const [cardAmountUSD, setCardAmountUSD] = useState("50");
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const brandDropdownRef = useRef(null);

  const [fromCurrency, setFromCurrency] = useState(ALL_CURRENCIES[1]);
  const [toCurrency, setToCurrency] = useState(ALL_CURRENCIES[0]);
  const [forexAmount, setForexAmount] = useState("100");
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const fromRef = useRef(null);
  const toRef = useRef(null);

  useEffect(() => {
    if (!selectedCrypto && Array.isArray(cryptoRates) && cryptoRates.length > 0) setSelectedCrypto(cryptoRates[0]);
  }, [cryptoRates, selectedCrypto]);

  useEffect(() => {
    if (!selectedBrand && Array.isArray(giftCardRates) && giftCardRates.length > 0) setSelectedBrand(giftCardRates[0]);
  }, [giftCardRates, selectedBrand]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (cryptoDropdownRef.current && !cryptoDropdownRef.current.contains(e.target)) setCryptoDropdownOpen(false);
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(e.target)) setBrandDropdownOpen(false);
      if (fromRef.current && !fromRef.current.contains(e.target)) setFromOpen(false);
      if (toRef.current && !toRef.current.contains(e.target)) setToOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cleanCryptoUSD = Number(cryptoAmountUSD.replace(/,/g, "")) || 0;
  const netUserReceivesNGN = cleanCryptoUSD * (selectedCrypto ? (selectedCrypto.displayRateForUser / 100) : 0);
  const netUserReceivesGlobal = globalCurrency.currency === "NGN"
    ? netUserReceivesNGN
    : (netUserReceivesNGN * ALL_CURRENCIES[0].rateToUSD) / (globalCurrency.rateToUSD || 1);

  const cleanCardUSD = Number(cardAmountUSD.replace(/,/g, "")) || 0;
  const cardRatePerUSDNGN = Number(selectedBrand?.rate || 0);
  const totalPayoutNGN = cleanCardUSD * cardRatePerUSDNGN;
  const totalPayoutGlobal = globalCurrency.currency === "NGN"
    ? totalPayoutNGN
    : (totalPayoutNGN * ALL_CURRENCIES[0].rateToUSD) / (globalCurrency.rateToUSD || 1);
  const currentCardRateGlobal = globalCurrency.currency === "NGN"
    ? cardRatePerUSDNGN
    : (cardRatePerUSDNGN * ALL_CURRENCIES[0].rateToUSD) / (globalCurrency.rateToUSD || 1);

  const cleanForexAmount = Number(forexAmount.replace(/,/g, "")) || 0;
  const convertedForexAmount = (cleanForexAmount * (fromCurrency.rateToUSD || 1)) / (toCurrency.rateToUSD || 1);

  const handleSwapForex = () => {
    setIsSpinning(true);
    setTimeout(() => setIsSpinning(false), 350);
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  return (
    <section className="card currency-card executive-calc-card" id="advanced-calculator">
      <div className="section-heading calculator-heading-wrap">
        <div>
          <h3><CircleDollarSign size={17} /> Currency Converter</h3>
          <p>Live payouts calculated in <strong>{globalCurrency.currency}</strong></p>
        </div>
        <div className="calc-mode-switch">
          <button type="button" className={calcMode === "crypto" ? "active" : ""} onClick={() => setCalcMode("crypto")}>Crypto</button>
          <button type="button" className={calcMode === "giftcard" ? "active" : ""} onClick={() => setCalcMode("giftcard")}>Gift Cards</button>
          <button type="button" className={calcMode === "forex" ? "active" : ""} onClick={() => setCalcMode("forex")}>Forex</button>
        </div>
      </div>

      <div className="pane-animated-wrap">
        {calcMode === "crypto" ? (
          <div key="crypto" className="currency-content single-pane-converter pane-fade-in">
            <div className="converter-box">
              <label>Cryptocurrency Asset</label>
              <div className="custom-currency-picker" ref={cryptoDropdownRef} style={{ width: "100%", marginBottom: "10px" }}>
                <button type="button" className="picker-trigger" style={{ width: "100%", justifyContent: "space-between" }} onClick={() => setCryptoDropdownOpen(v => !v)}>
                  <span style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                    <CoinsIcon symbol={selectedCrypto?.symbol} size={22} />
                    <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {selectedCrypto ? `${selectedCrypto.name} (${selectedCrypto.symbol})` : (loadingMarket ? "Loading live assets..." : "No assets available")}
                    </strong>
                  </span>
                  <ChevronDown size={13} style={{ flexShrink: 0 }} />
                </button>
                {cryptoDropdownOpen && (
                  <div className="picker-dropdown" style={{ width: "100%" }}>
                    <div className="picker-list no-scrollbar">
                      {cryptoRates.map(c => (
                        <button key={c.symbol} type="button" className={`picker-item ${selectedCrypto?.symbol === c.symbol ? "active" : ""}`} onClick={() => { setSelectedCrypto(c); setCryptoDropdownOpen(false); }}>
                          <CoinsIcon symbol={c.symbol} size={22} />
                          <div className="item-info"><strong>{c.name} ({c.symbol})</strong><small>Network: {c.defaultNetwork || "Standard"}</small></div>
                          {selectedCrypto?.symbol === c.symbol && <Check size={14} className="item-check" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <label htmlFor="crypto-usd">Amount ($ USD Equivalent)</label>
              <div className="currency-input" style={{ marginBottom: "12px" }}>
                <input id="crypto-usd" inputMode="decimal" value={cryptoAmountUSD} onChange={e => setCryptoAmountUSD(e.target.value.replace(/[^\d.]/g, ""))} placeholder="100" />
                <span className="currency-code">USD</span>
              </div>

              <div className="giftcard-payout-box calc-payout-surface">
                <div className="calc-payout-meta">
                  <span>Net Payout ({globalCurrency.currency})</span>
                  <span className="live-status"><i /> Live Feed Active</span>
                </div>
                <div className="tabular-nums calc-payout-amount">
                  {globalCurrency.symbol}{netUserReceivesGlobal > 0 ? netUserReceivesGlobal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                </div>
              </div>

              <button type="button" className="convert-button" onClick={() => setActivePage("Crypto & RWA")}>
                Proceed with {selectedCrypto?.symbol?.toUpperCase() || "Crypto"} Off-ramp <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : calcMode === "giftcard" ? (
          <div key="giftcard" className="currency-content single-pane-converter pane-fade-in">
            <div className="converter-box">
              <label>Top Traded Gift Card Brand</label>
              <div className="custom-currency-picker" ref={brandDropdownRef} style={{ width: "100%", marginBottom: "10px" }}>
                <button type="button" className="picker-trigger" style={{ width: "100%", justifyContent: "space-between" }} onClick={() => setBrandDropdownOpen(v => !v)}>
                  <span style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                    <GiftCardIcon name={selectedBrand?.name} />
                    <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {selectedBrand ? selectedBrand.name : (loadingMarket ? "Fetching top gift cards..." : "No gift cards available")}
                    </strong>
                  </span>
                  <ChevronDown size={13} style={{ flexShrink: 0 }} />
                </button>
                {brandDropdownOpen && (
                  <div className="picker-dropdown" style={{ width: "100%" }}>
                    <div className="picker-list no-scrollbar">
                      {giftCardRates.map(b => (
                        <button key={b.id || b.slug} type="button" className={`picker-item ${selectedBrand?.slug === b.slug ? "active" : ""}`} onClick={() => { setSelectedBrand(b); setBrandDropdownOpen(false); }}>
                          <GiftCardIcon name={b.name} />
                          <div className="item-info">
                            <strong>{b.name}</strong>
                            <small>Rate: {globalCurrency.symbol}{((globalCurrency.currency === "NGN" ? Number(b.rate || 0) : (Number(b.rate || 0) * ALL_CURRENCIES[0].rateToUSD) / (globalCurrency.rateToUSD || 1))).toLocaleString()}/$</small>
                          </div>
                          {selectedBrand?.slug === b.slug && <Check size={14} className="item-check" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <label htmlFor="card-usd">Card Value ($ USD)</label>
              <div className="currency-input" style={{ marginBottom: "12px" }}>
                <input id="card-usd" inputMode="decimal" value={cardAmountUSD} onChange={e => setCardAmountUSD(e.target.value.replace(/[^\d.]/g, ""))} placeholder="50" />
                <span className="currency-code">USD</span>
              </div>

              <div className="giftcard-payout-box calc-payout-surface calc-payout-row">
                <div>
                  <small>Estimated Payout ({globalCurrency.currency})</small>
                  <div className="tabular-nums calc-payout-amount">
                    {globalCurrency.symbol}{totalPayoutGlobal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <span className="live-status tabular-nums"><i /> Rate: {globalCurrency.symbol}{currentCardRateGlobal.toFixed(2)}/$</span>
              </div>

              <button type="button" className="convert-button" onClick={() => setActivePage("Gift Cards")}>
                Trade this gift card <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div key="forex" className="currency-content single-pane-converter pane-fade-in">
            <div className="converter-box">
              <label style={{ marginBottom: "6px" }}>Amount to convert</label>
              <div className="currency-input" style={{ marginBottom: "10px", overflow: "visible" }}>
                <input type="text" inputMode="decimal" value={forexAmount} onChange={e => setForexAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="100" />
                <div className="custom-currency-picker" ref={fromRef}>
                  <button type="button" className="picker-trigger" style={{ height: "34px", padding: "0 8px", fontSize: "10.5px" }} onClick={() => { setFromOpen(v => !v); setToOpen(false); }}>
                    <CurrencyIcon currency={fromCurrency} size={16} />
                    <span><strong>{fromCurrency.currency}</strong></span>
                    <ChevronDown size={12} />
                  </button>
                  {fromOpen && (
                    <div className="picker-dropdown" style={{ right: 0, width: "210px" }}>
                      <div className="picker-list no-scrollbar">
                        {ALL_CURRENCIES.map(c => (
                          <button key={c.currency} type="button" className={`picker-item ${fromCurrency.currency === c.currency ? "active" : ""}`} style={{ padding: "8px 10px" }} onClick={() => { setFromCurrency(c); setFromOpen(false); }}>
                            <CurrencyIcon currency={c} size={20} />
                            <div className="item-info"><strong style={{ fontSize: "11px" }}>{c.currency}</strong><small style={{ fontSize: "9px" }}>{c.name}</small></div>
                            {fromCurrency.currency === c.currency && <Check size={13} className="item-check" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "center", margin: "-3px 0 6px" }}>
                <button type="button" onClick={handleSwapForex} className={`swap-invert-btn ${isSpinning ? "spinning" : ""}`} title="Invert currencies">
                  <ArrowDownUp size={14} />
                </button>
              </div>

              <label style={{ marginBottom: "6px" }}>Converted amount ({toCurrency.currency})</label>
              <div className="currency-input" style={{ marginBottom: "14px", background: "#f9f7f4", overflow: "visible" }}>
                <div className="tabular-nums" style={{ width: "100%", fontSize: "16px", fontWeight: "750", color: "var(--brown)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {convertedForexAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="custom-currency-picker" ref={toRef}>
                  <button type="button" className="picker-trigger" style={{ height: "34px", padding: "0 8px", fontSize: "10.5px" }} onClick={() => { setToOpen(v => !v); setFromOpen(false); }}>
                    <CurrencyIcon currency={toCurrency} size={16} />
                    <span><strong>{toCurrency.currency}</strong></span>
                    <ChevronDown size={12} />
                  </button>
                  {toOpen && (
                    <div className="picker-dropdown" style={{ right: 0, width: "210px" }}>
                      <div className="picker-list no-scrollbar">
                        {ALL_CURRENCIES.map(c => (
                          <button key={c.currency} type="button" className={`picker-item ${toCurrency.currency === c.currency ? "active" : ""}`} style={{ padding: "8px 10px" }} onClick={() => { setToCurrency(c); setToOpen(false); }}>
                            <CurrencyIcon currency={c} size={20} />
                            <div className="item-info"><strong style={{ fontSize: "11px" }}>{c.currency}</strong><small style={{ fontSize: "9px" }}>{c.name}</small></div>
                            {toCurrency.currency === c.currency && <Check size={13} className="item-check" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button type="button" className="convert-button" onClick={() => setActivePage("Wallet & Cards")}>
                Go to Wallet & Cards <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function CurrencyIcon({ currency, size = 22 }) {
  const c = currency || ALL_CURRENCIES[0];
  const code = (c.flagCode || "ng").toLowerCase();
  const [sourceIndex, setSourceIndex] = useState(0);
  const sources = [
    `https://cdn.jsdelivr.net/gh/HatScripts/circle-flags/flags/${code}.svg`,
    `https://flagcdn.com/w80/${code}.png`
  ];

  if (sourceIndex >= sources.length) {
    return (
      <div style={{ width: `${size}px`, height: `${size}px`, borderRadius: "50%", background: "#713b17", color: "#fff", display: "grid", placeItems: "center", fontSize: `${Math.max(9, Math.round(size * 0.42))}px`, fontWeight: "800", flexShrink: 0, border: "1px solid rgba(255,255,255,0.2)" }}>
        {c.currency}
      </div>
    );
  }

  return (
    <div style={{ width: `${size}px`, height: `${size}px`, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0, overflow: "hidden", background: "#fff", border: "1px solid rgba(0,0,0,0.08)" }}>
      <img src={sources[sourceIndex]} alt={c.currency || "Currency"} onError={() => setSourceIndex(prev => prev + 1)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    </div>
  );
}

function CoinsIcon({ symbol, size = 28 }) {
  const sym = (symbol || "").toLowerCase().trim();
  const upperSym = (symbol || "").toUpperCase();
  const [imgError, setImgError] = useState(false);
  const iconUrl = `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@0.18.1/svg/color/${sym}.svg`;

  if (!sym || imgError) {
    let bg = "#eaf3ff", color = "#4288d6";
    if (upperSym === "BTC") { bg = "#fff1dc"; color = "#c57c23"; }
    else if (upperSym === "ETH") { bg = "#f0eaff"; color = "#8160c7"; }
    else if (upperSym === "SOL") { bg = "#f3efff"; color = "#9945FF"; }
    else if (upperSym === "USDT" || upperSym === "USDC") { bg = "#e7f7ef"; color = "#169b6b"; }
    return <div style={{ width: `${size}px`, height: `${size}px`, borderRadius: "50%", background: bg, color, display: "grid", placeItems: "center", fontSize: `${Math.max(7.5, Math.round(size * 0.35))}px`, fontWeight: "800", flexShrink: 0 }}>{upperSym.slice(0, 3)}</div>;
  }

  return (
    <div style={{ width: `${size}px`, height: `${size}px`, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0, overflow: "hidden", background: "#fff", border: "1px solid #eee" }}>
      <img src={iconUrl} alt={upperSym} onError={() => setImgError(true)} style={{ width: `${Math.round(size * 0.72)}px`, height: `${Math.round(size * 0.72)}px`, objectFit: "contain" }} />
    </div>
  );
}

function GiftCardIcon({ name }) {
  const meta = getCardMeta(name);
  const [imgError, setImgError] = useState(false);
  const domainMap = {
    itunes: "apple.com", amazon: "amazon.com", steam: "steampowered.com", "google-play": "play.google.com",
    sephora: "sephora.com", roblox: "roblox.com", vanilla: "vanillagift.com", amex: "americanexpress.com",
    nike: "nike.com", xbox: "xbox.com", playstation: "playstation.com", footlocker: "footlocker.com",
    lululemon: "lululemon.com", macys: "macys.com", nordstrom: "nordstrom.com", walmart: "walmart.com", ebay: "ebay.com"
  };
  const domain = domainMap[meta.slug];
  const logoUrl = domain ? `https://logo.clearbit.com/${domain}` : null;

  if (!logoUrl || imgError) {
    return <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#fbf2df", color: "#8c522b", display: "grid", placeItems: "center", fontSize: "13px", flexShrink: 0, border: "1px solid #f0e2cd" }}>{meta.emoji || "🎁"}</div>;
  }

  return (
    <div style={{ width: "26px", height: "26px", borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0, overflow: "hidden", background: "#fff", border: "1px solid #eee" }}>
      <img src={logoUrl} alt={name || "Gift Card"} onError={() => setImgError(true)} style={{ width: "18px", height: "18px", objectFit: "contain" }} />
    </div>
  );
}

export default function Dashboard() {
  const initialCache = readInitialWalletCache();

  const [activePage, setActivePage] = useState(() => {
    try {
      const savedPage = localStorage.getItem(ACTIVE_PAGE_STORAGE_KEY);
      return savedPage && VALID_PAGES.has(savedPage) ? savedPage : "Dashboard";
    } catch {
      return "Dashboard";
    }
  });
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState(null);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalCurrency, setGlobalCurrency] = useState(ALL_CURRENCIES[0]);

  const savedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || "null");
    } catch {
      return null;
    }
  })();

  const [currentUser, setCurrentUser] = useState(savedUser || { id: 1, name: "Zaheer", email: "zaheer@cardnext.io" });
  const [walletBalance, setWalletBalance] = useState(() => {
    const cachedBal = initialCache?.balanceData?.walletBalance ?? initialCache?.walletBalance;
    return cachedBal !== undefined ? (parseFloat(cachedBal) || 0) : 0;
  });
  const [cryptoBalance, setCryptoBalance] = useState(() => {
    const cachedCrypto = initialCache?.balanceData?.cryptoBalance ?? initialCache?.balanceData?.crypto_balance ?? 0;
    return parseFloat(cachedCrypto) || 0;
  });
  const [transactions, setTransactions] = useState(() => {
    return Array.isArray(initialCache?.transactions) ? initialCache.transactions : [];
  });

  const [activeEsims, setActiveEsims] = useState(() => {
    return Array.isArray(initialCache?.activeEsims) ? initialCache.activeEsims : [];
  });
  const [isLoadingEsims, setIsLoadingEsims] = useState(false);

  const [cryptoRates, setCryptoRates] = useState([]);
  const [giftCardRates, setGiftCardRates] = useState([]);
  const [loadingMarket, setLoadingMarket] = useState(true);

  const loggedInUserId = currentUser?.id || 1;
  const userEmail = currentUser?.email || "zaheer@cardnext.io";

  const fetchActiveEsims = useCallback(async (targetUserId, signal = undefined) => {
    const numericId = Number(targetUserId);
    if (!Number.isInteger(numericId) || numericId <= 0) return;

    setIsLoadingEsims(true);
    try {
      const res = await fetch(`${ESIM_API_BASE_URL}/api/esim/history/${numericId}`, { signal });
      const data = await readJsonIfOk(res);
      if (signal?.aborted) return;

      if (data?.success && Array.isArray(data.history)) {
        const mappedSims = mapOrdersToActiveSims(data.history);
        setActiveEsims(mappedSims);
        try {
          const prevCache = readInitialWalletCache() || {};
          localStorage.setItem(WALLET_CACHE_KEY, JSON.stringify({
            ...prevCache,
            activeEsims: mappedSims,
            updatedAt: Date.now()
          }));
        } catch {}
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Active eSIMs fetch error:", err);
      }
    } finally {
      if (!signal?.aborted) setIsLoadingEsims(false);
    }
  }, []);

  const handleSignOut = useCallback(() => {
    clearAllSessionAndCaches();
    setCurrentUser(null);
    setWalletBalance(0);
    setCryptoBalance(0);
    setTransactions([]);
    setActiveEsims([]);
    setCryptoRates([]);
    setGiftCardRates([]);
    setActivePage("Auth");
  }, []);

  const applyWalletPayload = useCallback((payload) => {
    if (!payload || typeof payload !== "object") return;

    const balObj = payload.balanceData || payload;
    const rawWallet = balObj.walletBalance ?? balObj.balance;
    if (rawWallet !== undefined && rawWallet !== null) {
      const parsedWallet = parseFloat(rawWallet);
      if (Number.isFinite(parsedWallet)) {
        setWalletBalance(prev => (prev === parsedWallet ? prev : parsedWallet));
      }
    }

    const rawCrypto = balObj.cryptoBalance ?? balObj.crypto_balance;
    if (rawCrypto !== undefined && rawCrypto !== null) {
      const parsedCrypto = parseFloat(rawCrypto);
      if (Number.isFinite(parsedCrypto)) {
        setCryptoBalance(prev => (prev === parsedCrypto ? prev : parsedCrypto));
      }
    }

    if (Array.isArray(payload.transactions)) {
      setTransactions(payload.transactions);
    }

    if (Array.isArray(payload.activeEsims)) {
      setActiveEsims(payload.activeEsims);
    }
  }, []);

  const handleSetWalletBalanceFromChild = useCallback((nextValueOrUpdater) => {
    setWalletBalance(prev => {
      const resolved = typeof nextValueOrUpdater === "function"
        ? nextValueOrUpdater(prev)
        : nextValueOrUpdater;
      const numeric = Number.isFinite(Number(resolved)) ? Number(resolved) : prev;

      try {
        const currentCache = readInitialWalletCache() || {};
        const nextBalanceData = {
          ...(currentCache.balanceData || {}),
          walletBalance: numeric,
          netWorthUSD: numeric / 1500,
          liquidity: `₦${numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        };
        const nextCache = {
          ...currentCache,
          balanceData: nextBalanceData,
          updatedAt: Date.now()
        };
        localStorage.setItem(WALLET_CACHE_KEY, JSON.stringify(nextCache));
        window.dispatchEvent(
          new CustomEvent(WALLET_UPDATED_EVENT, {
            detail: {
              balanceData: nextBalanceData,
              transactions: Array.isArray(currentCache.transactions) ? currentCache.transactions : undefined,
              walletBalance: numeric
            }
          })
        );
      } catch {}

      return numeric;
    });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, activePage);
    } catch {}
  }, [activePage]);

  useEffect(() => {
    const handleNavigateDashboard = () => {
      setActivePage("Dashboard");
    };

    window.addEventListener("cardnext:navigate-dashboard", handleNavigateDashboard);
    return () => {
      window.removeEventListener("cardnext:navigate-dashboard", handleNavigateDashboard);
    };
  }, []);

  useEffect(() => {
    const handleWalletUpdated = (event) => {
      if (event?.detail) {
        applyWalletPayload(event.detail);
      }
      const fromCache = readInitialWalletCache();
      if (fromCache) {
        applyWalletPayload(fromCache);
      }
      fetchActiveEsims(loggedInUserId);
    };

    const handleStorage = (event) => {
      if (event.key === WALLET_CACHE_KEY) {
        if (!event.newValue) {
          setWalletBalance(0);
          setCryptoBalance(0);
          setTransactions([]);
          setActiveEsims([]);
          return;
        }
        try {
          applyWalletPayload(JSON.parse(event.newValue));
        } catch {}
      } else if (event.key === USER_STORAGE_KEY) {
        if (!event.newValue) {
          setCurrentUser(null);
          return;
        }
        try {
          const parsedUser = JSON.parse(event.newValue);
          if (parsedUser) setCurrentUser(parsedUser);
        } catch {}
      }
    };

    window.addEventListener(WALLET_UPDATED_EVENT, handleWalletUpdated);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(WALLET_UPDATED_EVENT, handleWalletUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, [applyWalletPayload, fetchActiveEsims, loggedInUserId]);

  useEffect(() => {
    if (activePage === "Auth") return;

    const controller = new AbortController();
    const { signal } = controller;

    const fetchUserData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/settings/profile/${encodeURIComponent(userEmail)}`, { signal });
        const data = await readJsonIfOk(res);
        if (data?.success && data.user) {
          setCurrentUser(data.user);
          try {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
          } catch {}
        }
      } catch (err) {
        if (err.name !== "AbortError") console.error("Profile fetch error:", err);
      }
    };

    const fetchWalletBalance = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/wallet/balance/${encodeURIComponent(loggedInUserId)}`, { signal });
        const data = await readJsonIfOk(res);
        if (data?.success) {
          const parsedWallet = parseFloat(data.walletBalance ?? data.balance ?? 0) || 0;
          const parsedCrypto = parseFloat(data.cryptoBalance ?? data.crypto_balance ?? 0) || 0;
          setWalletBalance(parsedWallet);
          setCryptoBalance(parsedCrypto);

          try {
            const prevCache = readInitialWalletCache() || {};
            localStorage.setItem(WALLET_CACHE_KEY, JSON.stringify({
              ...prevCache,
              balanceData: {
                ...(prevCache.balanceData || {}),
                ...data,
                walletBalance: parsedWallet,
                cryptoBalance: parsedCrypto
              },
              updatedAt: Date.now()
            }));
          } catch {}
        }
      } catch (err) {
        if (err.name !== "AbortError") console.error("Balance fetch error:", err);
      }
    };

    const fetchTransactions = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/wallet/transactions/${encodeURIComponent(loggedInUserId)}`, { signal });
        const data = await readJsonIfOk(res);
        if (data?.success && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
          try {
            const prevCache = readInitialWalletCache() || {};
            localStorage.setItem(WALLET_CACHE_KEY, JSON.stringify({
              ...prevCache,
              transactions: data.transactions,
              updatedAt: Date.now()
            }));
          } catch {}
          return;
        }

        const resAlt = await fetch(`${API_BASE_URL}/transactions/${encodeURIComponent(loggedInUserId)}`, { signal });
        const dataAlt = await readJsonIfOk(resAlt);
        if (dataAlt?.success && Array.isArray(dataAlt.transactions)) {
          setTransactions(dataAlt.transactions);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Transactions fetch error:", err);
        }
      }
    };

    if (userEmail) fetchUserData();
    fetchWalletBalance();
    fetchTransactions();
    fetchActiveEsims(loggedInUserId, signal);
    return () => controller.abort();
  }, [activePage, userEmail, loggedInUserId, fetchActiveEsims]);

  useEffect(() => {
    if (activePage === "Auth") return;

    const controller = new AbortController();
    const { signal } = controller;

    const loadMarketRates = async () => {
      try {
        const cachedRaw = sessionStorage.getItem(MARKET_SESSION_CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached && Date.now() - cached.timestamp < MARKET_SESSION_TTL) {
            setCryptoRates(cached.cryptoRates || []);
            setGiftCardRates(cached.giftCardRates || []);
            setLoadingMarket(false);
            return;
          }
        }
      } catch {}

      try {
        const [resCrypto, resCards] = await Promise.all([
          fetch(`${API_BASE_URL}/dashboard-crypto-rates`, { signal }),
          fetch(`${API_BASE_URL}/dashboard-gift-card-rates`, { signal })
        ]);
        const dataCrypto = await readJsonIfOk(resCrypto);
        const dataCards = await readJsonIfOk(resCards);

        const resolvedCrypto = dataCrypto?.success && Array.isArray(dataCrypto.rates) ? dataCrypto.rates : [];
        const resolvedCards = dataCards?.success && Array.isArray(dataCards.cards)
          ? dataCards.cards.map(b => {
              const meta = getCardMeta(b.name);
              return { ...b, slug: meta.slug, icon: meta.emoji, priority: meta.priority, rate: Number(b.rate || 0) };
            }).sort((a, b) => b.priority - a.priority)
          : [];

        setCryptoRates(resolvedCrypto);
        setGiftCardRates(resolvedCards);

        if (resolvedCrypto.length > 0 || resolvedCards.length > 0) {
          try {
            sessionStorage.setItem(MARKET_SESSION_CACHE_KEY, JSON.stringify({
              timestamp: Date.now(), cryptoRates: resolvedCrypto, giftCardRates: resolvedCards
            }));
          } catch {}
        }
      } catch (err) {
        if (err.name !== "AbortError") console.error("Market fetch error:", err);
      } finally {
        if (!signal.aborted) setLoadingMarket(false);
      }
    };

    loadMarketRates();
    return () => controller.abort();
  }, [activePage]);

  if (activePage === "Auth") {
    return (
      <AuthPage
        onLoginSuccess={(userData) => {
          if (userData) {
            const normalizedUser = userData.user || userData;
            setCurrentUser(normalizedUser);
            try {
              localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser));
              if (userData.sessionToken) {
                localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, userData.sessionToken);
              }
            } catch {}
            setWalletBalance(parseFloat(normalizedUser.walletBalance ?? normalizedUser.balance ?? 0) || 0);
            setCryptoBalance(parseFloat(normalizedUser.cryptoBalance ?? normalizedUser.crypto_balance ?? 0) || 0);
          }
          setActivePage("Dashboard");
        }}
      />
    );
  }

  const desktopSidebarWidth = sidebarCollapsed ? "80px" : "260px";

  return (
    <>
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap");

        :root {
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #202633; background: #f7f6f3; font-synthesis: none; text-rendering: optimizeLegibility;
          --brown: #713b17; --brown-dark: #3d1f10; --brown-mid: #8c522b; --gold: #f3c77c;
          --background: #f7f6f3; --card: #fff; --text: #202633; --muted: #858b95;
          --border: #e9e7e2; --green: #139768; --red: #df5c57; --shadow: 0 7px 24px rgba(37, 30, 22, .035);
        }

        * { box-sizing: border-box; min-width: 0; }
        html, body { margin: 0; padding: 0; width: 100%; max-width: 100%; min-width: 240px; min-height: 100vh; background: var(--background); overflow-x: clip; }
        button, input, select { font: inherit; max-width: 100%; }
        button { border: 0; cursor: pointer; }
        button:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid rgba(145, 91, 46, .25); outline-offset: 2px; }
        button:disabled { opacity: .45; cursor: not-allowed; }
        .tabular-nums { font-variant-numeric: tabular-nums; }

        @keyframes paneFadeIn { from { opacity: 0; transform: translateY(10px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .pane-fade-in { animation: paneFadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes spinSwap { 0% { transform: rotate(0deg) scale(1); } 50% { transform: rotate(180deg) scale(1.1); } 100% { transform: rotate(360deg) scale(1); } }
        .swap-invert-btn { width: 32px; height: 32px; border-radius: 50%; background: #f3ece3; color: var(--brown); display: grid; place-items: center; border: 1px solid #e5dcd0; cursor: pointer; transition: background 0.2s, transform 0.2s; z-index: 2; }
        .swap-invert-btn:hover { background: #ebdccf; transform: scale(1.05); }
        .swap-invert-btn.spinning svg { animation: spinSwap 0.35s cubic-bezier(0.4, 0, 0.2, 1); }

        @keyframes shootingStarGlide {
          0% { transform: translate3d(-120px, -40px, 0) rotate(22deg); opacity: 0; }
          18% { opacity: 0.85; }
          75% { opacity: 0.7; }
          100% { transform: translate3d(420px, 130px, 0) rotate(22deg); opacity: 0; }
        }

        @keyframes arrowPulseGlow {
          0%, 100% {
            filter: drop-shadow(0 0 5px rgba(217, 155, 56, 0.55)) drop-shadow(0 0 11px rgba(243, 199, 124, 0.28));
          }
          50% {
            filter: drop-shadow(0 0 8px rgba(243, 199, 124, 0.88)) drop-shadow(0 0 16px rgba(217, 155, 56, 0.45));
          }
        }

        .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }

        .app { min-height: 100vh; background: var(--background); display: flex; width: 100%; max-width: 100%; position: relative; overflow-x: clip; }
        .main-content {
          margin-left: ${desktopSidebarWidth};
          width: calc(100% - ${desktopSidebarWidth});
          max-width: calc(100% - ${desktopSidebarWidth});
          min-height: 100vh;
          padding: 32px 48px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          transition: margin-left 0.34s cubic-bezier(0.22, 1, 0.36, 1), width 0.34s cubic-bezier(0.22, 1, 0.36, 1), max-width 0.34s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .mobile-nav-arrow-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          padding: 0;
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
          color: #9e5c26;
          flex-shrink: 0;
          transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), color 0.18s ease;
        }
        .mobile-nav-arrow-btn:hover {
          color: var(--brown);
          transform: translateX(2px);
        }
        .mobile-nav-arrow-btn.is-open {
          color: var(--brown);
        }
        .naked-glow-arrow {
          color: #9e5c26;
          animation: arrowPulseGlow 2.4s ease-in-out infinite;
        }

        .mobile-mini-icon-rail {
          position: fixed;
          top: 6px;
          left: 6px;
          bottom: 6px;
          z-index: 55;
          width: 48px;
          padding: 8px 4px;
          border-radius: 15px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(175deg, #1b110b 0%, #341b0e 55%, #1d1009 100%);
          border: 1px solid rgba(243, 199, 124, 0.28);
          box-shadow: 0 14px 32px rgba(15, 9, 5, 0.24);
          transform: translateX(-66px);
          opacity: 0;
          pointer-events: none;
          will-change: transform, opacity;
          transition:
            transform 0.34s cubic-bezier(0.22, 1, 0.36, 1),
            opacity 0.24s ease;
        }
        .mobile-mini-icon-rail.is-open {
          transform: translateX(0);
          opacity: 1;
          pointer-events: auto;
        }
        .mini-rail-list {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          flex: 1;
          overflow-y: auto;
          padding: 2px 0;
          width: 100%;
        }
        .mini-rail-btn {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          display: grid;
          place-items: center;
          background: transparent;
          color: #cbb8a4;
          flex-shrink: 0;
          transition:
            background 0.16s ease,
            color 0.16s ease,
            transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .mini-rail-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff5e4;
          transform: scale(1.06);
        }
        .mini-rail-btn.is-active {
          background: linear-gradient(145deg, #f3c77c 0%, #d49442 100%);
          color: #231107;
          box-shadow: 0 5px 14px rgba(243, 199, 124, 0.32);
        }
        .mini-rail-close {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.07);
          color: #e7d7c5;
          flex-shrink: 0;
          transition: background 0.16s ease, color 0.16s ease, transform 0.2s ease;
        }
        .mini-rail-close:hover {
          background: rgba(255, 255, 255, 0.14);
          color: #fff;
          transform: rotate(90deg);
        }

        .sleek-page-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: transparent;
          border: 0;
          box-shadow: none;
          color: #6f3916;
          flex-shrink: 0;
          filter: drop-shadow(0 0 7px rgba(217, 155, 56, 0.28));
        }

        @media (max-width: 768px) {
          .app .sidebar,
          .app aside.sidebar,
          .app [class*="sidebar"]:not(.mobile-mini-icon-rail) {
            display: none !important;
          }
          .main-content {
            margin-left: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 8px 8px 18px !important;
          }
          .app.drawer-open .main-content {
            margin-left: 56px !important;
            width: calc(100% - 56px) !important;
            max-width: calc(100% - 56px) !important;
            padding: 8px 6px 18px 2px !important;
          }
          .desktop-only { display: none !important; }

          .top-header { margin-bottom: 8px !important; padding-bottom: 7px !important; }
          .header-inner-wrap { gap: 4px !important; }
          .header-left-cluster { gap: 5px !important; }
          .sleek-page-icon { width: 19px !important; height: 19px !important; }

          .dashboard-grid { gap: 8px !important; }
          .left-column, .right-column { gap: 8px !important; }

          .luxury-vault-card { padding: 10px !important; border-radius: 13px !important; }
          .vault-pill-tag { padding: 2px 6px !important; font-size: 7px !important; letter-spacing: 0.9px !important; gap: 4px !important; }
          .vault-pulse-dot { width: 4px !important; height: 4px !important; }
          .balance-currency-trigger { padding: 3px 6px !important; border-radius: 7px !important; font-size: 9px !important; gap: 3px !important; }
          .vault-hero-row { margin-top: 6px !important; gap: 4px !important; }
          .textured-balance-num { font-size: clamp(17px, 4.8vw, 21px) !important; letter-spacing: -0.5px !important; line-height: 1.12 !important; }
          .balance-eye-btn { width: 22px !important; height: 22px !important; border-radius: 6px !important; }
          .balance-change { padding: 2.5px 5px !important; font-size: 8.5px !important; border-radius: 6px !important; }

          .vault-ledger-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 5px !important; margin-top: 8px !important; }
          .vault-ledger-cell, .vault-crypto-cell { padding: 7px !important; border-radius: 9px !important; }
          .vault-cell-top { gap: 3px !important; margin-bottom: 2.5px !important; }
          .vault-cell-icon { width: 15px !important; height: 15px !important; border-radius: 5px !important; }
          .vault-cell-label { font-size: 8px !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .vault-cell-pct { font-size: 7.5px !important; }
          .vault-cell-value { font-size: clamp(10px, 2.7vw, 11.5px) !important; letter-spacing: -0.2px !important; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .vault-cell-sub { font-size: 7px !important; margin-top: 1.5px !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .vault-mini-assets { gap: 2px !important; margin-top: 3px !important; }
          .vault-asset-chip { padding: 1px 3.5px !important; font-size: 6.5px !important; gap: 2px !important; }

          .quick-section .section-heading { margin-bottom: 5px !important; }
          .quick-section .section-heading p { display: none !important; }
          .quick-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 5px !important; }
          .quick-card { min-height: 48px !important; padding: 6px !important; border-radius: 9px !important; gap: 5px !important; flex-direction: row !important; justify-content: flex-start !important; }
          .quick-icon { width: 25px !important; height: 25px !important; border-radius: 7px !important; flex-shrink: 0; }
          .quick-card > span:nth-child(2) { font-size: 9px !important; font-weight: 650 !important; line-height: 1.1 !important; text-align: left !important; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .quick-arrow { display: none !important; }

          .card { padding: 10px !important; border-radius: 11px !important; }
          .executive-calc-card { padding: 10px !important; }
          .section-heading { margin-bottom: 7px !important; gap: 4px !important; flex-wrap: wrap; }
          .section-heading h3 { font-size: 11.5px !important; gap: 5px !important; }
          .section-heading p { font-size: 9px !important; margin-top: 1px !important; }
          .section-kicker { font-size: 7px !important; margin-bottom: 1.5px !important; }
          .text-button { font-size: 9.5px !important; gap: 3px !important; }

          .transaction { min-height: 40px !important; gap: 6px !important; padding: 3px 0 !important; }
          .transaction-icon { width: 26px !important; height: 26px !important; border-radius: 7px !important; }
          .transaction-info strong { font-size: 10px !important; }
          .transaction-info span { font-size: 8px !important; }
          .transaction-amount { font-size: 9.5px !important; }
          .transaction-more { width: 16px !important; height: 16px !important; }
          .mobile-full-history-btn { min-height: 30px !important; font-size: 9px !important; margin-top: 7px !important; padding: 0 8px !important; }
          .empty-state { padding: 14px 6px !important; font-size: 10px !important; }

          .market-heading-wrap { align-items: center !important; }
          .crypto-vault-banner { padding: 6px 8px !important; border-radius: 8px !important; margin-bottom: 7px !important; gap: 5px !important; }
          .crypto-banner-badge { width: 20px !important; height: 20px !important; border-radius: 6px !important; }
          .crypto-banner-left small { font-size: 7px !important; }
          .crypto-banner-left strong { font-size: 10.5px !important; }
          .crypto-banner-pill { padding: 2.5px 5px !important; font-size: 8px !important; }
          .rates-sleek-list { gap: 5px !important; }
          .rate-sleek-row { padding: 5.5px 7px !important; border-radius: 8px !important; gap: 4px !important; }
          .rate-currency { gap: 5px !important; }
          .rate-currency strong { font-size: 9.5px !important; }
          .rate-asset-stack small { font-size: 8px !important; }
          .rate-price-col span, .rate-sleek-row > span { font-size: 9.5px !important; }
          .rate-price-col small { font-size: 8px !important; }
          .live-tag { padding: 1px 5px !important; font-size: 7.5px !important; }

          .calculator-heading-wrap { flex-direction: column !important; align-items: flex-start !important; justify-content: flex-start !important; gap: 5px !important; }
          .calc-mode-switch { width: 100%; justify-content: space-between; padding: 3px !important; gap: 2px !important; }
          .calc-mode-switch button { flex: 1; padding: 4px 4px !important; font-size: 8.5px !important; border-radius: 6px !important; }
          .currency-content { grid-template-columns: 1fr !important; gap: 6px !important; }
          .converter-box { padding: 8px !important; border-radius: 9px !important; }
          .converter-box label { font-size: 8px !important; margin-bottom: 3.5px !important; }
          .picker-trigger { height: 34px !important; padding: 0 7px !important; font-size: 9.5px !important; border-radius: 8px !important; }
          .currency-input { height: 35px !important; padding: 0 7px !important; gap: 5px !important; border-radius: 8px !important; }
          .currency-input input, .currency-input output { font-size: 12px !important; }
          .currency-code { padding: 4px 6px !important; font-size: 8.5px !important; border-radius: 6px !important; }
          .calc-payout-surface { padding: 8px !important; border-radius: 8px !important; margin-bottom: 8px !important; }
          .calc-payout-meta > span:first-child, .calc-payout-row small { font-size: 8px !important; }
          .calc-payout-amount { font-size: clamp(14px, 4vw, 17px) !important; word-break: break-word; }
          .convert-button { min-height: 34px !important; font-size: 9.5px !important; padding: 0 8px !important; border-radius: 8px !important; gap: 5px !important; }

          .esim-pass-item { padding: 8px !important; border-radius: 9px !important; gap: 5px !important; }
          .esim-country-info { font-size: 10.5px !important; gap: 5px !important; }
          .esim-status-pill { padding: 2px 6px !important; font-size: 8px !important; }
          .esim-progress-info { font-size: 9px !important; }

          .app-footer { margin-top: 12px !important; padding-top: 8px !important; flex-direction: column; align-items: center; text-align: center; gap: 2px !important; font-size: 8.5px !important; }
        }

        @media (max-width: 360px) {
          .mobile-mini-icon-rail { width: 42px; padding: 7px 3px; border-radius: 13px; }
          .mini-rail-btn { width: 30px; height: 30px; border-radius: 8px; }
          .app.drawer-open .main-content {
            margin-left: 50px !important;
            width: calc(100% - 50px) !important;
            max-width: calc(100% - 50px) !important;
            padding: 7px 5px 16px 2px !important;
          }
          .vault-ledger-grid { grid-template-columns: 1fr !important; }
          .quick-grid { grid-template-columns: 1fr !important; }
        }

        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
          .mobile-mini-icon-rail { display: none !important; }
          .mobile-nav-arrow-btn { display: none !important; }
        }

        .top-header { display: flex; width: 100%; margin-bottom: 30px; padding-bottom: 22px; border-bottom: 1px solid rgba(233, 231, 226, 0.9); }
        .header-inner-wrap { display: flex; align-items: center; justify-content: space-between; gap: 20px; width: 100%; }
        .header-left-cluster { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; }
        @media (max-width: 768px) {
          .header-right-cluster { justify-content: flex-end; width: auto; }
        }

        .header-title-block { display: flex; align-items: center; min-width: 0; flex: 1; }
        .header-right-cluster { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

        .header-wallet-badge { display: flex; align-items: center; gap: 6px; padding: 9px 14px; background: #fff; border: 1px solid var(--border); border-radius: 12px; font-size: 12px; font-weight: 750; color: var(--brown); box-shadow: var(--shadow); white-space: nowrap; cursor: pointer; }
        .header-wallet-badge:hover { border-color: #c9b097; }

        .mobile-actions-dropdown-wrap { position: relative; }
        .mobile-actions-trigger { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: #fff; border: 1px solid var(--border); border-radius: 8px; color: var(--brown); box-shadow: var(--shadow); cursor: pointer; flex-shrink: 0; }
        .mobile-actions-trigger.active { background: #f9f5f0; border-color: #c9b097; }
        .mobile-actions-popover { position: absolute; top: calc(100% + 8px); right: 0; z-index: 60; width: min(220px, calc(100vw - 72px)); padding: 12px; background: #fff; border: 1px solid var(--border); border-radius: 13px; box-shadow: 0 16px 45px rgba(26, 27, 28, 0.15); animation: paneFadeIn 0.15s ease-out; }
        .mobile-popover-wallet-info { display: flex; flex-direction: column; gap: 3px; padding: 8px 10px; background: #f9f5f0; border-radius: 9px; margin-bottom: 8px; cursor: pointer; }
        .mobile-popover-label { display: flex; align-items: center; gap: 5px; color: var(--muted); font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .mobile-popover-wallet-info strong { color: var(--brown); font-size: 13px; font-weight: 800; }
        .mobile-popover-action-item { display: flex; align-items: center; gap: 8px; width: 100%; height: 34px; padding: 0 8px; background: transparent; border-radius: 8px; color: #333842; font-size: 11px; font-weight: 700; text-align: left; cursor: pointer; }
        .mobile-popover-action-item:hover { background: #f4f1ec; color: var(--brown); }
        .mobile-badge-dot { width: 6px; height: 6px; background: #df5c57; border-radius: 50%; margin-left: auto; }
        .mobile-popover-divider { height: 1px; background: #f0ede6; margin: 6px 0; }
        .mobile-popover-user-row { display: flex; align-items: center; gap: 8px; padding: 4px; }
        .mobile-user-details { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .mobile-user-details strong { color: #20242b; font-size: 11.5px; font-weight: 750; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mobile-user-details span { color: var(--muted); font-size: 9.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mobile-popover-settings-btn { display: flex; align-items: center; gap: 7px; width: 100%; height: 34px; margin-top: 6px; padding: 0 8px; background: #f4f1ec; border-radius: 8px; color: var(--brown); font-size: 10.5px; font-weight: 700; cursor: pointer; }

        .header-primary { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 40px; padding: 0 16px; border-radius: 11px; color: #fff; background: var(--brown); font-size: 12px; font-weight: 700; box-shadow: 0 4px 12px #713b1720; transition: background .18s, transform .18s; cursor: pointer; white-space: nowrap; }
        .header-primary:hover { background: #542a12; transform: translateY(-1px); }

        .header-popover-wrap { position: relative; }
        .icon-button { display: grid; place-items: center; position: relative; width: 40px; height: 40px; border: 1px solid var(--border); border-radius: 11px; color: #555b63; background: #fff; box-shadow: var(--shadow); cursor: pointer; transition: background .15s; }
        .icon-button:hover, .icon-button.active { background: #f4f0e9; color: var(--brown); }
        .notification-dot { position: absolute; top: 10px; right: 10px; width: 6px; height: 6px; border: 2px solid white; border-radius: 50%; background: #df5c57; }

        .account-pill-button { display: flex; align-items: center; gap: 8px; height: 40px; color: #333842; background: #fff; border: 1px solid var(--border); padding: 0 12px 0 4px; border-radius: 24px; font-size: 12px; font-weight: 700; cursor: pointer; box-shadow: var(--shadow); }
        .account-pill-button:hover { border-color: #d0c5b8; }
        .avatar-button { width: 32px; height: 32px; border: 2px solid white; box-shadow: 0 0 0 1px var(--border); display: grid; place-items: center; border-radius: 50%; color: #fff; background: linear-gradient(145deg, #b48a68, #6d4935); font-size: 10.5px; font-weight: 800; flex-shrink: 0; }

        .header-popover { position: absolute; top: calc(100% + 10px); right: 0; z-index: 25; width: 220px; padding: 18px; border: 1px solid var(--border); border-radius: 14px; background: white; box-shadow: 0 16px 45px #1a1b1c18; animation: paneFadeIn 0.15s ease-out; }
        .header-popover strong { font-size: 12px; color: #20242b; }
        .header-popover p { margin: 6px 0 0; color: var(--muted); font-size: 11px; line-height: 1.5; }
        .header-popover button { margin-top: 12px; width: 100%; padding: 7px 10px; border-radius: 8px; background: #f4f1ec; color: var(--brown); font-size: 11px; font-weight: 700; cursor: pointer; }
        .account-popover { width: 200px; }

        .content-container { width: 100%; max-width: 100%; flex: 1; }
        .dashboard-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px; width: 100%; max-width: 100%; }
        @media (max-width: 900px) { .dashboard-grid { display: flex; flex-direction: column; gap: 8px; } }

        .left-column, .right-column { display: flex; flex-direction: column; gap: 28px; min-width: 0; width: 100%; max-width: 100%; }
        @media (max-width: 900px) { .left-column, .right-column { gap: 8px; } }

        .card { min-width: 0; max-width: 100%; padding: 28px; border: 1px solid var(--border); border-radius: 16px; background: var(--card); box-shadow: var(--shadow); width: 100%; }

        .executive-calc-card { background: linear-gradient(135deg, #ffffff 0%, #fcfbf9 100%); border: 1px solid #e2ded5; box-shadow: 0 12px 35px rgba(45, 33, 20, 0.05); padding: 32px; position: relative; z-index: 20; }
        .executive-market-card { background: linear-gradient(135deg, #ffffff 0%, #faf8f5 100%); border: 1px solid #e2ded5; }
        .market-list-container { max-height: 280px; overflow-y: auto; }

        .section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 24px; }
        .section-heading h3 { display: flex; align-items: center; gap: 8px; margin: 0; color: #242933; font-size: 16px; font-weight: 750; letter-spacing: -.25px; }
        .section-heading p { margin: 4px 0 0; color: #969ba2; font-size: 11.5px; line-height: 1.5; }
        .section-kicker { display: inline-flex; align-items: center; gap: 5px; margin-bottom: 6px; color: #b07a4c; font-size: 9.5px; font-weight: 800; letter-spacing: .8px; text-transform: uppercase; }
        .text-button { display: inline-flex; align-items: center; gap: 5px; padding: 4px 0; color: var(--brown); background: transparent; white-space: nowrap; font-size: 11px; font-weight: 700; cursor: pointer; }
        .text-button:hover { color: #a2612d; }

        .luxury-vault-card {
          position: relative; overflow: visible; padding: 24px 26px; border-radius: 20px; color: #fff;
          background:
            radial-gradient(ellipse at 92% 0%, rgba(243, 199, 124, 0.2), transparent 46%),
            radial-gradient(ellipse at 10% 100%, rgba(168, 96, 42, 0.22), transparent 50%),
            linear-gradient(145deg, #19110d 0%, #371d10 55%, #22120a 100%);
          border: 1px solid rgba(243, 199, 124, 0.24);
          box-shadow: 0 18px 40px rgba(25, 17, 13, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.08);
          width: 100%; max-width: 100%; z-index: 30;
        }
        .shooting-star-layer {
          position: absolute; inset: 0; border-radius: 20px; overflow: hidden; pointer-events: none; z-index: 1;
        }
        .shooting-star {
          position: absolute; width: 92px; height: 1.5px; border-radius: 999px;
          background: linear-gradient(90deg, rgba(243, 199, 124, 0), rgba(255, 236, 196, 0.9), #fff);
          box-shadow: 0 0 10px rgba(243, 199, 124, 0.65);
          opacity: 0;
        }
        .star-one { top: 22%; left: 8%; animation: shootingStarGlide 6.5s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
        .star-two { top: 48%; left: 28%; width: 68px; animation: shootingStarGlide 9s cubic-bezier(0.22, 1, 0.36, 1) 3.2s infinite; }

        .vault-title-stack { display: flex; flex-direction: column; gap: 4px; }
        .vault-pill-tag {
          display: inline-flex; align-items: center; gap: 6px; width: fit-content;
          padding: 4px 10px; border-radius: 999px; background: rgba(243, 199, 124, 0.14);
          border: 1px solid rgba(243, 199, 124, 0.28); color: var(--gold);
          font-size: 9px; font-weight: 850; letter-spacing: 1.4px;
        }
        .vault-pulse-dot { width: 5px; height: 5px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 8px #4ade80; }
        .balance-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; position: relative; z-index: 50; }

        .balance-currency-switcher-wrap { position: relative; }
        .balance-currency-trigger {
          display: flex; align-items: center; gap: 6px; padding: 6px 11px;
          border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 10px;
          color: #f6e7d4; background: rgba(255, 255, 255, 0.06); font-size: 11px; font-weight: 700; cursor: pointer;
        }
        .balance-currency-trigger:hover { background: rgba(255, 255, 255, 0.12); border-color: rgba(243, 199, 124, 0.35); }
        .balance-currency-popover {
          position: absolute; right: 0; top: calc(100% + 8px); width: min(210px, calc(100vw - 74px)); background: #11141a;
          border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 14px; padding: 10px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.6); z-index: 100; animation: paneFadeIn 0.15s ease-out;
        }
        .popover-title { display: block; color: #858b95; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px; padding-left: 6px; }
        .popover-list { display: flex; flex-direction: column; gap: 3px; max-height: 250px; overflow-y: auto; }
        .popover-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 10px; background: transparent; border-radius: 8px; text-align: left; cursor: pointer; color: #e2ded8; }
        .popover-item:hover, .popover-item.active { background: rgba(255, 255, 255, 0.1); color: #fff; }
        .popover-item-text { display: flex; flex-direction: column; gap: 1px; flex: 1; }
        .popover-item-text strong { font-size: 12px; font-weight: 750; }
        .popover-item-text small { font-size: 9.5px; color: #858b95; }
        .popover-symbol { color: #f3c77c; font-size: 12px; font-weight: 800; }

        .vault-hero-row { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 14px; }
        .textured-balance-num {
          margin: 0; font-size: clamp(27px, 2.6vw, 39px); font-weight: 900; letter-spacing: -1.15px; line-height: 1.08;
          background: linear-gradient(160deg, #ffffff 10%, #f8e3b7 52%, #dfb063 95%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 2px 10px rgba(243, 199, 124, 0.14));
        }
        .textured-sub-num {
          background: linear-gradient(155deg, #fff0cf 15%, #e5b25d 90%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .lean-meta-cluster { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .balance-eye-btn { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.14); background: rgba(255, 255, 255, 0.06); color: #f3dfca; cursor: pointer; }
        .balance-eye-btn:hover { background: rgba(255, 255, 255, 0.14); color: #fff; }
        .balance-change { display: inline-flex; align-items: center; gap: 4px; padding: 5px 9px; border-radius: 7px; color: #b7f1d5; background: rgba(27, 156, 100, 0.22); font-size: 11px; font-weight: 700; }

        .vault-ledger-grid {
          position: relative; z-index: 2; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px; margin-top: 18px;
        }
        .vault-ledger-cell, .vault-crypto-cell {
          padding: 13px 14px; border-radius: 14px; cursor: pointer; min-width: 0;
          transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;
        }
        .vault-ledger-cell {
          background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.09);
        }
        .vault-ledger-cell:hover { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.18); transform: translateY(-1px); }

        .vault-crypto-cell {
          background: linear-gradient(135deg, rgba(243, 199, 124, 0.13) 0%, rgba(140, 82, 43, 0.16) 100%);
          border: 1px solid rgba(243, 199, 124, 0.28);
        }
        .vault-crypto-cell:hover { border-color: rgba(243, 199, 124, 0.5); transform: translateY(-1px); }

        .vault-cell-top { display: flex; align-items: center; gap: 7px; margin-bottom: 8px; min-width: 0; }
        .vault-cell-icon { width: 22px; height: 22px; border-radius: 7px; display: grid; place-items: center; flex-shrink: 0; }
        .vault-cell-icon.cash { background: rgba(255, 255, 255, 0.12); color: #f5ebe0; }
        .vault-cell-icon.crypto { background: rgba(243, 199, 124, 0.22); color: var(--gold); }
        .vault-cell-label { font-size: 10.5px; color: #d8c7b4; font-weight: 600; flex: 1; min-width: 0; }
        .vault-cell-pct { font-size: 10px; font-weight: 750; color: #b7a490; flex-shrink: 0; }
        .vault-cell-pct.gold { color: var(--gold); }

        .vault-cell-value { display: block; font-size: 15.5px; font-weight: 850; color: #fff; letter-spacing: -0.35px; }
        .vault-cell-sub { display: block; margin-top: 4px; font-size: 9.5px; color: #a79482; }

        .vault-mini-assets { display: flex; align-items: center; gap: 5px; margin-top: 7px; flex-wrap: wrap; }
        .vault-asset-chip {
          display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px;
          border-radius: 6px; background: rgba(0, 0, 0, 0.28); border: 1px solid rgba(243, 199, 124, 0.18);
          font-size: 9px; font-weight: 700; color: #f6e6c8;
        }

        .crypto-vault-banner {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: 11px 14px; border-radius: 12px; margin-bottom: 12px;
          background: linear-gradient(120deg, #24150d 0%, #462512 100%);
          border: 1px solid rgba(243, 199, 124, 0.3); color: #fff;
        }
        .crypto-banner-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .crypto-banner-badge {
          width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center;
          background: rgba(243, 199, 124, 0.18); color: var(--gold); flex-shrink: 0;
        }
        .crypto-banner-left small { display: block; font-size: 8.5px; font-weight: 800; letter-spacing: 0.9px; color: var(--gold); }
        .crypto-banner-left strong { display: block; font-size: 14px; font-weight: 850; color: #fff; margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .crypto-banner-pill {
          padding: 4px 8px; border-radius: 7px; background: rgba(255, 255, 255, 0.1);
          color: #f3dfca; font-size: 9.5px; font-weight: 700; white-space: nowrap; flex-shrink: 0;
        }

        .calc-payout-surface { background: #f6efe6; padding: 16px; border-radius: 12px; margin-bottom: 16px; }
        .calc-payout-meta { display: flex; justify-content: space-between; align-items: center; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; }
        .calc-payout-meta > span:first-child { color: #8c522b; font-weight: 750; text-transform: uppercase; font-size: 10px; }
        .calc-payout-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
        .calc-payout-row small { color: #8c522b; font-weight: 750; text-transform: uppercase; font-size: 9.5px; display: block; margin-bottom: 2px; }
        .calc-payout-amount { font-size: 24px; font-weight: 850; color: #3d1f10; }

        .balance-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 42px; padding: 0 18px; border: 1px solid #ffffff27; border-radius: 9px; color: #fff; background: #ffffff12; font-size: 12px; font-weight: 600; transition: background .18s; cursor: pointer; }
        .balance-button:hover { background: #ffffff25; }

        .quick-section { min-width: 0; width: 100%; max-width: 100%; }
        .quick-section .section-heading { margin-bottom: 16px; }
        .quick-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; width: 100%; }
        .quick-card { position: relative; display: flex; align-items: center; flex-direction: column; justify-content: center; gap: 12px; min-width: 0; min-height: 130px; padding: 18px 10px; border: 1px solid var(--border); border-radius: 14px; color: #333842; background: white; box-shadow: var(--shadow); transition: transform .18s, box-shadow .18s, border-color .18s; width: 100%; cursor: pointer; }
        .quick-card:hover { transform: translateY(-3px); border-color: #d7c1a8; box-shadow: 0 10px 22px #2d21140c; }
        .quick-card > span:nth-child(2) { font-size: 12px; font-weight: 650; text-align: center; }
        .quick-icon { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 13px; }
        .quick-icon.blue { color: #4288d6; background: #eaf3ff; }
        .quick-icon.green { color: #169b6b; background: #e7f7ef; }
        .quick-icon.orange { color: #c57c23; background: #fff1dc; }
        .quick-icon.purple { color: #8160c7; background: #f0eaff; }
        .quick-arrow { position: absolute; top: 10px; right: 10px; color: #b9b6b0; opacity: 0; transition: opacity .18s; }
        .quick-card:hover .quick-arrow { opacity: 1; }

        .transaction-heading { margin-bottom: 16px; }
        .transaction { display: flex; align-items: center; gap: 14px; min-height: 70px; border-bottom: 1px solid #f0efec; transition: background 0.12s; padding: 0 6px; border-radius: 8px; min-width: 0; }
        .transaction:hover { background: #fcfbf9; }
        .transaction:last-child { border-bottom: 0; }
        .transaction-icon { display: grid; place-items: center; flex: 0 0 auto; width: 42px; height: 42px; border-radius: 12px; }
        .transaction-icon.debit { color: #d7655e; background: #fff0ed; }
        .transaction-icon.credit { color: #149b6b; background: #e9f8f0; }
        .transaction-info { display: flex; flex: 1; flex-direction: column; gap: 4px; min-width: 0; }
        .transaction-info strong { overflow: hidden; color: #343842; font-size: 12px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
        .transaction-info span { color: #989ca2; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .transaction-info i { padding: 0 2px; font-style: normal; }
        .transaction-amount { flex: 0 0 auto; font-size: 12px; font-weight: 750; white-space: nowrap; }
        .transaction-amount.credit { color: var(--green); }
        .transaction-amount.debit { color: #333842; }
        .transaction-more { display: grid; place-items: center; flex: 0 0 auto; width: 28px; height: 28px; color: #a4a6a7; background: transparent; cursor: pointer; }
        .empty-state { padding: 24px 10px; color: var(--muted); font-size: 11.5px; text-align: center; }

        .widget-card { display: flex; flex-direction: column; gap: 12px; }
        .esim-widget-list { display: flex; flex-direction: column; gap: 10px; }
        .esim-pass-item { padding: 12px; background: #faf9f6; border: 1px solid #f0ede6; border-radius: 12px; display: flex; flex-direction: column; gap: 8px; transition: border-color 0.15s ease, background 0.15s ease; }
        .esim-pass-item:hover { border-color: #d7c1a8; background: #fdfbf8; }
        .esim-pass-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .esim-country-info { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #2e343d; font-weight: 750; min-width: 0; }
        .esim-country-info strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .esim-flag { font-size: 16px; flex-shrink: 0; }
        .esim-status-pill { padding: 3px 8px; background: #e9f8f0; color: #139768; font-size: 9.5px; font-weight: 750; border-radius: 6px; flex-shrink: 0; }
        .esim-status-pill.expired { background: #fef2f2; color: #dc2626; }
        .esim-progress-info { display: flex; justify-content: space-between; gap: 8px; font-size: 10.5px; color: var(--muted); flex-wrap: wrap; }
        .esim-progress-info strong { color: var(--text); font-weight: 700; }
        .esim-progress-bar-bg { width: 100%; height: 6px; background: #e9e5de; border-radius: 3px; overflow: hidden; }
        .esim-progress-bar-fill { height: 100%; background: var(--brown); border-radius: 3px; transition: width 0.3s ease; }

        .calc-mode-switch { display: flex; gap: 4px; padding: 4px; background: #f0ece6; border-radius: 10px; }
        .calc-mode-switch button { padding: 7px 14px; border-radius: 8px; color: #858b95; background: transparent; font-size: 11px; font-weight: 750; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .calc-mode-switch button.active { background: white; color: var(--brown); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }

        .currency-card .section-heading { align-items: center; }
        .currency-card .section-heading h3 svg { color: #a76d3c; flex-shrink: 0; }
        .live-status { display: inline-flex; align-items: center; gap: 6px; color: #818780; font-size: 10px; }
        .live-status i { width: 6px; height: 6px; border-radius: 50%; background: #139768; }
        .currency-content { display: block; width: 100%; }
        .converter-box { position: relative; min-width: 0; max-width: 100%; padding: 22px; border: 1px solid #e8e4dc; border-radius: 14px; background: #ffffff; width: 100%; box-shadow: 0 4px 16px rgba(0,0,0,0.02); overflow: visible; }
        .converter-box label { display: block; margin-bottom: 8px; color: #777d85; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .currency-input { display: flex; align-items: center; gap: 10px; min-width: 0; max-width: 100%; height: 50px; padding: 0 14px; border: 1px solid #e5e1d8; border-radius: 10px; background: #faf9f6; position: relative; }
        .currency-input input, .currency-input output { width: 100%; min-width: 0; overflow: hidden; border: 0; outline: 0; color: #282d35; background: transparent; font-size: 16px; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }
        .currency-code { flex: 0 0 auto; padding: 7px 10px; border-radius: 7px; color: #6c5744; background: #f3ece3; font-size: 10.5px; font-weight: 750; }

        .custom-currency-picker { position: relative; flex-shrink: 0; }
        .picker-trigger { display: flex; align-items: center; gap: 8px; height: 48px; padding: 0 14px; background: #faf9f6; border: 1px solid #e5e1d8; border-radius: 10px; color: #333842; font-size: 12px; font-weight: 750; cursor: pointer; transition: background .15s, border-color .15s; max-width: 100%; }
        .picker-trigger:hover { background: #f3ede4; border-color: #d6c8b6; }
        .picker-dropdown { position: absolute; right: 0; top: calc(100% + 8px); z-index: 90; width: 100%; min-width: 0; max-width: calc(100vw - 74px); background: #14171f; border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 14px; box-shadow: 0 22px 50px rgba(15, 17, 22, 0.45); animation: paneFadeIn 0.15s ease-out; overflow: hidden; }
        .picker-list { max-height: 230px; overflow-y: auto; padding: 6px; }
        .picker-item { display: flex; align-items: center; gap: 12px; width: 100%; padding: 11px 12px; border-radius: 10px; background: transparent; text-align: left; cursor: pointer; transition: background .12s; }
        .picker-item:hover, .picker-item.active { background: rgba(255, 255, 255, 0.1); }
        .item-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
        .item-info strong { font-size: 12.5px; color: #f6f3ee; font-weight: 750; }
        .item-info small { font-size: 10.5px; color: #959ba6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .item-check { color: #f3c77c; margin-left: auto; flex-shrink: 0; }

        .convert-button { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 46px; border-radius: 10px; color: white; background: var(--brown); font-size: 12px; font-weight: 750; transition: .18s; cursor: pointer; box-shadow: 0 4px 12px rgba(113, 59, 23, 0.2); }
        .convert-button:hover { background: #562c10; }

        .rates-sleek-list { display: flex; flex-direction: column; gap: 8px; }
        .rate-sleek-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; background: #faf9f6; border: 1px solid #f2ede6; border-radius: 10px; transition: background 0.15s; min-width: 0; }
        .rate-sleek-row:hover { background: #f4efe6; }
        .crypto-rate-row { border-left: 3px solid #d99b38; }
        .rate-currency { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
        .rate-currency strong { color: #333842; font-size: 11.5px; font-weight: 750; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rate-asset-stack { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .rate-asset-stack small { font-size: 9.5px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rate-price-col { display: flex; align-items: baseline; gap: 3px; flex-shrink: 0; }
        .rate-price-col span, .rate-sleek-row > span { color: #3d2414; font-size: 11.5px; font-weight: 750; white-space: nowrap; }
        .rate-price-col small { font-size: 9.5px; color: var(--muted); }
        .live-tag { color: var(--green); font-size: 9.5px; font-weight: 750; background: #e9f8f0; padding: 2px 8px; border-radius: 6px; flex-shrink: 0; }

        .app-footer { display: flex; justify-content: space-between; gap: 12px; margin-top: 40px; padding: 20px 0 0; border-top: 1px solid #e9e6df; color: #a0a19d; font-size: 10px; width: 100%; box-sizing: border-box; }
        .app-footer span:last-child { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; justify-content: center; }
        .app-footer i { width: 4px; height: 4px; border-radius: 50%; background: #c6a77e; }

        .modal-overlay { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; background: #17130fc4; backdrop-filter: blur(5px); }
        .modal { width: min(100%, 450px); max-height: min(90vh, 700px); overflow-y: auto; padding: 30px; border: 1px solid #ffffffaa; border-radius: 18px; background: #fff; box-shadow: 0 25px 90px #0004; }
        .modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 25px; }
        .modal-kicker { color: #a47750; font-size: 9px; font-weight: 800; letter-spacing: 1.2px; }
        .modal-header h2 { margin: 7px 0 6px; color: #272b31; font-size: 24px; letter-spacing: -.6px; }
        .modal-header p { margin: 0; color: #888e95; font-size: 11px; line-height: 1.6; }
        .modal-close { display: grid; place-items: center; width: 36px; height: 36px; flex: 0 0 auto; border-radius: 10px; color: #666b72; background: #f5f3ef; cursor: pointer; }
        .modal-label { display: block; margin-bottom: 8px; color: #42464d; font-size: 11px; font-weight: 700; }
        .modal-input { display: flex; align-items: center; gap: 10px; height: 56px; margin-bottom: 20px; padding: 0 16px; border: 1px solid #dedbd4; border-radius: 10px; }
        .modal-input:focus-within { border-color: #a87951; box-shadow: 0 0 0 3px #a8795118; }
        .modal-input span { color: #5b412b; font-size: 20px; font-weight: 750; }
        .modal-input input { width: 100%; min-width: 0; border: 0; outline: 0; color: #272b31; font-size: 22px; font-weight: 750; background: transparent; }
        .fund-options { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
        .fund-option { display: flex; align-items: center; gap: 14px; min-height: 64px; padding: 12px 16px; border: 1px solid #e8e5df; border-radius: 11px; color: #696f76; background: white; text-align: left; cursor: pointer; }
        .fund-option.selected { border-color: #9c6b43; color: var(--brown); background: #fcf8f3; box-shadow: 0 0 0 1px #9c6b4310; }
        .fund-option > span { display: flex; flex: 1; flex-direction: column; gap: 4px; color: #363a42; font-size: 12px; font-weight: 700; }
        .fund-option small { color: #969a9e; font-size: 10px; font-weight: 400; }
        .modal-submit { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 48px; border-radius: 10px; color: white; background: var(--brown); font-size: 12px; font-weight: 700; transition: .18s; cursor: pointer; }
        .modal-notice { margin: 0 0 14px; padding: 12px; border-radius: 9px; color: #735329; background: #fbf2df; font-size: 11px; line-height: 1.5; }
        .secure-note { display: flex; align-items: center; justify-content: center; gap: 6px; margin: 14px 0 0; color: #92979b; font-size: 9px; }

        .coming-soon-modal { text-align: center; padding: 40px 30px 30px; }
        .coming-soon-icon-badge { display: grid; place-items: center; width: 64px; height: 64px; margin: 0 auto 20px; background: #f7eee3; color: var(--brown); border-radius: 20px; box-shadow: 0 8px 20px rgba(113, 59, 23, 0.1); }
        .coming-soon-modal h2 { margin: 8px 0 10px; font-size: 24px; font-weight: 800; }
        .coming-soon-modal p { color: var(--muted); font-size: 12px; line-height: 1.6; margin-bottom: 24px; }
        .notify-form { display: flex; flex-direction: column; gap: 10px; }
        .notify-form input { width: 100%; height: 48px; padding: 0 16px; border: 1px solid #dedbd4; border-radius: 10px; font-size: 12px; outline: 0; }
        .notify-form input:focus { border-color: var(--brown); box-shadow: 0 0 0 3px rgba(113, 59, 23, 0.12); }
        .success-notify-box { display: flex; align-items: center; gap: 10px; padding: 14px; background: #e9f8f0; color: #139768; border-radius: 10px; font-size: 11px; font-weight: 650; text-align: left; line-height: 1.4; }

        .placeholder-page { display: flex; align-items: flex-start; flex-direction: column; max-width: 650px; margin: 30px 0; padding: clamp(28px, 4vw, 48px); border: 1px solid var(--border); border-radius: 18px; background: white; box-shadow: var(--shadow); }
        .placeholder-icon { display: grid; place-items: center; width: 60px; height: 60px; margin-bottom: 28px; border-radius: 16px; color: var(--brown); background: #f7eee3; }
        .placeholder-page .section-kicker { margin-bottom: 10px; }
        .placeholder-page h2 { margin: 0 0 12px; font-size: 28px; letter-spacing: -.7px; }
        .placeholder-page p { max-width: 480px; margin: 0 0 24px; color: #858b95; font-size: 13px; line-height: 1.8; }
      `}</style>

      <div className={`app ${mobileOpen ? "drawer-open" : ""}`}>
        <MiniIconNavRail
          mobileOpen={mobileOpen}
          activePage={activePage}
          setActivePage={setActivePage}
          closeMobile={() => setMobileOpen(false)}
        />

        <Sidebar
          activePage={activePage}
          setActivePage={setActivePage}
          mobileOpen={mobileOpen}
          closeMobile={() => setMobileOpen(false)}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />

        <main className="main-content">
          <Header
            activePage={activePage}
            onAddMoney={() => setShowAddMoney(true)}
            currentUser={currentUser}
            walletBalance={walletBalance}
            setActivePage={setActivePage}
            mobileOpen={mobileOpen}
            onToggleMobileNav={() => setMobileOpen(v => !v)}
            onSignOut={handleSignOut}
          />

          <div className="content-container">
            {activePage === "Dashboard" && (
              <div className="dashboard-grid">
                <div className="left-column">
                  <BalanceCard
                    balanceVisible={balanceVisible}
                    setBalanceVisible={setBalanceVisible}
                    walletBalance={walletBalance}
                    cryptoBalance={cryptoBalance}
                    cryptoRates={cryptoRates}
                    setActivePage={setActivePage}
                    globalCurrency={globalCurrency}
                    setGlobalCurrency={setGlobalCurrency}
                  />
                  <RecentTransactions transactions={transactions} setActivePage={setActivePage} />
                  <AdvancedCalculator
                    setActivePage={setActivePage}
                    cryptoRates={cryptoRates}
                    giftCardRates={giftCardRates}
                    loadingMarket={loadingMarket}
                    globalCurrency={globalCurrency}
                  />
                </div>
                <div className="right-column">
                  <QuickAccess setActivePage={setActivePage} onOpenComingSoon={(feat) => setComingSoonFeature(feat)} />
                  <WealthAndAssetsMarketWidget
                    setActivePage={setActivePage}
                    cryptoRates={cryptoRates}
                    giftCardRates={giftCardRates}
                    loadingMarket={loadingMarket}
                    globalCurrency={globalCurrency}
                    cryptoBalance={cryptoBalance}
                    balanceVisible={balanceVisible}
                  />
                  <ActiveEsimWidget
                    activeEsims={activeEsims}
                    isLoadingEsims={isLoadingEsims}
                    setActivePage={setActivePage}
                  />
                </div>
              </div>
            )}

            {activePage === "Wallet & Cards" && <WalletPage onAddMoney={() => setShowAddMoney(true)} />}
            {activePage === "Travel & Flights" && (
              <TravelPage
                setActivePage={setActivePage}
                onNavigateDashboard={() => setActivePage("Dashboard")}
                onBackToDashboard={() => setActivePage("Dashboard")}
              />
            )}
            {activePage === "Global eSIMs" && (
              <EsimPage
                currentUser={currentUser}
                walletBalance={walletBalance}
                setWalletBalance={handleSetWalletBalanceFromChild}
              />
            )}
            {activePage === "Bills & Utilities" && <BillsPage />}
            {activePage === "Gift Cards" && <GiftCardsPage />}
            {activePage === "Crypto & RWA" && <CryptoRwaPage />}
            {activePage === "Settings" && <SettingsPage />}
            {activePage === "Help & Support" && <HelpAndSupportPage />}

            {activePage !== "Dashboard" &&
             activePage !== "Wallet & Cards" &&
             activePage !== "Travel & Flights" &&
             activePage !== "Global eSIMs" &&
             activePage !== "Bills & Utilities" &&
             activePage !== "Gift Cards" &&
             activePage !== "Crypto & RWA" &&
             activePage !== "Settings" &&
             activePage !== "Help & Support" && (
              <section className="placeholder-page">
                <div className="placeholder-icon"><Sparkles size={28} /></div>
                <span className="section-kicker">CARDNEXT WORKSPACE</span>
                <h2>{activePage}</h2>
                <p>This standalone workspace view is ready for its dedicated component. The sidebar remains constant while you build this out!</p>
                <button type="button" className="header-primary" onClick={() => setActivePage("Dashboard")}><LayoutDashboard size={16} /> Back to dashboard</button>
              </section>
            )}
          </div>

          <footer className="app-footer">
            <span>© 2026 CardNext</span>
            <span>Modular Workspace Architecture <i /> Secure financial experience concept</span>
          </footer>
        </main>

        {showAddMoney && <AddMoneyModal close={() => setShowAddMoney(false)} />}
        {comingSoonFeature && <ComingSoonModal featureName={comingSoonFeature} close={() => setComingSoonFeature(null)} />}
      </div>
    </>
  );
}