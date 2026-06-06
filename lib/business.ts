/**
 * Legal entity for tax invoices, packing slips, and email footers.
 * Override via env when you have final registration details.
 */
export function getBusinessProfile() {
  return {
    /** Registered / trading legal name */
    legalName: process.env.BUSINESS_LEGAL_NAME?.trim() || "GRSOrganics",
    /** Shown on invoices/packing (e.g. “Gross Sales Tax” when you use GST in that sense). */
    gstStandsFor: process.env.BUSINESS_GST_STANDS_FOR?.trim() || "Gross Sales Tax",
    /** India GSTIN (15 chars). Placeholder until you set BUSINESS_GSTIN. */
    gstin: process.env.BUSINESS_GSTIN?.trim() || "32AAAAA0000A1Z5",
    addressLine1:
      process.env.BUSINESS_ADDRESS_LINE1?.trim() || "42, Palm Grove Avenue, Edappally",
    addressLine2: process.env.BUSINESS_ADDRESS_LINE2?.trim() || "Kochi, Kerala 682024",
    country: process.env.BUSINESS_ADDRESS_COUNTRY?.trim() || "India",
    /** Customer-facing marketplace name */
    brandName: "Karosale",
  };
}

export function getBusinessAddressBlock(): string[] {
  const b = getBusinessProfile();
  return [b.legalName, b.addressLine1, b.addressLine2, b.country].filter(Boolean);
}
