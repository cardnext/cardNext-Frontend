// Auth.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Lock,
  ShieldCheck,
  ArrowRight,
  ChevronLeft,
  Check,
  X,
  KeyRound,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Eye,
  EyeOff,
  Clock
} from "lucide-react";

const SIGNUP_CODE_TTL_SECONDS = 300; // 5 minutes

const resolveApiBaseUrl = () => {
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
    // Ignore if process is unavailable in browser
  }

  return "http://localhost:5000";
};

const API_BASE_URL = resolveApiBaseUrl();

const formatLocalClock = (dateObj) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit"
    }).format(dateObj);
  } catch {
    const hours = dateObj.getHours();
    const minutes = String(dateObj.getMinutes()).padStart(2, "0");
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes}`;
  }
};

const formatCountdown = (totalSeconds) => {
  const safe = Math.max(0, Number(totalSeconds) || 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

function HoverLetters({ text, className = "", registerNode }) {
  const localRefs = useRef([]);

  const setLetterRef = useCallback(
    (idx) => (el) => {
      localRefs.current[idx] = el;
      if (registerNode) {
        registerNode(idx, el);
      }
    },
    [registerNode]
  );

  useEffect(() => {
    return () => {
      if (registerNode) {
        localRefs.current.forEach((_, idx) => registerNode(idx, null));
      }
    };
  }, [registerNode, text]);

  const chars = Array.from(text);

  return (
    <span className={`cn-hover-letters ${className}`}>
      {chars.map((char, idx) => (
        <span
          key={`${idx}-${char}`}
          ref={setLetterRef(idx)}
          className="cn-char"
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
}

function ErrorBadge({ message, centered = false }) {
  if (!message) return null;
  return (
    <div className={`cn-error-pill ${centered ? "centered" : ""}`} role="alert">
      <AlertCircle size={12} strokeWidth={2.2} className="cn-error-icon" />
      <span>{message}</span>
    </div>
  );
}

export default function AuthPage({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [viewState, setViewState] = useState("form"); // "form" | "verify" | "forgot" | "reset-code" | "direct-reset"
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [codeSecondsLeft, setCodeSecondsLeft] = useState(SIGNUP_CODE_TTL_SECONDS);
  const [verifiedResetCode, setVerifiedResetCode] = useState("");
  const [liveTime, setLiveTime] = useState(() => formatLocalClock(new Date()));

  const phoneCardRef = useRef(null);
  const orbRef = useRef(null);
  const pointerRef = useRef({ x: null, y: null, active: false });
  const orbCurrentRef = useRef({ x: 0, y: 0 });
  const letterNodesRef = useRef(new Set());
  const letterStatesRef = useRef(new Map());

  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);
  const lastAutoSubmittedOtpRef = useRef("");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    newPassword: "",
    confirmNewPassword: ""
  });

  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registerLetterNode = useCallback((_idx, el) => {
    if (!el) return;
    letterNodesRef.current.add(el);
    if (!letterStatesRef.current.has(el)) {
      letterStatesRef.current.set(el, { scale: 1, lift: 0 });
    }
  }, []);

  useEffect(() => {
    const syncClock = () => setLiveTime(formatLocalClock(new Date()));
    syncClock();

    const now = new Date();
    const msUntilNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    let intervalId = null;

    const timeoutId = setTimeout(() => {
      syncClock();
      intervalId = setInterval(syncClock, 30000);
    }, Math.max(250, msUntilNextMinute));

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (viewState !== "verify") return;
    if (codeSecondsLeft <= 0) return;

    const timer = setInterval(() => {
      setCodeSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [viewState, codeSecondsLeft]);

  useEffect(() => {
    let rafId = null;

    const tick = () => {
      const card = phoneCardRef.current;
      const pointer = pointerRef.current;

      if (card && orbRef.current) {
        let targetX = 0;
        let targetY = 0;

        if (pointer.active && pointer.x !== null && pointer.y !== null) {
          const rect = card.getBoundingClientRect();
          const localX = pointer.x - rect.left;
          const localY = pointer.y - rect.top;
          const baseX = rect.width * 0.68;
          const baseY = rect.height * 0.56;

          const dx = baseX - localX;
          const dy = baseY - localY;
          const dist = Math.hypot(dx, dy);
          const fleeRadius = 115;

          if (dist < fleeRadius) {
            const safeDist = Math.max(dist, 1);
            const strength = (fleeRadius - dist) / fleeRadius;
            const pushDist = strength * 58;
            targetX = Math.max(-95, Math.min(85, (dx / safeDist) * pushDist));
            targetY = Math.max(-130, Math.min(95, (dy / safeDist) * pushDist));
          }
        }

        const curr = orbCurrentRef.current;
        curr.x += (targetX - curr.x) * 0.16;
        curr.y += (targetY - curr.y) * 0.16;
        orbRef.current.style.transform = `translate3d(${curr.x.toFixed(2)}px, ${curr.y.toFixed(2)}px, 0)`;
      }

      const influenceRadius = 46;
      for (const el of Array.from(letterNodesRef.current)) {
        if (!el || !el.isConnected) {
          letterNodesRef.current.delete(el);
          letterStatesRef.current.delete(el);
          continue;
        }

        let targetScale = 1;
        let targetLift = 0;

        if (pointer.active && pointer.x !== null && pointer.y !== null) {
          const rect = el.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const dist = Math.hypot(pointer.x - centerX, pointer.y - centerY);

          if (dist < influenceRadius) {
            const t = 1 - dist / influenceRadius;
            const smoothT = t * t * (3 - 2 * t);
            targetScale = 1 + smoothT * 0.34;
            targetLift = -smoothT * 3;
          }
        }

        const state = letterStatesRef.current.get(el) || { scale: 1, lift: 0 };
        state.scale += (targetScale - state.scale) * 0.24;
        state.lift += (targetLift - state.lift) * 0.24;

        if (Math.abs(state.scale - 1) < 0.001 && Math.abs(state.lift) < 0.01) {
          state.scale = 1;
          state.lift = 0;
          el.style.transform = "translate3d(0, 0, 0) scale(1)";
        } else {
          el.style.transform = `translate3d(0, ${state.lift.toFixed(2)}px, 0) scale(${state.scale.toFixed(3)})`;
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const enterOtpView = useCallback((targetView) => {
    lastAutoSubmittedOtpRef.current = "";
    setOtpDigits(["", "", "", "", "", ""]);
    setViewState(targetView);
    setTimeout(() => otpRefs.current[0]?.focus(), 80);
  }, []);

  const handleCardMouseMove = (e) => {
    pointerRef.current = {
      x: e.clientX,
      y: e.clientY,
      active: true
    };
  };

  const handleCardMouseLeave = () => {
    pointerRef.current = {
      x: null,
      y: null,
      active: false
    };
  };

  const passwordCriteria = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[^A-Za-z0-9]/.test(formData.password)
  };

  const newPasswordCriteria = {
    length: formData.newPassword.length >= 8,
    uppercase: /[A-Z]/.test(formData.newPassword),
    number: /[0-9]/.test(formData.newPassword),
    special: /[^A-Za-z0-9]/.test(formData.newPassword)
  };

  const passwordScore = Object.values(passwordCriteria).filter(Boolean).length;
  const newPasswordScore = Object.values(newPasswordCriteria).filter(Boolean).length;
  const isPasswordStrong = passwordScore === 4;
  const isNewPasswordStrong = newPasswordScore === 4;

  const handleKeyDownCheck = (e) => {
    if (e.getModifierState) {
      setCapsLockOn(e.getModifierState("CapsLock"));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleOtpChange = (index, value) => {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      const updated = [...otpDigits];
      updated[index] = "";
      setOtpDigits(updated);
      lastAutoSubmittedOtpRef.current = "";
      return;
    }

    const updated = [...otpDigits];
    updated[index] = clean.slice(-1);
    setOtpDigits(updated);
    setErrors({});

    if (index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
      lastAutoSubmittedOtpRef.current = "";
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!pasted) return;
    const updated = ["", "", "", "", "", ""];
    pasted.split("").forEach((char, idx) => {
      updated[idx] = char;
    });
    setOtpDigits(updated);
    const nextFocus = Math.min(pasted.length, 5);
    otpRefs.current[nextFocus]?.focus();
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setResendCooldown(60);
    setErrors({});
    setSuccessMessage("New code sent.");
    lastAutoSubmittedOtpRef.current = "";

    if (viewState === "verify") {
      setCodeSecondsLeft(SIGNUP_CODE_TTL_SECONDS);
    }
    if (viewState === "reset-code") {
      setVerifiedResetCode("");
    }

    try {
      const endpoint =
        viewState === "reset-code"
          ? `${API_BASE_URL}/api/auth/forgot-password`
          : `${API_BASE_URL}/api/auth/resend-verification`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (
        res.ok &&
        viewState === "verify" &&
        typeof data.expiresInSeconds === "number"
      ) {
        setCodeSecondsLeft(data.expiresInSeconds);
      }
    } catch {
      // Cooldown still active
    }
  };

  const renderEyeButton = (isVisible, onToggle, label) => (
    <button
      type="button"
      className="cn-eye-btn"
      onClick={onToggle}
      aria-label={label}
      title={label}
    >
      {isVisible ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );

  const renderStrengthRules = (value, criteria, score) => {
    if (!value || value.length === 0) return null;
    return (
      <div className="cn-pass-rules">
        <div className="cn-strength-bars">
          {[1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className={`cn-strength-seg ${
                score >= level
                  ? score <= 2
                    ? "weak"
                    : score === 3
                    ? "medium"
                    : "strong"
                  : ""
              }`}
            />
          ))}
        </div>
        <div className="cn-rules-grid">
          <span className={criteria.length ? "ok" : ""}>
            {criteria.length ? <Check size={10} /> : <X size={10} />} 8+ chars
          </span>
          <span className={criteria.uppercase ? "ok" : ""}>
            {criteria.uppercase ? <Check size={10} /> : <X size={10} />} Uppercase
          </span>
          <span className={criteria.number ? "ok" : ""}>
            {criteria.number ? <Check size={10} /> : <X size={10} />} Number
          </span>
          <span className={criteria.special ? "ok" : ""}>
            {criteria.special ? <Check size={10} /> : <X size={10} />} Symbol
          </span>
        </div>
      </div>
    );
  };

  const validate = (type, customOtp = null) => {
    const newErrors = {};
    const otpString = customOtp !== null ? customOtp : otpDigits.join("");
    const trimmedEmail = formData.email.trim();

    if (type === "forgot") {
      if (!trimmedEmail || !/\S+@\S+\.\S+/.test(trimmedEmail)) {
        newErrors.email = "Enter a valid email address";
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    if (type === "reset-code") {
      if (otpString.length < 6) {
        newErrors.resetCode = "Enter all 6 verification digits";
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    if (type === "direct-reset") {
      const activeCode = verifiedResetCode || otpString;
      if (!activeCode || activeCode.length < 6) {
        newErrors.newPassword = "Enter the 6-digit reset code first";
      }
      if (!isNewPasswordStrong) {
        newErrors.newPassword = "Password must meet all 4 strength rules";
      }
      if (formData.newPassword !== formData.confirmNewPassword) {
        newErrors.confirmNewPassword = "Passwords do not match";
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    if (type === "verify") {
      if (codeSecondsLeft <= 0) {
        newErrors.verificationCode =
          "Code expired. Click Resend code for a new one.";
      } else if (otpString.length < 6) {
        newErrors.verificationCode = "Enter all 6 verification digits";
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    if (!trimmedEmail || !/\S+@\S+\.\S+/.test(trimmedEmail)) {
      newErrors.email = "Enter a valid email address";
    }

    if (!isSignUp) {
      if (!formData.password || formData.password.length < 6) {
        newErrors.password = "Enter your account password";
      }
    }

    if (isSignUp) {
      if (!formData.fullName.trim()) {
        newErrors.fullName = "Enter your full name";
      }
      if (!isPasswordStrong) {
        newErrors.password = "Complete all password requirements below";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const verifyResetCodeRequest = useCallback(
    async (codeToVerify) => {
      const trimmedEmail = formData.email.trim();
      if (!validate("reset-code", codeToVerify)) return;
      setIsSubmitting(true);
      setErrors({});
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/verify-reset-code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail, code: codeToVerify })
        });
        const data = await res.json();
        setIsSubmitting(false);
        if (res.ok) {
          setVerifiedResetCode(codeToVerify);
          setViewState("direct-reset");
          setSuccessMessage("");
        } else {
          setVerifiedResetCode("");
          setErrors({ resetCode: data.message || "Verification code is invalid" });
        }
      } catch {
        setIsSubmitting(false);
        setErrors({ resetCode: "Unable to connect to server" });
      }
    },
    [formData.email] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const verifyEmailCodeRequest = useCallback(
    async (codeToVerify) => {
      const trimmedEmail = formData.email.trim();
      if (!validate("verify", codeToVerify)) return;
      setIsSubmitting(true);
      setErrors({});
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail, code: codeToVerify })
        });
        const data = await res.json();
        setIsSubmitting(false);
        if (res.ok && data.user) {
          localStorage.setItem("userId", data.user.id);
          localStorage.setItem("cardnext_user_email", data.user.email);
          localStorage.setItem("cardnext_user_name", data.user.name);
          if (data.token) localStorage.setItem("cardnext_token", data.token);

          if (onLoginSuccess) {
            onLoginSuccess({
              id: data.user.id,
              name: data.user.name,
              email: data.user.email
            });
          }
        } else {
          setErrors({
            verificationCode: data.message || "Verification code is invalid"
          });
        }
      } catch {
        setIsSubmitting(false);
        setErrors({ verificationCode: "Unable to connect to server" });
      }
    },
    [formData.email, codeSecondsLeft, onLoginSuccess] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    const otpString = otpDigits.join("");
    if (otpString.length !== 6) return;
    if (isSubmitting) return;

    const submissionKey = `${viewState}:${otpString}`;
    if (lastAutoSubmittedOtpRef.current === submissionKey) return;

    if (viewState === "verify") {
      if (codeSecondsLeft <= 0) return;
      lastAutoSubmittedOtpRef.current = submissionKey;
      verifyEmailCodeRequest(otpString);
    } else if (viewState === "reset-code") {
      lastAutoSubmittedOtpRef.current = submissionKey;
      verifyResetCodeRequest(otpString);
    }
  }, [
    otpDigits,
    viewState,
    isSubmitting,
    codeSecondsLeft,
    verifyEmailCodeRequest,
    verifyResetCodeRequest
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpString = otpDigits.join("");
    const trimmedEmail = formData.email.trim();
    const trimmedName = formData.fullName.trim();

    if (viewState === "forgot") {
      if (!validate("forgot")) return;
      setIsSubmitting(true);
      setErrors({});
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail })
        });
        const data = await res.json();
        setIsSubmitting(false);
        if (res.ok) {
          setVerifiedResetCode("");
          enterOtpView("reset-code");
          setResendCooldown(60);
          setSuccessMessage("Code sent to your email.");
        } else {
          setErrors({ email: data.message || "Unable to send reset code" });
        }
      } catch {
        setIsSubmitting(false);
        setErrors({ email: "Unable to connect to server" });
      }
      return;
    }

    if (viewState === "reset-code") {
      await verifyResetCodeRequest(otpString);
      return;
    }

    if (viewState === "direct-reset") {
      if (!validate("direct-reset")) return;
      const codeToUse = verifiedResetCode || otpString;
      setIsSubmitting(true);
      setErrors({});
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/auth/direct-reset-password`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: trimmedEmail,
              code: codeToUse,
              newPassword: formData.newPassword
            })
          }
        );
        const data = await res.json();
        setIsSubmitting(false);
        if (res.ok) {
          setSuccessMessage(data.message || "Password updated.");
          setTimeout(() => {
            setViewState("form");
            setIsSignUp(false);
            setVerifiedResetCode("");
            lastAutoSubmittedOtpRef.current = "";
            setOtpDigits(["", "", "", "", "", ""]);
            setFormData((prev) => ({
              ...prev,
              password: "",
              newPassword: "",
              confirmNewPassword: ""
            }));
            setSuccessMessage("");
          }, 1800);
        } else {
          setErrors({
            newPassword: data.message || "Could not update password"
          });
        }
      } catch {
        setIsSubmitting(false);
        setErrors({ newPassword: "Unable to connect to server" });
      }
      return;
    }

    if (viewState === "verify") {
      await verifyEmailCodeRequest(otpString);
      return;
    }

    if (!validate("form")) return;

    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage("");

    const endpoint = isSignUp
      ? `${API_BASE_URL}/api/auth/signup`
      : `${API_BASE_URL}/api/auth/login`;

    const payload = isSignUp
      ? { fullName: trimmedName, email: trimmedEmail, password: formData.password }
      : { email: trimmedEmail, password: formData.password };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      setIsSubmitting(false);

      if (!response.ok) {
        if (data.requiresVerification) {
          setCodeSecondsLeft(
            typeof data.expiresInSeconds === "number"
              ? data.expiresInSeconds
              : SIGNUP_CODE_TTL_SECONDS
          );
          enterOtpView("verify");
          setResendCooldown(60);
          setSuccessMessage(
            data.message ||
              "Enter the 6-digit verification code sent to your email."
          );
          return;
        }
        setErrors({ email: data.message || "Invalid email or password" });
        return;
      }

      if (isSignUp || data.requiresVerification) {
        setCodeSecondsLeft(
          typeof data.expiresInSeconds === "number"
            ? data.expiresInSeconds
            : SIGNUP_CODE_TTL_SECONDS
        );
        enterOtpView("verify");
        setResendCooldown(60);
        setSuccessMessage(
          data.message || "Code sent! Enter the 6-digit verification code."
        );
        return;
      }

      if (data.success && data.user) {
        localStorage.setItem("userId", data.user.id);
        localStorage.setItem("cardnext_user_email", data.user.email);
        localStorage.setItem("cardnext_user_name", data.user.name);
        if (data.token) localStorage.setItem("cardnext_token", data.token);
      }

      if (onLoginSuccess && data.user) {
        onLoginSuccess({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email
        });
      }
    } catch (err) {
      console.error("Network connection error:", err);
      setIsSubmitting(false);
      setErrors({ email: "Unable to reach authentication server" });
    }
  };

  const handleGoogleAuth = () => {
    setErrors({});
    setSuccessMessage("Continue with Google is ready to wire up.");
  };

  const goToSignUp = () => {
    setIsSignUp(true);
    setViewState("form");
    setVerifiedResetCode("");
    setErrors({});
    setSuccessMessage("");
  };

  const goToLogin = () => {
    setIsSignUp(false);
    setViewState("form");
    setVerifiedResetCode("");
    setErrors({});
    setSuccessMessage("");
  };

  const handleBackClick = () => {
    if (viewState === "reset-code") {
      setVerifiedResetCode("");
      setViewState("forgot");
      setErrors({});
      setSuccessMessage("");
      return;
    }
    if (viewState === "direct-reset") {
      setViewState("reset-code");
      setErrors({});
      setSuccessMessage("");
      return;
    }
    if (viewState === "forgot") {
      setViewState("form");
      setIsSignUp(false);
      setErrors({});
      setSuccessMessage("");
      return;
    }
    if (viewState === "verify") {
      setViewState("form");
      setErrors({});
      setSuccessMessage("");
      return;
    }
    goToLogin();
  };

  const renderOtpInputs = (errorKey, showExpiryTimer = false) => {
    const isExpired = showExpiryTimer && codeSecondsLeft <= 0;

    return (
      <div className="cn-field-group">
        {showExpiryTimer && (
          <div className={`cn-expiry-bar ${isExpired ? "expired" : ""}`}>
            <Clock size={12} />
            <span>
              {isExpired
                ? "Code expired"
                : `Code expires in ${formatCountdown(codeSecondsLeft)}`}
            </span>
          </div>
        )}
        <div className="otp-grid" onPaste={handleOtpPaste}>
          {otpDigits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (otpRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              disabled={isExpired || isSubmitting}
              onChange={(e) => handleOtpChange(idx, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(idx, e)}
              className={`otp-box ${digit ? "filled" : ""} ${
                errors[errorKey] ? "has-error" : ""
              }`}
              aria-label={`Digit ${idx + 1}`}
            />
          ))}
        </div>
        <ErrorBadge message={errors[errorKey]} centered />
        <div className="resend-row">
          <button
            type="button"
            className="resend-btn"
            disabled={resendCooldown > 0}
            onClick={handleResendCode}
          >
            <RefreshCw size={12} />
            {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend code"}
          </button>
        </div>
      </div>
    );
  };

  const showBackChevron = viewState !== "form" || isSignUp;

  return (
    <div className="cn-auth-shell">
      <div
        ref={phoneCardRef}
        className="cn-phone-card"
        onMouseMove={handleCardMouseMove}
        onMouseLeave={handleCardMouseLeave}
      >
        <div className="cn-top-arc" aria-hidden="true" />
        <div ref={orbRef} className="cn-faded-orb" aria-hidden="true" />

        <div className="cn-status-bar">
          <span
            className="cn-time-pill"
            aria-label={`Current local time ${liveTime}`}
          >
            <span className="cn-live-dot" aria-hidden="true" />
            <span>{liveTime}</span>
          </span>
        </div>

        <div className="cn-nav-row">
          {showBackChevron ? (
            <button
              type="button"
              className="cn-back-btn"
              aria-label="Back"
              onClick={handleBackClick}
            >
              <ChevronLeft size={24} strokeWidth={2.2} />
            </button>
          ) : (
            <span className="cn-nav-spacer" />
          )}
        </div>

        <div
          className="cn-screen-body"
          key={`${isSignUp ? "signup" : "login"}-${viewState}`}
        >
          {viewState === "forgot" && (
            <div className="cn-view-fade">
              <h1 className="cn-title">
                <HoverLetters
                  text="Reset password"
                  registerNode={registerLetterNode}
                />
              </h1>
              <p className="cn-subtitle">
                <HoverLetters
                  text="Remember it?"
                  registerNode={registerLetterNode}
                />{" "}
                <button
                  type="button"
                  className="cn-inline-link"
                  onClick={goToLogin}
                >
                  <HoverLetters text="login" registerNode={registerLetterNode} />
                </button>
              </p>

              {successMessage && (
                <div className="cn-success">{successMessage}</div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="cn-field-group">
                  <div
                    className={`cn-pill-input ${errors.email ? "has-error" : ""}`}
                  >
                    <input
                      type="email"
                      name="email"
                      placeholder="Email"
                      aria-label="Email"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>
                  <ErrorBadge message={errors.email} />
                </div>

                <div className="cn-cta-row">
                  <button
                    type="submit"
                    className="cn-gold-btn"
                    disabled={isSubmitting}
                  >
                    <span>{isSubmitting ? "Sending..." : "Send code"}</span>
                    <ArrowRight size={16} strokeWidth={2.3} />
                  </button>
                </div>
              </form>
            </div>
          )}

          {viewState === "reset-code" && (
            <div className="cn-view-fade">
              <h1 className="cn-title">
                <HoverLetters text="Enter code" registerNode={registerLetterNode} />
              </h1>
              <p className="cn-subtitle">
                <HoverLetters text="Sent to" registerNode={registerLetterNode} />{" "}
                <strong>{formData.email}</strong>
              </p>

              {successMessage && (
                <div className="cn-success">{successMessage}</div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {renderOtpInputs("resetCode", false)}
                <div className="cn-cta-row">
                  <button
                    type="submit"
                    className="cn-gold-btn"
                    disabled={isSubmitting}
                  >
                    <span>{isSubmitting ? "Checking..." : "Verify"}</span>
                    <ArrowRight size={16} strokeWidth={2.3} />
                  </button>
                </div>
              </form>
            </div>
          )}

          {viewState === "direct-reset" && (
            <div className="cn-view-fade">
              <h1 className="cn-title">
                <HoverLetters
                  text="New password"
                  registerNode={registerLetterNode}
                />
              </h1>
              <p className="cn-subtitle">
                <HoverLetters text="For" registerNode={registerLetterNode} />{" "}
                <strong>{formData.email}</strong>
              </p>

              {successMessage && (
                <div className="cn-success">{successMessage}</div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="cn-field-group">
                  <div
                    className={`cn-pill-input with-action ${
                      errors.newPassword ? "has-error" : ""
                    }`}
                  >
                    <Lock size={15} className="cn-input-lock" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="newPassword"
                      placeholder="New Password"
                      aria-label="New Password"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDownCheck}
                    />
                    {renderEyeButton(
                      showPassword,
                      () => setShowPassword((prev) => !prev),
                      showPassword ? "Hide new password" : "Show new password"
                    )}
                  </div>
                  <ErrorBadge message={errors.newPassword} />
                  {renderStrengthRules(
                    formData.newPassword,
                    newPasswordCriteria,
                    newPasswordScore
                  )}
                </div>

                <div className="cn-field-group">
                  <div
                    className={`cn-pill-input with-action ${
                      errors.confirmNewPassword ? "has-error" : ""
                    }`}
                  >
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmNewPassword"
                      placeholder="Confirm Password"
                      aria-label="Confirm Password"
                      value={formData.confirmNewPassword}
                      onChange={handleInputChange}
                    />
                    {renderEyeButton(
                      showConfirmPassword,
                      () => setShowConfirmPassword((prev) => !prev),
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    )}
                  </div>
                  <ErrorBadge message={errors.confirmNewPassword} />
                </div>

                <div className="cn-cta-row">
                  <button
                    type="submit"
                    className="cn-gold-btn"
                    disabled={isSubmitting}
                  >
                    <span>{isSubmitting ? "Saving..." : "Update"}</span>
                    <ArrowRight size={16} strokeWidth={2.3} />
                  </button>
                </div>
              </form>
            </div>
          )}

          {viewState === "verify" && (
            <div className="cn-view-fade">
              <h1 className="cn-title">
                <HoverLetters
                  text="Verify account"
                  registerNode={registerLetterNode}
                />
              </h1>
              <p className="cn-subtitle">
                <HoverLetters
                  text="Code sent to"
                  registerNode={registerLetterNode}
                />{" "}
                <strong>{formData.email}</strong>
              </p>

              {successMessage && (
                <div className="cn-success">{successMessage}</div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {renderOtpInputs("verificationCode", true)}
                <div className="cn-cta-row">
                  <button
                    type="submit"
                    className="cn-gold-btn"
                    disabled={isSubmitting || codeSecondsLeft <= 0}
                  >
                    <span>
                      {codeSecondsLeft <= 0
                        ? "Expired"
                        : isSubmitting
                        ? "Verifying..."
                        : "Verify"}
                    </span>
                    <ArrowRight size={16} strokeWidth={2.3} />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* INITIAL FIRST SCREEN: LOGIN ({ email, password }) */}
          {!isSignUp && viewState === "form" && (
            <div className="cn-view-fade">
              <h1 className="cn-title">
                <HoverLetters text="Login" registerNode={registerLetterNode} />
              </h1>
              <p className="cn-subtitle">
                <HoverLetters
                  text="Don't have an account?"
                  registerNode={registerLetterNode}
                />{" "}
                <button
                  type="button"
                  className="cn-inline-link"
                  onClick={goToSignUp}
                >
                  <HoverLetters
                    text="sign up"
                    registerNode={registerLetterNode}
                  />
                </button>
              </p>

              {successMessage && (
                <div className="cn-success">{successMessage}</div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="cn-field-group">
                  <div
                    className={`cn-pill-input ${errors.email ? "has-error" : ""}`}
                  >
                    <input
                      type="email"
                      name="email"
                      placeholder="Email"
                      aria-label="Email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>
                  <ErrorBadge message={errors.email} />
                </div>

                <div className="cn-field-group">
                  <div
                    className={`cn-pill-input with-action ${
                      errors.password ? "has-error" : ""
                    }`}
                  >
                    <Lock size={15} className="cn-input-lock" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Password"
                      aria-label="Password"
                      autoComplete="current-password"
                      value={formData.password}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDownCheck}
                    />
                    {renderEyeButton(
                      showPassword,
                      () => setShowPassword((prev) => !prev),
                      showPassword ? "Hide password" : "Show password"
                    )}
                    {capsLockOn && (
                      <span className="cn-caps-pill" title="Caps Lock is on">
                        <AlertTriangle size={11} />
                      </span>
                    )}
                    <button
                      type="button"
                      className="cn-forgot-inline"
                      onClick={() => {
                        setViewState("forgot");
                        setErrors({});
                        setSuccessMessage("");
                      }}
                    >
                      <HoverLetters
                        text="FORGOT"
                        registerNode={registerLetterNode}
                      />
                    </button>
                  </div>
                  <ErrorBadge message={errors.password} />
                </div>

                <div className="cn-cta-row">
                  <button
                    type="submit"
                    className="cn-gold-btn"
                    disabled={isSubmitting}
                  >
                    <span>{isSubmitting ? "Logging in..." : "Login"}</span>
                    <ArrowRight size={16} strokeWidth={2.3} />
                  </button>
                </div>
              </form>

              <div className="cn-google-wrap">
                <button
                  type="button"
                  className="cn-google-btn"
                  onClick={handleGoogleAuth}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    aria-hidden="true"
                  >
                    <path
                      fill="#713b17"
                      d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z"
                    />
                  </svg>
                  <HoverLetters
                    text="Continue with Google"
                    registerNode={registerLetterNode}
                  />
                </button>
              </div>
            </div>
          )}

          {/* SECOND SCREEN: CREATE ACCOUNT ({ fullName, email, password }) */}
          {isSignUp && viewState === "form" && (
            <div className="cn-view-fade">
              <h1 className="cn-title">
                <HoverLetters
                  text="Create account"
                  registerNode={registerLetterNode}
                />
              </h1>
              <p className="cn-subtitle">
                <HoverLetters
                  text="Already have an account?"
                  registerNode={registerLetterNode}
                />{" "}
                <button
                  type="button"
                  className="cn-inline-link"
                  onClick={goToLogin}
                >
                  <HoverLetters
                    text="sign in"
                    registerNode={registerLetterNode}
                  />
                </button>
              </p>

              {successMessage && (
                <div className="cn-success">{successMessage}</div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="cn-field-group">
                  <div
                    className={`cn-pill-input ${
                      errors.fullName ? "has-error" : ""
                    }`}
                  >
                    <input
                      type="text"
                      name="fullName"
                      placeholder="Full name"
                      aria-label="Full name"
                      autoComplete="name"
                      value={formData.fullName}
                      onChange={handleInputChange}
                    />
                  </div>
                  <ErrorBadge message={errors.fullName} />
                </div>

                <div className="cn-field-group">
                  <div
                    className={`cn-pill-input ${errors.email ? "has-error" : ""}`}
                  >
                    <input
                      type="email"
                      name="email"
                      placeholder="Email"
                      aria-label="Email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>
                  <ErrorBadge message={errors.email} />
                </div>

                <div className="cn-field-group">
                  <div
                    className={`cn-pill-input with-action ${
                      errors.password ? "has-error" : ""
                    }`}
                  >
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Password"
                      aria-label="Password"
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDownCheck}
                    />
                    {renderEyeButton(
                      showPassword,
                      () => setShowPassword((prev) => !prev),
                      showPassword ? "Hide password" : "Show password"
                    )}
                    {capsLockOn && (
                      <span className="cn-caps-pill" title="Caps Lock is on">
                        <AlertTriangle size={11} />
                      </span>
                    )}
                  </div>
                  <ErrorBadge message={errors.password} />
                  {renderStrengthRules(
                    formData.password,
                    passwordCriteria,
                    passwordScore
                  )}
                </div>

                <div className="cn-cta-row">
                  <button
                    type="submit"
                    className="cn-gold-btn"
                    disabled={isSubmitting}
                  >
                    <span>{isSubmitting ? "Signing up..." : "Sign up"}</span>
                    <ArrowRight size={16} strokeWidth={2.3} />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <div className="cn-security-strip">
          <KeyRound size={11} />
          <ShieldCheck size={11} />
          <HoverLetters
            text="CardNext Encrypted"
            registerNode={registerLetterNode}
          />
        </div>
      </div>

      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap");

        * {
          box-sizing: border-box;
        }

        .cn-auth-shell {
          min-height: 100dvh;
          width: 100%;
          background: #efeae0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px 14px;
          font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .cn-phone-card {
          position: relative;
          width: 100%;
          max-width: 375px;
          min-height: 670px;
          background: #fffdf9;
          border-radius: 34px;
          border: 1px solid #e2d9c8;
          overflow: hidden;
          box-shadow: 0 24px 54px -18px rgba(35, 22, 14, 0.22);
          display: flex;
          flex-direction: column;
          padding: 14px 24px 20px;
        }

        .cn-top-arc {
          position: absolute;
          top: -96px;
          right: -74px;
          width: 310px;
          height: 310px;
          border-radius: 50%;
          background: radial-gradient(
            circle at 48% 52%,
            rgba(243, 199, 124, 0.42) 0%,
            rgba(184, 122, 56, 0.2) 50%,
            rgba(255, 253, 249, 0) 75%
          );
          pointer-events: none;
          z-index: 0;
        }

        .cn-faded-orb {
          position: absolute;
          top: 56%;
          left: 68%;
          width: 44px;
          height: 44px;
          margin-top: -22px;
          margin-left: -22px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(243, 199, 124, 0.36) 0%,
            rgba(113, 59, 23, 0.14) 65%,
            rgba(255, 253, 249, 0) 100%
          );
          border: 1px solid rgba(113, 59, 23, 0.14);
          opacity: 0.52;
          pointer-events: none;
          z-index: 1;
          will-change: transform;
        }

        .cn-status-bar {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          padding: 2px 2px 0;
        }

        .cn-time-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          background: linear-gradient(135deg, #2b180d 0%, #4d2811 100%);
          border: 1px solid rgba(243, 199, 124, 0.35);
          color: #f7deb0;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.4px;
          box-shadow: 0 6px 14px -6px rgba(35, 22, 14, 0.45);
        }

        .cn-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #f3c77c;
          box-shadow: 0 0 8px #f3c77c;
        }

        .cn-nav-row {
          position: relative;
          z-index: 2;
          min-height: 36px;
          margin-top: 12px;
          display: flex;
          align-items: center;
        }

        .cn-back-btn {
          background: transparent;
          border: 0;
          padding: 4px 6px 4px 0;
          margin-left: -4px;
          color: #23160e;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border-radius: 999px;
          transition: background 0.16s ease;
        }

        .cn-back-btn:hover {
          background: rgba(113, 59, 23, 0.08);
        }

        .cn-nav-spacer {
          display: inline-block;
          height: 24px;
        }

        .cn-screen-body {
          position: relative;
          z-index: 2;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          padding-top: 44px;
        }

        .cn-view-fade {
          animation: cnFadeIn 0.22s ease-out;
        }

        @keyframes cnFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .cn-hover-letters {
          display: inline-flex;
          flex-wrap: wrap;
          align-items: baseline;
        }

        .cn-char {
          display: inline-block;
          transform-origin: center bottom;
          transition: color 0.16s ease;
          will-change: transform;
        }

        .cn-char:hover {
          color: #713b17;
        }

        .cn-title {
          margin: 0 0 6px;
          font-size: 32px;
          font-weight: 800;
          line-height: 1.12;
          letter-spacing: -0.9px;
          color: #18120e;
        }

        .cn-subtitle {
          margin: 0 0 28px;
          font-size: 13.5px;
          font-weight: 500;
          color: #6e5f52;
        }

        .cn-inline-link {
          background: transparent;
          border: 0;
          padding: 0;
          font-size: 13.5px;
          font-weight: 700;
          color: #713b17;
          cursor: pointer;
        }

        .cn-inline-link:hover {
          text-decoration: underline;
        }

        .cn-field-group {
          margin-bottom: 14px;
        }

        .cn-pill-input {
          height: 44px;
          border-radius: 999px;
          border: 1.35px solid #ddd4c4;
          background: #ffffff;
          display: flex;
          align-items: center;
          padding: 0 16px;
          gap: 8px;
          transition: border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
        }

        .cn-pill-input.with-action {
          padding-right: 12px;
        }

        .cn-pill-input:hover {
          border-color: #c2b298;
        }

        .cn-pill-input:focus-within {
          border-color: #713b17;
          box-shadow: 0 0 0 3px rgba(113, 59, 23, 0.12);
        }

        .cn-pill-input.has-error {
          border-color: rgba(185, 56, 44, 0.65);
          background: #fffaf9;
          box-shadow: 0 0 0 3px rgba(185, 56, 44, 0.08);
        }

        .cn-input-lock {
          color: #7c6857;
          flex-shrink: 0;
        }

        .cn-pill-input input {
          flex: 1;
          min-width: 0;
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 500;
          color: #18120e;
        }

        .cn-pill-input input::placeholder {
          color: #8c7d6e;
          font-weight: 400;
        }

        .cn-eye-btn {
          background: transparent;
          border: 0;
          padding: 4px;
          color: #7c6857;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border-radius: 999px;
          flex-shrink: 0;
          transition: color 0.15s ease, background 0.15s ease;
        }

        .cn-eye-btn:hover {
          color: #713b17;
          background: rgba(113, 59, 23, 0.08);
        }

        .cn-caps-pill {
          color: #b45309;
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
        }

        .cn-forgot-inline {
          background: transparent;
          border: 0;
          padding: 0 0 0 2px;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.4px;
          color: #713b17;
          cursor: pointer;
          flex-shrink: 0;
        }

        .cn-forgot-inline:hover {
          text-decoration: underline;
        }

        .cn-cta-row {
          display: flex;
          justify-content: flex-end;
          margin-top: 22px;
        }

        .cn-gold-btn {
          height: 38px;
          padding: 0 20px;
          border-radius: 999px;
          border: 1px solid rgba(243, 199, 124, 0.36);
          background: linear-gradient(135deg, #2b180d 0%, #6b3716 58%, #85461d 100%);
          color: #fff6e5;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 8px 18px -6px rgba(113, 59, 23, 0.48);
          transition: transform 0.16s ease, filter 0.16s ease;
        }

        .cn-gold-btn:hover {
          filter: brightness(1.06);
          transform: translateY(-1px);
        }

        .cn-gold-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none;
        }

        .cn-google-wrap {
          margin-top: 76px;
          display: flex;
          justify-content: center;
        }

        .cn-google-btn {
          width: 100%;
          height: 44px;
          border-radius: 999px;
          border: 1.35px solid #ddd4c4;
          background: #ffffff;
          color: #18120e;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          box-shadow: 0 6px 16px -8px rgba(35, 22, 14, 0.18);
          transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;
        }

        .cn-google-btn:hover {
          border-color: #b89f78;
          background: #fcfaf5;
          transform: translateY(-1px);
        }

        .cn-pass-rules {
          margin-top: 8px;
          padding: 8px 12px;
          border-radius: 14px;
          background: #fdf9f1;
          border: 1px solid #eadcc2;
        }

        .cn-strength-bars {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4px;
          margin-bottom: 6px;
        }

        .cn-strength-seg {
          height: 3px;
          border-radius: 99px;
          background: #e4ddd0;
        }

        .cn-strength-seg.weak { background: #ef4444; }
        .cn-strength-seg.medium { background: #f59e0b; }
        .cn-strength-seg.strong { background: #10b981; }

        .cn-rules-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3px 8px;
        }

        .cn-rules-grid span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10.5px;
          font-weight: 600;
          color: #7c6f62;
        }

        .cn-rules-grid span.ok {
          color: #059669;
        }

        .cn-expiry-bar {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 8px;
          padding: 4px 10px;
          border-radius: 999px;
          background: #fdf6e7;
          border: 1px solid #ebd2a2;
          color: #713b17;
          font-size: 11px;
          font-weight: 700;
        }

        .cn-expiry-bar.expired {
          background: rgba(185, 56, 44, 0.08);
          border-color: rgba(185, 56, 44, 0.25);
          color: #9e2a20;
        }

        .otp-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 6px;
          margin-bottom: 6px;
        }

        .otp-box {
          width: 100%;
          height: 42px;
          border-radius: 12px;
          border: 1.35px solid #ddd4c4;
          background: #ffffff;
          text-align: center;
          font-size: 16px;
          font-weight: 700;
          color: #18120e;
          outline: none;
        }

        .otp-box:focus {
          border-color: #713b17;
          box-shadow: 0 0 0 3px rgba(113, 59, 23, 0.12);
        }

        .otp-box.has-error {
          border-color: rgba(185, 56, 44, 0.65);
          background: #fffaf9;
        }

        .otp-box:disabled {
          background: #f5f1e8;
          color: #a89d90;
        }

        .resend-row {
          display: flex;
          justify-content: flex-end;
        }

        .resend-btn {
          background: transparent;
          border: 0;
          color: #713b17;
          font-size: 11.5px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          padding: 0;
        }

        .resend-btn:disabled {
          color: #a89d90;
          cursor: not-allowed;
        }

        .cn-error-pill {
          margin-top: 6px;
          padding: 5px 11px;
          border-radius: 999px;
          background: rgba(185, 56, 44, 0.07);
          border: 1px solid rgba(185, 56, 44, 0.22);
          color: #9e2a20;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: -0.1px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          animation: cnErrSlideIn 0.18s ease-out;
        }

        .cn-error-pill.centered {
          display: flex;
          justify-content: center;
          width: fit-content;
          margin: 6px auto 0;
        }

        .cn-error-icon {
          flex-shrink: 0;
          color: #b43227;
        }

        @keyframes cnErrSlideIn {
          from { opacity: 0; transform: translateY(-3px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .cn-success {
          margin-bottom: 12px;
          padding: 8px 12px;
          border-radius: 12px;
          background: #fdf6e7;
          border: 1px solid #ebd2a2;
          color: #5c3317;
          font-size: 11.5px;
          font-weight: 600;
        }

        .cn-security-strip {
          position: relative;
          z-index: 2;
          margin-top: auto;
          padding-top: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          font-size: 10.5px;
          font-weight: 600;
          color: #9c8e7e;
        }

        @media (max-width: 600px) {
          .cn-auth-shell {
            padding: 0;
            background: #fffdf9;
            align-items: stretch;
          }

          .cn-phone-card {
            max-width: 100%;
            width: 100%;
            min-height: 100dvh;
            border-radius: 0;
            border: 0;
            box-shadow: none;
            padding: 16px 24px 20px;
          }
        }
      `}</style>
    </div>
  );
}