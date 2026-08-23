/**
 * Google Play Billing hook for ActionPitch Pro (non-consumable).
 *
 * Usual Play way (not OTA):
 *  1. One free listing. Product id `actionpitch_pro` (one-time unlock).
 *  2. On buy, Play stores the entitlement on the Google account.
 *  3. The app calls queryPurchases on launch / Restore and sets save.entitlement.
 *  4. OTA ships code; it does not unlock a single buyer. FORCE_PRO in config
 *     is only a global switch (everyone Pro) if we ever ship that on purpose.
 *
 * Plugin is not wired yet — Play product is created after Console verification.
 */

export const PRO_PRODUCT_ID = 'actionpitch_pro'

export type PurchaseResult = 'owned' | 'cancelled' | 'unavailable'

export async function queryProPurchase(): Promise<boolean> {
  return false
}

export async function purchasePro(): Promise<PurchaseResult> {
  return 'unavailable'
}

export async function restoreProPurchases(): Promise<boolean> {
  return queryProPurchase()
}
