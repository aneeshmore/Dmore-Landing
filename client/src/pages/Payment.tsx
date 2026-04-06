import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { api } from "../api/client";
import {
  paymentService,
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
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [pricing, setPricing] = useState<any>(null);

  const COUPON_CODE = "coloursociety";
  const COUPON_DISCOUNT = 2000;
  const GST_RATE = 0.18;

  const isUser = user?.role === "user";
  const shouldShowSuccess = isUser && paymentStatus === "Completed";
  const shouldShowFailed = isUser && paymentStatus === "Failed";
  const shouldShowPayment = !isUser || paymentStatus === "Pending";
  const isCouponEligiblePlan = selectedPeriod === "1year";
  
  const baseAmount = pricing?.[selectedPlan]?.[selectedPeriod] || 0;
  const appliedDiscount =
    couponApplied && isCouponEligiblePlan ? COUPON_DISCOUNT : 0;
  const discountedAmount = Math.max(baseAmount - appliedDiscount, 0);
  const gstAmount = Number((discountedAmount * GST_RATE).toFixed(2));
  const finalPayable = Number((discountedAmount + gstAmount).toFixed(2));

  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

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
    const fetchPricing = async () => {
      try {
        const { data } = await api.get("pricing");
        setPricing(data);
      } catch (err) {
        showToast("Could not load latest pricing.", "error");
      }
    };
    fetchPricing();
  }, [showToast]);

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

  useEffect(() => {
    if (!isCouponEligiblePlan && couponApplied) {
      setCouponApplied(false);
    }
  }, [isCouponEligiblePlan, couponApplied]);

  const handleApplyCoupon = () => {
    const normalizedCode = couponCode.trim().toLowerCase();

    if (isCouponEligiblePlan && normalizedCode === COUPON_CODE) {
      setCouponApplied(true);
      showToast("Coupon applied! ₹2,000 discount applied.", "success");
      return;
    }

    setCouponApplied(false);
    showToast("Coupon not valid for this plan.", "error");
  };

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
        couponCode: couponApplied ? couponCode.trim() : undefined,
        clientFinalAmount: finalPayable,
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
          selectedPeriod
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
                const amount = pricing?.[selectedPlan]?.[period] || 0;

                return (
                  <button
                    key={period}
                    className={`period-btn ${selectedPeriod === period ? "active" : ""}`}
                    onClick={() => setSelectedPeriod(period)}
                  >
                    <span>{period === "monthly" ? "Monthly" : period === "6months" ? "6 Months" : "1 Year"}</span>
                    <strong>₹{amount}</strong>
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
              <span>{selectedPeriod === "monthly" ? "Monthly" : selectedPeriod === "6months" ? "6 Months" : "1 Year"}</span>
            </div>

            <div className="summary-row">
              <span>Coupon</span>
              <span>
                {couponApplied && isCouponEligiblePlan
                  ? "Applied"
                  : "Not Applied"}
              </span>
            </div>

            <div className="summary-row coupon-row">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value);
                  setCouponApplied(false);
                }}
                placeholder="Enter coupon code"
                className="coupon-input"
              />
              <button
                type="button"
                className="coupon-apply-btn"
                onClick={handleApplyCoupon}
                disabled={loading}
              >
                Apply
              </button>
            </div>

            <div className="summary-row">
              <span>Base Price</span>
              <span>{formatCurrency(baseAmount)}</span>
            </div>

            <div className="summary-row">
              <span>Discount</span>
              <span>{formatCurrency(appliedDiscount)}</span>
            </div>

            <div className="summary-row">
              <span>GST (18%)</span>
              <span>{formatCurrency(gstAmount)}</span>
            </div>

            <div className="summary-row total">
              <span>Final Payable</span>
              <span>{formatCurrency(finalPayable)}</span>
            </div>

            {error && <div className="payment-error">{error}</div>}

            <button
              className="pay-btn"
              onClick={handlePayment}
              disabled={loading || !razorpayLoaded}
            >
              {loading
                ? "Processing..."
                : `Pay ${formatCurrency(finalPayable)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
