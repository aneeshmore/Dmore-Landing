import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const problems = [
  {
    icon: "📞",
    title: "Order Chaos",
    description: "Orders coming from phone calls, WhatsApp, Excel & registers",
  },
  {
    icon: "⏱️",
    title: "Manual Planning",
    description: "Manual planning, missed follow-ups, wrong batch calculations",
  },
  {
    icon: "🔄",
    title: "Production Confusion",
    description:
      "Production confusion, inventory losses, payment delays & dispatch inefficiency",
  },
];

const features = [
  {
    icon: "🚀",
    title: "One-Click Order Collaboration",
    description:
      "Combine ALL customer & dealer orders at one click. Automatic product-wise & quantity-wise consolidation. No duplicates, no missed orders.",
    highlight: true,
  },
  {
    icon: "🧠",
    title: "End-to-End Business Control",
    description:
      "CRM → Quotation → Order → Production → Inventory → Dispatch → Invoice → Payment. All departments on one live system.",
  },
  {
    icon: "📞",
    title: "Strong CRM System",
    description:
      "Every customer conversation recorded. Automatic follow-up reminders. Full customer history at one click.",
  },
  {
    icon: "🧾",
    title: "Professional Quotation Management",
    description:
      "One-click PDF quotation. Custom payment & delivery terms. Rate approval workflow from accounts department.",
  },
  {
    icon: "📊",
    title: "Real-Time Order Tracking",
    description:
      "Live order status: Accepted → Accounts Cleared → Production → Waiting for Dispatch → Dispatched",
  },
  {
    icon: "🏭",
    title: "Automatic Production Planning",
    description:
      "Orders automatically sorted product-wise. Combined order chart generated instantly. Clear production targets.",
  },
  {
    icon: "🧪",
    title: "Error-Free Batch Chart Generation",
    description:
      "One-click batch chart for required quantity. Accurate raw material calculation. Perfect batch scaling.",
  },
  {
    icon: "🎯",
    title: "Built-In Quality Control",
    description:
      "Density & viscosity recorded for every batch. Compared with reference values. Deviations identified immediately.",
  },
  {
    icon: "🔬",
    title: "Advanced Formulation Intelligence",
    description:
      "Master formulation stored for every product. Instant technical values: Density, Solids, SVR, PVC, CPVC.",
  },
  {
    icon: "⚙️",
    title: "Formulation Optimization",
    description:
      "Digital formulation optimization. Reduced wastage & trial batches. Better margins with controlled cost.",
  },
  {
    icon: "📱",
    title: "Cloud & Mobile Access",
    description:
      "Manage factory from anywhere. Approve orders, monitor production & update formulations remotely.",
  },
  {
    icon: "📦",
    title: "Complete Inventory Transparency",
    description:
      "Raw material auto-deducted from BOM. Finished goods stock created automatically. Full usage history.",
  },
  {
    icon: "🚨",
    title: "Low Stock Alerts",
    description:
      "Minimum stock levels defined. Automatic alerts before stock shortage. Real-time low stock reports.",
  },
  {
    icon: "🛒",
    title: "Smart Purchase Planning",
    description:
      "Consumption-based purchase planning. Avoid panic buying & excess stock. Save working capital.",
  },
  {
    icon: "🚚",
    title: "Smart Dispatch & Load Optimization",
    description:
      "Vehicle load capacity recorded. Orders combined to fully utilize tempo capacity. Lower transport cost.",
  },
  {
    icon: "🧾",
    title: "Automatic Invoicing & Billing",
    description:
      "Invoice auto-generated after dispatch. Systematic bill numbering. Complete billing history.",
  },
  {
    icon: "💳",
    title: "Payments Dashboard",
    description:
      "Customer-wise payment tracking. Outstanding & overdue visibility. Know who has paid and who has not.",
  },
  {
    icon: "📈",
    title: "Sales Intelligence",
    description:
      "Sales person-wise performance tracking. Dealer & customer purchase analysis. Identify customers who stopped buying.",
  },
];

const stats = [
  { label: "From Lead to Dispatch", value: "Smart System" },
  { label: "Built", value: "For Paint Manufacturers" },
  { label: "Not", value: "Generic ERP" },
];

