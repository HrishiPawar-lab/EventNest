# Payments and ticket QR credentials

All amounts in payment responses are integer INR paise. The backend creates a
Razorpay order for an authenticated user's active five-minute reservation.
Configure `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
`RAZORPAY_WEBHOOK_SECRET`, and `TICKET_QR_SECRET` (at least 32 characters).
Keep the QR secret stable across deployments so existing ticket tokens remain
derivable. Payment processing requires MongoDB transactions on a replica set.

| Method | Route                                   | Access                           | Body                                                                       | Success                                                                                                             |
| ------ | --------------------------------------- | -------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/payments/orders`                  | Authenticated purchaser          | `{ "reservationId": "ObjectId" }`                                          | 201 `{ "data": { "paymentId", "providerOrderId", "amount", "currency": "INR", "keyId" } }`                          |
| POST   | `/api/payments/:paymentId/verify`       | Authenticated purchaser          | `{ "providerPaymentId": "pay_...", "signature": "64-character hex HMAC" }` | 200 `{ "data": { "status": "confirmed\|refund_pending\|refund_failed\|refunded", "paymentId" } }`                   |
| POST   | `/api/payments/:paymentId/retry-refund` | Authenticated purchaser          | Empty body                                                                 | 200 `{ "data": { "status": "pending\|processed\|failed" } }`                                                        |
| GET    | `/api/payments/:paymentId`              | Authenticated purchaser          | None                                                                       | 200 `{ "data": { "id", "reservationId", "providerOrderId", "keyId", "amount", "currency", "status", "refundStatus", "paidAt", "refundedAt" } }` |
| GET    | `/api/tickets/:ticketId/qr`             | Authenticated ticket owner       | None                                                                       | 200 `{ "data": { "token": "opaque QR credential" } }`; `Cache-Control: no-store`                                    |
| POST   | `/api/webhooks/razorpay`                | Razorpay HMAC over raw JSON body | Razorpay event                                                             | 200 `{ "status" }` for `payment.captured` / `order.paid` / refund events; other signed events are ignored           |

`POST /orders` rejects inactive or expired reservations (409), unavailable
events (409), nonpositive or unsupported fractional prices (409), invalid IDs
(400), and reservations belonging to another user (404). The response contains
the public key ID; it never contains the key secret.
`GET /:paymentId` returns the original order ID and public key ID so the
purchaser can reopen an unfinished checkout attempt after a reload without
creating another Razorpay order. It never returns the key secret or payment
signature.

`POST /verify` checks the checkout signature against the order ID stored for
that payment, then fetches the payment from Razorpay. Tickets issue only when
Razorpay confirms `captured` status and matching order ID, amount, and
currency. An invalid signature returns 400; an uncaptured or mismatched
payment returns 409. A repeated valid request is safe. Signed `payment.failed`
webhooks update the payment attempt only if a provider fetch still reports
failure; stale failure events after capture are ignored. Signed webhooks also
fetch provider state before fulfillment. Raw webhook signature failures
return 400. Neither the checkout callback nor a webhook payload alone is
proof of payment.

The confirmed transition changes a pending reservation to confirmed, moves
reserved inventory to sold inventory, writes one ticket per entry, and writes
one hashed QR credential per ticket in a MongoDB transaction. A capture after
hold expiry, event cancellation, or confirmation by another payment attempt
issues no tickets. The backend initiates an idempotent full refund using a
stable `X-Refund-Idempotency` key. `refund_pending` means Razorpay has not
reported final processing; `refund_failed` requires reconciliation. A refund
is marked `refunded` only after a provider-confirmed `processed` result.
If Razorpay reports a final failed refund, the purchaser can call
`POST /:paymentId/retry-refund`. The service re-fetches the failed refund,
then creates a new provider refund attempt with a new persisted idempotency
key. Pending attempts reuse their original key. This endpoint does not
initiate a refund of a successfully issued ticket.
Each refund request also sends that key as its Razorpay receipt. A refund
webhook may bind an unrecorded refund ID only when its provider-fetched
receipt matches the current attempt. Delayed webhooks from a previous failed
attempt are ignored.

Errors use `{ "error": { "code", "message" } }`. Auth failures return 401,
inactive account failures 403, and missing resources 404. Payment order and
verification requests have per-user rate limits. A provider order created
immediately before a failed local Payment write may require manual
reconciliation; the order ID is not returned to the caller in this case.
Operators must reconcile an orphan order or a captured provider payment whose
order ID, amount, or currency differs from the stored Payment record against
Razorpay before taking action. The API does not issue tickets or auto-refund
an unverified mismatch. Failed automatic refunds also require monitoring and
reconciliation if the purchaser does not retry. Live payment and refund
behavior has not been verified against a configured Razorpay account.

No card data, raw QR credential, or provider secret is persisted. Client
applications should render the returned opaque token as a QR image and treat
it as a bearer credential.
