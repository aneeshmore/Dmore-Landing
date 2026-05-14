import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import "./TransactionHistory.css";

interface UserSummary {
  id: number;
  email: string;
  name?: string;
  companyName?: string;
  mobile?: string;
  planType: string;
  transactionCount: number;
  totalSpent: string;
}

interface TransactionDetails {
  id: number;
  planType: string;
  planName?: string; // Add planName
  period: string;
  baseAmount: string;
  discountAmount: string;
  gstAmount: string;
  finalAmount: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  couponUsed: string | null;
  status: string;
  createdAt: string;
}

const TransactionHistory: React.FC = () => {
  const [summaries, setSummaries] = useState<UserSummary[]>([]);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [userDetails, setUserDetails] = useState<Record<number, TransactionDetails[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { showToast } = useToast();

  const fetchSummaries = async () => {
    try {
      const { data } = await api.get("admin/transaction-summary");
      setSummaries(data);
    } catch (err) {
      showToast("Failed to fetch transaction summaries", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTransactions = async (userId: number) => {
    try {
      const { data } = await api.get(`admin/transactions/${userId}`);
      console.log("Transactions for user", userId, ":", data); // DEBUG LOG
      setUserDetails(prev => ({ ...prev, [userId]: data }));
    } catch (err) {
      showToast("Failed to fetch transaction details", "error");
    }
  };

  const toggleRow = (userId: number) => {
    const isExpanding = !expandedRows[userId];
    setExpandedRows(prev => ({ ...prev, [userId]: isExpanding }));
    
    if (isExpanding && !userDetails[userId]) {
      fetchUserTransactions(userId);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, []);

  const filteredSummaries = summaries.filter((user) => {
    const searchLower = searchTerm.toLowerCase().trim();
    if (!searchLower) return true;

    return (
      user.email.toLowerCase().includes(searchLower) ||
      (user.name?.toLowerCase().includes(searchLower)) ||
      (user.companyName?.toLowerCase().includes(searchLower)) ||
      (user.mobile?.toLowerCase().includes(searchLower)) ||
      (user.planType?.toLowerCase().includes(searchLower))
    );
  });

  if (loading) {
    return <div className="admin-loading">Loading Transaction History...</div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-header-section">
        <div className="admin-header-main">
          <h1>Transaction History</h1>
          <p>Financial logs and detailed payment audit trails per user</p>
        </div>
        <div className="admin-header-actions">
          <Link to="/admin-dashboard" className="back-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
             Dashboard
          </Link>
        </div>
      </div>

      <div className="admin-content">
        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input
              type="text"
              className="transaction-search-input"
              placeholder="Search by name, email, company, or plan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm("")}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            )}
          </div>
          <div className="search-results-count">
            {searchTerm ? `Found ${filteredSummaries.length} results` : `Total ${summaries.length} users`}
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <h2>User Transaction Summary</h2>
          </div>
          <div className="admin-table-wrapper">
            <table className="admin-table transactions-main-table">
              <thead>
                <tr>
                  <th>User Details</th>
                  <th className="text-center">Active Plan</th>
                  <th className="text-center">Payments</th>
                  <th className="text-right">Total Contributed</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center" style={{ padding: '80px 24px' }}>
                      <div className="empty-state">
                        <div className="empty-state-icon">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </div>
                        <h3 style={{ marginTop: '16px', color: 'var(--text-main)' }}>No matching results</h3>
                        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
                          We couldn't find any transactions for "{searchTerm}"
                        </p>
                        <button className="btn-secondary" onClick={() => setSearchTerm("")} style={{ marginTop: '20px' }}>
                          Clear Search
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSummaries.map((user) => (
                    <React.Fragment key={user.id}>
                      <tr 
                        className={`expandable-row ${expandedRows[user.id] ? 'is-expanded' : ''}`}
                        onClick={() => toggleRow(user.id)}
                      >
                        <td>
                          <div className="user-info">
                            <div className="user-avatar">
                              {(user.name || user.email).substring(0, 2).toUpperCase()}
                            </div>
                            <div className="user-meta">
                              <span className="user-email">{user.email}</span>
                              {(user.name || user.companyName) && (
                                <span className="user-subtext">
                                  {user.name} {user.companyName ? `• ${user.companyName}` : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className={`plan-badge ${user.planType}`}>
                            {user.planType || "N/A"}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className="badge-count">{user.transactionCount}</span>
                        </td>
                        <td className="text-right font-mono font-bold" style={{ color: 'var(--text-main)' }}>
                          ₹{Number(user.totalSpent || 0).toLocaleString()}
                        </td>
                        <td className="text-center">
                          <button className="expand-toggle">
                            {expandedRows[user.id] ? "Close" : "View"}
                          </button>
                        </td>
                      </tr>
                      {expandedRows[user.id] && (
                        <tr className="details-row">
                          <td colSpan={5}>
                            <div className="details-container">
                              {userDetails[user.id] ? (
                                userDetails[user.id].length > 0 ? (
                                  <table className="nested-details-table">
                                    <thead>
                                      <tr>
                                        <th>Tx ID</th>
                                        <th>Plan & Duration</th>
                                        <th>Price Breakdown</th>
                                        <th>Coupon</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {userDetails[user.id].map((tx) => (
                                        <tr key={tx.id}>
                                          <td className="tx-id">#{tx.id}</td>
                                          <td>
                                            <div className="plan-tags">
                                              <span className={`plan-badge ${tx.planType}`}>
                                                {tx.planName || tx.planType}
                                              </span>
                                              <span className="period-badge">{tx.period}</span>
                                            </div>
                                          </td>
                                          <td className="price-details">
                                            <div className="price-stack">
                                              <div className="price-item">
                                                <span>Base:</span>
                                                <span>₹{Number(tx.baseAmount).toLocaleString()}</span>
                                              </div>
                                              {Number(tx.discountAmount) > 0 && (
                                                <div className="price-item" style={{ color: 'var(--danger)' }}>
                                                  <span>Discount:</span>
                                                  <span>-₹{Number(tx.discountAmount).toLocaleString()}</span>
                                                </div>
                                              )}
                                              <div className="price-item">
                                                <span>GST (18%):</span>
                                                <span>₹{Number(tx.gstAmount).toLocaleString()}</span>
                                              </div>
                                              <div className="price-item total">
                                                <span>Total Paid:</span>
                                                <span>₹{Number(tx.finalAmount || 0).toLocaleString()}</span>
                                              </div>
                                            </div>
                                          </td>
                                          <td>
                                            {tx.couponUsed ? (
                                              <span className="coupon-tag">{tx.couponUsed}</span>
                                            ) : (
                                              <span style={{ color: '#cbd5e1' }}>—</span>
                                            )}
                                          </td>
                                          <td className="date-cell">
                                            {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                                              day: '2-digit',
                                              month: 'short',
                                              year: 'numeric'
                                            })}
                                          </td>
                                          <td>
                                            <span className={`status-badge ${tx.status.toLowerCase()}`}>
                                              {tx.status}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <div className="no-details">No detailed records found.</div>
                                )
                              ) : (
                                <div className="loading-details">
                                  <div className="spinner-small"></div>
                                  Fetching payment logs...
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionHistory;
