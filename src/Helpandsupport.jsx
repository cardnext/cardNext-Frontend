import React, { useState, useEffect } from "react";
import {
  Search, MessageSquare, PhoneCall, Mail,
  ChevronDown, ChevronUp, Check, Send, LifeBuoy, ArrowUp
} from "lucide-react";

const faqData = [
  {
    category: "Wallet & Funding",
    question: "How long do bank transfers take to reflect?",
    answer: "Usually 1–5 minutes. If it exceeds 15 minutes, share your transaction reference with support."
  },
  {
    category: "Travel & Flights",
    question: "Can I modify or cancel a flight booking?",
    answer: "Changes and cancellations follow airline fare rules. Check your booking details or contact support."
  },
  {
    category: "Global eSIMs",
    question: "How do I activate my eSIM?",
    answer: "Open cellular/mobile settings, select Add eSIM, and scan your QR code from email or dashboard."
  },
  {
    category: "Crypto & RWA",
    question: "Are RWA yields paid out automatically?",
    answer: "Yes. Accrued yields are calculated daily and credited at month-end."
  },
  {
    category: "Account & Security",
    question: "How do I upgrade to Tier 3?",
    answer: "Go to Settings > Profile and complete BVN and NIN verification."
  }
];

const categories = ["All", "Wallet & Funding", "Travel & Flights", "Global eSIMs", "Crypto & RWA", "Account & Security"];

