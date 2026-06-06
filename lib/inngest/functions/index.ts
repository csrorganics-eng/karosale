import { orderPlacedFunction } from "./order-placed";
import { orderStatusChangedFunction } from "./order-status-changed";
import { packagingTagGenerateFunction } from "./packaging-tag-generate";
import { lowStockAlertFunction } from "./low-stock-alert";
import { cartAbandonmentFunction } from "./cart-abandonment";
import { reviewRequestFunction } from "./review-request";
import { subscriptionProcessorFunction } from "./subscription-processor";
import { dailyAdminReportFunction } from "./daily-admin-report";
import { expiryAlertFunction } from "./expiry-alert";
import { codVerificationFunction } from "./cod-verification";
import { referralRewardFunction } from "./referral-reward";
import { invoiceGeneratorFunction } from "./invoice-generator";
import { loyaltyExpireFunction } from "./loyalty-expire";
import { campaignHeartbeatFunction } from "./campaign-heartbeat";

export const inngestFunctions = [
  orderPlacedFunction,
  orderStatusChangedFunction,
  packagingTagGenerateFunction,
  lowStockAlertFunction,
  cartAbandonmentFunction,
  reviewRequestFunction,
  subscriptionProcessorFunction,
  dailyAdminReportFunction,
  expiryAlertFunction,
  codVerificationFunction,
  referralRewardFunction,
  invoiceGeneratorFunction,
  loyaltyExpireFunction,
  campaignHeartbeatFunction,
];
