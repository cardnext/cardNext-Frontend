import React, { useState, useEffect } from "react";
import {
  User, Shield, Bell, Globe, Key, Check, Copy, Eye, EyeOff,
  Camera, Lock, ShieldCheck, ExternalLink, RefreshCw, AlertCircle, Loader2, ArrowUp
} from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("Profile");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [metaMaximized, setMetaMaximized] = useState(false);

  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const userEmail = localStorage.getItem("cardnext_user_email") || "";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(userEmail);
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const [twoFactor, setTwoFactor] = useState(true);
  const [biometric, setBiometric] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [marketingNotifs, setMarketingNotifs] = useState(false);
  const [currency, setCurrency] = useState("NGN (₦)");

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("cardnext_theme") || "Dark Mode (Beta)";
  });

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setShowScrollTop(y > 240);
      setMetaMaximized(y > 60);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const themeKey = theme.includes("Dark") ? "dark" : "light";
    localStorage.setItem("cardnext_theme", theme);
    document.documentElement.setAttribute("data-theme", themeKey);
  }, [theme]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userEmail) {
        setIsFetching(false);
        setErrorMessage("No active user email found. Please log in again.");
        return;
      }

      setIsFetching(true);
      setErrorMessage("");
      try {
        const response = await fetch(`http://localhost:5000/api/settings/profile/${encodeURIComponent(userEmail)}`);
        const result = await response.json();

        if (response.ok && result?.success && result.user) {
          setFullName(result.user.fullName || "");
          setEmail(result.user.email || userEmail);
          setPhone(result.user.phone || "");
          setBio(result.user.bio || "");
          if (result.user.fullName) {
            localStorage.setItem("cardnext_user_name", result.user.fullName);
          }
        } else {
          setErrorMessage(result?.message || "Could not load profile details.");
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        setErrorMessage("Unable to load profile data from server.");
      } finally {
        setIsFetching(false);
      }
    };

    fetchUserProfile();
  }, [userEmail]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setSaveSuccess(false);

    try {
      const response = await fetch("http://localhost:5000/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fullName, phone, bio })
      });

      const result = await response.json();
      if (response.ok && result?.success) {
        localStorage.setItem("cardnext_user_name", fullName);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setErrorMessage(result?.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error("Profile update error:", err);
      setErrorMessage("Network error: Could not reach backend server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPasswordCode = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMessage("New passwords do not match.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSaveSuccess(false);

    try {
      const response = await fetch("http://localhost:5000/api/settings/request-password-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, currentPassword, newPassword })
      });

      const result = await response.json();
      if (response.ok && result?.success) {
        setRequiresVerification(true);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setErrorMessage(result?.message || "Failed to request verification code.");
      }
    } catch (err) {
      console.error("Password code request error:", err);
      setErrorMessage("Network error: Could not reach backend server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndChangePassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("http://localhost:5000/api/settings/verify-and-change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword, verificationCode })
      });

      const result = await response.json();
      if (response.ok && result?.success) {
        setSaveSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setVerificationCode("");
        setRequiresVerification(false);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setErrorMessage(result?.message || "Failed to verify code and update password.");
      }
    } catch (err) {
      console.error("Password verification error:", err);
      setErrorMessage("Network error: Could not reach backend server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard?.writeText("ck_live_8f3a19e24b0711eebe560242ac120002");
    } catch {}
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  if (isFetching) {
    return (
      <div className="settings-loading-state">
        <Loader2 size={28} className="spin" />
        <span>Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="settings-container animate-fade-in">
      <section className={`settings-hero-card ${metaMaximized ? "hero-meta-active" : ""}`}>
        <div className="hero-profile-info">
          <div className="hero-avatar-wrapper">
            <span className="hero-avatar-initials">
              {fullName ? fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() : "CN"}
            </span>
            <button type="button" className="avatar-edit-badge" title="Change Avatar" aria-label="Change Avatar">
              <Camera size={12} />
            </button>
          </div>
          <div className="hero-profile-details">
            <div className="hero-name-row">
              <h2>{fullName || "CardNext User"}</h2>
              <span className="tier-badge"><ShieldCheck size={11} /> Tier 3</span>
            </div>
            <p>{email || "No email"} {phone ? `· ${phone}` : ""}</p>
          </div>
        </div>

        <div className={`hero-stats ${metaMaximized ? "scroll-maximized" : ""}`}>
          <div className="stat-pill">
            <small>ID</small>
            <strong>CN-8839201</strong>
          </div>
          <div className="stat-pill">
            <small>Joined</small>
            <strong>Mar 2026</strong>
          </div>
        </div>
      </section>

      <nav className="settings-tab-nav no-scrollbar">
        {[
          { id: "Profile", label: "Profile", icon: User },
          { id: "Security", label: "Security", icon: Shield },
          { id: "Notifications", label: "Alerts", icon: Bell },
          { id: "Preferences", label: "Preferences", icon: Globe },
          { id: "API", label: "API", icon: Key },
        ].map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            className={`tab-item ${activeTab === id ? "active" : ""}`}
            onClick={() => {
              setActiveTab(id);
              setErrorMessage("");
              setSaveSuccess(false);
            }}
          >
            <Icon size={14} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {saveSuccess && (
        <div className="settings-alert-banner animate-pop">
          <Check size={15} />
          <span>{requiresVerification ? "Verification code sent." : "Changes saved."}</span>
        </div>
      )}

      {errorMessage && (
        <div className="settings-error-banner animate-pop">
          <AlertCircle size={15} />
          <span>{errorMessage}</span>
        </div>
      )}

      {activeTab === "Profile" && (
        <form className="settings-panel" onSubmit={handleSaveProfile}>
          <div className="panel-header">
            <div>
              <h3>Personal Details</h3>
              <p>Update your name, phone, and bio.</p>
            </div>
            <button type="submit" className="save-btn-primary" disabled={isLoading}>
              {isLoading ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
              <span>Save</span>
            </button>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="settings-fullname">Full Name</label>
              <div className="input-field-wrap">
                <input
                  id="settings-fullname"
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="settings-email">Email</label>
              <div className="input-field-wrap disabled">
                <input id="settings-email" type="email" value={email} disabled />
                <Lock size={14} className="input-icon-right" />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="settings-phone">Phone</label>
              <div className="input-field-wrap">
                <input
                  id="settings-phone"
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+234..."
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="settings-tier">Tier Status</label>
              <div className="input-field-wrap disabled">
                <input id="settings-tier" type="text" value="BVN & NIN Verified (Tier 3)" disabled />
                <Lock size={14} className="input-icon-right" />
              </div>
            </div>

            <div className="form-group full-width">
              <label htmlFor="settings-bio">Bio</label>
              <div className="input-field-wrap">
                <input
                  id="settings-bio"
                  type="text"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Short note"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {activeTab === "Security" && (
        <div className="settings-panel">
          <div className="panel-header">
            <div>
              <h3>Security</h3>
              <p>2FA, biometrics, and password settings.</p>
            </div>
          </div>

          <div className="toggle-list">
            <div className="toggle-card">
              <div className="toggle-info">
                <strong>Two-Factor Authentication (2FA)</strong>
                <p>Require code for withdrawals and transfers.</p>
              </div>
              <label className="switch">
                <input type="checkbox" checked={twoFactor} onChange={() => setTwoFactor(v => !v)} />
                <span className="slider" />
              </label>
            </div>

            <div className="toggle-card">
              <div className="toggle-info">
                <strong>Biometric Access</strong>
                <p>Authorize payments with FaceID or fingerprint.</p>
              </div>
              <label className="switch">
                <input type="checkbox" checked={biometric} onChange={() => setBiometric(v => !v)} />
                <span className="slider" />
              </label>
            </div>
          </div>

          <hr className="panel-divider" />

          {!requiresVerification ? (
            <form className="panel-subsection" onSubmit={handleRequestPasswordCode}>
              <h4>Update Password</h4>
              <p className="field-hint">
                Min 8 chars with uppercase, lowercase, number, and symbol (1 change per month).
              </p>
              <div className="form-grid" style={{ marginTop: "12px" }}>
                <div className="form-group full-width">
                  <label htmlFor="current-pass">Current Password</label>
                  <div className="input-field-wrap">
                    <input
                      id="current-pass"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      className="icon-action-btn"
                      onClick={() => setShowCurrentPassword(v => !v)}
                      aria-label="Toggle current password visibility"
                    >
                      {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="new-pass">New Password</label>
                  <div className="input-field-wrap">
                    <input
                      id="new-pass"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      className="icon-action-btn"
                      onClick={() => setShowNewPassword(v => !v)}
                      aria-label="Toggle new password visibility"
                    >
                      {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="confirm-pass">Confirm Password</label>
                  <div className="input-field-wrap">
                    <input
                      id="confirm-pass"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      className="icon-action-btn"
                      onClick={() => setShowConfirmPassword(v => !v)}
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="panel-action-row">
                <button type="submit" className="save-btn-primary" disabled={isLoading}>
                  {isLoading && <Loader2 size={14} className="spin" />}
                  <span>Send Code</span>
                </button>
              </div>
            </form>
          ) : (
            <form className="panel-subsection" onSubmit={handleVerifyAndChangePassword}>
              <h4>Verification Code</h4>
              <p className="field-hint">
                Enter the 6-digit code sent to <strong>{email}</strong>.
              </p>
              <div className="form-grid" style={{ marginTop: "12px" }}>
                <div className="form-group full-width">
                  <label htmlFor="verify-code">6-Digit Code</label>
                  <div className="input-field-wrap">
                    <input
                      id="verify-code"
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={e => setVerificationCode(e.target.value)}
                      placeholder="123456"
                      required
                      style={{ letterSpacing: "4px", fontSize: "15px", fontWeight: "700" }}
                    />
                  </div>
                </div>
              </div>
              <div className="panel-action-row" style={{ gap: "10px" }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setRequiresVerification(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn-primary" disabled={isLoading}>
                  {isLoading ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {activeTab === "Notifications" && (
        <div className="settings-panel">
          <div className="panel-header">
            <div>
              <h3>Notifications</h3>
              <p>Choose how you receive alerts.</p>
            </div>
          </div>

          <div className="toggle-list">
            <div className="toggle-card">
              <div className="toggle-info">
                <strong>Email Alerts</strong>
                <p>Receipts and activity confirmations.</p>
              </div>
              <label className="switch">
                <input type="checkbox" checked={emailNotifs} onChange={() => setEmailNotifs(v => !v)} />
                <span className="slider" />
              </label>
            </div>

            <div className="toggle-card">
              <div className="toggle-info">
                <strong>Push Alerts</strong>
                <p>Real-time security and status updates.</p>
              </div>
              <label className="switch">
                <input type="checkbox" checked={pushNotifs} onChange={() => setPushNotifs(v => !v)} />
                <span className="slider" />
              </label>
            </div>

            <div className="toggle-card">
              <div className="toggle-info">
                <strong>Product News</strong>
                <p>New features and rate updates.</p>
              </div>
              <label className="switch">
                <input type="checkbox" checked={marketingNotifs} onChange={() => setMarketingNotifs(v => !v)} />
                <span className="slider" />
              </label>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Preferences" && (
        <div className="settings-panel">
          <div className="panel-header">
            <div>
              <h3>Preferences</h3>
              <p>Currency and theme settings.</p>
            </div>
            <button
              type="button"
              className="save-btn-primary"
              onClick={() => {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
              }}
            >
              <Check size={14} />
              <span>Save</span>
            </button>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="pref-currency">Display Currency</label>
              <div className="input-field-wrap">
                <select id="pref-currency" value={currency} onChange={e => setCurrency(e.target.value)}>
                  <option>NGN (₦)</option>
                  <option>USD ($)</option>
                  <option>GBP (£)</option>
                  <option>EUR (€)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="pref-theme">Theme</label>
              <div className="input-field-wrap">
                <select id="pref-theme" value={theme} onChange={e => setTheme(e.target.value)}>
                  <option>Dark Mode (Beta)</option>
                  <option>Light Modern</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "API" && (
        <div className="settings-panel">
          <div className="panel-header">
            <div>
              <h3>API & Webhooks</h3>
              <p>Secret keys and callback endpoints.</p>
            </div>
            <button type="button" className="secondary-btn">
              <RefreshCw size={13} />
              <span>Regenerate</span>
            </button>
          </div>

          <div className="api-box">
            <div className="api-box-info">
              <div className="api-title-row">
                <strong>Secret Key</strong>
                <span className="status-badge live">Live</span>
              </div>
              <div className="key-display-row">
                <code>
                  {showApiKey ? "ck_live_8f3a19e24b0711eebe560242ac120002" : "ck_live_••••••••••••••••••••••••••••••••"}
                </code>
                <button
                  type="button"
                  className="icon-action-btn"
                  onClick={() => setShowApiKey(v => !v)}
                  aria-label="Toggle API key visibility"
                >
                  {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <button type="button" className="copy-btn" onClick={handleCopyKey}>
              {copiedKey ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedKey ? "Copied" : "Copy"}</span>
            </button>
          </div>

          <div className="form-group" style={{ marginTop: "6px" }}>
            <label htmlFor="api-webhook">Webhook URL</label>
            <div className="input-field-wrap">
              <input id="api-webhook" type="url" defaultValue="https://api.cardnext.tech/v1/webhooks/receiver" />
              <ExternalLink size={14} className="input-icon-right" />
            </div>
          </div>
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

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        .animate-fade-in { animation: fadeIn 0.25s ease forwards; }
        .animate-pop { animation: popIn 0.2s ease-out forwards; }
        .spin { animation: spin 1s linear infinite; }

        .settings-loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 72px 16px; color: var(--muted, #6b7280); font-size: 12px; font-weight: 650; }
        .settings-container { display: flex; flex-direction: column; gap: 18px; width: 100%; box-sizing: border-box; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }

        .settings-hero-card { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; padding: 22px 26px; border-radius: 16px; color: #fff; background: radial-gradient(ellipse at top right, #3d1f10 0%, #17130f 70%); border: 1px solid #3d2416; box-shadow: 0 10px 30px rgba(23, 19, 15, 0.14); box-sizing: border-box; transition: border-color 0.28s ease, box-shadow 0.28s ease; }
        .settings-hero-card.hero-meta-active { border-color: rgba(243, 199, 124, 0.45); box-shadow: 0 14px 34px rgba(61, 31, 16, 0.26); }

        .hero-profile-info { display: flex; align-items: center; gap: 16px; min-width: 0; }
        .hero-avatar-wrapper { position: relative; flex: 0 0 auto; }
        .hero-avatar-initials { width: 54px; height: 54px; border-radius: 50%; display: grid; place-items: center; background: linear-gradient(135deg, #f3c77c, #8c522b); color: #24160b; font-size: 18px; font-weight: 800; border: 2px solid #ffffff33; box-shadow: 0 6px 16px rgba(0,0,0,0.3); }
        .avatar-edit-badge { position: absolute; bottom: -2px; right: -2px; width: 22px; height: 22px; border-radius: 50%; border: 2px solid #17130f; background: #8c4a1e; color: #fff; display: grid; place-items: center; cursor: pointer; transition: transform 0.18s ease; }
        .avatar-edit-badge:hover { transform: scale(1.08); background: #8c522b; }
        .hero-profile-details { min-width: 0; }
        .hero-profile-details h2 { margin: 0; font-size: 18px; font-weight: 800; letter-spacing: -0.025em; color: #fff; }
        .hero-name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .tier-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; font-size: 9.5px; font-weight: 750; letter-spacing: 0.04em; background: #ffffff18; color: #f3c77c; border: 1px solid #ffffff24; white-space: nowrap; }
        .hero-profile-details p { margin: 4px 0 0; color: #c7b4a9; font-size: 11px; font-weight: 500; letter-spacing: 0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .hero-stats { display: flex; gap: 12px; border-left: 1px solid #ffffff1e; padding-left: 20px; align-items: center; transition: all 0.32s cubic-bezier(0.16, 1, 0.3, 1); transform-origin: right center; }
        @media (max-width: 768px) { .hero-stats { border-left: 0; padding-left: 0; gap: 8px; transform-origin: center; width: 100%; } }

        .stat-pill { padding: 8px 12px; border-radius: 10px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), padding 0.32s cubic-bezier(0.16, 1, 0.3, 1), background 0.32s ease, border-color 0.32s ease, box-shadow 0.32s ease; }
        .stat-pill small { display: block; color: #a79287; font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.09em; margin-bottom: 2px; transition: color 0.3s ease, font-size 0.3s ease; }
        .stat-pill strong { font-size: 12px; color: #fff; font-weight: 750; letter-spacing: 0.02em; font-variant-numeric: tabular-nums; transition: color 0.3s ease, font-size 0.3s ease; }

        .hero-stats.scroll-maximized .stat-pill { transform: scale(1.08); padding: 10px 15px; background: linear-gradient(135deg, rgba(243, 199, 124, 0.18), rgba(140, 74, 30, 0.28)); border-color: rgba(243, 199, 124, 0.55); box-shadow: 0 8px 22px rgba(0, 0, 0, 0.35); }
        .hero-stats.scroll-maximized .stat-pill small { color: #f3c77c; font-size: 9px; }
        .hero-stats.scroll-maximized .stat-pill strong { color: #fff7e6; font-size: 13.5px; }

        .settings-tab-nav { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; border-bottom: 1px solid var(--border, #e5e7eb); }
        .tab-item { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 9px; color: var(--muted, #6b7280); background: transparent; font-size: 11.5px; font-weight: 650; letter-spacing: 0.01em; white-space: nowrap; transition: all 0.18s ease; border: 0; cursor: pointer; }
        .tab-item:hover { color: var(--text, #111827); background: #eae6df; }
        .tab-item.active { color: #fff; background: #8c4a1e; box-shadow: 0 4px 12px rgba(140, 74, 30, 0.25); }

        .settings-alert-banner { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 10px; background: #eaf8f1; border: 1px solid rgba(19, 151, 104, 0.25); color: #117853; font-size: 11.5px; font-weight: 650; box-sizing: border-box; }
        .settings-error-banner { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 10px; background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; font-size: 11.5px; font-weight: 650; box-sizing: border-box; }

        .settings-panel { padding: 22px; border-radius: 14px; background: var(--card, #ffffff); border: 1px solid var(--border, #e5e7eb); box-shadow: 0 4px 20px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 18px; box-sizing: border-box; }
        .panel-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .panel-header h3 { margin: 0; font-size: 15.5px; font-weight: 800; letter-spacing: -0.02em; color: var(--text, #111827); }
        .panel-header p { margin: 3px 0 0; font-size: 11px; font-weight: 500; color: var(--muted, #6b7280); line-height: 1.4; }

        .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; width: 100%; box-sizing: border-box; }
        @media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } }
        .form-group { display: flex; flex-direction: column; gap: 5px; box-sizing: border-box; }
        .form-group.full-width { grid-column: 1 / -1; }
        .form-group label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.02em; color: #383e47; }
        .input-field-wrap { position: relative; display: flex; align-items: center; width: 100%; min-height: 40px; padding: 0 12px; border-radius: 9px; border: 1px solid #dedbd4; background: #fdfcfb; transition: border-color 0.18s, box-shadow 0.18s; box-sizing: border-box; }
        .input-field-wrap:focus-within { border-color: #8c4a1e; box-shadow: 0 0 0 3px rgba(140, 74, 30, 0.1); background: #fff; }
        .input-field-wrap input, .input-field-wrap select { width: 100%; border: 0; outline: 0; background: transparent; font-size: 12px; font-weight: 600; color: #111827; box-sizing: border-box; }
        .input-field-wrap.disabled { background: #f4f2ee; border-color: #e5e2db; opacity: 0.85; }
        .input-icon-right { color: #6b7280; margin-left: 8px; flex: 0 0 auto; }
        .field-hint { font-size: 10px; color: #6b7280; margin: 0; line-height: 1.35; }

        .save-btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 16px; border-radius: 8px; color: #fff; background: #8c4a1e; font-size: 11.5px; font-weight: 700; letter-spacing: 0.01em; border: 0; cursor: pointer; transition: background 0.18s; }
        .save-btn-primary:hover:not(:disabled) { background: #6d3412; }
        .save-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .secondary-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; color: #111827; background: #f4f1ec; border: 1px solid #e5e7eb; font-size: 11px; font-weight: 650; cursor: pointer; }
        .secondary-btn:hover { background: #eae6df; }

        .toggle-list { display: flex; flex-direction: column; gap: 10px; }
        .toggle-card { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 16px; border-radius: 10px; background: #fdfcfb; border: 1px solid #eae8e3; box-sizing: border-box; }
        .toggle-info strong { display: block; font-size: 12px; color: #111827; font-weight: 700; letter-spacing: -0.01em; margin-bottom: 2px; }
        .toggle-info p { margin: 0; font-size: 10.5px; color: #6b7280; line-height: 1.35; }

        .switch { position: relative; display: inline-block; width: 40px; height: 22px; flex: 0 0 auto; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; inset: 0; background-color: #d8d5ce; transition: 0.25s; border-radius: 22px; }
        .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: 0.25s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.15); }
        input:checked + .slider { background-color: #8c4a1e; }
        input:checked + .slider:before { transform: translateX(18px); }

        .api-box { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-radius: 10px; background: #17130f; color: #fff; border: 1px solid #322820; flex-wrap: wrap; box-sizing: border-box; }
        .api-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
        .api-title-row strong { font-size: 12px; font-weight: 700; }
        .status-badge { font-size: 8.5px; font-weight: 800; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.06em; }
        .status-badge.live { background: rgba(19, 151, 104, 0.25); color: #4ade80; border: 1px solid rgba(19, 151, 104, 0.3); }
        .key-display-row { display: flex; align-items: center; gap: 8px; }
        .key-display-row code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 10.5px; color: #f3c77c; background: rgba(255,255,255,0.08); padding: 3px 8px; border-radius: 6px; word-break: break-all; }
        .icon-action-btn { background: transparent; color: #6b7280; padding: 4px; border-radius: 4px; border: 0; cursor: pointer; display: inline-flex; align-items: center; }
        .api-box .icon-action-btn { color: #a89f91; }
        .icon-action-btn:hover { color: #8c4a1e; }
        .api-box .icon-action-btn:hover { color: #fff; }
        .copy-btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 12px; border-radius: 7px; background: rgba(255,255,255,0.12); color: #fff; font-size: 10.5px; font-weight: 650; border: 1px solid rgba(255,255,255,0.2); cursor: pointer; }
        .copy-btn:hover { background: rgba(255,255,255,0.2); }

        .panel-divider { border: 0; border-top: 1px solid #efede8; margin: 4px 0; }
        .panel-subsection h4 { margin: 0 0 4px; font-size: 13px; font-weight: 800; letter-spacing: -0.015em; color: #111827; }
        .panel-action-row { display: flex; justify-content: flex-end; margin-top: 14px; }

        .scroll-top-btn { position: fixed; right: 20px; bottom: 22px; width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #8c4a1e 0%, #3d1f10 100%); color: #fff; border: 1px solid rgba(255, 255, 255, 0.18); display: grid; place-items: center; cursor: pointer; box-shadow: 0 10px 24px rgba(61, 31, 16, 0.35); z-index: 900; transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .scroll-top-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 28px rgba(61, 31, 16, 0.45); }

        @media (max-width: 768px) {
          .settings-container { gap: 8px; }
          .settings-hero-card { padding: 12px 14px; border-radius: 12px; gap: 10px; }
          .hero-profile-info { gap: 10px; }
          .hero-avatar-initials { width: 42px; height: 42px; font-size: 14px; }
          .avatar-edit-badge { width: 18px; height: 18px; }
          .hero-profile-details h2 { font-size: 14px; }
          .tier-badge { font-size: 8px; padding: 2px 6px; }
          .hero-profile-details p { font-size: 9.5px; }
          .hero-stats { gap: 8px; }
          .stat-pill { flex: 1; padding: 6px 8px; border-radius: 8px; }
          .stat-pill small { font-size: 7.5px; }
          .stat-pill strong { font-size: 10px; }
          .hero-stats.scroll-maximized .stat-pill { transform: scale(1.04); padding: 7px 10px; }
          .hero-stats.scroll-maximized .stat-pill small { font-size: 8px; }
          .hero-stats.scroll-maximized .stat-pill strong { font-size: 11px; }

          .settings-tab-nav { gap: 4px; padding-bottom: 3px; }
          .tab-item { padding: 6px 10px; font-size: 9.5px; gap: 5px; border-radius: 7px; }

          .settings-alert-banner, .settings-error-banner { padding: 8px 11px; font-size: 10px; border-radius: 8px; }

          .settings-panel { padding: 12px; border-radius: 12px; gap: 11px; }
          .panel-header { gap: 8px; }
          .panel-header h3 { font-size: 12.5px; }
          .panel-header p { font-size: 9px; }

          .form-grid { gap: 9px; }
          .form-group { gap: 3px; }
          .form-group label { font-size: 9px; }
          .input-field-wrap { min-height: 34px; padding: 0 10px; border-radius: 8px; }
          .input-field-wrap input, .input-field-wrap select { font-size: 10px; }
          .field-hint { font-size: 8px; }

          .save-btn-primary { padding: 6.5px 12px; font-size: 9.5px; border-radius: 7px; }
          .secondary-btn { padding: 6px 10px; font-size: 9px; border-radius: 7px; }

          .toggle-list { gap: 6px; }
          .toggle-card { padding: 9px 11px; border-radius: 9px; gap: 8px; }
          .toggle-info strong { font-size: 10px; }
          .toggle-info p { font-size: 8.5px; }
          .switch { width: 34px; height: 19px; }
          .slider:before { height: 13px; width: 13px; left: 3px; bottom: 3px; }
          input:checked + .slider:before { transform: translateX(15px); }

          .api-box { padding: 10px 12px; border-radius: 9px; gap: 8px; }
          .api-title-row strong { font-size: 10px; }
          .status-badge { font-size: 7.5px; padding: 1.5px 5px; }
          .key-display-row code { font-size: 8.5px; padding: 2px 6px; }
          .copy-btn { padding: 5px 9px; font-size: 9px; border-radius: 6px; }

          .panel-subsection h4 { font-size: 11px; }
          .panel-action-row { margin-top: 10px; }

          .scroll-top-btn { right: 14px; bottom: 16px; width: 36px; height: 36px; }
        }
      `}</style>
    </div>
  );
}