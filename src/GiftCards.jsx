// GiftCards.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Gift, Search, ShieldCheck, Check, X, ArrowRight, ArrowUp, CreditCard, Loader2, AlertCircle, ChevronDown, Info, Wallet, Coins, FileText, Download, Receipt, Copy, ExternalLink
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const CURRENCIES = {
  NGN: { symbol: "₦", rate: 1500, label: "NGN (₦)", name: "Nigerian Naira" },
  USD: { symbol: "$", rate: 1, label: "USD ($)", name: "US Dollar" },
  EUR: { symbol: "€", rate: 0.92, label: "EUR (€)", name: "Euro" },
  GBP: { symbol: "£", rate: 0.79, label: "GBP (£)", name: "British Pound" }
};

const CATALOG_CACHE_KEY = "cardnext_giftcards_catalog_US_v1";
const CATALOG_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const WALLET_CACHE_KEY = "cardnext_wallet_cache";
const WALLET_UPDATED_EVENT = "cardnext:wallet-updated";
const USER_SYNC_COOLDOWN_MS = 15000;

const readCatalogCache = () => {
  try {
    const raw = localStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items) || typeof parsed.cachedAt !== "number") {
      return null;
    }
    return {
      items: parsed.items,
      isExpired: Date.now() - parsed.cachedAt > CATALOG_CACHE_TTL_MS
    };
  } catch {
    return null;
  }
};

const writeCatalogCache = (items) => {
  try {
    localStorage.setItem(
      CATALOG_CACHE_KEY,
      JSON.stringify({
        items,
        cachedAt: Date.now()
      })
    );
  } catch (err) {
    console.warn("Unable to write gift card catalog cache:", err);
  }
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractSafeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.href;
    }
  } catch {}
  return "";
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

function extractCodeFromResult(result) {
  const gw = result?.gatewayResponse || result?.gateway_response || {};
  const tx = gw?.transaction || gw?.data?.transaction || gw?.data || gw;
  const codes = tx?.gift_card_codes || gw?.gift_card_codes;

  if (Array.isArray(codes) && codes.length > 0) {
    const first = codes[0];
    if (typeof first === "string" && first.trim()) return first.trim();
    if (first && typeof first === "object") {
      return first.code || first.gift_code || first.pin || first.voucher_code || "Pending Gateway Code";
    }
  }

  const firstCard = Array.isArray(tx?.cards) && tx.cards.length > 0
    ? tx.cards[0]
    : (Array.isArray(tx?.vouchers) && tx.vouchers.length > 0 ? tx.vouchers[0] : null);

  return (
    result?.giftCode ||
    result?.gift_code ||
    result?.code ||
    tx?.gift_code ||
    tx?.giftCode ||
    tx?.code ||
    tx?.voucher_code ||
    tx?.voucherCode ||
    tx?.card_number ||
    tx?.pin ||
    firstCard?.gift_code ||
    firstCard?.code ||
    firstCard?.voucher_code ||
    firstCard?.card_number ||
    "Pending Gateway Code"
  );
}

