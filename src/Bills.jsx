// Bills.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Zap, Tv, Wifi, Smartphone, ShieldCheck,
  Check, X, ArrowRight, History, AlertCircle, CheckCircle2,
  Ticket, Trophy, GraduationCap, Loader2, Lock, FileText, Download, RefreshCw, ChevronDown
} from "lucide-react";

const resolveApiBase = () => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env) {
      const viteBase =
        import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL;
      if (typeof viteBase === "string" && viteBase.trim()) {
        return viteBase.trim().replace(/\/+$/, "");
      }
    }
  } catch {
    // Ignore if import.meta is unavailable
  }

  try {
    if (typeof process !== "undefined" && process.env) {
      const nodeBase =
        process.env.REACT_APP_API_BASE || process.env.REACT_APP_API_URL;
      if (typeof nodeBase === "string" && nodeBase.trim()) {
        return nodeBase.trim().replace(/\/+$/, "");
      }
    }
  } catch {
    // Ignore if process is unavailable
  }

  return "http://localhost:5000";
};

const API_BASE = resolveApiBase();
const WALLET_CACHE_KEY = "cardnext_wallet_cache";
const WALLET_UPDATED_EVENT = "cardnext:wallet-updated";

const billCategories = [
  {
    id: "airtime",
    name: "Airtime",
    icon: Smartphone,
    providers: [
      { id: "mtn", name: "MTN Nigeria", tag: "Instant Top-up", badge: "2% Cashback" },
      { id: "glo", name: "Glo Mobile", tag: "Data & Voice", badge: "Fast" },
      { id: "airtel", name: "Airtel Nigeria", tag: "Instant Top-up", badge: "Best Rate" },
      { id: "t2mobile", name: "T2mobile", tag: "Voice & Data", badge: "Active" }
    ],
    requiresCustomerRef: true,
    refLabel: "Recipient Phone Number",
    minRefLength: 10
  },
  {
    id: "data",
    name: "Data Bundles",
    icon: Wifi,
    providers: [
      { id: "mtn", name: "MTN Data", tag: "Broadband", badge: "Instant" },
      { id: "glo", name: "Glo Data", tag: "Fast Browsing", badge: "Bundle" },
      { id: "airtel", name: "Airtel Data", tag: "4G/5G Bundles", badge: "Best" },
      { id: "smile", name: "Smile 4G", tag: "Broadband", badge: "Unlimited" }
    ],
    requiresCustomerRef: true,
    refLabel: "Phone / Account Number",
    minRefLength: 10
  },
  {
    id: "electricity",
    name: "Electricity",
    icon: Zap,
    providers: [
      { id: "ekedc", name: "EKEDC", tag: "Eko Electric", badge: "Token" },
      { id: "ikedc", name: "IKEDC", tag: "Ikeja Electric", badge: "Verified" },
      { id: "aedc", name: "AEDC", tag: "Abuja Power", badge: "Power" },
      { id: "ibedc", name: "IBEDC", tag: "Ibadan Power", badge: "Stable" },
      { id: "phed", name: "PHED", tag: "Port Harcourt", badge: "Fast" }
    ],
    requiresCustomerRef: true,
    refLabel: "Meter Number",
    hasMeterType: true,
    minRefLength: 6
  },
  {
    id: "tv",
    name: "Cable TV",
    icon: Tv,
    providers: [
      { id: "dstv", name: "DStv", tag: "Multichoice", badge: "HD" },
      { id: "gotv", name: "GOtv", tag: "Multichoice", badge: "Instant" },
      { id: "startimes", name: "StarTimes", tag: "Digital TV", badge: "Value" }
    ],
    requiresCustomerRef: true,
    refLabel: "Smartcard / IUC Number",
    minRefLength: 8
  },
  {
    id: "bet_funding",
    name: "Betting",
    icon: Trophy,
    providers: [
      { id: "bet9ja", name: "Bet9ja", tag: "Sports Gaming", badge: "Instant" },
      { id: "sportybet", name: "SportyBet", tag: "Live Gaming", badge: "Fast" },
      { id: "1xbet", name: "1xBet", tag: "Global Betting", badge: "Top" },
      { id: "betking", name: "BetKing", tag: "Kings League", badge: "Active" }
    ],
    requiresCustomerRef: true,
    refLabel: "Betting Account ID",
    minRefLength: 5
  },
  {
    id: "education",
    name: "Education",
    icon: GraduationCap,
    providers: [
      { id: "waec", name: "WAEC Result/Pin", tag: "Exam Board", badge: "Secure" },
      { id: "jamb", name: "JAMB E-PIN", tag: "Matriculation", badge: "Official" }
    ],
    requiresCustomerRef: true,
    refLabel: "Candidate / Profile ID",
    minRefLength: 6
  },
  {
    id: "epin",
    name: "Recharge ePINs",
    icon: Ticket,
    providers: [
      { id: "mtn", name: "MTN ePIN Pack", tag: "Voucher Print", badge: "Bulk" },
      { id: "airtel", name: "Airtel ePIN Pack", tag: "Voucher Print", badge: "Bulk" }
    ],
    requiresCustomerRef: false
  }
];

const quickAmounts = [1000, 2000, 5000, 10000, 20000];

const BILL_SERVICE_MAP = new Map(billCategories.map(cat => [cat.id, cat]));
const BILL_PROVIDER_MAP = new Map(
  billCategories.flatMap(cat => cat.providers.map(prov => [`${cat.id}:${prov.id}`, { cat, prov }]))
);
const ALL_PROVIDER_IDS = new Set(
  billCategories.flatMap(cat => cat.providers.map(prov => prov.id.toLowerCase()))
);

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseTxMetadata(rawMeta) {
  if (!rawMeta) return {};
  if (typeof rawMeta === "object") return rawMeta;
  try {
    return JSON.parse(rawMeta);
  } catch (_) {
    return {};
  }
}

