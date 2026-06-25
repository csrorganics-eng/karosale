/**
 * RazorpayWebView
 *
 * Opens a modal WebView that embeds Razorpay's checkout.js and handles the
 * full payment lifecycle.  The parent receives typed callbacks for success,
 * failure, and dismiss — no native SDK required.
 *
 * Flow:
 *   1. Parent creates a Razorpay order via POST /api/orders → gets razorpayOrderId + amount
 *   2. Parent renders <RazorpayWebView ... /> which opens full-screen
 *   3. User pays inside the WebView; Razorpay JS posts a message back
 *   4. onSuccess({ razorpayPaymentId, razorpayOrderId, razorpaySignature }) is called
 *   5. Parent calls POST /api/orders/verify-payment to confirm server-side
 */
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRef, useState } from "react";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";

export type RazorpaySuccessPayload = {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
};

export type RazorpayFailedPayload = {
  code: string;
  description: string;
  source?: string;
  step?: string;
  reason?: string;
};

type Props = {
  /** Expo-public Razorpay key (rzp_test_xxx or rzp_live_xxx). */
  keyId: string;
  /** Razorpay order ID returned by POST /api/orders (format: order_xxx). */
  razorpayOrderId: string;
  /** Amount in paise (₹100 → 10000). */
  amountPaise: number;
  /** Prefill user details in the Razorpay form. */
  prefill?: { name?: string; email?: string; contact?: string };
  /** Description shown on the Razorpay sheet. */
  description?: string;
  onSuccess: (payload: RazorpaySuccessPayload) => void;
  onFailed: (payload: RazorpayFailedPayload) => void;
  onDismiss: () => void;
};

/** Builds the self-contained HTML page that embeds Razorpay checkout.js. */
function buildCheckoutHtml(props: Props): string {
  const options = {
    key: props.keyId,
    amount: props.amountPaise,
    currency: "INR",
    order_id: props.razorpayOrderId,
    name: "CSR Organics",
    description: props.description ?? "Certified organic products",
    image: "https://karosale.com/brand/csrorganics-logo.webp",
    prefill: {
      name: props.prefill?.name ?? "",
      email: props.prefill?.email ?? "",
      contact: props.prefill?.contact ?? "",
    },
    theme: { color: "#1e4d3a" },
    // Force WebView-compatible checkout (no popup)
    config: { display: { language: "en" } },
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #fafbf9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .loading {
      text-align: center;
      color: #5a6b62;
      font-size: 16px;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #dde8e2;
      border-top-color: #1e4d3a;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="loading">
    <div class="spinner"></div>
    <p>Opening payment…</p>
  </div>

  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    function postMsg(data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    window.addEventListener('load', function() {
      var options = ${JSON.stringify(options)};

      options.handler = function(response) {
        postMsg({
          type: 'payment.success',
          razorpayPaymentId: response.razorpay_payment_id,
          razorpayOrderId:   response.razorpay_order_id,
          razorpaySignature: response.razorpay_signature
        });
      };

      options.modal = {
        escape: true,
        backdropclose: false,
        ondismiss: function() {
          postMsg({ type: 'payment.dismissed' });
        }
      };

      var rzp = new Razorpay(options);

      rzp.on('payment.failed', function(response) {
        postMsg({
          type: 'payment.failed',
          code:        response.error.code,
          description: response.error.description,
          source:      response.error.source,
          step:        response.error.step,
          reason:      response.error.reason
        });
      });

      rzp.open();
    });
  </script>
</body>
</html>`;
}

export function RazorpayWebView(props: Props) {
  const { onSuccess, onFailed, onDismiss } = props;
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const webviewRef = useRef<WebView>(null);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as {
        type: string;
        razorpayPaymentId?: string;
        razorpayOrderId?: string;
        razorpaySignature?: string;
        code?: string;
        description?: string;
        source?: string;
        step?: string;
        reason?: string;
      };

      switch (msg.type) {
        case "payment.success":
          onSuccess({
            razorpayPaymentId: msg.razorpayPaymentId!,
            razorpayOrderId: msg.razorpayOrderId!,
            razorpaySignature: msg.razorpaySignature!,
          });
          break;
        case "payment.failed":
          onFailed({
            code: msg.code ?? "PAYMENT_FAILED",
            description: msg.description ?? "Payment failed",
            source: msg.source,
            step: msg.step,
            reason: msg.reason,
          });
          break;
        case "payment.dismissed":
          onDismiss();
          break;
      }
    } catch {
      // ignore malformed messages
    }
  }

  const html = buildCheckoutHtml(props);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onDismiss}>
      <View style={[styles.container, { paddingTop: Platform.OS === "android" ? insets.top : 0 }]}>
        {/* Header bar */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Secure Payment</Text>
          <Pressable onPress={onDismiss} style={styles.closeBtn} accessibilityLabel="Close">
            <Ionicons name="close" size={22} color={theme.colors.text} />
          </Pressable>
        </View>

        {/* Lock + SSL badge */}
        <View style={styles.securityBadge}>
          <Ionicons name="lock-closed" size={13} color={theme.colors.primary} />
          <Text style={styles.securityText}>256-bit SSL secured · Powered by Razorpay</Text>
        </View>

        {/* Loading spinner while page loads */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading secure checkout…</Text>
          </View>
        )}

        <WebView
          ref={webviewRef}
          source={{ html, baseUrl: "https://checkout.razorpay.com" }}
          onMessage={handleMessage}
          onLoad={() => setLoading(false)}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["*"]}
          mixedContentMode="always"
          style={styles.webview}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    position: "relative",
  },
  headerTitle: {
    fontWeight: "700",
    fontSize: 16,
    color: theme.colors.text,
  },
  closeBtn: {
    position: "absolute",
    right: 16,
    padding: 4,
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    backgroundColor: theme.colors.accentSoft,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  securityText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    zIndex: 10,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: 15,
  },
  webview: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
