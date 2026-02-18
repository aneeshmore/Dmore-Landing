import { type FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../context/ToastContext";
import type { User } from "../types";
import "./AdminDashboard.css";

interface EditFormState {
  name: string;
  email: string;
  mobile: string;
  companyName: string;
  companyAddress: string;
  domain: string;
  databaseUrl: string;
  numberOfUsers: string;
  planType: string;
  subscriptionDuration: string;
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
    email: "",
    mobile: "",
    companyName: "",
    companyAddress: "",
    domain: "",
    databaseUrl: "",
    numberOfUsers: "1",
    planType: "basic",
    subscriptionDuration: "monthly",
  });

  const [isAddTenantModalOpen, setIsAddTenantModalOpen] = useState(false);
  const [addTenantLoading, setAddTenantLoading] = useState(false);
  const [addTenantForm, setAddTenantForm] = useState({
    tenantId: "",
    databaseUrl: "",
    name: "",
    email: "",
    password: "",
    mobile: "",
    companyName: "",
    companyAddress: "",
    domain: "",
    planType: "basic",
    subscriptionDuration: "monthly",
    numberOfUsers: "1"
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/admin/registered-users");
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

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchUsers();
    }, 10000);

    return () => window.clearInterval(intervalId);
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
      email: entry.email || "",
      mobile: entry.mobile || "",
      companyName: entry.companyName || "",
      companyAddress: entry.companyAddress || "",
      domain: entry.domain || "",
      databaseUrl: entry.databaseUrl || "",
      numberOfUsers: String(entry.numberOfUsers ?? 1),
      planType: entry.planType || "basic",
      subscriptionDuration: entry.subscriptionDuration || "monthly",
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
        email: editForm.email,
        mobile: editForm.mobile,
        companyName: editForm.companyName,
        companyAddress: editForm.companyAddress,
        domain: editForm.domain,
        databaseUrl: editForm.databaseUrl,
        numberOfUsers,
        planType: editForm.planType,
        subscriptionDuration: editForm.subscriptionDuration,
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
    (entry) => !entry.renewalDate,
  ).length;
  const completedPaymentCount = users.filter((entry) =>
    Boolean(entry.renewalDate),
  ).length;
  const activeUsersCount = users.filter(
    (entry) => entry.isActive !== false,
  ).length;

  const handleAddTenant = async (e: FormEvent) => {
    e.preventDefault();
    setAddTenantLoading(true);
    try {
      const { data } = await api.post("/admin/add-tenant", addTenantForm);
      showToast(data.message || "Tenant registered successfully", "success");
      setIsAddTenantModalOpen(false);
      setAddTenantForm({
        tenantId: "",
        databaseUrl: "",
        name: "",
        email: "",
        password: "",
        mobile: "",
        companyName: "",
        companyAddress: "",
        domain: "",
        planType: "basic",
        subscriptionDuration: "monthly",
        numberOfUsers: "1"
      });
    } catch (err: any) {
      showToast(
        err?.response?.data?.message || "Failed to register tenant.",
        "error"
      );
    } finally {
      setAddTenantLoading(false);
    }
  };

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
                className="btn-action btn-export"
                onClick={() => setIsAddTenantModalOpen(true)}
              >
                + Add New Client
              </button>

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
                    <th>Database URL</th>
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

                  {users.map((entry) => {
                    const hasVerifiedPayment = Boolean(entry.renewalDate);
                    const planLabel = hasVerifiedPayment
                      ? (entry.planType ?? "-")
                      : "-";
                    const durationLabel = hasVerifiedPayment
                      ? (entry.subscriptionDuration ?? "-")
                      : "-";

                    return (
                      <tr
                        key={entry.id}
                        className={
                          entry.accountStatus === "disabled"
                            ? "row-disabled"
                            : ""
                        }
                      >
                        <td>
                          <div className="customer-cell">
                            <div className="customer-avatar">
                              {entry.name?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="customer-info">
                              <span className="customer-name">
                                {entry.name}
                              </span>
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
                          {entry.databaseUrl ? (
                            <span className="domain-text" title={entry.databaseUrl}>
                              {entry.databaseUrl.length > 30 ? entry.databaseUrl.substring(0, 30) + "..." : entry.databaseUrl}
                            </span>
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
                          {hasVerifiedPayment && entry.planType ? (
                            <span
                              className={`plan-badge ${entry.planType === "pro"
                                ? "plan-pro"
                                : "plan-basic"
                                }`}
                            >
                              {planLabel}
                            </span>
                          ) : (
                            <span>-</span>
                          )}
                        </td>

                        <td>
                          <span className="duration-text">{durationLabel}</span>
                        </td>

                        <td>
                          <span className={`toggle-label ${entry.accountStatus === "active" ? "active" : "disabled"}`}>
                            {entry.accountStatus}
                          </span>
                        </td>

                        <td>
                          <div className="user-status-cell">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={entry.isActive !== false}
                              className={`status-switch ${entry.isActive !== false ? "on" : "off"
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
                          <span className={`payment-status-badge ${entry.renewalDate ? "completed" : "pending"}`}>
                            {entry.renewalDate ? "Completed" : "Pending"}
                          </span>
                        </td>

                        <td>
                          <span className="date-text">
                            {entry.createdAt ? new Date(entry.createdAt as string).toLocaleDateString() : "-"}
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
                    );
                  })}
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

      {
        isEditModalOpen && (
          <div className="admin-modal-backdrop">
            <div className="admin-modal">
              <h3>Edit User</h3>
              <form className="admin-modal-form" onSubmit={handleEditSave}>
                <div className="form-group">
                  <label>Client Name</label>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      placeholder="Email"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Mobile Number</label>
                    <input
                      type="text"
                      placeholder="Mobile"
                      value={editForm.mobile}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, mobile: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Company Name</label>
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
                </div>

                <div className="form-group">
                  <label>Company Address</label>
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
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Subdomain</label>
                    <input
                      type="text"
                      placeholder="Domain"
                      value={editForm.domain}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, domain: e.target.value }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Database URL</label>
                    <input
                      type="text"
                      placeholder="Database URL"
                      value={editForm.databaseUrl}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, databaseUrl: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Plan Type</label>
                    <select
                      value={editForm.planType}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, planType: e.target.value }))
                      }
                    >
                      <option value="basic">Basic</option>
                      <option value="pro">Pro</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Duration</label>
                    <select
                      value={editForm.subscriptionDuration}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, subscriptionDuration: e.target.value }))
                      }
                    >
                      <option value="monthly">Monthly</option>
                      <option value="6months">6 Months</option>
                      <option value="1year">1 Year</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Number of Users</label>
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
                </div>

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
                    {editLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {
        isAddTenantModalOpen && (
          <div className="admin-modal-backdrop">
            <div className="admin-modal">
              <h3>Add New Client (Multi-tenant)</h3>
              <p style={{ fontSize: "0.8rem", color: "#666", marginBottom: "1rem" }}>
                This will provision a new database and subdomain for the OMS.
              </p>
              <form className="admin-modal-form" onSubmit={handleAddTenant}>
                <div className="form-group">
                  <label>Admin Name</label>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={addTenantForm.name}
                    onChange={(e) =>
                      setAddTenantForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="admin@client.com"
                      value={addTenantForm.email}
                      onChange={(e) =>
                        setAddTenantForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Mobile</label>
                    <input
                      type="text"
                      placeholder="Mobile Number"
                      value={addTenantForm.mobile}
                      onChange={(e) =>
                        setAddTenantForm((prev) => ({ ...prev, mobile: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    placeholder="Initial Password"
                    value={addTenantForm.password}
                    onChange={(e) =>
                      setAddTenantForm((prev) => ({ ...prev, password: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Company Name</label>
                  <input
                    type="text"
                    placeholder="Company Name"
                    value={addTenantForm.companyName}
                    onChange={(e) =>
                      setAddTenantForm((prev) => ({ ...prev, companyName: e.target.value }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Company Address</label>
                  <input
                    type="text"
                    placeholder="Address"
                    value={addTenantForm.companyAddress}
                    onChange={(e) =>
                      setAddTenantForm((prev) => ({ ...prev, companyAddress: e.target.value }))
                    }
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Subdomain (Tenant ID)</label>
                    <input
                      type="text"
                      placeholder="e.g., client1"
                      value={addTenantForm.tenantId}
                      onChange={(e) =>
                        setAddTenantForm((prev) => ({ ...prev, tenantId: e.target.value }))
                      }
                      required
                    />
                    <small>Used for subdomain routing (e.g., client1.yourdomain.com)</small>
                  </div>
                  <div className="form-group">
                    <label>Database URL</label>
                    <input
                      type="text"
                      placeholder="postgresql://..."
                      value={addTenantForm.databaseUrl}
                      onChange={(e) =>
                        setAddTenantForm((prev) => ({ ...prev, databaseUrl: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Plan Type</label>
                    <select
                      value={addTenantForm.planType}
                      onChange={(e) =>
                        setAddTenantForm((prev) => ({ ...prev, planType: e.target.value }))
                      }
                    >
                      <option value="basic">Basic</option>
                      <option value="pro">Pro</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Duration</label>
                    <select
                      value={addTenantForm.subscriptionDuration}
                      onChange={(e) =>
                        setAddTenantForm((prev) => ({ ...prev, subscriptionDuration: e.target.value }))
                      }
                    >
                      <option value="monthly">Monthly</option>
                      <option value="6months">6 Months</option>
                      <option value="1year">1 Year</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Number of Users</label>
                  <input
                    type="number"
                    min="1"
                    value={addTenantForm.numberOfUsers}
                    onChange={(e) =>
                      setAddTenantForm((prev) => ({ ...prev, numberOfUsers: e.target.value }))
                    }
                  />
                </div>

                <div className="admin-modal-actions">
                  <button
                    type="button"
                    className="btn-action"
                    onClick={() => setIsAddTenantModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-action btn-export"
                    disabled={addTenantLoading}
                  >
                    {addTenantLoading ? "Registering..." : "Add Client"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div>
  );
};

export default AdminDashboard;
