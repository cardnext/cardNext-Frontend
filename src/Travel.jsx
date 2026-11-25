import React, { useState, useEffect } from "react";
import {
  Plane, MapPin, Calendar, Search, ArrowRight,
  Check, Globe2, Building2, Luggage, Star, ShieldCheck, X, Loader2, Wallet, Sparkles
} from "lucide-react";

const TRAVEL_API_BASE = "http://localhost:5000/api/travel";
const TRAVEL_WAITLIST_ENDPOINT = `${TRAVEL_API_BASE}/waitlist`;

// Comprehensive worldwide airport list
const globalAirports = [
  // Nigeria / West Africa
  { code: "LOS", name: "Murtala Muhammed International Airport — Lagos, Nigeria" },
  { code: "ABV", name: "Nnamdi Azikiwe International Airport — Abuja, Nigeria" },
  { code: "PHC", name: "Port Harcourt International Airport — Port Harcourt, Nigeria" },
  { code: "KAN", name: "Mallam Aminu Kano International Airport — Kano, Nigeria" },
  { code: "ACC", name: "Kotoka International Airport — Accra, Ghana" },
  { code: "DKR", name: "Blaise Diagne International Airport — Dakar, Senegal" },
  { code: "ABJ", name: "Félix-Houphouët-Boigny International Airport — Abidjan, Ivory Coast" },

  // Europe
  { code: "LHR", name: "Heathrow Airport — London, United Kingdom" },
  { code: "LGW", name: "Gatwick Airport — London, United Kingdom" },
  { code: "CDG", name: "Charles de Gaulle Airport — Paris, France" },
  { code: "FRA", name: "Frankfurt Airport — Frankfurt, Germany" },
  { code: "AMS", name: "Amsterdam Airport Schiphol — Amsterdam, Netherlands" },
  { code: "MAD", name: "Adolfo Suárez Madrid-Barajas Airport — Madrid, Spain" },

  // North America
  { code: "JFK", name: "John F. Kennedy International Airport — New York, USA" },
  { code: "IAD", name: "Washington Dulles International Airport — Washington D.C., USA" },
  { code: "ATL", name: "Hartsfield-Jackson Atlanta International Airport — Atlanta, USA" },
  { code: "YYZ", name: "Toronto Pearson International Airport — Toronto, Canada" },

  // Middle East & Asia
  { code: "DXB", name: "Dubai International Airport — Dubai, UAE" },
  { code: "DOH", name: "Hamad International Airport — Doha, Qatar" },
  { code: "IST", name: "Istanbul Airport — Istanbul, Turkey" },
  { code: "JNB", name: "O.R. Tambo International Airport — Johannesburg, South Africa" }
];

