// Tools.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Smartphone,
  Bitcoin,
  ArrowRight,
  ChevronDown,
  Check,
  ArrowDownUp,
  CircleDollarSign,
  Wrench
} from "lucide-react";

const RAW_API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  "http://localhost:5000";
const API_BASE = RAW_API_BASE.replace(/\/+$/, "");
const API_BASE_URL = `${API_BASE}/api`;
const ESIM_API_BASE_URL = API_BASE;

const MARKET_SESSION_CACHE_KEY = "cardnext_market_rates_v1";
const MARKET_SESSION_TTL = 5 * 60 * 1000;
const WALLET_CACHE_KEY = "cardnext_wallet_cache";
const WALLET_UPDATED_EVENT = "cardnext:wallet-updated";

export const TOOL_CURRENCIES = [
  { currency: "NGN", name: "Nigerian Naira", flagCode: "ng", rateToUSD: 1 / 1500, symbol: "₦" },
  { currency: "USD", name: "US Dollar", flagCode: "us", rateToUSD: 1.0, symbol: "$" },
  { currency: "GBP", name: "British Pound", flagCode: "gb", rateToUSD: 1.28, symbol: "£" },
  { currency: "EUR", name: "Euro", flagCode: "eu", rateToUSD: 1.08, symbol: "€" },
  { currency: "CAD", name: "Canadian Dollar", flagCode: "ca", rateToUSD: 0.73, symbol: "CA$" },
  { currency: "GHS", name: "Ghanaian Cedi", flagCode: "gh", rateToUSD: 0.075, symbol: "GH₵" }
];

function getCardMeta(name) {
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
}

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
  history.forEach((order) => {
    if (order?.status === "TOPUP_SUCCESS" && order?.iccid) {
      const addedGb = parsePlanSizeToGb(order.plan_size, 0);
      topupBonusByIccid[order.iccid] = (topupBonusByIccid[order.iccid] || 0) + addedGb;
    }
  });

  const primaryOrders = history.filter((order) => order?.status !== "TOPUP_SUCCESS");
  return primaryOrders.map((order, idx) => {
    const baseGb = parsePlanSizeToGb(order.plan_size, 1.0);
    const extraGb = order.iccid ? topupBonusByIccid[order.iccid] || 0 : 0;
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

function readWalletCache() {
  try {
    const raw = localStorage.getItem(WALLET_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function readJsonIfOk(response) {
  if (!response || !response.ok) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function CurrencyIcon({ currency, size = 22 }) {
  const c = currency || TOOL_CURRENCIES[0];
  const code = (c.flagCode || "ng").toLowerCase();
  const [sourceIndex, setSourceIndex] = useState(0);
  const sources = [
    `https://cdn.jsdelivr.net/gh/HatScripts/circle-flags/flags/${code}.svg`,
    `https://flagcdn.com/w80/${code}.png`
  ];

  if (sourceIndex >= sources.length) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: "50%",
          background: "#713b17",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          fontSize: `${Math.max(9, Math.round(size * 0.42))}px`,
          fontWeight: "800",
          flexShrink: 0,
          border: "1px solid rgba(255,255,255,0.2)"
        }}
      >
        {c.currency}
      </div>
    );
  }

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        overflow: "hidden",
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.08)"
      }}
    >
      <img
        src={sources[sourceIndex]}
        alt={c.currency || "Currency"}
        onError={() => setSourceIndex((prev) => prev + 1)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </div>
  );
}

function CoinsIcon({ symbol, size = 24 }) {
  const sym = (symbol || "").toLowerCase().trim();
  const upperSym = (symbol || "").toUpperCase();
  const [imgError, setImgError] = useState(false);
  const iconUrl = `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@0.18.1/svg/color/${sym}.svg`;

  if (!sym || imgError) {
    let bg = "#eaf3ff",
      color = "#4288d6";
    if (upperSym === "BTC") {
      bg = "#fff1dc";
      color = "#c57c23";
    } else if (upperSym === "ETH") {
      bg = "#f0eaff";
      color = "#8160c7";
    } else if (upperSym === "SOL") {
      bg = "#f3efff";
      color = "#9945FF";
    } else if (upperSym === "USDT" || upperSym === "USDC") {
      bg = "#e7f7ef";
      color = "#169b6b";
    }
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: "50%",
          background: bg,
          color,
          display: "grid",
          placeItems: "center",
          fontSize: `${Math.max(7.5, Math.round(size * 0.35))}px`,
          fontWeight: "800",
          flexShrink: 0
        }}
      >
        {upperSym.slice(0, 3)}
      </div>
    );
  }

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        overflow: "hidden",
        background: "#fff",
        border: "1px solid #eee"
      }}
    >
      <img
        src={iconUrl}
        alt={upperSym}
        onError={() => setImgError(true)}
        style={{
          width: `${Math.round(size * 0.72)}px`,
          height: `${Math.round(size * 0.72)}px`,
          objectFit: "contain"
        }}
      />
    </div>
  );
}