function extractClaimUrlFromResult(result, fallbackDesc = "") {
  const gw = result?.gatewayResponse || result?.gateway_response || {};
  const tx = gw?.transaction || gw?.data?.transaction || gw?.data || gw;
  const codes = tx?.gift_card_codes || gw?.gift_card_codes;
  const firstCodeObj = Array.isArray(codes) && codes.length > 0 && typeof codes[0] === "object"
    ? codes[0]
    : null;

  const candidate =
    result?.claimUrl ||
    result?.claim_url ||
    result?.redemptionUrl ||
    firstCodeObj?.claim_url ||
    firstCodeObj?.redeem_url ||
    firstCodeObj?.url ||
    tx?.claim_url ||
    tx?.redeem_url ||
    tx?.redemption_url ||
    tx?.url ||
    "";

  const safeDirect = extractSafeUrl(candidate);
  if (safeDirect) return safeDirect;

  const urlMatch = String(fallbackDesc || "").match(/https?:\/\/[^\s)"'<>]+/i);
  return urlMatch ? extractSafeUrl(urlMatch[0]) : "";
}

export default function GiftCardsPage({ onWalletSync }) {
  const [userId, setUserId] = useState(() => localStorage.getItem("userId") || "1");
  const [activeTab, setActiveTab] = useState("Catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [currentCurrency, setCurrentCurrency] = useState("NGN");
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const currencyDropdownRef = useRef(null);

  const [giftProducts, setGiftProducts] = useState(() => {
    const cached = readCatalogCache();
    return cached ? cached.items : [];
  });
  const [isLoadingProducts, setIsLoadingProducts] = useState(() => {
    const cached = readCatalogCache();
    return !(cached && cached.items.length > 0);
  });
  const [apiError, setApiError] = useState("");
  const [purchasedCards, setPurchasedCards] = useState([]);
  const [priceTransactions, setPriceTransactions] = useState([]);
  const [userBalance, setUserBalance] = useState(0);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [calculatedPriceNGN, setCalculatedPriceNGN] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [revealedCode, setRevealedCode] = useState(null);
  const [settledPriceSummary, setSettledPriceSummary] = useState(null);
  const [copiedCodeKey, setCopiedCodeKey] = useState("");

  const [openSummaryId, setOpenSummaryId] = useState(null);
  const [downloadedInvoiceId, setDownloadedInvoiceId] = useState("");

  const calcTimeoutRef = useRef(null);
  const lastUserSyncRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const copyVoucherCode = useCallback(async (codeValue, keyId) => {
    if (!codeValue) return;
    try {
      await navigator.clipboard.writeText(String(codeValue));
    } catch {}
    if (!isMountedRef.current) return;
    setCopiedCodeKey(keyId);
    setTimeout(() => {
      if (isMountedRef.current) {
        setCopiedCodeKey(prev => (prev === keyId ? "" : prev));
      }
    }, 2000);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 260);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target)) {
        setIsCurrencyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatFromNGN = useCallback((amountInNGN) => {
    const numericNGN = Number(amountInNGN || 0);
    const curr = CURRENCIES[currentCurrency] || CURRENCIES.NGN;
    const inUSD = numericNGN / CURRENCIES.NGN.rate;
    const converted = inUSD * curr.rate;
    return `${curr.symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [currentCurrency]);

  const fetchCatalog = useCallback(async (forceRefresh = false, signal = undefined) => {
    const cached = readCatalogCache();
    const hasCachedItems = Boolean(cached && Array.isArray(cached.items) && cached.items.length > 0);

    if (!forceRefresh && hasCachedItems && !cached.isExpired) {
      if (isMountedRef.current) {
        setGiftProducts(cached.items);
        setApiError("");
        setIsLoadingProducts(false);
      }
      return;
    }

    if (!hasCachedItems && isMountedRef.current) {
      setIsLoadingProducts(true);
    }
    if (isMountedRef.current) {
      setApiError("");
    }

    try {
      const res = await fetch(`${API_BASE}/api/gift-cards/buy/products?country_code=US`, { signal });
      const result = await res.json();
      if (!isMountedRef.current) return;

      const rawList = Array.isArray(result) ? result : (result?.data || result?.products || []);
      if (Array.isArray(rawList)) {
        const formatted = rawList.map((item, index) => ({
          id: item.product_id || `${item.product_name || "gc"}-${index}`,
          name: item.product_name || item.brand_name || "Gift Card",
          brand: item.brand_name || "Global",
          category: item.category_name || "Entertainment",
          logo: item.logo_urls?.[0] || "🎁",
          currency: item.currency_code || "USD",
          min: Number(item.min_recipient_denomination ?? 10),
          max: Number(item.max_recipient_denomination ?? 500),
          fixedDenominations: Array.isArray(item.fixed_recipient_denominations) ? item.fixed_recipient_denominations : [],
          desc: item.redeem_instruction?.concise || `Official digital gift card for ${item.brand_name || "brand"}.`
        }));
        setGiftProducts(formatted);
        writeCatalogCache(formatted);
      } else if (hasCachedItems) {
        setGiftProducts(cached.items);
      } else {
        setApiError("Failed to load active gift card products from gateway.");
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("Gift card API connection error:", err);
      if (!isMountedRef.current) return;
      if (hasCachedItems) {
        setGiftProducts(cached.items);
      } else {
        setApiError("Unable to connect to gift card server.");
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingProducts(false);
      }
    }
  }, []);

  const fetchUserHistory = useCallback(async (targetUserId, signal = undefined) => {
    try {
      const res = await fetch(`${API_BASE}/api/gift-cards/history/${targetUserId}`, { signal });
      const result = await res.json();
      if (!isMountedRef.current) return;

      if (result?.success && Array.isArray(result.history)) {
        const mappedCards = result.history.map((item, idx) => ({
          id: `gc-${item.id || idx}`,
          reference: `GC-ORD-${item.id || idx + 1}`,
          productId: item.product_id || "N/A",
          name: item.product_name || "Digital Gift Card",
          faceAmount: Number(item.amount || 0),
          currency: "USD",
          code: item.gift_code || "Pending Gateway Code",
          claimUrl: "",
          amountNGN: Number(item.price_ngn || 0),
          date: item.created_at ? new Date(item.created_at).toLocaleDateString() : "Recent",
          dateTime: item.created_at ? new Date(item.created_at).toLocaleString() : "Recent",
          status: String(item.status || "SUCCESS").toUpperCase()
        }));

        const mappedPriceTxs = result.history.map((item, idx) => ({
          id: `gc-price-${item.id || idx}`,
          reference: `GC-PRICE-${item.id || idx + 1}`,
          productId: item.product_id || "N/A",
          productName: item.product_name || "Digital Gift Card",
          faceAmount: Number(item.amount || 0),
          currency: "USD",
          priceNGN: Number(item.price_ngn || 0),
          giftCode: item.gift_code || "Pending Gateway Code",
          claimUrl: "",
          date: item.created_at ? new Date(item.created_at).toLocaleDateString() : "Recent",
          dateTime: item.created_at ? new Date(item.created_at).toLocaleString() : "Recent",
          status: String(item.status || "SUCCESS").toUpperCase()
        }));

        setPurchasedCards(mappedCards);
        setPriceTransactions(mappedPriceTxs);
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("Could not fetch gift card history:", err);
    }
  }, []);

  const fetchUserBalance = useCallback(async (targetUserId, signal = undefined) => {
    try {
      const res = await fetch(`${API_BASE}/api/wallet/balance/${targetUserId}`, { signal });
      const result = await res.json();
      if (!isMountedRef.current) return;

      if (result?.success && result.walletBalance !== undefined) {
        const bal = Number(result.walletBalance) || 0;
        setUserBalance(bal);
        syncWalletCacheAndEvent(bal);
        if (typeof onWalletSync === "function") {
          onWalletSync(bal);
        }
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("Could not fetch user balance:", err);
    }
  }, [onWalletSync]);

  useEffect(() => {
    const controller = new AbortController();

    const syncActiveUser = (force = false) => {
      const now = Date.now();
      if (!force && now - lastUserSyncRef.current < USER_SYNC_COOLDOWN_MS) return;
      lastUserSyncRef.current = now;

      const activeUserId = localStorage.getItem("userId") || "1";
      if (isMountedRef.current) {
        setUserId(activeUserId);
      }
      fetchUserHistory(activeUserId, controller.signal);
      fetchUserBalance(activeUserId, controller.signal);
    };

    const handleFocus = () => syncActiveUser(false);
    const handleStorage = () => syncActiveUser(true);

    fetchCatalog(false, controller.signal);
    syncActiveUser(true);

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);
    return () => {
      controller.abort();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchCatalog, fetchUserHistory, fetchUserBalance]);

  useEffect(() => {
    if (!selectedProduct || !customAmount || Number(customAmount) <= 0) {
      setCalculatedPriceNGN(null);
      setIsCalculating(false);
      return;
    }

    const controller = new AbortController();
    setIsCalculating(true);
    if (calcTimeoutRef.current) clearTimeout(calcTimeoutRef.current);

    calcTimeoutRef.current = setTimeout(() => {
      fetch(`${API_BASE}/api/gift-cards/buy/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          product_id: selectedProduct.id,
          amount: Number(customAmount),
          quantity: 1
        })
      })
        .then(res => res.json())
        .then(data => {
          if (!isMountedRef.current) return;
          if (data?.status === "success" || data?.data || data?.success) {
            const priceData = data.data || data;
            const rawPrice =
              priceData.total_price_ngn ??
              priceData.unit_price_ngn ??
              priceData.amount_ngn ??
              priceData.price_ngn ??
              null;
            setCalculatedPriceNGN(rawPrice !== null && rawPrice !== undefined ? Number(rawPrice) : null);
          }
        })
        .catch(err => {
          if (err?.name !== "AbortError") {
            console.error("Calculation error:", err);
          }
        })
        .finally(() => {
          if (isMountedRef.current) {
            setIsCalculating(false);
          }
        });
    }, 450);

    return () => {
      controller.abort();
      if (calcTimeoutRef.current) clearTimeout(calcTimeoutRef.current);
    };
  }, [customAmount, selectedProduct]);

  const filteredProducts = giftProducts.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "All" || item.category.toLowerCase().includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCat;
  });

  const handlePurchase = async () => {
    if (!selectedProduct || !customAmount || Number(customAmount) <= 0) return;
    setIsPurchasing(true);

    const idempotencyKey = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : ((r & 0x3) | 0x8);
      return v.toString(16);
    });

    const faceVal = Number(customAmount);
    const finalPriceNgn = calculatedPriceNGN !== null && calculatedPriceNGN !== undefined && Number(calculatedPriceNGN) > 0
      ? Number(calculatedPriceNGN)
      : faceVal * CURRENCIES.NGN.rate;

    try {
      const response = await fetch(`${API_BASE}/api/gift-cards/buy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify({
          userId: Number(userId),
          product_id: selectedProduct.id,
          productName: selectedProduct.name,
          amount: faceVal,
          quantity: 1,
          expected_amount_ngn: finalPriceNgn,
          recipientEmail: recipientEmail.trim() || undefined
        })
      });

      const result = await response.json();
      if (!isMountedRef.current) return;

      if (response.ok && result?.success) {
        const nextBal = result.newBalance !== undefined
          ? Number(result.newBalance) || 0
          : Math.max(0, Number(userBalance || 0) - Number(result.priceNgn || finalPriceNgn));

        const settledNgn = Number(result.priceNgn ?? finalPriceNgn);
        const issuedCode = extractCodeFromResult(result);
        const claimUrl = extractClaimUrlFromResult(result, selectedProduct.desc);
        const txRef = result.reference || `GC-${Date.now()}`;
        const orderStatus = String(result.status || "SUCCESS").toUpperCase();
        const gatewayStatus = String(result.gatewayStatus || orderStatus).toUpperCase();
        const nowIso = result.transaction?.created_at || new Date().toISOString();

        const newPriceRecord = {
          id: `gc-price-${result.orderId || Date.now()}`,
          reference: txRef,
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          faceAmount: faceVal,
          currency: selectedProduct.currency || "USD",
          priceNGN: settledNgn,
          giftCode: issuedCode,
          claimUrl,
          gatewayStatus,
          recipientEmail: recipientEmail.trim() || null,
          redeemNote: selectedProduct.desc,
          date: new Date(nowIso).toLocaleDateString(),
          dateTime: new Date(nowIso).toLocaleString(),
          status: orderStatus
        };

        const newCardRecord = {
          id: `gc-${result.orderId || Date.now()}`,
          reference: txRef,
          productId: selectedProduct.id,
          name: selectedProduct.name,
          faceAmount: faceVal,
          currency: selectedProduct.currency || "USD",
          code: issuedCode,
          claimUrl,
          gatewayStatus,
          amountNGN: settledNgn,
          recipientEmail: recipientEmail.trim() || null,
          redeemNote: selectedProduct.desc,
          date: new Date(nowIso).toLocaleDateString(),
          dateTime: new Date(nowIso).toLocaleString(),
          status: orderStatus
        };

        setUserBalance(nextBal);
        setSettledPriceSummary(newPriceRecord);
        setPriceTransactions(prev => [newPriceRecord, ...prev]);
        setPurchasedCards(prev => [newCardRecord, ...prev]);
        setOpenSummaryId(newPriceRecord.id);
        setPurchaseSuccess(true);
        setRevealedCode(issuedCode);

        if (typeof onWalletSync === "function") {
          onWalletSync(nextBal);
        }

        syncWalletCacheAndEvent(nextBal, result.transaction || {
          id: txRef,
          reference: txRef,
          type: "gift_card_purchase",
          amount: settledNgn,
          currency: "NGN",
          status: orderStatus,
          metadata: {
            serviceType: "gift_card",
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            faceAmount: faceVal,
            priceNgn: settledNgn,
            giftCode: issuedCode,
            claimUrl: claimUrl || null
          },
          created_at: nowIso
        });

        lastUserSyncRef.current = Date.now();
        await fetchUserBalance(userId);
      } else {
        alert(result?.message || "Gift card purchase submission failed.");
      }
    } catch (err) {
      console.error("Purchase error:", err);
      if (isMountedRef.current) {
        alert("Network error connecting to payment gateway.");
      }
    } finally {
      if (isMountedRef.current) {
        setIsPurchasing(false);
      }
    }
  };

  const handleDownloadGiftCardInvoice = (record) => {
    if (!record) return;
    const refCode = String(record.reference || record.id || `GC-INV-${Date.now()}`);
    const safeFilenameRef = refCode.replace(/[^a-zA-Z0-9_-]/g, "_");
    const productTitle = record.productName || record.name || "Digital Gift Card";
    const settledAmountFormatted = formatFromNGN(record.priceNGN ?? record.amountNGN ?? 0);
    const faceValueText = record.faceAmount
      ? `${record.currency || "USD"} ${Number(record.faceAmount).toLocaleString()}`
      : "N/A";
    const dateText = record.dateTime || record.date || new Date().toLocaleString();
    const statusText = String(record.status || "SUCCESS").toUpperCase();
    const voucherCode = record.giftCode || record.code || "Pending Gateway Code";
    const claimLinkRow = record.claimUrl
      ? `<tr><td class="meta-key">Claim / Redeem Link</td><td class="meta-val mono"><a href="${escapeHtml(record.claimUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(record.claimUrl)}</a></td></tr>`
      : "";

    const invoiceHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CardNEXT Gift Card Invoice - ${escapeHtml(refCode)}</title>
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
      background: linear-gradient(145deg, #19110d 0%, #3d1f10 60%, #713b17 100%);
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
      color: #e6d6c3;
      margin-top: 4px;
    }
    .invoice-tag {
      text-align: right;
    }
    .invoice-tag span {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(243, 199, 124, 0.18);
      border: 1px solid rgba(243, 199, 124, 0.35);
      color: #f3c77c;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .invoice-tag p {
      font-size: 11px;
      color: #e6d6c3;
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
      color: #713b17;
    }
    .status-pill {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 12px;
      border-radius: 999px;
      background: #dcfce7;
      color: #166534;
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
    .meta-val a {
      color: #713b17;
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
      background: #713b17;
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
        <div class="brand-sub">Official Gift Card Purchase &amp; Price Receipt</div>
      </div>
      <div class="invoice-tag">
        <span>Gift Card Receipt</span>
        <p>${escapeHtml(refCode)}</p>
      </div>
    </div>

    <div class="invoice-body">
      <div class="amount-banner">
        <div class="amount-label">Settled Price (${escapeHtml(currentCurrency)})</div>
        <div class="amount-value">${escapeHtml(settledAmountFormatted)}</div>
        <div class="status-pill">${escapeHtml(statusText)}</div>
      </div>

      <table class="meta-table">
        <tr>
          <td class="meta-key">Gift Card Product</td>
          <td class="meta-val">${escapeHtml(productTitle)}</td>
        </tr>
        <tr>
          <td class="meta-key">Card Denomination</td>
          <td class="meta-val mono">${escapeHtml(faceValueText)}</td>
        </tr>
        <tr>
          <td class="meta-key">Digital Voucher Code</td>
          <td class="meta-val mono">${escapeHtml(voucherCode)}</td>
        </tr>
        ${claimLinkRow}
        <tr>
          <td class="meta-key">Reference ID</td>
          <td class="meta-val mono">${escapeHtml(refCode)}</td>
        </tr>
        <tr>
          <td class="meta-key">Date &amp; Time</td>
          <td class="meta-val">${escapeHtml(dateText)}</td>
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
      link.download = `CardNEXT-GiftCard-Invoice-${safeFilenameRef}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("Failed to download CardNEXT gift card invoice:", err);
    }

    setDownloadedInvoiceId(record.id);
    setTimeout(() => {
      if (isMountedRef.current) {
        setDownloadedInvoiceId(prev => (prev === record.id ? "" : prev));
      }
    }, 2500);
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setCustomAmount("");
    setCalculatedPriceNGN(null);
    setRecipientEmail("");
    setPurchaseSuccess(false);
    setRevealedCode(null);
    setSettledPriceSummary(null);
  };

  const numericAmount = Number(customAmount || 0);
  const estimatedNGN = calculatedPriceNGN !== null && calculatedPriceNGN !== undefined && Number(calculatedPriceNGN) > 0
    ? Number(calculatedPriceNGN)
    : numericAmount * CURRENCIES.NGN.rate;
  const isAmountOutOfRange = !selectedProduct || !customAmount || numericAmount < selectedProduct.min || numericAmount > selectedProduct.max;

  return (
    <div className="giftcards-page-container animate-fade-in">
      <div className="giftcards-header-row">
        <div className="gift-segmented-tabs no-scrollbar">
          <button
            type="button"
            className={`gift-tab-btn ${activeTab === "Catalog" ? "active" : ""}`}
            onClick={() => setActiveTab("Catalog")}
          >
            <Gift size={15} /> <span>Gift Card Store</span>
          </button>
          <button
            type="button"
            className={`gift-tab-btn ${activeTab === "My Gift Cards" ? "active" : ""}`}
            onClick={() => setActiveTab("My Gift Cards")}
          >
            <CreditCard size={15} /> <span>My Cards ({purchasedCards.length})</span>
          </button>
          <button
            type="button"
            className={`gift-tab-btn ${activeTab === "Price Transactions" ? "active" : ""}`}
            onClick={() => setActiveTab("Price Transactions")}
          >
            <Receipt size={15} /> <span>Price Transactions ({priceTransactions.length})</span>
          </button>
        </div>

        <div className="header-action-pills">
          <div className="currency-selector-container" ref={currencyDropdownRef}>
            <button
              type="button"
              className="currency-dropdown-toggle"
              onClick={() => setIsCurrencyDropdownOpen(v => !v)}
            >
              <Coins size={13} />
              <span>{currentCurrency} ({CURRENCIES[currentCurrency].symbol})</span>
              <ChevronDown size={13} className={`chevron-icon ${isCurrencyDropdownOpen ? "open" : ""}`} />
            </button>

            {isCurrencyDropdownOpen && (
              <div className="currency-dropdown-menu animate-fade-in">
                <div className="dropdown-menu-header">Select Currency</div>
                {Object.keys(CURRENCIES).map((curr) => (
                  <div
                    key={curr}
                    role="button"
                    tabIndex={0}
                    className={`currency-dropdown-item ${currentCurrency === curr ? "active" : ""}`}
                    onClick={() => {
                      setCurrentCurrency(curr);
                      setIsCurrencyDropdownOpen(false);
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setCurrentCurrency(curr);
                        setIsCurrencyDropdownOpen(false);
                      }
                    }}
                  >
                    <span>{curr}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="wallet-balance-pill">
            <Wallet size={13} /> <span>Wallet: <b>{formatFromNGN(userBalance)}</b></span>
          </div>
        </div>
      </div>

      {activeTab === "Catalog" && (
        <div className="gift-store-layout">
          <div className="card gift-search-card">
            <div className="gift-filter-bar">
              <div className="gift-search-input">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search brand (e.g., Apple, Netflix, Amazon)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="region-pills no-scrollbar">
                {["All", "Entertainment", "Gaming", "Shopping", "Music"].map(cat => (
                  <button
                    type="button"
                    key={cat}
                    className={`filter-chip ${selectedCategory === cat ? "selected" : ""}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isLoadingProducts ? (
            <div className="gift-loading-wrapper animate-fade-in">
              <div className="sleek-loader-ring">
                <Loader2 size={24} className="spinning-loader" />
              </div>
            </div>
          ) : apiError ? (
            <div className="service-inactive-box animate-fade-in">
              <AlertCircle size={20} style={{ color: "#f87171", flexShrink: 0 }} />
              <div>
                <strong style={{ color: "var(--text)", fontSize: "12.5px" }}>Gateway Notice</strong>
                <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "var(--muted)" }}>{apiError}</p>
              </div>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="gift-grid animate-fade-in">
              {filteredProducts.map(item => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  className="card gift-card clickable-gift-card"
                  onClick={() => setSelectedProduct(item)}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedProduct(item);
                    }
                  }}
                >
                  <div className="gift-card-top">
                    <span className="brand-logo-icon">
                      {typeof item.logo === "string" && item.logo.startsWith("http") ? (
                        <img src={item.logo} alt={item.brand} className="gift-brand-img" />
                      ) : (
                        item.logo
                      )}
                    </span>
                    <span className="category-tag">{item.category}</span>
                  </div>
                  <h3>{item.name}</h3>
                  <p className="gift-card-desc">{item.desc}</p>
                  <div className="gift-card-footer">
                    <small>{item.currency} {item.min} – {item.max}</small>
                    <span className="buy-gift-link">
                      Buy <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-catalog-state animate-fade-in">
              No gift card products found matching your search.
            </div>
          )}
        </div>
      )}

      {activeTab === "My Gift Cards" && (
        <div className="my-gifts-layout animate-fade-in">
          {purchasedCards.length === 0 ? (
            <div className="empty-catalog-state">
              <CreditCard size={30} style={{ marginBottom: "10px", color: "var(--brown)" }} />
              <h4 style={{ margin: "0 0 4px", fontSize: "14px", color: "var(--text)" }}>No Purchased Gift Cards Yet</h4>
              <p style={{ fontSize: "11.5px", margin: 0 }}>Your issued digital vouchers will appear here securely.</p>
            </div>
          ) : (
            <div className="my-gifts-grid">
              {purchasedCards.map(gc => {
                const isSummaryOpen = openSummaryId === gc.id;
                const isCopied = copiedCodeKey === gc.id;
                return (
                  <div className="card my-gift-item-card" key={gc.id}>
                    <div className="my-gift-top">
                      <div>
                        <h4>{gc.name}</h4>
                        <small>Purchased: {gc.date} · Paid: {formatFromNGN(gc.amountNGN)}</small>
                      </div>
                      <strong className="gc-amount">{formatFromNGN(gc.amountNGN)}</strong>
                    </div>
                    <div className="code-box">
                      <span>Code: <b>{gc.code}</b></span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <button
                          type="button"
                          className="copy-code-mini-btn"
                          onClick={() => copyVoucherCode(gc.code, gc.id)}
                          title="Copy voucher code"
                        >
                          {isCopied ? <Check size={11} /> : <Copy size={11} />}
                          <span>{isCopied ? "Copied" : "Copy"}</span>
                        </button>
                        <span className={`status-pill ${String(gc.status || "active").toLowerCase()}`}>{gc.status}</span>
                      </div>
                    </div>
                    {gc.claimUrl && (
                      <a
                        href={gc.claimUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="claim-link-row"
                      >
                        <ExternalLink size={11} /> <span>Open Claim / Redemption Link</span>
                      </a>
                    )}
                    <div className="tx-record-actions">
                      <button
                        type="button"
                        className={`tx-action-btn ${isSummaryOpen ? "active" : ""}`}
                        onClick={() => setOpenSummaryId(prev => (prev === gc.id ? null : gc.id))}
                      >
                        <FileText size={11} /> <span>Summary</span>
                      </button>
                      <button
                        type="button"
                        className="tx-action-btn invoice"
                        onClick={() => handleDownloadGiftCardInvoice(gc)}
                      >
                        {downloadedInvoiceId === gc.id ? (
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
                      <div className="tx-summary-panel">
                        <div className="tx-summary-head">
                          <span>Price &amp; Voucher Summary</span>
                          <code>{gc.reference}</code>
                        </div>
                        <p>
                          <b>{gc.name}</b> ({gc.currency || "USD"} {Number(gc.faceAmount || 0).toLocaleString()} face value) was settled for{" "}
                          <b>{formatFromNGN(gc.amountNGN)}</b> on <b>{gc.dateTime || gc.date}</b> with voucher code{" "}
                          <code>{gc.code}</code>.
                        </p>
                        {gc.redeemNote && <p className="redeem-hint-line">Redeem: {gc.redeemNote}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "Price Transactions" && (
        <div className="my-gifts-layout animate-fade-in">
          {priceTransactions.length === 0 ? (
            <div className="empty-catalog-state">
              <Receipt size={30} style={{ marginBottom: "10px", color: "var(--brown)" }} />
              <h4 style={{ margin: "0 0 4px", fontSize: "14px", color: "var(--text)" }}>No Gift Card Price Transactions Yet</h4>
              <p style={{ fontSize: "11.5px", margin: 0 }}>Every gift card purchase price record will be logged here.</p>
            </div>
          ) : (
            <div className="price-tx-list">
              {priceTransactions.map(tx => {
                const isSummaryOpen = openSummaryId === tx.id;
                return (
                  <div className="card price-tx-card" key={tx.id}>
                    <div className="price-tx-main">
                      <div>
                        <h4>{tx.productName}</h4>
                        <small>
                          {tx.reference} · {tx.dateTime || tx.date}
                          {tx.faceAmount > 0 ? ` · Face Value: ${tx.currency || "USD"} ${Number(tx.faceAmount).toLocaleString()}` : ""}
                        </small>
                      </div>
                      <div className="price-tx-right">
                        <strong className="gc-amount">{formatFromNGN(tx.priceNGN)}</strong>
                        <span className={`status-pill ${String(tx.status || "success").toLowerCase()}`}>{tx.status}</span>
                      </div>
                    </div>

                    <div className="tx-record-actions">
                      <button
                        type="button"
                        className={`tx-action-btn ${isSummaryOpen ? "active" : ""}`}
                        onClick={() => setOpenSummaryId(prev => (prev === tx.id ? null : tx.id))}
                      >
                        <FileText size={11} /> <span>Summary</span>
                      </button>
                      <button
                        type="button"
                        className="tx-action-btn invoice"
                        onClick={() => handleDownloadGiftCardInvoice(tx)}
                      >
                        {downloadedInvoiceId === tx.id ? (
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
                      <div className="tx-summary-panel">
                        <div className="tx-summary-head">
                          <span>Price Transaction Summary</span>
                          <code>{tx.reference}</code>
                        </div>
                        <p>
                          Purchased <b>{tx.productName}</b> for a recorded price of{" "}
                          <b>{formatFromNGN(tx.priceNGN)}</b> on <b>{tx.dateTime || tx.date}</b>. Voucher:{" "}
                          <code>{tx.giftCode}</code> · Status: <b>{tx.status}</b>.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showScrollTop && (
        <button
          type="button"
          className="scroll-top-btn animate-pop"
          onClick={scrollToTop}
          aria-label="Scroll to top"
          title="Scroll to top"
        >
          <ArrowUp size={18} />
        </button>
      )}

      {selectedProduct && (
        <div className="modal-overlay animate-fade-in" onClick={closeModal}>
          <div className="modal animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-kicker">SECURE CHECKOUT</span>
                <h2>{selectedProduct.name}</h2>
              </div>
              <button type="button" className="modal-close" onClick={closeModal} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <div className="denomination-range-badge">
              <Info size={14} />
              <span>Allowed Range: <b>{selectedProduct.currency} {selectedProduct.min.toLocaleString()} – {selectedProduct.max.toLocaleString()}</b></span>
            </div>

            {purchaseSuccess ? (
              <div className="success-state-box animate-pop">
                <div className="success-icon"><Check size={28} /></div>
                <h3>{settledPriceSummary?.status === "PENDING" ? "Order Processing!" : "Purchase Successful!"}</h3>
                <p>
                  Price transaction recorded ({settledPriceSummary ? formatFromNGN(settledPriceSummary.priceNGN) : formatFromNGN(estimatedNGN)}) and gateway response logged:
                </p>
                <div className="revealed-code-box">
                  <strong>{revealedCode}</strong>
                  <button
                    type="button"
                    className="copy-code-pill-btn"
                    onClick={() => copyVoucherCode(revealedCode, "modal-code")}
                  >
                    {copiedCodeKey === "modal-code" ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedCodeKey === "modal-code" ? "Copied!" : "Copy Code"}</span>
                  </button>
                </div>

                {settledPriceSummary && (
                  <div className="receipt-details-card">
                    <div><span>Reference:</span> <code>{settledPriceSummary.reference}</code></div>
                    <div><span>Order Status:</span> <b>{settledPriceSummary.status}</b></div>
                    <div><span>Card Value:</span> <b>{settledPriceSummary.currency} {Number(settledPriceSummary.faceAmount || 0).toLocaleString()}</b></div>
                    <div><span>Price Paid:</span> <b>{formatFromNGN(settledPriceSummary.priceNGN)}</b></div>
                    {settledPriceSummary.recipientEmail && (
                      <div><span>Recipient:</span> <b>{settledPriceSummary.recipientEmail}</b></div>
                    )}
                    {settledPriceSummary.claimUrl && (
                      <div className="claim-link-box">
                        <a href={settledPriceSummary.claimUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink size={12} /> <span>Claim / Redeem Gift Card</span>
                        </a>
                      </div>
                    )}
                    {settledPriceSummary.redeemNote && (
                      <div className="redeem-note-box"><b>How to Redeem:</b> {settledPriceSummary.redeemNote}</div>
                    )}
                  </div>
                )}

                {settledPriceSummary && (
                  <div className="modal-invoice-actions">
                    <button
                      type="button"
                      className="tx-action-btn invoice"
                      onClick={() => handleDownloadGiftCardInvoice(settledPriceSummary)}
                    >
                      <Download size={12} /> <span>Download CardNEXT Invoice</span>
                    </button>
                    <button
                      type="button"
                      className="tx-action-btn"
                      onClick={() => {
                        setActiveTab("Price Transactions");
                        closeModal();
                      }}
                    >
                      <Receipt size={12} /> <span>View Price Transactions</span>
                    </button>
                  </div>
                )}
                <button type="button" className="modal-submit" onClick={closeModal}>Done</button>
              </div>
            ) : (
              <>
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label className="modal-label">Amount ({selectedProduct.currency})</label>
                  <div className="bills-input-wrap">
                    <span className="currency-prefix">{selectedProduct.currency === "USD" ? "$" : selectedProduct.currency}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={`Min ${selectedProduct.min}`}
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value.replace(/[^\d.]/g, ""))}
                    />
                  </div>
                </div>

                {numericAmount > 0 && (
                  <div className="price-preview-box">
                    <span>Recorded Price ({currentCurrency}):</span>
                    <strong>
                      {isCalculating ? <Loader2 size={14} className="spinning-loader" /> : formatFromNGN(estimatedNGN)}
                    </strong>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label className="modal-label">Recipient Email (Optional)</label>
                  <div className="bills-input-wrap">
                    <input
                      type="email"
                      placeholder="friend@example.com"
                      value={recipientEmail}
                      onChange={e => setRecipientEmail(e.target.value)}
                    />
                  </div>
                </div>

                <p className="secure-note"><ShieldCheck size={14} className="secure-icon" /> Direct gateway order, automated wallet deduction &amp; price ledger.</p>

                <button
                  type="button"
                  className="modal-submit"
                  onClick={handlePurchase}
                  disabled={isPurchasing || isAmountOutOfRange}
                >
                  {isPurchasing ? "Processing Payment..." : `Pay ${formatFromNGN(estimatedNGN)}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.94) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes spin { to { transform: rotate(360deg); } }

        .animate-fade-in { animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-pop { animation: popIn 0.2s ease-out forwards; }
        .spinning-loader { animation: spin 1s linear infinite; display: inline-block; vertical-align: middle; }

        .gift-loading-wrapper { display: flex; justify-content: center; align-items: center; padding: 52px 0; }
        .sleek-loader-ring { width: 48px; height: 48px; border-radius: 50%; background: rgba(113, 59, 23, 0.08); border: 1px solid rgba(113, 59, 23, 0.2); display: grid; place-items: center; color: var(--brown); box-shadow: 0 0 20px rgba(113,59,23,0.1); }

        .giftcards-page-container { display: flex; flex-direction: column; gap: 20px; width: 100%; box-sizing: border-box; }
        .giftcards-header-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
        .header-action-pills { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

        .gift-segmented-tabs { display: flex; gap: 6px; padding: 5px; background: #f4f1ec; border: 1px solid var(--border); border-radius: 13px; width: fit-content; max-width: 100%; }
        .gift-tab-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 9px; font-size: 11.5px; font-weight: 700; color: var(--muted); background: transparent; border: 0; cursor: pointer; transition: all 0.2s ease; white-space: nowrap; }
        .gift-tab-btn:hover { color: var(--text); background: rgba(0, 0, 0, 0.03); }
        .gift-tab-btn.active { color: #fff; background: linear-gradient(135deg, var(--brown) 0%, #3d1f10 100%); box-shadow: 0 4px 12px rgba(113, 59, 23, 0.25); }

        .currency-selector-container { position: relative; }
        .currency-dropdown-toggle { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; background: #fdfcfb; border: 1px solid var(--border); border-radius: 11px; font-size: 11.5px; font-weight: 750; color: var(--text); cursor: pointer; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03); transition: all 0.2s; white-space: nowrap; }
        .currency-dropdown-toggle:hover { border-color: var(--brown); background: #fff; }
        .chevron-icon { transition: transform 0.2s; color: var(--muted); }
        .chevron-icon.open { transform: rotate(180deg); }

        .currency-dropdown-menu { position: absolute; right: 0; top: calc(100% + 6px); background: #fff; border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12); width: 132px; z-index: 100; overflow: hidden; padding: 4px; }
        .dropdown-menu-header { padding: 7px 10px; font-size: 9px; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid #f3f4f6; background: #faf9f6; }
        .currency-dropdown-item { padding: 8px 10px; font-size: 11.5px; font-weight: 700; color: var(--text); cursor: pointer; border-radius: 8px; transition: background 0.15s; text-align: center; }
        .currency-dropdown-item:hover { background: #f4f1ec; color: var(--brown); }
        .currency-dropdown-item.active { background: #f5eee6; color: var(--brown); }

        .wallet-balance-pill { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; background: #fdfcfb; border: 1px solid var(--border); border-radius: 11px; font-size: 11.5px; color: var(--brown); font-weight: 700; white-space: nowrap; }

        .gift-search-card { margin: 0; padding: 16px; border-radius: 14px; }
        .gift-filter-bar { display: flex; flex-direction: column; gap: 12px; }
        .gift-search-input { display: flex; align-items: center; gap: 10px; height: 44px; padding: 0 14px; border: 1px solid #dedbd4; border-radius: 10px; background: #fdfcfb; transition: border-color 0.18s, box-shadow 0.18s; }
        .gift-search-input:focus-within { border-color: var(--brown); box-shadow: 0 0 0 3px rgba(113, 59, 23, 0.1); background: #fff; }
        .gift-search-input input { border: 0; outline: 0; width: 100%; background: transparent; font-size: 12px; font-weight: 600; color: var(--text); }
        .gift-search-input input::placeholder { color: var(--muted); }

        .region-pills { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
        .filter-chip { padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 650; background: #f4f1ec; color: var(--muted); border: 1px solid var(--border); white-space: nowrap; cursor: pointer; transition: all 0.18s ease; }
        .filter-chip:hover { color: var(--text); background: #eae6df; }
        .filter-chip.selected { background: var(--brown); color: #fff; border-color: var(--brown); box-shadow: 0 4px 10px rgba(113, 59, 23, 0.18); }

        .service-inactive-box { display: flex; align-items: center; gap: 10px; background: rgba(248, 113, 113, 0.08); border: 1px solid rgba(248, 113, 113, 0.25); padding: 16px; border-radius: 13px; }
        .empty-catalog-state { text-align: center; padding: 40px 16px; color: var(--muted); font-size: 12px; }

        .gift-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        @media (max-width: 1024px) { .gift-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

        .clickable-gift-card { cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
        .clickable-gift-card:hover { transform: translateY(-2px); border-color: var(--brown); box-shadow: 0 10px 25px rgba(113, 59, 23, 0.1); }

        .gift-card { display: flex; flex-direction: column; gap: 10px; padding: 18px; background: #fdfcfb; border: 1px solid #eae8e3; border-radius: 14px; min-height: 186px; justify-content: space-between; }
        .gift-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .brand-logo-icon { font-size: 24px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .gift-brand-img { width: 28px; height: 28px; object-fit: contain; border-radius: 6px; }
        .category-tag { font-size: 9px; font-weight: 750; color: var(--brown); background: #f5eee6; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.4px; white-space: nowrap; }
        .gift-card h3 { margin: 0; font-size: 13.5px; color: var(--text); font-weight: 750; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .gift-card-desc { margin: 0; font-size: 11px; color: var(--muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        .gift-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; border-top: 1px solid #f4f1ec; padding-top: 10px; margin-top: auto; }
        .gift-card-footer small { font-size: 10px; color: var(--muted); font-weight: 600; }
        .buy-gift-link { display: inline-flex; align-items: center; gap: 4px; color: var(--brown); font-size: 11px; font-weight: 750; transition: gap 0.2s; white-space: nowrap; }
        .clickable-gift-card:hover .buy-gift-link { gap: 7px; }

        .my-gifts-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        @media (max-width: 768px) { .my-gifts-grid { grid-template-columns: 1fr; } }
        .my-gift-item-card { display: flex; flex-direction: column; gap: 10px; padding: 18px; background: #fdfcfb; border: 1px solid #eae8e3; border-radius: 14px; }
        .my-gift-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .my-gift-top h4 { margin: 0; font-size: 13px; color: var(--text); font-weight: 750; }
        .my-gift-top small { color: var(--muted); font-size: 10px; font-weight: 500; }
        .gc-amount { font-size: 13.5px; color: var(--brown); font-weight: 800; white-space: nowrap; font-variant-numeric: tabular-nums; }
        .code-box { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; background: #f4f1ec; border: 1px solid #dedbd4; border-radius: 9px; font-size: 11px; color: var(--text); }

        .copy-code-mini-btn { display: inline-flex; align-items: center; gap: 3px; padding: 3px 7px; border-radius: 6px; border: 1px solid #d6d0c6; background: #ffffff; color: #374151; font-size: 9.5px; font-weight: 700; cursor: pointer; }
        .copy-code-mini-btn:hover { border-color: #713b17; color: #713b17; }

        .claim-link-row { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: #713b17; text-decoration: none; }
        .claim-link-row:hover { text-decoration: underline; }
        .claim-link-box { justify-content: center !important; padding-top: 4px; }
        .claim-link-box a { display: inline-flex; align-items: center; gap: 5px; color: #713b17; font-weight: 750; text-decoration: none; }
        .claim-link-box a:hover { text-decoration: underline; }

        .price-tx-list { display: flex; flex-direction: column; gap: 10px; }
        .price-tx-card { display: flex; flex-direction: column; gap: 10px; padding: 16px 18px; background: #fdfcfb; border: 1px solid #eae8e3; border-radius: 14px; }
        .price-tx-main { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .price-tx-main h4 { margin: 0; font-size: 13px; font-weight: 800; color: var(--text); }
        .price-tx-main small { display: block; margin-top: 2px; font-size: 10.5px; color: var(--muted); }
        .price-tx-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }

        .tx-record-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; border-top: 1px dashed #e6e0d6; padding-top: 8px; }
        .tx-action-btn { display: inline-flex; align-items: center; gap: 4px; padding: 5px 9px; border-radius: 8px; font-size: 10.5px; font-weight: 700; cursor: pointer; transition: all 0.15s ease; border: 1px solid #dedbd4; background: #ffffff; color: #374151; }
        .tx-action-btn:hover, .tx-action-btn.active { background: #fdf5ef; border-color: #713b17; color: #713b17; }
        .tx-action-btn.invoice { background: #fdf5ef; border-color: #e2cbb5; color: #713b17; }
        .tx-action-btn.invoice:hover { background: #713b17; border-color: #713b17; color: #ffffff; }

        .tx-summary-panel { background: #ffffff; border: 1px solid #e6e0d6; border-radius: 10px; padding: 9px 11px; display: flex; flex-direction: column; gap: 4px; }
        .tx-summary-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #713b17; }
        .tx-summary-head code { background: #faf8f5; border: 1px solid #ece6dc; padding: 1.5px 6px; border-radius: 5px; font-size: 10px; color: #374151; text-transform: none; }
        .tx-summary-panel p { margin: 0; font-size: 11px; line-height: 1.45; color: #374151; }
        .tx-summary-panel b { color: #111827; font-weight: 750; }
        .tx-summary-panel code { background: #faf8f5; border: 1px solid #ece6dc; padding: 1px 5px; border-radius: 4px; font-size: 10px; color: #111827; }
        .redeem-hint-line { color: #57534e !important; font-size: 10.5px !important; }

        .receipt-details-card { text-align: left; background: #faf8f5; border: 1px solid #ece6dc; border-radius: 11px; padding: 10px 12px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 5px; font-size: 11px; color: #374151; }
        .receipt-details-card > div { display: flex; justify-content: space-between; gap: 8px; }
        .receipt-details-card span { color: #6b7280; }
        .receipt-details-card code { font-family: monospace; font-size: 10px; color: #111827; }
        .redeem-note-box { display: block !important; border-top: 1px dashed #e6e0d6; padding-top: 6px; margin-top: 2px; line-height: 1.4; }

        .modal-invoice-actions { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }

        .status-pill { font-size: 9px; font-weight: 750; padding: 3px 8px; border-radius: 5px; text-transform: uppercase; white-space: nowrap; }
        .status-pill.active, .status-pill.success { background: #dcfce7; color: #166534; }
        .status-pill.pending, .status-pill.processing { background: #fef3c7; color: #92400e; }
        .status-pill.failed, .status-pill.cancelled { background: #fee2e2; color: #991b1b; }
        .status-pill.redeemed { background: #f3f4f6; color: #4b5563; }

        .scroll-top-btn { position: fixed; right: 20px; bottom: 22px; width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #713b17 0%, #3d1f10 100%); color: #fff; border: 1px solid rgba(255, 255, 255, 0.18); display: grid; place-items: center; cursor: pointer; box-shadow: 0 10px 24px rgba(61, 31, 16, 0.35); z-index: 900; transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .scroll-top-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 28px rgba(61, 31, 16, 0.45); }

        .modal-overlay { position: fixed !important; inset: 0 !important; background: rgba(15, 12, 10, 0.78) !important; backdrop-filter: blur(12px) !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 999999 !important; padding: 16px !important; box-sizing: border-box !important; }
        .modal { background: #ffffff !important; border: 1px solid #eae6df !important; border-radius: 22px !important; width: 100% !important; max-width: 420px !important; padding: 26px !important; box-shadow: 0 35px 70px rgba(0, 0, 0, 0.3) !important; position: relative !important; max-height: 90vh !important; overflow-y: auto !important; box-sizing: border-box !important; color: #1a1612 !important; }

        .modal-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
        .modal-kicker { font-size: 9.5px; font-weight: 800; color: #713b17; letter-spacing: 1.2px; display: block; margin-bottom: 3px; }
        .modal-header h2 { margin: 0; font-size: 17px; font-weight: 800; color: #1a1612; }
        .modal-close { background: #f4f1ec; border: 0; width: 32px; height: 32px; border-radius: 10px; cursor: pointer; display: grid; place-items: center; color: #1a1612; transition: background 0.2s; flex-shrink: 0; }
        .modal-close:hover { background: #eae6df; }

        .denomination-range-badge { display: flex; align-items: center; gap: 8px; background: #f5eee6; border: 1px solid #e7dcd0; padding: 9px 12px; border-radius: 11px; font-size: 11px; color: #57534e; margin-bottom: 16px; }
        .denomination-range-badge svg { color: #713b17; flex-shrink: 0; }
        .denomination-range-badge b { color: #713b17; font-weight: 750; }

        .modal-label { font-size: 11px; font-weight: 700; display: block; margin-bottom: 6px; color: #44403c; }
        .bills-input-wrap { display: flex; align-items: center; border: 1px solid #d6d3d1; border-radius: 11px; padding: 0 12px; background: #fafaf9; transition: all 0.2s; }
        .bills-input-wrap:focus-within { border-color: #713b17; background: #fff; box-shadow: 0 0 0 3px rgba(113, 59, 23, 0.12); }
        .currency-prefix { font-weight: 750; color: #713b17; margin-right: 8px; font-size: 13px; }
        .bills-input-wrap input { border: 0; outline: 0; width: 100%; background: transparent; padding: 11px 0; font-size: 14px; font-weight: 700; color: #1a1612; }
        .bills-input-wrap input::placeholder { color: #a8a29e; font-weight: 500; }

        .price-preview-box { margin-bottom: 14px; padding: 11px 13px; background: #f5eee6; border: 1px solid #e7dcd0; border-radius: 11px; display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 11.5px; }
        .price-preview-box span { color: #57534e; font-weight: 650; }
        .price-preview-box strong { color: #713b17; font-size: 14px; font-weight: 800; }

        .secure-note { margin: 0 0 16px; font-size: 10.5px; color: #78716c; display: flex; align-items: center; gap: 6px; }
        .secure-icon { color: #16a34a; flex-shrink: 0; }

        .modal-submit { width: 100%; padding: 13px; background: linear-gradient(135deg, #713b17 0%, #3d1f10 100%); color: #fff; font-weight: 800; border-radius: 11px; border: 0; cursor: pointer; font-size: 12.5px; box-shadow: 0 6px 20px rgba(113, 59, 23, 0.3); transition: all 0.2s; }
        .modal-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 25px rgba(113, 59, 23, 0.45); }
        .modal-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .success-state-box { text-align: center; padding: 8px 0; }
        .success-icon { width: 56px; height: 56px; border-radius: 50%; background: #dcfce7; color: #166534; display: grid; place-items: center; margin: 0 auto 14px; border: 1px solid #bbf7d0; }
        .success-state-box h3 { margin: 0 0 6px; font-size: 16px; font-weight: 800; color: #1a1612; }
        .success-state-box p { margin: 0 0 14px; font-size: 11.5px; color: #78716c; }
        .revealed-code-box { margin: 12px 0; padding: 12px; background: #f5eee6; border: 1px dashed #713b17; border-radius: 11px; font-size: 14px; color: #713b17; letter-spacing: 1.4px; font-weight: 800; text-align: center; word-break: break-all; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .copy-code-pill-btn { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; border: 1px solid #d6c3ae; background: #ffffff; color: #713b17; font-size: 10.5px; font-weight: 700; letter-spacing: 0; cursor: pointer; }
        .copy-code-pill-btn:hover { background: #713b17; color: #ffffff; border-color: #713b17; }

        @media (max-width: 768px) {
          .giftcards-page-container { gap: 7px; }
          .giftcards-header-row { gap: 5px; }
          .gift-segmented-tabs { width: 100%; overflow-x: auto; padding: 3px; border-radius: 9px; gap: 4px; }
          .gift-tab-btn { flex: 1; justify-content: center; padding: 6px 8px; font-size: 9px; gap: 4px; border-radius: 7px; }
          .header-action-pills { width: 100%; justify-content: space-between; gap: 5px; }
          .currency-dropdown-toggle, .wallet-balance-pill { padding: 5px 8px; font-size: 9.5px; border-radius: 8px; gap: 4px; }

          .gift-search-card { padding: 8px; border-radius: 10px; }
          .gift-filter-bar { gap: 6px; }
          .gift-search-input { height: 32px; padding: 0 8px; gap: 6px; border-radius: 7px; }
          .gift-search-input input { font-size: 10px; }
          .filter-chip { padding: 3.5px 7px; font-size: 8.5px; border-radius: 6px; }

          .gift-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
          .gift-card { padding: 8px; min-height: 0; gap: 5px; border-radius: 10px; }
          .gift-card-top { gap: 4px; }
          .brand-logo-icon { font-size: 15px; }
          .gift-brand-img { width: 18px; height: 18px; border-radius: 4px; }
          .category-tag { font-size: 7px; padding: 1.5px 4px; border-radius: 4px; max-width: 68px; overflow: hidden; text-overflow: ellipsis; }
          .gift-card h3 { font-size: 10px; line-height: 1.2; }
          .gift-card-desc { display: none; }
          .gift-card-footer { padding-top: 5px; gap: 4px; }
          .gift-card-footer small { font-size: 7.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .buy-gift-link { font-size: 8.5px; gap: 2px; }

          .my-gifts-grid { gap: 7px; }
          .my-gift-item-card { padding: 10px; gap: 7px; border-radius: 10px; }
          .my-gift-top h4 { font-size: 11px; }
          .my-gift-top small { font-size: 8px; }
          .gc-amount { font-size: 11px; }
          .code-box { padding: 7px 9px; font-size: 9px; border-radius: 7px; }
          .status-pill { font-size: 7.5px; padding: 2px 5px; }

          .price-tx-card { padding: 10px 12px; border-radius: 10px; }
          .price-tx-main h4 { font-size: 11px; }
          .price-tx-main small { font-size: 8.5px; }

          .scroll-top-btn { right: 14px; bottom: 16px; width: 36px; height: 36px; }
          .modal { padding: 18px 16px !important; border-radius: 18px !important; }
        }
      `}</style>
    </div>
  );
}