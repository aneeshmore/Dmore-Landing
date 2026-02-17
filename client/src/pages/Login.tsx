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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login(email, password);
      showToast("Login successful", "success");

      if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/payment");
      }
    } catch (error) {
      console.error("Login error", error);
      showToast("Invalid credentials", "error");
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
            Don’t have an account? <Link to="/register">Register</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
