# Atomos Section 2.4.5 — Seller Orders & Notifications

Implemented seller order operations with seller-scoped fulfillment state and private notifications.

## Seller order workflow

Each seller now has a separate state for their items:

`pending -> confirmed -> processing -> ready_for_delivery -> delivered`

Seller cancellation is supported only for single-seller orders while the seller state is `pending` or `confirmed`. Multi-seller seller cancellation remains intentionally disabled until order-item-level cancellation and partial-refund accounting are implemented.

## Multi-seller isolation

`get_seller_orders()` returns only rows belonging to the authenticated seller. Seller status mutations validate that the seller owns an item in the order and update only that seller's state.

The buyer-facing order status is derived from the slowest active seller state, so one seller cannot falsely mark another seller's fulfillment complete.

## Notifications

Database triggers create private notifications for:

- seller when an order becomes paid
- buyer when overall order status changes
- buyer when a seller fulfillment state changes
- buyer cancellation synchronizes seller states

Notifications are readable/updatable only by their owner through RLS.

## Testing required after applying migration 008

1. Apply migration 008.
2. Run frontend typecheck and build.
3. Complete a paid single-seller order.
4. Verify seller receives `New paid order`.
5. Progress seller state through each stage.
6. Verify buyer notifications.
7. Create a multi-seller order and confirm each seller sees only their own items.
8. Confirm one seller cannot update another seller's state.
9. Confirm multi-seller seller cancellation is rejected with the intended message.
10. Confirm buyer cancellation still restores stock and synchronizes seller state.
