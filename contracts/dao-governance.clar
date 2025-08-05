(define-constant ERR_UNAUTHORIZED (err u100))
(define-constant ERR_INSUFFICIENT_STAKE (err u101))
(define-constant ERR_ALREADY_VOTED (err u102))
(define-constant ERR_INVALID_PROPOSAL (err u103))
(define-constant ERR_NOT_ENOUGH_SUPPORT (err u104))

(define-data-var admin principal tx-sender)
(define-data-var total-stake uint u0)
(define-map stake-balances { staker: principal } uint)
(define-map proposals { id: uint } 
  { description: (string-ascii 100), proposer: principal, votes-for: uint, votes-against: uint, executed: bool })
(define-map votes { id: uint, voter: principal } bool)
(define-data-var proposal-counter uint u0)

;; Only admin can call
(define-public (set-admin (new-admin principal))
  (begin
    (if (is-eq tx-sender (var-get admin))
      (begin (var-set admin new-admin) (ok true))
      ERR_UNAUTHORIZED)))

;; Stake tokens into the DAO
(define-public (stake (amount uint))
  (let ((current (default-to u0 (map-get? stake-balances { staker: tx-sender }))))
    (begin
      (map-set stake-balances { staker: tx-sender } (+ current amount))
      (var-set total-stake (+ (var-get total-stake) amount))
      (ok true))))

;; Unstake tokens from the DAO
(define-public (unstake (amount uint))
  (let ((current (default-to u0 (map-get? stake-balances { staker: tx-sender }))))
    (if (>= current amount)
      (begin
        (map-set stake-balances { staker: tx-sender } (- current amount))
        (var-set total-stake (- (var-get total-stake) amount))
        (ok true))
      ERR_INSUFFICIENT_STAKE)))

;; Create a new proposal
(define-public (propose (desc (string-ascii 100)))
  (let ((id (+ (var-get proposal-counter) u1)))
    (begin
      (map-set proposals { id: id } {
        description: desc,
        proposer: tx-sender,
        votes-for: u0,
        votes-against: u0,
        executed: false
      })
      (var-set proposal-counter id)
      (ok id))))

;; Vote on a proposal
(define-public (vote (id uint) (support bool))
  (let ((prop (map-get? proposals { id: id })))
    (match prop
      proposal
      (begin
        (if (is-some (map-get? votes { id: id, voter: tx-sender }))
          ERR_ALREADY_VOTED
          (let ((stake (default-to u0 (map-get? stake-balances { staker: tx-sender }))))
            (if (is-eq stake u0)
              ERR_INSUFFICIENT_STAKE
              (begin
                (map-set votes { id: id, voter: tx-sender } support)
                (if support
                  (map-set proposals { id: id } (merge proposal { votes-for: (+ (get votes-for proposal) stake) }))
                  (map-set proposals { id: id } (merge proposal { votes-against: (+ (get votes-against proposal) stake) })))
                (ok true))))))
      ERR_INVALID_PROPOSAL)))

;; Execute passed proposals (majority support required)
(define-public (execute (id uint))
  (let ((prop (map-get? proposals { id: id })))
    (match prop
      proposal
      (if (get executed proposal)
        ERR_INVALID_PROPOSAL
        (if (> (get votes-for proposal) (get votes-against proposal))
          (begin
            (map-set proposals { id: id } (merge proposal { executed: true }))
            (ok true))
          ERR_NOT_ENOUGH_SUPPORT))
      ERR_INVALID_PROPOSAL)))
