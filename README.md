# CrediLink

A decentralized lending and borrowing protocol that brings financial access to underbanked populations through smart contracts, on-chain credit reputation, and peer-to-peer capital flows — all powered by Clarity and the Stacks blockchain.

---

## Overview

CrediLink consists of ten modular smart contracts that work together to form a trustless, transparent, and accessible credit ecosystem for users without traditional banking access:

1. **Identity & Credit Profile Contract** – Manages user identity and builds on-chain reputation.
2. **Collateral Vault Contract** – Locks and manages crypto assets as loan collateral.
3. **Loan Agreement Contract** – Creates binding loan terms and repayment schedules.
4. **Loan Pool Contract** – Enables capital pooling and risk-based lending tranches.
5. **Underwriting DAO Contract** – Community-based loan approval with reputation staking.
6. **Reputation Token Contract** – Issues non-transferable tokens based on credit behavior.
7. **Interest Rate Oracle Contract** – Dynamically adjusts interest rates using market data.
8. **Stablecoin Integration Contract** – Facilitates borrowing and repayment in stable assets.
9. **Liquidation Contract** – Protects lenders by liquidating under-collateralized positions.
10. **Governance Contract** – Manages protocol parameters and DAO proposals.

---

## Features

- **Decentralized credit profiles** linked to wallet and reputation  
- **Crypto collateralization** with dynamic price oracles  
- **Smart loan contracts** with automated repayments  
- **Community underwriting DAO** with stake-based approvals  
- **Reputation scoring** for responsible borrowers  
- **Interest rate model** adapting to market conditions  
- **Stablecoin integration** for stable, global lending  
- **Automated liquidations** to protect capital  
- **Governance-enabled upgrades** and risk controls  
- **Full transparency** with on-chain auditability  

---

## Smart Contracts

### Identity & Credit Profile Contract
- Associates wallet with credit metadata
- Stores repayment history and borrower tags
- Optional integration with decentralized identity (DID)

### Collateral Vault Contract
- Manages deposited collateral assets
- Calculates collateralization ratios
- Locks/unlocks assets per loan state

### Loan Agreement Contract
- Defines principal, interest, and terms
- Tracks repayments and due dates
- Marks default and completion states

### Loan Pool Contract
- Aggregates lender funds into risk pools
- Matches borrowers based on credit score and collateral
- Tranche-based lending with yield curves

### Underwriting DAO Contract
- DAO of community validators
- Stake-based voting on loan applications
- Reward/penalize based on borrower outcomes

### Reputation Token Contract
- Soulbound or non-transferable ERC-20-like token
- Increases with timely repayments
- Slashed on defaults

### Interest Rate Oracle Contract
- Calculates interest based on supply/demand dynamics
- Optional integration with real-world inflation data
- Used by Loan Agreement Contracts

### Stablecoin Integration Contract
- Supports USDC, USDA, or other stablecoins
- Borrow and repay in stable value
- Off-ramp-friendly architecture

### Liquidation Contract
- Monitors health of collateralized positions
- Automatically sells collateral upon breach
- Distributes proceeds to lenders

### Governance Contract
- Manages risk parameters (collateral ratio, pool limits)
- DAO-based voting system
- Emergency pause/resume functionality

---

## Installation

1. Install [Clarinet CLI](https://docs.hiro.so/clarinet/getting-started)
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/credilink.git
   ```
3. Run tests:
    ```bash
    npm test
    ```
4. Deploy contracts:
    ```bash
    clarinet deploy
    ```

## Usage

Each contract can operate independently but integrates into a modular lending framework.
Developers can import and extend core functionality, while users interact with a frontend interface backed by smart contract logic.

> See /contracts/ for contract-specific documentation and usage examples.

## License

MIT License