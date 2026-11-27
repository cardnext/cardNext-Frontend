// Auth.jsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Lock,
  ShieldCheck,
  ArrowRight,
  ChevronLeft,
  ChevronDown,
  Search,
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
const USER_STORAGE_KEY = "cardnext_user";
const SESSION_TOKEN_STORAGE_KEY = "cardnext_session_token";

const COUNTRY_DIAL_CODES = [
  { code: "NG", name: "Nigeria", dial: "+234" },
  { code: "US", name: "United States", dial: "+1" },
  { code: "GB", name: "United Kingdom", dial: "+44" },
  { code: "CA", name: "Canada", dial: "+1" },
  { code: "GH", name: "Ghana", dial: "+233" },
  { code: "KE", name: "Kenya", dial: "+254" },
  { code: "ZA", name: "South Africa", dial: "+27" },
  { code: "AE", name: "United Arab Emirates", dial: "+971" },
  { code: "DE", name: "Germany", dial: "+49" },
  { code: "FR", name: "France", dial: "+33" },
  { code: "IN", name: "India", dial: "+91" },
  { code: "AU", name: "Australia", dial: "+61" },
  { code: "NL", name: "Netherlands", dial: "+31" },
  { code: "IE", name: "Ireland", dial: "+353" },
  { code: "SA", name: "Saudi Arabia", dial: "+966" },
  { code: "QA", name: "Qatar", dial: "+974" },
  { code: "RW", name: "Rwanda", dial: "+250" },
  { code: "UG", name: "Uganda", dial: "+256" },
  { code: "TZ", name: "Tanzania", dial: "+255" },
  { code: "EG", name: "Egypt", dial: "+20" },
  { code: "BR", name: "Brazil", dial: "+55" },
  { code: "JP", name: "Japan", dial: "+81" },
  { code: "SG", name: "Singapore", dial: "+65" }
];

