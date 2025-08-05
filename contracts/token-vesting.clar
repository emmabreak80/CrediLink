(define-constant err-not-admin (err u100))
(define-constant err-zero-address (err u101))
(define-constant err-already-vested (err u102))
(define-constant err-no-vesting (err u103))
(define-constant err-too-early (err u104))
(define-constant err-zero-amount (err u105))

(define-data-var admin principal tx-sender)

(define-map vestings 
  { beneficiary: principal }
  { total: uint, released: uint, start: uint, duration: uint }
)

(define-public (set-admin (new-admin principal))
  (begin
    (if (is-eq tx-sender (var-get admin))
      (if (is-eq new-admin 'ST000000000000000000002AMW42H)
        err-zero-address
        (begin
          (var-set admin new-admin)
          (ok true)
        )
      )
      err-not-admin
    )
  )
)

(define-public (create-vesting (beneficiary principal) (total uint) (duration uint))
  (begin
    (if (not (is-eq tx-sender (var-get admin)))
      err-not-admin
      (if (is-none (map-get vestings { beneficiary: beneficiary }))
        (if (or (is-eq total u0) (is-eq duration u0))
          err-zero-amount
          (begin
            (map-set vestings 
              { beneficiary: beneficiary }
              { total: total, released: u0, start: block-height, duration: duration }
            )
            (ok true)
          )
        )
        err-already-vested
      )
    )
  )
)

(define-read-only (get-vesting (beneficiary principal))
  (map-get vestings { beneficiary: beneficiary })
)

(define-public (claim)
  (let 
    (
      (vesting (map-get vestings { beneficiary: tx-sender }))
    )
    (if (is-none vesting)
      err-no-vesting
      (let 
        (
          (data (unwrap-panic vesting))
          (elapsed (if (>= block-height (+ (get start data) (get duration data)))
                    (get duration data)
                    (- block-height (get start data))
                  ))
          (claimable (/ (* (get total data) elapsed) (get duration data)))
          (unclaimed (- claimable (get released data)))
        )
        (if (is-eq unclaimed u0)
          err-too-early
          (begin
            (map-set vestings 
              { beneficiary: tx-sender }
              {
                total: (get total data),
                released: (+ (get released data) unclaimed),
                start: (get start data),
                duration: (get duration data)
              }
            )
            (ok unclaimed)
          )
        )
      )
    )
  )
)
