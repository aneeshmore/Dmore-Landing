import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../context/ToastContext";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const isStrongEnoughPassword = (value: string) =>
    value.length >= 6 && /[A-Za-z]/.test(value) && /\d/.test(value);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedCompanyName = companyName.trim();
    const trimmedCompanyAddress = companyAddress.trim();

    if (!trimmedName) {
      showToast("Name is required.", "warning");
      return;
    }

    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      showToast("Please enter a valid email address.", "warning");
      return;
    }

    if (!isStrongEnoughPassword(password)) {
      showToast(
        "Password must be at least 6 characters with letters and numbers.",
        "warning",
      );
      return;
    }

    if (!/^\d{10}$/.test(mobile)) {
      showToast("Mobile number must be exactly 10 digits.", "warning");
      return;
    }

    if (!trimmedCompanyName) {
      showToast("Company name is required.", "warning");
      return;
    }

    if (!trimmedCompanyAddress) {
      showToast("Company address is required.", "warning");
      return;
    }

    setLoading(true);

    try {
      await register(
        trimmedName,
        trimmedEmail,
        password,
        mobile,
        trimmedCompanyName,
        trimmedCompanyAddress,
      );

      showToast("Registration successful", "success");
      navigate("/payment");
    } catch (err: any) {
      showToast(
        err?.response?.data?.message || "Registration failed. Please try again.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page register-page">
      <div className="register-card">
        <div className="register-header">
          <div className="register-icon">🏭</div>
          <div>
            <p className="badge">Get Started</p>
            <h1>CREATE YOUR PAINTOS ACCOUNT</h1>
            <p className="register-subtitle">
              Join paint factories managing their business intelligently
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-grid-register">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
              />
            </div>
            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
              />
            </div>
            <div className="form-group">
              <label>Mobile Number *</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) =>
                  setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                placeholder="9876543210"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                required
              />
            </div>
            <div className="form-group">
              <label>Company Name *</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your Paint Company"
                required
              />
            </div>
            <div className="form-group full-width">
              <label>Company Address *</label>
              <input
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="Enter your factory address"
                required
                style={{ resize: "vertical" }}
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn primary register-btn"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="register-footer">
          Already have an account? <Link to="/login">Log in here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
