import React, { useState, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import Dashboard from './Dashboard.jsx';
import AuthPage from './Auth.jsx';

function RootApp() {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("cardnext_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      localStorage.removeItem("cardnext_user");
      return null;
    }
  });

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem("cardnext_user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("cardnext_user");
    localStorage.clear();
  };

  if (!user) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Pass onLogout down to Dashboard
  return <Dashboard currentUser={user} onLogout={handleLogout} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootApp />
  </StrictMode>
);