const pricingPlans = [
  {
    name: "Basic",
    description: "Perfect for small paint factories getting started",
    highlight: false,
    pricingOptions: [
      { label: "Monthly", period: "/month", price: "Rs. 1,499" },
      { label: "6 Months", period: "/6month", price: "Rs. 7,999" },
      { label: "1 Year", period: "/1Year", price: "Rs. 14,999" },
    ],
    features: [
      "Single User only",
      "Quotation Management",
      "Invoice",
      "Batch Chart Generation",
      "1K formulation master",
      "2K formulation master",
      "Order Tracing",
      "Inventory/Stock control",
      "Outstanding & Payment Report",
      "CRM Management",
    ],
  },
  {
    name: "Professional",
    description: "For growing paint manufacturers wanting full control",
    highlight: true,
    pricingOptions: [
      { label: "Monthly", period: "/month", price: "Rs. 4,999" },
      { label: "6 Months", period: "/6month", price: "Rs. 26,999" },
      { label: "1 Year", period: "/1Year", price: "Rs. 49,999" },
    ],
    features: [
      "Everything in Basic +",
      "Up to 10 users",
      "Dealer Login",
      "Accounts Payment Approvals ",
      "Daily Consumption Report",
      "Advanced Reports",
      "Multi User Login ",
      "Role Based Access",
      "Dispatch Management",
    ],
  },
];