function isBillsPageTransaction(tx) {
  if (!tx || typeof tx !== "object") return false;
  const meta = parseTxMetadata(tx.metadata);
  const service = String(meta.serviceType || tx.serviceType || "").toLowerCase();
  const provider = String(meta.provider || tx.provider || "").toLowerCase();

  if (BILL_SERVICE_MAP.has(service)) return true;
  if (ALL_PROVIDER_IDS.has(provider)) return true;
  return false;
}

function formatBillTitle(tx) {
  const meta = parseTxMetadata(tx?.metadata);
  const service = String(meta.serviceType || tx?.serviceType || "").toLowerCase();
  const provider = String(meta.provider || tx?.provider || "").toLowerCase();

  const pairMatch = BILL_PROVIDER_MAP.get(`${service}:${provider}`);
  if (pairMatch) {
    return `${pairMatch.prov.name} · ${pairMatch.cat.name}`;
  }

  const catMatch = BILL_SERVICE_MAP.get(service);
  if (catMatch && provider) {
    return `${provider.toUpperCase()} · ${catMatch.name}`;
  }
  if (catMatch) {
    return catMatch.name;
  }
  if (provider) {
    return `${provider.toUpperCase()} Utility`;
  }
  return "Utility Payment";
}

function getTxKey(tx, idx) {
  return String(tx?.id ?? tx?.reference ?? tx?.ref ?? `bill-${idx}`);
}

function syncWalletBalanceCache(nextBalance) {
  const numeric = Number(nextBalance);
  if (!Number.isFinite(numeric)) return;

  try {
    const raw = localStorage.getItem(WALLET_CACHE_KEY);
    const currentCache = raw ? JSON.parse(raw) : {};
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
          walletBalance: numeric
        }
      })
    );
  } catch {}
}

