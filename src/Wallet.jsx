// Wallet.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, Check, Copy, ArrowDownLeft, ArrowUpRight, Send, RefreshCcw, Search, ChevronDown, Activity, Sparkles, Coins, Eye, EyeOff, FileText, UserCheck, ShieldAlert, X, Download
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const CURRENCIES = {
  NGN: { symbol: "₦", rate: 1500, label: "NGN (₦)", name: "Nigerian Naira" },
  USD: { symbol: "$", rate: 1, label: "USD ($)", name: "US Dollar" },
  EUR: { symbol: "€", rate: 0.92, label: "EUR (€)", name: "Euro" },
  GBP: { symbol: "£", rate: 0.79, label: "GBP (£)", name: "British Pound" }
};

const WALLET_CACHE_KEY = "cardnext_wallet_cache";
const WALLET_UPDATED_EVENT = "cardnext:wallet-updated";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getTxKey(tx, idx) {
  return String(tx?.id ?? tx?.reference ?? `tx-${idx}`);
}

function formatTxLabel(tx) {
  const rawType = String(tx?.type || "transaction").toLowerCase();
  if (rawType === "bill_payment") {
    let meta = tx?.metadata;
    if (typeof meta === "string") {
      try {
        meta = JSON.parse(meta);
      } catch (_) {
        meta = {};
      }
    }
    const provider = meta?.provider ? String(meta.provider).toUpperCase() : "";
    const service = meta?.serviceType ? String(meta.serviceType).replace(/_/g, " ").toUpperCase() : "BILL PAYMENT";
    return provider ? `${provider} · ${service}` : service;
  }
  return rawType.replace(/_/g, " ").toUpperCase();
}

