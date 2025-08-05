(define-constant ERR_NOT_ADMIN (err u100))
(define-constant ERR_PAUSED (err u101))
(define-constant ERR_NO_STAKE (err u102))
(define-constant ERR_ZERO_AMOUNT (err u103))

(define-data-var admin principal tx-sender)
(define-data-var paused bool false)
(define-data-var reward-rate uint u1) ;; tokens per block

(define-map staked-amount ((user principal)) (amount uint))
(define-map last-staked-block ((user principal)) (block-height uint))
(define-map rewards ((user principal)) (reward uint))

(define-public (set-admin (new-admin principal))
  (begin
    (if (is-eq tx-sender (var-get admin))
      (begin
        (if (is-eq new-admin 'ST000000000000000000002AMW42H) (ERR_ZERO_AMOUNT)
          (begin (var-set admin new-admin) (ok true)))
      )
      ERR_NOT_ADMIN
    )
  )
)

(define-public (set-paused (pause bool))
  (if (is-eq tx-sender (var-get admin))
    (begin (var-set paused pause) (ok true))
    ERR_NOT_ADMIN
  )
)

(define-public (set-reward-rate (rate uint))
  (if (is-eq tx-sender (var-get admin))
    (begin (var-set reward-rate rate) (ok true))
    ERR_NOT_ADMIN
  )
)

(define-private (update-reward (user principal))
  (let
    (
      (last-block (default-to u0 (map-get? last-staked-block ((user user)))))
      (current-block block-height)
      (staked (default-to u0 (map-get? staked-amount ((user user)))))
      (pending (* staked (* (- current-block last-block) (var-get reward-rate))))
      (existing (default-to u0 (map-get? rewards ((user user)))))
    )
    (begin
      (map-set rewards ((user user)) (+ existing pending))
      (map-set last-staked-block ((user user)) current-block)
    )
  )
)

(define-public (stake (amount uint))
  (begin
    (if (var-get paused)
      ERR_PAUSED
      (if (is-eq amount u0)
        ERR_ZERO_AMOUNT
        (begin
          (update-reward tx-sender)
          (let ((current (default-to u0 (map-get? staked-amount ((user tx-sender))))))
            (map-set staked-amount ((user tx-sender)) (+ current amount))
          )
          (ok true)
        )
      )
    )
  )
)

(define-public (unstake (amount uint))
  (let ((current (default-to u0 (map-get? staked-amount ((user tx-sender))))))
    (if (< current amount)
      ERR_NO_STAKE
      (begin
        (update-reward tx-sender)
        (map-set staked-amount ((user tx-sender)) (- current amount))
        (ok true)
      )
    )
  )
)

(define-public (claim)
  (let ((reward (default-to u0 (map-get? rewards ((user tx-sender))))))
    (if (is-eq reward u0)
      (err u0)
      (begin
        (map-set rewards ((user tx-sender)) u0)
        (ok reward)
      )
    )
  )
)
