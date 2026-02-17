import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../context/ToastContext";
import heroImage from "../assets/image.png";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const { pathname } = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isActive = (path: string) =>
    pathname === path ? "nav-link active" : "nav-link";

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        <img
          src={heroImage}
          alt="Smart Paint Factory ERP System"
          className="brand-logo"
          width={42}
          height={42}
        />
        <div>
          <p className="brand-name">Morex Technology</p>
          <p className="brand-sub">Secure digital experiences</p>
        </div>
      </Link>

      <nav className="nav-links">
        <Link className={isActive("/")} to="/">
          Home
        </Link>
        <a className="nav-link" href="#features">
          Features
        </a>
        <Link className={isActive("/about")} to="/about">
          About
        </Link>
        <a className="nav-link" href="#pricing">
          Pricing
        </a>

        {user?.role === "admin" ? (
          <Link className={isActive("/admin-dashboard")} to="/admin-dashboard">
            Admin Dashboard
          </Link>
        ) : user?.role === "user" ? (
          <Link className={isActive("/user-dashboard")} to="/user-dashboard">
            My Dashboard
          </Link>
        ) : null}
      </nav>

      <div className="nav-actions">
        {user ? (
          <div className="profile-menu" ref={profileMenuRef}>
            <button
              className="profile-trigger"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              type="button"
            >
              <span className="profile-avatar">{getInitials(user.name)}</span>
              <span className="profile-name">{user.name}</span>
            </button>
            {isProfileOpen && (
              <div className="profile-dropdown">
                <button
                  className="profile-dropdown-item"
                  onClick={() => {
                    setIsProfileOpen(false);
                    logout();
                    showToast("Logged out successfully", "info");
                  }}
                  type="button"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link to="/login" className="btn ghost">
              Login
            </Link>
            <Link to="/register" className="btn primary">
              Get Started
            </Link>
          </>
        )}
      </div>
    </header>
  );
};

export default Navbar;
