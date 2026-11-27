// CardGod.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowRight,
  LogIn,
  Menu,
  X,
  Wallet,
  Bitcoin,
  ReceiptText,
  Gift,
  Smartphone,
  ShieldCheck,
  Sparkles,
  Check,
  Code2,
  Zap,
  Globe,
  TrendingUp,
} from "lucide-react";
import brandLogoPng from "./assets/cardnext.png";

const NAV_ITEMS = [
  { id: "command", label: "Workspace" },
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How It Works" },
  { id: "developers", label: "API" },
];

const HERO_STATS = [
  { value: "190+", label: "eSIM Destinations" },
  { value: "5", label: "Core FX Currencies" },
  { value: "24/7", label: "Instant Settlement" },
  { value: "99.9%", label: "Uptime Target" },
];

const FEATURE_BLOCKS = [
  {
    id: "crypto",
    kicker: "CRYPTO & RWA",
    title: "Trade & Hold Digital Assets Seamlessly",
    description:
      "Monitor live valuations, manage your crypto vault alongside your multi-currency balance, and convert between digital assets and supported currencies in seconds.",
    bullets: [
      "Real-time asset & FX rate visibility",
      "Unified portfolio view with your main wallet",
      "Clean, transparent execution flow",
    ],
    accentTone: "espresso",
    visualKind: "crypto",
    reverse: false,
  },
  {
    id: "fx",
    kicker: "MULTI-CURRENCY & FX",
    title: "Move Money Across Currencies & RMB",
    description:
      "Switch display currencies effortlessly, inspect live exchange rates, and prepare cross-border payouts without friction.",
    bullets: [
      "Instant USD, EUR, GBP, RMB & NGN rate checks",
      "Built-in smart converter with live spreads",
      "Designed for borderless everyday spending",
    ],
    accentTone: "gold",
    visualKind: "fx",
    reverse: true,
  },
  {
    id: "bills",
    kicker: "BILLS & UTILITIES",
    title: "Pay Bills & Metered Utilities Fast",
    description:
      "Verify account or meter details upfront and settle power, airtime, data, and utility bills straight from your CardNext balance.",
    bullets: [
      "Upfront meter & account verification",
      "Instant receipts & transaction history",
      "Zero cluttered menus",
    ],
    accentTone: "caramel",
    visualKind: "bills",
    reverse: false,
  },
  {
    id: "giftcards",
    kicker: "GIFT CARDS & ESIM",
    title: "Global Gift Cards & Travel eSIMs",
    description:
      "Pick up popular digital gift cards or activate a travel data eSIM across 190+ destinations—all inside one cohesive workspace.",
    bullets: [
      "Instant digital delivery & pass tracking",
      "Data usage & validity visibility",
      "One account for travel & rewards",
    ],
    accentTone: "espresso",
    visualKind: "gifts",
    reverse: true,
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create or Sign In",
    text: "Access your CardNext account in seconds with streamlined authentication.",
  },
  {
    step: "02",
    title: "Fund Your Wallet",
    text: "Top up your balance and view your multi-currency wallet and crypto vault side by side.",
  },
  {
    step: "03",
    title: "Transact & Go",
    text: "Convert currencies, pay bills, buy eSIMs, or manage gift cards in one place.",
  },
];

const SECURITY_PILLARS = [
  { label: "Protected Sessions", icon: ShieldCheck },
  { label: "Verified Flows", icon: Check },
  { label: "Live Ledger Sync", icon: TrendingUp },
  { label: "Global Ready", icon: Globe },
];

const INITIAL_BUBBLES = [
  { id: 1, left: 8, top: 18, size: 46, dur: 9.5, delay: 0, dx: 22, dy: -26, tint: "gold" },
  { id: 2, left: 86, top: 15, size: 58, dur: 11.2, delay: -2.4, dx: -26, dy: 24, tint: "brown" },
  { id: 3, left: 16, top: 44, size: 36, dur: 8.4, delay: -4.1, dx: 28, dy: 18, tint: "cream" },
  { id: 4, left: 78, top: 42, size: 48, dur: 10.6, delay: -1.5, dx: -20, dy: -24, tint: "gold" },
  { id: 5, left: 11, top: 72, size: 54, dur: 12.0, delay: -3.2, dx: 24, dy: -20, tint: "brown" },
  { id: 6, left: 88, top: 68, size: 40, dur: 9.0, delay: -5.0, dx: -24, dy: -22, tint: "gold" },
  { id: 7, left: 24, top: 88, size: 44, dur: 10.2, delay: -2.8, dx: 18, dy: -28, tint: "cream" },
  { id: 8, left: 74, top: 86, size: 52, dur: 11.6, delay: -0.9, dx: -22, dy: -18, tint: "brown" },
];

const POP_PARTICLES = [
  { angle: 0, dist: 28 },
  { angle: 51, dist: 32 },
  { angle: 102, dist: 26 },
  { angle: 153, dist: 30 },
  { angle: 204, dist: 27 },
  { angle: 255, dist: 31 },
  { angle: 306, dist: 29 },
];

function BrandLogo({ className = "" }) {
  return (
    <img
      src={brandLogoPng}
      alt="CardNext"
      className={`cg-brand-logo ${className}`}
    />
  );
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function useSmoothSectionScroll(headerRef) {
  const rafRef = useRef(null);

  const scrollToSection = useCallback(
    (sectionId) => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      const targetEl =
        sectionId === "top" ? document.body : document.getElementById(sectionId);
      if (!targetEl) return;

      const headerHeight = headerRef.current
        ? headerRef.current.getBoundingClientRect().height
        : 54;
      const offset = sectionId === "top" ? 0 : headerHeight + 20;

      const startY = window.scrollY || window.pageYOffset || 0;
      const targetRectTop = targetEl.getBoundingClientRect().top + startY;
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const destinationY = Math.min(
        maxScroll,
        Math.max(0, targetRectTop - offset)
      );
      const distance = destinationY - startY;

      if (Math.abs(distance) < 2) return;

      const prefersReduced =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced) {
        window.scrollTo(0, destinationY);
        return;
      }

      const duration = Math.min(1150, Math.max(520, Math.abs(distance) * 0.42));
      const startTime = performance.now();

      const step = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const eased = easeInOutCubic(progress);

        window.scrollTo(0, startY + distance * eased);

        if (progress < 1) {
          rafRef.current = window.requestAnimationFrame(step);
        } else {
          rafRef.current = null;
        }
      };

      rafRef.current = window.requestAnimationFrame(step);
    },
    [headerRef]
  );

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return scrollToSection;
}

