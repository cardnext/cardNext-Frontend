// Esim.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Smartphone, Globe2, Signal, Search, ShieldCheck,
  Check, Download, X, Loader2, AlertCircle, History, Wallet,
  ChevronDown, ChevronUp, Coins, Lock, PlusCircle, RefreshCw, Copy, ArrowUp, FileText
} from "lucide-react";

const API_BASE = "http://localhost:5000";
const CATALOG_CACHE_KEY = "cardnext_esim_catalog_cache_v1";
const CATALOG_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const WALLET_CACHE_KEY = "cardnext_wallet_cache";
const WALLET_UPDATED_EVENT = "cardnext:wallet-updated";

// Currency exchange rates mapping against USD base price (NGN is base wallet currency)
const CURRENCIES = {
  NGN: { symbol: "₦", rate: 1500, label: "NGN (₦)", name: "Nigerian Naira" },
  USD: { symbol: "$", rate: 1, label: "USD ($)", name: "US Dollar" },
  EUR: { symbol: "€", rate: 0.92, label: "EUR (€)", name: "Euro" },
  GBP: { symbol: "£", rate: 0.79, label: "GBP (£)", name: "British Pound" }
};

// Raindrop particles for subtle celebration rain on successful purchase
const RAIN_DROPS = Array.from({ length: 42 }, (_, idx) => ({
  id: idx,
  left: `${(idx * 2.4) % 100}%`,
  delay: `${(idx % 9) * 0.14}s`,
  duration: `${0.75 + (idx % 5) * 0.14}s`,
  opacity: 0.22 + (idx % 4) * 0.1,
  height: `${14 + (idx % 4) * 5}px`
}));

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function syncWalletCacheAndEvent(nextBalanceNGN, txRecord = null) {
  const numericBal = Number(nextBalanceNGN || 0);
  let existing = {};
  try {
    const raw = localStorage.getItem(WALLET_CACHE_KEY);
    if (raw) existing = JSON.parse(raw) || {};
  } catch {}

  const prevBalObj = existing.balanceData || {};
  const nextBalObj = {
    ...prevBalObj,
    walletBalance: numericBal,
    netWorthUSD: numericBal / CURRENCIES.NGN.rate,
    liquidity: `₦${numericBal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  };

  const existingTxs = Array.isArray(existing.transactions) ? existing.transactions : [];
  const nextTxs = txRecord
    ? [txRecord, ...existingTxs.filter(t => !txRecord.reference || t.reference !== txRecord.reference)]
    : existingTxs;

  try {
    localStorage.setItem(
      WALLET_CACHE_KEY,
      JSON.stringify({
        ...existing,
        balanceData: nextBalObj,
        transactions: nextTxs,
        updatedAt: Date.now()
      })
    );
  } catch {}

  window.dispatchEvent(
    new CustomEvent(WALLET_UPDATED_EVENT, {
      detail: {
        walletBalance: numericBal,
        balanceData: nextBalObj,
        transactions: nextTxs
      }
    })
  );
}

/**
 * Converts a plan size string like "500 MB · 7 Days" or "2 GB · 15 Days" into GB.
 */
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

/**
 * Formats insufficient-balance backend or client errors into a clean, classy message.
 */
function formatClassyErrorMessage(rawMessage = "") {
  const lower = String(rawMessage).toLowerCase();
  if (lower.includes("insufficient") || lower.includes("balance")) {
    return "Wallet balance too low for this plan. Top up your wallet to continue.";
  }
  return rawMessage || "Unable to complete request right now.";
}

export default function EsimPage({ onWalletSync }) {
  const [userId, setUserId] = useState(() => localStorage.getItem("userId") || null);
  const [activeTab, setActiveTab] = useState("Store"); // "Store", "My eSIMs", or "History"
  const [searchQuery, setSearchQuery] = useState("");
  const [currentCurrency, setCurrentCurrency] = useState("NGN");
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

  // Quick scroll-to-top button state
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Sleek rain overlay on successful purchase
  const [showPurchaseRain, setShowPurchaseRain] = useState(false);
  const rainTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  const currencyDropdownRef = useRef(null);

  // Dynamic API state
  const [rawApiPackages, setRawApiPackages] = useState([]);
  const [esimPackages, setEsimPackages] = useState([]);
  const [activeEsims, setActiveEsims] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [userBalanceNgn, setUserBalanceNgn] = useState(0);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [apiError, setApiError] = useState("");

  // Expanded card tracking for sleek accordion view
  const [expandedCardId, setExpandedCardId] = useState(null);

  // Purchase Modal states
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [lastTxRef, setLastTxRef] = useState("");

  // QR & Installation Modal states
  const [qrModalSim, setQrModalSim] = useState(null);
  const [copiedField, setCopiedField] = useState("");
  const [downloadedInvoiceKey, setDownloadedInvoiceKey] = useState("");
  const [openSummaryKey, setOpenSummaryKey] = useState(null);

  // Top-Up Modal states
  const [topupModalSim, setTopupModalSim] = useState(null);
  const [topupPackages, setTopupPackages] = useState([]);
  const [selectedTopup, setSelectedTopup] = useState(null);
  const [isLoadingTopups, setIsLoadingTopups] = useState(false);
  const [isProcessingTopup, setIsProcessingTopup] = useState(false);
  const [topupSuccess, setTopupSuccess] = useState(false);
  const [topupError, setTopupError] = useState("");

  // Usage refresh spinner state
  const [refreshingIccid, setRefreshingIccid] = useState(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Track vertical scroll position to show/hide quick back-to-top arrow
  useEffect(() => {
    const handleScroll = () => {
      const scrollY =
        window.scrollY ||
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
      setShowScrollTop(scrollY > 220);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, []);

  const scrollToTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (_) {
      window.scrollTo(0, 0);
    }
    document.documentElement.scrollTo?.({ top: 0, behavior: "smooth" });
    document.body.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  const triggerPurchaseRain = () => {
    setShowPurchaseRain(true);
    if (rainTimerRef.current) clearTimeout(rainTimerRef.current);
    rainTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setShowPurchaseRain(false);
      }
    }, 3600);
  };

  useEffect(() => {
    return () => {
      if (rainTimerRef.current) clearTimeout(rainTimerRef.current);
    };
  }, []);

  // Close currency dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target)) {
        setIsCurrencyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- 1. FETCH CATALOG, HISTORY & BALANCE ON MOUNT ---
  useEffect(() => {
    const controller = new AbortController();
    const activeUserId = localStorage.getItem("userId");
    if (!activeUserId || activeUserId === "null" || activeUserId === "undefined") {
      setUserId(null);
      setIsLoadingPackages(false);
      return;
    }
    setUserId(activeUserId);

    fetchCatalog(false, controller.signal);
    fetchUserHistory(activeUserId, controller.signal);
    fetchUserBalance(activeUserId, controller.signal);

    return () => controller.abort();
  }, []);

  // Recalculate package prices whenever user changes currency
  useEffect(() => {
    if (rawApiPackages.length > 0) {
      const formatted = transformAiraloPackages(rawApiPackages, currentCurrency);
      setEsimPackages(formatted);
    }
  }, [currentCurrency, rawApiPackages]);

  const formatPriceFromUsd = (usdAmount, currencyCode = currentCurrency) => {
    const currConfig = CURRENCIES[currencyCode] || CURRENCIES.NGN;
    const converted = usdAmount * currConfig.rate;
    return `${currConfig.symbol}${converted.toLocaleString(undefined, {
      minimumFractionDigits: currencyCode === "NGN" ? 0 : 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatConvertedFromNgn = (ngnAmount, currencyCode = currentCurrency) => {
    const parsedNgn = parseFloat(ngnAmount) || 0;
    if (currencyCode === "NGN") {
      return `₦${parsedNgn.toLocaleString()}`;
    }
    const currConfig = CURRENCIES[currencyCode] || CURRENCIES.NGN;
    const converted = (parsedNgn / CURRENCIES.NGN.rate) * currConfig.rate;
    return `${currConfig.symbol}${converted.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const formatWalletBalance = () => {
    const currConfig = CURRENCIES[currentCurrency] || CURRENCIES.NGN;
    const balanceInUsd = userBalanceNgn / CURRENCIES.NGN.rate;
    const converted = currentCurrency === "NGN" ? userBalanceNgn : balanceInUsd * currConfig.rate;
    return `${currConfig.symbol}${converted.toLocaleString(undefined, {
      minimumFractionDigits: currentCurrency === "NGN" ? 0 : 2,
      maximumFractionDigits: 2
    })}`;
  };

  const readCachedCatalog = () => {
    try {
      const raw = localStorage.getItem(CATALOG_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.data) || !parsed.timestamp) return null;
      if (Date.now() - parsed.timestamp > CATALOG_CACHE_TTL_MS) return null;
      return parsed.data;
    } catch (_) {
      return null;
    }
  };

  const writeCachedCatalog = (pkgList) => {
    try {
      localStorage.setItem(
        CATALOG_CACHE_KEY,
        JSON.stringify({ data: pkgList, timestamp: Date.now() })
      );
    } catch (_) {}
  };

  const fetchCatalog = async (forceRefresh = false, signal = undefined) => {
    if (isMountedRef.current) setApiError("");

    if (!forceRefresh) {
      const cached = readCachedCatalog();
      if (cached && cached.length > 0) {
        if (isMountedRef.current) {
          setRawApiPackages(cached);
          setEsimPackages(transformAiraloPackages(cached, currentCurrency));
          setIsLoadingPackages(false);
        }
        return;
      }
    }

    if (isMountedRef.current) setIsLoadingPackages(true);
    try {
      const url = forceRefresh
        ? `${API_BASE}/api/esim/packages?refresh=true`
        : `${API_BASE}/api/esim/packages`;
      const res = await fetch(url, { signal });
      const result = await res.json();
      if (!isMountedRef.current) return;

      const pkgList = Array.isArray(result) ? result : (result.data || result.packages || []);
      if (result.success !== false && pkgList.length > 0) {
        setRawApiPackages(pkgList);
        writeCachedCatalog(pkgList);
        const formatted = transformAiraloPackages(pkgList, currentCurrency);
        setEsimPackages(formatted);
      } else {
        setApiError(result.message || "Failed to retrieve package catalog from API.");
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("Backend network error:", err);
      if (isMountedRef.current) {
        setApiError("Network error: Unable to connect to backend server.");
      }
    } finally {
      if (isMountedRef.current) setIsLoadingPackages(false);
    }
  };

  const fetchUserHistory = async (targetUserId, signal = undefined) => {
    const activeId = targetUserId || userId;
    if (!activeId) return;

    if (isMountedRef.current) setIsLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE}/api/esim/history/${activeId}`, { signal });
      const result = await res.json();
      if (!isMountedRef.current) return;

      if (result.success && Array.isArray(result.history)) {
        setPurchaseHistory(result.history);

        const topupBonusByIccid = {};
        result.history.forEach(order => {
          if (order.status === "TOPUP_SUCCESS" && order.iccid) {
            const addedGb = parsePlanSizeToGb(order.plan_size, 0);
            topupBonusByIccid[order.iccid] = (topupBonusByIccid[order.iccid] || 0) + addedGb;
          }
        });

        const primaryOrders = result.history.filter(order => order.status !== "TOPUP_SUCCESS");
        const mappedActiveSims = primaryOrders.map(order => {
          const baseGb = parsePlanSizeToGb(order.plan_size, 1.0);
          const extraGb = topupBonusByIccid[order.iccid] || 0;
          const expiryMatch = order.plan_size?.match(/(\d+\s*Days?)/i);

          return {
            id: `sim-${order.id}`,
            orderId: order.id,
            country: order.country_name || "International",
            flag: getFlagFromCountryName(order.country_name),
            plan: order.plan_size || "1 GB",
            status: "Active",
            dataUsed: 0.0,
            dataTotal: Number((baseGb + extraGb).toFixed(2)),
            expiry: expiryMatch ? expiryMatch[1] : "30 Days",
            iccid: order.iccid,
            lpa: order.lpa || "lpa.airalo.com",
            matchingCode: order.matching_code || `CN-${(order.iccid || "").slice(-8)}`,
            qrCodeUrl:
              order.qr_code_url ||
              `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=LPA:1$lpa.airalo.com$${order.iccid}`
          };
        });

        setActiveEsims(mappedActiveSims);
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("Could not fetch purchase history:", err);
    } finally {
      if (isMountedRef.current) setIsLoadingHistory(false);
    }
  };

  const fetchUserBalance = async (targetUserId, signal = undefined) => {
    const activeId = targetUserId || userId;
    if (!activeId) return;

    try {
      let res = await fetch(`${API_BASE}/api/wallet/balance/${activeId}`, { signal });
      if (!res.ok) {
        res = await fetch(`${API_BASE}/api/esim/wallet/${activeId}`, { signal });
      }
      const result = await res.json();
      if (!isMountedRef.current) return;

      if (result.success && result.walletBalance !== undefined) {
        const bal = parseFloat(result.walletBalance) || 0;
        setUserBalanceNgn(bal);
        syncWalletCacheAndEvent(bal);
        if (typeof onWalletSync === "function") {
          onWalletSync(bal);
        }
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("Could not fetch user balance:", err);
    }
  };

  const handleTopRefresh = async () => {
    if (!userId) return;
    if (activeTab === "Store") {
      await fetchCatalog(true);
    } else if (activeTab === "My eSIMs" || activeTab === "History") {
      await fetchUserHistory(userId);
      await fetchUserBalance(userId);
    }
  };

  const isTopRefreshing =
    activeTab === "Store" ? isLoadingPackages : isLoadingHistory;

  const refreshSimUsage = async (sim) => {
    if (!sim?.iccid) return;
    setRefreshingIccid(sim.iccid);
    try {
      const res = await fetch(`${API_BASE}/api/esim/usage/${sim.iccid}`);
      const result = await res.json();
      if (!isMountedRef.current) return;

      if (result.success && result.usage) {
        setActiveEsims(prev =>
          prev.map(item => {
            if (item.iccid !== sim.iccid) return item;
            return {
              ...item,
              dataUsed: result.usage.usedGb ?? item.dataUsed,
              dataTotal: result.usage.totalGb ?? item.dataTotal,
              status: result.usage.status === "EXPIRED" ? "Expired" : "Active"
            };
          })
        );
      }
    } catch (err) {
      console.error("Failed to refresh SIM usage:", err);
    } finally {
      if (isMountedRef.current) setRefreshingIccid(null);
    }
  };

  const transformAiraloPackages = (data, currencyCode) => {
    const countryMap = {};
    const currConfig = CURRENCIES[currencyCode] || CURRENCIES.NGN;

    data.forEach((item) => {
      let packageList = [];
      if (Array.isArray(item.packages)) {
        packageList = item.packages;
      } else if (Array.isArray(item.operators)) {
        item.operators.forEach(op => {
          if (Array.isArray(op.packages)) packageList.push(...op.packages);
        });
      } else {
        packageList = [item];
      }

      packageList.forEach((pkg) => {
        const countryName = item.title || item.country || item.country_code || pkg.country || "Global";
        const code = item.country_code || pkg.country_code || "GL";
        const flag = getFlagEmoji(code);

        if (!countryMap[countryName]) {
          countryMap[countryName] = {
            id: code.toLowerCase(),
            country: countryName,
            flag: flag,
            plans: []
          };
        }

        const planSize = pkg.data || (pkg.amount ? `${pkg.amount} GB` : "1 GB");
        const planValidity = pkg.day ? `${pkg.day} Days` : (pkg.validity ? `${pkg.validity} Days` : "7 Days");

        const rawPriceUSD = parseFloat(pkg.price || pkg.retail_price || 5.0);
        const rawPriceNgn = Math.round(rawPriceUSD * CURRENCIES.NGN.rate);
        const displayPrice = rawPriceUSD * currConfig.rate;

        const exists = countryMap[countryName].plans.some(p => p.size === planSize && p.validity === planValidity);
        if (!exists) {
          countryMap[countryName].plans.push({
            id: pkg.id || `${code.toLowerCase()}-${planSize}-${planValidity}`,
            size: planSize,
            validity: planValidity,
            price: `${currConfig.symbol}${displayPrice.toLocaleString(undefined, {
              minimumFractionDigits: currencyCode === "NGN" ? 0 : 2,
              maximumFractionDigits: 2
            })}`,
            rawPriceUsd: rawPriceUSD,
            rawPriceNgn: rawPriceNgn,
            currency: currencyCode
          });
        }
      });
    });

    return Object.values(countryMap);
  };

  const getFlagEmoji = (countryCode) => {
    if (!countryCode || countryCode.length !== 2) return "🌐";
    const codePoints = countryCode.toUpperCase().split("").map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  const getFlagFromCountryName = (name = "") => {
    const lower = name.toLowerCase();
    if (lower.includes("united states") || lower === "usa") return "🇺🇸";
    if (lower.includes("united kingdom") || lower === "uk") return "🇬🇧";
    if (lower.includes("emirates") || lower === "uae") return "🇦🇪";
    if (lower.includes("canada")) return "🇨🇦";
    if (lower.includes("france")) return "🇫🇷";
    if (lower.includes("germany")) return "🇩🇪";
    if (lower.includes("nigeria")) return "🇳🇬";
    return "🌐";
  };

  // --- 2. HANDLE NEW ESIM PURCHASE ---
  const handlePurchase = async () => {
    if (!userId || userId === "null" || userId === "undefined") {
      setPurchaseError("Session expired. Please sign in again.");
      return;
    }

    const debitNgn = selectedPlan.rawPriceNgn;
    if (parseFloat(userBalanceNgn) < debitNgn) {
      setPurchaseError("Wallet balance too low for this plan. Top up your wallet to continue.");
      return;
    }

    setIsPurchasing(true);
    setPurchaseError("");

    try {
      const response = await fetch(`${API_BASE}/api/esim/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: Number(userId),
          packageId: selectedPlan.id || selectedPackage.id,
          priceNgn: debitNgn,
          countryName: selectedPackage.country,
          planSize: `${selectedPlan.size} · ${selectedPlan.validity}`,
          quantity: 1
        })
      });

      const result = await response.json();
      if (!isMountedRef.current) return;

      if (result.success && result.sim) {
        const nextBal = result.newBalance !== undefined
          ? parseFloat(result.newBalance)
          : Math.max(0, parseFloat(userBalanceNgn) - debitNgn);

        setUserBalanceNgn(nextBal);
        setLastTxRef(result.transactionRef || "");
        setPurchaseSuccess(true);
        triggerPurchaseRain();

        if (typeof onWalletSync === "function") {
          onWalletSync(nextBal);
        }

        syncWalletCacheAndEvent(nextBal, {
          id: result.transactionRef || `ESIM-${Date.now()}`,
          reference: result.transactionRef || `ESIM-${Date.now()}`,
          type: "ESIM_PURCHASE",
          amount: debitNgn,
          currency: "NGN",
          status: "SUCCESS",
          created_at: new Date().toISOString()
        });

        await fetchUserHistory(userId);
        await fetchUserBalance(userId);
      } else {
        setPurchaseError(formatClassyErrorMessage(result.message));
      }
    } catch (err) {
      console.error("Order error:", err);
      if (isMountedRef.current) {
        setPurchaseError("Connection interrupted. Please try again.");
      }
    } finally {
      if (isMountedRef.current) setIsPurchasing(false);
    }
  };

  const closePurchaseModal = () => {
    setSelectedPackage(null);
    setSelectedPlan(null);
    setPurchaseSuccess(false);
    setPurchaseError("");
    setLastTxRef("");
  };

  // --- 3. HANDLE TOP-UP FLOW FOR ACTIVE ESIM ---
  const openTopupModal = async (sim) => {
    setTopupModalSim(sim);
    setSelectedTopup(null);
    setTopupSuccess(false);
    setTopupError("");
    setIsLoadingTopups(true);

    try {
      const res = await fetch(`${API_BASE}/api/esim/topups/${sim.iccid}`);
      const result = await res.json();
      if (!isMountedRef.current) return;

      if (result.success && Array.isArray(result.topups)) {
        const formattedTopups = result.topups.map(t => {
          const usd = parseFloat(t.price || 5.0);
          return {
            id: t.id,
            title: t.title || `${t.data} Top-Up`,
            data: t.data || "1 GB",
            validity: t.day ? `${t.day} Days` : "7 Days",
            rawPriceUsd: usd,
            rawPriceNgn: Math.round(usd * CURRENCIES.NGN.rate)
          };
        });
        setTopupPackages(formattedTopups);
        if (formattedTopups.length > 0) setSelectedTopup(formattedTopups[0]);
      } else {
        setTopupError("No top-up packages available for this eSIM.");
      }
    } catch (err) {
      console.error("Topup fetch error:", err);
      if (isMountedRef.current) {
        setTopupError("Unable to load top-up plans right now.");
      }
    } finally {
      if (isMountedRef.current) setIsLoadingTopups(false);
    }
  };

  const handleConfirmTopup = async () => {
    if (!topupModalSim || !selectedTopup || !userId) return;

    if (parseFloat(userBalanceNgn) < selectedTopup.rawPriceNgn) {
      setTopupError("Wallet balance too low for this top-up. Top up your wallet to continue.");
      return;
    }

    setIsProcessingTopup(true);
    setTopupError("");

    try {
      const res = await fetch(`${API_BASE}/api/esim/topup/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: Number(userId),
          iccid: topupModalSim.iccid,
          packageId: selectedTopup.id,
          priceNgn: selectedTopup.rawPriceNgn,
          countryName: `${topupModalSim.country} (Top-Up)`,
          planSize: `${selectedTopup.data} · ${selectedTopup.validity}`
        })
      });

      const result = await res.json();
      if (!isMountedRef.current) return;

      if (result.success) {
        const nextBal = result.newBalance !== undefined
          ? parseFloat(result.newBalance)
          : Math.max(0, parseFloat(userBalanceNgn) - selectedTopup.rawPriceNgn);

        setUserBalanceNgn(nextBal);
        setTopupSuccess(true);
        triggerPurchaseRain();

        if (typeof onWalletSync === "function") {
          onWalletSync(nextBal);
        }

        syncWalletCacheAndEvent(nextBal, {
          id: result.transactionRef || `TOPUP-${Date.now()}`,
          reference: result.transactionRef || `TOPUP-${Date.now()}`,
          type: "ESIM_TOPUP",
          amount: selectedTopup.rawPriceNgn,
          currency: "NGN",
          status: "SUCCESS",
          created_at: new Date().toISOString()
        });

        await fetchUserHistory(userId);
        await fetchUserBalance(userId);
      } else {
        setTopupError(formatClassyErrorMessage(result.message));
      }
    } catch (err) {
      console.error("Top-up submit error:", err);
      if (isMountedRef.current) {
        setTopupError("Connection interrupted while processing top-up.");
      }
    } finally {
      if (isMountedRef.current) setIsProcessingTopup(false);
    }
  };

  const copyText = (text, label) => {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedField(label);
    setTimeout(() => {
      if (isMountedRef.current) {
        setCopiedField("");
      }
    }, 2000);
  };

  const handleDownloadEsimInvoice = (item, invoiceKey) => {
    if (!item) return;

    const isTopup = item.status === "TOPUP_SUCCESS";
    const txRef = String(item.transaction_ref || item.tx_ref || item.reference || `ORD-${item.id}`);
    const safeFilenameRef = txRef.replace(/[^a-zA-Z0-9_-]/g, "_");
    const ngnAmount = parseFloat(item.price) || 0;
    const formattedAmount = formatConvertedFromNgn(ngnAmount);
    const createdDate = item.created_at ? new Date(item.created_at) : null;
    const dateStr = createdDate && !Number.isNaN(createdDate.getTime())
      ? createdDate.toLocaleString()
      : new Date().toLocaleString();

    const invoiceHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CardNEXT eSIM Invoice - ${escapeHtml(txRef)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f5f3ef;
      color: #19110d;
      padding: 32px 16px;
    }
    .invoice-shell {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e6e0d6;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(25, 17, 13, 0.08);
    }
    .invoice-header {
      background: linear-gradient(145deg, #19110d 0%, #371d10 60%, #22120a 100%);
      color: #ffffff;
      padding: 28px 32px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .brand-mark {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #f3c77c;
    }
    .brand-sub {
      font-size: 11px;
      color: #d8c7b4;
      margin-top: 4px;
    }
    .invoice-tag {
      text-align: right;
    }
    .invoice-tag span {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(243, 199, 124, 0.16);
      border: 1px solid rgba(243, 199, 124, 0.35);
      color: #f3c77c;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .invoice-tag p {
      font-size: 11px;
      color: #d8c7b4;
      margin-top: 8px;
      font-family: monospace;
    }
    .invoice-body {
      padding: 28px 32px;
    }
    .amount-banner {
      background: #faf8f5;
      border: 1px solid #ece6dc;
      border-radius: 14px;
      padding: 20px;
      text-align: center;
      margin-bottom: 24px;
    }
    .amount-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #6b7280;
    }
    .amount-value {
      font-size: 32px;
      font-weight: 900;
      margin-top: 6px;
      color: #5d3513;
    }
    .status-pill {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 12px;
      border-radius: 999px;
      background: #e9f8f0;
      color: #10b981;
      font-size: 11px;
      font-weight: 800;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .meta-table tr {
      border-bottom: 1px solid #f0ece6;
    }
    .meta-table tr:last-child {
      border-bottom: 0;
    }
    .meta-table td {
      padding: 12px 4px;
      vertical-align: top;
    }
    .meta-key {
      color: #6b7280;
      font-weight: 600;
      width: 38%;
    }
    .meta-val {
      color: #111827;
      font-weight: 700;
      text-align: right;
      word-break: break-all;
    }
    .mono {
      font-family: monospace;
      font-size: 12px;
    }
    .invoice-footer {
      background: #faf8f5;
      border-top: 1px solid #ece6dc;
      padding: 18px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      font-size: 11px;
      color: #6b7280;
    }
    .print-btn {
      background: #5d3513;
      color: #ffffff;
      border: 0;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .invoice-shell { box-shadow: none; border: 0; border-radius: 0; }
      .print-btn { display: none; }
    }
  </style>
</head>
<body>
  <div class="invoice-shell">
    <div class="invoice-header">
      <div>
        <div class="brand-mark">CardNEXT INVOICE</div>
        <div class="brand-sub">Official eSIM Transaction Receipt</div>
      </div>
      <div class="invoice-tag">
        <span>${isTopup ? "Top-Up Receipt" : "eSIM Order"}</span>
        <p>${escapeHtml(txRef)}</p>
      </div>
    </div>

    <div class="invoice-body">
      <div class="amount-banner">
        <div class="amount-label">Wallet Debit (${escapeHtml(currentCurrency)})</div>
        <div class="amount-value">${escapeHtml(formattedAmount)}</div>
        <div class="status-pill">${isTopup ? "TOP-UP COMPLETED" : "COMPLETED"}</div>
      </div>

      <table class="meta-table">
        <tr>
          <td class="meta-key">Destination / Service</td>
          <td class="meta-val">${escapeHtml(item.country_name || "eSIM Order")}</td>
        </tr>
        <tr>
          <td class="meta-key">Data Plan</td>
          <td class="meta-val">${escapeHtml(item.plan_size || "Standard")}</td>
        </tr>
        <tr>
          <td class="meta-key">ICCID Number</td>
          <td class="meta-val mono">${escapeHtml(item.iccid || "Pending")}</td>
        </tr>
        <tr>
          <td class="meta-key">Reference ID</td>
          <td class="meta-val mono">${escapeHtml(txRef)}</td>
        </tr>
        <tr>
          <td class="meta-key">Date &amp; Time</td>
          <td class="meta-val">${escapeHtml(dateStr)}</td>
        </tr>
        <tr>
          <td class="meta-key">Account ID</td>
          <td class="meta-val mono">User #${escapeHtml(userId)}</td>
        </tr>
      </table>
    </div>

    <div class="invoice-footer">
      <span>Generated by CardNEXT · support@cardnext.ng</span>
      <button type="button" class="print-btn" onclick="window.print()">Print / Save PDF</button>
    </div>
  </div>
</body>
</html>`;

    try {
      const blob = new Blob([invoiceHtml], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `CardNEXT-eSIM-Invoice-${safeFilenameRef}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("Failed to download CardNEXT eSIM invoice:", err);
    }

    setDownloadedInvoiceKey(invoiceKey);
    setTimeout(() => {
      if (isMountedRef.current) {
        setDownloadedInvoiceKey(prev => (prev === invoiceKey ? "" : prev));
      }
    }, 2500);
  };

  const filteredPackages = esimPackages.filter(pkg =>
    pkg.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSpentNgn = purchaseHistory.reduce(
    (sum, item) => sum + (parseFloat(item.price) || 0),
    0
  );

  if (!userId) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", background: "#fdfbf7", borderRadius: "24px", border: "1px solid #eae5de" }}>
        <Lock size={36} style={{ color: "#d97706", marginBottom: "16px" }} />
        <h2 style={{ fontSize: "20px", fontWeight: "900", color: "#111827", marginBottom: "8px" }}>Session Required</h2>
        <p style={{ fontSize: "13px", color: "#6b7280", maxWidth: "400px", margin: "0 auto 20px" }}>
          Please log in to your CardNext account to access global travel eSIM packages and active profiles.
        </p>
        <button
          type="button"
          onClick={() => (window.location.href = "/login")}
          style={{ background: "#0f172a", color: "#fff", border: 0, padding: "12px 24px", borderRadius: "12px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="esim-page-container">
      {showPurchaseRain && (
        <div className="purchase-rain-overlay" aria-hidden="true">
          {RAIN_DROPS.map((drop) => (
            <span
              key={drop.id}
              className="rain-drop"
              style={{
                left: drop.left,
                height: drop.height,
                opacity: drop.opacity,
                animationDelay: drop.delay,
                animationDuration: drop.duration
              }}
            />
          ))}
        </div>
      )}

      <div className="esim-top-bar">
        <div className="segmented-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "Store"}
            className={`seg-tab-btn ${activeTab === "Store" ? "active" : ""}`}
            onClick={() => setActiveTab("Store")}
          >
            <Globe2 size={14} />
            <span>Store</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "My eSIMs"}
            className={`seg-tab-btn ${activeTab === "My eSIMs" ? "active" : ""}`}
            onClick={() => setActiveTab("My eSIMs")}
          >
            <Smartphone size={14} />
            <span>SIMs ({activeEsims.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "History"}
            className={`seg-tab-btn ${activeTab === "History" ? "active" : ""}`}
            onClick={() => setActiveTab("History")}
          >
            <History size={14} />
            <span>History ({purchaseHistory.length})</span>
          </button>
        </div>

        <div className="compact-utility-strip">
          <button
            type="button"
            className="icon-pill-btn"
            onClick={handleTopRefresh}
            disabled={isTopRefreshing}
            title={activeTab === "Store" ? "Sync packages" : "Refresh records & wallet"}
          >
            <RefreshCw size={12.5} className={isTopRefreshing ? "spin" : ""} />
            <span className="pill-label-desktop">Sync</span>
          </button>

          <div className="custom-dropdown-container" ref={currencyDropdownRef}>
            <button
              type="button"
              className={`currency-dropdown-toggle ${isCurrencyDropdownOpen ? "open" : ""}`}
              onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
            >
              <Coins size={12.5} />
              <span>{currentCurrency}</span>
              <ChevronDown size={12} className={`chevron-icon ${isCurrencyDropdownOpen ? "rotate" : ""}`} />
            </button>

            {isCurrencyDropdownOpen && (
              <div className="currency-dropdown-menu">
                <div className="dropdown-menu-header">Display Currency</div>
                {Object.keys(CURRENCIES).map(code => {
                  const curr = CURRENCIES[code];
                  const isSelected = currentCurrency === code;
                  return (
                    <div
                      key={code}
                      className={`currency-dropdown-item ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        setCurrentCurrency(code);
                        setIsCurrencyDropdownOpen(false);
                      }}
                    >
                      <div className="currency-info-meta">
                        <strong>{code}</strong>
                        <span>{curr.name}</span>
                      </div>
                      <span className="currency-symbol-tag">{curr.symbol}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="wallet-compact-pill" title="Available Wallet Balance">
            <Wallet size={12.5} />
            <b>{formatWalletBalance()}</b>
          </div>
        </div>
      </div>

      {activeTab === "Store" && (
        <div className="esim-store-layout">
          <div className="card esim-search-card">
            <div className="esim-search-input">
              <Search size={17} />
              <input
                type="text"
                placeholder="Search destination (e.g., United States, UK, UAE)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {apiError && (
            <div className="error-alert" style={{ marginTop: "6px" }}>
              <AlertCircle size={16} />
              <span>{apiError}</span>
            </div>
          )}

          {isLoadingPackages ? (
            <div className="loading-state">
              <Loader2 size={26} className="spin" />
              <span>Loading packages catalog...</span>
            </div>
          ) : filteredPackages.length === 0 ? (
            <div className="empty-esim-state">
              <Globe2 size={32} />
              <h4>No destinations available</h4>
              <p>No packages found matching your search.</p>
            </div>
          ) : (
            <div className="esim-grid">
              {filteredPackages.map(pkg => {
                const isExpanded = expandedCardId === pkg.id;
                const startingPrice = pkg.plans?.[0]?.price || `${CURRENCIES[currentCurrency].symbol}5,000`;
                const hasMultiplePlans = (pkg.plans?.length || 0) > 3;

                return (
                  <div className={`card esim-card ${isExpanded ? "expanded" : ""}`} key={pkg.id}>
                    <div className="esim-card-main" onClick={() => setExpandedCardId(isExpanded ? null : pkg.id)}>
                      <div className="esim-card-header">
                        <span className="country-flag">{pkg.flag}</span>
                        <div className="country-title-meta">
                          <h3>{pkg.country}</h3>
                          <small><Signal size={11} /> 4G / 5G High Speed</small>
                        </div>
                      </div>

                      <div className="esim-card-action-row">
                        <div className="starting-price-tag">
                          <span>Plans from</span>
                          <strong>{startingPrice}</strong>
                        </div>
                        <button type="button" className="expand-toggle-btn">
                          {isExpanded ? <>Hide <ChevronUp size={14} /></> : <>Plans <ChevronDown size={14} /></>}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="plans-drawer">
                        <div className="drawer-header-row">
                          <p className="drawer-title">Select Package ({currentCurrency})</p>
                          {hasMultiplePlans && (
                            <span className="drawer-scroll-hint">Scroll ↕</span>
                          )}
                        </div>
                        <div className="plans-list">
                          {pkg.plans.map((plan, idx) => (
                            <div className="plan-item" key={plan.id || idx}>
                              <div className="plan-meta">
                                <strong>{plan.size}</strong>
                                <span>{plan.validity}</span>
                              </div>
                              <div className="plan-buy">
                                <strong>{plan.price}</strong>
                                <button
                                  type="button"
                                  className="buy-plan-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPackage(pkg);
                                    setSelectedPlan(plan);
                                    setPurchaseError("");
                                  }}
                                >
                                  Buy
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "My eSIMs" && (
        <div className="my-esims-layout">
          {isLoadingHistory ? (
            <div className="loading-state">
              <Loader2 size={24} className="spin" />
              <span>Loading your active eSIM profiles...</span>
            </div>
          ) : activeEsims.length === 0 ? (
            <div className="empty-esim-state">
              <Smartphone size={32} />
              <h4>No Active eSIMs Yet</h4>
              <p>Purchased eSIM profiles will appear here instantly with installation QR codes and top-up controls.</p>
              <button type="button" className="seg-tab-btn active" onClick={() => setActiveTab("Store")}>
                Browse Store
              </button>
            </div>
          ) : (
            <div className="my-esims-grid">
              {activeEsims.map(sim => {
                const usagePercent = sim.dataTotal > 0
                  ? Math.min(100, Math.round((sim.dataUsed / sim.dataTotal) * 100))
                  : 0;
                const isRefreshing = refreshingIccid === sim.iccid;

                return (
                  <div className="card my-sim-card" key={sim.id}>
                    <div className="sim-card-top">
                      <div className="sim-flag-wrap">
                        <span className="sim-flag">{sim.flag}</span>
                        <div>
                          <h4>{sim.country}</h4>
                          <small>ICCID: {sim.iccid}</small>
                        </div>
                      </div>
                      <span className={`sim-status-pill ${sim.status.toLowerCase()}`}>{sim.status}</span>
                    </div>

                    <div className="data-usage-box">
                      <div className="usage-labels">
                        <span>Data consumed ({sim.plan})</span>
                        <strong>{sim.dataUsed} GB / {sim.dataTotal} GB ({usagePercent}%)</strong>
                      </div>
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: `${usagePercent}%` }} />
                      </div>
                    </div>

                    <div className="sim-meta-footer">
                      <span>Valid: <b>{sim.expiry}</b></span>
                      <div className="sim-card-actions">
                        <button
                          type="button"
                          className="qr-button"
                          onClick={() => refreshSimUsage(sim)}
                          disabled={isRefreshing}
                          title="Sync live data usage"
                        >
                          <RefreshCw size={12} className={isRefreshing ? "spin" : ""} /> Usage
                        </button>
                        <button type="button" className="qr-button topup-btn" onClick={() => openTopupModal(sim)}>
                          <PlusCircle size={12} /> Top Up
                        </button>
                        <button type="button" className="qr-button install-btn" onClick={() => setQrModalSim(sim)}>
                          <Download size={12} /> Install / QR
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "History" && (
        <div className="history-layout">
          <div className="card history-card-container">
            <div className="history-top-banner">
              <div>
                <h3>Transaction History</h3>
                <p className="history-sub">Complete details, per-transaction summary &amp; CardNEXT invoices for every eSIM order.</p>
              </div>
              {purchaseHistory.length > 0 && (
                <div className="history-summary-chips">
                  <span className="history-chip">
                    Orders: <b>{purchaseHistory.length}</b>
                  </span>
                  <span className="history-chip accent">
                    Total Debited ({currentCurrency}): <b>{formatConvertedFromNgn(totalSpentNgn)}</b>
                  </span>
                </div>
              )}
            </div>

            {isLoadingHistory ? (
              <div className="loading-state"><Loader2 size={20} className="spin" /><span>Loading history...</span></div>
            ) : purchaseHistory.length === 0 ? (
              <p className="no-history">No transaction history found.</p>
            ) : (
              <div className="history-feed">
                {purchaseHistory.map((item, idx) => {
                  const isTopup = item.status === "TOPUP_SUCCESS";
                  const createdDate = item.created_at ? new Date(item.created_at) : null;
                  const formattedDate = createdDate && !Number.isNaN(createdDate.getTime())
                    ? createdDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                    : "—";
                  const formattedTime = createdDate && !Number.isNaN(createdDate.getTime())
                    ? createdDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "";
                  const txRef = item.transaction_ref || item.tx_ref || item.reference || `ORD-${item.id || idx}`;
                  const itemKey = String(item.id ?? `${txRef}-${idx}`);
                  const ngnAmount = parseFloat(item.price) || 0;
                  const flag = getFlagFromCountryName(item.country_name);
                  const isSummaryOpen = openSummaryKey === itemKey;

                  return (
                    <div className="history-entry-card" key={itemKey}>
                      <div className="history-entry-header">
                        <div className="history-entry-title-wrap">
                          <span className="history-flag">{flag}</span>
                          <div className="history-title-stack">
                            <div className="history-name-line">
                              <b>{item.country_name || "eSIM Order"}</b>
                              <span className={`sim-status-pill ${isTopup ? "topup" : "active"}`}>
                                {isTopup ? "Top-Up" : "Completed"}
                              </span>
                            </div>
                            <span className="history-plan-sub">
                              Plan: <strong>{item.plan_size || "Standard"}</strong> · {formattedDate}{formattedTime ? ` at ${formattedTime}` : ""}
                            </span>
                          </div>
                        </div>

                        <div className="history-amount-actions-wrap">
                          <div className="history-amount-block">
                            <strong>{formatConvertedFromNgn(ngnAmount)}</strong>
                            {currentCurrency !== "NGN" && (
                              <small>₦{ngnAmount.toLocaleString()} NGN</small>
                            )}
                          </div>
                          <button
                            type="button"
                            className={`tx-summary-btn ${isSummaryOpen ? "active" : ""}`}
                            onClick={() => setOpenSummaryKey(prev => (prev === itemKey ? null : itemKey))}
                            title="View transaction summary"
                          >
                            <FileText size={12} /> <span>Summary</span>
                          </button>
                          <button
                            type="button"
                            className="invoice-download-btn"
                            onClick={() => handleDownloadEsimInvoice(item, itemKey)}
                            title="Download CardNEXT Invoice"
                          >
                            {downloadedInvoiceKey === itemKey ? (
                              <>
                                <Check size={12} /> <span>Invoice Saved</span>
                              </>
                            ) : (
                              <>
                                <Download size={12} /> <span>CardNEXT Invoice</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {isSummaryOpen && (
                        <div className="tx-single-summary-box">
                          <div className="tx-single-summary-head">
                            <span>Transaction Summary</span>
                            <code>{txRef}</code>
                          </div>
                          <p className="tx-single-summary-text">
                            {isTopup ? "Data top-up" : "eSIM purchase"} for{" "}
                            <b>{item.country_name || "eSIM Order"}</b> ({item.plan_size || "Standard"}) was{" "}
                            <b>completed</b> on <b>{formattedDate}</b>
                            {formattedTime ? ` at ${formattedTime}` : ""}, debiting{" "}
                            <b>{formatConvertedFromNgn(ngnAmount)}</b>
                            {currentCurrency !== "NGN" ? ` (₦${ngnAmount.toLocaleString()})` : ""} from your wallet
                            {item.iccid ? (
                              <> on ICCID <code>{item.iccid}</code></>
                            ) : null}.
                          </p>
                        </div>
                      )}

                      <div className="history-entry-meta-grid">
                        <div className="history-meta-cell">
                          <span className="meta-label">ICCID Number</span>
                          <div className="meta-value-with-copy">
                            <code>{item.iccid || "Pending"}</code>
                            {item.iccid && (
                              <button
                                type="button"
                                className="copy-mini-btn"
                                onClick={() => copyText(item.iccid, `hist-iccid-${itemKey}`)}
                                title="Copy ICCID"
                              >
                                {copiedField === `hist-iccid-${itemKey}` ? <Check size={11} /> : <Copy size={11} />}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="history-meta-cell">
                          <span className="meta-label">Reference ID</span>
                          <div className="meta-value-with-copy">
                            <code>{txRef}</code>
                            <button
                              type="button"
                              className="copy-mini-btn"
                              onClick={() => copyText(String(txRef), `hist-ref-${itemKey}`)}
                              title="Copy Reference"
                            >
                              {copiedField === `hist-ref-${itemKey}` ? <Check size={11} /> : <Copy size={11} />}
                            </button>
                          </div>
                        </div>

                        <div className="history-meta-cell">
                          <span className="meta-label">Wallet Debit ({currentCurrency})</span>
                          <div className="meta-plain-value">
                            <b>{formatConvertedFromNgn(ngnAmount)}</b>
                            {currentCurrency !== "NGN" && (
                              <small className="meta-sub-currency"> (₦{ngnAmount.toLocaleString()})</small>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {showScrollTop && (
        <button
          type="button"
          className="scroll-top-fab"
          onClick={scrollToTop}
          aria-label="Scroll back to top"
          title="Back to top"
        >
          <ArrowUp size={18} />
        </button>
      )}

      {selectedPackage && selectedPlan && (
        <div className="modal-overlay" onClick={closePurchaseModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-kicker">SECURE CHECKOUT ({currentCurrency})</span>
                <h2>{selectedPackage.flag} {selectedPackage.country} eSIM</h2>
                <p>{selectedPlan.size} High Speed Data · Valid {selectedPlan.validity}</p>
              </div>
              <button type="button" className="modal-close" onClick={closePurchaseModal}><X size={19} /></button>
            </div>

            {purchaseError && (
              <div className="error-alert classy-low-balance-alert">
                <AlertCircle size={16} />
                <span>{purchaseError}</span>
              </div>
            )}

            {purchaseSuccess ? (
              <div className="success-state-box">
                <div className="success-icon"><Check size={28} /></div>
                <h3>eSIM Issued Successfully!</h3>
                <p>
                  Your wallet is updated and your eSIM profile is ready.
                  {lastTxRef && <><br />Ref: <code>{lastTxRef}</code></>}
                </p>
                <button type="button" className="modal-submit" onClick={() => { closePurchaseModal(); setActiveTab("My eSIMs"); }}>
                  View My Active eSIMs
                </button>
              </div>
            ) : (
              <>
                <div className="booking-summary-box">
                  <div className="summary-row"><span>Data Package</span><strong>{selectedPlan.size} ({selectedPlan.validity})</strong></div>
                  <div className="summary-row"><span>Activation Fee</span><span style={{ color: "#10b981", fontWeight: 600 }}>Free</span></div>
                  <div className="summary-row total">
                    <span>Total Wallet Debit</span>
                    <strong>
                      {selectedPlan.price}
                      {currentCurrency !== "NGN" && (
                        <small style={{ display: "block", fontSize: "11px", color: "#6b7280", fontWeight: 500 }}>
                          (₦{selectedPlan.rawPriceNgn.toLocaleString()} NGN)
                        </small>
                      )}
                    </strong>
                  </div>
                </div>

                <p className="secure-note"><ShieldCheck size={14} /> Instant wallet debit & eSIM profile delivery.</p>

                <button type="button" className="modal-submit" onClick={handlePurchase} disabled={isPurchasing}>
                  {isPurchasing ? (
                    <span className="btn-loading"><Loader2 size={16} className="spin" /> Processing Payment...</span>
                  ) : (
                    `Confirm Payment of ${selectedPlan.price}`
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {qrModalSim && (
        <div className="modal-overlay" onClick={() => setQrModalSim(null)}>
          <div className="modal qr-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ textAlign: "left" }}>
                <span className="modal-kicker">ESIM INSTALLATION</span>
                <h2>{qrModalSim.flag} {qrModalSim.country} eSIM</h2>
                <p>Scan QR code or copy manual activation details</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setQrModalSim(null)}><X size={19} /></button>
            </div>

            <div className="qr-box">
              <img src={qrModalSim.qrCodeUrl} alt="eSIM QR Code" />
              <div className="manual-codes-wrap">
                <div className="manual-code-row">
                  <span><b>SM-DP+ Address:</b> {qrModalSim.lpa}</span>
                  <button type="button" className="copy-mini-btn" onClick={() => copyText(qrModalSim.lpa, "lpa")}>
                    {copiedField === "lpa" ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
                <div className="manual-code-row">
                  <span><b>Activation Code:</b> {qrModalSim.matchingCode}</span>
                  <button type="button" className="copy-mini-btn" onClick={() => copyText(qrModalSim.matchingCode, "code")}>
                    {copiedField === "code" ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
                <div className="manual-code-row">
                  <span><b>ICCID:</b> {qrModalSim.iccid}</span>
                  <button type="button" className="copy-mini-btn" onClick={() => copyText(qrModalSim.iccid, "iccid")}>
                    {copiedField === "iccid" ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="qr-steps">
              <p><b>1.</b> Open Settings ➔ Cellular / Mobile Data on your device.</p>
              <p><b>2.</b> Tap "Add eSIM" and scan the QR code above (or enter details manually).</p>
              <p><b>3.</b> Enable Data Roaming on your CardNEXT eSIM line upon arrival.</p>
            </div>
          </div>
        </div>
      )}

      {topupModalSim && (
        <div className="modal-overlay" onClick={() => setTopupModalSim(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-kicker">DATA RECHARGE</span>
                <h2>{topupModalSim.flag} Top Up {topupModalSim.country}</h2>
                <p>ICCID: {topupModalSim.iccid}</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setTopupModalSim(null)}><X size={19} /></button>
            </div>

            {topupError && (
              <div className="error-alert classy-low-balance-alert">
                <AlertCircle size={16} />
                <span>{topupError}</span>
              </div>
            )}

            {topupSuccess ? (
              <div className="success-state-box">
                <div className="success-icon"><Check size={28} /></div>
                <h3>Top-Up Added Successfully!</h3>
                <p>Additional data has been credited to your active eSIM and recorded in your history.</p>
                <button type="button" className="modal-submit" onClick={() => setTopupModalSim(null)}>
                  Done
                </button>
              </div>
            ) : isLoadingTopups ? (
              <div className="loading-state" style={{ padding: "30px 0" }}>
                <Loader2 size={24} className="spin" />
                <span>Loading compatible top-up plans...</span>
              </div>
            ) : (
              <>
                <div className="plans-list">
                  {topupPackages.map((tp) => {
                    const isPicked = selectedTopup?.id === tp.id;
                    return (
                      <div
                        key={tp.id}
                        className="plan-item"
                        style={{
                          cursor: "pointer",
                          borderColor: isPicked ? "#5d3513" : "#e5e7eb",
                          background: isPicked ? "#fdf5ef" : "#fff"
                        }}
                        onClick={() => {
                          setSelectedTopup(tp);
                          setTopupError("");
                        }}
                      >
                        <div className="plan-meta">
                          <strong>{tp.data}</strong>
                          <span>Valid {tp.validity}</span>
                        </div>
                        <div className="plan-buy">
                          <strong>{formatPriceFromUsd(tp.rawPriceUsd)}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedTopup && (
                  <button
                    type="button"
                    className="modal-submit"
                    onClick={handleConfirmTopup}
                    disabled={isProcessingTopup}
                  >
                    {isProcessingTopup ? (
                      <span className="btn-loading"><Loader2 size={16} className="spin" /> Topping Up...</span>
                    ) : (
                      `Confirm Top-Up (${formatPriceFromUsd(selectedTopup.rawPriceUsd)})`
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        .esim-page-container { display: flex; flex-direction: column; gap: 14px; width: 100%; box-sizing: border-box; font-family: inherit; position: relative; }

        .purchase-rain-overlay { position: fixed; inset: 0; pointer-events: none; z-index: 1200; overflow: hidden; background: radial-gradient(circle at 50% 10%, rgba(243, 223, 202, 0.08), transparent 70%); }
        .rain-drop { position: absolute; top: -30px; width: 1.5px; border-radius: 999px; background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(217, 167, 115, 0.85) 65%, rgba(255, 255, 255, 0.95) 100%); animation-name: rainFall; animation-timing-function: linear; animation-iteration-count: infinite; }
        @keyframes rainFall {
          0% { transform: translate3d(0, -24px, 0); }
          100% { transform: translate3d(-12px, 105vh, 0); }
        }

        .scroll-top-fab { position: fixed; right: 20px; bottom: 20px; width: 40px; height: 40px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.22); background: #5d3513; color: #fff; display: grid; place-items: center; cursor: pointer; z-index: 950; box-shadow: 0 10px 24px rgba(43, 29, 12, 0.28); transition: all .2s cubic-bezier(0.16, 1, 0.3, 1); animation: fabPopIn 0.2s ease-out; }
        .scroll-top-fab:hover { background: #42250d; transform: translateY(-3px); box-shadow: 0 14px 28px rgba(43, 29, 12, 0.36); }
        .scroll-top-fab:active { transform: scale(0.95); }
        @keyframes fabPopIn {
          from { opacity: 0; transform: translateY(10px) scale(0.92); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .esim-top-bar { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb; }

        .segmented-tabs { display: inline-flex; align-items: center; background: #f3f0ea; padding: 3px; border-radius: 11px; border: 1px solid #e6e1d8; gap: 2px; }
        .seg-tab-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 8.5px; border: 0; background: transparent; color: #6b7280; font-size: 12px; font-weight: 700; cursor: pointer; transition: all .18s ease; white-space: nowrap; }
        .seg-tab-btn:hover { color: #5d3513; }
        .seg-tab-btn.active { background: #5d3513; color: #fff; box-shadow: 0 3px 10px rgba(93, 53, 19, 0.2); }

        .compact-utility-strip { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .icon-pill-btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 10px; background: #fff; border: 1px solid #e5e7eb; border-radius: 9.5px; font-size: 11.5px; color: #374151; font-weight: 700; cursor: pointer; transition: all .18s ease; white-space: nowrap; }
        .icon-pill-btn:hover:not(:disabled) { border-color: #5d3513; color: #5d3513; }
        .icon-pill-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .custom-dropdown-container { position: relative; user-select: none; }
        .currency-dropdown-toggle { display: inline-flex; align-items: center; gap: 5px; padding: 7px 10px; background: #faf9f6; border: 1px solid #e5e7eb; border-radius: 9.5px; font-size: 11.5px; color: #5d3513; font-weight: 750; cursor: pointer; transition: all .18s ease; white-space: nowrap; }
        .currency-dropdown-toggle:hover, .currency-dropdown-toggle.open { border-color: #5d3513; background: #fff; }
        .chevron-icon { transition: transform .2s ease; color: #9ca3af; }
        .chevron-icon.rotate { transform: rotate(180deg); color: #5d3513; }

        .currency-dropdown-menu { position: absolute; right: 0; top: calc(100% + 6px); width: 210px; background: #fff; border: 1px solid #e5e7eb; border-radius: 13px; box-shadow: 0 14px 32px rgba(0,0,0,0.12); z-index: 100; overflow: hidden; animation: fadeInMenu 0.16s ease-out; }
        @keyframes fadeInMenu { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

        .dropdown-menu-header { padding: 9px 12px; font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid #f3f4f6; background: #faf9f6; }
        .currency-dropdown-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; cursor: pointer; transition: background .15s; border-bottom: 1px solid #f9fafb; }
        .currency-dropdown-item:last-child { border-bottom: 0; }
        .currency-dropdown-item:hover { background: #fdf5ef; }
        .currency-dropdown-item.selected { background: #faf2ec; }
        
        .currency-info-meta { display: flex; flex-direction: column; gap: 1px; }
        .currency-info-meta strong { font-size: 12.5px; color: #111827; font-weight: 750; }
        .currency-info-meta span { font-size: 10.5px; color: #6b7280; font-weight: 500; }
        .currency-symbol-tag { font-size: 12px; font-weight: 800; color: #5d3513; background: #f7e6d4; padding: 2px 7px; border-radius: 6px; }

        .wallet-compact-pill { display: inline-flex; align-items: center; gap: 5px; padding: 7px 11px; background: #fdf8f3; border: 1px solid #e8d5c2; border-radius: 9.5px; font-size: 11.5px; color: #5d3513; font-weight: 650; white-space: nowrap; }
        .wallet-compact-pill b { font-weight: 800; }

        .esim-store-layout, .my-esims-layout, .history-layout { display: flex; flex-direction: column; gap: 10px; width: 100%; }
        .esim-search-card { padding: 10px 12px; overflow: hidden; }
        .esim-search-input { display: flex; align-items: center; gap: 9px; height: 40px; padding: 0 12px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fcfbf9; transition: border-color .2s; box-sizing: border-box; width: 100%; min-width: 0; }
        .esim-search-input:focus-within { border-color: #5d3513; box-shadow: 0 0 0 3px rgba(93, 53, 19, 0.08); }
        .esim-search-input input { border: 0; outline: 0; width: 100%; min-width: 0; background: transparent; font-size: 12.5px; color: #111827; box-sizing: border-box; }
        .clear-search-btn { border: 0; background: #f3f0ea; color: #6b7280; width: 22px; height: 22px; border-radius: 6px; display: grid; place-items: center; cursor: pointer; flex-shrink: 0; }
        .clear-search-btn:hover { background: #e6e1d8; color: #111827; }

        .esim-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(235px, 1fr)); gap: 11px; margin-top: 2px; align-items: start; width: 100%; }
        @media (max-width: 640px) { .esim-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; } }
        @media (max-width: 400px) { .esim-grid { grid-template-columns: 1fr; } }

        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 13px; box-shadow: 0 3px 14px rgba(0,0,0,0.02); box-sizing: border-box; transition: all .2s cubic-bezier(0.16, 1, 0.3, 1); }
        .card:hover { border-color: #e2cbb5; box-shadow: 0 8px 22px rgba(93, 53, 19, 0.06); }

        .esim-card { display: flex; flex-direction: column; overflow: hidden; border-color: #e5e7eb; }
        .esim-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(93, 53, 19, 0.09); border-color: #d7b697; }
        .esim-card.expanded { border-color: #5d3513; box-shadow: 0 10px 26px rgba(93, 53, 19, 0.12); }

        .esim-card-main { padding: 12px 13px; cursor: pointer; display: flex; flex-direction: column; gap: 9px; box-sizing: border-box; transition: background .2s ease; }
        .esim-card:hover .esim-card-main { background: linear-gradient(180deg, #fffdfb 0%, #fdf8f3 100%); }
        .esim-card-header { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .country-flag { font-size: 24px; line-height: 1; transition: transform .22s cubic-bezier(0.16, 1, 0.3, 1); flex-shrink: 0; }
        .esim-card:hover .country-flag { transform: scale(1.06); }
        .country-title-meta { min-width: 0; flex: 1; }
        .country-title-meta h3 { margin: 0 0 2px; font-size: 13.5px; font-weight: 750; color: #111827; transition: color .2s ease; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .esim-card:hover .country-title-meta h3 { color: #5d3513; }
        .country-title-meta small { display: flex; align-items: center; gap: 4px; color: #6b7280; font-size: 10px; font-weight: 500; white-space: nowrap; }

        .esim-card-action-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; border-top: 1px solid #f3f4f6; padding-top: 8px; }
        .starting-price-tag { min-width: 0; }
        .starting-price-tag span { display: block; font-size: 8.5px; color: #9ca3af; font-weight: 650; text-transform: uppercase; letter-spacing: 0.5px; }
        .starting-price-tag strong { font-size: 12px; color: #5d3513; font-weight: 800; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        .expand-toggle-btn { display: inline-flex; align-items: center; gap: 3px; padding: 5px 8.5px; border-radius: 7.5px; background: #fdf5ef; color: #5d3513; font-size: 10.5px; font-weight: 700; border: 0; cursor: pointer; transition: all .18s ease; flex-shrink: 0; }
        .expand-toggle-btn:hover, .esim-card:hover .expand-toggle-btn { background: #f5e0ca; }

        .plans-drawer { background: #faf9f6; border-top: 1px solid #e5e7eb; padding: 10px 11px 12px; display: flex; flex-direction: column; gap: 7px; animation: slideDown 0.2s ease-out; box-sizing: border-box; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }

        .drawer-header-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
        .drawer-title { margin: 0; font-size: 9.5px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.7px; }
        .drawer-scroll-hint { font-size: 9.5px; font-weight: 600; color: #9ca3af; }

        .plans-list { display: flex; flex-direction: column; gap: 6px; max-height: 220px; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; }
        .plans-list::-webkit-scrollbar { display: none; }

        .plan-item { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 8px 9px; border: 1px solid #e5e7eb; border-radius: 9px; background: #fff; transition: all .16s ease; box-sizing: border-box; }
        .plan-item:hover { border-color: #5d3513; background: #fffdfb; }
        .plan-meta { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .plan-meta strong { font-size: 11.5px; font-weight: 750; color: #111827; }
        .plan-meta span { font-size: 9.5px; color: #6b7280; font-weight: 500; }
        .plan-buy { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .plan-buy strong { font-size: 11px; font-weight: 750; color: #5d3513; }
        .buy-plan-btn { padding: 4.5px 8.5px; border-radius: 7px; background: #5d3513; color: #fff; font-size: 10px; font-weight: 700; cursor: pointer; border: 0; transition: all .15s ease; }
        .buy-plan-btn:hover { background: #42250d; }

        .loading-state, .empty-esim-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 50px 16px; color: #6b7280; font-size: 13px; text-align: center; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        .my-esims-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; align-items: start; }
        @media (max-width: 768px) { .my-esims-grid { grid-template-columns: 1fr; gap: 10px; } }
        .my-sim-card { display: flex; flex-direction: column; gap: 12px; padding: 15px; box-sizing: border-box; }
        .my-sim-card:hover { transform: translateY(-2px); border-color: #d7b697; box-shadow: 0 10px 24px rgba(93, 53, 19, 0.08); }
        .sim-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .sim-flag-wrap { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .sim-flag { font-size: 24px; transition: transform .22s ease; flex-shrink: 0; }
        .my-sim-card:hover .sim-flag { transform: scale(1.06); }
        .sim-card-top h4 { margin: 0 0 2px; font-size: 13.5px; font-weight: 750; }
        .sim-card-top small { color: #6b7280; font-size: 10px; font-family: monospace; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 175px; }
        .sim-status-pill { padding: 4px 9px; border-radius: 7px; font-size: 10px; font-weight: 700; flex-shrink: 0; }
        .sim-status-pill.active { background: #e9f8f0; color: #10b981; }
        .sim-status-pill.topup { background: #eff6ff; color: #2563eb; }
        .sim-status-pill.expired { background: #fef2f2; color: #dc2626; }

        .data-usage-box { display: flex; flex-direction: column; gap: 7px; background: #faf9f6; padding: 11px; border-radius: 10px; box-sizing: border-box; }
        .usage-labels { display: flex; justify-content: space-between; font-size: 11px; color: #6b7280; gap: 8px; flex-wrap: wrap; }
        .usage-labels strong { color: #111827; }
        .progress-bar-bg { height: 7px; border-radius: 4px; background: #e5e3db; overflow: hidden; }
        .progress-bar-fill { height: 100%; background: #5d3513; border-radius: 4px; transition: width .3s ease; }

        .sim-meta-footer { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 11px; color: #6b7280; flex-wrap: wrap; gap: 6px; }
        .sim-card-actions { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
        .qr-button { display: inline-flex; align-items: center; gap: 4px; padding: 6px 9px; border-radius: 8px; background: #f5f3ef; color: #111827; font-size: 10.5px; font-weight: 650; cursor: pointer; border: 0; transition: all .16s ease; }
        .qr-button:hover { background: #ebd8c8; transform: translateY(-1px); }
        .qr-button.topup-btn { background: #fdf5ef; color: #5d3513; }
        .qr-button.topup-btn:hover { background: #f5e0ca; }
        .qr-button.install-btn { background: #5d3513; color: #fff; }
        .qr-button.install-btn:hover { background: #42250d; }

        .history-card-container { padding: 18px; display: flex; flex-direction: column; gap: 13px; box-sizing: border-box; }
        .history-top-banner { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding-bottom: 11px; border-bottom: 1px solid #f0ece4; }
        .history-card-container h3 { margin: 0 0 3px; font-size: 15.5px; color: #111827; font-weight: 800; }
        .history-sub { font-size: 11.5px; color: #6b7280; margin: 0; }
        .history-summary-chips { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .history-chip { padding: 6px 11px; border-radius: 9px; background: #faf9f6; border: 1px solid #e5e7eb; font-size: 11px; color: #4b5563; font-weight: 600; }
        .history-chip b { color: #111827; font-weight: 800; }
        .history-chip.accent { background: #fdf5ef; border-color: #ead3bc; color: #5d3513; }
        .history-chip.accent b { color: #5d3513; }

        .history-feed { display: flex; flex-direction: column; gap: 9px; width: 100%; }
        .history-entry-card { border: 1px solid #ece8e0; background: linear-gradient(180deg, #ffffff 0%, #fcfbfa 100%); border-radius: 12px; padding: 13px 15px; display: flex; flex-direction: column; gap: 10px; transition: all .2s ease; box-sizing: border-box; }
        .history-entry-card:hover { border-color: #d8b99a; box-shadow: 0 8px 22px rgba(93, 53, 19, 0.06); }

        .history-entry-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .history-entry-title-wrap { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1 1 240px; }
        .history-flag { font-size: 22px; line-height: 1; flex-shrink: 0; }
        .history-title-stack { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .history-name-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .history-name-line b { font-size: 13px; color: #111827; font-weight: 800; }
        .history-plan-sub { font-size: 11px; color: #6b7280; }
        .history-plan-sub strong { color: #374151; font-weight: 700; }

        .history-amount-actions-wrap { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .history-amount-block { text-align: right; display: flex; flex-direction: column; gap: 1px; margin-right: 2px; }
        .history-amount-block strong { font-size: 14px; color: #5d3513; font-weight: 850; }
        .history-amount-block small { font-size: 10px; color: #6b7280; font-weight: 600; }

        .tx-summary-btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 10px; border-radius: 8.5px; border: 1px solid #e5e7eb; background: #faf9f6; color: #374151; font-size: 11px; font-weight: 750; cursor: pointer; transition: all .16s ease; white-space: nowrap; }
        .tx-summary-btn:hover, .tx-summary-btn.active { border-color: #5d3513; background: #fdf5ef; color: #5d3513; }

        .tx-single-summary-box { background: #faf8f4; border: 1px solid #e8dfd1; border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 5px; }
        .tx-single-summary-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: #5d3513; }
        .tx-single-summary-head code { background: #fff; border: 1px solid #e5e7eb; padding: 2px 6px; border-radius: 5px; font-size: 10px; color: #374151; text-transform: none; }
        .tx-single-summary-text { margin: 0; font-size: 11.5px; line-height: 1.5; color: #374151; }
        .tx-single-summary-text b { color: #111827; font-weight: 750; }
        .tx-single-summary-text code { background: #fff; border: 1px solid #e5e7eb; padding: 1px 5px; border-radius: 5px; font-size: 10.5px; color: #111827; }

        .invoice-download-btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 11px; border-radius: 8.5px; border: 1px solid #e2cbb5; background: #fdf5ef; color: #5d3513; font-size: 11px; font-weight: 750; cursor: pointer; transition: all .16s ease; white-space: nowrap; }
        .invoice-download-btn:hover { background: #5d3513; color: #fff; border-color: #5d3513; }

        .history-entry-meta-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; padding-top: 9px; border-top: 1px dashed #e6e1d8; }
        @media (max-width: 820px) { .history-entry-meta-grid { grid-template-columns: 1fr; gap: 7px; } }

        .history-meta-cell { display: flex; flex-direction: column; gap: 3px; background: #faf9f6; padding: 7px 9px; border-radius: 9px; border: 1px solid #f0ece4; min-width: 0; }
        .meta-label { font-size: 9px; font-weight: 750; color: #8c867d; text-transform: uppercase; letter-spacing: 0.6px; }
        .meta-value-with-copy { display: flex; align-items: center; justify-content: space-between; gap: 6px; min-width: 0; }
        .history-meta-cell code { background: #fff; border: 1px solid #e5e7eb; padding: 3px 6px; border-radius: 6px; font-size: 10.5px; font-family: monospace; color: #111827; overflow-wrap: anywhere; word-break: break-word; flex: 1; }
        .meta-plain-value { font-size: 11.5px; color: #111827; padding-top: 2px; display: flex; align-items: baseline; gap: 4px; flex-wrap: wrap; }
        .meta-sub-currency { font-size: 10px; color: #6b7280; font-weight: 600; }
        .no-history { font-size: 12.5px; color: #6b7280; text-align: center; padding: 32px; }

        @media (max-width: 640px) {
          .esim-page-container { gap: 10px; }
          .esim-top-bar { flex-direction: column; align-items: stretch; gap: 7px; padding-bottom: 8px; }
          .segmented-tabs { width: 100%; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 2.5px; border-radius: 10px; }
          .seg-tab-btn { padding: 6px 6px; font-size: 11px; gap: 4px; justify-content: center; border-radius: 7.5px; }

          .compact-utility-strip { width: 100%; display: grid; grid-template-columns: auto auto 1fr; gap: 6px; }
          .icon-pill-btn, .currency-dropdown-toggle, .wallet-compact-pill { justify-content: center; padding: 6px 8px; border-radius: 8.5px; font-size: 11px; gap: 4px; }
          .pill-label-desktop { display: none; }
          .currency-dropdown-menu { left: 0; right: auto; width: 195px; }

          .card { border-radius: 11px; }
          .esim-search-card { padding: 8px 10px; }
          .esim-search-input { height: 37px; padding: 0 10px; border-radius: 9px; gap: 7px; }
          .esim-search-input input { font-size: 11.5px; }

          .esim-card-main { padding: 10px 11px; gap: 7px; }
          .esim-card-header { gap: 8px; }
          .country-flag { font-size: 21px; }
          .country-title-meta h3 { font-size: 12.5px; margin-bottom: 1px; }
          .country-title-meta small { font-size: 9.5px; }
          .esim-card-action-row { padding-top: 7px; }
          .starting-price-tag span { font-size: 8px; }
          .starting-price-tag strong { font-size: 11px; }
          .expand-toggle-btn { padding: 4px 7px; border-radius: 6.5px; font-size: 10px; }

          .plans-drawer { padding: 8px 9px 10px; gap: 5px; }
          .plans-list { max-height: 190px; gap: 5px; }
          .plan-item { padding: 6.5px 8px; border-radius: 8px; }
          .plan-meta strong { font-size: 11px; }
          .plan-meta span { font-size: 9px; }
          .plan-buy { gap: 5px; }
          .plan-buy strong { font-size: 10.5px; }
          .buy-plan-btn { padding: 4px 7.5px; border-radius: 6.5px; font-size: 9.5px; }

          .my-sim-card { padding: 12px; gap: 10px; }
          .sim-flag { font-size: 22px; }
          .sim-card-top h4 { font-size: 12.5px; }
          .sim-card-top small { max-width: 130px; font-size: 9.5px; }
          .data-usage-box { padding: 9px; gap: 6px; }
          .usage-labels { font-size: 10.5px; }
          .sim-meta-footer { padding-top: 9px; font-size: 10.5px; }
          .qr-button { padding: 5.5px 8px; font-size: 10px; }

          .history-card-container { padding: 12px; gap: 10px; }
          .history-card-container h3 { font-size: 14px; }
          .history-sub { font-size: 10.5px; }
          .history-chip { padding: 5px 8px; font-size: 10px; }
          .history-entry-card { padding: 11px 12px; gap: 8px; border-radius: 10px; }
          .history-flag { font-size: 20px; }
          .history-name-line b { font-size: 12px; }
          .history-plan-sub { font-size: 10.5px; }
          .history-amount-actions-wrap { width: 100%; justify-content: space-between; }
          .history-amount-block { text-align: left; }
          .history-amount-block strong { font-size: 12.5px; }
          .tx-summary-btn, .invoice-download-btn { padding: 6px 9px; font-size: 10px; }
          .history-meta-cell { padding: 6px 8px; }
          .history-meta-cell code { font-size: 10px; }

          .scroll-top-fab { right: 14px; bottom: 16px; width: 36px; height: 36px; }
          .modal { padding: 18px; border-radius: 15px; gap: 13px; }
          .modal-header h2 { font-size: 17px; }
        }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 999; padding: 16px; box-sizing: border-box; }
        .modal { background: #fff; width: 100%; max-width: 460px; max-height: 88vh; border-radius: 20px; padding: 28px; display: flex; flex-direction: column; gap: 18px; position: relative; box-shadow: 0 25px 50px rgba(0,0,0,0.2); box-sizing: border-box; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; }
        .modal::-webkit-scrollbar { display: none; }
        .modal-header { display: flex; justify-content: space-between; align-items: flex-start; flex-shrink: 0; }
        .modal-kicker { font-size: 10px; font-weight: 800; color: #5d3513; letter-spacing: 1px; }
        .modal-header h2 { margin: 4px 0 3px; font-size: 20px; font-weight: 750; }
        .modal-header p { margin: 0; font-size: 12.5px; color: #6b7280; }
        .modal-close { background: #f5f3ef; border: 0; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; color: #6b7280; transition: background .15s; flex-shrink: 0; }
        .modal-close:hover { background: #e5e3db; }

        .booking-summary-box { display: flex; flex-direction: column; gap: 12px; padding: 16px; background: #faf9f6; border-radius: 12px; font-size: 13px; border: 1px solid #e5e7eb; box-sizing: border-box; }
        .summary-row { display: flex; justify-content: space-between; color: #6b7280; }
        .summary-row.total { border-top: 1px solid #e5e3db; padding-top: 12px; font-weight: 750; color: #111827; font-size: 14px; text-align: right; }

        .secure-note { display: flex; align-items: center; gap: 7px; font-size: 12px; color: #6b7280; margin: 0; }
        .modal-submit { padding: 14px; border-radius: 12px; background: #5d3513; color: #fff; font-size: 14px; font-weight: 750; border: 0; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 8px; transition: all .16s ease; box-shadow: 0 4px 14px rgba(93, 53, 19, 0.25); box-sizing: border-box; }
        .modal-submit:hover { background: #42250d; transform: translateY(-1px); }
        .modal-submit:disabled { opacity: 0.75; cursor: not-allowed; }

        .btn-loading { display: inline-flex; align-items: center; gap: 8px; }
        .error-alert { display: flex; align-items: center; gap: 8px; padding: 13px 16px; background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; border-radius: 12px; font-size: 13px; font-weight: 500; box-sizing: border-box; }
        .classy-low-balance-alert { background: #fdf8f3; border: 1px solid #e7c9a9; color: #6b3a12; font-weight: 600; border-radius: 12px; padding: 12px 15px; }

        .success-state-box { display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center; padding: 14px 0; }
        .success-icon { width: 60px; height: 60px; border-radius: 50%; background: #e9f8f0; color: #10b981; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(16, 185, 129, 0.25); }
        .success-state-box h3 { margin: 0; font-size: 19px; font-weight: 750; }
        .success-state-box p { margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5; }
        .success-state-box code { background: #f5f3ef; padding: 3px 8px; border-radius: 6px; font-size: 12px; }

        .qr-modal { text-align: center; }
        .qr-box { display: flex; flex-direction: column; align-items: center; gap: 14px; margin: 4px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 14px; background: #faf9f6; box-sizing: border-box; }
        .qr-box img { width: 190px; height: 190px; border-radius: 10px; background: #fff; padding: 8px; border: 1px solid #e5e3db; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
        .manual-codes-wrap { width: 100%; display: flex; flex-direction: column; gap: 6px; text-align: left; }
        .manual-code-row { display: flex; align-items: center; justify-content: space-between; background: #fff; padding: 8px 10px; border-radius: 8px; border: 1px solid #e5e7eb; font-size: 11.5px; color: #374151; }
        .copy-mini-btn { background: #f5f3ef; border: 0; border-radius: 6px; padding: 5px 7px; cursor: pointer; color: #5d3513; display: grid; place-items: center; flex-shrink: 0; }
        .copy-mini-btn:hover { background: #ebd8c8; }
        .qr-steps { text-align: left; font-size: 12px; color: #6b7280; display: flex; flex-direction: column; gap: 8px; background: #fdfcfb; padding: 14px; border-radius: 12px; border: 1px solid #e5e7eb; box-sizing: border-box; }
        .qr-steps p { margin: 0; }
      `}</style>
    </div>
  );
}