function CountryFlag({ code }) {
  switch (code) {
    case "NG":
      return (
        <svg viewBox="0 0 24 18" className="cn-flag-svg" aria-hidden="true">
          <rect width="8" height="18" x="0" fill="#008751" />
          <rect width="8" height="18" x="8" fill="#ffffff" />
          <rect width="8" height="18" x="16" fill="#008751" />
        </svg>
      );
    case "US":
      return (
        <svg viewBox="0 0 24 18" className="cn-flag-svg" aria-hidden="true">
          <rect width="24" height="18" fill="#b22234" />
          <rect y="2.6" width="24" height="2.2" fill="#ffffff" />
          <rect y="7.2" width="24" height="2.2" fill="#ffffff" />
          <rect y="11.8" width="24" height="2.2" fill="#ffffff" />
          <rect y="15.8" width="24" height="2.2" fill="#ffffff" />
          <rect width="11" height="9.8" fill="#3c3b6e" />
        </svg>
      );
    case "GB":
      return (
        <svg viewBox="0 0 24 18" className="cn-flag-svg" aria-hidden="true">
          <rect width="24" height="18" fill="#012169" />
          <path d="M0 0L24 18M24 0L0 18" stroke="#ffffff" strokeWidth="3.2" />
          <path d="M0 0L24 18M24 0L0 18" stroke="#c8102e" strokeWidth="1.6" />
          <path d="M12 0V18M0 9H24" stroke="#ffffff" strokeWidth="5" />
          <path d="M12 0V18M0 9H24" stroke="#c8102e" strokeWidth="3" />
        </svg>
      );
    case "CA":
      return (
        <svg viewBox="0 0 24 18" className="cn-flag-svg" aria-hidden="true">
          <rect width="6" height="18" x="0" fill="#d80621" />
          <rect width="12" height="18" x="6" fill="#ffffff" />
          <rect width="6" height="18" x="18" fill="#d80621" />
          <path
            d="M12 4L13.3 7.5H16L13.8 9.4L14.6 12.5L12 10.6L9.4 12.5L10.2 9.4L8 7.5H10.7L12 4Z"
            fill="#d80621"
          />
        </svg>
      );
    case "GH":
      return (
        <svg viewBox="0 0 24 18" className="cn-flag-svg" aria-hidden="true">
          <rect width="24" height="6" y="0" fill="#ce1126" />
          <rect width="24" height="6" y="6" fill="#fcd116" />
          <rect width="24" height="6" y="12" fill="#006b3f" />
          <path
            d="M12 6.5L12.8 8.8H15.2L13.3 10.2L14 12.5L12 11.1L10 12.5L10.7 10.2L8.8 8.8H11.2L12 6.5Z"
            fill="#111111"
          />
        </svg>
      );
    case "KE":
      return (
        <svg viewBox="0 0 24 18" className="cn-flag-svg" aria-hidden="true">
          <rect width="24" height="5" y="0" fill="#111111" />
          <rect width="24" height="1.5" y="5" fill="#ffffff" />
          <rect width="24" height="5" y="6.5" fill="#bb0000" />
          <rect width="24" height="1.5" y="11.5" fill="#ffffff" />
          <rect width="24" height="5" y="13" fill="#006600" />
          <ellipse
            cx="12"
            cy="9"
            rx="2.3"
            ry="4.5"
            fill="#bb0000"
            stroke="#ffffff"
            strokeWidth="0.9"
          />
        </svg>
      );
    case "ZA":
      return (
        <svg viewBox="0 0 24 18" className="cn-flag-svg" aria-hidden="true">
          <rect width="24" height="9" y="0" fill="#e03c31" />
          <rect width="24" height="9" y="9" fill="#001489" />
          <path d="M0 0L11 9L0 18V0Z" fill="#111111" />
          <path
            d="M0 2L9 9L0 16M9 9H24"
            fill="none"
            stroke="#007749"
            strokeWidth="3.2"
          />
        </svg>
      );
    case "AE":
      return (
        <svg viewBox="0 0 24 18" className="cn-flag-svg" aria-hidden="true">
          <rect width="18" height="6" x="6" y="0" fill="#00732f" />
          <rect width="18" height="6" x="6" y="6" fill="#ffffff" />
          <rect width="18" height="6" x="6" y="12" fill="#111111" />
          <rect width="6" height="18" x="0" fill="#ff0000" />
        </svg>
      );
    case "DE":
      return (
        <svg viewBox="0 0 24 18" className="cn-flag-svg" aria-hidden="true">
          <rect width="24" height="6" y="0" fill="#111111" />
          <rect width="24" height="6" y="6" fill="#dd0000" />
          <rect width="24" height="6" y="12" fill="#ffce00" />
        </svg>
      );
    case "FR":
      return (
        <svg viewBox="0 0 24 18" className="cn-flag-svg" aria-hidden="true">
          <rect width="8" height="18" x="0" fill="#002395" />
          <rect width="8" height="18" x="8" fill="#ffffff" />
          <rect width="8" height="18" x="16" fill="#ed2939" />
        </svg>
      );
    case "IN":
      return (
        <svg viewBox="0 0 24 18" className="cn-flag-svg" aria-hidden="true">
          <rect width="24" height="6" y="0" fill="#ff9933" />
          <rect width="24" height="6" y="6" fill="#ffffff" />
          <rect width="24" height="6" y="12" fill="#138808" />
          <circle
            cx="12"
            cy="9"
            r="2.1"
            fill="none"
            stroke="#000080"
            strokeWidth="1"
          />
        </svg>
      );
    case "AU":
      return (
        <svg viewBox="0 0 24 18" className="cn-flag-svg" aria-hidden="true">
          <rect width="24" height="18" fill="#00008b" />
          <rect width="12" height="9" fill="#012169" />
          <path d="M0 0L12 9M12 0L0 9" stroke="#ffffff" strokeWidth="1.6" />
          <path d="M6 0V9M0 4.5H12" stroke="#ffffff" strokeWidth="2.4" />
          <path d="M6 0V9M0 4.5H12" stroke="#c8102e" strokeWidth="1.2" />
          <circle cx="18" cy="5" r="1.2" fill="#ffffff" />
          <circle cx="18" cy="13" r="1.2" fill="#ffffff" />
          <circle cx="15" cy="9.5" r="1" fill="#ffffff" />
          <circle cx="21" cy="8.5" r="1" fill="#ffffff" />
        </svg>
      );
    case "NL":
      return (
        <svg viewBox="0 0 24 18" className="cn-flag-svg" aria-hidden="true">
          <rect width="24" height="6" y="0" fill="#ae1c28" />
          <rect width="24" height="6" y="6" fill="#ffffff" />
          <rect width="24" height="6" y="12" fill="#21468b" />
        </svg>
      );
    case "IE":
      return (
        <svg viewBox="0 0 24 18" className="cn-flag-svg" aria-hidden="true">
          <rect width="8" height="18" x="0" fill="#169b62" />
          <rect width="8" height="18" x="8" fill="#ffffff" />
          <rect width="8" height="18" x="16" fill="#ff883e" />
        </svg>
      );
    case "SA":
      return (
        <svg viewBox="0 0 24 18" className="cn-flag-svg" aria-hidden="true">
          <rect width="24" height="18" fill="#165b33" />
          <path
            d="M5 8.5H18.5M14.5 11.5L17.5 12.8"
            stroke="#ffffff"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case "QA":
      return (
        <svg viewBox="0 0 24 18" className="cn-flag-svg" aria-hidden="true">
          <rect width="24" height="18" fill="#8d1b3d" />
          <path
            d="M0 0H7L9.2 1L7 2L9.2 3L7 4L9.2 5L7 6L9.2 7L7 8L9.2 9L7 10L9.2 11L7 12L9.2 13L7 14L9.2 15L7 16L9.2 17L7 18H0V0Z"
            fill="#ffffff"
          />
        </svg>
      );
    case "RW":
      return (
        <svg viewBox="0 0 24 18" className="cn-flag-svg" aria-hidden="true">
          <rect width="24" height="9" y="0" fill="#00a1de" />
          <rect width="24" height="4.5" y="9" fill="#fad201" />
          <rect width="24" height="4.5" y="13.5" fill="#20603d" />
          <circle cx="18.5" cy="4.7" r="2.2" fill="#e5be01" />
        </svg>
      );
    case "UG":
      return (
        <svg viewBox="0 0 24 18" className="cn-flag-svg" aria-hidden="true">
          <rect width="24" height="3" y="0" fill="#111111" />
          <rect width="24" height="3" y="3" fill="#fcdc04" />
          <rect width="24" height="3" y="6" fill="#d90000" />
          <rect width="24" height="3" y="9" fill="#111111" />
          <rect width="24" height="3" y="12" fill="#fcdc04" />
          <rect width="24" height="3" y="15" fill="#d90000" />
          <circle
            cx="12"
            cy="9"
            r="3.2"
            fill="#ffffff"
            stroke="#111111"
            strokeWidth="0.7"
          />
        </svg>
      );
    case "TZ":
      return (
        <svg viewBox="0 0 24 18" className="cn-flag-svg" aria-hidden="true">
          <rect width="24" height="18" fill="#1eb53a" />
          <path d="M0 18L24 0V18H0Z" fill="#00a3dd" />
          <path d="M0 17.5L23.5 0.5" stroke="#fcd116" strokeWidth="4.2" />
          <path d="M0 17.5L23.5 0.5" stroke="#111111" strokeWidth="2.4" />
        </svg>
      );
    case "EG":
      return (
        <svg viewBox="0 0 24 18" className="cn-flag-svg" aria-hidden="true">
          <rect width="24" height="6" y="0" fill="#ce1126" />
          <rect width="24" height="6" y="6" fill="#ffffff" />
          <rect width="24" height="6" y="12" fill="#111111" />
          <circle cx="12" cy="9" r="1.8" fill="#c09300" />
        </svg>
      );
    case "BR":
      return (
        <svg viewBox="0 0 24 18" className="cn-flag-svg" aria-hidden="true">
          <rect width="24" height="18" fill="#009b3a" />
          <polygon points="12,2.2 21.2,9 12,15.8 2.8,9" fill="#ffdf00" />
          <circle cx="12" cy="9" r="3.4" fill="#002776" />
          <path
            d="M8.8 8.4C10.8 8 13.2 8.5 15.2 9.8"
            fill="none"
            stroke="#ffffff"
            strokeWidth="0.9"
          />
        </svg>
      );
    case "JP":
      return (
        <svg viewBox="0 0 24 18" className="cn-flag-svg" aria-hidden="true">
          <rect width="24" height="18" fill="#ffffff" />
          <circle cx="12" cy="9" r="4.6" fill="#bc002d" />
        </svg>
      );
    case "SG":
      return (
        <svg viewBox="0 0 24 18" className="cn-flag-svg" aria-hidden="true">
          <rect width="24" height="9" y="0" fill="#ef3340" />
          <rect width="24" height="9" y="9" fill="#ffffff" />
          <circle cx="7.4" cy="4.5" r="2.7" fill="#ffffff" />
          <circle cx="8.6" cy="4.5" r="2.4" fill="#ef3340" />
          <circle cx="10.2" cy="3.5" r="0.65" fill="#ffffff" />
          <circle cx="11.2" cy="4.4" r="0.65" fill="#ffffff" />
          <circle cx="10.8" cy="5.6" r="0.65" fill="#ffffff" />
          <circle cx="9.6" cy="5.6" r="0.65" fill="#ffffff" />
          <circle cx="9.2" cy="4.4" r="0.65" fill="#ffffff" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 18" className="cn-flag-svg" aria-hidden="true">
          <rect width="24" height="18" fill="#713b17" />
        </svg>
      );
  }
}

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

function persistAuthenticatedSession(user, token) {
  if (!user) return;
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    if (user.id !== undefined && user.id !== null) {
      localStorage.setItem("userId", String(user.id));
    }
    if (user.email) {
      localStorage.setItem("cardnext_user_email", String(user.email));
    }
    if (user.name) {
      localStorage.setItem("cardnext_user_name", String(user.name));
    }
    if (token) {
      localStorage.setItem("cardnext_token", String(token));
      localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, String(token));
    }
  } catch {
    // Ignore storage quota or private-mode errors
  }
}

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