function GiftCardIcon({ name }) {
  const meta = getCardMeta(name);
  const [imgError, setImgError] = useState(false);
  const domainMap = {
    itunes: "apple.com",
    amazon: "amazon.com",
    steam: "steampowered.com",
    "google-play": "play.google.com",
    sephora: "sephora.com",
    roblox: "roblox.com",
    vanilla: "vanillagift.com",
    amex: "americanexpress.com",
    nike: "nike.com",
    xbox: "xbox.com",
    playstation: "playstation.com",
    footlocker: "footlocker.com",
    lululemon: "lululemon.com",
    macys: "macys.com",
    nordstrom: "nordstrom.com",
    walmart: "walmart.com",
    ebay: "ebay.com"
  };
  const domain = domainMap[meta.slug];
  const logoUrl = domain ? `https://logo.clearbit.com/${domain}` : null;

  if (!logoUrl || imgError) {
    return (
      <div
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          background: "#fbf2df",
          color: "#8c522b",
          display: "grid",
          placeItems: "center",
          fontSize: "12px",
          flexShrink: 0,
          border: "1px solid #f0e2cd"
        }}
      >
        {meta.emoji || "🎁"}
      </div>
    );
  }

  return (
    <div
      style={{
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        overflow: "hidden",
        background: "#fff",
        border: "1px solid #eee"
      }}
    >
      <img
        src={logoUrl}
        alt={name || "Gift Card"}
        onError={() => setImgError(true)}
        style={{ width: "16px", height: "16px", objectFit: "contain" }}
      />
    </div>
  );
}

