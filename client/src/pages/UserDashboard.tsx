import { useAuth } from "../hooks/useAuth";
import "./UserDashboard.css";

const UserDashboard = () => {
    const { user } = useAuth();

    return (
        <div className="user-dashboard">
            <div className="user-hero">
                <div className="user-hero-content">
                    <div className="user-badge">
                        <span className="user-badge-icon">👤</span>
                        My Dashboard
                    </div>
                    <h1>Welcome, {user?.name}</h1>
                    <p>Manage your subscription, account details and preferences.</p>
                </div>
            </div>

            <div className="user-content">
                <div className="user-grid">
                    {/* PLAN CARD */}
                    <div className="user-card info-card">
                        <div className="user-card-header">
                            <h2>Current Plan</h2>
                            <span className={`plan-badge ${user?.planType === 'pro' ? 'plan-pro' : 'plan-basic'}`}>
                                {user?.planType || 'Basic'}
                            </span>
                        </div>
                        <div className="card-body">
                            <div className="detail-row">
                                <span className="detail-label">Billing Period</span>
                                <span className="detail-value">{user?.subscriptionDuration || 'Monthly'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Status</span>
                                <span className={`status-pill ${user?.accountStatus === 'active' ? 'active' : 'pending'}`}>
                                    {user?.accountStatus || 'Pending'}
                                </span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Renewal Date</span>
                                <span className="detail-value">
                                    {user?.renewalDate
                                        ? new Date(user.renewalDate as string).toLocaleDateString()
                                        : 'Not scheduled'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* PROFILE CARD */}
                    <div className="user-card info-card">
                        <div className="user-card-header">
                            <h2>Company Profile</h2>
                        </div>
                        <div className="card-body">
                            <div className="detail-row">
                                <span className="detail-label">Company Name</span>
                                <span className="detail-value">{user?.companyName || '-'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Domain</span>
                                <span className="detail-value">{user?.domain || '-'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Company Address</span>
                                <span className="detail-value">{user?.companyAddress || '-'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Mobile</span>
                                <span className="detail-value">{user?.mobile || '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;
