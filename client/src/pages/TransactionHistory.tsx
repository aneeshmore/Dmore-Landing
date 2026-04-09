import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import "./TransactionHistory.css";

interface UserSummary {
  id: number;
  email: string;
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

  if (loading) {
    return <div className="admin-loading">Loading Transaction History...</div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-header-section">
        <div className="admin-header-main">
          <h1>Transaction History</h1>
          <p>View all payments and transaction logs per user</p>
        </div>
        <div className="admin-header-actions">
          <Link to="/admin-dashboard" className="back-btn">
             ← Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="admin-content">
        <div className="admin-card">
          <div className="admin-card-header">
            <h2>User Transaction Summary</h2>
          </div>
          <div className="admin-table-wrapper">
            <table className="admin-table transactions-main-table">
              <thead>
                <tr>
                  <th>User Email</th>
                  <th className="text-center">Active Plan</th>
                  <th className="text-center">Total Transactions</th>
                  <th className="text-right">Total Spent (₹)</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {summaries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center">No transactions found</td>
                  </tr>
                ) : (
                  summaries.map((user) => (
                    <React.Fragment key={user.id}>
                         <tr 
                        className={`expandable-row ${expandedRows[user.id] ? 'is-expanded' : ''}`}
                        onClick={() => toggleRow(user.id)}
                      >
                        <td>
                          <div className="user-info">
                            <span className="user-email">{user.email}</span>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className={`plan-badge ${user.planType}`}>
                            {user.planType?.toUpperCase() || "N/A"}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className="badge-count">{user.transactionCount}</span>
                        </td>
                        <td className="text-right font-mono">
                          ₹{Number(user.totalSpent || 0).toLocaleString()}
                        </td>
                        <td className="text-center">
                          <button className="expand-toggle">
                            {expandedRows[user.id] ? "Collapse ↑" : "View Details ↓"}
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
                                        <th>ID</th>
                                        <th>Plan Info</th>
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
                                                {(tx.planName || tx.planType).toUpperCase()}
                                              </span>
                                              <span className="period-badge">{tx.period.toUpperCase()}</span>
                                            </div>
                                          </td>
                                           <td className="price-details">
                                            <div className="price-stack">
                                              <div className="price-item">
                                                <span>Base:</span>
                                                <span>₹{tx.baseAmount}</span>
                                              </div>
                                              {Number(tx.discountAmount) > 0 && (
                                                <div className="price-item discount">
                                                  <span>Discount:</span>
                                                  <span>-₹{tx.discountAmount}</span>
                                                </div>
                                              )}
                                              <div className="price-item">
                                                <span>GST (18%):</span>
                                                <span>₹{tx.gstAmount}</span>
                                              </div>
                                              <div className="price-item total">
                                                <span>Final:</span>
                                                <span>₹{tx.finalAmount ?? 0}</span>
                                              </div>
                                            </div>
                                          </td>
                                          <td>
                                            {tx.couponUsed ? (
                                              <span className="coupon-tag">{tx.couponUsed}</span>
                                            ) : "-"}
                                          </td>
                                          <td className="date-cell">
                                            {new Date(tx.createdAt).toLocaleDateString()}
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
                                  <div className="no-details">No detailed records available for this user.</div>
                                )
                              ) : (
                                <div className="loading-details">Loading details...</div>
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
