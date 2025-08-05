(define-constant ERR-NOT-OWNER u100)
(define-constant ERR-NOT-UNLOCKED u101)
(define-constant ERR-ALREADY-LOCKED u102)
(define-constant ERR-ZERO-LOCK u103)

(define-map savings ((user principal)) ((amount uint) (unlock-block uint)))

(define-public (lock (amount uint) (unlock-block uint))
  (begin
    (asserts! (is-eq (get amount (get (as-contract tx-sender) savings)) none) ERR-ALREADY-LOCKED)
    (asserts! (> unlock-block (block-height)) ERR-ZERO-LOCK)
    (stx-transfer? amount tx-sender (as-contract tx-sender))
    (map-set savings {user: tx-sender} {amount: amount, unlock-block: unlock-block})
    (ok true)
  )
)

(define-public (withdraw)
  (let (
    (entry (map-get? savings {user: tx-sender}))
  )
    (match entry entry-val
      (begin
        (asserts! (>= (block-height) (get unlock-block entry-val)) ERR-NOT-UNLOCKED)
        (map-delete savings {user: tx-sender})
        (stx-transfer? (get amount entry-val) (as-contract tx-sender) tx-sender)
      )
      (err ERR-NOT-OWNER)
    )
  )
)

(define-read-only (get-savings (user principal))
  (map-get? savings {user: user})
)