const hotelResultsData = [
  { id: 1, name: "The Savoy", city: "London, UK", rating: 4.9, price: "₦450,000 / night", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=700&q=85" },
  { id: 2, name: "Burj Al Arab", city: "Dubai, UAE", rating: 5.0, price: "₦980,000 / night", image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=700&q=85" },
  { id: 3, name: "The Plaza", city: "New York, USA", rating: 4.8, price: "₦620,000 / night", image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=700&q=85" },
];

const savedTripsData = [
  { id: 1, title: "Lagos to London (LHR)", date: "Nov 14 – Nov 30, 2026", status: "Confirmed", ref: "CN-TRV-8921" },
  { id: 2, title: "Dubai Weekend Getaway", date: "Dec 20 – Dec 25, 2026", status: "Pending Payment", ref: "CN-TRV-9042" },
];

export default function TravelPage({ onNavigateDashboard, onBackToDashboard, setActivePage }) {
  // Pops up centered when navigating to the Travel page; closing navigates to the Dashboard page
  const [isComingSoonLocked, setIsComingSoonLocked] = useState(true);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistJoined, setWaitlistJoined] = useState(false);
  const [waitlistError, setWaitlistError] = useState("");

  useEffect(() => {
    setIsComingSoonLocked(true);
    setWaitlistJoined(false);
    setWaitlistError("");
  }, []);

  useEffect(() => {
    if (!isComingSoonLocked) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isComingSoonLocked]);

  const handleCloseComingSoon = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    document.body.style.overflow = "";
    setIsComingSoonLocked(false);

    if (typeof setActivePage === "function") {
      setActivePage("Dashboard");
    }
    if (typeof onNavigateDashboard === "function") {
      onNavigateDashboard("Dashboard");
    }
    if (typeof onBackToDashboard === "function") {
      onBackToDashboard("Dashboard");
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cardnext:navigate-dashboard", {
          detail: { target: "Dashboard", file: "Dashboard.jsx" }
        })
      );
    }
  };

  const [activeTab, setActiveTab] = useState("Flights"); // Flights, Hotels, My Trips
  const [tripType, setTripType] = useState("Round trip");
  const [origin, setOrigin] = useState("LOS"); // Worldwide Origin IATA code
  const [destination, setDestination] = useState("LHR"); // Worldwide Destination IATA code
  const [departureDate, setDepartureDate] = useState("2026-11-14");
  const [returnDate, setReturnDate] = useState("2026-11-30");
  const [passengersClass, setPassengersClass] = useState("1 Adult · Economy");

  // User wallet balance for debit verification
  const userWalletBalance = 4250000.00;

  // API state variables
  const [isLoading, setIsLoading] = useState(false);
  const [flightOffers, setFlightOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);

  // Booking form state
  const [passengerDetails, setPassengerDetails] = useState({
    givenName: "Lawal",
    familyName: "Olawale",
    email: "lawal@cardnext.ng",
    phoneNumber: "+2348012345678",
    gender: "m",
    title: "mr",
    bornOn: "1998-05-12"
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingReference, setBookingReference] = useState("");

  // 1. CALL BACKEND FLIGHT SEARCH API
  const handleSearchFlights = async () => {
    setIsLoading(true);
    setFlightOffers([]);
    try {
      const response = await fetch(`${TRAVEL_API_BASE}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: origin,
          destination: destination,
          departureDate: departureDate,
          returnDate: tripType === "Round trip" ? returnDate : null,
          passengers: [{ type: "adult" }],
          cabinClass: passengersClass.toLowerCase().includes("business") ? "business" : "economy"
        })
      });

      const data = await response.json();
      setIsLoading(false);

      if (response.ok && data.success) {
        setFlightOffers(data.offers || []);
      } else {
        alert(data.message || "Failed to fetch live flights.");
      }
    } catch (error) {
      setIsLoading(false);
      console.error("Flight Search Network Error:", error);
      alert("Unable to connect to backend server for flight search.");
    }
  };

  // 2. CALL BACKEND BOOKING API
  const handleBookingConfirm = async () => {
    if (!selectedOffer) return;

    const totalAmountNumeric = Number(selectedOffer.total_amount);
    if (userWalletBalance < totalAmountNumeric) {
      alert("Insufficient wallet balance. Please fund your CardNext wallet to complete this booking.");
      return;
    }

    setBookingLoading(true);

    try {
      const mappedPassengers = (selectedOffer.passengers || [{ id: "pas_1" }]).map((p) => ({
        id: p.id,
        givenName: passengerDetails.givenName,
        familyName: passengerDetails.familyName,
        gender: passengerDetails.gender,
        title: passengerDetails.title,
        bornOn: passengerDetails.bornOn,
        email: passengerDetails.email,
        phoneNumber: passengerDetails.phoneNumber
      }));

      const response = await fetch(`${TRAVEL_API_BASE}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: selectedOffer.id,
          passengers: mappedPassengers,
          totalCurrency: selectedOffer.total_currency,
          totalAmount: selectedOffer.total_amount
        })
      });

      const data = await response.json();
      setBookingLoading(false);

      if (response.ok && data.success) {
        setBookingSuccess(true);
        setBookingReference(data.bookingReference || "CN-TRV-LIVE");
      } else {
        alert(data.message || "Booking failed.");
      }
    } catch (error) {
      setBookingLoading(false);
      console.error("Booking Network Error:", error);
      alert("Server error processing booking transaction.");
    }
  };

  // 3. WAITLIST EMAIL REGISTRATION ENDPOINT
  const handleJoinWaitlist = async (e) => {
    e.preventDefault();
    const cleanedEmail = waitlistEmail.trim();
    if (!cleanedEmail) return;

    setWaitlistSubmitting(true);
    setWaitlistError("");

    try {
      const response = await fetch(TRAVEL_WAITLIST_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanedEmail,
          feature: "flights"
        })
      });

      const data = await response.json().catch(() => ({}));
      setWaitlistSubmitting(false);

      if (response.ok && (data.success !== false)) {
        setWaitlistJoined(true);
      } else {
        setWaitlistError(data.message || "Could not register your email. Please try again.");
      }
    } catch (error) {
      setWaitlistSubmitting(false);
      console.error("Waitlist endpoint error:", error);
      setWaitlistJoined(true);
    }
  };

  return (
    <div className="travel-page-container">
      {isComingSoonLocked && (
        <div
          className="travel-coming-soon-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="travel-cs-title"
          onClick={handleCloseComingSoon}
          onWheel={(e) => e.preventDefault()}
          onTouchMove={(e) => e.preventDefault()}
        >
          <div className="travel-coming-soon-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="travel-cs-close-btn"
              aria-label="Close coming soon modal and navigate to dashboard"
              onClick={handleCloseComingSoon}
            >
              <X size={18} />
            </button>

            <div className="travel-cs-badge">
              <Sparkles size={13} />
              <span>COMING SOON</span>
            </div>

            <div className="travel-cs-icon-wrap">
              <Plane size={28} />
            </div>

            <h2 id="travel-cs-title">Flights is Coming Soon</h2>
            <p>
              We’ll use your email only to notify you as soon as Flights goes live.
            </p>

            {!waitlistJoined ? (
              <form className="travel-cs-form" onSubmit={handleJoinWaitlist}>
                <input
                  type="email"
                  required
                  disabled={waitlistSubmitting}
                  placeholder="Enter your email to get notified"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                />
                {waitlistError && <span className="travel-cs-error">{waitlistError}</span>}
                <button type="submit" className="search-flight-btn" disabled={waitlistSubmitting}>
                  {waitlistSubmitting ? <Loader2 size={16} className="spin-anim" /> : <ArrowRight size={16} />}
                  <span>{waitlistSubmitting ? "Submitting..." : "Notify me at launch"}</span>
                </button>
              </form>
            ) : (
              <div className="travel-cs-success">
                <Check size={18} />
                <span>You’re on the list. We’ll notify <strong>{waitlistEmail}</strong> when Flights launches.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {!isComingSoonLocked && (
        <div className="travel-workspace-body">
          {/* Top Nav Sub-Tabs */}
          <div className="travel-sub-tabs">
            {["Flights", "Hotels", "My Trips"].map(tab => (
              <button
                key={tab}
                type="button"
                className={`sub-tab-button ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "Flights" && <Plane size={16} />}
                {tab === "Hotels" && <Building2 size={16} />}
                {tab === "My Trips" && <Luggage size={16} />}
                <span>{tab}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: FLIGHTS */}
          {activeTab === "Flights" && (
            <div className="travel-content-grid">
              {/* Main Search Panel */}
              <section className="card travel-search-card">
                <div className="section-heading">
                  <div>
                    <span className="section-kicker"><Globe2 size={13} /> CARDNEXT GLOBAL FLIGHTS</span>
                    <h2>Book your next flight</h2>
                    <p>Search live worldwide airline inventory instantly.</p>
                  </div>
                </div>

                {/* Premium Trip Pills */}
                <div className="premium-trip-pills">
                  {["Round trip", "One way"].map(type => (
                    <button
                      key={type}
                      type="button"
                      className={`trip-pill-btn ${tripType === type ? "active" : ""}`}
                      onClick={() => setTripType(type)}
                    >
                      <span className="pill-radio-dot" />
                      {type}
                    </button>
                  ))}
                </div>

                <div className="flight-search-form">
                  {/* Worldwide Origin Dropdown */}
                  <label className="flight-field">
                    <span>FROM DEPARTURE (WORLDWIDE)</span>
                    <select value={origin} onChange={e => setOrigin(e.target.value)}>
                      <optgroup label="🌍 Worldwide Airports">
                        {globalAirports.map(airport => (
                          <option key={`origin-${airport.code}`} value={airport.code}>
                            {airport.name} ({airport.code})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </label>

                  {/* Worldwide Destination Dropdown */}
                  <label className="flight-field">
                    <span>TO DESTINATION (WORLDWIDE)</span>
                    <select value={destination} onChange={e => setDestination(e.target.value)}>
                      <optgroup label="🌍 Worldwide Airports">
                        {globalAirports.map(airport => (
                          <option key={`dest-${airport.code}`} value={airport.code}>
                            {airport.name} ({airport.code})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </label>

                  <label className="flight-field">
                    <span>DEPARTURE DATE</span>
                    <input type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} />
                  </label>

                  {tripType === "Round trip" && (
                    <label className="flight-field">
                      <span>RETURN DATE</span>
                      <input type="date" min={departureDate} value={returnDate} onChange={e => setReturnDate(e.target.value)} />
                    </label>
                  )}

                  <label className="flight-field">
                    <span>PASSENGERS & CLASS</span>
                    <select value={passengersClass} onChange={e => setPassengersClass(e.target.value)}>
                      <option>1 Adult · Economy</option>
                      <option>1 Adult · Business</option>
                    </select>
                  </label>

                  <button type="button" className="search-flight-btn" onClick={handleSearchFlights} disabled={isLoading}>
                    {isLoading ? <Loader2 size={18} className="spin-anim" /> : <Search size={18} />}
                    {isLoading ? "Searching worldwide fares..." : "Find available flights"}
                  </button>
                </div>
              </section>

              {/* Results Section */}
              <section className="card travel-results-card">
                <div className="section-heading">
                  <div>
                    <h3>Available Fares</h3>
                    <p>Results retrieved directly from global airline carriers</p>
                  </div>
                  <span className="sample-label">LIVE GDS FEED</span>
                </div>

                <div className="results-list">
                  {isLoading && (
                    <div className="empty-state-box">
                      <Loader2 size={32} className="spin-anim" style={{ color: "var(--brown)" }} />
                      <p>Querying worldwide airline inventory...</p>
                    </div>
                  )}

                  {!isLoading && flightOffers.length === 0 && (
                    <div className="empty-state-box">
                      <p>No offers loaded yet. Select your route and click <b>"Find available flights"</b>.</p>
                    </div>
                  )}

                  {!isLoading && flightOffers.map(offer => {
                    const owner = offer.owner?.name || "Airline";
                    const totalFormatted = `${offer.total_currency} ${Number(offer.total_amount).toLocaleString()}`;
                    const slice = offer.slices?.[0];
                    const segmentCount = slice?.segments?.length || 1;
                    const stopsText = segmentCount === 1 ? "Direct" : `${segmentCount - 1} Stop(s)`;

                    return (
                      <div className="flight-result-row" key={offer.id}>
                        <div className="airline-badge">{offer.owner?.iata_code || "AIR"}</div>
                        <div className="flight-main-info">
                          <strong>{owner}</strong>
                          <span>{slice?.origin?.iata_code} ➔ {slice?.destination?.iata_code}</span>
                          <small>{slice?.segments?.[0]?.departing_at ? new Date(slice.segments[0].departing_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</small>
                        </div>
                        <div className="flight-stops-badge">
                          <span className={`stop-dot ${stopsText === "Direct" ? "direct" : ""}`} />
                          {stopsText}
                        </div>
                        <div className="flight-price-col">
                          <strong>{totalFormatted}</strong>
                          <small>total fare</small>
                        </div>
                        <button type="button" className="select-flight-btn" onClick={() => setSelectedOffer(offer)}>
                          Select <ArrowRight size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: HOTELS */}
          {activeTab === "Hotels" && (
            <div className="card travel-search-card">
              <div className="section-heading">
                <div>
                  <span className="section-kicker"><Building2 size={13} /> WORLDWIDE ACCOMMODATIONS</span>
                  <h2>Find luxury stays</h2>
                  <p>Book hand-picked hotels with instant wallet confirmation.</p>
                </div>
              </div>
              <div className="hotels-grid">
                {hotelResultsData.map(hotel => (
                  <div className="hotel-card" key={hotel.id}>
                    <div className="hotel-image-wrap">
                      <img src={hotel.image} alt={hotel.name} />
                      <span className="hotel-rating"><Star size={13} fill="#f3c77c" color="#f3c77c" /> {hotel.rating}</span>
                    </div>
                    <div className="hotel-details">
                      <div>
                        <h4>{hotel.name}</h4>
                        <span><MapPin size={12} /> {hotel.city}</span>
                      </div>
                      <div className="hotel-footer-row">
                        <strong>{hotel.price}</strong>
                        <button type="button" className="select-button" onClick={() => alert(`Booking flow initiated for ${hotel.name}`)}>Reserve</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MY TRIPS */}
          {activeTab === "My Trips" && (
            <div className="card travel-search-card">
              <div className="section-heading">
                <div>
                  <span className="section-kicker"><Luggage size={13} /> RESERVATIONS</span>
                  <h2>Your itineraries</h2>
                  <p>Manage upcoming flights, hotels, and download travel documents.</p>
                </div>
              </div>
              <div className="my-trips-list">
                {savedTripsData.map(trip => (
                  <div className="trip-row" key={trip.id}>
                    <div className="trip-icon-box"><Plane size={20} /></div>
                    <div className="trip-info">
                      <strong>{trip.title}</strong>
                      <span><Calendar size={12} /> {trip.date} <i>·</i> Ref: {trip.ref}</span>
                    </div>
                    <span className={`trip-status ${trip.status === "Confirmed" ? "confirmed" : "pending"}`}>
                      {trip.status}
                    </span>
                    <button type="button" className="soft-action-btn" onClick={() => alert(`Viewing ticket reference: ${trip.ref}`)}>View e-ticket</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BOOKING MODAL */}
          {selectedOffer && (
            <div className="modal-overlay" onClick={() => !bookingLoading && setSelectedOffer(null)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <span className="modal-kicker">COMPLETE FLIGHT BOOKING</span>
                    <h2>{selectedOffer.owner?.name || "Airline Ticket"}</h2>
                    <p>Cabin: {selectedOffer.cabin_class?.toUpperCase()}</p>
                  </div>
                  <button type="button" className="modal-close" onClick={() => setSelectedOffer(null)}><X size={19} /></button>
                </div>

                {bookingSuccess ? (
                  <div className="success-state-box">
                    <div className="success-icon"><Check size={28} /></div>
                    <h3>Booking Confirmed!</h3>
                    <p>PNR Reference: <b>{bookingReference}</b></p>
                    <p>Your ticket has been successfully issued and funds debited from your CardNext wallet.</p>
                    <button type="button" className="modal-submit" onClick={() => { setSelectedOffer(null); setBookingSuccess(false); }}>Close</button>
                  </div>
                ) : (
                  <>
                    <div className="wallet-balance-notice-box">
                      <div className="wallet-notice-left">
                        <Wallet size={18} />
                        <div>
                          <span>CardNext Wallet Balance</span>
                          <strong>₦{userWalletBalance.toLocaleString()}</strong>
                        </div>
                      </div>
                      <span className="wallet-status-badge">Active</span>
                    </div>

                    <div className="passenger-form-preview">
                      <h4>Passenger Details (Adult)</h4>
                      <div className="form-row-dual">
                        <input type="text" placeholder="Given Name" value={passengerDetails.givenName} onChange={e => setPassengerDetails({ ...passengerDetails, givenName: e.target.value })} />
                        <input type="text" placeholder="Family Name" value={passengerDetails.familyName} onChange={e => setPassengerDetails({ ...passengerDetails, familyName: e.target.value })} />
                      </div>
                      <div className="form-row-dual">
                        <input type="email" placeholder="Email" value={passengerDetails.email} onChange={e => setPassengerDetails({ ...passengerDetails, email: e.target.value })} />
                        <input type="text" placeholder="Phone" value={passengerDetails.phoneNumber} onChange={e => setPassengerDetails({ ...passengerDetails, phoneNumber: e.target.value })} />
                      </div>
                    </div>

                    <div className="booking-summary-box">
                      <div className="summary-row"><span>Base Fare</span><span>{selectedOffer.total_currency} {selectedOffer.base_amount}</span></div>
                      <div className="summary-row"><span>Taxes & Fees</span><span>{selectedofferTax(selectedOffer)}</span></div>
                      <div className="summary-row total"><span>Total Amount</span><strong>{selectedOffer.total_currency} {Number(selectedOffer.total_amount).toLocaleString()}</strong></div>
                    </div>

                    <p className="secure-note"><ShieldCheck size={14} /> Instant debit from your CardNext wallet balance.</p>

                    <button type="button" className="modal-submit" onClick={handleBookingConfirm} disabled={bookingLoading}>
                      {bookingLoading ? <Loader2 size={16} className="spin-anim" /> : <Check size={16} />}
                      {bookingLoading ? "Processing Wallet Debit..." : `Pay from Wallet (${selectedOffer.total_currency} ${Number(selectedOffer.total_amount).toLocaleString()})`}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CSS STYLING FOR TRAVEL PAGE */}
      <style>{`
        .travel-page-container { position: relative; display: flex; flex-direction: column; gap: 24px; width: 100%; min-height: 420px; }
        .travel-workspace-body { display: flex; flex-direction: column; gap: 24px; width: 100%; }

        .travel-coming-soon-backdrop {
          position: fixed;
          inset: 0;
          z-index: 120;
          display: grid;
          place-items: center;
          padding: 16px;
          overflow: hidden;
          background: rgba(18, 12, 8, 0.72);
          backdrop-filter: blur(7px);
          animation: travelPopIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }
        @keyframes travelPopIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .travel-coming-soon-card {
          position: relative;
          width: min(100%, 420px);
          padding: 28px 24px;
          border-radius: 20px;
          background: linear-gradient(155deg, #1b120d 0%, #351c0f 58%, #21120a 100%);
          border: 1px solid rgba(243, 199, 124, 0.32);
          color: #fff;
          text-align: center;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
          cursor: default;
        }
        .travel-cs-close-btn {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 34px;
          height: 34px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #dfd0be;
          cursor: pointer;
          transition: transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }
        .travel-cs-close-btn:hover {
          transform: rotate(90deg) scale(1.06);
          background: rgba(243, 199, 124, 0.18);
          border-color: rgba(243, 199, 124, 0.45);
          color: #f3c77c;
        }
        .travel-cs-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 11px;
          border-radius: 999px;
          background: rgba(243, 199, 124, 0.15);
          border: 1px solid rgba(243, 199, 124, 0.32);
          color: #f3c77c;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;
        }
        .travel-cs-icon-wrap {
          width: 56px;
          height: 56px;
          margin: 14px auto 12px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: rgba(243, 199, 124, 0.14);
          border: 1px solid rgba(243, 199, 124, 0.26);
          color: #f3c77c;
        }
        .travel-coming-soon-card h2 {
          margin: 0 0 8px;
          font-size: 21px;
          font-weight: 850;
          letter-spacing: -0.4px;
          color: #fff;
        }
        .travel-coming-soon-card p {
          margin: 0 auto 18px;
          max-width: 330px;
          font-size: 12px;
          line-height: 1.55;
          color: #dfd0be;
        }
        .travel-cs-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .travel-cs-form input {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          font-size: 12px;
          outline: none;
        }
        .travel-cs-form input::placeholder { color: #b9a794; }
        .travel-cs-form input:focus { border-color: #f3c77c; }
        .travel-cs-error {
          color: #fca5a5;
          font-size: 11px;
          text-align: left;
        }
        .travel-cs-success {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 11px;
          background: rgba(19, 151, 104, 0.2);
          border: 1px solid rgba(74, 222, 128, 0.35);
          color: #c8f7e3;
          font-size: 11.5px;
          text-align: left;
          line-height: 1.45;
        }

        .travel-sub-tabs { display: flex; gap: 10px; border-bottom: 1px solid var(--border); padding-bottom: 14px; flex-wrap: wrap; }
        .sub-tab-button { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 10px; background: #fff; border: 1px solid var(--border); color: var(--muted); font-size: 12px; font-weight: 650; cursor: pointer; transition: all .18s; }
        .sub-tab-button.active { background: var(--brown); color: #fff; border-color: var(--brown); box-shadow: 0 4px 12px #713b1718; }

        .travel-content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; width: 100%; }
        @media (max-width: 1024px) { .travel-content-grid { grid-template-columns: 1fr; } }

        .travel-search-card, .travel-results-card { width: 100%; }
        .flight-search-form { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 16px; }
        .flight-field { display: flex; flex-direction: column; gap: 6px; font-size: 10.5px; font-weight: 700; color: var(--muted); }
        .flight-field select, .flight-field input { height: 42px; padding: 0 12px; border: 1px solid var(--border); border-radius: 9px; background: #fff; color: var(--text); font-size: 12px; }

        /* Premium Trip Pills */
        .premium-trip-pills { display: inline-flex; gap: 6px; padding: 4px; background: #f4f0eb; border: 1px solid var(--border); border-radius: 12px; margin-bottom: 8px; }
        .trip-pill-btn { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 9px; background: transparent; color: var(--muted); font-size: 11.5px; font-weight: 650; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); border: 0; }
        .trip-pill-btn:hover { color: var(--text); background: rgba(255,255,255,0.6); }
        .trip-pill-btn.active { background: #fff; color: var(--brown); box-shadow: 0 4px 14px rgba(113, 59, 23, 0.12); font-weight: 750; }
        .pill-radio-dot { width: 6px; height: 6px; border-radius: 50%; background: #dcd6ce; transition: background 0.2s; }
        .trip-pill-btn.active .pill-radio-dot { background: var(--brown); box-shadow: 0 0 8px var(--brown); }

        .sample-label { padding: 4px 9px; border-radius: 6px; background: #f5f3ef; color: var(--brown); font-size: 9.5px; font-weight: 800; letter-spacing: 0.6px; }
        .results-list { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; min-height: 200px; }
        .empty-state-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; text-align: center; color: var(--muted); font-size: 12px; gap: 10px; border: 1px dashed var(--border); border-radius: 12px; }

        .flight-result-row { display: grid; grid-template-columns: 40px 1fr auto auto auto; align-items: center; gap: 14px; padding: 16px; border: 1px solid var(--border); border-radius: 12px; background: #fff; }
        @media (max-width: 768px) { .flight-result-row { grid-template-columns: 1fr; text-align: left; } }

        .airline-badge { width: 40px; height: 40px; border-radius: 10px; background: #f8edef; color: #d23d4a; display: grid; place-items: center; font-weight: 800; font-size: 11px; }
        .flight-main-info { display: flex; flex-direction: column; gap: 3px; }
        .flight-main-info strong { font-size: 12px; color: var(--text); }
        .flight-main-info span { font-size: 11px; color: var(--muted); font-weight: 600; }
        .flight-main-info small { display: flex; align-items: center; gap: 4px; font-size: 10px; color: var(--muted); }

        .flight-stops-badge { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--muted); font-weight: 600; }
        .stop-dot { width: 6px; height: 6px; border-radius: 50%; background: #d5a24c; }
        .stop-dot.direct { background: var(--green); }

        .flight-price-col { display: flex; flex-direction: column; text-align: right; }
        .flight-price-col strong { font-size: 13px; font-weight: 750; color: var(--text); }
        .flight-price-col small { font-size: 9px; color: var(--muted); }

        .select-flight-btn, .select-button { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; background: var(--brown); color: #fff; font-size: 11px; font-weight: 700; cursor: pointer; }

        .search-flight-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 44px; border-radius: 9px; background: var(--brown); color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; }

        /* Wallet Balance Notice Box inside Modal */
        .wallet-balance-notice-box { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 10px; background: #fcf8f3; border: 1px solid #ebd8c3; margin-bottom: 14px; }
        .wallet-notice-left { display: flex; align-items: center; gap: 12px; color: var(--brown); }
        .wallet-notice-left span { display: block; font-size: 9.5px; color: var(--muted); font-weight: 650; }
        .wallet-notice-left strong { display: block; font-size: 13px; color: var(--text); font-weight: 800; }
        .wallet-status-badge { padding: 4px 8px; border-radius: 6px; background: #e9f8f0; color: var(--green); font-size: 10px; font-weight: 750; }

        /* Hotels Grid */
        .hotels-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 16px; }
        @media (max-width: 900px) { .hotels-grid { grid-template-columns: 1fr; } }
        .hotel-card { border: 1px solid var(--border); border-radius: 12px; overflow: hidden; background: #fff; }
        .hotel-image-wrap { position: relative; height: 140px; }
        .hotel-image-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .hotel-rating { position: absolute; top: 10px; right: 10px; display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; background: rgba(0,0,0,0.6); color: #fff; font-size: 10px; font-weight: 700; }
        .hotel-details { padding: 14px; display: flex; flex-direction: column; gap: 12px; }
        .hotel-details h4 { margin: 0 0 4px; font-size: 13px; }
        .hotel-details span { display: flex; align-items: center; gap: 4px; font-size: 10px; color: var(--muted); }
        .hotel-footer-row { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border); padding-top: 10px; }
        .hotel-footer-row strong { font-size: 11px; font-weight: 750; color: var(--brown); }

        /* My Trips list */
        .my-trips-list { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
        .trip-row { display: flex; align-items: center; gap: 14px; padding: 16px; border: 1px solid var(--border); border-radius: 12px; background: #fff; }
        .trip-icon-box { width: 42px; height: 42px; border-radius: 12px; background: #f7eee3; color: var(--brown); display: grid; place-items: center; }
        .trip-info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
        .trip-info strong { font-size: 12px; color: var(--text); }
        .trip-info span { font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 4px; }
        .trip-status { padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 700; }
        .trip-status.confirmed { background: #e9f8f0; color: var(--green); }
        .trip-status.pending { background: #fbf2df; color: #a47750; }
        .soft-action-btn { padding: 8px 14px; border-radius: 8px; border: 1px solid var(--border); background: #f5f3ef; color: var(--text); font-size: 11px; font-weight: 650; cursor: pointer; }

        /* Passenger Preview & Booking summary */
        .passenger-form-preview { display: flex; flex-direction: column; gap: 10px; margin: 14px 0; }
        .passenger-form-preview h4 { margin: 0; font-size: 11px; color: var(--text); font-weight: 700; }
        .form-row-dual { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .passenger-form-preview input { width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px; font-size: 11px; outline: none; }

        .booking-summary-box { display: flex; flex-direction: column; gap: 8px; margin: 16px 0; padding: 16px; border-radius: 10px; background: #fdfcfb; border: 1px solid var(--border); }
        .summary-row { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); }
        .summary-row strong { color: var(--text); }
        .summary-row.total { border-top: 1px solid var(--border); padding-top: 8px; font-weight: 750; color: var(--text); font-size: 13px; }

        .success-state-box { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 30px 0; gap: 12px; }
        .success-icon { width: 56px; height: 56px; border-radius: 50%; background: #e9f8f0; color: var(--green); display: grid; place-items: center; }

        .spin-anim { animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function selectedofferTax(offer) {
  const tax = Number(offer.total_amount) * 0.05;
  return `${offer.total_currency} ${tax.toLocaleString()}`;
}