import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import {
  paymentService,
  PRICING,
  type PlanPeriod,
  type PaymentStatusResponse,
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
  const [paymentStatus, setPaymentStatus] = useState<
    PaymentStatusResponse["paymentStatus"] | null
  >(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const isUser = user?.role === "user";
  const shouldShowSuccess = isUser && paymentStatus === "Completed";
  const shouldShowFailed = isUser && paymentStatus === "Failed";
  const shouldShowPayment = !isUser || paymentStatus === "Pending";

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  useEffect(() => {
    if (!token || !isUser) {
      setPaymentStatus("Pending");
      setStatusLoading(false);
      return;
    }

    const fetchPaymentStatus = async () => {
      setStatusLoading(true);
      try {
        const data = await paymentService.getPaymentStatus();
        setPaymentStatus(data.paymentStatus);
      } catch {
        setPaymentStatus("Pending");
      } finally {
        setStatusLoading(false);
      }
    };

    fetchPaymentStatus();
  }, [isUser, token]);

  useEffect(() => {
    if (!shouldShowPayment) return;

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
  }, [shouldShowPayment, showToast]);

  const handlePayment = async () => {
    if (!user || !token || !shouldShowPayment) return;

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

            if (isUser) {
              const statusData = await paymentService.getPaymentStatus();
              setPaymentStatus(statusData.paymentStatus);
              if (statusData.paymentStatus === "Completed") {
                showToast(
                  "Payment successful. Admin will contact you soon.",
                  "success",
                );
              } else if (statusData.paymentStatus === "Failed") {
                showToast("Payment failed. Please try again.", "error");
              }
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
      const backendStatus = err?.response?.data?.paymentStatus as
        | "Pending"
        | "Completed"
        | "Failed"
        | undefined;

      if (backendStatus) {
        setPaymentStatus(backendStatus);
        if (backendStatus === "Completed") {
          showToast(
            "Payment successful. Admin will contact you soon.",
            "success",
          );
        } else if (backendStatus === "Failed") {
          showToast("Payment failed. Please try again.", "error");
        }
      } else {
        const message =
          err?.response?.data?.message ||
          err.message ||
          "Payment failed. Please try again.";
        setError(message);
        showToast(message, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const plans: PlanType[] = ["basic", "pro"];
  const periods: PlanPeriod[] = ["monthly", "6months", "1year"];

  if (statusLoading) {
    return (
      <div className="payment-page">
        <div className="payment-container payment-success-container">
          <div className="payment-header">
            <h1>Loading...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (shouldShowSuccess) {
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

  if (shouldShowFailed) {
    return (
      <div className="payment-page">
        <div className="payment-container payment-success-container">
          <div className="payment-header">
            <h1>Payment Failed</h1>
          </div>
          <div className="payment-error">Payment failed. Please try again.</div>
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
