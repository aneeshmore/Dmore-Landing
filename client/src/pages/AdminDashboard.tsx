import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  paymentStatus: "pending" | "completed";
}

const PLAN_LABELS = {
  basic: "Basic",
  pro: "Pro",
} as const;

const DURATION_LABELS = {
  monthly: "Monthly",
  "6months": "6 Months",
  "1year": "Yearly",
} as const;

const PLAN_PRICING = {
  basic: {
    monthly: 1499,
    "6months": 7999,
    "1year": 14999,
  },
  pro: {
    monthly: 4999,
    "6months": 26999,
    "1year": 49999,
  },
} as const;

const AdminDashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [plansList, setPlansList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [pricing, setPricing] = useState({
    basic: { monthly: "" as any, "6months": "" as any, "1year": "" as any },
    pro: { monthly: "" as any, "6months": "" as any, "1year": "" as any }
  });
  const [pricingLoading, setPricingLoading] = useState(false);

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
    paymentStatus: "pending",
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
    numberOfUsers: "1",
    paymentStatus: "pending"
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("admin/registered-users");
      setUsers(data.users || []);
    } catch {
      setError("Unable to load users.");
      showToast("Unable to load users.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchPricing = async () => {
    try {
      const { data } = await api.get("pricing");
      setPricing({
        basic: {
          monthly: data.basic.monthly,
          "6months": data.basic["6months"],
          "1year": data.basic["1year"]
        },
        pro: {
          monthly: data.pro.monthly,
          "6months": data.pro["6months"],
          "1year": data.pro["1year"]
        }
      });
    } catch (err) {
      console.error("Failed to fetch pricing");
    }
  };

  const updatePricing = async (planType: string, values: any) => {
    setPricingLoading(true);
    try {
      await api.put("admin/update-pricing", {
        planType,
        monthlyPrice: Number(values.monthly),
        sixMonthPrice: Number(values["6months"]),
        yearlyPrice: Number(values["1year"])
      });
      showToast(`${planType.toUpperCase()} plan updated`, "success");
      fetchPricing();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to update pricing", "error");
    } finally {
      setPricingLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const { data } = await api.get("admin/plans");
      setPlansList(data);
    } catch (err) {
      console.error("Failed to fetch plans", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPlans();
    fetchPricing();
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
      paymentStatus: entry.renewalDate ? "completed" : "pending",
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
      const payload: any = {
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
      };

      if (editForm.paymentStatus === "completed") {
        const now = new Date();
        if (editForm.subscriptionDuration === "monthly") now.setMonth(now.getMonth() + 1);
        else if (editForm.subscriptionDuration === "6months") now.setMonth(now.getMonth() + 6);
        else if (editForm.subscriptionDuration === "1year") now.setFullYear(now.getFullYear() + 1);
        
        payload.renewalDate = now.toISOString();
        payload.accountStatus = "active";

        // Also save the calculated payment details for consistency in history
        const planKey = editForm.planType as "basic" | "pro";
        const durationKey = editForm.subscriptionDuration as "monthly" | "6months" | "1year";
        const basePrice = PLAN_PRICING[planKey][durationKey];
        const gst = Number((basePrice * 0.18).toFixed(2));
        
        payload.paymentBaseAmount = String(basePrice);
        payload.paymentDiscountAmount = "0"; // Manual activation usually has no discount recorded here
        payload.paymentGstAmount = String(gst);
        payload.paymentFinalAmount = String(basePrice + gst);
      } else {
        payload.renewalDate = null;
        payload.accountStatus = "pending_payment";
        payload.paymentBaseAmount = null;
        payload.paymentDiscountAmount = null;
        payload.paymentGstAmount = null;
        payload.paymentFinalAmount = null;
      }

      await api.put(`/users/${editUserId}`, payload);
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
      const payload: any = { ...addTenantForm };

      if (addTenantForm.paymentStatus === "completed") {
        const now = new Date();
        if (addTenantForm.subscriptionDuration === "monthly") now.setMonth(now.getMonth() + 1);
        else if (addTenantForm.subscriptionDuration === "6months") now.setMonth(now.getMonth() + 6);
        else if (addTenantForm.subscriptionDuration === "1year") now.setFullYear(now.getFullYear() + 1);
        payload.renewalDate = now.toISOString();
        payload.accountStatus = "active";
      } else {
        payload.renewalDate = null;
        payload.accountStatus = "pending_payment";
      }

      const { data } = await api.post("/admin/add-tenant", payload);
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
        numberOfUsers: "1",
        paymentStatus: "pending"
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

  const toNumber = (value: unknown) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

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

  const handleGenerateCoupon = async (userId: number) => {
    const colors = ["Red", "Blue", "Green", "Gold", "Pink", "Grey", "Cyan", "Ruby"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const number = Math.floor(100 + Math.random() * 900);
    const code = `${color}@${number}`;
    const now = new Date().toISOString();

    setUsers(currentUsers => currentUsers.map(u => 
      u.id === userId ? { ...u, couponCode: code, couponCreatedAt: now } : u
    ));

    try {
      await api.put(`/users/${userId}`, { 
        couponCode: code, 
        couponCreatedAt: now 
      });
      showToast("Coupon code generated successfully", "success");
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to generate coupon", "error");
      fetchUsers();
    }
  };

  const handleUpdateCoupon = async (userId: number, code: string) => {
    const now = new Date().toISOString();
    setUsers(currentUsers => currentUsers.map(u => 
      u.id === userId ? { ...u, couponCode: code, couponCreatedAt: now } : u
    ));

    try {
      await api.put(`/users/${userId}`, { 
        couponCode: code,
        couponCreatedAt: now
      });
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to update coupon", "error");
      fetchUsers();
    }
  };

  const handleUpdateDiscount = async (userId: number, amount: string) => {
    setUsers(currentUsers => currentUsers.map(u => 
      u.id === userId ? { ...u, couponDiscountAmount: amount } : u
    ));

    try {
      await api.put(`/users/${userId}`, { 
        couponDiscountAmount: amount
      });
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to update discount", "error");
      fetchUsers();
    }
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast("Coupon code copied to clipboard", "info");
  };

  const handleUpdatePlan = async (id: number, field: string, value: string) => {
    setPlansList(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    
    try {
      const plan = plansList.find(p => p.id === id);
      const payload = {
        monthlyPrice: field === "monthlyPrice" ? value : plan.monthlyPrice,
        sixMonthPrice: field === "sixMonthPrice" ? value : plan.sixMonthPrice,
        yearlyPrice: field === "yearlyPrice" ? value : plan.yearlyPrice,
      };
      await api.put(`/admin/plans/${id}`, payload);
      showToast("Plan pricing updated", "success");
    } catch (err) {
      showToast("Failed to update plan pricing", "error");
      fetchPlans();
    }
  };

  const getCouponStatus = (createdAt?: string) => {
    if (!createdAt) return null;
    const createdDate = new Date(createdAt);
    const expiryDate = new Date(createdDate);
    expiryDate.setDate(createdDate.getDate() + 30);
    
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return { status: "expired", text: "Expired" };
    return { status: "valid", text: `Expires in ${diffDays}d` };
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
        <div className="status-cards-row">
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
        </div>

        <div className="admin-card admin-pricing-card">
          <div className="admin-card-header">
            <h2>Plan Pricing Management</h2>
            {pricingLoading && <span className="loading-text">Saving...</span>}
          </div>
          <div className="pricing-grid">
            <div className="pricing-settings-card">
              <h3>Basic Plan</h3>
              <div className="pricing-fields">
                <div className="pricing-field">
                  <label>Monthly Price (INR)</label>
                  <input
                    type="text"
                    value={pricing.basic.monthly}
                    onChange={(e) => setPricing(prev => ({ ...prev, basic: { ...prev.basic, monthly: Number(e.target.value) } }))}
                  />
                </div>
                <div className="pricing-field">
                  <label>6 Months Price (INR)</label>
                  <input
                    type="text"
                    value={pricing.basic["6months"]}
                    onChange={(e) => setPricing(prev => ({ ...prev, basic: { ...prev.basic, "6months": Number(e.target.value) } }))}
                  />
                </div>
                <div className="pricing-field">
                  <label>Yearly Price (INR)</label>
                  <input
                    type="text"
                    value={pricing.basic["1year"]}
                    onChange={(e) => setPricing(prev => ({ ...prev, basic: { ...prev.basic, "1year": Number(e.target.value) } }))}
                  />
                </div>
                <button
                  className="btn-update-pricing"
                  onClick={() => updatePricing('basic', pricing.basic)}
                  disabled={pricingLoading}
                >
                  Update Basic Plan
                </button>
              </div>
            </div>

            <div className="pricing-settings-card pro">
              <h3>Pro Plan</h3>
              <div className="pricing-fields">
                <div className="pricing-field">
                  <label>Monthly Price (INR)</label>
                  <input
                    type="text"
                    value={pricing.pro.monthly}
                    onChange={(e) => setPricing(prev => ({ ...prev, pro: { ...prev.pro, monthly: Number(e.target.value) } }))}
                  />
                </div>
                <div className="pricing-field">
                  <label>6 Months Price (INR)</label>
                  <input
                    type="text"
                    value={pricing.pro["6months"]}
                    onChange={(e) => setPricing(prev => ({ ...prev, pro: { ...prev.pro, "6months": Number(e.target.value) } }))}
                  />
                </div>
                <div className="pricing-field">
                  <label>Yearly Price (INR)</label>
                  <input
                    type="text"
                    value={pricing.pro["1year"]}
                    onChange={(e) => setPricing(prev => ({ ...prev, pro: { ...prev.pro, "1year": Number(e.target.value) } }))}
                  />
                </div>
                <button
                  className="btn-update-pricing pro-button"
                  onClick={() => updatePricing('pro', pricing.pro)}
                  disabled={pricingLoading}
                >
                  Update Pro Plan
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-card admin-table-card">
          <div className="admin-card-header">
            <h2>Registered Users</h2>

            <div className="header-actions">
              <Link to="/admin/transactions" className="btn-action history-btn">
                📜 Transaction History
              </Link>

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
                    <th>Payment Details</th>
                    <th>Coupon</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={15}>
                        <div className="empty-state">
                          <p>No users found.</p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {users.map((entry) => {
                    const hasVerifiedPayment =
                      entry.paymentStatus === "completed" ||
                      Boolean(entry.renewalDate);
                    const planLabel = entry.planType
                      ? PLAN_LABELS[entry.planType]
                      : "-";
                    const durationLabel = entry.subscriptionDuration
                      ? DURATION_LABELS[entry.subscriptionDuration]
                      : "-";

                    const fallbackBaseAmount =
                      entry.planType && entry.subscriptionDuration
                        ? PLAN_PRICING[entry.planType][entry.subscriptionDuration]
                        : null;
                    const baseAmount = hasVerifiedPayment
                      ? (toNumber(entry.paymentBaseAmount) ?? fallbackBaseAmount)
                      : null;
                    const discountAmount = hasVerifiedPayment
                      ? (toNumber(entry.paymentDiscountAmount) ?? 0)
                      : null;
                    const gstAmount = hasVerifiedPayment
                      ? (toNumber(entry.paymentGstAmount) ??
                        (baseAmount !== null && discountAmount !== null
                          ? Number(((baseAmount - discountAmount) * 0.18).toFixed(2))
                          : null))
                      : null;
                    const finalAmount = hasVerifiedPayment
                      ? (toNumber(entry.paymentFinalAmount) ??
                        (baseAmount !== null &&
                          discountAmount !== null &&
                          gstAmount !== null
                          ? Number((baseAmount - discountAmount + gstAmount).toFixed(2))
                          : null))
                      : null;

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
                          {entry.planType ? (
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
                          <span className={`payment-status-badge ${hasVerifiedPayment ? "completed" : "pending"}`}>
                            {hasVerifiedPayment ? "Completed" : "Pending"}
                          </span>
                        </td>

                        <td>
                          <div className={`payment-details-cell ${hasVerifiedPayment ? "completed" : "pending"}`}>
                            <div className="payment-details-row">
                              <span>Base</span>
                              <span>{formatCurrency(baseAmount)}</span>
                            </div>
                            <div className="payment-details-row">
                              <span>Discount</span>
                              <span>{formatCurrency(discountAmount)}</span>
                            </div>
                            <div className="payment-details-row">
                              <span>GST (18%)</span>
                              <span>{formatCurrency(gstAmount)}</span>
                            </div>
                            <div className="payment-details-row payment-details-final">
                              <span>Final</span>
                              <span>{formatCurrency(finalAmount)}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="coupon-cell">
                            <div className="coupon-row">
                              <div className="coupon-input-wrapper">
                                <input
                                  type="text"
                                  className="coupon-input"
                                  value={entry.couponCode || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setUsers(prev => prev.map(u => u.id === entry.id ? { ...u, couponCode: val } : u));
                                  }}
                                  onBlur={(e) => handleUpdateCoupon(entry.id, e.target.value)}
                                  placeholder="Code"
                                  maxLength={10}
                                />
                                <div className="coupon-actions-inline">
                                  <button
                                    className="btn-inline-action"
                                    onClick={() => handleGenerateCoupon(entry.id)}
                                    title="Generate Code"
                                  >
                                    ✨
                                  </button>
                                  {entry.couponCode && (
                                    <button
                                      className="btn-inline-action"
                                      onClick={() => handleCopyCoupon(entry.couponCode!)}
                                      title="Copy Code"
                                    >
                                      📋
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="discount-input-wrapper">
                                <span className="discount-symbol">₹</span>
                                <input
                                  type="number"
                                  className="discount-input"
                                  value={entry.couponDiscountAmount || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setUsers(prev => prev.map(u => u.id === entry.id ? { ...u, couponDiscountAmount: val } : u));
                                  }}
                                  onBlur={(e) => handleUpdateDiscount(entry.id, e.target.value)}
                                  placeholder="0"
                                />
                              </div>
                            </div>
                            {entry.couponCode && (
                              <div className={`coupon-expiry ${getCouponStatus(entry.couponCreatedAt)?.status}`}>
                                {getCouponStatus(entry.couponCreatedAt)?.text}
                              </div>
                            )}
                          </div>
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

                <div className="form-group" style={{ marginTop: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Payment Status</label>
                  <div style={{ display: "flex", gap: "15px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="paymentStatus"
                        value="pending"
                        checked={editForm.paymentStatus === "pending"}
                        onChange={() => setEditForm(prev => ({ ...prev, paymentStatus: "pending" }))}
                      />
                      Pending
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="paymentStatus"
                        value="completed"
                        checked={editForm.paymentStatus === "completed"}
                        onChange={() => setEditForm(prev => ({ ...prev, paymentStatus: "completed" }))}
                      />
                      Completed (Active)
                    </label>
                  </div>
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

                <div className="form-group" style={{ marginTop: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Payment Status</label>
                  <div style={{ display: "flex", gap: "15px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="addTenantPaymentStatus"
                        value="pending"
                        checked={addTenantForm.paymentStatus === "pending"}
                        onChange={() => setAddTenantForm(prev => ({ ...prev, paymentStatus: "pending" }))}
                      />
                      Pending
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="addTenantPaymentStatus"
                        value="completed"
                        checked={addTenantForm.paymentStatus === "completed"}
                        onChange={() => setAddTenantForm(prev => ({ ...prev, paymentStatus: "completed" }))}
                      />
                      Completed (Active)
                    </label>
                  </div>
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

      <div className="admin-content" style={{ marginTop: "2rem" }}>
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-header-main">
              <h2>Pricing Settings</h2>
              <p>Update subscription plan prices dynamically</p>
            </div>
          </div>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Plan Type</th>
                  <th>Monthly (₹)</th>
                  <th>6 Months (₹)</th>
                  <th>1 Year (₹)</th>
                </tr>
              </thead>
              <tbody>
                {plansList.map((plan) => (
                  <tr key={plan.id}>
                    <td>
                      <span className={`role-badge ${plan.planType}`}>
                        {plan.planType.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div className="discount-input-wrapper">
                        <span className="discount-symbol">₹</span>
                        <input
                          type="number"
                          className="discount-input"
                          value={plan.monthlyPrice}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPlansList(prev => prev.map(p => p.id === plan.id ? { ...p, monthlyPrice: val } : p));
                          }}
                          onBlur={(e) => handleUpdatePlan(plan.id, "monthlyPrice", e.target.value)}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="discount-input-wrapper">
                        <span className="discount-symbol">₹</span>
                        <input
                          type="number"
                          className="discount-input"
                          value={plan.sixMonthPrice}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPlansList(prev => prev.map(p => p.id === plan.id ? { ...p, sixMonthPrice: val } : p));
                          }}
                          onBlur={(e) => handleUpdatePlan(plan.id, "sixMonthPrice", e.target.value)}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="discount-input-wrapper">
                        <span className="discount-symbol">₹</span>
                        <input
                          type="number"
                          className="discount-input"
                          value={plan.yearlyPrice}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPlansList(prev => prev.map(p => p.id === plan.id ? { ...p, yearlyPrice: val } : p));
                          }}
                          onBlur={(e) => handleUpdatePlan(plan.id, "yearlyPrice", e.target.value)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
