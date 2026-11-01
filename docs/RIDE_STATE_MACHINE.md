# Archer Ride State Machine

## Core lifecycle

```text
New
 ↓
Broadcast
 ↓
Accepted
 ↓
On My Way
 ↓
At Your Doorstep
 ↓
Ride Started
 ↓
Ride Ended
 ↓
Close Out
 ↓
Completed
```

## State ownership
Laravel owns all authoritative state transitions.

The UI may request a transition. Laravel decides whether the transition is valid.

## Transition requirements
Each transition should:
- validate actor authorization
- validate current state
- validate required data
- persist atomically
- append status history
- emit relevant event/notification
- be auditable

## Dispatch-specific states
A ride may move through offer/broadcast behavior before acceptance:
- New
- Broadcast
- Accepted

Preferred-driver flow:
1. If an eligible preferred driver exists, offer to that driver first.
2. On decline or timeout, continue to applicable broadcast behavior.
3. Broadcast only to eligible drivers.
4. Accept must be concurrency-safe.
5. Once accepted, competing offers must be invalidated/closed.

## Exceptions
Cancellations, reassignment, timeout, no-driver, and other exceptional states must be modeled according to the approved handoff/rules package.

Do not create arbitrary transitions such as:
- Completed → Accepted
- Ride Started → New
unless an explicit approved business rule requires a controlled reversal.

## Audit
Store status history with:
- previous status
- new status
- actor
- timestamp
- reason where applicable
- source/reference