export default function HelpAndSupportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [openIndex, setOpenIndex] = useState(0);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketCategory, setTicketCategory] = useState("Wallet & Funding");
  const [submitted, setSubmitted] = useState(false);
  const [ticketRef, setTicketRef] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 240);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredFaqs = faqData.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      item.question.toLowerCase().includes(q) ||
      item.answer.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q);
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;
    setTicketRef(`#CN-${Math.floor(100000 + Math.random() * 900000)}`);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setTicketSubject("");
      setTicketMessage("");
      setTicketRef("");
    }, 4000);
  };

  return (
    <div className="support-container animate-fade-in">
      <section className="support-hero">
        <div className="support-hero-content">
          <span className="banner-pill"><LifeBuoy size={12} /> <span>24/7 SUPPORT</span></span>
          <h2>How can we help?</h2>
          <p>Search FAQs or open a ticket.</p>
          <div className="support-search-bar">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search eSIM, wallet, flights, RWA..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      <div className="support-quick-grid">
        <div className="support-quick-card">
          <div className="quick-icon-wrap blue"><MessageSquare size={17} /></div>
          <div className="quick-meta">
            <h3>Live Chat</h3>
            <p>&lt; 2 min reply</p>
          </div>
          <button
            type="button"
            className="quick-action-btn"
            onClick={() => alert("Launching live chat...")}
          >
            Chat
          </button>
        </div>

        <div className="support-quick-card">
          <div className="quick-icon-wrap green"><Mail size={17} /></div>
          <div className="quick-meta">
            <h3>Email</h3>
            <p>support@cardnext.tech</p>
          </div>
          <a className="quick-action-btn" href="mailto:support@cardnext.tech">Email</a>
        </div>

        <div className="support-quick-card">
          <div className="quick-icon-wrap orange"><PhoneCall size={17} /></div>
          <div className="quick-meta">
            <h3>Phone</h3>
            <p>Mon–Fri, 8am–6pm</p>
          </div>
          <a className="quick-action-btn" href="tel:+2348000000000">Call</a>
        </div>
      </div>

      <div className="support-main-grid">
        <div className="card support-card">
          <div className="section-heading">
            <div>
              <h3>FAQs</h3>
              <p>Common answers</p>
            </div>
          </div>

          <div className="faq-category-scroll no-scrollbar">
            {categories.map(cat => (
              <button
                type="button"
                key={cat}
                className={`category-pill ${selectedCategory === cat ? "active" : ""}`}
                onClick={() => {
                  setSelectedCategory(cat);
                  setOpenIndex(0);
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="faq-list">
            {filteredFaqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div key={`${faq.category}-${faq.question}`} className={`faq-item ${isOpen ? "open" : ""}`}>
                  <button
                    type="button"
                    className="faq-question-btn"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                  >
                    <div className="faq-q-copy">
                      <span className="faq-tag">{faq.category}</span>
                      <strong>{faq.question}</strong>
                    </div>
                    <div className="faq-chevron-wrap">
                      {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="faq-answer">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredFaqs.length === 0 && (
              <div className="empty-state">No matching FAQs. Submit a ticket.</div>
            )}
          </div>
        </div>

        <div className="card support-card">
          <div className="section-heading">
            <div>
              <h3>Support Ticket</h3>
              <p>Send details to our team</p>
            </div>
          </div>

          {submitted ? (
            <div className="ticket-success-box animate-pop">
              <div className="success-icon"><Check size={22} /></div>
              <h3>Ticket Sent</h3>
              <p>Ref: <b>{ticketRef}</b></p>
            </div>
          ) : (
            <form onSubmit={handleTicketSubmit} className="ticket-form">
              <div className="form-group">
                <label htmlFor="ticket-cat">Category</label>
                <div className="input-field-wrap">
                  <select
                    id="ticket-cat"
                    value={ticketCategory}
                    onChange={e => setTicketCategory(e.target.value)}
                  >
                    <option>Wallet & Funding</option>
                    <option>Travel & Flights</option>
                    <option>Global eSIMs</option>
                    <option>Bills & Utilities</option>
                    <option>Crypto & RWA</option>
                    <option>Account & Security</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="ticket-subj">Subject</label>
                <div className="input-field-wrap">
                  <input
                    id="ticket-subj"
                    type="text"
                    placeholder="Short subject"
                    value={ticketSubject}
                    onChange={e => setTicketSubject(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="ticket-msg">Message</label>
                <div className="textarea-wrap">
                  <textarea
                    id="ticket-msg"
                    rows={3}
                    placeholder="Reference ID or issue details..."
                    value={ticketMessage}
                    onChange={e => setTicketMessage(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="panel-action-row">
                <button type="submit" className="save-btn-primary">
                  <Send size={13} />
                  <span>Submit</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

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

        .animate-fade-in { animation: fadeIn 0.25s ease forwards; }
        .animate-pop { animation: popIn 0.2s ease-out forwards; }

        .support-container { display: flex; flex-direction: column; gap: 18px; width: 100%; box-sizing: border-box; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }

        .support-hero { border-radius: 16px; color: #fff; background: radial-gradient(circle at top right, #3d1f10 0%, #17130f 75%); padding: 26px 26px; border: 1px solid #3d2416; box-shadow: 0 10px 30px rgba(23, 19, 15, 0.12); box-sizing: border-box; }
        .support-hero-content { max-width: 640px; display: flex; flex-direction: column; gap: 8px; }
        .banner-pill { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 6px; font-size: 9px; font-weight: 800; letter-spacing: 0.08em; background: #ffffff18; color: #f3c77c; border: 1px solid #ffffff24; width: fit-content; }
        .support-hero-content h2 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.025em; color: #fff; }
        .support-hero-content p { margin: 0; color: #c7b4a9; font-size: 11.5px; line-height: 1.4; }

        .support-search-bar { display: flex; align-items: center; gap: 10px; margin-top: 6px; background: #ffffff16; border: 1px solid #ffffff28; border-radius: 11px; padding: 0 14px; height: 44px; box-sizing: border-box; }
        .support-search-bar svg { color: #f3c77c; flex: 0 0 auto; }
        .support-search-bar input { width: 100%; border: 0; outline: 0; background: transparent; color: #fff; font-size: 12px; font-weight: 500; }
        .support-search-bar input::placeholder { color: #c4b5ac; }

        .support-quick-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
        @media (max-width: 900px) { .support-quick-grid { grid-template-columns: 1fr; } }
        .support-quick-card { display: flex; align-items: center; gap: 12px; padding: 15px 16px; border-radius: 13px; background: var(--card, #fff); border: 1px solid var(--border, #e5e7eb); box-shadow: var(--shadow, 0 4px 16px rgba(0,0,0,0.03)); transition: transform 0.18s ease, border-color 0.18s ease; box-sizing: border-box; min-width: 0; }
        .support-quick-card:hover { transform: translateY(-1px); border-color: #d7c1a8; }
        .quick-icon-wrap { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; flex: 0 0 auto; }
        .quick-icon-wrap.blue { background: #eaf3ff; color: #2563eb; }
        .quick-icon-wrap.green { background: #eaf8f1; color: #139768; }
        .quick-icon-wrap.orange { background: #fdf3e6; color: #d97706; }
        .quick-meta { min-width: 0; }
        .support-quick-card h3 { margin: 0 0 2px; font-size: 12px; font-weight: 750; color: var(--text, #111827); }
        .support-quick-card p { margin: 0; font-size: 10px; color: var(--muted, #6b7280); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .quick-action-btn { margin-left: auto; padding: 6px 12px; border-radius: 8px; background: #f4f1ec; color: var(--brown, #8c4a1e); font-size: 10.5px; font-weight: 700; white-space: nowrap; border: 1px solid var(--border, #e5e7eb); text-decoration: none; cursor: pointer; transition: background 0.18s; flex-shrink: 0; }
        .quick-action-btn:hover { background: #eae6df; }

        .support-main-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 18px; }
        @media (max-width: 1000px) { .support-main-grid { grid-template-columns: 1fr; } }
        .support-card { display: flex; flex-direction: column; gap: 12px; padding: 18px; border-radius: 14px; background: var(--card, #fff); border: 1px solid var(--border, #e5e7eb); box-sizing: border-box; }
        .section-heading h3 { margin: 0; font-size: 14.5px; font-weight: 800; letter-spacing: -0.02em; color: var(--text, #111827); }
        .section-heading p { margin: 2px 0 0; font-size: 10.5px; color: var(--muted, #6b7280); }

        .faq-category-scroll { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
        .category-pill { padding: 5px 10px; border-radius: 7px; font-size: 10px; font-weight: 650; background: #f4f1ec; color: var(--muted, #6b7280); border: 1px solid var(--border, #e5e7eb); white-space: nowrap; transition: all 0.18s ease; cursor: pointer; }
        .category-pill:hover { color: var(--text, #111827); background: #eae6df; }
        .category-pill.active { background: var(--brown, #8c4a1e); color: #fff; border-color: var(--brown, #8c4a1e); box-shadow: 0 4px 10px rgba(113, 59, 23, 0.18); }

        .faq-list { display: flex; flex-direction: column; gap: 8px; }
        .faq-item { border: 1px solid #eae8e3; border-radius: 10px; background: #fdfcfb; overflow: hidden; transition: all 0.18s ease; }
        .faq-item.open { border-color: var(--brown, #8c4a1e); background: #fff; box-shadow: 0 4px 14px rgba(0,0,0,0.03); }
        .faq-question-btn { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 12px 14px; background: transparent; border: 0; text-align: left; cursor: pointer; gap: 10px; }
        .faq-q-copy { min-width: 0; }
        .faq-tag { display: inline-block; font-size: 8.5px; font-weight: 800; color: var(--brown, #8c4a1e); background: #f5eee6; padding: 2px 6px; border-radius: 4px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.06em; }
        .faq-question-btn strong { display: block; font-size: 11.5px; color: var(--text, #111827); font-weight: 700; line-height: 1.35; }
        .faq-chevron-wrap { width: 22px; height: 22px; border-radius: 50%; background: #f4f1ec; display: grid; place-items: center; color: var(--muted, #6b7280); flex: 0 0 auto; }
        .faq-item.open .faq-chevron-wrap { background: #f5eee6; color: var(--brown, #8c4a1e); }
        .faq-answer { padding: 10px 14px 13px; color: #5a6069; font-size: 11px; line-height: 1.5; border-top: 1px solid #f4f1ec; }
        .faq-answer p { margin: 0; }
        .empty-state { text-align: center; padding: 20px 12px; font-size: 11px; color: var(--muted, #6b7280); }

        .ticket-form { display: flex; flex-direction: column; gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 5px; }
        .form-group label { font-size: 10.5px; font-weight: 700; color: #383e47; }

        .input-field-wrap { position: relative; display: flex; align-items: center; width: 100%; min-height: 38px; padding: 0 12px; border-radius: 9px; border: 1px solid #dedbd4; background: #fdfcfb; transition: border-color 0.18s, box-shadow 0.18s; box-sizing: border-box; }
        .input-field-wrap:focus-within { border-color: var(--brown, #8c4a1e); box-shadow: 0 0 0 3px rgba(113, 59, 23, 0.1); background: #fff; }
        .input-field-wrap input, .input-field-wrap select { width: 100%; border: 0; outline: 0; background: transparent; font-size: 11.5px; font-weight: 600; color: var(--text, #111827); }

        .textarea-wrap { position: relative; display: flex; width: 100%; padding: 10px 12px; border-radius: 9px; border: 1px solid #dedbd4; background: #fdfcfb; transition: border-color 0.18s, box-shadow 0.18s; box-sizing: border-box; }
        .textarea-wrap:focus-within { border-color: var(--brown, #8c4a1e); background: #fff; box-shadow: 0 0 0 3px rgba(113, 59, 23, 0.1); }
        .textarea-wrap textarea { width: 100%; border: 0; outline: 0; background: transparent; font-size: 11.5px; font-weight: 500; color: var(--text, #111827); resize: vertical; font-family: inherit; line-height: 1.45; }

        .panel-action-row { margin-top: 4px; }
        .save-btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 10px 16px; border-radius: 9px; color: #fff; background: var(--brown, #8c4a1e); font-size: 11.5px; font-weight: 700; border: 0; transition: background 0.18s; cursor: pointer; }
        .save-btn-primary:hover { background: var(--brown-dark, #6d3412); }

        .ticket-success-box { padding: 26px 16px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; background: #fdfcfb; border-radius: 10px; border: 1px solid var(--border, #e5e7eb); }
        .success-icon { width: 44px; height: 44px; border-radius: 50%; background: #dcfce7; color: #166534; display: grid; place-items: center; }
        .ticket-success-box h3 { margin: 0; font-size: 14px; font-weight: 750; color: var(--text, #111827); }
        .ticket-success-box p { margin: 0; font-size: 11px; color: var(--muted, #6b7280); }

        .scroll-top-btn { position: fixed; right: 20px; bottom: 22px; width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #8c4a1e 0%, #3d1f10 100%); color: #fff; border: 1px solid rgba(255, 255, 255, 0.18); display: grid; place-items: center; cursor: pointer; box-shadow: 0 10px 24px rgba(61, 31, 16, 0.35); z-index: 900; transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .scroll-top-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 28px rgba(61, 31, 16, 0.45); }

        @media (max-width: 768px) {
          .support-container { gap: 8px; }
          .support-hero { padding: 14px; border-radius: 12px; }
          .support-hero-content { gap: 5px; }
          .banner-pill { font-size: 8px; padding: 3px 7px; }
          .support-hero-content h2 { font-size: 16px; }
          .support-hero-content p { font-size: 9.5px; }
          .support-search-bar { height: 34px; padding: 0 10px; gap: 7px; border-radius: 9px; margin-top: 3px; }
          .support-search-bar input { font-size: 10px; }

          .support-quick-grid { gap: 7px; }
          .support-quick-card { padding: 10px 11px; border-radius: 10px; gap: 9px; }
          .quick-icon-wrap { width: 30px; height: 30px; border-radius: 8px; }
          .support-quick-card h3 { font-size: 10.5px; }
          .support-quick-card p { font-size: 8.5px; }
          .quick-action-btn { padding: 5px 9px; font-size: 9px; border-radius: 7px; }

          .support-main-grid { gap: 8px; }
          .support-card { padding: 11px; border-radius: 11px; gap: 8px; }
          .section-heading h3 { font-size: 12px; }
          .section-heading p { font-size: 8.5px; }

          .faq-category-scroll { gap: 4px; }
          .category-pill { padding: 4px 8px; font-size: 8.5px; border-radius: 6px; }

          .faq-list { gap: 6px; }
          .faq-item { border-radius: 8px; }
          .faq-question-btn { padding: 9px 11px; gap: 8px; }
          .faq-tag { font-size: 7.5px; padding: 1.5px 5px; margin-bottom: 2px; }
          .faq-question-btn strong { font-size: 10px; }
          .faq-chevron-wrap { width: 18px; height: 18px; }
          .faq-answer { padding: 8px 11px 10px; font-size: 9.5px; }

          .ticket-form { gap: 8px; }
          .form-group { gap: 3px; }
          .form-group label { font-size: 9px; }
          .input-field-wrap { min-height: 33px; padding: 0 10px; border-radius: 8px; }
          .input-field-wrap input, .input-field-wrap select { font-size: 10px; }
          .textarea-wrap { padding: 8px 10px; border-radius: 8px; }
          .textarea-wrap textarea { font-size: 10px; }
          .save-btn-primary { padding: 8px 12px; font-size: 10px; border-radius: 8px; }

          .scroll-top-btn { right: 14px; bottom: 16px; width: 36px; height: 36px; }
        }
      `}</style>
    </div>
  );
}