import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import {
  paymentService,
  PRICING,
  type PlanPeriod,
} from "../services/paymentService";
import type { PlanType, SubscriptionDuration } from "../types";
import "../App.css";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Payment = () => {
  const { user, token } = useAuthContext();
  const navigate = useNavigate();

  const [selectedPlan, setSelectedPlan] = useState<PlanType>("basic");
  const [selectedPeriod, setSelectedPeriod] = useState<PlanPeriod>("monthly");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // 🔐 Redirect if not logged in
  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  // ✅ Load Razorpay SDK safely
  useEffect(() => {
    const loadRazorpay = () => {
      return new Promise<boolean>((resolve) => {
        if (window.Razorpay) {
          resolve(true);
          return;
        }

        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;

        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);

        document.body.appendChild(script);
      });
    };

    loadRazorpay().then((loaded) => {
      if (!loaded) {
        setError("Failed to load Razorpay SDK. Please refresh.");
        return;
      }
      setRazorpayLoaded(true);
    });
  }, []);

  // 💳 Handle Payment
  const handlePayment = async () => {
    if (!user || !token) return;

    if (!window.Razorpay) {
      setError("Razorpay SDK not loaded. Please refresh.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1️⃣ Create Order from backend
      const order = await paymentService.createOrder({
        planType: selectedPlan,
        period: selectedPeriod as SubscriptionDuration,
      });

      if (!order?.orderId) {
        throw new Error("Invalid order response from server");
      }

      const options = {
        key: order.keyId, // Must match backend key
        amount: order.amount, // MUST be in paise (e.g. ₹500 = 50000)
        currency: order.currency || "INR",
        name: "PaintOS",
        description: `${selectedPlan.toUpperCase()} - ${
          PRICING[selectedPlan][selectedPeriod].label
        }`,
        order_id: order.orderId,

        prefill: {
          name: user.name,
          email: user.email,
          contact: user.mobile || "",
        },

        theme: {
          color: "#4F46E5",
        },

        handler: async function (response: any) {
          try {
            await paymentService.verifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
            );

            navigate("/");
          } catch (err) {
            setError("Payment verification failed.");
          }
        },
      };

      const razorpay = new window.Razorpay(options);

      // ❌ Handle Payment Failure
      razorpay.on("payment.failed", function (response: any) {
        setError(
          response?.error?.description || "Payment failed. Please try again.",
        );
      });

      razorpay.open();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Payment failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const plans: PlanType[] = ["basic", "pro"];
  const periods: PlanPeriod[] = ["monthly", "quarterly", "6months", "1year"];

  return (
    <div className="payment-page">
      <div className="payment-container">
        <div className="payment-header">
          <h1>Choose Your Plan</h1>
          <p>Select a subscription plan</p>
        </div>

        <div className="payment-content">
          {/* LEFT SIDE */}
          <div className="plan-section">
            <div className="plan-types">
              {plans.map((plan) => (
                <button
                  key={plan}
                  className={`plan-btn ${
                    selectedPlan === plan ? "active" : ""
                  }`}
                  onClick={() => setSelectedPlan(plan)}
                >
                  {plan.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="period-options">
              {periods.map((period) => {
                const pricing = PRICING[selectedPlan][period];

                return (
                  <button
                    key={period}
                    className={`period-btn ${
                      selectedPeriod === period ? "active" : ""
                    }`}
                    onClick={() => setSelectedPeriod(period)}
                  >
                    <span>{pricing.label}</span>
                    <strong>₹{pricing.amount}</strong>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="payment-summary">
            <div className="summary-row">
              <span>Plan</span>
              <span>{selectedPlan.toUpperCase()}</span>
            </div>

            <div className="summary-row">
              <span>Duration</span>
              <span>{PRICING[selectedPlan][selectedPeriod].label}</span>
            </div>

            <div className="summary-row total">
              <span>Total</span>
              <span>₹{PRICING[selectedPlan][selectedPeriod].amount}</span>
            </div>

            {error && <div className="payment-error">{error}</div>}

            <button
              className="pay-btn"
              onClick={handlePayment}
              disabled={loading || !razorpayLoaded}
            >
              {loading
                ? "Processing..."
                : `Pay ₹${PRICING[selectedPlan][selectedPeriod].amount}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
