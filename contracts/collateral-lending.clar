;; Collateral Lending Smart Contract
;; Clarity v1 (for Clarinet compatibility)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INSUFFICIENT-COLLATERAL u101)
(define-constant ERR-NO-LOAN u102)
(define-constant ERR-PRICE-ORACLE-FAIL u103)
(define-constant ERR-INVALID-AMOUNT u104)
(define-constant ERR-ZERO-ADDRESS u105)

;; Oracle and token contracts (use valid testnet addresses for Clarinet dev)
(define-constant PRICE-FEED 'ST000000000000000000002AMW42H.price-oracle)
(define-constant STABLECOIN 'ST000000000000000000002AMW42H.stable-token)
(define-constant COLLATERAL 'ST000000000000000000002AMW42H.collateral-token)

;; Admin
(define-data-var admin principal tx-sender)

;; Collateral and loan mappings
(define-map collateral-by-user principal uint)
(define-map loans-by-user principal uint)

;; Oracle interface
(define-read-only (get-price)
  (match (contract-call? PRICE-FEED get-price)
    price (ok price)
    (err ERR-PRICE-ORACLE-FAIL)
  )
)

;; Admin-only: set admin
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-admin 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set admin new-admin)
    (ok true)
  )
)

;; Deposit collateral
(define-public (deposit-collateral (amount uint))
  (begin
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (try! (contract-call? COLLATERAL transfer tx-sender (as-contract tx-sender) amount))
    (let ((prev (default-to u0 (map-get? collateral-by-user tx-sender))))
      (map-set collateral-by-user tx-sender (+ prev amount))
      (ok true)
    )
  )
)

;; Withdraw collateral
(define-public (withdraw-collateral (amount uint))
  (begin
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (let (
      (current (default-to u0 (map-get? collateral-by-user tx-sender)))
      (loan (default-to u0 (map-get? loans-by-user tx-sender)))
    )
      (asserts! (>= current amount) (err ERR-INSUFFICIENT-COLLATERAL))
      ;; Ensure post-withdraw collateral still covers the loan
      (let ((price (unwrap-panic! (get-price))))
        (let (
          (remaining (- current amount))
          (max-loan (/ (* remaining price) u150)) ;; 150% collateralization
        )
          (asserts! (<= loan max-loan) (err ERR-INSUFFICIENT-COLLATERAL))
          (map-set collateral-by-user tx-sender remaining)
          (try! (contract-call? COLLATERAL transfer (as-contract tx-sender) tx-sender amount))
          (ok true)
        )
      )
    )
  )
)

;; Borrow stablecoins
(define-public (borrow (amount uint))
  (begin
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (let (
      (collateral (default-to u0 (map-get? collateral-by-user tx-sender)))
      (loan (default-to u0 (map-get? loans-by-user tx-sender)))
      (price (unwrap-panic! (get-price)))
    )
      (let ((max-loan (/ (* collateral price) u150))) ;; 150% collateral ratio
        (asserts! (<= (+ loan amount) max-loan) (err ERR-INSUFFICIENT-COLLATERAL))
        (map-set loans-by-user tx-sender (+ loan amount))
        (try! (contract-call? STABLECOIN transfer (as-contract tx-sender) tx-sender amount))
        (ok true)
      )
    )
  )
)

;; Repay loan
(define-public (repay (amount uint))
  (begin
    (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
    (let ((loan (default-to u0 (map-get? loans-by-user tx-sender))))
      (asserts! (> loan u0) (err ERR-NO-LOAN))
      (let ((new-loan (if (<= amount loan) (- loan amount) u0)))
        (try! (contract-call? STABLECOIN transfer tx-sender (as-contract tx-sender) amount))
        (map-set loans-by-user tx-sender new-loan)
        (ok true)
      )
    )
  )
)

;; Read-only: get collateral
(define-read-only (get-collateral (user principal))
  (ok (default-to u0 (map-get? collateral-by-user user)))
)

;; Read-only: get loan
(define-read-only (get-loan (user principal))
  (ok (default-to u0 (map-get? loans-by-user user)))
)

;; Read-only: get admin
(define-read-only (get-admin)
  (ok (var-get admin))
)
