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
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Register user
      await register(
        name,
        email,
        password,
        mobile,
        companyName,
        companyAddress,
      );

      // After successful registration → go to payment page
      showToast("Registration successful", "success");
      navigate("/payment");
    } catch (err: any) {
      console.error("Registration error", err);
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
                placeholder="••••••••"
                required
              />
            </div>
            <div className="form-group">
              <label>Mobile Number *</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+91 98765 43210"
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
                // rows={3}
                style={{ resize: "vertical" }}
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn primary register-btn"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Create account"}
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
