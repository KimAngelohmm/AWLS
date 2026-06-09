import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../header.css';

/**
 * SunniesHeader Component
 * Main navigation header with Sunnies Studios branding
 * Colors: Black, White, Caramel
 */
export default function SunniesHeader() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');
  const userName = localStorage.getItem('userName');
  const isLoggedIn = !!localStorage.getItem('authToken');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <header className="sunnies-header">
      <div className="header-container">
        {/* Logo Section */}
        <div className="header-logo">
          <Link to="/" className="logo-link">
            <span className="logo-text">SUNNIES STUDIOS</span>
            <span className="logo-subtitle">HR SYSTEM</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="header-nav">
          {!isLoggedIn ? (
            <div className="nav-links">
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="nav-link nav-link-primary">Register</Link>
            </div>
          ) : (
            <div className="nav-links">
              {userRole === 'applicant' && (
                <>
                  <Link to="/dashboard" className="nav-link">My Applications</Link>
                  <Link to="/jobs" className="nav-link">Jobs</Link>
                </>
              )}
              {userRole === 'hr' && (
                <>
                  <Link to="/hr-dashboard" className="nav-link">Dashboard</Link>
                  <Link to="/job-postings" className="nav-link">Positions</Link>
                  <Link to="/applicants" className="nav-link">Applicants</Link>
                  <Link to="/employees" className="nav-link">Employees</Link>
                </>
              )}
              {userRole === 'manager' && (
                <>
                  <Link to="/manager-dashboard" className="nav-link">Dashboard</Link>
                  <Link to="/team" className="nav-link">My Team</Link>
                </>
              )}
              {userRole === 'employee' && (
                <>
                  <Link to="/employee-dashboard" className="nav-link">Dashboard</Link>
                  <Link to="/profile" className="nav-link">Profile</Link>
                </>
              )}
            </div>
          )}
        </nav>

        {/* User Section */}
        <div className="header-user">
          {isLoggedIn ? (
            <div className="user-menu">
              <div className="user-info">
                <span className="user-name">{userName}</span>
                <span className="user-role">{userRole.toUpperCase()}</span>
              </div>
              <button onClick={handleLogout} className="btn btn-sm btn-tertiary">
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
