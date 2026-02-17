import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import "../App.css";

const Login = () => {
  const { login } = useAuthContext();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const identifier = email.trim();
    if (!identifier) {
      showToast("Email or username is required.", "warning");
      return;
    }

    if (identifier.toLowerCase() !== "admin" && !isValidEmail(identifier)) {
      showToast("Please enter a valid email address.", "warning");
      return;
    }

    if (!password.trim()) {
      showToast("Password is required.", "warning");
      return;
    }

    setLoading(true);

    try {
      const user = await login(identifier, password);
      showToast("Login successful", "success");

      if (user.role === "admin") {
        navigate("/admin-dashboard");
      } else {
        navigate("/payment");
      }
    } catch {
      showToast("Invalid credentials.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <div className="login-left">
          <p className="login-kicker">WELCOME BACK</p>
          <h1>PaintOS Control Center</h1>
          <p>
            Sign in to monitor production, inventory, dispatch, and payments in
            one unified workspace.
          </p>
        </div>

        <div className="login-card">
          <h2>Sign in to your account</h2>
          <p className="login-subtitle">Enter your credentials to continue.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label>Username or Email</label>
              <input
                type="text"
                placeholder="admin or you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="login-bottom">
            Don&rsquo;t have an account? <Link to="/register">Register</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