export default function AuthPage({ onLoginSuccess, onBackToCardGod }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [viewState, setViewState] = useState("form"); // "form" | "verify" | "forgot" | "reset-code" | "direct-reset"
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [codeSecondsLeft, setCodeSecondsLeft] = useState(SIGNUP_CODE_TTL_SECONDS);
  const [verifiedResetCode, setVerifiedResetCode] = useState("");
  const [liveTime, setLiveTime] = useState(() => formatLocalClock(new Date()));

  const [selectedCountryIso, setSelectedCountryIso] = useState("NG");
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  const phoneCardRef = useRef(null);
  const orbRef = useRef(null);
  const pointerRef = useRef({ x: null, y: null, active: false });
  const orbCurrentRef = useRef({ x: 0, y: 0 });
  const letterNodesRef = useRef(new Set());
  const letterStatesRef = useRef(new Map());
  const countryDropdownRef = useRef(null);
  const countrySearchInputRef = useRef(null);
  const phoneInputRef = useRef(null);

  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);
  const lastAutoSubmittedOtpRef = useRef("");

  const [formData, setFormData] = useState({
    fullName: "",
    countryCode: "+234",
    phone: "",
    email: "",
    password: "",
    newPassword: "",
    confirmNewPassword: ""
  });

  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCountry = useMemo(
    () =>
      COUNTRY_DIAL_CODES.find((c) => c.code === selectedCountryIso) ||
      COUNTRY_DIAL_CODES[0],
    [selectedCountryIso]
  );

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return COUNTRY_DIAL_CODES;
    return COUNTRY_DIAL_CODES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dial.includes(q)
    );
  }, [countrySearch]);

  const registerLetterNode = useCallback((_idx, el) => {
    if (!el) return;
    letterNodesRef.current.add(el);
    if (!letterStatesRef.current.has(el)) {
      letterStatesRef.current.set(el, { scale: 1, lift: 0 });
    }
  }, []);

  useEffect(() => {
    if (!countryMenuOpen) return;

    const handleClickOutside = (e) => {
      if (
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(e.target)
      ) {
        setCountryMenuOpen(false);
        setCountrySearch("");
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setCountryMenuOpen(false);
        setCountrySearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    setTimeout(() => countrySearchInputRef.current?.focus(), 40);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [countryMenuOpen]);

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
    setCountryMenuOpen(false);
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
    const nextValue =
      name === "phone" ? value.replace(/[^\d\s()-]/g, "") : value;
    setFormData((prev) => ({
      ...prev,
      [name]: nextValue
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSelectCountry = (country) => {
    setSelectedCountryIso(country.code);
    setFormData((prev) => ({
      ...prev,
      countryCode: country.dial
    }));
    setCountryMenuOpen(false);
    setCountrySearch("");
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: null }));
    }
    setTimeout(() => phoneInputRef.current?.focus(), 20);
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
    const digitsOnlyPhone = formData.phone.replace(/\D/g, "");

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
      if (
        !digitsOnlyPhone ||
        digitsOnlyPhone.length < 7 ||
        digitsOnlyPhone.length > 15
      ) {
        newErrors.phone = "Enter a valid phone number";
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
          persistAuthenticatedSession(data.user, data.token);

          if (onLoginSuccess) {
            onLoginSuccess({
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              user: data.user,
              sessionToken: data.token
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
    const cleanedLocalPhone = formData.phone
      .replace(/\D/g, "")
      .replace(/^0+/, "");
    const formattedPhone = cleanedLocalPhone
      ? `${formData.countryCode}${cleanedLocalPhone}`
      : "";

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
      ? {
          fullName: trimmedName,
          countryCode: formData.countryCode,
          phone: formattedPhone,
          email: trimmedEmail,
          password: formData.password
        }
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
        persistAuthenticatedSession(data.user, data.token);
      }

      if (onLoginSuccess && data.user) {
        onLoginSuccess({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          user: data.user,
          sessionToken: data.token
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
    setCountryMenuOpen(false);
    setErrors({});
    setSuccessMessage("");
  };

  const goToLogin = () => {
    setIsSignUp(false);
    setViewState("form");
    setVerifiedResetCode("");
    setCountryMenuOpen(false);
    setErrors({});
    setSuccessMessage("");
  };

  const handleBackClick = () => {
    setCountryMenuOpen(false);
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
    if (isSignUp) {
      goToLogin();
      return;
    }
    if (typeof onBackToCardGod === "function") {
      onBackToCardGod();
    }
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

  const showBackChevron =
    viewState !== "form" || isSignUp || typeof onBackToCardGod === "function";

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

          {/* SECOND SCREEN: CREATE ACCOUNT ({ fullName, countryCode, phone, email, password }) */}
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
                    ref={countryDropdownRef}
                    className={`cn-pill-input cn-phone-row ${
                      errors.phone ? "has-error" : ""
                    } ${countryMenuOpen ? "menu-open" : ""}`}
                  >
                    <button
                      type="button"
                      className="cn-country-trigger"
                      aria-haspopup="listbox"
                      aria-expanded={countryMenuOpen}
                      aria-label={`Country dial code ${selectedCountry.name} ${selectedCountry.dial}`}
                      onClick={() => {
                        setCountryMenuOpen((prev) => !prev);
                        setCountrySearch("");
                      }}
                    >
                      <CountryFlag code={selectedCountry.code} />
                      <span className="cn-country-dial">{selectedCountry.dial}</span>
                      <ChevronDown
                        size={13}
                        strokeWidth={2.4}
                        className={`cn-country-chevron ${
                          countryMenuOpen ? "rotated" : ""
                        }`}
                      />
                    </button>

                    <span className="cn-phone-divider" aria-hidden="true" />

                    <input
                      ref={phoneInputRef}
                      type="tel"
                      name="phone"
                      placeholder="Phone number"
                      aria-label="Phone number"
                      autoComplete="tel-national"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />

                    {countryMenuOpen && (
                      <div
                        className="cn-country-popover"
                        role="listbox"
                        aria-label="Select country"
                      >
                        <div className="cn-country-search-box">
                          <Search size={13} className="cn-country-search-icon" />
                          <input
                            ref={countrySearchInputRef}
                            type="text"
                            placeholder="Search country or +code..."
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            className="cn-country-search-input"
                          />
                          {countrySearch && (
                            <button
                              type="button"
                              className="cn-country-clear-btn"
                              onClick={() => setCountrySearch("")}
                              aria-label="Clear search"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>

                        <div className="cn-country-list">
                          {filteredCountries.length === 0 ? (
                            <div className="cn-country-empty">
                              No matching country
                            </div>
                          ) : (
                            filteredCountries.map((country) => {
                              const isSelected =
                                country.code === selectedCountry.code;
                              return (
                                <button
                                  key={`${country.code}-${country.dial}`}
                                  type="button"
                                  role="option"
                                  aria-selected={isSelected}
                                  className={`cn-country-option ${
                                    isSelected ? "selected" : ""
                                  }`}
                                  onClick={() => handleSelectCountry(country)}
                                >
                                  <span className="cn-country-option-left">
                                    <CountryFlag code={country.code} />
                                    <span className="cn-country-name">
                                      {country.name}
                                    </span>
                                  </span>
                                  <span className="cn-country-option-right">
                                    <span className="cn-country-option-dial">
                                      {country.dial}
                                    </span>
                                    {isSelected && (
                                      <Check
                                        size={13}
                                        strokeWidth={2.5}
                                        className="cn-country-check"
                                      />
                                    )}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <ErrorBadge message={errors.phone} />
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
          padding-top: 32px;
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
          margin: 0 0 24px;
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
          margin-bottom: 13px;
        }

        .cn-pill-input {
          position: relative;
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

        .cn-pill-input.cn-phone-row {
          padding-left: 8px;
          gap: 8px;
        }

        .cn-pill-input.menu-open {
          border-color: #713b17;
          box-shadow: 0 0 0 3px rgba(113, 59, 23, 0.12);
        }

        .cn-country-trigger {
          height: 30px;
          padding: 0 8px;
          border-radius: 999px;
          border: 1px solid #ebe2d3;
          background: #faf6ee;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-family: inherit;
          color: #2b180d;
          flex-shrink: 0;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .cn-country-trigger:hover {
          background: #f4ecdd;
          border-color: #d6c3a5;
        }

        .cn-flag-svg {
          width: 17px;
          height: 12.5px;
          border-radius: 2.5px;
          box-shadow: 0 0 0 0.5px rgba(24, 18, 14, 0.18);
          flex-shrink: 0;
          display: block;
        }

        .cn-country-dial {
          font-size: 12.5px;
          font-weight: 700;
          color: #2b180d;
          letter-spacing: -0.2px;
        }

        .cn-country-chevron {
          color: #7c6857;
          transition: transform 0.18s ease;
        }

        .cn-country-chevron.rotated {
          transform: rotate(180deg);
          color: #713b17;
        }

        .cn-phone-divider {
          width: 1px;
          height: 18px;
          background: #e2d9c8;
          flex-shrink: 0;
        }

        .cn-country-popover {
          position: absolute;
          top: calc(100% + 7px);
          left: 0;
          right: 0;
          background: #fffdf9;
          border: 1px solid #dfd3be;
          border-radius: 18px;
          box-shadow: 0 18px 36px -12px rgba(35, 22, 14, 0.26);
          z-index: 30;
          overflow: hidden;
          animation: cnDropdownIn 0.16s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes cnDropdownIn {
          from {
            opacity: 0;
            transform: translateY(-6px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .cn-country-search-box {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 9px 12px;
          background: #faf6ee;
          border-bottom: 1px solid #ebe2d3;
        }

        .cn-country-search-icon {
          color: #8c7d6e;
          flex-shrink: 0;
        }

        .cn-country-search-input {
          flex: 1;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          font-family: inherit;
          font-size: 12.5px;
          font-weight: 500;
          color: #18120e;
        }

        .cn-country-search-input::placeholder {
          color: #9b8d7e;
        }

        .cn-country-clear-btn {
          background: rgba(113, 59, 23, 0.1);
          border: 0;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #713b17;
          cursor: pointer;
          padding: 0;
        }

        .cn-country-list {
          max-height: 196px;
          overflow-y: auto;
          padding: 5px;
        }

        .cn-country-list::-webkit-scrollbar {
          width: 5px;
        }

        .cn-country-list::-webkit-scrollbar-thumb {
          background: #d8ccb8;
          border-radius: 99px;
        }

        .cn-country-option {
          width: 100%;
          border: 0;
          background: transparent;
          padding: 8px 10px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          cursor: pointer;
          font-family: inherit;
          text-align: left;
          transition: background 0.12s ease;
        }

        .cn-country-option:hover {
          background: #f6efe2;
        }

        .cn-country-option.selected {
          background: #f2e6d0;
        }

        .cn-country-option-left {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }

        .cn-country-name {
          font-size: 12.5px;
          font-weight: 600;
          color: #18120e;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cn-country-option-right {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .cn-country-option-dial {
          font-size: 12px;
          font-weight: 700;
          color: #713b17;
        }

        .cn-country-check {
          color: #713b17;
        }

        .cn-country-empty {
          padding: 16px 12px;
          text-align: center;
          font-size: 12px;
          font-weight: 500;
          color: #8c7d6e;
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
          margin-top: 20px;
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