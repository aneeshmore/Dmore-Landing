import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminDashboard from "./pages/AdminDashboard";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import About from "./pages/About";
import Careers from "./pages/Careers";
import Payment from "./pages/Payment";
import { useAuthContext } from "./context/AuthContext";
import RegisteredUser from "./pages/RegisteredUser";

function App() {
  const { token, loading } = useAuthContext();

  if (loading) return <div>Loading...</div>;

  return (
    <div className="app-shell">
      <Navbar />
      <main className="content">
        <Routes>
          <Route path="/" element={<Landing />} />

          <Route
            path="/login"
            element={token ? <Navigate to="/payment" replace /> : <Login />}
          />

          <Route
            path="/register"
            element={token ? <Navigate to="/payment" replace /> : <Register />}
          />

          <Route
            path="/payment"
            element={token ? <Payment /> : <Navigate to="/login" replace />}
          />

          <Route
            path="/registered-users"
            element={
              <ProtectedRoute role="admin">
                <RegisteredUser />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/about" element={<About />} />
          <Route path="/careers" element={<Careers />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
