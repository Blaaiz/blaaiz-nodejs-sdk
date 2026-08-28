# Changelog

## 1.4.0 - 2026-08-28

This release brings the SDK up to date with the current Blaaiz API. All Blaaiz SDKs move to 1.4.0 together, so the same version means the same features in every language.

### Added
- Merchant reference on payouts and collections. Blaaiz saves it, returns it, and lets you find the transaction by it.
- Swaps: move money between two of your business wallets.
- Refunds: start a refund and get a refund.
- Rates: list the exchange rates for your business.
- Bank checks: verify a GBP account (payee) and a EUR IBAN.
- Interac money request: ask a payer for money by email.
- Business customer KYB: add and remove owners, upload owner ID files, upgrade to full KYB, and submit for review.
- Business customer documents: upload, list, get, update, and delete.

### Fixed
- Create a business customer without personal ID fields. The API does not allow them for a business.
- Upload customer files with the correct request method.
- Start a collection without the old, unused `currency` field.
- Update and replay a webhook on the correct address.