function useDropInView(threshold = 0.14) {
  const ref = useRef(null);
  const [droppedIn, setDroppedIn] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) {
      setDroppedIn(true);
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setDroppedIn(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDroppedIn(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, droppedIn];
}

function PlayfulBubblesLayer() {
  const [bubbles, setBubbles] = useState(INITIAL_BUBBLES);
  const [bursts, setBursts] = useState([]);
  const timersRef = useRef([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const handlePop = (bubble, e) => {
    e.stopPropagation();

    setBubbles((prev) => prev.filter((b) => b.id !== bubble.id));

    const burstId = `${bubble.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setBursts((prev) => [
      ...prev,
      {
        id: burstId,
        left: bubble.left,
        top: bubble.top,
        size: bubble.size,
        tint: bubble.tint,
      },
    ]);

    const cleanBurstTimer = window.setTimeout(() => {
      setBursts((prev) => prev.filter((item) => item.id !== burstId));
    }, 560);

    const respawnTimer = window.setTimeout(() => {
      const tints = ["gold", "brown", "cream"];
      const nextLeft = Math.floor(6 + Math.random() * 86);
      const nextTop = Math.floor(12 + Math.random() * 78);
      const nextSize = Math.floor(36 + Math.random() * 24);
      const nextDur = Number((8.2 + Math.random() * 4.2).toFixed(1));
      const nextDx = Math.round((Math.random() - 0.5) * 52);
      const nextDy = Math.round((Math.random() - 0.5) * 48);
      const nextTint = tints[Math.floor(Math.random() * tints.length)];

      setBubbles((prev) => [
        ...prev,
        {
          id: Date.now() + Math.floor(Math.random() * 10000),
          left: nextLeft,
          top: nextTop,
          size: nextSize,
          dur: nextDur,
          delay: 0,
          dx: nextDx,
          dy: nextDy,
          tint: nextTint,
        },
      ]);
    }, 2200);

    timersRef.current.push(cleanBurstTimer, respawnTimer);
  };

  return (
    <div className="cg-bubbles-layer" aria-label="Interactive floating bubbles">
      {bubbles.map((b) => (
        <button
          key={b.id}
          type="button"
          className={`cg-bubble tint-${b.tint}`}
          aria-label="Pop bubble"
          title="Pop me!"
          onClick={(e) => handlePop(b, e)}
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            "--b-dur": `${b.dur}s`,
            "--b-delay": `${b.delay}s`,
            "--b-dx": `${b.dx}px`,
            "--b-dy": `${b.dy}px`,
          }}
        >
          <span className="cg-bubble-shine" />
        </button>
      ))}

      {bursts.map((burst) => (
        <div
          key={burst.id}
          className={`cg-bubble-burst tint-${burst.tint}`}
          style={{
            left: `${burst.left}%`,
            top: `${burst.top}%`,
            width: `${burst.size}px`,
            height: `${burst.size}px`,
          }}
        >
          <span className="cg-burst-ring" />
          {POP_PARTICLES.map((p) => {
            const rad = (p.angle * Math.PI) / 180;
            const tx = Math.round(Math.cos(rad) * p.dist);
            const ty = Math.round(Math.sin(rad) * p.dist);
            return (
              <i
                key={p.angle}
                className="cg-burst-droplet"
                style={{
                  "--p-tx": `${tx}px`,
                  "--p-ty": `${ty}px`,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function DropPane({ id, className = "", delayMs = 0, children }) {
  const [ref, droppedIn] = useDropInView(0.14);

  return (
    <div
      ref={ref}
      id={id}
      style={{ "--drop-delay": `${delayMs}ms` }}
      className={`cg-drop-pane ${droppedIn ? "is-dropped" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

function CommandCenterPreview() {
  return (
    <div className="cg-cmd-stage">
      <div className="cg-cmd-window cg-float-slow">
        <div className="cg-cmd-topbar">
          <span className="cg-cmd-dots">
            <i />
            <i />
            <i />
          </span>
          <span className="cg-cmd-url">cardnext.ng / workspace</span>
          <span className="cg-cmd-live">
            <i className="cg-pulse-dot" /> Live
          </span>
        </div>

        <div className="cg-cmd-body">
          <div className="cg-cmd-sidebar">
            <div className="cg-cmd-nav-pill is-active">Overview</div>
            <div className="cg-cmd-nav-pill">Wallet & Cards</div>
            <div className="cg-cmd-nav-pill">Global eSIM</div>
            <div className="cg-cmd-nav-pill">Bills & FX</div>
          </div>

          <div className="cg-cmd-main">
            <div className="cg-cmd-vault-banner">
              <div>
                <small>PORTFOLIO OVERVIEW</small>
                <strong>$14,820.00 USD</strong>
              </div>
              <span className="cg-cmd-chip">+8.4%</span>
            </div>

            <div className="cg-cmd-mini-grid">
              <div className="cg-cmd-mini-card">
                <Wallet size={14} />
                <span>Multi-FX Wallet</span>
                <strong>USD · EUR · GBP</strong>
              </div>
              <div className="cg-cmd-mini-card is-gold">
                <Bitcoin size={14} />
                <span>Crypto Vault</span>
                <strong>$6,420.00</strong>
              </div>
              <div className="cg-cmd-mini-card">
                <Smartphone size={14} />
                <span>Travel eSIM</span>
                <strong>190+ Regions</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="cg-float-badge cg-badge-tl">
        <Zap size={13} />
        <span>Instant Settlement</span>
      </div>
      <div className="cg-float-badge cg-badge-br">
        <Sparkles size={13} />
        <span>Unified Vault</span>
      </div>
    </div>
  );
}

function FeatureArtwork({ kind, tone }) {
  return (
    <div className={`cg-art-frame tone-${tone}`}>
      <div className="cg-art-glow" aria-hidden="true" />
      {kind === "crypto" && (
        <div className="cg-token-cluster cg-float-slow">
          <div className="cg-token-node main">
            <Bitcoin size={26} />
            <strong>BTC / USDT</strong>
          </div>
          <div className="cg-token-node orb-1">
            <span>ETH</span>
          </div>
          <div className="cg-token-node orb-2">
            <span>SOL</span>
          </div>
          <div className="cg-token-node orb-3">
            <span>USD</span>
          </div>
        </div>
      )}

      {kind === "fx" && (
        <div className="cg-fx-card cg-float-slow">
          <div className="cg-fx-row">
            <span>FROM</span>
            <strong>USD · EUR · GBP</strong>
          </div>
          <div className="cg-fx-divider">
            <span className="cg-fx-pulse-line" />
            <i className="cg-fx-swap-pill">FX</i>
          </div>
          <div className="cg-fx-row">
            <span>TO</span>
            <strong>RMB · NGN</strong>
          </div>
        </div>
      )}

      {kind === "bills" && (
        <div className="cg-bills-matrix cg-float-slow">
          {["Power Meter", "Airtime", "Data Pass", "Cable TV", "Internet", "Receipts"].map(
            (item, idx) => (
              <div
                key={item}
                className={`cg-bill-tile ${idx === 0 ? "is-featured" : ""}`}
              >
                <ReceiptText size={14} />
                <span>{item}</span>
              </div>
            )
          )}
        </div>
      )}

      {kind === "gifts" && (
        <div className="cg-gift-stack cg-float-slow">
          <div className="cg-gift-card back">
            <Smartphone size={18} />
            <span>Global eSIM Pass</span>
          </div>
          <div className="cg-gift-card front">
            <Gift size={20} />
            <strong>Digital Gift Cards</strong>
            <small>Instant code delivery</small>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CardGod({ setActivePage, onNavigateAuth }) {
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);
  const headerWrapRef = useRef(null);
  const scrollToSection = useSmoothSectionScroll(headerWrapRef);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleNavClick = (e, sectionId) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    scrollToSection(sectionId);
  };

  const handleSignIn = () => {
    setMobileMenuOpen(false);
    if (typeof onNavigateAuth === "function") {
      onNavigateAuth();
      return;
    }
    if (typeof setActivePage === "function") {
      setActivePage("Auth");
    }
  };

  return (
    <>
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap");

        html {
          scroll-behavior: smooth;
        }

        .cg-god-root {
          --bg: #f7f6f3;
          --surface: #ffffff;
          --surface-warm: #fbf9f5;
          --brown: #713b17;
          --brown-dark: #3d1f10;
          --brown-mid: #8c522b;
          --gold: #f3c77c;
          --gold-deep: #d49b43;
          --gold-wash: rgba(243, 199, 124, 0.22);
          --ink: #202633;
          --muted: #6f7582;
          --border: #e8e3d9;
          --shadow-sm: 0 8px 24px rgba(61, 31, 16, 0.045);
          --shadow-lg: 0 22px 54px rgba(61, 31, 16, 0.08);

          position: relative;
          min-height: 100vh;
          width: 100%;
          background:
            radial-gradient(circle at 50% 0%, rgba(243, 199, 124, 0.26), transparent 42%),
            radial-gradient(circle at 85% 32%, rgba(113, 59, 23, 0.07), transparent 45%),
            var(--bg);
          color: var(--ink);
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          padding: 0 0 0;
          box-sizing: border-box;
          overflow-x: clip;
        }

        .cg-god-root * {
          box-sizing: border-box;
        }

        .cg-brand-logo {
          display: block;
          width: auto;
          height: var(--logo-h, 96px);
          max-width: var(--logo-max-w, 380px);
          object-fit: contain;
          flex-shrink: 0;
        }

        /* TOP LOGO SIZE */
        .cg-top-logo {
          --logo-h: 118px;
          --logo-max-w: 460px;
          margin: -18px 0;
          position: relative;
          z-index: 2;
        }

        @media (max-width: 768px) {
          .cg-top-logo {
            --logo-h: 78px;
            --logo-max-w: 310px;
            margin: -10px 0;
          }
        }

        /* FOOTER LOGO SIZE */
        .cg-footer-logo {
          --logo-h: 104px;
          --logo-max-w: 410px;
        }

        /* Playful Floating & Popping Bubbles */
        .cg-bubbles-layer {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 25;
          overflow: hidden;
        }

        .cg-bubble {
          position: fixed;
          pointer-events: auto;
          border-radius: 50%;
          padding: 0;
          cursor: pointer;
          border: 1.5px solid rgba(255, 255, 255, 0.78);
          outline: none;
          transform: translate(-50%, -50%);
          animation: cgBubbleDrift var(--b-dur, 10s) ease-in-out var(--b-delay, 0s) infinite alternate;
          transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), filter 0.2s ease;
          will-change: transform;
        }

        .cg-bubble:hover {
          transform: translate(-50%, -50%) scale(1.14);
          filter: brightness(1.06);
        }

        .cg-bubble.tint-gold {
          background: radial-gradient(circle at 30% 28%, rgba(255, 248, 226, 0.92), rgba(243, 199, 124, 0.56) 62%, rgba(212, 155, 67, 0.42) 100%);
          border-color: rgba(243, 199, 124, 0.85);
          box-shadow: 0 8px 20px rgba(212, 155, 67, 0.24), inset 0 -4px 10px rgba(113, 59, 23, 0.14);
        }

        .cg-bubble.tint-brown {
          background: radial-gradient(circle at 30% 28%, rgba(243, 199, 124, 0.45), rgba(140, 82, 43, 0.42) 64%, rgba(113, 59, 23, 0.36) 100%);
          border-color: rgba(140, 82, 43, 0.52);
          box-shadow: 0 8px 20px rgba(113, 59, 23, 0.16), inset 0 -4px 10px rgba(61, 31, 16, 0.16);
        }

        .cg-bubble.tint-cream {
          background: radial-gradient(circle at 30% 28%, rgba(255, 255, 255, 0.96), rgba(251, 249, 245, 0.72) 68%, rgba(243, 199, 124, 0.35) 100%);
          border-color: rgba(255, 255, 255, 0.95);
          box-shadow: 0 8px 18px rgba(61, 31, 16, 0.1), inset 0 -4px 8px rgba(212, 155, 67, 0.16);
        }

        .cg-bubble-shine {
          position: absolute;
          top: 18%;
          left: 22%;
          width: 32%;
          height: 20%;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.85);
          transform: rotate(-28deg);
          pointer-events: none;
        }

        @keyframes cgBubbleDrift {
          0% {
            transform: translate(-50%, -50%) translate3d(0px, 0px, 0) scale(1);
          }
          50% {
            transform: translate(-50%, -50%) translate3d(var(--b-dx, 20px), var(--b-dy, -22px), 0) scale(1.05);
          }
          100% {
            transform: translate(-50%, -50%) translate3d(calc(var(--b-dx, 20px) * -0.5), calc(var(--b-dy, -22px) * 0.6), 0) scale(0.97);
          }
        }

        .cg-bubble-burst {
          position: fixed;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }

        .cg-burst-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid var(--gold-deep);
          animation: cgBurstRingAnim 0.46s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .cg-bubble-burst.tint-brown .cg-burst-ring {
          border-color: var(--brown);
        }

        .cg-burst-droplet {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 7px;
          height: 7px;
          margin: -3.5px 0 0 -3.5px;
          border-radius: 50%;
          background: var(--gold-deep);
          animation: cgDropletPop 0.52s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .cg-bubble-burst.tint-brown .cg-burst-droplet {
          background: var(--brown);
        }

        @keyframes cgBurstRingAnim {
          0% {
            opacity: 0.95;
            transform: scale(0.65);
          }
          100% {
            opacity: 0;
            transform: scale(1.55);
          }
        }

        @keyframes cgDropletPop {
          0% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(var(--p-tx, 24px), var(--p-ty, -24px), 0) scale(0.2);
          }
        }

        @keyframes cgHeroDropIn {
          0% {
            opacity: 0;
            transform: translateY(-24px) scale(0.985);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes cgFloatGentle {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-7px);
          }
        }

        @keyframes cgBadgeFloat {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-5px) rotate(1deg);
          }
        }

        @keyframes cgPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.45;
            transform: scale(0.82);
          }
        }

        @keyframes cgFlowBeam {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(250%);
          }
        }

        @keyframes cgDropdownIn {
          0% {
            opacity: 0;
            transform: translateY(-6px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .cg-hero-anim {
          opacity: 0;
          animation: cgHeroDropIn 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .cg-drop-pane {
          opacity: 0;
          transform: translateY(-38px) scale(0.975);
          transition:
            opacity 0.72s cubic-bezier(0.16, 1, 0.3, 1) var(--drop-delay, 0ms),
            transform 0.78s cubic-bezier(0.16, 1, 0.3, 1) var(--drop-delay, 0ms);
          will-change: transform, opacity;
        }

        .cg-drop-pane.is-dropped {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .cg-float-slow {
          animation: cgFloatGentle 5.4s ease-in-out infinite;
        }

        .cg-float-badge {
          animation: cgBadgeFloat 4.2s ease-in-out infinite;
        }

        /* Compact Full-Width Sticky Header */
        .cg-header-wrap {
          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          width: 100%;
          z-index: 60;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(232, 227, 217, 0.95);
          box-shadow: 0 4px 18px rgba(61, 31, 16, 0.04);
        }

        .cg-header {
          max-width: 1140px;
          width: 100%;
          min-height: 52px;
          margin: 0 auto;
          padding: 4px clamp(16px, 4vw, 36px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .cg-brand {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
          flex-shrink: 0;
          transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .cg-brand:hover {
          transform: scale(1.03);
        }

        .cg-nav-desktop {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .cg-nav-links {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .cg-nav-link {
          text-decoration: none;
          font-size: 12px;
          font-weight: 650;
          color: var(--muted);
          padding: 4px 2px;
          border-bottom: 1.5px solid transparent;
          transition: color 0.18s ease, border-color 0.18s ease;
        }

        .cg-nav-link:hover {
          color: var(--brown-dark);
          border-bottom-color: var(--gold-deep);
        }

        .cg-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          height: 36px;
          padding: 0 16px;
          border-radius: 10px;
          border: 0;
          background: linear-gradient(145deg, var(--brown-mid) 0%, var(--brown) 55%, var(--brown-dark) 100%);
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(113, 59, 23, 0.2);
          transition:
            transform 0.24s cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 0.24s ease,
            filter 0.2s ease;
        }

        .cg-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(61, 31, 16, 0.26);
          filter: brightness(1.04);
        }

        .cg-btn-primary:active {
          transform: scale(0.98);
        }

        .cg-btn-primary .cg-arrow {
          transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .cg-btn-primary:hover .cg-arrow {
          transform: translateX(3px);
        }

        .cg-btn-ghost {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          height: 40px;
          padding: 0 16px;
          border-radius: 11px;
          text-decoration: none;
          background: var(--surface-warm);
          border: 1px solid var(--border);
          color: var(--brown-dark);
          font-size: 12.5px;
          font-weight: 750;
          transition: background 0.18s ease, border-color 0.18s ease;
        }

        .cg-btn-ghost:hover {
          background: #f2ece1;
          border-color: #d6be9e;
        }

        /* Mobile Hamburger & Right Dropdown */
        .cg-mobile-nav {
          display: none;
          position: relative;
        }

        .cg-hamburger {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--surface-warm);
          border: 1px solid var(--border);
          color: var(--brown-dark);
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: background 0.18s ease, border-color 0.18s ease;
        }

        .cg-hamburger:hover,
        .cg-hamburger.is-open {
          background: #f2ece1;
          border-color: #d6be9e;
          color: var(--brown);
        }

        .cg-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 215px;
          padding: 10px;
          border-radius: 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          box-shadow: 0 18px 42px rgba(37, 30, 22, 0.15);
          display: flex;
          flex-direction: column;
          gap: 3px;
          z-index: 80;
          animation: cgDropdownIn 0.18s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .cg-dropdown-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          border-radius: 9px;
          text-decoration: none;
          color: var(--brown-dark);
          font-size: 12px;
          font-weight: 650;
          transition: background 0.15s ease;
        }

        .cg-dropdown-item:hover {
          background: var(--surface-warm);
        }

        .cg-dropdown-sep {
          height: 1px;
          background: var(--border);
          margin: 5px 0;
        }

        .cg-dropdown-signin {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          width: 100%;
          height: 40px;
          border-radius: 10px;
          border: 0;
          background: linear-gradient(145deg, var(--brown-mid), var(--brown));
          color: #ffffff;
          font-size: 12.5px;
          font-weight: 800;
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .cg-nav-desktop {
            display: none;
          }
          .cg-mobile-nav {
            display: block;
          }
        }

        /* Main Container */
        .cg-main {
          position: relative;
          z-index: 30;
          max-width: 1080px;
          margin: 0 auto;
          padding: clamp(32px, 5vw, 56px) clamp(14px, 4vw, 48px) 0;
          display: flex;
          flex-direction: column;
          gap: clamp(52px, 7.5vw, 88px);
        }

        /* Hero Section */
        .cg-hero {
          text-align: center;
          max-width: 740px;
          margin: 0 auto;
        }

        .cg-hero-h1 {
          margin: 4px 0 14px;
          font-size: clamp(32px, 5.4vw, 54px);
          font-weight: 900;
          letter-spacing: -1.6px;
          line-height: 1.08;
          color: var(--brown-dark);
        }

        .cg-hero-h1 span.cg-grad-word {
          background: linear-gradient(135deg, var(--brown) 0%, var(--brown-mid) 55%, var(--gold-deep) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .cg-hero-lead {
          margin: 0 auto 24px;
          max-width: 540px;
          font-size: clamp(13.5px, 1.8vw, 15.5px);
          line-height: 1.65;
          color: var(--muted);
        }

        .cg-hero-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .cg-hero-cta-lg {
          height: 46px;
          padding: 0 26px;
          font-size: 13.5px;
          border-radius: 13px;
        }

        /* Stats Strip */
        .cg-stats-bar {
          margin: 34px auto 0;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 16px 12px;
          box-shadow: var(--shadow-sm);
        }

        @media (max-width: 640px) {
          .cg-stats-bar {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px 6px;
            padding: 14px 10px;
          }
        }

        .cg-stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 4px 8px;
          border-right: 1px solid #efebe2;
        }

        .cg-stat-item:last-child {
          border-right: 0;
        }

        @media (max-width: 640px) {
          .cg-stat-item:nth-child(2n) {
            border-right: 0;
          }
        }

        .cg-stat-item strong {
          font-size: clamp(18px, 2.5vw, 24px);
          font-weight: 900;
          color: var(--brown-dark);
          letter-spacing: -0.6px;
        }

        .cg-stat-item span {
          font-size: 11px;
          font-weight: 600;
          color: var(--muted);
        }

        /* Command Center Showcase */
        .cg-section-head {
          text-align: center;
          max-width: 560px;
          margin: 0 auto 26px;
        }

        .cg-section-head small {
          display: inline-block;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--brown-mid);
          margin-bottom: 6px;
        }

        .cg-section-head h2 {
          margin: 0 0 8px;
          font-size: clamp(24px, 3.6vw, 34px);
          font-weight: 900;
          letter-spacing: -0.9px;
          color: var(--brown-dark);
        }

        .cg-section-head p {
          margin: 0;
          font-size: 13.5px;
          line-height: 1.6;
          color: var(--muted);
        }

        .cg-cmd-stage {
          position: relative;
          max-width: 820px;
          margin: 0 auto;
          padding: 12px;
        }

        .cg-cmd-window {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 22px;
          overflow: hidden;
          box-shadow: var(--shadow-lg);
        }

        .cg-cmd-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 11px 16px;
          background: var(--surface-warm);
          border-bottom: 1px solid var(--border);
          font-size: 11px;
          color: var(--muted);
        }

        .cg-cmd-dots {
          display: inline-flex;
          gap: 6px;
        }

        .cg-cmd-dots i {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #dfd7c8;
          display: block;
        }

        .cg-cmd-live {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-weight: 750;
          color: var(--brown);
        }

        .cg-pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--brown);
          animation: cgPulse 2s ease-in-out infinite;
        }

        .cg-cmd-body {
          display: grid;
          grid-template-columns: 170px minmax(0, 1fr);
          min-height: 220px;
        }

        @media (max-width: 640px) {
          .cg-cmd-body {
            grid-template-columns: 1fr;
          }
        }

        .cg-cmd-sidebar {
          padding: 14px;
          background: #fcfbf8;
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        @media (max-width: 640px) {
          .cg-cmd-sidebar {
            flex-direction: row;
            overflow-x: auto;
            border-right: 0;
            border-bottom: 1px solid var(--border);
            padding: 10px 12px;
          }
        }

        .cg-cmd-nav-pill {
          padding: 8px 10px;
          border-radius: 9px;
          font-size: 11px;
          font-weight: 650;
          color: var(--muted);
          white-space: nowrap;
        }

        .cg-cmd-nav-pill.is-active {
          background: var(--gold-wash);
          color: var(--brown-dark);
          font-weight: 800;
        }

        .cg-cmd-main {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .cg-cmd-vault-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 15px;
          background: linear-gradient(135deg, #21120a 0%, var(--brown) 62%, var(--brown-dark) 100%);
          color: #ffffff;
        }

        .cg-cmd-vault-banner small {
          display: block;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1px;
          color: var(--gold);
        }

        .cg-cmd-vault-banner strong {
          display: block;
          font-size: clamp(18px, 2.6vw, 24px);
          font-weight: 900;
          margin-top: 2px;
        }

        .cg-cmd-chip {
          padding: 5px 10px;
          border-radius: 999px;
          background: rgba(243, 199, 124, 0.18);
          border: 1px solid rgba(243, 199, 124, 0.35);
          color: var(--gold);
          font-size: 11px;
          font-weight: 800;
        }

        .cg-cmd-mini-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        @media (max-width: 520px) {
          .cg-cmd-mini-grid {
            grid-template-columns: 1fr;
          }
        }

        .cg-cmd-mini-card {
          padding: 11px 12px;
          border-radius: 12px;
          background: var(--surface-warm);
          border: 1px solid var(--border);
          color: var(--brown);
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .cg-cmd-mini-card.is-gold {
          background: var(--gold-wash);
          border-color: rgba(212, 155, 67, 0.38);
        }

        .cg-cmd-mini-card span {
          font-size: 10px;
          font-weight: 700;
          color: var(--muted);
        }

        .cg-cmd-mini-card strong {
          font-size: 12.5px;
          font-weight: 850;
          color: var(--brown-dark);
        }

        .cg-float-badge {
          position: absolute;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 999px;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--brown-dark);
          font-size: 11px;
          font-weight: 800;
          box-shadow: 0 12px 26px rgba(61, 31, 16, 0.1);
        }

        .cg-badge-tl {
          top: 0;
          left: 0;
        }

        .cg-badge-br {
          bottom: 0;
          right: 0;
        }

        @media (max-width: 640px) {
          .cg-float-badge {
            display: none;
          }
        }

        /* Alternating Feature Panes */
        .cg-features-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .cg-feature-row {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
          gap: clamp(24px, 4vw, 48px);
          align-items: center;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: clamp(20px, 3.5vw, 36px);
          box-shadow: var(--shadow-sm);
        }

        .cg-feature-row.is-reverse .cg-feature-art {
          order: -1;
        }

        @media (max-width: 840px) {
          .cg-feature-row {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .cg-feature-row.is-reverse .cg-feature-art {
            order: 0;
          }
        }

        .cg-art-frame {
          position: relative;
          min-height: 220px;
          border-radius: 18px;
          border: 1px solid var(--border);
          background: var(--surface-warm);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          overflow: hidden;
        }

        .cg-art-frame.tone-gold {
          background: linear-gradient(145deg, #fffdf9 0%, #fdf4e3 100%);
        }

        .cg-art-frame.tone-caramel {
          background: linear-gradient(145deg, #fbf9f5 0%, #f3e7d7 100%);
        }

        .cg-art-glow {
          position: absolute;
          width: 190px;
          height: 190px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(243, 199, 124, 0.36), transparent 70%);
          pointer-events: none;
        }

        /* Crypto Visual */
        .cg-token-cluster {
          position: relative;
          width: 210px;
          height: 170px;
          display: grid;
          place-items: center;
        }

        .cg-token-node {
          position: absolute;
          display: grid;
          place-items: center;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--brown-dark);
          box-shadow: 0 10px 22px rgba(61, 31, 16, 0.08);
        }

        .cg-token-node.main {
          width: 108px;
          height: 108px;
          border-radius: 24px;
          background: linear-gradient(145deg, var(--brown-dark), var(--brown));
          color: var(--gold);
          border-color: rgba(243, 199, 124, 0.45);
          gap: 4px;
          padding: 8px;
          text-align: center;
        }

        .cg-token-node.main strong {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.4px;
        }

        .cg-token-node.orb-1,
        .cg-token-node.orb-2,
        .cg-token-node.orb-3 {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          font-size: 10.5px;
          font-weight: 850;
          color: var(--brown);
        }

        .cg-token-node.orb-1 { top: 4px; right: 12px; }
        .cg-token-node.orb-2 { bottom: 6px; left: 10px; }
        .cg-token-node.orb-3 { bottom: 10px; right: 16px; background: var(--gold-wash); }

        /* FX Visual */
        .cg-fx-card {
          width: 100%;
          max-width: 250px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 12px 26px rgba(61, 31, 16, 0.07);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .cg-fx-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 12px;
          border-radius: 10px;
          background: var(--surface-warm);
        }

        .cg-fx-row span {
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.6px;
          color: var(--muted);
        }

        .cg-fx-row strong {
          font-size: 12.5px;
          font-weight: 850;
          color: var(--brown-dark);
        }

        .cg-fx-divider {
          position: relative;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .cg-fx-pulse-line {
          position: absolute;
          left: 0;
          width: 45%;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--gold-deep), transparent);
          animation: cgFlowBeam 2.4s linear infinite;
        }

        .cg-fx-swap-pill {
          position: relative;
          z-index: 1;
          font-style: normal;
          padding: 3px 10px;
          border-radius: 999px;
          background: var(--brown);
          color: var(--gold);
          font-size: 10px;
          font-weight: 850;
        }

        /* Bills Matrix */
        .cg-bills-matrix {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          width: 100%;
          max-width: 270px;
        }

        .cg-bill-tile {
          padding: 10px 8px;
          border-radius: 11px;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--brown-dark);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 700;
          text-align: center;
        }

        .cg-bill-tile.is-featured {
          background: var(--brown);
          color: var(--gold);
          border-color: var(--brown);
        }

        /* Gift & eSIM Stack */
        .cg-gift-stack {
          position: relative;
          width: 100%;
          max-width: 250px;
          height: 168px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cg-gift-card {
          position: absolute;
          width: 215px;
          border-radius: 15px;
          padding: 14px 16px;
          border: 1px solid var(--border);
          box-shadow: 0 12px 24px rgba(61, 31, 16, 0.08);
        }

        .cg-gift-card.back {
          top: 8px;
          right: 4px;
          background: var(--surface);
          color: var(--brown-mid);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11.5px;
          font-weight: 750;
          opacity: 0.9;
        }

        .cg-gift-card.front {
          bottom: 8px;
          left: 4px;
          background: linear-gradient(145deg, var(--brown-dark), var(--brown));
          color: #ffffff;
          border-color: rgba(243, 199, 124, 0.45);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .cg-gift-card.front svg {
          color: var(--gold);
        }

        .cg-gift-card.front strong {
          font-size: 13px;
          font-weight: 850;
        }

        .cg-gift-card.front small {
          font-size: 10.5px;
          color: #e6d5be;
        }

        /* Feature Copy */
        .cg-feature-copy small.cg-kicker {
          display: inline-block;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.9px;
          color: var(--brown-mid);
          margin-bottom: 6px;
        }

        .cg-feature-copy h3 {
          margin: 0 0 10px;
          font-size: clamp(20px, 2.8vw, 27px);
          font-weight: 900;
          letter-spacing: -0.6px;
          line-height: 1.18;
          color: var(--brown-dark);
        }

        .cg-feature-copy p {
          margin: 0 0 16px;
          font-size: 13px;
          line-height: 1.62;
          color: var(--muted);
        }

        .cg-check-list {
          list-style: none;
          margin: 0 0 18px;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .cg-check-list li {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 650;
          color: var(--brown-dark);
        }

        .cg-check-icon {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--gold-wash);
          color: var(--brown);
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .cg-inline-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0;
          background: transparent;
          border: 0;
          color: var(--brown);
          font-size: 12.5px;
          font-weight: 800;
          cursor: pointer;
        }

        .cg-inline-link:hover {
          color: var(--brown-dark);
          text-decoration: underline;
        }

        /* How It Works */
        .cg-steps-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        @media (max-width: 768px) {
          .cg-steps-grid {
            grid-template-columns: 1fr;
          }
        }

        .cg-step-pane {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 22px;
          box-shadow: var(--shadow-sm);
        }

        .cg-step-num {
          display: inline-grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: linear-gradient(145deg, var(--brown-dark), var(--brown));
          color: var(--gold);
          font-size: 12px;
          font-weight: 900;
          margin-bottom: 12px;
        }

        .cg-step-pane h3 {
          margin: 0 0 6px;
          font-size: 15px;
          font-weight: 850;
          color: var(--brown-dark);
        }

        .cg-step-pane p {
          margin: 0;
          font-size: 12px;
          line-height: 1.55;
          color: var(--muted);
        }

        /* Security Banner */
        .cg-security-banner {
          background: linear-gradient(135deg, #1d1009 0%, var(--brown-dark) 52%, var(--brown) 100%);
          border: 1px solid rgba(243, 199, 124, 0.3);
          border-radius: 24px;
          padding: clamp(24px, 4vw, 38px);
          color: #ffffff;
          text-align: center;
          box-shadow: var(--shadow-lg);
        }

        .cg-security-banner h2 {
          margin: 0 0 8px;
          font-size: clamp(22px, 3.4vw, 30px);
          font-weight: 900;
          letter-spacing: -0.7px;
        }

        .cg-security-banner p {
          margin: 0 auto 22px;
          max-width: 500px;
          font-size: 13px;
          color: #e6d5be;
          line-height: 1.6;
        }

        .cg-pillars-row {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        @media (max-width: 680px) {
          .cg-pillars-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        .cg-pillar-box {
          padding: 12px 10px;
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(243, 199, 124, 0.22);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 750;
          color: #fff3dc;
        }

        .cg-pillar-box svg {
          color: var(--gold);
        }

        /* Developer / API Showcase */
        .cg-dev-card {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
          gap: 28px;
          align-items: center;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: clamp(22px, 4vw, 38px);
          box-shadow: var(--shadow-sm);
        }

        @media (max-width: 840px) {
          .cg-dev-card {
            grid-template-columns: 1fr;
          }
        }

        .cg-code-window {
          background: #170e08;
          border: 1px solid rgba(243, 199, 124, 0.25);
          border-radius: 16px;
          padding: 16px;
          color: #f6ead6;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 11.5px;
          line-height: 1.65;
          overflow-x: auto;
          box-shadow: 0 14px 32px rgba(23, 14, 8, 0.18);
        }

        .cg-code-key { color: var(--gold); }
        .cg-code-str { color: #e8b679; }
        .cg-code-muted { color: #9c8874; }

        /* Footer */
        .cg-footer {
          position: relative;
          z-index: 30;
          margin-top: clamp(52px, 7.5vw, 84px);
          background: #1b0f09;
          color: #d8c7b4;
          border-top: 1px solid rgba(243, 199, 124, 0.2);
          padding: 32px clamp(18px, 4vw, 48px) 26px;
        }

        .cg-footer-inner {
          max-width: 1080px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .cg-footer-brand {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
          transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .cg-footer-brand:hover {
          transform: scale(1.03);
        }

        .cg-footer-meta {
          font-size: 11.5px;
          color: #a99581;
        }

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }
          .cg-bubble,
          .cg-burst-ring,
          .cg-burst-droplet,
          .cg-hero-anim,
          .cg-drop-pane,
          .cg-float-slow,
          .cg-float-badge,
          .cg-pulse-dot,
          .cg-fx-pulse-line,
          .cg-dropdown {
            animation: none !important;
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      <div id="top" className="cg-god-root">
        <PlayfulBubblesLayer />

        {/* Compact Full-Width Header: Desktop Nav + Mobile Right Hamburger Dropdown */}
        <div ref={headerWrapRef} className="cg-header-wrap">
          <header className="cg-header" aria-label="CardNext navigation">
            <a
              href="#top"
              className="cg-brand"
              aria-label="CardNext home"
              onClick={(e) => handleNavClick(e, "top")}
            >
              <BrandLogo className="cg-top-logo" />
            </a>

            <div className="cg-nav-desktop">
              <nav className="cg-nav-links" aria-label="Page sections">
                {NAV_ITEMS.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="cg-nav-link"
                    onClick={(e) => handleNavClick(e, item.id)}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>

              <button
                type="button"
                className="cg-btn-primary"
                onClick={handleSignIn}
              >
                <LogIn size={13} />
                <span>Sign In</span>
              </button>
            </div>

            <div className="cg-mobile-nav" ref={mobileMenuRef}>
              <button
                type="button"
                className={`cg-hamburger ${mobileMenuOpen ? "is-open" : ""}`}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen((prev) => !prev)}
              >
                {mobileMenuOpen ? <X size={17} /> : <Menu size={17} />}
              </button>

              {mobileMenuOpen && (
                <div className="cg-dropdown" role="menu">
                  {NAV_ITEMS.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="cg-dropdown-item"
                      onClick={(e) => handleNavClick(e, item.id)}
                    >
                      <span>{item.label}</span>
                      <ArrowRight size={13} />
                    </a>
                  ))}
                  <div className="cg-dropdown-sep" />
                  <button
                    type="button"
                    className="cg-dropdown-signin"
                    onClick={handleSignIn}
                  >
                    <LogIn size={15} />
                    <span>Sign In</span>
                  </button>
                </div>
              )}
            </div>
          </header>
        </div>

        <main className="cg-main">
          {/* Hero */}
          <section
            className={`cg-hero ${mounted ? "cg-hero-anim" : ""}`}
            aria-label="CardNext introduction"
          >
            <h1 className="cg-hero-h1">
              The Future of <span className="cg-grad-word">Multi-Currency Wallet</span>,
              Crypto, Bills & Gift Cards
            </h1>

            <p className="cg-hero-lead">
              Manage balances, track live rates, pay utility bills, activate global
              eSIMs, and access digital gift cards inside one refined workspace.
            </p>

            <div className="cg-hero-actions">
              <button
                type="button"
                className="cg-btn-primary cg-hero-cta-lg"
                onClick={handleSignIn}
              >
                <LogIn size={16} />
                <span>Sign In</span>
                <ArrowRight size={15} className="cg-arrow" />
              </button>

              <a
                href="#features"
                className="cg-btn-ghost cg-hero-cta-lg"
                onClick={(e) => handleNavClick(e, "features")}
              >
                <span>Explore Features</span>
              </a>
            </div>

            <div className="cg-stats-bar" aria-label="Platform highlights">
              {HERO_STATS.map((item) => (
                <div className="cg-stat-item" key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Command Center Pane */}
          <DropPane id="command">
            <div className="cg-section-head">
              <small>COMMAND CENTRE</small>
              <h2>Your Financial Command Centre</h2>
              <p>
                See your multi-currency balance, crypto vault, and active services at a
                glance with zero clutter.
              </p>
            </div>
            <CommandCenterPreview />
          </DropPane>

          {/* Feature Panes */}
          <div id="features">
            <DropPane className="cg-section-head">
              <small>EVERYTHING IN ONE PLACE</small>
              <h2>Built for Speed & Clarity</h2>
              <p>
                Purpose-built modules designed to work together seamlessly as your
                activity grows.
              </p>
            </DropPane>

            <div className="cg-features-list">
              {FEATURE_BLOCKS.map((block, index) => (
                <DropPane key={block.id} delayMs={(index % 2) * 80}>
                  <article
                    className={`cg-feature-row ${block.reverse ? "is-reverse" : ""}`}
                  >
                    <div className="cg-feature-copy">
                      <small className="cg-kicker">{block.kicker}</small>
                      <h3>{block.title}</h3>
                      <p>{block.description}</p>
                      <ul className="cg-check-list">
                        {block.bullets.map((pt) => (
                          <li key={pt}>
                            <span className="cg-check-icon">
                              <Check size={11} strokeWidth={3} />
                            </span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        className="cg-inline-link"
                        onClick={handleSignIn}
                      >
                        <span>Sign in to use {block.kicker.toLowerCase()}</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>

                    <div className="cg-feature-art">
                      <FeatureArtwork kind={block.visualKind} tone={block.accentTone} />
                    </div>
                  </article>
                </DropPane>
              ))}
            </div>
          </div>

          {/* How It Works Panes */}
          <div id="how-it-works">
            <DropPane className="cg-section-head">
              <small>GET STARTED</small>
              <h2>How It Works</h2>
              <p>Three straightforward steps from sign-in to everyday transactions.</p>
            </DropPane>

            <div className="cg-steps-grid">
              {HOW_IT_WORKS.map((item, idx) => (
                <DropPane key={item.step} delayMs={idx * 90}>
                  <div className="cg-step-pane">
                    <span className="cg-step-num">{item.step}</span>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                </DropPane>
              ))}
            </div>
          </div>

          {/* Security Pane */}
          <DropPane id="security">
            <div className="cg-security-banner">
              <h2>Your Security, Our Priority</h2>
              <p>
                Structured session handling, clear transaction receipts, and
                predictable workspace state across every view.
              </p>

              <div className="cg-pillars-row">
                {SECURITY_PILLARS.map(({ label, icon: Icon }) => (
                  <div className="cg-pillar-box" key={label}>
                    <Icon size={18} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </DropPane>

          {/* Developer API Pane */}
          <DropPane id="developers">
            <div className="cg-dev-card">
              <div className="cg-feature-copy">
                <small className="cg-kicker">DEVELOPERS</small>
                <h3>Modular Services & Live Rate Endpoints</h3>
                <p>
                  Connect wallet balances, live market rates, and eSIM order flows
                  cleanly into your CardNext experience.
                </p>
                <button
                  type="button"
                  className="cg-btn-primary"
                  onClick={handleSignIn}
                >
                  <Code2 size={15} />
                  <span>Open Workspace</span>
                  <ArrowRight size={14} className="cg-arrow" />
                </button>
              </div>

              <pre className="cg-code-window" aria-label="Sample CardNext API response">
                <code>
                  <span className="cg-code-muted">// CardNext Vault & Rates</span>
                  {"\n"}
                  <span className="cg-code-key">GET</span>{" "}
                  <span className="cg-code-str">/api/wallet/balance/:userId</span>
                  {"\n"}
                  {"{\n  "}
                  <span className="cg-code-key">"success"</span>: true,{"\n  "}
                  <span className="cg-code-key">"currency"</span>:{" "}
                  <span className="cg-code-str">"USD"</span>,{"\n  "}
                  <span className="cg-code-key">"status"</span>:{" "}
                  <span className="cg-code-str">"active"</span>
                  {"\n}"}
                </code>
              </pre>
            </div>
          </DropPane>
        </main>

        <DropPane>
          <footer className="cg-footer">
            <div className="cg-footer-inner">
              <a
                href="#top"
                className="cg-footer-brand"
                aria-label="CardNext back to top"
                onClick={(e) => handleNavClick(e, "top")}
              >
                <BrandLogo className="cg-footer-logo" />
              </a>
              <div className="cg-footer-meta">
                © 2026 CardNext · All rights reserved
              </div>
            </div>
          </footer>
        </DropPane>
      </div>
    </>
  );
}
