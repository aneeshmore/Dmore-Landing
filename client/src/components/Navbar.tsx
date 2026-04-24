import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../context/ToastContext";
import heroImage from "../assets/image.png";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
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

  useEffect(() => {
    if (!isPasswordModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isPasswordModalOpen]);

  const isActive = (path: string) =>
    pathname === path ? "nav-link active" : "nav-link";

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");

  const closePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setPasswordLoading(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      showToast("All password fields are required.", "warning");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showToast("New password and confirm password do not match.", "warning");
      return;
    }

    if (newPassword.length < 6) {
      showToast("New password must be at least 6 characters.", "warning");
      return;
    }

    setPasswordLoading(true);
    try {
      const { data } = await api.post("/admin/change-password", {
        currentPassword,
        newPassword,
      });
      showToast(data?.message || "Password changed successfully", "success");
      closePasswordModal();
    } catch (err: any) {
      showToast(
        err?.response?.data?.message || "Unable to update password",
        "error",
      );
      setPasswordLoading(false);
    }
  };

  const handleSectionNavigation = (sectionId: string) => {
    if (pathname === "/") {
      const section = document.getElementById(sectionId);
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      window.history.replaceState(null, "", `/#${sectionId}`);
      return;
    }

    navigate(`/#${sectionId}`);
  };

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
        <button
          className="nav-link nav-link-button"
          type="button"
          onClick={() => handleSectionNavigation("features")}
        >
          Features
        </button>
        <Link className={isActive("/about")} to="/about">
          About
        </Link>
        <button
          className="nav-link nav-link-button"
          type="button"
          onClick={() => handleSectionNavigation("pricing")}
        >
          Pricing
        </button>

        <a
          href="https://github.com/aneeshmore/Dmore-Landing/releases/download/BASIC-V1/Morex.Technologies.ERP.System.Setup.1.0.0.exe"
          target="_blank"
          rel="noopener noreferrer"
          className="btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "#1E40AF",
            color: "#FFFFFF",
            boxShadow: "0 4px 12px rgba(30, 64, 175, 0.2)",
            padding: "0.5rem 1rem",
            fontSize: "0.9rem",
            marginLeft: "0.5rem"
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </a>

        {user?.role === "admin" ? (
          <Link className={isActive("/admin-dashboard")} to="/admin-dashboard">
            Admin Dashboard
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
                {user.role === "admin" && (
                  <button
                    className="profile-dropdown-item"
                    onClick={() => {
                      setIsProfileOpen(false);
                      setIsPasswordModalOpen(true);
                    }}
                    type="button"
                  >
                    Change Password
                  </button>
                )}
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

      {isPasswordModalOpen && user?.role === "admin" && (
        <div className="profile-modal-backdrop" onClick={closePasswordModal}>
          <div
            className="profile-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Change Password</h3>
            <div className="profile-modal-form">
              <input
                type="password"
                placeholder="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                minLength={6}
                required
              />
              <div className="profile-modal-actions">
                <button
                  type="button"
                  className="profile-modal-cancel"
                  onClick={closePasswordModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="profile-modal-save"
                  onClick={handleChangePassword}
                  disabled={passwordLoading}
                >
                  {passwordLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
