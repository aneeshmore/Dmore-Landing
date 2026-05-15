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
  customBaseAmount: string;
  customFinalAmount: string;
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

// Removed static PLAN_PRICING - now using database-driven pricing via fetchPricing()

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
    customBaseAmount: "",
    customFinalAmount: "",
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
      customBaseAmount: entry.paymentBaseAmount ? String(entry.paymentBaseAmount) : "",
      customFinalAmount: entry.paymentFinalAmount ? String(entry.paymentFinalAmount) : "",
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

        // Use custom overrides if provided, otherwise real-time pricing from state
        const planKey = editForm.planType as "basic" | "pro";
        const durationKey = editForm.subscriptionDuration as "monthly" | "6months" | "1year";
        const dbBasePrice = pricing[planKey][durationKey] || 0;
        
        const finalBase = editForm.customBaseAmount || String(dbBasePrice);
        const finalGst = editForm.customFinalAmount 
          ? (Number(editForm.customFinalAmount) - Number(finalBase)).toFixed(2)
          : (Number(finalBase) * 0.18).toFixed(2);

        payload.paymentBaseAmount = finalBase;
        payload.paymentDiscountAmount = "0"; 
        payload.paymentGstAmount = finalGst;
        payload.paymentFinalAmount = editForm.customFinalAmount || (Number(finalBase) * 1.18).toFixed(2);
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

  const totalSpent = users.reduce((sum, u) => sum + Number(u.paymentFinalAmount || 0), 0);

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

  const formatCurrency = (value: unknown) => {
    if (value === null || value === undefined || value === "") return "—";
    if (value === "N/A") return "N/A";
    
    const num = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(num)) return String(value);

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const handleToggleUserStatus = async (entry: User) => {
    const nextIsActive = entry.isActive === false;
    const nextAccountStatus = nextIsActive ? "active" : "disabled";
    
    try {
      await api.put(`/users/${entry.id}`, { 
        isActive: nextIsActive,
        accountStatus: nextAccountStatus
      });
      showToast(
        nextIsActive
          ? "User account enabled."
          : "User account disabled.",
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ padding: '8px', background: 'rgba(37, 99, 235, 0.2)', borderRadius: '10px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
              <span className="hero-stat-label">Total Users</span>
            </div>
            <span className="hero-stat-value">{users.length}</span>
          </div>
          <div className="hero-stat">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ padding: '8px', background: 'rgba(34, 197, 94, 0.2)', borderRadius: '10px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
              </div>
              <span className="hero-stat-label">Active Users</span>
            </div>
            <span className="hero-stat-value">{activeUsersCount}</span>
          </div>
          <div className="hero-stat">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ padding: '8px', background: 'rgba(245, 158, 11, 0.2)', borderRadius: '10px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
              <span className="hero-stat-label">Total Revenue</span>
            </div>
            <span className="hero-stat-value">{formatCurrency(totalSpent)}</span>
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
              <div className="pricing-card-header">
                <h3>Basic Plan</h3>
                <span className="plan-badge plan-basic">Standard</span>
              </div>
              <div className="pricing-card-body">
                <span className="pricing-section-label">Core Pricing</span>
                <div className="pricing-fields">
                  <div className="pricing-field">
                    <label>Monthly Rate</label>
                    <div className="pricing-input-wrapper">
                      <span className="currency-symbol">₹</span>
                      <input
                        type="text"
                        value={pricing.basic.monthly}
                        onChange={(e) => setPricing(prev => ({ ...prev, basic: { ...prev.basic, monthly: Number(e.target.value) } }))}
                      />
                    </div>
                  </div>
                  <div className="pricing-field">
                    <label>6 Months Rate</label>
                    <div className="pricing-input-wrapper">
                      <span className="currency-symbol">₹</span>
                      <input
                        type="text"
                        value={pricing.basic["6months"]}
                        onChange={(e) => setPricing(prev => ({ ...prev, basic: { ...prev.basic, "6months": Number(e.target.value) } }))}
                      />
                    </div>
                  </div>
                  <div className="pricing-field">
                    <label>Yearly Rate</label>
                    <div className="pricing-input-wrapper">
                      <span className="currency-symbol">₹</span>
                      <input
                        type="text"
                        value={pricing.basic["1year"]}
                        onChange={(e) => setPricing(prev => ({ ...prev, basic: { ...prev.basic, "1year": Number(e.target.value) } }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="pricing-info-row">
                  <div className="info-item">
                    <span>Taxation</span>
                    <span>GST 18% (Inclusive)</span>
                  </div>
                  <div className="info-item">
                    <span>Discounts</span>
                    <span>Coupon System Active</span>
                  </div>
                </div>
              </div>
              <div className="pricing-card-footer">
                <button
                  className="btn-update-pricing"
                  onClick={() => updatePricing('basic', pricing.basic)}
                  disabled={pricingLoading}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  Update Basic Rates
                </button>
              </div>
            </div>

            <div className="pricing-settings-card pro">
              <div className="pricing-card-header">
                <h3>Pro Plan</h3>
                <span className="plan-badge plan-pro">Enterprise</span>
              </div>
              <div className="pricing-card-body">
                <span className="pricing-section-label">Core Pricing</span>
                <div className="pricing-fields">
                  <div className="pricing-field">
                    <label>Monthly Rate</label>
                    <div className="pricing-input-wrapper">
                      <span className="currency-symbol">₹</span>
                      <input
                        type="text"
                        value={pricing.pro.monthly}
                        onChange={(e) => setPricing(prev => ({ ...prev, pro: { ...prev.pro, monthly: Number(e.target.value) } }))}
                      />
                    </div>
                  </div>
                  <div className="pricing-field">
                    <label>6 Months Rate</label>
                    <div className="pricing-input-wrapper">
                      <span className="currency-symbol">₹</span>
                      <input
                        type="text"
                        value={pricing.pro["6months"]}
                        onChange={(e) => setPricing(prev => ({ ...prev, pro: { ...prev.pro, "6months": Number(e.target.value) } }))}
                      />
                    </div>
                  </div>
                  <div className="pricing-field">
                    <label>Yearly Rate</label>
                    <div className="pricing-input-wrapper">
                      <span className="currency-symbol">₹</span>
                      <input
                        type="text"
                        value={pricing.pro["1year"]}
                        onChange={(e) => setPricing(prev => ({ ...prev, pro: { ...prev.pro, "1year": Number(e.target.value) } }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="pricing-info-row">
                  <div className="info-item">
                    <span>Taxation</span>
                    <span>GST 18% (Inclusive)</span>
                  </div>
                  <div className="info-item">
                    <span>Discounts</span>
                    <span>Coupon System Active</span>
                  </div>
                </div>
              </div>
              <div className="pricing-card-footer">
                <button
                  className="btn-update-pricing"
                  onClick={() => updatePricing('pro', pricing.pro)}
                  disabled={pricingLoading}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  Update Pro Rates
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-card admin-table-card">
          <div className="admin-card-header">
            <h2>Registered Users</h2>

            <div className="admin-header-actions">
              <Link to="/admin/transactions" className="btn-action">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                History
              </Link>

              <button
                className="btn-action btn-export"
                onClick={() => setIsAddTenantModalOpen(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Add Client
              </button>

              <button
                className="btn-action"
                onClick={fetchUsers}
                disabled={loading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                Refresh
              </button>

              <button className="btn-action" onClick={downloadCsv}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Export
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
                    <th>Machine ID</th>
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
                    const planLabel = entry.planType
                      ? PLAN_LABELS[entry.planType]
                      : "-";
                    const durationLabel = entry.subscriptionDuration
                      ? DURATION_LABELS[entry.subscriptionDuration]
                      : "-";

                    const baseAmount = entry.paymentBaseAmount;
                    const discountAmount = entry.paymentDiscountAmount || "0";
                    const gstAmount = entry.paymentGstAmount;
                    const finalAmount = entry.paymentFinalAmount;

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
                          {entry.machineId ? (
                            <div className="machine-id-cell">
                              <code className="machine-id-text" title={entry.machineId}>
                                {entry.machineId}
                              </code>
                              <button 
                                className="btn-copy-small"
                                onClick={() => {
                                  navigator.clipboard.writeText(entry.machineId!);
                                  showToast("Machine ID copied", "info");
                                }}
                                title="Copy Machine ID"
                              >
                                📋
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted-italics">—</span>
                          )}
                        </td>

                        <td>
                          {entry.companyName ? (
                            <div className="company-info">
                              <span className="company-name">{entry.companyName}</span>
                              {entry.companyAddress && (
                                <div className="company-address">
                                  <svg className="address-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                  <span>{entry.companyAddress}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
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
                          <span className={`payment-status-badge ${entry.paymentStatus || "pending"}`}>
                            {(entry.paymentStatus || "pending").charAt(0).toUpperCase() + (entry.paymentStatus || "pending").slice(1)}
                          </span>
                        </td>

                        <td>
                          {entry.paymentStatus === "completed" ? (
                            <div className="payment-details-cell completed expandable-card">
                              <div className="payment-summary-view">
                                <div className="summary-row">
                                  <span className="summary-label">Total Amount Paid:</span>
                                  <span className="summary-value">{formatCurrency(finalAmount)}</span>
                                </div>
                                <div className="summary-row">
                                  <span className="summary-label">Date:</span>
                                  <span className="summary-value">
                                    {entry.paymentDate ? new Date(entry.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : "N/A"}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="payment-expanded-content">
                                <div className="detail-divider"></div>
                                <div className="detail-grid">
                                  <div className="detail-item">
                                    <span>Plan</span>
                                    <strong>{planLabel}</strong>
                                  </div>
                                  <div className="detail-item">
                                    <span>Base</span>
                                    <span>{formatCurrency(baseAmount)}</span>
                                  </div>
                                  <div className="detail-item">
                                    <span>Discount</span>
                                    <span className="text-danger-custom">-{formatCurrency(discountAmount)}</span>
                                  </div>
                                  <div className="detail-item">
                                    <span>GST</span>
                                    <span>{formatCurrency(gstAmount)}</span>
                                  </div>
                                  <div className="detail-item total-highlight">
                                    <span>Total Amount Paid</span>
                                    <strong>{formatCurrency(finalAmount)}</strong>
                                  </div>
                                  <div className="detail-item meta">
                                    <span>Tx ID</span>
                                    <code>{entry.transactionId || "N/A"}</code>
                                  </div>
                                  <div className="detail-item meta">
                                    <span>Payment Date</span>
                                    <span>{entry.paymentDate ? new Date(entry.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : "N/A"}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="payment-details-cell pending">
                              <span className="pending-notice">Waiting for Payment</span>
                              <div className="expected-badge">
                                Expected: {formatCurrency(entry.planType && entry.subscriptionDuration ? pricing[entry.planType][entry.subscriptionDuration] : 0)}
                              </div>
                            </div>
                          )}
                        </td>

                        <td>
                          <div className={`coupon-cell ${entry.paymentStatus === "completed" ? "disabled-cell" : ""}`}>
                            <div className="coupon-row">
                              <div className={`coupon-input-wrapper ${entry.paymentStatus === "completed" ? "disabled-wrapper" : ""}`}>
                                <input
                                  type="text"
                                  className="coupon-input"
                                  value={entry.couponCode || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setUsers(prev => prev.map(u => u.id === entry.id ? { ...u, couponCode: val } : u));
                                  }}
                                  onBlur={(e) => handleUpdateCoupon(entry.id, e.target.value)}
                                  placeholder={entry.paymentStatus === "completed" ? "Locked" : "Code"}
                                  maxLength={10}
                                  disabled={entry.paymentStatus === "completed"}
                                />
                                <div className="coupon-actions-inline">
                                  <button
                                    className="btn-inline-action"
                                    onClick={() => handleGenerateCoupon(entry.id)}
                                    title={entry.paymentStatus === "completed" ? "Payment Completed" : "Generate Code"}
                                    disabled={entry.paymentStatus === "completed"}
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
                              <div className={`discount-input-wrapper ${entry.paymentStatus === "completed" ? "disabled-wrapper" : ""}`}>
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
                                  disabled={entry.paymentStatus === "completed"}
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
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn-action"
                              onClick={() => openEditModal(entry)}
                              title="Edit User"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>
                            </button>
                            <button
                              className="btn-action btn-danger-outline"
                              onClick={() => handleDelete(entry.id)}
                              title="Delete User"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
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
                  </div>
                </div>

                {editForm.paymentStatus === "completed" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginTop: "10px" }}>
                    <div className="admin-form-group">
                      <label>Base Amount (₹)</label>
                      <input
                        type="text"
                        placeholder="e.g. 1.00"
                        value={editForm.customBaseAmount}
                        onChange={(e) => setEditForm(prev => ({ ...prev, customBaseAmount: e.target.value }))}
                      />
                    </div>
                    <div className="admin-form-group">
                      <label>Final Amount (₹)</label>
                      <input
                        type="text"
                        placeholder="e.g. 1.18"
                        value={editForm.customFinalAmount}
                        onChange={(e) => setEditForm(prev => ({ ...prev, customFinalAmount: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

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