export default function WalletPage({ onAddMoney }) {
  const [userId, setUserId] = useState(() => localStorage.getItem("userId") || "1");

  const [balanceData, setBalanceData] = useState(() => {
    const cached = localStorage.getItem(WALLET_CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return parsed.balanceData || { walletBalance: 0, netWorthUSD: 0, liquidity: "₦0.00", accountNumber: null, accountName: "" };
      } catch {}
    }
    return { walletBalance: 0, netWorthUSD: 0, liquidity: "₦0.00", accountNumber: null, accountName: "" };
  });

  const [transactions, setTransactions] = useState(() => {
    const cached = localStorage.getItem(WALLET_CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed.transactions) ? parsed.transactions : [];
      } catch {}
    }
    return [];
  });

  const [provisioningAccount, setProvisioningAccount] = useState(false);

  const [isBalanceHidden, setIsBalanceHidden] = useState(() => {
    return localStorage.getItem("cardnext_balance_hidden") === "true";
  });

  const [animatingDrop, setAnimatingDrop] = useState(false);
  const [latestCreditNotification, setLatestCreditNotification] = useState(null);
  const balanceDataRef = useRef(balanceData);
  balanceDataRef.current = balanceData;
  const previousBalanceRef = useRef(Number(balanceData.walletBalance || 0));
  const transactionsRef = useRef(transactions);
  transactionsRef.current = transactions;
  const provisioningRef = useRef(false);
  provisioningRef.current = provisioningAccount;

  const [currentCurrency, setCurrentCurrency] = useState("NGN");
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const currencyDropdownRef = useRef(null);

  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [isClosingTopUpModal, setIsClosingTopUpModal] = useState(false);
  const [copiedAcc, setCopiedAcc] = useState(false);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [isClosingTransferModal, setIsClosingTransferModal] = useState(false);
  const [transferSuccessState, setTransferSuccessState] = useState(false);
  const [banks, setBanks] = useState([]);
  const [filteredBanks, setFilteredBanks] = useState([]);
  const [bankSearch, setBankSearch] = useState("");
  const [selectedBank, setSelectedBank] = useState(null);
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const bankDropdownRef = useRef(null);

  const [transferForm, setTransferForm] = useState({
    accountNumber: "",
    amount: "",
    narration: ""
  });
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [verifyingName, setVerifyingName] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [transferSuccess, setTransferSuccess] = useState("");

  const storageKeyBeneficiaries = `cardnext_saved_beneficiaries_${userId}`;
  const [savedBeneficiaries, setSavedBeneficiaries] = useState(() => {
    const activeId = localStorage.getItem("userId") || "1";
    const cached = localStorage.getItem(`cardnext_saved_beneficiaries_${activeId}`) || localStorage.getItem("cardnext_saved_beneficiaries");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed) ? parsed : [];
      } catch {}
    }
    return [];
  });

  const [selectedReceiptTx, setSelectedReceiptTx] = useState(null);
  const [openSummaryKey, setOpenSummaryKey] = useState(null);
  const [downloadedInvoiceRef, setDownloadedInvoiceRef] = useState("");

  const [showTsqModal, setShowTsqModal] = useState(false);
  const [tsqRef, setTsqRef] = useState("");
  const [tsqResult, setTsqResult] = useState(null);
  const [checkingTsq, setCheckingTsq] = useState(false);

  const broadcastWalletState = useCallback((nextBalData, nextTxs, extraDetail = {}) => {
    let existingCache = {};
    try {
      const raw = localStorage.getItem(WALLET_CACHE_KEY);
      if (raw) existingCache = JSON.parse(raw) || {};
    } catch {}

    const resolvedBal = nextBalData || existingCache.balanceData || balanceDataRef.current;
    const resolvedTxs = Array.isArray(nextTxs)
      ? nextTxs
      : (Array.isArray(existingCache.transactions) ? existingCache.transactions : transactionsRef.current);

    const payloadToStore = {
      ...existingCache,
      balanceData: resolvedBal,
      transactions: resolvedTxs,
      updatedAt: Date.now()
    };

    try {
      localStorage.setItem(WALLET_CACHE_KEY, JSON.stringify(payloadToStore));
    } catch {}

    window.dispatchEvent(
      new CustomEvent(WALLET_UPDATED_EVENT, {
        detail: {
          balanceData: resolvedBal,
          transactions: resolvedTxs,
          walletBalance: Number(resolvedBal?.walletBalance || 0),
          ...extraDetail
        }
      })
    );
  }, []);

  const closeTopUpModalSleekly = useCallback(() => {
    setIsClosingTopUpModal(true);
    setTimeout(() => {
      setShowTopUpModal(false);
      setIsClosingTopUpModal(false);
    }, 350);
  }, []);

  const closeTransferModalSleekly = useCallback(() => {
    setIsClosingTransferModal(true);
    setTimeout(() => {
      setShowTransferModal(false);
      setIsClosingTransferModal(false);
      setTransferSuccessState(false);
      setTransferSuccess("");
      setTransferForm({ accountNumber: "", amount: "", narration: "" });
      setSelectedBank(null);
      setBeneficiaryName("");
      setTransferError("");
    }, 350);
  }, []);

  const triggerWaterDropAnimation = useCallback((amountAdded) => {
    setAnimatingDrop(true);
    setLatestCreditNotification(`+₦${Number(amountAdded).toLocaleString()} Received!`);
    setTimeout(() => {
      setAnimatingDrop(false);
    }, 3500);
  }, []);

  const provisionVirtualAccountQuietly = useCallback(async (targetUserId, currentBal, currentTxs) => {
    setProvisioningAccount(true);
    try {
      const res = await fetch(`${API_BASE}/api/wallet/virtual-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: Number(targetUserId) })
      });
      const data = await res.json();
      if (data?.success) {
        const updatedBal = {
          ...currentBal,
          accountNumber: data.accountNumber,
          accountName: data.accountName
        };
        setBalanceData(updatedBal);
        broadcastWalletState(updatedBal, currentTxs);
      }
    } catch (err) {
      console.error("Quiet virtual account error:", err);
    } finally {
      setProvisioningAccount(false);
    }
  }, [broadcastWalletState]);

  const fetchWalletData = useCallback(async (targetUserId, isInitial = false) => {
    const activeId = targetUserId || localStorage.getItem("userId") || userId;
    if (!activeId) return;

    try {
      try {
        await fetch(`${API_BASE}/api/wallet/sync-dva`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: Number(activeId) })
        });
      } catch {}

      const [balRes, txRes] = await Promise.all([
        fetch(`${API_BASE}/api/wallet/balance/${activeId}`),
        fetch(`${API_BASE}/api/wallet/transactions/${activeId}`)
      ]);
      const balData = await balRes.json();
      const txData = await txRes.json();

      if (balData?.success) {
        const newBal = Number(balData.walletBalance || 0);
        const oldBal = Number(previousBalanceRef.current || 0);

        if (!isInitial && newBal > oldBal) {
          const diff = newBal - oldBal;
          triggerWaterDropAnimation(diff);
          closeTopUpModalSleekly();
        }

        previousBalanceRef.current = newBal;
        setBalanceData(balData);

        let newTransactions = transactionsRef.current;
        if (txData?.success && Array.isArray(txData.transactions)) {
          newTransactions = txData.transactions;
          setTransactions(newTransactions);
        }

        broadcastWalletState(balData, newTransactions);

        if (!balData.accountNumber && !provisioningRef.current) {
          provisionVirtualAccountQuietly(activeId, balData, newTransactions);
        }
      }
    } catch (err) {
      console.error("Error fetching wallet data:", err);
    }
  }, [userId, triggerWaterDropAnimation, closeTopUpModalSleekly, broadcastWalletState, provisionVirtualAccountQuietly]);

  const loadCachedOrFetchBanks = useCallback(async () => {
    const cachedBanks = localStorage.getItem("cardnext_banks_cache");
    if (cachedBanks) {
      try {
        const parsed = JSON.parse(cachedBanks);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBanks(parsed);
          setFilteredBanks(parsed);
        }
      } catch {}
    }

    try {
      const res = await fetch(`${API_BASE}/api/wallet/banks`);
      const data = await res.json();
      if (data?.success) {
        const list = data.banks || data.data?.Banks || data.data?.banks || data.data || [];
        if (Array.isArray(list) && list.length > 0) {
          const formatted = list.map(b => ({
            bankName: b.bankName || b.BankName || b.name || b.bank_name || b.Bank || "Unknown Bank",
            bankCode: b.bankCode || b.BankCode || b.code || b.bank_code || b.Code || ""
          })).filter(b => b.bankCode);

          setBanks(formatted);
          setFilteredBanks(formatted);
          localStorage.setItem("cardnext_banks_cache", JSON.stringify(formatted));
        }
      }
    } catch (err) {
      console.error("Failed to load background banks:", err);
    }
  }, []);

  useEffect(() => {
    const activeUserId = localStorage.getItem("userId") || "1";
    setUserId(activeUserId);

    fetchWalletData(activeUserId, true);
    loadCachedOrFetchBanks();

    const applyExternalWalletUpdate = (detail) => {
      const nextBalObj = detail?.balanceData || (
        typeof detail?.walletBalance === "number"
          ? {
              ...balanceDataRef.current,
              walletBalance: detail.walletBalance,
              netWorthUSD: detail.walletBalance / 1500,
              liquidity: `₦${Number(detail.walletBalance).toLocaleString()}`
            }
          : null
      );

      if (nextBalObj && typeof nextBalObj.walletBalance !== "undefined") {
        const nextNumericBal = Number(nextBalObj.walletBalance || 0);
        const prevNumericBal = Number(previousBalanceRef.current || 0);
        if (nextNumericBal > prevNumericBal && prevNumericBal > 0) {
          triggerWaterDropAnimation(nextNumericBal - prevNumericBal);
          closeTopUpModalSleekly();
        }
        previousBalanceRef.current = nextNumericBal;
        setBalanceData(prev => ({ ...prev, ...nextBalObj }));
      }

      if (Array.isArray(detail?.transactions)) {
        setTransactions(detail.transactions);
      }
    };

    const handleWalletUpdatedEvent = (event) => {
      applyExternalWalletUpdate(event?.detail || {});
      fetchWalletData(localStorage.getItem("userId") || "1", false);
    };

    const handleStorageEvent = (event) => {
      if (event.key === WALLET_CACHE_KEY && event.newValue) {
        try {
          applyExternalWalletUpdate(JSON.parse(event.newValue));
        } catch {}
      } else if (event.key === "userId" && event.newValue) {
        setUserId(event.newValue);
        fetchWalletData(event.newValue, true);
      }
    };

    const pollInterval = setInterval(() => {
      const currentActiveId = localStorage.getItem("userId") || "1";
      setUserId(currentActiveId);
      fetchWalletData(currentActiveId, false);
    }, 6000);

    const handleFocus = () => {
      const currentActiveId = localStorage.getItem("userId") || "1";
      setUserId(currentActiveId);
      fetchWalletData(currentActiveId, false);
    };

    window.addEventListener(WALLET_UPDATED_EVENT, handleWalletUpdatedEvent);
    window.addEventListener("storage", handleStorageEvent);
    window.addEventListener("focus", handleFocus);

    const handleClickOutside = (event) => {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target)) {
        setIsCurrencyDropdownOpen(false);
      }
      if (bankDropdownRef.current && !bankDropdownRef.current.contains(event.target)) {
        setIsBankDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener(WALLET_UPDATED_EVENT, handleWalletUpdatedEvent);
      window.removeEventListener("storage", handleStorageEvent);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [fetchWalletData, loadCachedOrFetchBanks, triggerWaterDropAnimation, closeTopUpModalSleekly]);

  const togglePrivacyMode = () => {
    const nextVal = !isBalanceHidden;
    setIsBalanceHidden(nextVal);
    localStorage.setItem("cardnext_balance_hidden", String(nextVal));
  };

  const formatCurrencyValue = useCallback((amountInNGN, ignorePrivacy = false) => {
    if (isBalanceHidden && !ignorePrivacy) return "••••••••";
    const numericNGN = Number(amountInNGN || 0);
    const curr = CURRENCIES[currentCurrency] || CURRENCIES.NGN;
    const amountInUSD = numericNGN / CURRENCIES.NGN.rate;
    const converted = amountInUSD * curr.rate;
    return `${curr.symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [currentCurrency, isBalanceHidden]);

  const handleBankSearch = (query) => {
    setBankSearch(query);
    if (!query.trim()) {
      setFilteredBanks(banks);
    } else {
      const filtered = banks.filter(b =>
        (b.bankName || "").toLowerCase().includes(query.toLowerCase())
      );
      setFilteredBanks(filtered);
    }
  };

  const verifyAccount = async (accNum, bCode) => {
    setVerifyingName(true);
    setTransferError("");
    setBeneficiaryName("");

    try {
      const res = await fetch(`${API_BASE}/api/wallet/name-enquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountNumber: accNum, bankCode: bCode })
      });
      const data = await res.json();
      if (data?.success) {
        const name = data.beneficiaryName || data.data?.beneficiaryName || data.data?.accountName || data.data?.AccountName || data.data?.name;
        if (name) {
          setBeneficiaryName(name);
        } else {
          setTransferError("We couldn't verify this account name. Please check the account number and bank.");
        }
      } else {
        const rawMsg = data?.message || "";
        if (rawMsg.toLowerCase().includes("name enquiry") || rawMsg.toLowerCase().includes("not satisfied")) {
          setTransferError("We couldn't find an account with that number at this bank. Please double-check the digits.");
        } else {
          setTransferError(rawMsg || "Unable to verify account. Please check the details.");
        }
      }
    } catch {
      setTransferError("Network issue while verifying account. Please try again.");
    } finally {
      setVerifyingName(false);
    }
  };

  const selectBank = (bank) => {
    if (selectedBank?.bankCode !== bank.bankCode) {
      setBeneficiaryName("");
    }
    setSelectedBank(bank);
    setIsBankDropdownOpen(false);
    setBankSearch("");
    setFilteredBanks(banks);

    if (transferForm.accountNumber.length === 10) {
      verifyAccount(transferForm.accountNumber, bank.bankCode);
    }
  };

  const handleAccountNumberChange = async (rawAccNum) => {
    const accNum = rawAccNum.replace(/\D/g, "").slice(0, 10);
    setTransferForm(prev => ({ ...prev, accountNumber: accNum }));
    setBeneficiaryName("");
    setTransferError("");

    if (accNum.length === 10) {
      const matchedBen = savedBeneficiaries.find(
        b => b.accountNumber === accNum && (!selectedBank || b.bank?.bankCode === selectedBank.bankCode)
      );

      if (matchedBen) {
        setSelectedBank(matchedBen.bank);
        setBeneficiaryName(matchedBen.beneficiaryName);
        return;
      }

      if (selectedBank) {
        verifyAccount(accNum, selectedBank.bankCode);
      }
    }
  };

  const saveBeneficiaryToList = (accNum, bName, bankObj) => {
    if (!accNum || !bName || !bankObj) return;
    const existing = savedBeneficiaries.filter(
      b => !(b.accountNumber === accNum && b.bank?.bankCode === bankObj.bankCode)
    );
    const updated = [
      { accountNumber: accNum, beneficiaryName: bName, bank: bankObj, lastUsed: Date.now() },
      ...existing
    ].slice(0, 6);
    setSavedBeneficiaries(updated);
    localStorage.setItem(storageKeyBeneficiaries, JSON.stringify(updated));
  };

  const removeSavedBeneficiary = (e, accNum, bankCode) => {
    e.stopPropagation();
    const updated = savedBeneficiaries.filter(
      b => !(b.accountNumber === accNum && b.bank?.bankCode === bankCode)
    );
    setSavedBeneficiaries(updated);
    localStorage.setItem(storageKeyBeneficiaries, JSON.stringify(updated));
  };

  const handleQuickSelectBeneficiary = (ben) => {
    setSelectedBank(ben.bank);
    setTransferForm(prev => ({ ...prev, accountNumber: ben.accountNumber }));
    setBeneficiaryName(ben.beneficiaryName);
    setTransferError("");
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setTransferError("");
    setTransferSuccess("");

    const transferAmt = Number(transferForm.amount);
    if (!transferForm.accountNumber || !selectedBank || !transferAmt || transferAmt <= 0) {
      setTransferError("Please fill in all required transfer fields and select a bank.");
      return;
    }

    if (transferAmt > Number(balanceData.walletBalance || 0)) {
      setTransferError("Insufficient wallet balance for this transfer amount.");
      return;
    }

    setTransferring(true);
    try {
      const res = await fetch(`${API_BASE}/api/wallet/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: Number(userId),
          beneficiaryAccount: transferForm.accountNumber,
          beneficiaryBankCode: selectedBank.bankCode,
          amountInNaira: transferAmt,
          beneficiaryName: beneficiaryName || "Verified Recipient",
          narration: transferForm.narration || "CardNext Payout"
        })
      });
      const data = await res.json();

      if (data?.success) {
        saveBeneficiaryToList(transferForm.accountNumber, beneficiaryName, selectedBank);
        const resolvedRecipient = beneficiaryName || "Verified Recipient";
        setTransferSuccess(`Successfully sent ₦${transferAmt.toLocaleString()} to ${resolvedRecipient}`);
        setTransferSuccessState(true);

        const nextNumericBal = typeof data.newBalance === "number"
          ? Number(data.newBalance)
          : Math.max(0, Number(balanceDataRef.current.walletBalance || 0) - transferAmt);

        const optimisticBal = {
          ...balanceDataRef.current,
          walletBalance: nextNumericBal,
          netWorthUSD: nextNumericBal / 1500,
          liquidity: `₦${nextNumericBal.toLocaleString()}`
        };

        const optimisticTx = {
          id: data.requestRef || `tf_${Date.now()}`,
          reference: data.requestRef || `tf_${Date.now()}`,
          type: "transfer",
          amount: transferAmt,
          currency: "NGN",
          status: "success",
          created_at: new Date().toISOString()
        };

        const optimisticTxs = [optimisticTx, ...transactionsRef.current];
        previousBalanceRef.current = nextNumericBal;
        setBalanceData(optimisticBal);
        setTransactions(optimisticTxs);
        broadcastWalletState(optimisticBal, optimisticTxs, {
          action: "transfer",
          amount: transferAmt
        });

        fetchWalletData(userId, false);
        if (typeof onAddMoney === "function") {
          onAddMoney(transferAmt);
        }

        setTimeout(() => {
          closeTransferModalSleekly();
        }, 1600);
      } else {
        setTransferError(data?.message || "Transfer failed.");
      }
    } catch {
      setTransferError("Server error during fund transfer.");
    } finally {
      setTransferring(false);
    }
  };

  const handleTsqCheck = async (e) => {
    e.preventDefault();
    if (!tsqRef) return;
    setCheckingTsq(true);
    setTsqResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/wallet/tsq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalRequestRef: tsqRef })
      });
      const data = await res.json();
      setTsqResult(data);
    } catch {
      setTsqResult({ success: false, message: "Network error checking transaction status." });
    } finally {
      setCheckingTsq(false);
    }
  };

  const handleCopy = async (text, type = "card") => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
    if (type === "acc") {
      setCopiedAcc(true);
      setTimeout(() => setCopiedAcc(false), 2000);
    }
  };

  const isCreditTx = (type) => ["deposit", "credit", "bank_deposit"].includes(type);

  const handleDownloadCardNextInvoice = useCallback((tx) => {
    if (!tx) return;

    const refCode = String(tx.reference || tx.id || `CNX-${Date.now()}`);
    const safeRefFilename = refCode.replace(/[^a-zA-Z0-9_-]/g, "_");
    const isCredit = isCreditTx(tx.type);
    const txTypeLabel = formatTxLabel(tx);
    const formattedAmount = `${isCredit ? "+" : "-"}${formatCurrencyValue(Number(tx.amount), true)}`;
    const txDateString = new Date(tx.created_at || Date.now()).toLocaleString();
    const statusLabel = (tx.status || "SUCCESSFUL").toUpperCase();
    const holderName = balanceData.accountName || `CardNEXT User #${userId}`;
    const accountLine = balanceData.accountNumber
      ? `Kuda Bank · ${balanceData.accountNumber}`
      : "CardNEXT Wallet Ledger";

    const invoiceHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CardNEXT Invoice - ${escapeHtml(refCode)}</title>
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
      color: ${isCredit ? "#059669" : "#111827"};
    }
    .status-pill {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 12px;
      border-radius: 999px;
      background: #d1fae5;
      color: #065f46;
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
      background: #19110d;
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
        <div class="brand-sub">Official Wallet &amp; Banking Receipt</div>
      </div>
      <div class="invoice-tag">
        <span>Verified Receipt</span>
        <p>${escapeHtml(refCode)}</p>
      </div>
    </div>

    <div class="invoice-body">
      <div class="amount-banner">
        <div class="amount-label">Settled Amount (${escapeHtml(currentCurrency)})</div>
        <div class="amount-value">${escapeHtml(formattedAmount)}</div>
        <div class="status-pill">${escapeHtml(statusLabel)}</div>
      </div>

      <table class="meta-table">
        <tr>
          <td class="meta-key">Transaction Type</td>
          <td class="meta-val">${escapeHtml(txTypeLabel)}</td>
        </tr>
        <tr>
          <td class="meta-key">Reference ID</td>
          <td class="meta-val mono">${escapeHtml(refCode)}</td>
        </tr>
        <tr>
          <td class="meta-key">Date &amp; Time</td>
          <td class="meta-val">${escapeHtml(txDateString)}</td>
        </tr>
        <tr>
          <td class="meta-key">Account Holder</td>
          <td class="meta-val">${escapeHtml(holderName)}</td>
        </tr>
        <tr>
          <td class="meta-key">Wallet / Rail</td>
          <td class="meta-val">${escapeHtml(accountLine)}</td>
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
      link.download = `CardNEXT-Invoice-${safeRefFilename}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("Failed to download CardNEXT invoice:", err);
    }

    setDownloadedInvoiceRef(refCode);
    setTimeout(() => {
      setDownloadedInvoiceRef(prev => (prev === refCode ? "" : prev));
    }, 2500);
  }, [balanceData.accountName, balanceData.accountNumber, currentCurrency, formatCurrencyValue, userId]);

  return (
    <div className="elite-wallet-wrapper">
      <style>{`
        .elite-wallet-wrapper {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 24px;
          font-family: inherit;
          overflow: visible;
        }

        .elite-top-full {
          width: 100%;
          position: relative;
          z-index: 60;
          overflow: visible;
        }

        .wallet-hero-pane {
          padding: 32px 34px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border-radius: 18px;
          background: linear-gradient(135deg, #ffffff 0%, #fcfbf9 100%);
          color: #202633;
          box-shadow: 0 12px 32px rgba(45, 33, 20, 0.05);
          border: 1px solid #e6e1d7;
          position: relative;
        }

        .wallet-hero-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }

        .wallet-rail-label-row {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .wallet-rail-kicker {
          font-size: 10px;
          color: #713b17;
          font-weight: 800;
          letter-spacing: 1.3px;
          text-transform: uppercase;
          background: #f6efe6;
          border: 1px solid #e6d8c6;
          padding: 4px 10px;
          border-radius: 999px;
        }

        .wallet-eye-toggle {
          background: #faf9f6;
          border: 1px solid #e9e7e2;
          border-radius: 8px;
          cursor: pointer;
          color: #555b63;
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .wallet-eye-toggle:hover {
          background: #f3efe8;
          color: #713b17;
        }

        .wallet-balance-hero-wrap {
          margin: 18px 0 10px;
          padding-bottom: 14px;
          border-bottom: 1px solid #f0ece4;
        }

        .wallet-meta-badges {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .wallet-meta-badge {
          font-size: 11.5px;
          color: #5a606a;
          font-weight: 650;
          background: #faf9f6;
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid #e9e7e2;
        }

        .wallet-meta-badge.gold {
          color: #713b17;
          background: #fcfaf6;
          border: 1px solid #e7dfd1;
          font-weight: 700;
        }

        .wallet-actions-row {
          display: flex;
          gap: 10px;
          margin-top: 22px;
          flex-wrap: wrap;
        }

        .elite-action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 10px 16px;
          border-radius: 11px;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
          white-space: nowrap;
        }

        .elite-action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
        }

        .elite-action-btn.primary {
          background: #713b17;
          color: #fff;
          box-shadow: 0 4px 12px rgba(113, 59, 23, 0.18);
        }
        .elite-action-btn.primary:hover {
          background: #542a12;
        }

        .elite-action-btn.dark {
          background: #202633;
          color: #fff;
        }

        .elite-action-btn.light {
          background: #faf9f6;
          color: #713b17;
          border: 1px solid #e9e7e2;
        }

        .elite-action-btn.glass-send {
          background: #f6efe6;
          border: 1px solid #e5d8c7;
          color: #713b17;
        }

        .elite-action-btn.glass-tsq {
          background: #faf9f6;
          color: #4b5563;
          border: 1px solid #e9e7e2;
        }

        .wallet-ledger-card {
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding: 28px;
          border-radius: 16px;
          border: 1px solid #e9e7e2;
          background: #fff;
          box-shadow: 0 7px 24px rgba(37, 30, 22, 0.035);
        }

        .wallet-ledger-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .wallet-ledger-title {
          font-size: 16px;
          font-weight: 800;
          color: #202633;
          margin: 0;
        }

        .wallet-ledger-sub {
          font-size: 11px;
          color: #858b95;
          margin: 2px 0 0;
        }

        .wallet-ledger-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 380px;
          overflow-y: auto;
        }

        .wallet-tx-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 14px 16px;
          background: #faf9f6;
          border-radius: 12px;
          border: 1px solid #f0ece6;
          transition: background 0.15s;
        }

        .wallet-tx-item:hover {
          background: #f5f1ea;
        }

        .wallet-tx-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }

        .wallet-tx-left {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
          flex: 1;
        }

        .wallet-tx-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .wallet-tx-icon.credit {
          background: #e9f8f0;
          color: #139768;
        }

        .wallet-tx-icon.debit {
          background: #fff0ed;
          color: #d7655e;
        }

        .wallet-tx-meta {
          min-width: 0;
        }

        .wallet-tx-type {
          font-size: 13px;
          display: block;
          color: #202633;
          font-weight: 700;
        }

        .wallet-tx-sub {
          font-size: 11px;
          color: #858b95;
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .wallet-tx-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .wallet-tx-amount {
          font-size: 13px;
          font-weight: 750;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }

        .wallet-tx-amount.credit {
          color: #139768;
        }

        .wallet-tx-amount.debit {
          color: #202633;
        }

        .wallet-tx-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          border-top: 1px dashed #e6e0d6;
          padding-top: 8px;
        }

        .wallet-tx-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 9px;
          border-radius: 8px;
          font-size: 10.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid #e5dfd5;
        }

        .wallet-tx-action-btn.summary {
          background: #ffffff;
          color: #374151;
        }

        .wallet-tx-action-btn.summary:hover,
        .wallet-tx-action-btn.summary.active {
          background: #fdf5ef;
          border-color: #713b17;
          color: #713b17;
        }

        .wallet-tx-action-btn.invoice {
          background: #f6efe6;
          border-color: #e2cbb5;
          color: #713b17;
        }

        .wallet-tx-action-btn.invoice:hover {
          background: #713b17;
          border-color: #713b17;
          color: #ffffff;
        }

        .wallet-tx-summary-box {
          background: #ffffff;
          border: 1px solid #e6e0d6;
          border-radius: 10px;
          padding: 9px 11px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .wallet-tx-summary-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          font-size: 9.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #713b17;
        }

        .wallet-tx-summary-top code {
          background: #faf8f5;
          border: 1px solid #ece6dc;
          padding: 1.5px 6px;
          border-radius: 5px;
          font-size: 10px;
          color: #374151;
          text-transform: none;
        }

        .wallet-tx-summary-box p {
          margin: 0;
          font-size: 11px;
          line-height: 1.45;
          color: #374151;
        }

        .wallet-tx-summary-box b {
          color: #111827;
          font-weight: 750;
        }

        @keyframes cardNextBrownGlow {
          0%, 100% {
            text-shadow:
              0 0 8px rgba(113, 59, 23, 0.24),
              0 0 18px rgba(140, 82, 43, 0.14);
          }
          50% {
            text-shadow:
              0 0 14px rgba(113, 59, 23, 0.46),
              0 0 28px rgba(140, 82, 43, 0.28);
          }
        }

        .wallet-dashboard-balance-num {
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: clamp(32px, 3.6vw, 44px);
          font-weight: 900;
          letter-spacing: -1.1px;
          line-height: 1.04;
          color: #713b17;
          margin: 0;
          font-variant-numeric: tabular-nums lining-nums;
          display: inline-block;
          animation: cardNextBrownGlow 2.8s ease-in-out infinite;
        }

        .water-drop-card {
          position: relative;
          overflow: visible;
          transition: border-color 0.4s ease, box-shadow 0.4s ease;
          animation: cardHeroEntry 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .water-drop-card-bg {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }

        .water-drop-card-content {
          position: relative;
          z-index: 2;
        }

        @keyframes cardHeroEntry {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .water-drop-card.dropping {
          border-color: #139768 !important;
          box-shadow: 0 0 28px rgba(19, 151, 104, 0.28), 0 14px 32px rgba(45, 33, 20, 0.08) !important;
        }

        .elite-ambient-glow {
          position: absolute;
          top: -60px;
          right: -60px;
          width: 220px;
          height: 220px;
          background: radial-gradient(circle, rgba(113, 59, 23, 0.14) 0%, rgba(243, 199, 124, 0.12) 45%, transparent 72%);
          border-radius: 50%;
          pointer-events: none;
          animation: ambientPulse 4s ease-in-out infinite alternate;
        }

        @keyframes ambientPulse {
          0% { transform: scale(0.95); opacity: 0.7; }
          100% { transform: scale(1.15); opacity: 1; }
        }

        .water-ripple-effect {
          position: absolute;
          top: 30px;
          right: 60px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(19, 151, 104, 0.7);
          box-shadow: 0 0 0 0 rgba(19, 151, 104, 0.5);
          pointer-events: none;
          z-index: 10;
        }

        .water-drop-card.dropping .water-ripple-effect {
          animation: waterRippleExpand 1.6s cubic-bezier(0, 0.2, 0.8, 1) forwards;
        }

        @keyframes waterRippleExpand {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(19, 151, 104, 0.65), 0 0 0 0 rgba(19, 151, 104, 0.4);
            opacity: 1;
          }
          50% { opacity: 0.8; }
          100% {
            transform: scale(45);
            box-shadow: 0 0 0 40px rgba(19, 151, 104, 0), 0 0 0 80px rgba(19, 151, 104, 0);
            opacity: 0;
          }
        }

        .floating-credit-pill {
          position: absolute;
          top: 18px;
          right: 22px;
          background: linear-gradient(135deg, #139768 0%, #059669 100%);
          color: #fff;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 800;
          box-shadow: 0 10px 25px rgba(19, 151, 104, 0.3);
          z-index: 20;
          display: flex;
          align-items: center;
          gap: 6px;
          animation: floatPillIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        @keyframes floatPillIn {
          from { opacity: 0; transform: translateY(-15px) scale(0.8); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .success-checkmark-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 26px 10px;
          text-align: center;
          animation: successFadeIn 0.35s ease-out;
        }

        .success-circle-icon {
          width: 68px;
          height: 68px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: #fff;
          box-shadow: 0 15px 30px rgba(16, 185, 129, 0.35);
          animation: successPulsePop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          margin-bottom: 18px;
        }

        @keyframes successPulsePop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes successFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .elite-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(23, 19, 15, 0.65);
          backdrop-filter: blur(6px);
          display: grid;
          place-items: center;
          z-index: 1000;
          padding: 16px;
          animation: fadeIn 0.25s ease-out;
        }

        .elite-modal-overlay.closing {
          animation: fadeOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .elite-modal {
          background: #fff;
          border-radius: 20px;
          padding: 28px;
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.22);
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .elite-modal-overlay.closing .elite-modal {
          animation: scaleDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.92) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes scaleDown { from { opacity: 1; transform: scale(1) translateY(0); } to { opacity: 0; transform: scale(0.92) translateY(10px); } }

        .custom-dropdown-container {
          position: relative;
          user-select: none;
          z-index: 300;
        }
        .currency-dropdown-toggle {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 11px;
          background: #faf9f6;
          border: 1px solid #e9e7e2;
          border-radius: 10px;
          font-size: 11px;
          color: #333842;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .currency-dropdown-toggle:hover, .currency-dropdown-toggle.open {
          border-color: #d6c8b6;
          background: #f3efe8;
          color: #713b17;
        }
        .chevron-icon {
          transition: transform 0.2s ease;
          color: #6b7280;
        }
        .chevron-icon.rotate {
          transform: rotate(180deg);
          color: #713b17;
        }

        .currency-dropdown-menu {
          position: absolute;
          right: 0;
          top: calc(100% + 10px);
          width: min(230px, calc(100vw - 32px));
          background: #ffffff;
          border: 1px solid #dfd7cb;
          border-radius: 14px;
          box-shadow: 0 20px 48px rgba(37, 30, 22, 0.16);
          z-index: 9999;
          overflow: visible;
          animation: fadeInMenu 0.18s ease-out;
        }
        @keyframes fadeInMenu { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }

        .dropdown-menu-header {
          padding: 10px 14px;
          font-size: 9.5px;
          font-weight: 800;
          color: #858b95;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          border-bottom: 1px solid #f0ece4;
          background: #faf9f6;
          border-radius: 14px 14px 0 0;
        }
        .currency-dropdown-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          cursor: pointer;
          transition: background 0.15s;
          border-bottom: 1px solid #f5f2ec;
        }
        .currency-dropdown-item:last-child { border-bottom: 0; border-radius: 0 0 14px 14px; }
        .currency-dropdown-item:hover { background: #faf8f4; }
        .currency-dropdown-item.selected { background: #f6efe6; }

        .currency-info-meta { display: flex; flex-direction: column; gap: 1px; }
        .currency-info-meta strong { font-size: 12px; color: #202633; font-weight: 750; }
        .currency-info-meta span { font-size: 10px; color: #858b95; font-weight: 500; }
        .currency-symbol-tag { font-size: 11.5px; font-weight: 800; color: #713b17; background: #f6efe6; padding: 2px 8px; border-radius: 6px; }

        .ben-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: #f3f0ea;
          border: 1px solid #e5e0d8;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          color: #1f2937;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }
        .ben-chip:hover {
          background: #e8e2d8;
          border-color: #d4cdc2;
        }
        .ben-chip.active {
          background: #d1fae5;
          border-color: #34d399;
          color: #065f46;
        }
        .ben-chip-remove {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.08);
          color: #4b5563;
          margin-left: 2px;
        }
        .ben-chip-remove:hover {
          background: #ef4444;
          color: #fff;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @media (max-width: 768px) {
          .elite-wallet-wrapper {
            gap: 8px;
          }

          .wallet-hero-pane {
            padding: 13px 13px 12px;
            border-radius: 14px;
          }

          .wallet-rail-kicker {
            font-size: 7.5px;
            letter-spacing: 0.9px;
            padding: 3px 8px;
          }

          .wallet-eye-toggle {
            width: 24px;
            height: 24px;
            border-radius: 6px;
          }

          .currency-dropdown-toggle {
            padding: 3.5px 7px;
            border-radius: 7px;
            font-size: 9px;
            gap: 4px;
          }

          .wallet-balance-hero-wrap {
            margin: 10px 0 7px;
            padding-bottom: 9px;
          }

          .wallet-dashboard-balance-num {
            font-size: clamp(27px, 8vw, 35px);
            font-weight: 900;
            letter-spacing: -0.9px;
            line-height: 1.02;
          }

          .wallet-meta-badge {
            font-size: 8.5px;
            padding: 2.5px 7px;
            border-radius: 6px;
          }

          .wallet-actions-row {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 5px;
            margin-top: 11px;
          }

          .elite-action-btn {
            padding: 7px 6px;
            border-radius: 9px;
            font-size: 9.5px;
            gap: 4px;
            width: 100%;
          }

          .wallet-ledger-card {
            padding: 11px;
            border-radius: 13px;
            gap: 9px;
          }

          .wallet-ledger-header {
            flex-wrap: wrap;
            gap: 6px;
          }

          .wallet-ledger-title {
            font-size: 12px;
          }

          .wallet-ledger-sub {
            font-size: 8.5px;
          }

          .wallet-ledger-list {
            gap: 6px;
            max-height: 280px;
          }

          .wallet-tx-item {
            padding: 8px 10px;
            border-radius: 10px;
            gap: 6px;
          }

          .wallet-tx-row {
            gap: 8px;
          }

          .wallet-tx-left {
            gap: 8px;
          }

          .wallet-tx-icon {
            width: 28px;
            height: 28px;
            border-radius: 8px;
          }

          .wallet-tx-type {
            font-size: 10.5px;
          }

          .wallet-tx-sub {
            font-size: 8.5px;
          }

          .wallet-tx-right {
            gap: 6px;
          }

          .wallet-tx-amount {
            font-size: 10.5px;
          }

          .elite-modal {
            padding: 18px 16px;
            border-radius: 16px;
          }
        }
      `}</style>

      <div className="elite-top-full">
        <div className={`water-drop-card wallet-hero-pane ${animatingDrop ? "dropping" : ""}`}>
          <div className="water-drop-card-bg" aria-hidden="true">
            <div className="water-ripple-effect" />
            <div className="elite-ambient-glow" />
          </div>

          {animatingDrop && (
            <div className="floating-credit-pill">
              <Sparkles size={14} /> {latestCreditNotification}
            </div>
          )}

          <div className="water-drop-card-content">
            <div className="wallet-hero-top">
              <div className="wallet-rail-label-row">
                <span className="wallet-rail-kicker">TOTAL LIQUIDITY · {currentCurrency}</span>
                <button
                  type="button"
                  onClick={togglePrivacyMode}
                  title={isBalanceHidden ? "Show Balance" : "Hide Balance"}
                  aria-label={isBalanceHidden ? "Show Balance" : "Hide Balance"}
                  className="wallet-eye-toggle"
                >
                  {isBalanceHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              <div className="custom-dropdown-container" ref={currencyDropdownRef}>
                <button
                  type="button"
                  className={`currency-dropdown-toggle ${isCurrencyDropdownOpen ? "open" : ""}`}
                  onClick={() => setIsCurrencyDropdownOpen(v => !v)}
                >
                  <Coins size={13} />
                  <span>{currentCurrency} ({CURRENCIES[currentCurrency].symbol})</span>
                  <ChevronDown size={12} className={`chevron-icon ${isCurrencyDropdownOpen ? "rotate" : ""}`} />
                </button>

                {isCurrencyDropdownOpen && (
                  <div className="currency-dropdown-menu">
                    <div className="dropdown-menu-header">Select Currency</div>
                    {Object.keys(CURRENCIES).map(code => {
                      const curr = CURRENCIES[code];
                      const isSelected = currentCurrency === code;
                      return (
                        <div
                          key={code}
                          role="button"
                          tabIndex={0}
                          className={`currency-dropdown-item ${isSelected ? "selected" : ""}`}
                          onClick={() => {
                            setCurrentCurrency(code);
                            setIsCurrencyDropdownOpen(false);
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setCurrentCurrency(code);
                              setIsCurrencyDropdownOpen(false);
                            }
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
            </div>

            <div className="wallet-balance-hero-wrap">
              <h3 className="wallet-dashboard-balance-num">
                {formatCurrencyValue(balanceData.walletBalance)}
              </h3>
            </div>

            <div className="wallet-meta-badges">
              <span className="wallet-meta-badge">
                ≈ {isBalanceHidden ? "$••••" : `$${Number(balanceData.netWorthUSD || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} USD
              </span>
              {balanceData.accountNumber && (
                <span className="wallet-meta-badge gold">
                  Kuda Bank · {balanceData.accountNumber}
                </span>
              )}
            </div>

            <div className="wallet-actions-row">
              <button type="button" className="elite-action-btn primary" onClick={() => setShowTopUpModal(true)}>
                <ArrowDownLeft size={14} /> <span>Top Up</span>
              </button>
              <button type="button" className="elite-action-btn glass-send" onClick={() => setShowTransferModal(true)}>
                <Send size={14} /> <span>Send</span>
              </button>
              <button type="button" className="elite-action-btn glass-tsq" onClick={() => setShowTsqModal(true)}>
                <Activity size={14} /> <span>TSQ</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="wallet-ledger-card">
        <div className="wallet-ledger-header">
          <div>
            <h3 className="wallet-ledger-title">Wallet & Banking Ledger</h3>
            <p className="wallet-ledger-sub">Real-time synchronized transactions (View Summary or download CardNEXT Invoice)</p>
          </div>
          <button type="button" className="elite-action-btn light" style={{ height: "32px", padding: "0 12px", width: "auto" }} onClick={() => fetchWalletData(userId, true)}>
            <RefreshCcw size={13} /> <span>Refresh</span>
          </button>
        </div>

        <div className="wallet-ledger-list no-scrollbar">
          {transactions.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#6b7280", textAlign: "center", padding: "28px 12px", margin: 0 }}>No transactions recorded yet.</p>
          ) : (
            transactions.map((tx, idx) => {
              const txKey = getTxKey(tx, idx);
              const isCredit = isCreditTx(tx.type);
              const txLabel = formatTxLabel(tx);
              const txRef = tx.reference || tx.id || `TX-${idx}`;
              const txDate = new Date(tx.created_at || Date.now()).toLocaleDateString();
              const formattedAmt = formatCurrencyValue(Number(tx.amount));
              const isSummaryOpen = openSummaryKey === txKey;

              return (
                <div key={txKey} className="wallet-tx-item">
                  <div className="wallet-tx-row" onClick={() => setSelectedReceiptTx(tx)}>
                    <div className="wallet-tx-left">
                      <div className={`wallet-tx-icon ${isCredit ? "credit" : "debit"}`}>
                        {isCredit ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                      </div>
                      <div className="wallet-tx-meta">
                        <strong className="wallet-tx-type">{txLabel}</strong>
                        <span className="wallet-tx-sub">Ref: {txRef} · {txDate}</span>
                      </div>
                    </div>
                    <div className="wallet-tx-right">
                      <strong className={`wallet-tx-amount ${isCredit ? "credit" : "debit"}`}>
                        {isCredit ? "+" : "-"}{formattedAmt}
                      </strong>
                      <FileText size={14} style={{ color: "#9ca3af", flexShrink: 0 }} />
                    </div>
                  </div>

                  <div className="wallet-tx-actions">
                    <button
                      type="button"
                      className={`wallet-tx-action-btn summary ${isSummaryOpen ? "active" : ""}`}
                      onClick={() => setOpenSummaryKey(prev => (prev === txKey ? null : txKey))}
                    >
                      <FileText size={11} /> <span>Summary</span>
                    </button>
                    <button
                      type="button"
                      className="wallet-tx-action-btn invoice"
                      onClick={() => handleDownloadCardNextInvoice(tx)}
                    >
                      {downloadedInvoiceRef === txRef ? (
                        <>
                          <Check size={11} /> <span>Invoice Saved</span>
                        </>
                      ) : (
                        <>
                          <Download size={11} /> <span>CardNEXT Invoice</span>
                        </>
                      )}
                    </button>
                  </div>

                  {isSummaryOpen && (
                    <div className="wallet-tx-summary-box">
                      <div className="wallet-tx-summary-top">
                        <span>Transaction Summary</span>
                        <code>{txRef}</code>
                      </div>
                      <p>
                        <b>{txLabel}</b> ({tx.status || "completed"}) on <b>{txDate}</b>{" "}
                        {isCredit ? "credited" : "debited"} <b>{formattedAmt}</b> on your CardNext wallet.
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {showTopUpModal && (
        <div className={`elite-modal-overlay ${isClosingTopUpModal ? "closing" : ""}`} onMouseDown={e => { if (e.target === e.currentTarget) closeTopUpModalSleekly(); }}>
          <div className="elite-modal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div>
                <h2 style={{ fontSize: "19px", fontWeight: "900", color: "#111827", margin: 0 }}>Fund Your Wallet</h2>
                <p style={{ fontSize: "12px", color: "#6b7280", margin: "2px 0 0" }}>Instant automated deposit via your dedicated account</p>
              </div>
              <button type="button" onClick={closeTopUpModalSleekly} style={{ background: "#f3f0ea", border: 0, width: "32px", height: "32px", borderRadius: "50%", display: "grid", placeItems: "center", cursor: "pointer" }}>
                <Plus size={18} style={{ transform: "rotate(45deg)", color: "#111" }} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", textAlign: "center", padding: "6px 0" }}>
              <p style={{ fontSize: "12px", color: "#4b5563", margin: 0 }}>Transfer any amount from your mobile banking app to your permanent account below. Once funds land, this panel will close automatically and animate your balance:</p>

              <div style={{ padding: "18px", background: "#fdfbf7", borderRadius: "14px", border: "1px solid #eae5de" }}>
                <span style={{ fontSize: "10px", color: "#b45309", fontWeight: "800", letterSpacing: "1px", display: "block", marginBottom: "6px" }}>DEDICATED ACCOUNT NUMBER</span>
                <strong style={{ fontSize: "22px", fontFamily: "monospace", color: "#111827" }}>{balanceData.accountNumber || "Provisioning..."}</strong>
                <span style={{ fontSize: "12px", color: "#6b7280", display: "block", marginTop: "6px" }}>Kuda Bank · {balanceData.accountName || "Account Holder"}</span>
              </div>

              <button
                type="button"
                className="elite-action-btn dark"
                style={{ height: "44px", justifyContent: "center", borderRadius: "12px" }}
                onClick={() => handleCopy(balanceData.accountNumber, "acc")}
                disabled={!balanceData.accountNumber}
              >
                <Copy size={15} /> {copiedAcc ? "Copied Account Number!" : "Copy Account Number"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className={`elite-modal-overlay ${isClosingTransferModal ? "closing" : ""}`} onMouseDown={e => { if (e.target === e.currentTarget && !transferSuccessState) closeTransferModalSleekly(); }}>
          <div className="elite-modal">
            {transferSuccessState ? (
              <div className="success-checkmark-container">
                <div className="success-circle-icon">
                  <Check size={34} strokeWidth={3} />
                </div>
                <h3 style={{ fontSize: "19px", fontWeight: "900", color: "#111827", margin: "0 0 8px 0" }}>Transfer Successful!</h3>
                <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>{transferSuccess}</p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                  <div>
                    <h2 style={{ fontSize: "19px", fontWeight: "900", color: "#111827", margin: 0 }}>Send Money</h2>
                    <p style={{ fontSize: "12px", color: "#6b7280", margin: "2px 0 0" }}>Instant inter-bank payout via Kuda Rails</p>
                  </div>
                  <button type="button" onClick={closeTransferModalSleekly} style={{ background: "#f3f0ea", border: 0, width: "32px", height: "32px", borderRadius: "50%", display: "grid", placeItems: "center", cursor: "pointer" }}>
                    <Plus size={18} style={{ transform: "rotate(45deg)", color: "#111" }} />
                  </button>
                </div>

                <form onSubmit={handleTransferSubmit} style={{ display: "flex", flexDirection: "column", gap: "13px" }}>
                  {savedBeneficiaries.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <span style={{ fontSize: "10px", fontWeight: "800", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>Saved Recipients</span>
                      <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
                        {savedBeneficiaries.map((ben, idx) => {
                          const isSelected = transferForm.accountNumber === ben.accountNumber && selectedBank?.bankCode === ben.bank?.bankCode;
                          return (
                            <div
                              key={`${ben.accountNumber}-${ben.bank?.bankCode || idx}-${idx}`}
                              onClick={() => handleQuickSelectBeneficiary(ben)}
                              className={`ben-chip ${isSelected ? "active" : ""}`}
                              title={`${ben.beneficiaryName} · ${ben.bank?.bankName || ""} (${ben.accountNumber})`}
                            >
                              <UserCheck size={12} style={{ color: "#059669" }} />
                              <span>{ben.beneficiaryName.split(" ")[0]} ({(ben.bank?.bankName || "").slice(0, 6)}…)</span>
                              <span
                                className="ben-chip-remove"
                                title="Remove saved recipient"
                                onClick={(e) => removeSavedBeneficiary(e, ben.accountNumber, ben.bank?.bankCode)}
                              >
                                <X size={10} />
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div style={{ position: "relative" }} ref={bankDropdownRef}>
                    <label style={{ fontSize: "12px", fontWeight: "700", marginBottom: "4px", display: "block", color: "#374151" }}>Destination Bank</label>

                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setIsBankDropdownOpen(v => !v)}
                      onKeyDown={e => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setIsBankDropdownOpen(v => !v);
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "11px 14px",
                        borderRadius: "12px",
                        border: "1px solid #dcd6cd",
                        background: "#fff",
                        cursor: "pointer",
                        fontSize: "13px"
                      }}
                    >
                      <span style={{ color: selectedBank ? "#111" : "#9ca3af", fontWeight: selectedBank ? "600" : "400" }}>
                        {selectedBank ? selectedBank.bankName : "-- Select or search bank --"}
                      </span>
                      <ChevronDown size={16} style={{ color: "#666" }} />
                    </div>

                    {isBankDropdownOpen && (
                      <div style={{
                        position: "absolute",
                        top: "calc(100% + 6px)",
                        left: 0,
                        right: 0,
                        background: "#fff",
                        border: "1px solid #dcd6cd",
                        borderRadius: "14px",
                        boxShadow: "0 15px 35px rgba(0, 0, 0, 0.15)",
                        zIndex: 50,
                        maxHeight: "230px",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden"
                      }}>
                        <div style={{ padding: "10px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: "10px", background: "#faf8f5" }}>
                          <Search size={16} style={{ color: "#888" }} />
                          <input
                            type="text"
                            placeholder="Search bank name (e.g. Kuda, GTB)..."
                            value={bankSearch}
                            onChange={e => handleBankSearch(e.target.value)}
                            autoFocus
                            style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: "12px" }}
                          />
                        </div>

                        <div style={{ overflowY: "auto", maxHeight: "170px" }}>
                          {filteredBanks.length === 0 ? (
                            <div style={{ padding: "14px", textAlign: "center", fontSize: "12px", color: "#6b7280" }}>No banks found</div>
                          ) : (
                            filteredBanks.map((b, i) => (
                              <div
                                key={`${b.bankCode}-${i}`}
                                onClick={() => selectBank(b)}
                                style={{
                                  padding: "10px 14px",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  borderBottom: "1px solid #f5f3ef",
                                  background: selectedBank?.bankCode === b.bankCode ? "#f7f2ed" : "transparent",
                                  fontWeight: selectedBank?.bankCode === b.bankCode ? "700" : "400"
                                }}
                              >
                                {b.bankName}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "700", marginBottom: "4px", display: "block", color: "#374151" }}>Account Number (10 Digits)</label>
                    <input
                      type="text"
                      maxLength="10"
                      placeholder="e.g. 0123456789"
                      style={{ width: "100%", padding: "11px 14px", borderRadius: "12px", border: "1px solid #dcd6cd", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                      value={transferForm.accountNumber}
                      onChange={e => handleAccountNumberChange(e.target.value)}
                      required
                    />
                  </div>

                  {verifyingName && (
                    <div style={{ fontSize: "12px", color: "#6b7280", display: "flex", alignItems: "center", gap: "8px" }}>
                      <RefreshCcw size={14} className="spin" /> Verifying account name...
                    </div>
                  )}

                  {beneficiaryName && (
                    <div style={{ padding: "10px 14px", background: "#d1fae5", borderRadius: "10px", color: "#065f46", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Check size={15} /> Verified: {beneficiaryName}
                      </span>
                      {savedBeneficiaries.some(b => b.accountNumber === transferForm.accountNumber && b.bank?.bankCode === selectedBank?.bankCode) && (
                        <span style={{ fontSize: "10px", background: "#065f46", color: "#fff", padding: "2px 7px", borderRadius: "10px" }}>Saved</span>
                      )}
                    </div>
                  )}

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", gap: "6px", flexWrap: "wrap" }}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#374151" }}>Amount (₦)</label>
                      <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: "600" }}>
                        Available: ₦{Number(balanceData.walletBalance || 0).toLocaleString()}
                      </span>
                    </div>

                    <input
                      type="number"
                      placeholder="0.00"
                      style={{ width: "100%", padding: "11px 14px", borderRadius: "12px", border: "1px solid #dcd6cd", fontSize: "13px", outline: "none", marginBottom: "8px", boxSizing: "border-box" }}
                      value={transferForm.amount}
                      onChange={e => setTransferForm({ ...transferForm, amount: e.target.value })}
                      required
                    />

                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {[5000, 10000, 25000, 50000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTransferForm(prev => ({ ...prev, amount: String(amt) }))}
                          style={{
                            padding: "4px 10px",
                            background: "#f3f0ea",
                            border: "1px solid #e5e0d8",
                            borderRadius: "8px",
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#374151",
                            cursor: "pointer"
                          }}
                        >
                          ₦{amt.toLocaleString()}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setTransferForm(prev => ({ ...prev, amount: String(balanceData.walletBalance || 0) }))}
                        style={{
                          padding: "4px 10px",
                          background: "#202633",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#fff",
                          cursor: "pointer"
                        }}
                      >
                        Max
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "700", marginBottom: "4px", display: "block", color: "#374151" }}>Narration (Optional)</label>
                    <input
                      type="text"
                      placeholder="CardNext Payout"
                      style={{ width: "100%", padding: "11px 14px", borderRadius: "12px", border: "1px solid #dcd6cd", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                      value={transferForm.narration}
                      onChange={e => setTransferForm({ ...transferForm, narration: e.target.value })}
                    />
                  </div>

                  {transferError && (
                    <div style={{ padding: "10px", background: "#fee2e2", color: "#991b1b", borderRadius: "10px", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px", fontWeight: "600" }}>
                      <ShieldAlert size={16} /> {transferError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="elite-action-btn primary"
                    disabled={transferring || !beneficiaryName}
                    style={{ opacity: transferring || !beneficiaryName ? 0.7 : 1, marginTop: "4px", height: "44px", justifyContent: "center", fontSize: "13px", borderRadius: "12px" }}
                  >
                    {transferring ? "Processing Transfer..." : "Authorize & Send Money"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {selectedReceiptTx && (
        <div className="elite-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setSelectedReceiptTx(null); }}>
          <div className="elite-modal" style={{ maxWidth: "420px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: isCreditTx(selectedReceiptTx.type) ? "#d1fae5" : "#fee2e2", display: "grid", placeItems: "center", color: isCreditTx(selectedReceiptTx.type) ? "#065f46" : "#991b1b" }}>
                  {isCreditTx(selectedReceiptTx.type) ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: "900", color: "#111827", margin: 0 }}>CardNEXT Invoice</h3>
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>Official Transaction Receipt</span>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedReceiptTx(null)} style={{ background: "#f3f0ea", border: 0, width: "32px", height: "32px", borderRadius: "50%", display: "grid", placeItems: "center", cursor: "pointer" }}>
                <Plus size={18} style={{ transform: "rotate(45deg)", color: "#111" }} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px", background: "#fcfbf9", borderRadius: "14px", border: "1px solid #eae5de" }}>
              <div style={{ textAlign: "center", paddingBottom: "12px", borderBottom: "1px dashed #dcd6cd" }}>
                <span style={{ fontSize: "11px", color: "#6b7280", fontWeight: "700", textTransform: "uppercase" }}>Amount</span>
                <h2 style={{ fontSize: "26px", fontWeight: "900", color: isCreditTx(selectedReceiptTx.type) ? "#059669" : "#111827", margin: "4px 0 0" }}>
                  {isCreditTx(selectedReceiptTx.type) ? "+" : "-"}{formatCurrencyValue(Number(selectedReceiptTx.amount))}
                </h2>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                  <span style={{ color: "#6b7280" }}>Issuer</span>
                  <strong style={{ color: "#111827" }}>CardNEXT Invoice</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                  <span style={{ color: "#6b7280" }}>Type</span>
                  <strong style={{ color: "#111827" }}>{formatTxLabel(selectedReceiptTx)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                  <span style={{ color: "#6b7280" }}>Reference</span>
                  <strong style={{ fontFamily: "monospace", color: "#111827", wordBreak: "break-all", textAlign: "right" }}>{selectedReceiptTx.reference}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                  <span style={{ color: "#6b7280" }}>Date</span>
                  <strong style={{ color: "#111827", textAlign: "right" }}>{new Date(selectedReceiptTx.created_at || Date.now()).toLocaleString()}</strong>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="elite-action-btn dark"
              style={{ width: "100%", justifyContent: "center", height: "42px", borderRadius: "12px", marginTop: "14px" }}
              onClick={() => handleDownloadCardNextInvoice(selectedReceiptTx)}
            >
              {downloadedInvoiceRef === (selectedReceiptTx.reference || selectedReceiptTx.id) ? (
                <>
                  <Check size={14} /> <span>CardNEXT Invoice Downloaded</span>
                </>
              ) : (
                <>
                  <Download size={14} /> <span>Download CardNEXT Invoice</span>
                </>
              )}
            </button>

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button
                type="button"
                className="elite-action-btn light"
                style={{ flex: 1, justifyContent: "center", height: "42px", borderRadius: "12px" }}
                onClick={() => handleCopy(selectedReceiptTx.reference)}
              >
                <Copy size={14} /> <span>Copy Ref</span>
              </button>
              <button
                type="button"
                className="elite-action-btn primary"
                style={{ flex: 1, justifyContent: "center", height: "42px", borderRadius: "12px" }}
                onClick={() => {
                  setTsqRef(selectedReceiptTx.reference);
                  setSelectedReceiptTx(null);
                  setShowTsqModal(true);
                }}
              >
                <Activity size={14} /> <span>TSQ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showTsqModal && (
        <div className="elite-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setShowTsqModal(false); }}>
          <div className="elite-modal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "19px", fontWeight: "900", color: "#111827", margin: 0 }}>Transaction Query</h2>
                <p style={{ fontSize: "12px", color: "#6b7280", margin: "2px 0 0" }}>Check real-time status from Kuda rail</p>
              </div>
              <button type="button" onClick={() => setShowTsqModal(false)} style={{ background: "#f3f0ea", border: 0, width: "32px", height: "32px", borderRadius: "50%", display: "grid", placeItems: "center", cursor: "pointer" }}>
                <Plus size={18} style={{ transform: "rotate(45deg)", color: "#111" }} />
              </button>
            </div>

            <form onSubmit={handleTsqCheck} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", marginBottom: "6px", display: "block", color: "#374151" }}>Request Reference</label>
                <input
                  type="text"
                  placeholder="e.g. tf_170923849"
                  style={{ width: "100%", padding: "12px 14px", borderRadius: "12px", border: "1px solid #dcd6cd", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                  value={tsqRef}
                  onChange={e => setTsqRef(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="elite-action-btn dark" style={{ height: "44px", justifyContent: "center", fontSize: "13px", borderRadius: "12px" }} disabled={checkingTsq}>
                {checkingTsq ? "Querying Rail..." : "Query Transaction Status"}
              </button>
            </form>

            {tsqResult && (
              <div style={{ marginTop: "16px", padding: "14px", background: "#f8fafc", borderRadius: "12px", fontSize: "11px", fontFamily: "monospace", maxHeight: "180px", overflowY: "auto", border: "1px solid #e2e8f0" }}>
                <pre style={{ margin: 0 }}>{JSON.stringify(tsqResult, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}