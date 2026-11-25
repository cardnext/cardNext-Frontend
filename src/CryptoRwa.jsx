// CryptoRwa.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck, Check, X,
  Wallet, Network, ArrowUpRight, ArrowDownLeft, Search, Copy, Coins, ChevronDown, Loader2, AlertCircle, Lock
} from "lucide-react";

const CURRENCIES = {
  NGN: { symbol: "₦", rate: 1500, label: "NGN (₦)", name: "Nigerian Naira" },
  USD: { symbol: "$", rate: 1, label: "USD ($)", name: "US Dollar" },
  EUR: { symbol: "€", rate: 0.92, label: "EUR (€)", name: "Euro" },
  GBP: { symbol: "£", rate: 0.79, label: "GBP (£)", name: "British Pound" }
};

export default function CryptoRwaPage() {
  const [userId, setUserId] = useState(() => localStorage.getItem("userId") || null);
  const [cryptoAssets, setCryptoAssets] = useState([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [isServiceActive, setIsServiceActive] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [tradeType, setTradeType] = useState("Buy");
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [depositAddressGenerated, setDepositAddressGenerated] = useState(false);
  const [generatedAddressData, setGeneratedAddressData] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const [currentCurrency, setCurrentCurrency] = useState("NGN");
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const currencyDropdownRef = useRef(null);

  const [baseNetWorthUSD, setBaseNetWorthUSD] = useState(0);
  const [baseLiquidityUSD, setBaseLiquidityUSD] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target)) {
        setIsCurrencyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const activeUserId = localStorage.getItem("userId");
    if (!activeUserId || activeUserId === "null" || activeUserId === "undefined") {
      setUserId(null);
      setIsLoadingAssets(false);
      return;
    }
    setUserId(activeUserId);

    fetch(`http://localhost:5000/api/wallet/balance/${activeUserId}`)
      .then(res => res.json())
      .then(data => {
        if (data?.success) {
          const balance = Number(data.walletBalance || 0);
          setBaseNetWorthUSD(balance / CURRENCIES.NGN.rate);
          setBaseLiquidityUSD(balance / CURRENCIES.NGN.rate);
        }
      })
      .catch(() => {});

    fetch(`http://localhost:5000/api/wallet/transactions/${activeUserId}`)
      .then(res => res.json())
      .then(data => {
        if (data?.success && Array.isArray(data.transactions)) {
          setRecentTransactions(data.transactions);
        }
      })
      .catch(() => {});

    setIsLoadingAssets(true);
    fetch("http://localhost:5000/api/crypto/assets")
      .then(res => res.json())
      .then(data => {
        if (data?.success && data.data) {
          const rawAssets = Array.isArray(data.data) ? data.data : (data.data.data || []);
          if (rawAssets.length > 0) {
            const formattedAssets = rawAssets.map((item, idx) => {
              const sym = (item.symbol || "AST").toUpperCase();
              return {
                id: `${sym.toLowerCase()}-${idx}`,
                name: item.name || sym,
                symbol: sym,
                basePriceUSD: item.min_deposit_usd ? Number(item.min_deposit_usd) * 100 : 1000,
                change: "+0.0%",
                balance: `0.000 ${sym}`,
                icon: sym.slice(0, 1),
                networks: Array.isArray(item.networks)
                  ? item.networks.map(netSlug => ({
                      label: typeof netSlug === "string" ? netSlug.toUpperCase() : (netSlug?.label || String(netSlug)),
                      value: typeof netSlug === "string" ? netSlug : (netSlug?.value || String(netSlug))
                    }))
                  : []
              };
            });
            setCryptoAssets(formattedAssets);
            setIsServiceActive(true);
          } else {
            setIsServiceActive(false);
          }
        } else {
          setIsServiceActive(false);
        }
      })
      .catch(err => {
        console.error("Gateway connection error:", err);
        setIsServiceActive(false);
      })
      .finally(() => {
        setIsLoadingAssets(false);
      });
  }, []);

  const formatCurrencyValue = (amountUSD) => {
    const curr = CURRENCIES[currentCurrency] || CURRENCIES.NGN;
    const converted = Number(amountUSD || 0) * curr.rate;
    return `${curr.symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleActionTrigger = async () => {
    if (!userId || userId === "null" || userId === "undefined") {
      alert("Active session required. Please log in.");
      return;
    }
    if (!selectedAsset) return;

    if (tradeType === "Deposit") {
      if (!selectedNetwork) return;
      setIsProcessing(true);
      try {
        const response = await fetch("http://localhost:5000/api/crypto/deposit-address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: Number(userId),
            asset: selectedAsset.symbol.toLowerCase(),
            network: selectedNetwork
          })
        });
        const result = await response.json();
        if (response.ok && result?.success) {
          setGeneratedAddressData(result.data || {});
          setDepositAddressGenerated(true);
        } else {
          alert(result?.message || "Failed to generate deposit address.");
        }
      } catch (err) {
        console.error("Backend Connection Error:", err);
        alert("Unable to reach backend server.");
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    const numericAmt = Number(amount);
    if (!numericAmt || numericAmt <= 0) return;
    setIsProcessing(true);

    try {
      if (tradeType === "Sell") {
        const response = await fetch("http://localhost:5000/api/crypto/sell", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: Number(userId),
            assetSymbol: selectedAsset.symbol,
            cryptoAmount: numericAmt,
            fiatCurrency: currentCurrency,
            exchangeRate: selectedAsset.basePriceUSD * CURRENCIES[currentCurrency].rate
          })
        });
        const result = await response.json();
        if (response.ok && result?.success) {
          setSuccessModal(true);
        } else {
          alert(result?.message || "Trade execution failed.");
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 900));
        setSuccessModal(true);
      }
    } catch (err) {
      console.error("Trade Execution Error:", err);
      alert("Network error connecting to trade engine.");
    } finally {
      setIsProcessing(false);
    }
  };

  const closeModal = () => {
    setSelectedAsset(null);
    setAmount("");
    setSuccessModal(false);
    setDepositAddressGenerated(false);
    setSelectedNetwork("");
    setGeneratedAddressData(null);
    setCopied(false);
  };

  const filteredAssets = cryptoAssets.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openQuickAction = (type) => {
    if (!isServiceActive || cryptoAssets.length === 0) return;
    const first = cryptoAssets[0];
    setSelectedAsset(first);
    setTradeType(type);
    setSelectedNetwork(type === "Deposit" ? (first.networks[0]?.value || "") : "");
  };

  if (!userId) {
    return (
      <div className="crypto-session-lock animate-fade-in">
        <Lock size={30} style={{ color: "#d97706", marginBottom: "10px" }} />
        <h2>Session Required</h2>
        <p>Please log in to access your crypto portfolio and vaults.</p>
        <button type="button" onClick={() => { window.location.href = "/login"; }}>
          Go to Login
        </button>
      </div>
    );
  }

  const activeDepositAddress =
    generatedAddressData?.address ||
    generatedAddressData?.deposit_address ||
    "0x713b17849eF98230b412392dCardNextVault";

  return (
    <div className="crypto-workspace-container animate-fade-in">
      <div className="crypto-dashboard-inner">
        <div className="crypto-topbar-row">
          <div className="search-bar-wrap">
            <Search size={15} className="search-ico" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="custom-dropdown-container" ref={currencyDropdownRef}>
            <button
              type="button"
              className={`currency-dropdown-toggle ${isCurrencyDropdownOpen ? "open" : ""}`}
              onClick={() => setIsCurrencyDropdownOpen(v => !v)}
            >
              <Coins size={14} className="currency-toggle-icon" />
              <span className="currency-display-text">{currentCurrency} <small>({CURRENCIES[currentCurrency].symbol})</small></span>
              <ChevronDown size={13} className={`chevron-icon ${isCurrencyDropdownOpen ? "rotate" : ""}`} />
            </button>

            {isCurrencyDropdownOpen && (
              <div className="currency-dropdown-menu">
                <div className="dropdown-menu-header">Currency</div>
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

        <div className="dashboard-grid-body">
          <div className="dashboard-primary-column">
            <div className="row-split-top">
              <div className="vault-glass-card">
                <div className="vault-mesh-glow" />
                <div className="floating-bubble bubble-1" />
                <div className="floating-bubble bubble-2" />

                <div className="card-top-row">
                  <div className="vault-currency-badge">
                    <span className="badge-currency-code">{currentCurrency}</span>
                  </div>
                  <div className="card-brand-emblem">
                    <span className={`emblem-dot ${isServiceActive ? "" : "inactive-dot"}`} />
                    <span className="emblem-text">{isServiceActive ? "VAULT" : "OFFLINE"}</span>
                  </div>
                </div>

                <div className="card-mid-row">
                  <small>Net Worth</small>
                  <h3 className="vault-balance-display">{formatCurrencyValue(baseNetWorthUSD)}</h3>
                </div>

                <div className="card-bot-row">
                  <div className="holder-meta">
                    <span>Holder</span>
                    <strong>CARDNEXT USER</strong>
                  </div>
                  <div className={`vault-status-badge ${isServiceActive ? "" : "inactive-badge"}`}>
                    <ShieldCheck size={11} /> <span>{isServiceActive ? "Active" : "Offline"}</span>
                  </div>
                </div>
              </div>

              <div className="categories-card">
                <div className="card-section-title">
                  <span>Actions</span>
                </div>
                <div className="category-actions-grid">
                  <div
                    role="button"
                    tabIndex={0}
                    className="cat-item"
                    onClick={() => openQuickAction("Buy")}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openQuickAction("Buy");
                      }
                    }}
                  >
                    <div className="cat-ico"><ArrowDownLeft size={15} /></div>
                    <span>Buy</span>
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    className="cat-item"
                    onClick={() => openQuickAction("Sell")}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openQuickAction("Sell");
                      }
                    }}
                  >
                    <div className="cat-ico"><ArrowUpRight size={15} /></div>
                    <span>Sell</span>
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    className="cat-item"
                    onClick={() => openQuickAction("Deposit")}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openQuickAction("Deposit");
                      }
                    }}
                  >
                    <div className="cat-ico"><Wallet size={15} /></div>
                    <span>Deposit</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="row-split-bottom">
              <div className="widget-card">
                <div className="card-section-title">
                  <span>Assets</span>
                  <span className="more-link">{isServiceActive ? "Live" : "Offline"}</span>
                </div>
                <div className="mini-asset-list no-scrollbar">
                  {isLoadingAssets ? (
                    <div className="empty-state-box">
                      <Loader2 size={15} className="spinning-loader" /> <span>Loading...</span>
                    </div>
                  ) : !isServiceActive ? (
                    <div className="service-inactive-box">
                      <AlertCircle size={18} className="inactive-warn-ico" />
                      <div>
                        <strong>Gateway Offline</strong>
                        <p>Crypto service is currently unavailable.</p>
                      </div>
                    </div>
                  ) : filteredAssets.length > 0 ? (
                    filteredAssets.map(item => (
                      <div
                        role="button"
                        tabIndex={0}
                        className="mini-asset-row"
                        key={item.id}
                        onClick={() => {
                          setSelectedAsset(item);
                          setTradeType("Deposit");
                          setSelectedNetwork(item.networks[0]?.value || "");
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedAsset(item);
                            setTradeType("Deposit");
                            setSelectedNetwork(item.networks[0]?.value || "");
                          }
                        }}
                      >
                        <div className="left-info">
                          <span className="symbol-badge">{item.icon}</span>
                          <div>
                            <strong>{item.name}</strong>
                            <small>{item.symbol} · {(item.networks || []).length} nets</small>
                          </div>
                        </div>
                        <div className="right-info">
                          <strong>{item.symbol}</strong>
                          <span className="pos-gain">{item.change}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state-box">No assets found.</div>
                  )}
                </div>
              </div>

              <div className="widget-card">
                <div className="card-section-title">
                  <span>Activity</span>
                  <span className="more-link">Ledger</span>
                </div>
                <div className="mini-tx-list no-scrollbar">
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map((tx, idx) => {
                      const txType = (tx.type || "").toLowerCase();
                      const isCredit = ["deposit", "credit", "bank_deposit"].includes(txType);
                      const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;
                      return (
                        <div className="mini-tx-row" key={tx.id || tx.reference || idx}>
                          <div className="tx-ico-wrap"><Icon size={13} /></div>
                          <div className="tx-info">
                            <strong>{tx.title || tx.type || "Order"}</strong>
                            <small>{tx.date || (tx.created_at ? new Date(tx.created_at).toLocaleDateString() : "")}</small>
                          </div>
                          <span className={`tx-amt ${isCredit ? "credit" : "neutral"}`}>
                            {isCredit ? "+" : "-"}{formatCurrencyValue(Number(tx.amount || 0) / CURRENCIES.NGN.rate)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty-state-box">No recent activity.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-stats-column">
            <div className="stats-panel-card">
              <div className="card-section-title">
                <span>Liquidity</span>
              </div>
              <div className="stats-circle-wrap">
                <div className="circular-progress-ring">
                  <div className="ring-inner">
                    <small>Available</small>
                    <h3 className="liquidity-val-display">{formatCurrencyValue(baseLiquidityUSD)}</h3>
                  </div>
                </div>
              </div>

              <div className="stats-chart-section">
                <div className="chart-header-row">
                  <span>Yield</span>
                  <span className="yield-tag">0.0% APY</span>
                </div>
                <div className="bar-graph-container">
                  <div className="bar-col" style={{ height: "20%" }} />
                  <div className="bar-col" style={{ height: "20%" }} />
                  <div className="bar-col" style={{ height: "20%" }} />
                  <div className="bar-col active" style={{ height: "25%" }} />
                  <div className="bar-col" style={{ height: "20%" }} />
                  <div className="bar-col" style={{ height: "20%" }} />
                </div>
                <div className="chart-months-row">
                  <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedAsset && (
        <div className="modal-overlay animate-fade-in" onClick={closeModal}>
          <div className="modal luxury-modal animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-kicker">{currentCurrency} GATEWAY</span>
                <h2>{tradeType === "Deposit" ? `Deposit ${selectedAsset.name}` : `${tradeType} ${selectedAsset.name}`}</h2>
                <p>{selectedAsset.symbol} · {(selectedAsset.networks || []).length} networks</p>
              </div>
              <button type="button" className="modal-close" onClick={closeModal} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <div className="modal-scrollable-body">
              {successModal ? (
                <div className="success-state-container animate-pop">
                  <div className="success-icon-glow-ring">
                    <div className="success-icon-inner">
                      <Check size={28} strokeWidth={2.8} />
                    </div>
                  </div>
                  <div className="success-text-block">
                    <h3>Order Executed</h3>
                    <p>Balances synced.</p>
                  </div>
                  <button type="button" className="modal-submit premium-btn success-action-btn" onClick={closeModal}>
                    Done
                  </button>
                </div>
              ) : depositAddressGenerated ? (
                <div className="success-state-box animate-pop">
                  <div className="deposit-vault-card">
                    <div className="vault-glow-accent" />
                    <div className="deposit-header-tag">
                      <span className="asset-badge-mini">{selectedAsset.symbol}</span>
                      <span className="network-tag-badge"><b>{selectedNetwork.toUpperCase()}</b></span>
                    </div>

                    <div className="address-display-area">
                      <small>Deposit Address</small>
                      <code>{activeDepositAddress}</code>
                    </div>

                    <button
                      type="button"
                      className={`copy-address-btn ${copied ? "copied-state" : ""}`}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(activeDepositAddress);
                        } catch {}
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                    >
                      <Copy size={13} style={{ marginRight: "5px", display: "inline", verticalAlign: "middle" }} />
                      {copied ? "Copied" : "Copy Address"}
                    </button>
                  </div>

                  <div className="vault-info-banner">
                    <ShieldCheck size={14} className="banner-ico" />
                    <span>Send only <b>{selectedAsset.symbol}</b> on <b>{selectedNetwork.toUpperCase()}</b>.</span>
                  </div>

                  <button type="button" className="modal-submit premium-btn" onClick={closeModal} style={{ marginTop: "14px" }}>
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="trip-tabs" style={{ marginBottom: "16px" }}>
                    <button type="button" className={tradeType === "Buy" ? "active" : ""} onClick={() => setTradeType("Buy")}>Buy</button>
                    <button type="button" className={tradeType === "Sell" ? "active" : ""} onClick={() => setTradeType("Sell")}>Sell</button>
                    <button
                      type="button"
                      className={tradeType === "Deposit" ? "active" : ""}
                      onClick={() => {
                        setTradeType("Deposit");
                        if (selectedAsset.networks.length > 0) setSelectedNetwork(selectedAsset.networks[0].value);
                      }}
                    >
                      Deposit
                    </button>
                  </div>

                  {tradeType === "Deposit" ? (
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label className="dropdown-label"><Network size={13} /> Network</label>
                      <div className="network-grid-selector">
                        {(selectedAsset.networks || []).length > 0 ? (
                          selectedAsset.networks.map(net => (
                            <div
                              key={net.value}
                              role="button"
                              tabIndex={0}
                              className={`network-pill-card ${selectedNetwork === net.value ? "active" : ""}`}
                              onClick={() => setSelectedNetwork(net.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setSelectedNetwork(net.value);
                                }
                              }}
                            >
                              <span className="net-radio-dot" />
                              <span className="net-name">{net.label}</span>
                            </div>
                          ))
                        ) : (
                          <div className="empty-state-box">No networks available.</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label className="field-sub-label">Amount ({currentCurrency})</label>
                      <div className="bills-input-wrap">
                        <span>{CURRENCIES[currentCurrency].symbol}</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={amount}
                          onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                        />
                      </div>
                    </div>
                  )}

                  <p className="secure-note" style={{ marginBottom: "16px" }}>
                    <ShieldCheck size={13} /> <span>Protected execution.</span>
                  </p>

                  <button
                    type="button"
                    className="modal-submit premium-btn"
                    onClick={handleActionTrigger}
                    disabled={isProcessing || (tradeType !== "Deposit" && (!amount || Number(amount) <= 0))}
                  >
                    {isProcessing ? "Processing..." : tradeType === "Deposit" ? "Generate Address" : `Confirm ${tradeType}`}
                  </button>
                </>
              )}
            </div>
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
        .spinning-loader { animation: spin 1s linear infinite; display: inline-block; }

        .crypto-session-lock { padding: 48px 20px; text-align: center; background: #fdfbf7; border-radius: 20px; border: 1px solid #eae5de; }
        .crypto-session-lock h2 { font-size: 18px; font-weight: 900; color: #111827; margin: 0 0 6px; }
        .crypto-session-lock p { font-size: 12px; color: #6b7280; max-width: 360px; margin: 0 auto 18px; }
        .crypto-session-lock button { background: #0f172a; color: #fff; border: 0; padding: 11px 22px; border-radius: 11px; font-size: 12px; font-weight: 700; cursor: pointer; }

        .crypto-workspace-container { display: flex; flex-direction: column; width: 100%; box-sizing: border-box; }
        .crypto-dashboard-inner { display: flex; flex-direction: column; gap: 20px; width: 100%; }

        .crypto-topbar-row { display: flex; align-items: center; gap: 10px; width: 100%; flex-wrap: wrap; }
        .search-bar-wrap { display: flex; align-items: center; background: #16120e; border: 1px solid #28201a; border-radius: 13px; padding: 0 14px; gap: 10px; flex: 1; min-width: 200px; height: 44px; box-sizing: border-box; box-shadow: 0 4px 20px rgba(0,0,0,0.25); transition: all 0.25s ease; }
        .search-bar-wrap:focus-within { border-color: #8c4a1e; box-shadow: 0 0 0 3px rgba(113,59,23,0.22); }
        .search-ico { color: #8c7a6b; flex-shrink: 0; }
        .search-bar-wrap input { width: 100%; background: transparent; border: 0; padding: 8px 0; color: #fff; font-size: 12.5px; outline: none; font-family: inherit; }
        .search-bar-wrap input::placeholder { color: #8c7a6b; }

        .custom-dropdown-container { position: relative; user-select: none; }
        .currency-dropdown-toggle { display: inline-flex; align-items: center; gap: 8px; padding: 0 14px; background: linear-gradient(135deg, #221a14 0%, #16120e 100%); border: 1px solid #3d2416; border-radius: 13px; height: 44px; font-size: 12.5px; color: #f3dfc1; font-weight: 800; cursor: pointer; transition: all .2s ease; box-shadow: 0 6px 20px rgba(0,0,0,0.3); box-sizing: border-box; white-space: nowrap; }
        .currency-dropdown-toggle:hover, .currency-dropdown-toggle.open { border-color: #8c4a1e; background: linear-gradient(135deg, #2b2018 0%, #1c1713 100%); }
        .currency-toggle-icon { color: #f3dfc1; }
        .currency-display-text { font-weight: 800; }
        .currency-display-text small { color: #bca897; font-weight: 600; font-size: 11px; margin-left: 2px; }
        .chevron-icon { transition: transform .2s ease; color: #8c7a6b; }
        .chevron-icon.rotate { transform: rotate(180deg); color: #f3dfc1; }

        .currency-dropdown-menu { position: absolute; right: 0; top: calc(100% + 6px); width: 210px; background: #16120e; border: 1px solid #3d2416; border-radius: 14px; box-shadow: 0 20px 40px rgba(0,0,0,0.85); z-index: 100; overflow: hidden; animation: fadeInMenu 0.16s ease-out; }
        @keyframes fadeInMenu { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

        .dropdown-menu-header { padding: 10px 14px; font-size: 9.5px; font-weight: 800; color: #8c7a6b; text-transform: uppercase; letter-spacing: 0.9px; border-bottom: 1px solid #28201a; background: #120e0b; }
        .currency-dropdown-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; cursor: pointer; transition: background .15s; border-bottom: 1px solid #28201a; }
        .currency-dropdown-item:last-child { border-bottom: 0; }
        .currency-dropdown-item:hover { background: #241d17; }
        .currency-dropdown-item.selected { background: #2c1e15; }

        .currency-info-meta { display: flex; flex-direction: column; gap: 1px; }
        .currency-info-meta strong { font-size: 12.5px; color: #fff; font-weight: 750; }
        .currency-info-meta span { font-size: 10px; color: #8c7a6b; font-weight: 500; }
        .currency-symbol-tag { font-size: 12px; font-weight: 800; color: #f3dfc1; background: rgba(140,74,30,0.3); padding: 2px 7px; border-radius: 6px; }

        .dashboard-grid-body { display: grid; grid-template-columns: 1fr 310px; gap: 20px; width: 100%; }
        @media (max-width: 1100px) { .dashboard-grid-body { grid-template-columns: 1fr; } }

        .dashboard-primary-column { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
        .row-split-top { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; }
        @media (max-width: 700px) { .row-split-top { grid-template-columns: 1fr; } }

        .vault-glass-card { position: relative; overflow: hidden; background: linear-gradient(135deg, #2b170a 0%, #16120e 55%, #0f0b08 100%); border: 1px solid #4a2b16; border-radius: 20px; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; min-height: 150px; box-shadow: 0 16px 40px rgba(0,0,0,0.55); }
        .vault-mesh-glow { position: absolute; inset: 0; background: radial-gradient(circle at 80% 20%, rgba(140,74,30,0.2) 0%, transparent 60%); pointer-events: none; }
        .floating-bubble { position: absolute; border-radius: 50%; background: radial-gradient(circle, rgba(243,223,193,0.18) 0%, rgba(113,59,23,0.04) 70%); pointer-events: none; }
        .bubble-1 { width: 100px; height: 100px; top: -35px; right: -25px; animation: floatBubble 6s ease-in-out infinite alternate; }
        .bubble-2 { width: 64px; height: 64px; bottom: -20px; left: 36px; animation: floatBubble 4s ease-in-out infinite alternate-reverse; }
        @keyframes floatBubble { 0% { transform: translateY(0) scale(1); } 100% { transform: translateY(-8px) scale(1.06); } }

        .card-top-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; z-index: 2; }
        .vault-currency-badge { background: rgba(140, 74, 30, 0.25); border: 1px solid rgba(140, 74, 30, 0.4); padding: 2px 9px; border-radius: 7px; }
        .badge-currency-code { font-size: 10px; font-weight: 850; color: #f3dfc1; letter-spacing: 0.9px; }

        .card-brand-emblem { display: flex; align-items: center; gap: 5px; background: rgba(255,255,255,0.06); padding: 3px 9px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); }
        .emblem-dot { width: 6px; height: 6px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 8px #4ade80; }
        .emblem-dot.inactive-dot { background: #f87171; box-shadow: 0 0 8px #f87171; }
        .emblem-text { font-size: 8.5px; font-weight: 800; color: #ebd8c8; letter-spacing: 0.7px; }

        .card-mid-row { z-index: 2; margin: 10px 0; }
        .card-mid-row small { color: #a39081; font-size: 9.5px; display: block; margin-bottom: 3px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.9px; }

        .vault-balance-display { margin: 0; font-size: 24px; font-weight: 900; color: #fff; letter-spacing: -0.7px; font-variant-numeric: tabular-nums; background: linear-gradient(180deg, #ffffff 0%, #ebd8c8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .liquidity-val-display { font-variant-numeric: tabular-nums; font-weight: 850; }

        .card-bot-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px; z-index: 2; }
        .holder-meta span { display: block; font-size: 9px; color: #8c7a6b; font-weight: 600; text-transform: uppercase; }
        .holder-meta strong { font-size: 10.5px; color: #fff; letter-spacing: 1px; font-weight: 800; }
        .vault-status-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; color: #4ade80; background: rgba(74,222,128,0.1); padding: 3px 9px; border-radius: 7px; font-weight: 700; border: 1px solid rgba(74,222,128,0.2); white-space: nowrap; }
        .vault-status-badge.inactive-badge { color: #f87171; background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.2); }

        .service-inactive-box { display: flex; align-items: center; gap: 10px; background: rgba(248, 113, 113, 0.08); border: 1px solid rgba(248, 113, 113, 0.25); padding: 14px; border-radius: 12px; text-align: left; }
        .inactive-warn-ico { color: #f87171; flex-shrink: 0; }
        .service-inactive-box strong { font-size: 11.5px; color: #fff; display: block; margin-bottom: 2px; font-weight: 800; }
        .service-inactive-box p { font-size: 10.5px; color: #bca897; margin: 0; }

        .empty-state-box { text-align: center; padding: 20px 12px; color: #8c7a6b; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 6px; }

        .categories-card { background: #16120e; border: 1px solid #28201a; border-radius: 20px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 8px 25px rgba(0,0,0,0.3); }
        .card-section-title { display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; font-weight: 800; color: #fff; margin-bottom: 10px; }
        .more-link { font-size: 10.5px; color: #f3dfc1; font-weight: 700; }
        .category-actions-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .cat-item { background: #1c1713; border: 1px solid #2b221b; border-radius: 12px; padding: 10px 6px; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; transition: all 0.2s ease; }
        .cat-item:hover { border-color: #8c4a1e; background: #241d17; transform: translateY(-1px); }
        .cat-ico { width: 32px; height: 32px; border-radius: 9px; background: rgba(113,59,23,0.3); color: #f3dfc1; display: grid; place-items: center; }
        .cat-item span { font-size: 10px; font-weight: 700; color: #c5b6a7; text-align: center; }

        .row-split-bottom { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 700px) { .row-split-bottom { grid-template-columns: 1fr; } }
        .widget-card { background: #16120e; border: 1px solid #28201a; border-radius: 20px; padding: 18px; box-shadow: 0 8px 25px rgba(0,0,0,0.3); }

        .mini-asset-list { display: flex; flex-direction: column; gap: 7px; max-height: 250px; overflow-y: auto; }
        .mini-asset-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 11px; background: #1c1713; border: 1px solid #28201a; border-radius: 11px; cursor: pointer; transition: 0.2s; }
        .mini-asset-row:hover { border-color: #8c4a1e; background: #231b15; }
        .left-info { display: flex; align-items: center; gap: 9px; min-width: 0; }
        .symbol-badge { width: 30px; height: 30px; background: rgba(113,59,23,0.25); color: #f3dfc1; border-radius: 9px; display: grid; place-items: center; font-weight: 800; font-size: 12.5px; flex-shrink: 0; }
        .left-info strong { font-size: 11px; color: #fff; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .left-info small { font-size: 9.5px; color: #8c7a6b; }
        .right-info { text-align: right; flex-shrink: 0; }
        .right-info strong { font-size: 11px; color: #fff; display: block; }
        .pos-gain { font-size: 9.5px; color: #4ade80; font-weight: 750; }

        .mini-tx-list { display: flex; flex-direction: column; gap: 7px; max-height: 250px; overflow-y: auto; }
        .mini-tx-row { display: flex; align-items: center; justify-content: space-between; padding: 9px 11px; background: #1c1713; border: 1px solid #28201a; border-radius: 11px; gap: 8px; }
        .tx-ico-wrap { width: 26px; height: 26px; border-radius: 50%; background: #241d17; color: #f3dfc1; display: grid; place-items: center; flex-shrink: 0; }
        .tx-info { flex: 1; min-width: 0; }
        .tx-info strong { font-size: 11px; color: #fff; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tx-info small { font-size: 9px; color: #8c7a6b; }
        .tx-amt { font-size: 10.5px; font-weight: 750; white-space: nowrap; font-variant-numeric: tabular-nums; }
        .tx-amt.credit { color: #4ade80; }
        .tx-amt.neutral { color: #fff; }

        .dashboard-stats-column { display: flex; flex-direction: column; }
        .stats-panel-card { background: #16120e; border: 1px solid #28201a; border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 18px; height: 100%; box-sizing: border-box; box-shadow: 0 8px 25px rgba(0,0,0,0.3); }
        .stats-circle-wrap { display: flex; justify-content: center; align-items: center; padding: 6px 0; }
        .circular-progress-ring { width: 146px; height: 146px; border-radius: 50%; background: radial-gradient(circle, #16120e 60%, transparent 61%), conic-gradient(#8c4a1e 0deg, #3d1f10 360deg); display: grid; place-items: center; box-shadow: 0 0 25px rgba(113,59,23,0.2); }
        .ring-inner { text-align: center; padding: 0 8px; }
        .ring-inner small { color: #8c7a6b; font-size: 9px; display: block; margin-bottom: 2px; }
        .ring-inner h3 { margin: 0; font-size: 15.5px; font-weight: 800; color: #fff; }

        .stats-chart-section { display: flex; flex-direction: column; gap: 10px; flex: 1; justify-content: flex-end; }
        .chart-header-row { display: flex; justify-content: space-between; font-size: 10.5px; color: #8c7a6b; font-weight: 700; }
        .yield-tag { color: #4ade80; background: rgba(74,222,128,0.1); padding: 2px 7px; border-radius: 4px; font-size: 9px; }
        .bar-graph-container { display: flex; align-items: flex-end; justify-content: space-between; height: 96px; padding: 0 6px; border-bottom: 1px solid #28201a; gap: 8px; }
        .bar-col { width: 11px; background: #28201a; border-radius: 5px 5px 0 0; }
        .bar-col.active { background: linear-gradient(to top, #8c4a1e, #f3dfc1); box-shadow: 0 0 12px rgba(140,74,30,0.5); }
        .chart-months-row { display: flex; justify-content: space-between; font-size: 9px; color: #8c7a6b; padding: 0 4px; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(5,4,3,0.85); backdrop-filter: blur(10px); display: grid; place-items: center; z-index: 1000; padding: 16px; box-sizing: border-box; }
        .luxury-modal { background: #16120e; border: 1px solid #3d2416; border-radius: 22px; width: 100%; max-width: 420px; max-height: 85vh; padding: 24px; box-shadow: 0 30px 70px rgba(0,0,0,0.85); position: relative; display: flex; flex-direction: column; box-sizing: border-box; }
        .modal-scrollable-body { overflow-y: auto; max-height: calc(85vh - 90px); }

        .modal-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 16px; flex-shrink: 0; }
        .modal-kicker { font-size: 9px; font-weight: 800; color: #f3dfc1; letter-spacing: 1.2px; display: block; margin-bottom: 3px; }
        .modal-header h2 { margin: 0; font-size: 17px; font-weight: 800; color: #fff; }
        .modal-header p { margin: 3px 0 0; font-size: 11px; color: #8c7a6b; }
        .modal-close { background: #241d17; border: 1px solid #3d2416; color: #fff; width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center; cursor: pointer; transition: 0.2s; flex-shrink: 0; }
        .modal-close:hover { background: #2f251e; }

        .trip-tabs { display: flex; gap: 4px; background: #1c1713; padding: 4px; border-radius: 11px; border: 1px solid #28201a; }
        .trip-tabs button { flex: 1; padding: 8px; border-radius: 9px; background: transparent; border: 0; color: #8c7a6b; font-size: 11px; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .trip-tabs button.active { background: #8c4a1e; color: #fff; box-shadow: 0 4px 12px rgba(140,74,30,0.4); }

        .dropdown-label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 750; color: #fff; margin-bottom: 8px; }
        .field-sub-label { font-size: 10.5px; color: #8c7a6b; display: block; margin-bottom: 6px; font-weight: 700; }
        .network-grid-selector { display: flex; flex-direction: column; gap: 6px; max-height: 160px; overflow-y: auto; }

        .network-pill-card { display: flex; align-items: center; gap: 10px; padding: 11px 14px; background: #1c1713; border: 1px solid #28201a; border-radius: 12px; cursor: pointer; transition: 0.2s; box-sizing: border-box; }
        .network-pill-card:hover { border-color: #55331c; }
        .network-pill-card.active { border-color: #8c4a1e; background: #241d17; }
        .net-radio-dot { width: 10px; height: 10px; border-radius: 50%; border: 2px solid #8c7a6b; display: inline-block; }
        .network-pill-card.active .net-radio-dot { border-color: #f3dfc1; background: #8c4a1e; }
        .net-name { font-size: 11.5px; font-weight: 750; color: #fff; }

        .bills-input-wrap { display: flex; align-items: center; background: #1c1713; border: 1px solid #28201a; border-radius: 12px; padding: 0 14px; transition: 0.2s; box-sizing: border-box; }
        .bills-input-wrap:focus-within { border-color: #8c4a1e; box-shadow: 0 0 0 3px rgba(140,74,30,0.2); }
        .bills-input-wrap span { color: #f3dfc1; font-weight: 800; font-size: 15px; }
        .bills-input-wrap input { width: 100%; background: transparent; border: 0; padding: 12px 10px; color: #fff; font-size: 15px; font-weight: 700; outline: none; box-sizing: border-box; }

        .secure-note { display: flex; align-items: center; gap: 6px; font-size: 10.5px; color: #8c7a6b; margin: 0; }

        .premium-btn { width: 100%; padding: 12px; background: linear-gradient(135deg, #8c4a1e 0%, #713b17 100%); color: #fff; font-weight: 800; border-radius: 12px; border: 1px solid rgba(243,223,193,0.15); cursor: pointer; font-size: 12.5px; box-shadow: 0 6px 20px rgba(113,59,23,0.45); transition: all 0.2s ease; box-sizing: border-box; }
        .premium-btn:hover:not(:disabled) { background: linear-gradient(135deg, #a25522, #8c4a1e); }
        .premium-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .success-state-container { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 8px 0 4px; }
        .success-icon-glow-ring { width: 64px; height: 64px; border-radius: 50%; background: rgba(74,222,128,0.08); border: 1px solid rgba(74,222,128,0.25); display: grid; place-items: center; margin-bottom: 14px; }
        .success-icon-inner { width: 46px; height: 46px; border-radius: 50%; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; display: grid; place-items: center; }
        .success-text-block h3 { margin: 0 0 6px; font-size: 18px; font-weight: 850; color: #fff; }
        .success-text-block p { margin: 0 0 18px; font-size: 12px; color: #a39081; }
        .success-action-btn { margin-top: 2px; }

        .deposit-vault-card { position: relative; background: linear-gradient(135deg, #1c1713 0%, #120e0b 100%); border: 1px solid #3d2416; border-radius: 16px; padding: 16px; text-align: center; margin-bottom: 12px; overflow: hidden; box-sizing: border-box; }
        .vault-glow-accent { position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, #8c4a1e, transparent); }
        .deposit-header-tag { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 10.5px; }
        .asset-badge-mini { background: rgba(140,74,30,0.25); color: #f3dfc1; padding: 2px 8px; border-radius: 6px; font-weight: 800; border: 1px solid rgba(140,74,30,0.4); }
        .network-tag-badge { color: #bca897; }
        .network-tag-badge b { color: #fff; }
        .address-display-area { background: #0a0806; padding: 10px 12px; border-radius: 10px; border: 1px solid #28201a; margin-bottom: 12px; text-align: center; box-sizing: border-box; }
        .address-display-area small { display: block; color: #8c7a6b; font-size: 9px; text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 4px; }
        .address-display-area code { font-size: 11px; font-weight: 800; color: #f3dfc1; word-break: break-all; line-height: 1.35; }

        .copy-address-btn { background: #281e17; border: 1px solid #4a2e1d; color: #f3dfc1; width: 100%; padding: 9px; border-radius: 9px; font-weight: 750; font-size: 11px; cursor: pointer; transition: all 0.2s ease; box-sizing: border-box; }
        .copy-address-btn:hover { background: #3d2416; color: #fff; border-color: #8c4a1e; }
        .copy-address-btn.copied-state { background: rgba(74, 222, 128, 0.15); border-color: #4ade80; color: #4ade80; }

        .vault-info-banner { display: flex; align-items: center; gap: 7px; background: rgba(113,59,23,0.12); border: 1px solid rgba(113,59,23,0.3); padding: 10px 12px; border-radius: 10px; text-align: left; font-size: 10.5px; color: #bca897; line-height: 1.35; box-sizing: border-box; }
        .vault-info-banner .banner-ico { color: #f3dfc1; flex-shrink: 0; }
        .vault-info-banner b { color: #fff; }

        @media (max-width: 768px) {
          .crypto-dashboard-inner { gap: 8px; }
          .crypto-topbar-row { gap: 6px; }
          .search-bar-wrap { height: 36px; padding: 0 10px; gap: 7px; border-radius: 10px; min-width: 140px; }
          .search-bar-wrap input { font-size: 10.5px; }
          .currency-dropdown-toggle { height: 36px; padding: 0 10px; font-size: 10px; border-radius: 10px; gap: 5px; }
          .currency-display-text small { font-size: 9px; }

          .dashboard-grid-body, .dashboard-primary-column, .row-split-top, .row-split-bottom { gap: 8px; }

          .vault-glass-card { padding: 12px; min-height: 0; border-radius: 13px; }
          .vault-currency-badge { padding: 2px 7px; border-radius: 6px; }
          .badge-currency-code { font-size: 8.5px; }
          .card-brand-emblem { padding: 2px 7px; gap: 4px; }
          .emblem-text { font-size: 7.5px; }
          .card-mid-row { margin: 7px 0; }
          .card-mid-row small { font-size: 8px; margin-bottom: 2px; }
          .vault-balance-display { font-size: 18px; letter-spacing: -0.4px; }
          .card-bot-row { padding-top: 8px; }
          .holder-meta span { font-size: 7.5px; }
          .holder-meta strong { font-size: 9px; }
          .vault-status-badge { font-size: 8px; padding: 2px 7px; border-radius: 6px; }

          .categories-card, .widget-card, .stats-panel-card { padding: 11px; border-radius: 13px; gap: 10px; }
          .card-section-title { font-size: 11px; margin-bottom: 7px; }
          .more-link { font-size: 9px; }
          .category-actions-grid { gap: 6px; }
          .cat-item { padding: 8px 4px; border-radius: 10px; gap: 4px; }
          .cat-ico { width: 26px; height: 26px; border-radius: 8px; }
          .cat-item span { font-size: 8.5px; }

          .mini-asset-list, .mini-tx-list { gap: 5px; max-height: 200px; }
          .mini-asset-row, .mini-tx-row { padding: 7px 9px; border-radius: 9px; gap: 6px; }
          .left-info { gap: 7px; }
          .symbol-badge { width: 24px; height: 24px; border-radius: 7px; font-size: 10.5px; }
          .left-info strong, .right-info strong { font-size: 10px; }
          .left-info small, .pos-gain { font-size: 8px; }
          .tx-ico-wrap { width: 22px; height: 22px; }
          .tx-info strong, .tx-amt { font-size: 9.5px; }
          .tx-info small { font-size: 8px; }

          .circular-progress-ring { width: 118px; height: 118px; }
          .ring-inner small { font-size: 8px; }
          .ring-inner h3 { font-size: 13px; }
          .bar-graph-container { height: 72px; gap: 5px; }
          .bar-col { width: 8px; }
          .chart-header-row, .chart-months-row { font-size: 8px; }

          .luxury-modal { padding: 18px 16px; border-radius: 18px; }
        }
      `}</style>
    </div>
  );
}