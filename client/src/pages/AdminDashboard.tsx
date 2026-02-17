import { type FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../context/ToastContext";
import type { User } from "../types";
import "./AdminDashboard.css";

interface EditFormState {
  name: string;
  mobile: string;
  companyName: string;
  companyAddress: string;
  domain: string;
  numberOfUsers: string;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({
    name: "",
    mobile: "",
    companyName: "",
    companyAddress: "",
    domain: "",
    numberOfUsers: "1",
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/users");
      setUsers(data.users || []);
    } catch {
      setError("Unable to load users.");
      showToast("Unable to load users.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this user?")) return;
    try {
      await api.delete(`/users/${id}`);
      showToast("User deleted successfully", "success");
      fetchUsers();
    } catch (err: any) {
      showToast(
        err?.response?.data?.message || "Failed to delete user.",
        "error",
      );
    }
  };

  const openEditModal = (entry: User) => {
    setEditUserId(entry.id);
    setEditForm({
      name: entry.name || "",
      mobile: entry.mobile || "",
      companyName: entry.companyName || "",
      companyAddress: entry.companyAddress || "",
      domain: entry.domain || "",
      numberOfUsers: String(entry.numberOfUsers ?? 1),
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditUserId(null);
    setEditLoading(false);
  };

  const handleEditSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editUserId) return;

    const numberOfUsers = Number(editForm.numberOfUsers);
    if (Number.isNaN(numberOfUsers) || numberOfUsers <= 0) {
      showToast("Number of users must be a positive number.", "warning");
      return;
    }

    setEditLoading(true);
    try {
      await api.put(`/users/${editUserId}`, {
        name: editForm.name,
        mobile: editForm.mobile,
        companyName: editForm.companyName,
        companyAddress: editForm.companyAddress,
        domain: editForm.domain,
        numberOfUsers,
      });
      showToast("User details updated successfully", "success");
      closeEditModal();
      fetchUsers();
    } catch (err: any) {
      showToast(
        err?.response?.data?.message || "Failed to update user details.",
        "error",
      );
      setEditLoading(false);
    }
  };

  const downloadCsv = async () => {
    const response = await api.get("/users/export/csv", {
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "users.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const pendingPaymentCount = users.filter(
    (entry) => entry.accountStatus === "pending_payment",
  ).length;
  const completedPaymentCount = users.filter(
    (entry) => entry.accountStatus !== "pending_payment",
  ).length;
  const activeUsersCount = users.filter(
    (entry) => entry.isActive !== false,
  ).length;
  const inactiveUsersCount = users.filter(
    (entry) => entry.isActive === false,
  ).length;

  const handleToggleUserStatus = async (entry: User) => {
    const nextStatus = entry.isActive === false ? true : false;
    try {
      await api.put(`/users/${entry.id}`, { isActive: nextStatus });
      showToast(
        nextStatus
          ? "User activated successfully."
          : "User deactivated successfully.",
        "success",
      );
      fetchUsers();
    } catch (err: any) {
      showToast(
        err?.response?.data?.message || "Failed to update user status.",
        "error",
      );
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-hero">
        <div className="admin-hero-content">
          <div className="admin-badge">
            <span className="admin-badge-icon">A</span>
            Admin Dashboard
          </div>
          <h1>Welcome, {user?.name}</h1>
          <p>Manage users, subscriptions and account status.</p>
        </div>

        <div className="admin-hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-value">{users.length}</span>
            <span className="hero-stat-label">Total Users</span>
          </div>
        </div>
      </div>

      <div className="admin-content">
        <div className="admin-card admin-payment-status-card">
          <div className="admin-card-header">
            <h2>Payment Status</h2>
          </div>
          <div className="payment-status-grid">
            <div className="payment-status-item pending">
              <span className="payment-status-value">
                {pendingPaymentCount}
              </span>
              <span className="payment-status-label">Pending</span>
            </div>
            <div className="payment-status-item completed">
              <span className="payment-status-value">
                {completedPaymentCount}
              </span>
              <span className="payment-status-label">Completed</span>
            </div>
          </div>
        </div>

        <div className="admin-card admin-user-status-card">
          <div className="admin-card-header">
            <h2>User Status Management</h2>
          </div>
          <div className="payment-status-grid">
            <div className="payment-status-item completed">
              <span className="payment-status-value">{activeUsersCount}</span>
              <span className="payment-status-label">Active Users</span>
            </div>
            <div className="payment-status-item pending">
              <span className="payment-status-value">{inactiveUsersCount}</span>
              <span className="payment-status-label">Inactive Users</span>
            </div>
          </div>
        </div>

        <div className="admin-card admin-table-card">
          <div className="admin-card-header">
            <h2>Registered Users</h2>

            <div className="header-actions">
              <button
                className="btn-action"
                onClick={fetchUsers}
                disabled={loading}
              >
                Refresh
              </button>

              <button className="btn-action btn-export" onClick={downloadCsv}>
                Export CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner-large"></div>
              <p>Loading users...</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Mobile</th>
                    <th>Company</th>
                    <th>Domain</th>
                    <th>Users</th>
                    <th>Plan</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>User Status</th>
                    <th>Payment Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={12}>
                        <div className="empty-state">
                          <p>No users found.</p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {users.map((entry) => (
                    <tr
                      key={entry.id}
                      className={
                        entry.accountStatus === "disabled" ? "row-disabled" : ""
                      }
                    >
                      <td>
                        <div className="customer-cell">
                          <div className="customer-avatar">
                            {entry.name?.charAt(0).toUpperCase() || "U"}
                          </div>
                          <div className="customer-info">
                            <span className="customer-name">{entry.name}</span>
                            <span className="customer-email">
                              {entry.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>{entry.mobile || "-"}</td>

                      <td>
                        {entry.companyName ? (
                          <div className="company-info">
                            <span>{entry.companyName}</span>
                            <small>{entry.companyAddress || ""}</small>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td>
                        {entry.domain ? (
                          <span className="domain-text">{entry.domain}</span>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td>
                        <span className="users-count">
                          {entry.numberOfUsers ?? 1}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`plan-badge ${
                            entry.planType === "pro" ? "plan-pro" : "plan-basic"
                          }`}
                        >
                          {entry.planType || "basic"}
                        </span>
                      </td>

                      <td>
                        <span className="duration-text">
                          {entry.subscriptionDuration || "monthly"}
                        </span>
                      </td>

                      <td>
                        <div className="user-status-cell">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={entry.isActive !== false}
                            className={`status-switch ${
                              entry.isActive !== false ? "on" : "off"
                            }`}
                            onClick={() => handleToggleUserStatus(entry)}
                          >
                            <span className="status-switch-thumb" />
                          </button>
                          <span className="user-status-text">
                            {entry.isActive !== false ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`toggle-label ${
                            entry.accountStatus === "active"
                              ? "active"
                              : "disabled"
                          }`}
                        >
                          {entry.accountStatus}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`payment-status-badge ${
                            entry.accountStatus === "pending_payment"
                              ? "pending"
                              : "completed"
                          }`}
                        >
                          {entry.accountStatus === "pending_payment"
                            ? "Pending"
                            : "Completed"}
                        </span>
                      </td>

                      <td>
                        <span className="date-text">
                          {entry.createdAt
                            ? new Date(
                                entry.createdAt as string,
                              ).toLocaleDateString()
                            : "-"}
                        </span>
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-edit"
                            onClick={() => openEditModal(entry)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(entry.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="table-footer">
            <span className="results-count">Showing {users.length} users</span>
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <h3>Edit User</h3>
            <form className="admin-modal-form" onSubmit={handleEditSave}>
              <input
                type="text"
                placeholder="Name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
              <input
                type="text"
                placeholder="Mobile"
                value={editForm.mobile}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, mobile: e.target.value }))
                }
              />
              <input
                type="text"
                placeholder="Company Name"
                value={editForm.companyName}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    companyName: e.target.value,
                  }))
                }
              />
              <input
                type="text"
                placeholder="Company Address"
                value={editForm.companyAddress}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    companyAddress: e.target.value,
                  }))
                }
              />
              <input
                type="text"
                placeholder="Domain"
                value={editForm.domain}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, domain: e.target.value }))
                }
              />
              <input
                type="number"
                placeholder="Number of Users"
                value={editForm.numberOfUsers}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    numberOfUsers: e.target.value,
                  }))
                }
                min={1}
                required
              />
              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="btn-action"
                  onClick={closeEditModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-action btn-export"
                  disabled={editLoading}
                >
                  {editLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
