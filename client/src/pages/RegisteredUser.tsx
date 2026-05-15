import { useEffect, useState } from "react";
import { useAuthContext } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import "../App.css";

interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  companyName: string;
  role: string;
  machineId?: string;
  createdAt: string;
}

const RegisteredUser = () => {
  const { user, token, loading } = useAuthContext();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await api.get("/admin/registered-users");
        console.log("[ADMIN-USERS] API Response:", data);
        setUsers(data.users);
      } catch (err: any) {
        setError("Failed to fetch users");
      } finally {
        setLoadingUsers(false);
      }
    };

    if (token && user?.role === "admin") {
      fetchUsers();
    }
  }, [token, user]);

  if (loading) return <p>Loading...</p>;

  // 🚫 Block non-admins
  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="registered-page">
      <div className="registered-container">
        <h2>Registered Users</h2>

        {loadingUsers ? (
          <p>Loading users...</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : (
          <div className="table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>Machine ID</th>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.mobile || "-"}</td>
                    <td>
                      {u.machineId || (u as any).machine_id ? (
                        <div className="machine-id-cell">
                          {(console.log("[ADMIN-USERS] Render Machine ID:", u.machineId || (u as any).machine_id), null)}
                          <code className="machine-id-badge" title={u.machineId || (u as any).machine_id}>
                            {u.machineId || (u as any).machine_id || "NOT_FOUND"}
                          </code>
                          <button 
                            className="btn-copy-mini"
                            onClick={() => {
                              const mid = u.machineId || (u as any).machine_id;
                              if (mid) {
                                navigator.clipboard.writeText(mid);
                                showToast("Machine ID copied to clipboard", "info");
                              }
                            }}
                            title="Copy Machine ID"
                          >
                            📋
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>{u.companyName || "-"}</td>
                    <td>
                      <span className={`role-badge ${u.role}`}>{u.role}</span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisteredUser;
