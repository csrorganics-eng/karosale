/** Shared affiliate domain types (aligned with `affiliate_*` tables). */

export type CommissionTrigger = "order_placed" | "order_paid" | "order_complete";

export type AffiliateCommissionType = "percent" | "fixed";

export type AffiliateStatus = "pending" | "active" | "suspended" | "rejected";

export type AffiliatePayoutStatus =
  | "requested"
  | "approved"
  | "processing"
  | "paid"
  | "failed"
  | "rejected";

export type AffiliateCommissionStatus = "pending" | "approved" | "paid" | "cancelled";

export interface AffiliateSettingsRow {
  id: number;
  isEnabled: boolean;
  defaultCommissionType: string;
  defaultCommissionValue: string;
  secondOrderCommissionEnabled: boolean;
  secondOrderCommissionValue: string;
  newCustomerDiscountEnabled: boolean;
  newCustomerDiscountType: string;
  newCustomerDiscountValue: string;
  newCustomerDiscountMaxUses: number | null;
  commissionTrigger: string;
  multitierEnabled: boolean;
  tier1CommissionValue: string;
  tier2CommissionValue: string;
  tier3CommissionValue: string;
  tier4CommissionValue: string;
  tierCommissionType: string;
  registrationCommissionEnabled: boolean;
  registrationCommissionValue: string;
  allowGrabReferrer: boolean;
  cookieDurationDays: number;
  minPayoutAmount: string;
  payoutMethod: string;
  autoPayoutEnabled: boolean;
  autoPayoutThreshold: string;
  popupEnabled: boolean;
  popupBgColor: string;
  popupTextColor: string;
  popupShowSocialShare: boolean;
  popupSocialNetworks: string[];
  excludedProductIds: string[];
  updatedAt: Date;
}

export interface AffiliateRow {
  id: number;
  userId: string;
  username: string;
  status: string;
  referredByAffiliateId: number | null;
  tierLevel: number;
  totalEarned: string;
  totalPaid: string;
  walletBalance: string;
  razorpayContactId: string | null;
  razorpayFundAccountId: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankAccountName: string | null;
  upiId: string | null;
  emailNotificationsEnabled: boolean;
  approvedAt: Date | null;
  approvedByAdminId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateCommissionRow {
  id: number;
  affiliateId: number;
  orderId: string;
  referredUserId: string | null;
  tierLevel: number;
  commissionType: string;
  commissionRate: string;
  orderSubtotal: string;
  commissionAmount: string;
  status: string;
  payoutId: number | null;
  cancelledReason: string | null;
  cancelledByAdmin: string | null;
  cancelledAt: Date | null;
  triggerEvent: string;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliatePayoutRow {
  id: number;
  affiliateId: number;
  requestedAmount: string;
  approvedAmount: string | null;
  status: string;
  payoutMethod: string;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  upiId: string | null;
  razorpayPayoutId: string | null;
  razorpayPayoutStatus: string | null;
  razorpayReferenceId: string | null;
  razorpayUtr: string | null;
  reviewedByAdminId: string | null;
  adminNotes: string | null;
  rejectionReason: string | null;
  requestedAt: Date;
  approvedAt: Date | null;
  processedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommissionBreakdown {
  affiliateId: number;
  tierLevel: number;
  rate: number;
  type: AffiliateCommissionType;
  amount: number;
  orderSubtotal: number;
}

export interface AffiliateOrderItem {
  productId: string;
  lineTotal: number;
}

export interface AffiliateStats {
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  totalEarned: number;
  pendingBalance: number;
  paidOut: number;
  thisMonthEarnings: number;
  topProduct?: { name: string; commissions: number };
}