export default function BillsPage() {
  const [userId, setUserId] = useState(() => {
    const id = localStorage.getItem("userId");
    return id && id !== "null" && id !== "undefined" ? id : null;
  });
  const [selectedCategory, setSelectedCategory] = useState("airtime");
  const [activeCategoryObj, setActiveCategoryObj] = useState(billCategories[0]);
  const [selectedProvider, setSelectedProvider] = useState(billCategories[0].providers[0]);
  const [customerRef, setCustomerRef] = useState("");
  const [amount, setAmount] = useState("");
  const [meterType, setMeterType] = useState("prepaid");

  const [walletBalance, setWalletBalance] = useState(0);
  const [recentBills, setRecentBills] = useState([]);
  const [isSyncingLedger, setIsSyncingLedger] = useState(false);
  const [historyDropdownOpen, setHistoryDropdownOpen] = useState(false);

  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedCustomerName, setVerifiedCustomerName] = useState(null);
  const [verificationError, setVerificationError] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [lastSettledTx, setLastSettledTx] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [openSummaryKey, setOpenSummaryKey] = useState(null);
  const [downloadedInvoiceKey, setDownloadedInvoiceKey] = useState("");

  const verifySeqRef = useRef(0);

  const fetchWalletAndTransactions = useCallback(async (targetUserId, signal) => {
    const activeId = targetUserId || userId;
    if (!activeId) return;

    setIsSyncingLedger(true);
    try {
      const [balanceRes, billHistRes] = await Promise.all([
        fetch(`${API_BASE}/api/wallet/balance/${encodeURIComponent(activeId)}`, { signal }),
        fetch(`${API_BASE}/api/bills/history/${encodeURIComponent(activeId)}`, { signal })
      ]);

      const balanceData = balanceRes.ok ? await balanceRes.json().catch(() => null) : null;
      const billHistData = billHistRes.ok ? await billHistRes.json().catch(() => null) : null;

      if (balanceData?.success && balanceData.walletBalance !== undefined) {
        const parsedBal = Number(balanceData.walletBalance || 0);
        setWalletBalance(parsedBal);
        syncWalletBalanceCache(parsedBal);
      }

      if (billHistData?.success && Array.isArray(billHistData.transactions)) {
        setRecentBills(billHistData.transactions.filter(isBillsPageTransaction));
      } else {
        const txRes = await fetch(`${API_BASE}/api/wallet/transactions/${encodeURIComponent(activeId)}`, { signal });
        const txData = txRes.ok ? await txRes.json().catch(() => null) : null;
        if (txData?.success && Array.isArray(txData.transactions)) {
          setRecentBills(txData.transactions.filter(isBillsPageTransaction));
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Failed to sync wallet data:", err);
      }
    } finally {
      setIsSyncingLedger(false);
    }
  }, [userId]);

  useEffect(() => {
    const activeUserId = localStorage.getItem("userId");
    if (!activeUserId || activeUserId === "null" || activeUserId === "undefined") {
      setUserId(null);
      return;
    }
    setUserId(activeUserId);

    const controller = new AbortController();
    fetchWalletAndTransactions(activeUserId, controller.signal);
    return () => controller.abort();
  }, [fetchWalletAndTransactions]);

  useEffect(() => {
    if (!activeCategoryObj.requiresCustomerRef) {
      setIsVerifying(false);
      setVerifiedCustomerName(null);
      setVerificationError("");
      return;
    }

    const trimmed = customerRef.trim();
    const minLen = activeCategoryObj.minRefLength || 4;
    if (!trimmed || trimmed.length < minLen) {
      setIsVerifying(false);
      setVerifiedCustomerName(null);
      setVerificationError("");
      return;
    }

    const currentSeq = ++verifySeqRef.current;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setIsVerifying(true);
      setVerificationError("");
      setVerifiedCustomerName(null);

      try {
        const response = await fetch(`${API_BASE}/api/bills/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            serviceType: selectedCategory,
            provider: selectedProvider.id,
            customerId: trimmed,
            meterType
          })
        });
        const result = await response.json().catch(() => null);
        if (currentSeq !== verifySeqRef.current) return;

        if (response.ok && result?.success && result?.verified !== false) {
          setVerifiedCustomerName(
            result.data?.customerName ||
            result.data?.name ||
            result.data?.customer_name ||
            "Verified Subscriber Account"
          );
        } else {
          setVerificationError(result?.message || "Could not verify subscriber or meter details.");
        }
      } catch (err) {
        if (err.name === "AbortError" || currentSeq !== verifySeqRef.current) return;
        console.error("Verification error:", err);
        setVerificationError("Unable to reach verification service.");
      } finally {
        if (currentSeq === verifySeqRef.current) {
          setIsVerifying(false);
        }
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [customerRef, selectedCategory, selectedProvider, meterType, activeCategoryObj]);

  const handleCategoryChange = (catId) => {
    verifySeqRef.current += 1;
    setSelectedCategory(catId);
    const catObj = billCategories.find(c => c.id === catId) || billCategories[0];
    setActiveCategoryObj(catObj);
    setSelectedProvider(catObj.providers[0]);
    setCustomerRef("");
    setIsVerifying(false);
    setVerifiedCustomerName(null);
    setVerificationError("");
    setErrorMessage("");
  };

  const handlePayment = async () => {
    if (!userId || userId === "null" || userId === "undefined") {
      setErrorMessage("Active session required. Please log in.");
      return;
    }
    const numericAmt = Number(amount);
    if ((activeCategoryObj.requiresCustomerRef && !customerRef.trim()) || !numericAmt || numericAmt <= 0) return;

    if (activeCategoryObj.requiresCustomerRef && verificationError) {
      setErrorMessage("Please enter a valid, verified subscriber or meter identifier before paying.");
      return;
    }

    if (numericAmt > Number(walletBalance || 0)) {
      setErrorMessage("Insufficient wallet balance. Please fund your account.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");

    const trimmedRef = customerRef.trim() || "N/A";

    try {
      const response = await fetch(`${API_BASE}/api/bills/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: Number.isNaN(Number(userId)) ? userId : Number(userId),
          provider: selectedProvider.id,
          serviceType: selectedCategory,
          amount: numericAmt,
          customerId: trimmedRef,
          meterType
        })
      });

      const result = await response.json().catch(() => null);

      if (response.ok && result?.success) {
        const nextBalance =
          result.newBalance !== undefined
            ? Number(result.newBalance)
            : Math.max(0, Number(walletBalance || 0) - numericAmt);

        const settledRecord = result.transaction || {
          id: `local-${Date.now()}`,
          reference: result.data?.reference || `BILL-${Date.now()}`,
          type: "bill_payment",
          amount: numericAmt,
          currency: "NGN",
          status: "SUCCESS",
          metadata: {
            provider: selectedProvider.id,
            serviceType: selectedCategory,
            customerId: trimmedRef,
            meterType: selectedCategory === "electricity" ? meterType : undefined
          },
          created_at: new Date().toISOString()
        };

        setWalletBalance(nextBalance);
        syncWalletBalanceCache(nextBalance);
        setLastSettledTx(settledRecord);
        setRecentBills(prev => {
          const filtered = prev.filter(isBillsPageTransaction);
          const exists = filtered.some(
            item => item.reference && settledRecord.reference && item.reference === settledRecord.reference
          );
          if (exists) {
            return filtered.map(item =>
              item.reference === settledRecord.reference ? { ...item, ...settledRecord } : item
            );
          }
          return [settledRecord, ...filtered];
        });
        setOpenSummaryKey(getTxKey(settledRecord, 0));
        setPaymentSuccess(true);

        await fetchWalletAndTransactions(userId);
      } else {
        setErrorMessage(result?.message || "Transaction failed.");
      }
    } catch (err) {
      console.error("Bill Purchase Error:", err);
      setErrorMessage("Unable to connect to backend server.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadBillInvoice = (tx, txKey) => {
    if (!tx) return;
    const meta = parseTxMetadata(tx.metadata);
    const title = formatBillTitle(tx);
    const txRef = String(tx.reference || tx.ref || tx.id || "BILL-TX");
    const safeFilenameRef = txRef.replace(/[^a-zA-Z0-9_-]/g, "_");
    const txAmount = Number(tx.amount || 0);
    const createdDate = tx.created_at ? new Date(tx.created_at) : null;
    const dateStr =
      createdDate && !Number.isNaN(createdDate.getTime())
        ? createdDate.toLocaleString()
        : new Date().toLocaleString();
    const customerAccount = meta.customerId || tx.customerId || "Direct Top-up";
    const statusLabel = String(tx.status || "Completed").toUpperCase();

    const invoiceHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CardNEXT Bill Invoice - ${escapeHtml(txRef)}</title>
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
      background: linear-gradient(145deg, #19110d 0%, #3d210b 60%, #2b1b12 100%);
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
      color: #16a34a;
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
        <div class="brand-sub">Official Bills &amp; Utility Receipt</div>
      </div>
      <div class="invoice-tag">
        <span>Utility Receipt</span>
        <p>${escapeHtml(txRef)}</p>
      </div>
    </div>

    <div class="invoice-body">
      <div class="amount-banner">
        <div class="amount-label">Wallet Debit (${escapeHtml(tx.currency || "NGN")})</div>
        <div class="amount-value">₦${escapeHtml(txAmount.toLocaleString())}</div>
        <div class="status-pill">${escapeHtml(statusLabel)}</div>
      </div>

      <table class="meta-table">
        <tr>
          <td class="meta-key">Service / Provider</td>
          <td class="meta-val">${escapeHtml(title)}</td>
        </tr>
        <tr>
          <td class="meta-key">Recipient / Account ID</td>
          <td class="meta-val mono">${escapeHtml(customerAccount)}</td>
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
      link.download = `CardNEXT-Bill-Invoice-${safeFilenameRef}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("Failed to download CardNEXT bill invoice:", err);
    }

    setDownloadedInvoiceKey(txKey);
    setTimeout(() => {
      setDownloadedInvoiceKey(prev => (prev === txKey ? "" : prev));
    }, 2500);
  };

  const closeModal = () => {
    setPaymentSuccess(false);
    setLastSettledTx(null);
    setAmount("");
    setCustomerRef("");
    setVerifiedCustomerName(null);
    setErrorMessage("");
  };

  if (!userId) {
    return (
      <div className="bills-session-lock animate-fade-in">
        <Lock size={30} style={{ color: "#d97706", marginBottom: "10px" }} />
        <h2>Session Required</h2>
        <p>Please log in to your account to access bills and utility payments.</p>
        <button type="button" onClick={() => { window.location.href = "/login"; }}>
          Go to Login
        </button>
      </div>
    );
  }

  const numericAmount = Number(amount || 0);
  const settledAmount = lastSettledTx ? Number(lastSettledTx.amount || numericAmount) : numericAmount;
  const filteredBillHistory = recentBills.filter(isBillsPageTransaction);
  const isFormInvalid =
    (activeCategoryObj.requiresCustomerRef && !customerRef.trim()) ||
    Boolean(verificationError) ||
    !numericAmount ||
    numericAmount <= 0 ||
    isProcessing;

  return (
    <div className="bills-page-container animate-fade-in">
      <section className="bills-banner">
        <div className="bills-banner-glow" />
        <div className="bills-banner-text">
          <h2>Bills &amp; Utilities</h2>
        </div>
        <div className="banner-wallet-preview">
          <small>Wallet Balance</small>
          <h3>₦{Number(walletBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
        </div>
      </section>

      <div className="bills-stack-layout">
        <div className="card bills-form-card">
          <div className="section-heading">
            <h3>Select Service</h3>
          </div>

          <div className="category-tabs-wrapper">
            <div className="category-tabs no-scrollbar">
              {billCategories.map(cat => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`category-tab ${selectedCategory === cat.id ? "active" : ""}`}
                    onClick={() => handleCategoryChange(cat.id)}
                  >
                    <Icon size={15} />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label>Provider</label>
            <div className="providers-grid">
              {activeCategoryObj.providers.map(prov => {
                const isSelected = selectedProvider.id === prov.id;
                return (
                  <div
                    key={prov.id}
                    role="button"
                    tabIndex={0}
                    className={`provider-card ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      verifySeqRef.current += 1;
                      setSelectedProvider(prov);
                      setVerifiedCustomerName(null);
                      setVerificationError("");
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        verifySeqRef.current += 1;
                        setSelectedProvider(prov);
                        setVerifiedCustomerName(null);
                        setVerificationError("");
                      }
                    }}
                  >
                    <div className="provider-card-top">
                      <strong>{prov.name}</strong>
                      <span className="provider-badge">{prov.badge}</span>
                    </div>
                    <span className="provider-tag">{prov.tag}</span>
                    {isSelected && <div className="provider-selected-tick"><Check size={11} /></div>}
                  </div>
                );
              })}
            </div>
          </div>

          {activeCategoryObj.hasMeterType && (
            <div className="form-group">
              <label>Meter Type</label>
              <div className="meter-type-toggle">
                <button
                  type="button"
                  className={`toggle-btn ${meterType === "prepaid" ? "active" : ""}`}
                  onClick={() => setMeterType("prepaid")}
                >
                  Prepaid
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${meterType === "postpaid" ? "active" : ""}`}
                  onClick={() => setMeterType("postpaid")}
                >
                  Postpaid
                </button>
              </div>
            </div>
          )}

          {activeCategoryObj.requiresCustomerRef && (
            <div className="form-group">
              <label>{activeCategoryObj.refLabel}</label>
              <div className="bills-input-wrap">
                <input
                  type="text"
                  placeholder={`Enter ${activeCategoryObj.refLabel.toLowerCase()}...`}
                  value={customerRef}
                  onChange={e => {
                    verifySeqRef.current += 1;
                    setCustomerRef(e.target.value);
                    setVerifiedCustomerName(null);
                    setVerificationError("");
                  }}
                />
                <div className="input-status-indicator">
                  {isVerifying && <Loader2 size={15} className="spinning-loader" />}
                  {verifiedCustomerName && !isVerifying && <CheckCircle2 size={16} className="verified-icon-glow" />}
                  {verificationError && !isVerifying && <AlertCircle size={16} style={{ color: "#dc2626" }} />}
                </div>
              </div>
              {verifiedCustomerName && (
                <span className="verification-success-text animate-pop"><CheckCircle2 size={12} /> {verifiedCustomerName}</span>
              )}
              {verificationError && (
                <span className="verification-error-text animate-pop"><AlertCircle size={12} /> {verificationError}</span>
              )}
            </div>
          )}

          <div className="form-group">
            <label>Amount (NGN)</label>
            <div className="bills-input-wrap amount-wrap">
              <span>₦</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              />
            </div>

            <div className="quick-amounts-grid">
              {quickAmounts.map(val => (
                <button
                  key={val}
                  type="button"
                  className={`quick-chip ${numericAmount === val ? "active" : ""}`}
                  onClick={() => setAmount(val.toString())}
                >
                  ₦{val.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {errorMessage && (
            <div className="error-banner animate-pop">
              <AlertCircle size={14} /> <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="button"
            className="pay-bill-btn"
            onClick={handlePayment}
            disabled={isFormInvalid}
          >
            <span>
              {isProcessing
                ? "Processing..."
                : `Pay ${selectedProvider.name} (${numericAmount > 0 ? `₦${numericAmount.toLocaleString()}` : "₦0.00"})`}
            </span>
            <ArrowRight size={15} />
          </button>
        </div>

        <div className={`card history-dropdown-card ${historyDropdownOpen ? "is-open" : ""}`}>
          <div className="history-dropdown-header">
            <button
              type="button"
              className="history-dropdown-trigger"
              aria-expanded={historyDropdownOpen}
              onClick={() => setHistoryDropdownOpen(prev => !prev)}
            >
              <span className="history-trigger-left">
                <History size={16} />
                <span>Recent Bills</span>
                <span className="history-count-badge">{filteredBillHistory.length}</span>
              </span>
              <ChevronDown
                size={16}
                className={`history-chevron ${historyDropdownOpen ? "rotated" : ""}`}
              />
            </button>

            <button
              type="button"
              className="sync-ledger-btn"
              onClick={() => fetchWalletAndTransactions(userId)}
              disabled={isSyncingLedger}
              title="Sync wallet and bill history"
            >
              <RefreshCw size={12} className={isSyncingLedger ? "spinning-loader" : ""} />
              <span>Sync</span>
            </button>
          </div>

          <div className={`history-dropdown-collapse ${historyDropdownOpen ? "is-open" : ""}`}>
            <div className="history-dropdown-inner">
              <div className="recent-bills-list no-scrollbar">
                {filteredBillHistory.length > 0 ? (
                  filteredBillHistory.map((tx, idx) => {
                    const txKey = getTxKey(tx, idx);
                    const meta = parseTxMetadata(tx.metadata);
                    const title = formatBillTitle(tx);
                    const txRef = tx.reference || tx.ref || tx.id || `BILL-${idx}`;
                    const txAmount = Number(tx.amount || 0);
                    const txDate = new Date(tx.created_at || Date.now()).toLocaleDateString();
                    const isSummaryOpen = openSummaryKey === txKey;

                    return (
                      <div className="recent-bill-item" key={txKey}>
                        <div className="recent-bill-main">
                          <div className="bill-item-info">
                            <strong>{title}</strong>
                            <span>{txRef} · {txDate}</span>
                          </div>
                          <div className="bill-item-right">
                            <strong>₦{txAmount.toLocaleString()}</strong>
                            <span className={`status-pill ${tx.status || "Successful"}`}>{tx.status || "Successful"}</span>
                          </div>
                        </div>

                        <div className="recent-bill-actions">
                          <button
                            type="button"
                            className={`tx-summary-btn ${isSummaryOpen ? "active" : ""}`}
                            onClick={() => setOpenSummaryKey(prev => (prev === txKey ? null : txKey))}
                          >
                            <FileText size={11} /> <span>Summary</span>
                          </button>
                          <button
                            type="button"
                            className="tx-invoice-btn"
                            onClick={() => handleDownloadBillInvoice(tx, txKey)}
                          >
                            {downloadedInvoiceKey === txKey ? (
                              <>
                                <Check size={11} /> <span>Saved</span>
                              </>
                            ) : (
                              <>
                                <Download size={11} /> <span>CardNEXT Invoice</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className={`tx-summary-collapse ${isSummaryOpen ? "is-open" : ""}`}>
                          <div className="tx-summary-collapse-inner">
                            <div className="tx-summary-box">
                              <div className="tx-summary-top">
                                <span>Transaction Summary</span>
                                <code>{txRef}</code>
                              </div>
                              <p>
                                <b>{title}</b> for account <code>{meta.customerId || "N/A"}</code> was{" "}
                                <b>{tx.status || "completed"}</b> on <b>{txDate}</b>, debiting{" "}
                                <b>₦{txAmount.toLocaleString()}</b> from your CardNext wallet.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty-bills-state">
                    No recent utility transactions.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {paymentSuccess && (
        <div className="modal-overlay animate-fade-in" onClick={closeModal}>
          <div className="modal luxury-modal animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-kicker">PAYMENT COMPLETE</span>
                <h2>Bill Settled</h2>
              </div>
              <button type="button" className="modal-close" onClick={closeModal} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <div className="modal-scrollable-body">
              <div className="success-state-container">
                <div className="success-icon-glow-ring">
                  <div className="success-icon-inner">
                    <Check size={26} strokeWidth={2.8} />
                  </div>
                </div>
                <div className="success-text-block">
                  <h3>₦{settledAmount.toLocaleString()} Paid</h3>
                  <p>{selectedProvider.name} · {customerRef || "Direct Top-up"}</p>
                  {lastSettledTx?.reference && (
                    <small className="modal-tx-ref">Ref: {lastSettledTx.reference}</small>
                  )}
                </div>
              </div>

              <div className="vault-info-banner">
                <ShieldCheck size={15} className="banner-ico" />
                <span>Wallet balance and bill history synced. Summary &amp; CardNEXT Invoice are ready under Recent Bills.</span>
              </div>
            </div>

            <button type="button" className="modal-submit premium-btn" onClick={closeModal}>
              Done
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.97); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-scale-up { animation: scaleUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-pop { animation: popIn 0.18s ease-out forwards; }
        .spinning-loader { animation: spin 1s linear infinite; color: #5d3513; }

        .bills-session-lock { padding: 48px 20px; text-align: center; background: #fdfbf7; border-radius: 20px; border: 1px solid #eae5de; }
        .bills-session-lock h2 { font-size: 18px; font-weight: 900; color: #111827; margin: 0 0 6px; }
        .bills-session-lock p { font-size: 12px; color: #6b7280; max-width: 360px; margin: 0 auto 18px; }
        .bills-session-lock button { background: #0f172a; color: #fff; border: 0; padding: 11px 22px; border-radius: 11px; font-size: 12px; font-weight: 700; cursor: pointer; }

        .bills-page-container { display: flex; flex-direction: column; gap: 20px; width: 100%; box-sizing: border-box; }

        .bills-banner { position: relative; display: flex; justify-content: space-between; align-items: center; gap: 14px; overflow: hidden; border-radius: 18px; background: linear-gradient(135deg, #3d210b 0%, #5d3513 60%, #7c481e 100%); border: 1px solid #4a280d; color: #fff; padding: 22px 26px; box-shadow: 0 12px 35px rgba(93, 53, 19, 0.15); box-sizing: border-box; }
        .bills-banner-glow { position: absolute; inset: 0; background: radial-gradient(circle at 85% 25%, rgba(255,255,255,0.15) 0%, transparent 65%); pointer-events: none; }
        .bills-banner-text { z-index: 2; }
        .bills-banner-text h2 { margin: 0; font-size: 20px; font-weight: 850; letter-spacing: -0.4px; color: #ffffff; }

        .banner-wallet-preview { z-index: 2; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.22); padding: 12px 18px; border-radius: 13px; text-align: right; backdrop-filter: blur(10px); box-sizing: border-box; flex-shrink: 0; }
        .banner-wallet-preview small { display: block; color: #fcefe3; font-size: 9.5px; text-transform: uppercase; font-weight: 750; margin-bottom: 2px; opacity: 0.85; }
        .banner-wallet-preview h3 { margin: 0; font-size: 18px; font-weight: 900; color: #ffffff; font-variant-numeric: tabular-nums; }

        .bills-stack-layout { display: flex; flex-direction: column; gap: 18px; width: 100%; }

        .bills-form-card { width: 100%; background: #ffffff; border: 1px solid #e8dfd3; border-radius: 20px; padding: 24px 26px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 8px 25px rgba(93, 53, 19, 0.04); box-sizing: border-box; }
        .section-heading h3 { margin: 0; font-size: 13.5px; font-weight: 800; color: #2b1b12; display: flex; align-items: center; gap: 7px; }

        .history-dropdown-card { width: 100%; background: #ffffff; border: 1px solid #e8dfd3; border-radius: 18px; padding: 14px 18px; box-shadow: 0 8px 25px rgba(93, 53, 19, 0.04); box-sizing: border-box; transition: border-color 0.22s ease, box-shadow 0.22s ease; }
        .history-dropdown-card.is-open { border-color: #d6c3ab; box-shadow: 0 12px 28px rgba(93, 53, 19, 0.07); }

        .history-dropdown-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .history-dropdown-trigger { flex: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; background: transparent; border: 0; padding: 4px 2px; color: #2b1b12; font-size: 13.5px; font-weight: 800; cursor: pointer; text-align: left; }
        .history-trigger-left { display: inline-flex; align-items: center; gap: 8px; }
        .history-count-badge { background: #f6efe6; color: #5d3513; border: 1px solid #e5d6c3; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 999px; font-variant-numeric: tabular-nums; }
        .history-chevron { color: #6e594a; transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1); flex-shrink: 0; }
        .history-chevron.rotated { transform: rotate(180deg); color: #5d3513; }

        .history-dropdown-collapse { display: grid; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows 0.34s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.26s ease; }
        .history-dropdown-collapse.is-open { grid-template-rows: 1fr; opacity: 1; }
        .history-dropdown-inner { overflow: hidden; }
        .history-dropdown-collapse.is-open .history-dropdown-inner { padding-top: 12px; }

        .sync-ledger-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px; border-radius: 8px; border: 1px solid #e8dfd3; background: #fcfaf7; color: #5d3513; font-size: 10.5px; font-weight: 750; cursor: pointer; transition: 0.15s; flex-shrink: 0; }
        .sync-ledger-btn:hover:not(:disabled) { background: #f5efe6; border-color: #cbb9a3; }
        .sync-ledger-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .category-tabs-wrapper { width: 100%; overflow: hidden; box-sizing: border-box; }
        .category-tabs { display: flex; gap: 7px; overflow-x: auto; padding-bottom: 2px; }

        .category-tab { display: inline-flex; align-items: center; gap: 6px; padding: 9px 13px; border-radius: 11px; background: #f7f3ed; border: 1px solid #e8dfd3; color: #6e594a; font-size: 11px; font-weight: 750; cursor: pointer; transition: all .2s ease; white-space: nowrap; flex-shrink: 0; box-sizing: border-box; }
        .category-tab:hover { background: #efe7dc; color: #3d210b; border-color: #cbb9a3; }
        .category-tab.active { background: linear-gradient(135deg, #5d3513 0%, #3d210b 100%); color: #fff; border-color: #5d3513; box-shadow: 0 4px 12px rgba(93, 53, 19, 0.22); }

        .providers-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
        @media (max-width: 650px) { .providers-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

        .provider-card { position: relative; background: #fcfaf7; border: 1px solid #e8dfd3; border-radius: 13px; padding: 12px; padding-right: 28px; display: flex; flex-direction: column; gap: 4px; cursor: pointer; transition: all 0.2s ease; overflow: hidden; box-sizing: border-box; }
        .provider-card:hover { border-color: #cbb9a3; background: #f5efe6; }
        .provider-card.selected { background: #faf4ed; border-color: #5d3513; box-shadow: 0 4px 12px rgba(93, 53, 19, 0.08); }

        .provider-card-top { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
        .provider-card-top strong { font-size: 11.5px; font-weight: 800; color: #2b1b12; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .provider-badge { font-size: 8px; font-weight: 800; background: #ebd8c5; color: #5d3513; padding: 2px 5px; border-radius: 4px; flex-shrink: 0; }
        .provider-tag { font-size: 9.5px; color: #7c6b5e; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .provider-selected-tick { position: absolute; top: 9px; right: 9px; width: 16px; height: 16px; border-radius: 50%; background: #5d3513; color: #fff; display: grid; place-items: center; }

        .meter-type-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: #f7f3ed; padding: 4px; border: 1px solid #e8dfd3; border-radius: 12px; box-sizing: border-box; }
        .toggle-btn { background: transparent; border: 0; padding: 8px; color: #7c6b5e; font-size: 11px; font-weight: 750; border-radius: 9px; cursor: pointer; transition: 0.2s; }
        .toggle-btn.active { background: #5d3513; color: #fff; box-shadow: 0 2px 8px rgba(93, 53, 19, 0.2); }

        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 11px; font-weight: 750; color: #2b1b12; }

        .bills-input-wrap { display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 46px; padding: 0 14px; border: 1px solid #e8dfd3; border-radius: 12px; background: #fcfaf7; transition: all .2s; box-sizing: border-box; }
        .bills-input-wrap:focus-within { border-color: #5d3513; box-shadow: 0 0 0 3px rgba(93, 53, 19, 0.1); background: #ffffff; }
        .bills-input-wrap input { width: 100%; border: 0; outline: 0; background: transparent; font-size: 12.5px; color: #2b1b12; box-sizing: border-box; }
        .bills-input-wrap input::placeholder { color: #a8988a; }

        .input-status-indicator { display: flex; align-items: center; justify-content: center; width: 20px; flex-shrink: 0; }
        .verified-icon-glow { color: #16a34a; }

        .amount-wrap span { font-size: 15px; font-weight: 850; color: #5d3513; }
        .amount-wrap input { font-size: 15px; font-weight: 800; color: #2b1b12; font-variant-numeric: tabular-nums; }

        .quick-amounts-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; margin-top: 2px; }
        @media (max-width: 600px) { .quick-amounts-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        .quick-chip { background: #f7f3ed; border: 1px solid #e8dfd3; border-radius: 9px; color: #6e594a; padding: 7px 4px; font-size: 10.5px; font-weight: 750; cursor: pointer; transition: 0.2s; text-align: center; box-sizing: border-box; font-variant-numeric: tabular-nums; }
        .quick-chip:hover { background: #efe7dc; color: #2b1b12; border-color: #cbb9a3; }
        .quick-chip.active { background: #5d3513; color: #fff; border-color: #5d3513; }

        .verification-success-text { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #16a34a; font-weight: 750; }
        .verification-error-text { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #dc2626; font-weight: 750; }

        .error-banner { display: flex; align-items: center; gap: 8px; background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 10px 14px; border-radius: 12px; font-size: 11.5px; font-weight: 750; box-sizing: border-box; }

        .pay-bill-btn { display: flex; align-items: center; justify-content: center; gap: 8px; height: 46px; border-radius: 12px; background: linear-gradient(135deg, #5d3513 0%, #3d210b 100%); color: #fff; font-size: 12.5px; font-weight: 800; cursor: pointer; transition: all .2s ease; border: 0; box-shadow: 0 6px 20px rgba(93, 53, 19, 0.22); margin-top: 4px; box-sizing: border-box; }
        .pay-bill-btn:hover:not(:disabled) { background: linear-gradient(135deg, #7c481e, #5d3513); transform: translateY(-1px); }
        .pay-bill-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .recent-bills-list { display: flex; flex-direction: column; gap: 8px; max-height: 440px; overflow-y: auto; }
        .empty-bills-state { text-align: center; padding: 26px 14px; color: #8c6f56; font-size: 11.5px; }
        .recent-bill-item { display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; border: 1px solid #e8dfd3; border-radius: 12px; background: #fcfaf7; transition: 0.2s; box-sizing: border-box; }
        .recent-bill-item:hover { border-color: #cbb9a3; background: #f7f3ed; }
        .recent-bill-main { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .bill-item-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .bill-item-info strong { font-size: 12px; color: #2b1b12; font-weight: 750; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .bill-item-info span { font-size: 10px; color: #7c6b5e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .bill-item-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
        .bill-item-right strong { font-size: 12px; color: #2b1b12; font-weight: 800; font-variant-numeric: tabular-nums; }
        .status-pill { font-size: 9px; font-weight: 750; padding: 2px 7px; border-radius: 5px; }
        .status-pill.success, .status-pill.Successful { color: #16a34a; background: #dcfce7; border: 1px solid #bbf7d0; }
        .status-pill.pending { color: #d97706; background: #fef3c7; }
        .status-pill.failed { color: #dc2626; background: #fee2e2; }

        .recent-bill-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; border-top: 1px dashed #e5ddd0; padding-top: 7px; }
        .tx-summary-btn, .tx-invoice-btn { display: inline-flex; align-items: center; gap: 4px; padding: 5px 8.5px; border-radius: 7.5px; font-size: 10px; font-weight: 750; cursor: pointer; transition: 0.15s; border: 1px solid #e5ddd0; }
        .tx-summary-btn { background: #fff; color: #374151; }
        .tx-summary-btn:hover, .tx-summary-btn.active { background: #fdf5ef; border-color: #5d3513; color: #5d3513; }
        .tx-invoice-btn { background: #fdf5ef; border-color: #e2cbb5; color: #5d3513; }
        .tx-invoice-btn:hover { background: #5d3513; border-color: #5d3513; color: #fff; }

        .tx-summary-collapse { display: grid; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows 0.25s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease; }
        .tx-summary-collapse.is-open { grid-template-rows: 1fr; opacity: 1; }
        .tx-summary-collapse-inner { overflow: hidden; }

        .tx-summary-box { background: #fff; border: 1px solid #e6ddd0; border-radius: 9px; padding: 8px 10px; display: flex; flex-direction: column; gap: 4px; }
        .tx-summary-top { display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #5d3513; }
        .tx-summary-top code { background: #faf8f5; border: 1px solid #ece6dc; padding: 1.5px 5px; border-radius: 5px; font-size: 9.5px; color: #374151; text-transform: none; }
        .tx-summary-box p { margin: 0; font-size: 10.5px; line-height: 1.45; color: #374151; }
        .tx-summary-box b { color: #111827; font-weight: 750; }
        .tx-summary-box code { background: #faf8f5; border: 1px solid #ece6dc; padding: 1px 4px; border-radius: 4px; font-size: 10px; color: #111827; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(43, 27, 18, 0.6); backdrop-filter: blur(8px); display: grid; place-items: center; z-index: 1000; padding: 16px; box-sizing: border-box; }
        .luxury-modal { background: #ffffff; border: 1px solid #e8dfd3; border-radius: 22px; width: 100%; max-width: 420px; max-height: 85vh; padding: 24px; box-shadow: 0 30px 70px rgba(43, 27, 18, 0.25); position: relative; display: flex; flex-direction: column; box-sizing: border-box; }
        .modal-scrollable-body { overflow-y: auto; max-height: calc(85vh - 90px); }

        .modal-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 16px; flex-shrink: 0; }
        .modal-kicker { font-size: 9px; font-weight: 800; color: #5d3513; letter-spacing: 1.2px; display: block; margin-bottom: 3px; }
        .modal-header h2 { margin: 0; font-size: 17px; font-weight: 800; color: #2b1b12; }
        .modal-close { background: #f7f3ed; border: 1px solid #e8dfd3; color: #2b1b12; width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center; cursor: pointer; transition: 0.2s; flex-shrink: 0; }
        .modal-close:hover { background: #efe7dc; }

        .success-state-container { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 8px 0; }
        .success-icon-glow-ring { width: 62px; height: 62px; border-radius: 50%; background: #dcfce7; border: 1px solid #bbf7d0; display: grid; place-items: center; margin-bottom: 14px; }
        .success-icon-inner { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #fff; display: grid; place-items: center; }
        .success-text-block h3 { margin: 0 0 4px; font-size: 17px; font-weight: 850; color: #2b1b12; }
        .success-text-block p { margin: 0; font-size: 11.5px; color: #7c6b5e; }
        .modal-tx-ref { display: inline-block; margin-top: 6px; font-family: monospace; font-size: 10px; color: #5d3513; background: #faf4ed; padding: 2px 7px; border-radius: 6px; }

        .vault-info-banner { display: flex; align-items: center; gap: 8px; background: #faf4ed; border: 1px solid #ebd8c5; padding: 10px 12px; border-radius: 11px; text-align: left; font-size: 10.5px; color: #6e594a; line-height: 1.35; margin-top: 12px; box-sizing: border-box; }
        .vault-info-banner .banner-ico { color: #5d3513; flex-shrink: 0; }

        .premium-btn { width: 100%; padding: 12px; margin-top: 14px; background: linear-gradient(135deg, #5d3513 0%, #3d210b 100%); color: #fff; font-weight: 800; border-radius: 12px; border: 0; cursor: pointer; font-size: 12.5px; box-shadow: 0 6px 20px rgba(93, 53, 19, 0.25); transition: all 0.2s ease; box-sizing: border-box; }
        .premium-btn:hover { background: linear-gradient(135deg, #7c481e, #5d3513); }

        @media (max-width: 768px) {
          .bills-page-container { gap: 8px; }
          .bills-banner { padding: 12px 13px; border-radius: 13px; gap: 10px; }
          .bills-banner-text h2 { font-size: 15px; }
          .banner-wallet-preview { padding: 8px 11px; border-radius: 10px; }
          .banner-wallet-preview small { font-size: 8px; }
          .banner-wallet-preview h3 { font-size: 13.5px; }

          .bills-stack-layout { gap: 8px; }
          .bills-form-card { padding: 12px; border-radius: 13px; gap: 11px; }
          .history-dropdown-card { padding: 10px 12px; border-radius: 13px; }
          .history-dropdown-trigger { font-size: 12px; }
          .section-heading h3 { font-size: 12px; }

          .category-tabs { gap: 5px; }
          .category-tab { padding: 6.5px 9px; font-size: 9.5px; border-radius: 9px; gap: 4px; }

          .providers-grid { gap: 6px; }
          .provider-card { padding: 8px 22px 8px 9px; border-radius: 10px; gap: 2px; }
          .provider-card-top strong { font-size: 10.5px; }
          .provider-badge { font-size: 7.5px; padding: 1.5px 4px; }
          .provider-tag { font-size: 8.5px; }
          .provider-selected-tick { width: 14px; height: 14px; top: 7px; right: 7px; }

          .meter-type-toggle { padding: 3px; border-radius: 10px; }
          .toggle-btn { padding: 6px; font-size: 9.5px; border-radius: 7px; }

          .form-group { gap: 4px; }
          .form-group label { font-size: 9.5px; }
          .bills-input-wrap { height: 36px; padding: 0 10px; border-radius: 9px; }
          .bills-input-wrap input { font-size: 11px; }
          .amount-wrap span, .amount-wrap input { font-size: 13px; }

          .quick-amounts-grid { gap: 5px; }
          .quick-chip { padding: 5px 3px; font-size: 9px; border-radius: 7px; }

          .pay-bill-btn { height: 38px; font-size: 11px; border-radius: 10px; margin-top: 2px; }

          .recent-bills-list { gap: 6px; max-height: 320px; }
          .recent-bill-item { padding: 8px 10px; border-radius: 10px; }
          .bill-item-info strong { font-size: 10.5px; }
          .bill-item-info span { font-size: 8.5px; }
          .bill-item-right strong { font-size: 10.5px; }
          .status-pill { font-size: 8px; padding: 1.5px 6px; }

          .luxury-modal { padding: 18px 16px; border-radius: 18px; }
        }
      `}</style>
    </div>
  );
}