/**
 * Marketing-email consent shown on the lead form. Shared so the server records
 * the exact wording version the person saw. Change the text => bump the version.
 */
export const MARKETING_CONSENT_TEXT =
  "Yes, you may email me helpful resources, product updates and offers from Diamond Digital Diva. I can unsubscribe at any time.";
export const MARKETING_CONSENT_VERSION = "map-marketing-consent-v1";
/** Server-set; the client never supplies the source or timestamp. */
export const MARKETING_CONSENT_SOURCE = "map-lead-form";

/** Shown immediately before optional resource links. */
export const AFFILIATE_DISCLOSURE =
  "Some links below are affiliate links. If you purchase through them, I may earn a commission at no additional cost to you.";