const Landing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuthContext();
  const { showToast } = useToast();
  const [selectedPricingPlan, setSelectedPricingPlan] = useState<
    "Basic" | "Professional"
  >("Basic");

  // Handle Buy Now button click - check auth status and redirect appropriately
  const handleBuyNow = (planName: string, periodLabel: string) => {
    const periodMap: Record<string, string> = {
      "/month": "monthly",
      "/6month": "6months",
      "/1Year": "1year",
    };

    const period = periodMap[periodLabel];
    const planMap: Record<string, string> = {
      basic: "basic",
      professional: "pro",
      pro: "pro",
    };
    const planType = planMap[planName.toLowerCase()];

    if (!period || !planType) {
      console.error("Invalid period selected");
      return;
    }

    if (!token || !user) {
      navigate("/register");
      return;
    }

    if (user.accountStatus === "pending_payment") {
      navigate("/payment", {
        state: { planType, period },
      });
      return;
    }

    if (user.accountStatus === "pending_approval") {
      showToast("Payment successful. Admin will contact you soon.", "info");
      return;
    }

    if (user.accountStatus === "active") {
      navigate("/admin-dashboard");
      return;
    }
  };

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (!section) return false;

    section.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `/#${sectionId}`);
    return true;
  };

  useEffect(() => {
    const sectionId = location.hash.replace("#", "");
    if (!sectionId) return;

    let attempts = 0;
    const maxAttempts = 12;

    const tryScroll = () => {
      const didScroll = scrollToSection(sectionId);
      if (didScroll || attempts >= maxAttempts) return;
      attempts += 1;
      window.setTimeout(tryScroll, 60);
    };

    tryScroll();
  }, [location.hash]);

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-content">
          <div className="badge">🚀 PaintOS</div>
          <h1>Smart ERP For Paint Manufacturers</h1>
          <p className="lede">
            From Lead to Dispatch — One Smart System. Upgrade your paint factory
            into a professionally managed, intelligent manufacturing unit.
          </p>
          <div className="hero-actions">
            <Link className="btn primary" to="/register">
              Start Your Smart Factory
            </Link>
            <Link className="btn ghost" to="/login">
              Already using PaintOS?
            </Link>
          </div>
          <div className="hero-highlight">
            <p>
              CRM • Production Planning • Inventory • Dispatch • Invoicing •
              Payments
            </p>
          </div>
        </div>
        {/* <div className="hero-image">
          <img src={heroImage} alt="Smart Paint Factory ERP System" />
        </div> */}
      </section>

      <section id="problems" className="panel glass">
        <div className="panel-header">
          <h2>🔥 Biggest Problems in Paint Factories Today</h2>
          <p>These challenges are costing you time, money, and growth.</p>
        </div>
        <div className="feature-grid">
          {problems.map((problem) => (
            <div key={problem.title} className="feature-card problem-card">
              <div className="card-icon">{problem.icon}</div>
              <h3>{problem.title}</h3>
              <p>{problem.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="panel glass">
        <div className="panel-header">
          <h2>✅ The Smart Solution — Designed Only For Paint Manufacturers</h2>
          <p>
            Complete end-to-end control of your paint manufacturing business.
          </p>
        </div>
        <div className="feature-grid-large">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`feature-card ${feature.highlight ? "highlight-card" : ""}`}
            >
              <div className="card-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
        <div className="stats">
          {stats.map((stat) => (
            <div key={stat.label} className="stat">
              <p className="stat-label">{stat.label}</p>
              <p className="stat-value">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel cta-section">
        {/* <div className="cta-image">
          <img src={heroImage} alt="Get Started with PaintOS" />
        </div> */}
        <div className="cta">
          <div>
            <p className="badge subtle">Stop Managing Chaos</p>
            <h2>Start Running a Smart Paint Factory</h2>
            <p>
              Less stress for owner. Fewer production mistakes. Better quality
              consistency. Lower material & logistics losses. Better cash-flow
              control. Strong foundation for growth.
            </p>
          </div>
          <div className="cta-actions">
            <Link className="btn primary" to="/register">
              Launch Your Smart Factory Today
            </Link>
            <span className="hint">
              No credit card required. 7-day free trial.
            </span>
          </div>
        </div>
      </section>

      <section id="pricing" className="panel pricing-section">
        <div className="panel-header">
          <h2>💰 Simple, Transparent Pricing</h2>
          <p>Choose the plan that fits your factory's needs.</p>
        </div>

        <div>
          <span>Basic</span>
          <button
            type="button"
            role="switch"
            aria-checked={selectedPricingPlan === "Professional"}
            aria-label="Toggle between Basic and Professional plans"
            onClick={() =>
              setSelectedPricingPlan((current) =>
                current === "Basic" ? "Professional" : "Basic",
              )
            }
            style={{
              width: "52px",
              height: "28px",
              borderRadius: "999px",
              border: "1px solid #9ca3af",
              background:
                selectedPricingPlan === "Professional" ? "#2563eb" : "#d1d5db",
              position: "relative",
              cursor: "pointer",
              verticalAlign: "middle",
              margin: "0 0.5rem",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: "2px",
                left: selectedPricingPlan === "Professional" ? "26px" : "2px",
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                background: "#ffffff",
                transition: "left 0.2s ease",
              }}
            />
          </button>
          <span>Professional</span>
        </div>

        {pricingPlans
          .filter((plan) => plan.name === selectedPricingPlan)
          .map((plan) => (
            <div key={plan.name}>
              <div className="pricing-grid pricing-grid-compact">
                {plan.pricingOptions.map((option) => (
                  <div
                    key={`${plan.name}-${option.period}`}
                    className={`pricing-card pricing-card-compact ${
                      plan.highlight ? "pricing-highlight" : ""
                    }`}
                  >
                    {plan.highlight && (
                      <div className="pricing-badge">Most Popular</div>
                    )}
                    <div className="pricing-header">
                      <h3>{plan.name}</h3>
                    </div>

                    <div className="pricing-price">
                      <span className="price-amount">{option.price}</span>
                      <span className="price-period">{option.period}</span>
                    </div>

                    <button
                      className={`btn ${plan.highlight ? "primary" : "ghost"}`}
                      onClick={() => handleBuyNow(plan.name, option.period)}
                      style={{
                        width: "100%",
                        textAlign: "center",
                        marginTop: "2.5rem",
                      }}
                    >
                      Buy Now
                    </button>
                  </div>
                ))}
              </div>

              <div className="pricing-features pricing-included-shared">
                <p className="features-title">What's Included:</p>
                <ul className="features-list">
                  {plan.features.map((feature) => (
                    <li key={`${plan.name}-${feature}`}>
                      <span className="checkmark">{"\u2713"}</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
      </section>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>PaintOS</h4>
            <p>
              Smart ERP for paint manufacturers. From lead to dispatch in one
              intelligent system.
            </p>
          </div>
          <div className="footer-section">
            <h4>Product</h4>
            <ul>
              <li>
                <a
                  href="#features"
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToSection("features");
                  }}
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToSection("pricing");
                  }}
                >
                  Pricing
                </a>
              </li>
              <li>
                <a href="/">Security</a>
              </li>
              <li>
                <a href="/">Updates</a>
              </li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Company</h4>
            <ul>
              <li>
                <Link to="/about">About</Link>
              </li>
              <li>
                <a href="/">Blog</a>
              </li>
              <li>
                <Link to="/careers">Careers</Link>
              </li>
              <li>
                <a href="/">Contact</a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