export function ActiveEsimWidget({ activeEsims, isLoadingEsims, setActivePage }) {
  const simsArray = Array.isArray(activeEsims) ? activeEsims : [];

  return (
    <section className="card widget-card compact-widget-card stretch-widget">
      <div className="section-heading compact-section-heading">
        <div>
          <span className="section-kicker compact-kicker">
            <Smartphone size={11} /> CONNECTIVITY
          </span>
          <h3>Active eSIM Data Passes</h3>
          <p>Ongoing roaming packages</p>
        </div>
        <button
          type="button"
          className="text-button"
          onClick={() => setActivePage && setActivePage("Global eSIMs")}
        >
          {simsArray.length > 0 ? "View All" : "Buy eSIM"} <ArrowRight size={13} />
        </button>
      </div>

      {isLoadingEsims && simsArray.length === 0 ? (
        <div className="empty-state compact-empty">Loading active eSIMs...</div>
      ) : simsArray.length > 0 ? (
        <div className="esim-widget-list stretch-esim-list">
          {simsArray.slice(0, 2).map((sim, idx) => {
            const safeTotal = Number(sim.dataTotal) || 0;
            const safeUsed = Number(sim.dataUsed) || 0;
            const usagePercent =
              safeTotal > 0
                ? Math.min(100, Math.max(0, Math.round((safeUsed / safeTotal) * 100)))
                : 0;
            const statusClass = String(sim.status || "Active").toLowerCase();

            return (
              <div
                className="esim-pass-item compact-esim-item stretch-esim-item"
                key={sim.id || sim.iccid || idx}
                onClick={() => setActivePage && setActivePage("Global eSIMs")}
                style={{ cursor: "pointer" }}
              >
                <div className="esim-pass-header">
                  <div className="esim-country-info">
                    <span className="esim-flag">{sim.flag || "🌐"}</span>
                    <strong>{sim.country || "International"} eSIM</strong>
                  </div>
                  <span
                    className={`esim-status-pill ${statusClass === "expired" ? "expired" : ""}`}
                  >
                    {sim.status || "Active"}
                  </span>
                </div>
                <div className="esim-progress-info">
                  <span>
                    Plan: <strong>{sim.plan || `${safeTotal} GB`}</strong> · {safeUsed} /{" "}
                    {safeTotal} GB
                  </span>
                  <span>
                    Valid: <strong>{sim.expiry || "30 Days"}</strong>
                  </span>
                </div>
                <div className="esim-progress-bar-bg">
                  <div
                    className="esim-progress-bar-fill"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-esim-state compact-empty-esim">
          <div className="empty-esim-icon">
            <Smartphone size={15} />
          </div>
          <div>
            <strong>No active eSIM passes</strong>
            <p>Purchase a global data plan to track live usage.</p>
          </div>
          <button
            type="button"
            className="compact-inline-cta"
            onClick={() => setActivePage && setActivePage("Global eSIMs")}
          >
            Buy eSIM <ArrowRight size={12} />
          </button>
        </div>
      )}
    </section>
  );
}

export function WealthAndAssetsMarketWidget({
  setActivePage,
  cryptoRates,
  giftCardRates,
  loadingMarket,
  globalCurrency,
  cryptoBalance,
  balanceVisible
}) {
  const [marketTab, setMarketTab] = useState("crypto");
  const safeCrypto = Number(cryptoBalance) || 0;
  const activeCurrency = globalCurrency || TOOL_CURRENCIES[0];

  const convertRate = (amountInNGN) => {
    const amountInUSD = amountInNGN * TOOL_CURRENCIES[0].rateToUSD;
    return activeCurrency.currency === "NGN"
      ? amountInNGN
      : amountInUSD / (activeCurrency.rateToUSD || 1);
  };

  const formattedCryptoVault = `${activeCurrency.symbol}${convertRate(safeCrypto).toLocaleString(
    undefined,
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  )}`;

  return (
    <section className="card widget-card executive-market-card compact-widget-card stretch-widget">
      <div className="section-heading market-heading-wrap compact-section-heading">
        <div>
          <span className="section-kicker compact-kicker">
            <Bitcoin size={11} /> WEALTH & ASSETS
          </span>
          <h3>Live Market Rates</h3>
          <p>Real-time feeds in {activeCurrency.currency}</p>
        </div>
        <div className="calc-mode-switch compact-switch">
          <button
            type="button"
            className={marketTab === "crypto" ? "active" : ""}
            onClick={() => setMarketTab("crypto")}
          >
            Crypto
          </button>
          <button
            type="button"
            className={marketTab === "giftcards" ? "active" : ""}
            onClick={() => setMarketTab("giftcards")}
          >
            Gift Cards
          </button>
        </div>
      </div>

      {marketTab === "crypto" && (
        <div className="crypto-vault-banner compact-vault-banner">
          <div className="crypto-banner-left">
            <span className="crypto-banner-badge">
              <Bitcoin size={13} />
            </span>
            <div>
              <small>YOUR CRYPTO VAULT</small>
              <strong className="tabular-nums">
                {balanceVisible ? formattedCryptoVault : `${activeCurrency.symbol} ••••••`}
              </strong>
            </div>
          </div>
          <span className="crypto-banner-pill">{cryptoRates.length} Pairs</span>
        </div>
      )}

      <div className="pane-animated-wrap stretch-pane-wrap">
        {marketTab === "crypto" ? (
          <div key="crypto" className="market-list-container compact-market-list stretch-market-list no-scrollbar pane-fade-in">
            <div className="rates-sleek-list compact-rates-list">
              {cryptoRates.map((c) => (
                <div className="rate-sleek-row crypto-rate-row compact-rate-row" key={c.symbol}>
                  <div className="rate-currency">
                    <CoinsIcon symbol={c.symbol} size={22} />
                    <div className="rate-asset-stack">
                      <strong>{c.name}</strong>
                      <small>
                        {c.symbol} · {c.defaultNetwork || "Spot"}
                      </small>
                    </div>
                  </div>
                  <div className="rate-price-col">
                    <span className="tabular-nums">
                      {activeCurrency.symbol}
                      {convertRate(c.displayRateForUser || 0).toLocaleString(undefined, {
                        maximumFractionDigits: 2
                      })}
                    </span>
                    <small>/ $100</small>
                  </div>
                  <small className="live-tag">Live</small>
                </div>
              ))}
              {cryptoRates.length === 0 && !loadingMarket && (
                <div className="empty-state compact-empty">No crypto rates available right now.</div>
              )}
              {loadingMarket && cryptoRates.length === 0 && (
                <div className="empty-state compact-empty">Loading live crypto feeds...</div>
              )}
            </div>
          </div>
        ) : (
          <div key="giftcards" className="market-list-container compact-market-list stretch-market-list no-scrollbar pane-fade-in">
            <div className="rates-sleek-list compact-rates-list">
              {giftCardRates.map((b) => (
                <div className="rate-sleek-row compact-rate-row" key={b.id || b.slug}>
                  <div className="rate-currency">
                    <GiftCardIcon name={b.name} />
                    <strong>{b.name}</strong>
                  </div>
                  <span className="tabular-nums">
                    {activeCurrency.symbol}
                    {convertRate(Number(b.rate) || 0).toLocaleString(undefined, {
                      maximumFractionDigits: 2
                    })}
                    /$
                  </span>
                  <small className="live-tag">Top Traded</small>
                </div>
              ))}
              {giftCardRates.length === 0 && !loadingMarket && (
                <div className="empty-state compact-empty">No gift card rates available right now.</div>
              )}
              {loadingMarket && giftCardRates.length === 0 && (
                <div className="empty-state compact-empty">Loading top traded gift card feeds...</div>
              )}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        className="text-button compact-market-footer-btn"
        onClick={() =>
          setActivePage && setActivePage(marketTab === "crypto" ? "Crypto & RWA" : "Gift Cards")
        }
      >
        View full exchange marketplace <ArrowRight size={13} />
      </button>
    </section>
  );
}

export function AdvancedCalculator({
  setActivePage,
  cryptoRates,
  giftCardRates,
  loadingMarket,
  globalCurrency
}) {
  const activeCurrency = globalCurrency || TOOL_CURRENCIES[0];

  const [calcMode, setCalcMode] = useState("crypto");
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [cryptoAmountUSD, setCryptoAmountUSD] = useState("100");
  const [cryptoDropdownOpen, setCryptoDropdownOpen] = useState(false);
  const cryptoDropdownRef = useRef(null);

  const [selectedBrand, setSelectedBrand] = useState(null);
  const [cardAmountUSD, setCardAmountUSD] = useState("50");
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const brandDropdownRef = useRef(null);

  const [fromCurrency, setFromCurrency] = useState(TOOL_CURRENCIES[1]);
  const [toCurrency, setToCurrency] = useState(TOOL_CURRENCIES[0]);
  const [forexAmount, setForexAmount] = useState("100");
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const fromRef = useRef(null);
  const toRef = useRef(null);

  useEffect(() => {
    if (!selectedCrypto && Array.isArray(cryptoRates) && cryptoRates.length > 0) {
      setSelectedCrypto(cryptoRates[0]);
    }
  }, [cryptoRates, selectedCrypto]);

  useEffect(() => {
    if (!selectedBrand && Array.isArray(giftCardRates) && giftCardRates.length > 0) {
      setSelectedBrand(giftCardRates[0]);
    }
  }, [giftCardRates, selectedBrand]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (cryptoDropdownRef.current && !cryptoDropdownRef.current.contains(e.target)) {
        setCryptoDropdownOpen(false);
      }
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(e.target)) {
        setBrandDropdownOpen(false);
      }
      if (fromRef.current && !fromRef.current.contains(e.target)) {
        setFromOpen(false);
      }
      if (toRef.current && !toRef.current.contains(e.target)) {
        setToOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cleanCryptoUSD = Number(cryptoAmountUSD.replace(/,/g, "")) || 0;
  const netUserReceivesNGN =
    cleanCryptoUSD * (selectedCrypto ? selectedCrypto.displayRateForUser / 100 : 0);
  const netUserReceivesGlobal =
    activeCurrency.currency === "NGN"
      ? netUserReceivesNGN
      : (netUserReceivesNGN * TOOL_CURRENCIES[0].rateToUSD) / (activeCurrency.rateToUSD || 1);

  const cleanCardUSD = Number(cardAmountUSD.replace(/,/g, "")) || 0;
  const cardRatePerUSDNGN = Number(selectedBrand?.rate || 0);
  const totalPayoutNGN = cleanCardUSD * cardRatePerUSDNGN;
  const totalPayoutGlobal =
    activeCurrency.currency === "NGN"
      ? totalPayoutNGN
      : (totalPayoutNGN * TOOL_CURRENCIES[0].rateToUSD) / (activeCurrency.rateToUSD || 1);
  const currentCardRateGlobal =
    activeCurrency.currency === "NGN"
      ? cardRatePerUSDNGN
      : (cardRatePerUSDNGN * TOOL_CURRENCIES[0].rateToUSD) / (activeCurrency.rateToUSD || 1);

  const cleanForexAmount = Number(forexAmount.replace(/,/g, "")) || 0;
  const convertedForexAmount =
    (cleanForexAmount * (fromCurrency.rateToUSD || 1)) / (toCurrency.rateToUSD || 1);

  const handleSwapForex = () => {
    setIsSpinning(true);
    setTimeout(() => setIsSpinning(false), 350);
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  return (
    <section
      className="card currency-card executive-calc-card compact-calc-card stretch-calc-card"
      id="advanced-calculator"
    >
      <div className="section-heading calculator-heading-wrap compact-section-heading">
        <div>
          <h3>
            <CircleDollarSign size={16} /> Currency Converter
          </h3>
          <p>
            Payouts calculated in <strong>{activeCurrency.currency}</strong>
          </p>
        </div>
        <div className="calc-mode-switch compact-switch">
          <button
            type="button"
            className={calcMode === "crypto" ? "active" : ""}
            onClick={() => setCalcMode("crypto")}
          >
            Crypto
          </button>
          <button
            type="button"
            className={calcMode === "giftcard" ? "active" : ""}
            onClick={() => setCalcMode("giftcard")}
          >
            Gift Cards
          </button>
          <button
            type="button"
            className={calcMode === "forex" ? "active" : ""}
            onClick={() => setCalcMode("forex")}
          >
            Forex
          </button>
        </div>
      </div>

      <div className="pane-animated-wrap stretch-pane-wrap">
        {calcMode === "crypto" ? (
          <div
            key="crypto"
            className="currency-content single-pane-converter stretch-pane-content pane-fade-in"
          >
            <div className="converter-box compact-converter-box stretch-converter-box">
              <div className="calc-top-group">
                <div className="calc-field-row">
                  <div className="calc-field-group" ref={cryptoDropdownRef}>
                    <label>Asset</label>
                    <div className="custom-currency-picker" style={{ width: "100%" }}>
                      <button
                        type="button"
                        className="picker-trigger compact-picker-trigger"
                        style={{ width: "100%", justifyContent: "space-between" }}
                        onClick={() => setCryptoDropdownOpen((v) => !v)}
                      >
                        <span className="picker-trigger-label">
                          <CoinsIcon symbol={selectedCrypto?.symbol} size={20} />
                          <strong>
                            {selectedCrypto
                              ? `${selectedCrypto.name} (${selectedCrypto.symbol})`
                              : loadingMarket
                              ? "Loading..."
                              : "No assets"}
                          </strong>
                        </span>
                        <ChevronDown size={13} style={{ flexShrink: 0 }} />
                      </button>
                      {cryptoDropdownOpen && (
                        <div className="picker-dropdown compact-dropdown">
                          <div className="picker-list no-scrollbar">
                            {cryptoRates.map((c) => (
                              <button
                                key={c.symbol}
                                type="button"
                                className={`picker-item ${
                                  selectedCrypto?.symbol === c.symbol ? "active" : ""
                                }`}
                                onClick={() => {
                                  setSelectedCrypto(c);
                                  setCryptoDropdownOpen(false);
                                }}
                              >
                                <CoinsIcon symbol={c.symbol} size={20} />
                                <div className="item-info">
                                  <strong>
                                    {c.name} ({c.symbol})
                                  </strong>
                                  <small>Network: {c.defaultNetwork || "Standard"}</small>
                                </div>
                                {selectedCrypto?.symbol === c.symbol && (
                                  <Check size={14} className="item-check" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="calc-field-group calc-amount-col">
                    <label htmlFor="crypto-usd">Amount ($ USD)</label>
                    <div className="currency-input compact-input">
                      <input
                        id="crypto-usd"
                        inputMode="decimal"
                        value={cryptoAmountUSD}
                        onChange={(e) =>
                          setCryptoAmountUSD(e.target.value.replace(/[^\d.]/g, ""))
                        }
                        placeholder="100"
                      />
                      <span className="currency-code">USD</span>
                    </div>
                  </div>
                </div>

                <div className="giftcard-payout-box calc-payout-surface compact-payout-box stretch-payout-box">
                  <div className="calc-payout-meta">
                    <span>Net Payout ({activeCurrency.currency})</span>
                    <span className="live-status">
                      <i /> Live Feed Active
                    </span>
                  </div>
                  <div className="tabular-nums calc-payout-amount compact-payout-amount">
                    {activeCurrency.symbol}
                    {netUserReceivesGlobal > 0
                      ? netUserReceivesGlobal.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })
                      : "0.00"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="convert-button compact-submit-btn"
                onClick={() => setActivePage && setActivePage("Crypto & RWA")}
              >
                Proceed with {selectedCrypto?.symbol?.toUpperCase() || "Crypto"} Off-ramp{" "}
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : calcMode === "giftcard" ? (
          <div
            key="giftcard"
            className="currency-content single-pane-converter stretch-pane-content pane-fade-in"
          >
            <div className="converter-box compact-converter-box stretch-converter-box">
              <div className="calc-top-group">
                <div className="calc-field-row">
                  <div className="calc-field-group" ref={brandDropdownRef}>
                    <label>Gift Card Brand</label>
                    <div className="custom-currency-picker" style={{ width: "100%" }}>
                      <button
                        type="button"
                        className="picker-trigger compact-picker-trigger"
                        style={{ width: "100%", justifyContent: "space-between" }}
                        onClick={() => setBrandDropdownOpen((v) => !v)}
                      >
                        <span className="picker-trigger-label">
                          <GiftCardIcon name={selectedBrand?.name} />
                          <strong>
                            {selectedBrand
                              ? selectedBrand.name
                              : loadingMarket
                              ? "Loading..."
                              : "No cards"}
                          </strong>
                        </span>
                        <ChevronDown size={13} style={{ flexShrink: 0 }} />
                      </button>
                      {brandDropdownOpen && (
                        <div className="picker-dropdown compact-dropdown">
                          <div className="picker-list no-scrollbar">
                            {giftCardRates.map((b) => (
                              <button
                                key={b.id || b.slug}
                                type="button"
                                className={`picker-item ${
                                  selectedBrand?.slug === b.slug ? "active" : ""
                                }`}
                                onClick={() => {
                                  setSelectedBrand(b);
                                  setBrandDropdownOpen(false);
                                }}
                              >
                                <GiftCardIcon name={b.name} />
                                <div className="item-info">
                                  <strong>{b.name}</strong>
                                  <small>
                                    Rate: {activeCurrency.symbol}
                                    {(activeCurrency.currency === "NGN"
                                      ? Number(b.rate || 0)
                                      : (Number(b.rate || 0) * TOOL_CURRENCIES[0].rateToUSD) /
                                        (activeCurrency.rateToUSD || 1)
                                    ).toLocaleString()}
                                    /$
                                  </small>
                                </div>
                                {selectedBrand?.slug === b.slug && (
                                  <Check size={14} className="item-check" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="calc-field-group calc-amount-col">
                    <label htmlFor="card-usd">Card Value ($ USD)</label>
                    <div className="currency-input compact-input">
                      <input
                        id="card-usd"
                        inputMode="decimal"
                        value={cardAmountUSD}
                        onChange={(e) => setCardAmountUSD(e.target.value.replace(/[^\d.]/g, ""))}
                        placeholder="50"
                      />
                      <span className="currency-code">USD</span>
                    </div>
                  </div>
                </div>

                <div className="giftcard-payout-box calc-payout-surface calc-payout-row compact-payout-box stretch-payout-box">
                  <div>
                    <small>Estimated Payout ({activeCurrency.currency})</small>
                    <div className="tabular-nums calc-payout-amount compact-payout-amount">
                      {activeCurrency.symbol}
                      {totalPayoutGlobal.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </div>
                  </div>
                  <span className="live-status tabular-nums">
                    <i /> Rate: {activeCurrency.symbol}
                    {currentCardRateGlobal.toFixed(2)}/$
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="convert-button compact-submit-btn"
                onClick={() => setActivePage && setActivePage("Gift Cards")}
              >
                Trade this gift card <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div
            key="forex"
            className="currency-content single-pane-converter stretch-pane-content pane-fade-in"
          >
            <div className="converter-box compact-converter-box stretch-converter-box">
              <div className="calc-top-group">
                <label style={{ marginBottom: "6px" }}>Amount to convert</label>
                <div
                  className="currency-input compact-input"
                  style={{ marginBottom: "8px", overflow: "visible" }}
                >
                  <input
                    type="text"
                    inputMode="decimal"
                    value={forexAmount}
                    onChange={(e) => setForexAmount(e.target.value.replace(/[^\d.]/g, ""))}
                    placeholder="100"
                  />
                  <div className="custom-currency-picker" ref={fromRef}>
                    <button
                      type="button"
                      className="picker-trigger"
                      style={{ height: "32px", padding: "0 8px", fontSize: "10.5px" }}
                      onClick={() => {
                        setFromOpen((v) => !v);
                        setToOpen(false);
                      }}
                    >
                      <CurrencyIcon currency={fromCurrency} size={16} />
                      <span>
                        <strong>{fromCurrency.currency}</strong>
                      </span>
                      <ChevronDown size={12} />
                    </button>
                    {fromOpen && (
                      <div className="picker-dropdown" style={{ right: 0, width: "210px" }}>
                        <div className="picker-list no-scrollbar">
                          {TOOL_CURRENCIES.map((c) => (
                            <button
                              key={c.currency}
                              type="button"
                              className={`picker-item ${
                                fromCurrency.currency === c.currency ? "active" : ""
                              }`}
                              style={{ padding: "8px 10px" }}
                              onClick={() => {
                                setFromCurrency(c);
                                setFromOpen(false);
                              }}
                            >
                              <CurrencyIcon currency={c} size={20} />
                              <div className="item-info">
                                <strong style={{ fontSize: "11px" }}>{c.currency}</strong>
                                <small style={{ fontSize: "9px" }}>{c.name}</small>
                              </div>
                              {fromCurrency.currency === c.currency && (
                                <Check size={13} className="item-check" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="forex-swap-divider">
                  <button
                    type="button"
                    onClick={handleSwapForex}
                    className={`swap-invert-btn ${isSpinning ? "spinning" : ""}`}
                    title="Invert currencies"
                  >
                    <ArrowDownUp size={13} />
                  </button>
                </div>

                <label style={{ marginBottom: "6px" }}>
                  Converted amount ({toCurrency.currency})
                </label>
                <div
                  className="currency-input compact-input"
                  style={{ marginBottom: "12px", background: "#f9f7f4", overflow: "visible" }}
                >
                  <div
                    className="tabular-nums"
                    style={{
                      width: "100%",
                      fontSize: "15px",
                      fontWeight: "750",
                      color: "var(--brown)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {convertedForexAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                  <div className="custom-currency-picker" ref={toRef}>
                    <button
                      type="button"
                      className="picker-trigger"
                      style={{ height: "32px", padding: "0 8px", fontSize: "10.5px" }}
                      onClick={() => {
                        setToOpen((v) => !v);
                        setFromOpen(false);
                      }}
                    >
                      <CurrencyIcon currency={toCurrency} size={16} />
                      <span>
                        <strong>{toCurrency.currency}</strong>
                      </span>
                      <ChevronDown size={12} />
                    </button>
                    {toOpen && (
                      <div className="picker-dropdown" style={{ right: 0, width: "210px" }}>
                        <div className="picker-list no-scrollbar">
                          {TOOL_CURRENCIES.map((c) => (
                            <button
                              key={c.currency}
                              type="button"
                              className={`picker-item ${
                                toCurrency.currency === c.currency ? "active" : ""
                              }`}
                              style={{ padding: "8px 10px" }}
                              onClick={() => {
                                setToCurrency(c);
                                setToOpen(false);
                              }}
                            >
                              <CurrencyIcon currency={c} size={20} />
                              <div className="item-info">
                                <strong style={{ fontSize: "11px" }}>{c.currency}</strong>
                                <small style={{ fontSize: "9px" }}>{c.name}</small>
                              </div>
                              {toCurrency.currency === c.currency && (
                                <Check size={13} className="item-check" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="convert-button compact-submit-btn"
                onClick={() => setActivePage && setActivePage("Wallet & Cards")}
              >
                Go to Wallet & Cards <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function ToolsPage({
  setActivePage,
  userId,
  globalCurrency: propCurrency,
  cryptoBalance: propCryptoBalance,
  balanceVisible: propBalanceVisible = true,
  activeEsims: propActiveEsims,
  cryptoRates: propCryptoRates,
  giftCardRates: propGiftCardRates
}) {
  const initialCache = readWalletCache();

  const resolvedUserId =
    userId ||
    (() => {
      try {
        const u = JSON.parse(localStorage.getItem("cardnext_user") || "null");
        return u?.id || 1;
      } catch {
        return 1;
      }
    })();

  const activeCurrency = propCurrency || TOOL_CURRENCIES[0];

  const [cryptoBalance, setCryptoBalance] = useState(() => {
    if (propCryptoBalance !== undefined) return Number(propCryptoBalance) || 0;
    const cached =
      initialCache?.balanceData?.cryptoBalance ??
      initialCache?.balanceData?.crypto_balance ??
      0;
    return parseFloat(cached) || 0;
  });

  const [activeEsims, setActiveEsims] = useState(() =>
    Array.isArray(propActiveEsims)
      ? propActiveEsims
      : Array.isArray(initialCache?.activeEsims)
      ? initialCache.activeEsims
      : []
  );
  const [isLoadingEsims, setIsLoadingEsims] = useState(false);

  const [cryptoRates, setCryptoRates] = useState(() =>
    Array.isArray(propCryptoRates) ? propCryptoRates : []
  );
  const [giftCardRates, setGiftCardRates] = useState(() =>
    Array.isArray(propGiftCardRates) ? propGiftCardRates : []
  );
  const [loadingMarket, setLoadingMarket] = useState(
    !(Array.isArray(propCryptoRates) && propCryptoRates.length > 0)
  );

  useEffect(() => {
    if (propCryptoBalance !== undefined) {
      setCryptoBalance(Number(propCryptoBalance) || 0);
    }
  }, [propCryptoBalance]);

  useEffect(() => {
    if (Array.isArray(propActiveEsims)) setActiveEsims(propActiveEsims);
  }, [propActiveEsims]);

  useEffect(() => {
    if (Array.isArray(propCryptoRates) && propCryptoRates.length > 0) {
      setCryptoRates(propCryptoRates);
      setLoadingMarket(false);
    }
  }, [propCryptoRates]);

  useEffect(() => {
    if (Array.isArray(propGiftCardRates) && propGiftCardRates.length > 0) {
      setGiftCardRates(propGiftCardRates);
    }
  }, [propGiftCardRates]);

  const fetchActiveEsims = useCallback(async (targetUserId, signal = undefined) => {
    const numericId = Number(targetUserId);
    if (!Number.isInteger(numericId) || numericId <= 0) return;

    setIsLoadingEsims(true);
    try {
      const res = await fetch(`${ESIM_API_BASE_URL}/api/esim/history/${numericId}`, {
        signal
      });
      const data = await readJsonIfOk(res);
      if (signal?.aborted) return;

      if (data?.success && Array.isArray(data.history)) {
        const mapped = mapOrdersToActiveSims(data.history);
        setActiveEsims(mapped);
        try {
          const prev = readWalletCache() || {};
          localStorage.setItem(
            WALLET_CACHE_KEY,
            JSON.stringify({ ...prev, activeEsims: mapped, updatedAt: Date.now() })
          );
        } catch {}
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        console.error("Tools active eSIMs fetch error:", err);
      }
    } finally {
      if (!signal?.aborted) setIsLoadingEsims(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const loadMarket = async () => {
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
        if (signal.aborted) return;

        const resolvedCrypto =
          dataCrypto?.success && Array.isArray(dataCrypto.rates) ? dataCrypto.rates : [];
        const resolvedCards =
          dataCards?.success && Array.isArray(dataCards.cards)
            ? dataCards.cards
                .map((b) => {
                  const meta = getCardMeta(b.name);
                  return {
                    ...b,
                    slug: meta.slug,
                    icon: meta.emoji,
                    priority: meta.priority,
                    rate: Number(b.rate || 0)
                  };
                })
                .sort((a, b) => b.priority - a.priority)
            : [];

        setCryptoRates(resolvedCrypto);
        setGiftCardRates(resolvedCards);

        if (resolvedCrypto.length > 0 || resolvedCards.length > 0) {
          try {
            sessionStorage.setItem(
              MARKET_SESSION_CACHE_KEY,
              JSON.stringify({
                timestamp: Date.now(),
                cryptoRates: resolvedCrypto,
                giftCardRates: resolvedCards
              })
            );
          } catch {}
        }
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("Tools market fetch error:", err);
        }
      } finally {
        if (!signal.aborted) setLoadingMarket(false);
      }
    };

    const syncCryptoVault = async () => {
      const numericId = Number(resolvedUserId);
      if (!Number.isInteger(numericId) || numericId <= 0) return;
      try {
        const res = await fetch(`${API_BASE_URL}/wallet/balance/${numericId}`, { signal });
        const data = await readJsonIfOk(res);
        if (signal.aborted || !data?.success) return;
        const parsedCrypto = parseFloat(data.cryptoBalance ?? data.crypto_balance ?? 0) || 0;
        setCryptoBalance(parsedCrypto);
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("Tools crypto balance sync error:", err);
        }
      }
    };

    loadMarket();
    syncCryptoVault();
    fetchActiveEsims(resolvedUserId, signal);

    return () => controller.abort();
  }, [resolvedUserId, fetchActiveEsims]);

  useEffect(() => {
    const onWalletUpdated = (event) => {
      const detail = event?.detail || readWalletCache();
      if (!detail) return;
      const rawCrypto =
        detail?.balanceData?.cryptoBalance ??
        detail?.balanceData?.crypto_balance ??
        detail?.cryptoBalance;
      if (rawCrypto !== undefined && rawCrypto !== null) {
        const parsed = parseFloat(rawCrypto);
        if (Number.isFinite(parsed)) setCryptoBalance(parsed);
      }
      if (Array.isArray(detail?.activeEsims)) {
        setActiveEsims(detail.activeEsims);
      }
      fetchActiveEsims(resolvedUserId);
    };

    window.addEventListener(WALLET_UPDATED_EVENT, onWalletUpdated);
    return () => window.removeEventListener(WALLET_UPDATED_EVENT, onWalletUpdated);
  }, [fetchActiveEsims, resolvedUserId]);

  return (
    <div className="tools-page-wrap pane-fade-in">
      <div className="tools-header-strip">
        <div className="tools-header-left">
          <span className="tools-header-badge">
            <Wrench size={15} />
          </span>
          <div className="tools-header-copy">
            <span className="section-kicker compact-kicker">CARDNEXT UTILITIES</span>
            <h2 className="tools-page-title">Tools & Live Feeds</h2>
          </div>
        </div>

        <span className="tools-currency-pill">
          <CurrencyIcon currency={activeCurrency} size={15} />
          <span>{activeCurrency.currency}</span>
        </span>
      </div>

      <div className="tools-desktop-grid">
        <div className="tools-primary-col">
          <AdvancedCalculator
            setActivePage={setActivePage}
            cryptoRates={cryptoRates}
            giftCardRates={giftCardRates}
            loadingMarket={loadingMarket}
            globalCurrency={activeCurrency}
          />
        </div>

        <div className="tools-secondary-col">
          <WealthAndAssetsMarketWidget
            setActivePage={setActivePage}
            cryptoRates={cryptoRates}
            giftCardRates={giftCardRates}
            loadingMarket={loadingMarket}
            globalCurrency={activeCurrency}
            cryptoBalance={cryptoBalance}
            balanceVisible={propBalanceVisible}
          />
          <ActiveEsimWidget
            activeEsims={activeEsims}
            isLoadingEsims={isLoadingEsims}
            setActivePage={setActivePage}
          />
        </div>
      </div>

      <style>{`
        .tools-page-wrap {
          display: flex;
          flex-direction: column;
          gap: 14px;
          width: 100%;
          max-width: 100%;
          flex: 1;
        }

        .tools-header-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 14px;
          background: #fff;
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
        }

        .tools-header-left {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .tools-header-badge {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: #f7eee3;
          color: var(--brown);
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .tools-header-copy {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }

        .compact-kicker {
          margin-bottom: 2px !important;
          font-size: 8.5px !important;
          letter-spacing: 0.9px !important;
        }

        .tools-page-title {
          margin: 0;
          font-size: 15.5px;
          font-weight: 800;
          color: #202633;
          letter-spacing: -0.25px;
          line-height: 1.2;
        }

        .tools-currency-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 9px;
          background: #faf7f2;
          border: 1px solid #e6dfd3;
          font-size: 11px;
          font-weight: 750;
          color: var(--brown);
          flex-shrink: 0;
        }

        .tools-desktop-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
          gap: 16px;
          align-items: stretch;
          width: 100%;
          flex: 1;
        }

        .tools-primary-col,
        .tools-secondary-col {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
          height: 100%;
        }

        .compact-widget-card,
        .compact-calc-card {
          padding: 18px 20px !important;
          border-radius: 14px !important;
        }

        .stretch-calc-card {
          display: flex;
          flex-direction: column;
          flex: 1;
          height: 100%;
        }

        .stretch-pane-wrap {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .stretch-pane-content {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .stretch-converter-box {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          flex: 1;
          height: 100%;
        }

        .calc-top-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .stretch-payout-box {
          margin-bottom: 0 !important;
        }

        .stretch-widget {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .compact-section-heading {
          margin-bottom: 12px !important;
          align-items: center !important;
          gap: 10px !important;
        }

        .compact-section-heading h3 {
          font-size: 14px !important;
          gap: 6px !important;
        }

        .compact-section-heading p {
          margin-top: 2px !important;
          font-size: 10.5px !important;
        }

        .compact-switch {
          padding: 3px !important;
          border-radius: 9px !important;
        }

        .compact-switch button {
          padding: 5px 10px !important;
          font-size: 10.5px !important;
          border-radius: 7px !important;
        }

        .compact-converter-box {
          padding: 16px !important;
          border-radius: 12px !important;
        }

        .calc-field-row {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
          gap: 10px;
          align-items: end;
        }

        .calc-field-group {
          min-width: 0;
        }

        .calc-field-group label {
          margin-bottom: 5px !important;
          font-size: 9.5px !important;
        }

        .compact-picker-trigger {
          height: 42px !important;
          padding: 0 11px !important;
          border-radius: 9px !important;
          font-size: 11.5px !important;
        }

        .picker-trigger-label {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
          overflow: hidden;
        }

        .picker-trigger-label strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .compact-input {
          height: 42px !important;
          padding: 0 11px !important;
          border-radius: 9px !important;
          gap: 6px !important;
        }

        .compact-input input,
        .compact-input output {
          font-size: 14px !important;
        }

        .compact-dropdown {
          width: 100% !important;
          min-width: 220px !important;
          max-width: 100% !important;
        }

        .compact-payout-box {
          padding: 14px 16px !important;
          border-radius: 10px !important;
        }

        .compact-payout-amount {
          font-size: 21px !important;
          line-height: 1.2 !important;
        }

        .compact-submit-btn {
          min-height: 42px !important;
          font-size: 11.5px !important;
          border-radius: 9px !important;
          margin-top: 14px;
        }

        .forex-swap-divider {
          display: flex;
          justify-content: center;
          margin: -2px 0 2px;
        }

        .compact-vault-banner {
          padding: 9px 12px !important;
          border-radius: 10px !important;
          margin-bottom: 10px !important;
        }

        .compact-vault-banner .crypto-banner-badge {
          width: 26px !important;
          height: 26px !important;
          border-radius: 8px !important;
        }

        .compact-vault-banner .crypto-banner-left strong {
          font-size: 12.5px !important;
        }

        .compact-market-list {
          max-height: none !important;
          flex: 1;
        }

        .stretch-market-list {
          max-height: 250px !important;
        }

        .compact-rates-list {
          gap: 6px !important;
        }

        .compact-rate-row {
          padding: 8px 10px !important;
          border-radius: 9px !important;
        }

        .compact-rate-row .rate-currency strong {
          font-size: 11px !important;
        }

        .compact-rate-row .rate-price-col span,
        .compact-rate-row > span {
          font-size: 11px !important;
        }

        .compact-market-footer-btn {
          margin-top: auto !important;
          padding-top: 10px !important;
          width: 100%;
          justify-content: center;
        }

        .stretch-esim-list {
          flex: 1;
          justify-content: center;
        }

        .compact-esim-item {
          padding: 10px 12px !important;
          border-radius: 10px !important;
          gap: 6px !important;
        }

        .compact-empty {
          padding: 12px 6px !important;
          font-size: 11px !important;
        }

        .compact-empty-esim {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          background: #faf9f6;
          border: 1px dashed #e3ddd2;
          margin-top: auto;
        }

        .compact-empty-esim > div:nth-child(2) {
          flex: 1;
          min-width: 0;
        }

        .compact-empty-esim strong {
          display: block;
          font-size: 11px;
          color: #2d323b;
        }

        .compact-empty-esim p {
          margin: 1px 0 0;
          font-size: 10px;
          color: var(--muted);
        }

        .empty-esim-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: #f3ece2;
          color: var(--brown);
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .compact-inline-cta {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          border-radius: 8px;
          background: var(--brown);
          color: #fff;
          font-size: 10.5px;
          font-weight: 700;
          white-space: nowrap;
          flex-shrink: 0;
        }

        @media (max-width: 1024px) {
          .calc-field-row {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 900px) {
          .tools-desktop-grid {
            grid-template-columns: 1fr;
            gap: 8px;
            align-items: start;
          }
          .tools-primary-col,
          .tools-secondary-col {
            gap: 8px;
            height: auto;
          }
          .stretch-calc-card,
          .stretch-converter-box {
            height: auto;
          }
          .tools-header-strip {
            padding: 8px 10px;
            border-radius: 10px;
          }
          .tools-page-title {
            font-size: 13px;
          }
          .compact-widget-card,
          .compact-calc-card {
            padding: 10px !important;
            border-radius: 11px !important;
          }
          .compact-converter-box {
            padding: 8px !important;
          }
          .compact-empty-esim {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}