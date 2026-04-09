const About = () => {
  const stats = [
    { number: "50+", label: "Paint Factories Using PaintOS" },
    { number: "2M+", label: "Orders Processed" },
    { number: "100K+", label: "Batches Optimized" },
    { number: "15M+", label: "Working Capital Saved" },
  ];

  return (
    <div
      className="content-page"
      style={{
        background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
        minHeight: "100vh",
      }}
    >
      <div
        className="page-hero"
        style={{
          background:
            "linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(245, 158, 11, 0.12), rgba(255, 107, 107, 0.1), rgba(0, 212, 255, 0.08))",
          border: "2px solid #7C3AED",
          boxShadow: "0 12px 32px rgba(124, 58, 237, 0.2)",
        }}
      >
        <div className="hero-content">
          <div
            className="badge"
            style={{
              background: "linear-gradient(135deg, #7C3AED, #F59E0B)",
              color: "#fff",
            }}
          >
            About PaintOS
          </div>
          <h1
            style={{
              background: "linear-gradient(135deg, #7C3AED, #F59E0B)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Transforming Paint Manufacturing with Smart Technology
          </h1>
          <p className="lede" style={{ color: "#374151" }}>
            Built by paint industry experts who understand the challenges of
            traditional manufacturing and logistics.
          </p>
        </div>
      </div>

      <section
        className="stats-section"
        style={{
          background: "linear-gradient(135deg, #DBEAFE 0%, #F0F4FF 100%)",
          border: "3px solid #2563EB",
          boxShadow: "0 16px 48px rgba(37, 99, 235, 0.25)",
        }}
      >
        <div className="stats-container">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="stat-item"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))",
                border: "2px solid #10B981",
                boxShadow: "0 8px 24px rgba(16, 185, 129, 0.2)",
              }}
            >
              <div
                className="stat-number"
                style={{
                  color: "#10B981",
                  textShadow: "0 2px 4px rgba(16, 185, 129, 0.3)",
                }}
              >
                {stat.number}
              </div>
              <div className="stat-label" style={{ color: "#059669" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="panel glass"
        style={{
          background:
            "linear-gradient(135deg, rgba(250, 251, 252, 0.9), rgba(255,255,255,0.8))",
          border: "2px solid #EC4899",
          boxShadow: "0 12px 36px rgba(236, 72, 153, 0.15)",
        }}
      >
        <div className="panel-header">
          <h2 style={{ color: "#EC4899" }}>🎯 Our Mission</h2>
          <p style={{ color: "#BE185D" }}>
            Empowering paint manufacturers with intelligent systems
          </p>
        </div>
        <div className="mission-content">
          <div className="mission-grid">
            <div
              className="mission-item"
              style={{
                background: "linear-gradient(135deg, #FCE7F3, #FDF2F8)",
                border: "2px solid #EC4899",
              }}
            >
              <div className="mission-icon">🏭</div>
              <h3 style={{ color: "#BE185D" }}>Industry-First Approach</h3>
              <p style={{ color: "#831843" }}>
                We're not another generic ERP. We're built specifically for
                paint manufacturers' unique challenges.
              </p>
            </div>
            <div
              className="mission-item"
              style={{
                background: "linear-gradient(135deg, #DBEAFE, #EFF6FF)",
                border: "2px solid #3B82F6",
              }}
            >
              <div className="mission-icon">⚡</div>
              <h3 style={{ color: "#1E40AF" }}>End-to-End Solutions</h3>
              <p style={{ color: "#1E3A8A" }}>
                From order to dispatch, we cover every aspect of your paint
                manufacturing business.
              </p>
            </div>
            <div
              className="mission-item"
              style={{
                background: "linear-gradient(135deg, #D1FAE5, #ECFDF5)",
                border: "2px solid #10B981",
              }}
            >
              <div className="mission-icon">📈</div>
              <h3 style={{ color: "#047857" }}>Growth Focused</h3>
              <p style={{ color: "#065F46" }}>
                We succeed when your business grows. Your success is our
                success.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="panel glass"
        style={{
          background:
            "linear-gradient(135deg, rgba(250, 251, 252, 0.9), rgba(255,255,255,0.8))",
          border: "2px solid #F59E0B",
          boxShadow: "0 12px 36px rgba(245, 158, 11, 0.15)",
        }}
      >
        <div className="panel-header">
          <h2 style={{ color: "#F59E0B" }}>💡 Why We Started</h2>
          <p style={{ color: "#D97706" }}>
            The challenges paint manufacturers face daily
          </p>
        </div>
        <div className="challenges-grid">
          <div
            className="challenge-card"
            style={{
              background: "linear-gradient(135deg, #FEE2E2, #FEF2F2)",
              border: "2px solid #EF4444",
            }}
          >
            <div className="challenge-emoji">📞</div>
            <h3 style={{ color: "#DC2626" }}>Order Chaos</h3>
            <p style={{ color: "#B91C1C" }}>
              Orders from phone, WhatsApp, email, and direct channels creating
              confusion and delays.
            </p>
          </div>
          <div
            className="challenge-card"
            style={{
              background: "linear-gradient(135deg, #FEF3C7, #FFFBEB)",
              border: "2px solid #F59E0B",
            }}
          >
            <div className="challenge-emoji">🧮</div>
            <h3 style={{ color: "#D97706" }}>Complex Planning</h3>
            <p style={{ color: "#92400E" }}>
              Manual batch calculations and production planning prone to errors
              and inefficiency.
            </p>
          </div>
          <div
            className="challenge-card"
            style={{
              background: "linear-gradient(135deg, #E0E7FF, #EEF2FF)",
              border: "2px solid #6366F1",
            }}
          >
            <div className="challenge-emoji">🧪</div>
            <h3 style={{ color: "#4F46E5" }}>Quality Control</h3>
            <p style={{ color: "#3730A3" }}>
              Tracking density, viscosity, and technical values manually across
              batches.
            </p>
          </div>
          <div
            className="challenge-card"
            style={{
              background: "linear-gradient(135deg, #F3E8FF, #FAF5FF)",
              border: "2px solid #8B5CF6",
            }}
          >
            <div className="challenge-emoji">📦</div>
            <h3 style={{ color: "#7C3AED" }}>Inventory Issues</h3>
            <p style={{ color: "#581C87" }}>
              Complex raw material and finished goods inventory management
              causing bottlenecks.
            </p>
          </div>
          <div
            className="challenge-card"
            style={{
              background: "linear-gradient(135deg, #ECFDF5, #F0FDF4)",
              border: "2px solid #10B981",
            }}
          >
            <div className="challenge-emoji">🚚</div>
            <h3 style={{ color: "#059669" }}>Logistics Losses</h3>
            <p style={{ color: "#047857" }}>
              Vehicle capacity underutilization and inefficient dispatch
              planning.
            </p>
          </div>
          <div
            className="challenge-card"
            style={{
              background: "linear-gradient(135deg, #FFF7ED, #FFFBF7)",
              border: "2px solid #FB923C",
            }}
          >
            <div className="challenge-emoji">💰</div>
            <h3 style={{ color: "#EA580C" }}>Cash Flow Issues</h3>
            <p style={{ color: "#C2410C" }}>
              Poor payment tracking and working capital management affecting
              growth.
            </p>
          </div>
        </div>
      </section>

      <section
        className="panel glass"
        style={{
          background:
            "linear-gradient(135deg, rgba(250, 251, 252, 0.9), rgba(255,255,255,0.8))",
          border: "2px solid #06B6D4",
          boxShadow: "0 12px 36px rgba(6, 182, 212, 0.15)",
        }}
      >
        <div className="panel-header">
          <h2 style={{ color: "#06B6D4" }}>🌟 Our Core Values</h2>
          <p style={{ color: "#0891B2" }}>What drives us every single day</p>
        </div>
        <div className="values-grid">
          <div
            className="value-card"
            style={{
              background: "linear-gradient(135deg, #DBEAFE, #EFF6FF)",
              border: "2px solid #3B82F6",
            }}
          >
            <div className="value-icon">🎯</div>
            <h3 style={{ color: "#1E40AF" }}>Focus</h3>
            <p style={{ color: "#1E3A8A" }}>
              We stay laser-focused on paint manufacturing. That's where our
              expertise lies and where we create the most value.
            </p>
          </div>
          <div
            className="value-card"
            style={{
              background: "linear-gradient(135deg, #D1FAE5, #ECFDF5)",
              border: "2px solid #10B981",
            }}
          >
            <div className="value-icon">🚀</div>
            <h3 style={{ color: "#047857" }}>Innovation</h3>
            <p style={{ color: "#065F46" }}>
              Constantly improving based on real feedback from paint factory
              owners and managers in the field.
            </p>
          </div>
          <div
            className="value-card"
            style={{
              background: "linear-gradient(135deg, #FCE7F3, #FDF2F8)",
              border: "2px solid #EC4899",
            }}
          >
            <div className="value-icon">🤝</div>
            <h3 style={{ color: "#BE185D" }}>Partnership</h3>
            <p style={{ color: "#831843" }}>
              We're not just vendors. We're partners in your growth journey.
              Your success is genuinely our success.
            </p>
          </div>
          <div
            className="value-card"
            style={{
              background: "linear-gradient(135deg, #FEF3C7, #FFFBEB)",
              border: "2px solid #F59E0B",
            }}
          >
            <div className="value-icon">🛡️</div>
            <h3 style={{ color: "#D97706" }}>Security</h3>
            <p style={{ color: "#92400E" }}>
              Your sensitive business data gets military-grade protection. We
              take security as our top responsibility.
            </p>
          </div>
        </div>
      </section>

      <section
        className="panel glass"
        style={{
          background:
            "linear-gradient(135deg, rgba(250, 251, 252, 0.9), rgba(255,255,255,0.8))",
          border: "2px solid #FB923C",
          boxShadow: "0 12px 36px rgba(251, 146, 60, 0.15)",
        }}
      >
        <div className="panel-header">
          <h2 style={{ color: "#FB923C" }}>📚 Our Story</h2>
          <p style={{ color: "#EA580C" }}>How it all began</p>
        </div>
        <div className="story-content">
          <div
            className="story-item"
            style={{
              background: "linear-gradient(135deg, #FEF3C7, #FFFBEB)",
              border: "2px solid #F59E0B",
            }}
          >
            <div
              className="story-number"
              style={{
                background: "linear-gradient(135deg, #F59E0B, #D97706)",
              }}
            >
              01
            </div>
            <div className="story-text">
              <h3 style={{ color: "#92400E" }}>The Problem</h3>
              <p style={{ color: "#78350F" }}>
                Our founder spent 15 years in paint manufacturing and saw the
                same problems repeated across every factory: chaotic order
                management, manual processes, quality inconsistencies, and poor
                visibility.
              </p>
            </div>
          </div>
          <div
            className="story-item"
            style={{
              background: "linear-gradient(135deg, #E0E7FF, #EEF2FF)",
              border: "2px solid #6366F1",
            }}
          >
            <div
              className="story-number"
              style={{
                background: "linear-gradient(135deg, #6366F1, #4F46E5)",
              }}
            >
              02
            </div>
            <div className="story-text">
              <h3 style={{ color: "#3730A3" }}>The Realization</h3>
              <p style={{ color: "#312E81" }}>
                Existing ERP systems were built for generic manufacturing. They
                didn't understand the unique complexities of paint production:
                batch calculations, formulation management, custom quality
                parameters, and logistics optimization.
              </p>
            </div>
          </div>
          <div
            className="story-item"
            style={{
              background: "linear-gradient(135deg, #D1FAE5, #ECFDF5)",
              border: "2px solid #10B981",
            }}
          >
            <div
              className="story-number"
              style={{
                background: "linear-gradient(135deg, #10B981, #059669)",
              }}
            >
              03
            </div>
            <div className="story-text">
              <h3 style={{ color: "#065F46" }}>The Solution</h3>
              <p style={{ color: "#064E3B" }}>
                We assembled a team of paint industry experts and experienced
                engineers to build PaintOS - a system designed from the ground
                up for paint manufacturers, addressing every challenge paint
                factories face.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="panel glass highlight-section"
        style={{
          background: "linear-gradient(135deg, #DBEAFE 0%, #F0F4FF 100%)",
          border: "3px solid #2563EB",
          boxShadow: "0 16px 48px rgba(37, 99, 235, 0.25)",
        }}
      >
        <div className="highlight-grid">
          <div
            className="highlight-item"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))",
              border: "2px solid #10B981",
            }}
          >
            <h3 style={{ color: "#047857" }}>For Paint Factory Owners</h3>
            <p style={{ color: "#065F46" }}>
              Transform your business with intelligent systems that reduce costs
              and improve efficiency across all departments.
            </p>
            <a
              href="/register"
              className="link-arrow"
              style={{ color: "#10B981" }}
            >
              Explore for Owners →
            </a>
          </div>
          <div
            className="highlight-item"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))",
              border: "2px solid #3B82F6",
            }}
          >
            <h3 style={{ color: "#1E40AF" }}>For Operations Team</h3>
            <p style={{ color: "#1E3A8A" }}>
              Get complete visibility into production, inventory, and dispatch
              with real-time dashboards and analytics.
            </p>
            <a
              href="/register"
              className="link-arrow"
              style={{ color: "#3B82F6" }}
            >
              See Operations Tools →
            </a>
          </div>
          <div
            className="highlight-item"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))",
              border: "2px solid #EC4899",
            }}
          >
            <h3 style={{ color: "#BE185D" }}>For Finance Team</h3>
            <p style={{ color: "#831843" }}>
              Track payments, manage cash flow, and get insights into
              profitability with integrated billing and analytics.
            </p>
            <a
              href="/register"
              className="link-arrow"
              style={{ color: "#EC4899" }}
            >
              View Finance Features →
            </a>
          </div>
        </div>
      </section>

      <section
        className="panel cta-section"
        style={{
          background: "linear-gradient(135deg, #FCE7F3 0%, #FDF2F8 100%)",
          border: "3px solid #EC4899",
          boxShadow: "0 16px 48px rgba(236, 72, 153, 0.25)",
        }}
      >
        <div className="cta">
          <div>
            <h2 style={{ color: "#BE185D" }}>
              Ready to Transform Your Paint Factory?
            </h2>
            <p style={{ color: "#831843" }}>
              Join 50+ paint manufacturers already running smarter operations
              with PaintOS. Start your free 7-day trial today.
            </p>
          </div>
          <div className="cta-actions">
            <a
              href="/register"
              className="btn primary"
              style={{
                background: "linear-gradient(135deg, #EC4899, #F97316)",
                boxShadow: "0 10px 30px rgba(236, 72, 153, 0.3)",
              }}
            >
              Start Free Trial
            </a>
            <span className="hint" style={{ color: "#BE185D" }}>
              No credit card required. 7-day free trial.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
