import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import {
  paymentService,
  PRICING,
  type PlanPeriod,
} from "../services/paymentService";
import type { PlanType, SubscriptionDuration } from "../types";
import { useToast } from "../context/ToastContext";
import "../App.css";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Payment = () => {
  const { user, token } = useAuthContext();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [selectedPlan, setSelectedPlan] = useState<PlanType>("basic");
  const [selectedPeriod, setSelectedPeriod] = useState<PlanPeriod>("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const isUserPaymentCompleted = useMemo(() => {
    if (!user || user.role !== "user") return false;
    return paymentCompleted || user.accountStatus !== "pending_payment";
  }, [paymentCompleted, user]);

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  useEffect(() => {
    if (isUserPaymentCompleted) return;

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
        const message = "Failed to load Razorpay SDK. Please refresh.";
        setError(message);
        showToast(message, "error");
        return;
      }
      setRazorpayLoaded(true);
    });
  }, [isUserPaymentCompleted, showToast]);

  const handlePayment = async () => {
    if (!user || !token) return;

    if (!window.Razorpay) {
      setError("Razorpay SDK not loaded. Please refresh.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const order = await paymentService.createOrder({
        planType: selectedPlan,
        period: selectedPeriod as SubscriptionDuration,
      });

      if (!order?.orderId) {
        throw new Error("Invalid order response from server");
      }

      const options = {
        key: order.keyId,
        amount: order.amount,
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

            if (user.role !== "admin") {
              const message = "Payment successful. Admin will contact you soon.";
              setPaymentCompleted(true);
              showToast(message, "success");
              navigate("/payment", { replace: true });
            } else {
              showToast("Payment successful.", "success");
              navigate("/", { replace: true });
            }
          } catch {
            setError("Payment verification failed.");
            showToast("Payment verification failed.", "error");
          }
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", function (response: any) {
        const message =
          response?.error?.description || "Payment failed. Please try again.";
        setError(message);
        showToast(message, "error");
      });

      razorpay.open();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err.message ||
        "Payment failed. Please try again.";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const plans: PlanType[] = ["basic", "pro"];
  const periods: PlanPeriod[] = ["monthly", "6months", "1year"];

  if (isUserPaymentCompleted) {
    return (
      <div className="payment-page">
        <div className="payment-container payment-success-container">
          <div className="payment-header">
            <h1>Payment Successful</h1>
          </div>
          <div className="payment-success-message">
            Payment successful. Admin will contact you soon.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-page">
      <div className="payment-container">
        <div className="payment-header">
          <h1>Choose Your Plan</h1>
          <p>Select a subscription plan</p>
        </div>

        <div className="payment-content">
          <div className="plan-section">
            <div className="plan-types">
              {plans.map((plan) => (
                <button
                  key={plan}
                  className={`plan-btn ${selectedPlan === plan ? "active" : ""}`}
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
                    className={`period-btn ${selectedPeriod === period ? "active" : ""}`}
                    onClick={() => setSelectedPeriod(period)}
                  >
                    <span>{pricing.label}</span>
                    <strong>₹{pricing.amount}</strong>
                  </button>
                );
              })}
            </div>
          </div>

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
