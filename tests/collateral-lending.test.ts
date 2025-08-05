import { describe, it, expect, beforeEach } from "vitest";

type Principal = string;

const ERRORS = {
  NOT_AUTHORIZED: 100,
  INSUFFICIENT_COLLATERAL: 101,
  ZERO_ADDRESS: 102,
  CONTRACT_PAUSED: 103,
  NOT_LIQUIDATABLE: 104,
};

const mockContract = {
  admin: "ST2ADMIN1234567890",
  paused: false,
  loans: new Map<Principal, bigint>(),
  collaterals: new Map<Principal, bigint>(),
  loanToValueRatio: 50n,
  liquidationThreshold: 70n,
  price: 100n, // $1.00 in cents
  priceScale: 100n, // scale for price to simulate decimal math

  isAdmin(caller: Principal) {
    return caller === this.admin;
  },

  setPaused(caller: Principal, value: boolean) {
    if (!this.isAdmin(caller)) return { error: ERRORS.NOT_AUTHORIZED };
    this.paused = value;
    return { value };
  },

  setAdmin(caller: Principal, newAdmin: Principal) {
    if (!this.isAdmin(caller)) return { error: ERRORS.NOT_AUTHORIZED };
    if (!newAdmin || newAdmin === "SP000000000000000000002Q6VF78")
      return { error: ERRORS.ZERO_ADDRESS };
    this.admin = newAdmin;
    return { value: true };
  },

  depositCollateral(user: Principal, amount: bigint) {
    if (this.paused) return { error: ERRORS.CONTRACT_PAUSED };
    const current = this.collaterals.get(user) || 0n;
    this.collaterals.set(user, current + amount);
    return { value: true };
  },

  borrow(user: Principal, amount: bigint) {
    if (this.paused) return { error: ERRORS.CONTRACT_PAUSED };
    const collateral = this.collaterals.get(user) || 0n;
    const maxBorrow = (collateral * this.loanToValueRatio * this.price) / (100n * this.priceScale);
    if (amount > maxBorrow) return { error: ERRORS.INSUFFICIENT_COLLATERAL };

    const currentLoan = this.loans.get(user) || 0n;
    this.loans.set(user, currentLoan + amount);
    return { value: true };
  },

  repay(user: Principal, amount: bigint) {
    if (this.paused) return { error: ERRORS.CONTRACT_PAUSED };
    const currentLoan = this.loans.get(user) || 0n;
    this.loans.set(user, currentLoan > amount ? currentLoan - amount : 0n);
    return { value: true };
  },

  liquidate(target: Principal) {
  if (this.paused) return { error: ERRORS.CONTRACT_PAUSED };

  const loan = this.loans.get(target) || 0n;
  const collateral = this.collaterals.get(target) || 0n;

  if (collateral === 0n) return { error: ERRORS.NOT_LIQUIDATABLE };

  // Calculate current collateral value using price
  const collateralValue = (collateral * this.price) / this.priceScale;

  // Avoid divide-by-zero
  if (collateralValue === 0n) return { error: ERRORS.NOT_LIQUIDATABLE };

  // Calculate loan ratio (loan / collateralValue) * 100
  const loanRatio = (loan * 100n) / collateralValue;

  if (loanRatio < this.liquidationThreshold)
    return { error: ERRORS.NOT_LIQUIDATABLE };

  this.loans.set(target, 0n);
  this.collaterals.set(target, 0n);
  return { value: true };
}

};

describe("Collateral Lending Contract (mock)", () => {
  const user = "ST2USER1234567890";
  const other = "ST3LIQUIDATOR987654321";

  beforeEach(() => {
    mockContract.admin = "ST2ADMIN1234567890";
    mockContract.paused = false;
    mockContract.loans = new Map();
    mockContract.collaterals = new Map();
    mockContract.price = 100n;
    mockContract.priceScale = 100n;
  });

  it("should allow admin to pause the contract", () => {
    const result = mockContract.setPaused(mockContract.admin, true);
    expect(result).toEqual({ value: true });
    expect(mockContract.paused).toBe(true);
  });

  it("should prevent borrowing if paused", () => {
    mockContract.setPaused(mockContract.admin, true);
    const result = mockContract.borrow(user, 100n);
    expect(result).toEqual({ error: ERRORS.CONTRACT_PAUSED });
  });

  it("should allow collateral deposit", () => {
    const result = mockContract.depositCollateral(user, 100n);
    expect(result).toEqual({ value: true });
    expect(mockContract.collaterals.get(user)).toBe(100n);
  });

  it("should allow borrowing within LTV ratio", () => {
    mockContract.depositCollateral(user, 200n); // Max borrow = 100
    const result = mockContract.borrow(user, 100n);
    expect(result).toEqual({ value: true });
    expect(mockContract.loans.get(user)).toBe(100n);
  });

  it("should fail borrowing beyond LTV ratio", () => {
    mockContract.depositCollateral(user, 100n); // Max borrow = 50
    const result = mockContract.borrow(user, 60n);
    expect(result).toEqual({ error: ERRORS.INSUFFICIENT_COLLATERAL });
  });

  it("should repay loan", () => {
    mockContract.depositCollateral(user, 200n);
    mockContract.borrow(user, 100n);
    const result = mockContract.repay(user, 50n);
    expect(result).toEqual({ value: true });
    expect(mockContract.loans.get(user)).toBe(50n);
  });

  it("should fully repay loan if amount exceeds balance", () => {
    mockContract.depositCollateral(user, 200n);
    mockContract.borrow(user, 80n);
    const result = mockContract.repay(user, 100n);
    expect(result).toEqual({ value: true });
    expect(mockContract.loans.get(user)).toBe(0n);
  });

  it("should prevent liquidation of healthy loans", () => {
    mockContract.depositCollateral(user, 200n); // $200
    mockContract.borrow(user, 100n); // 50%

    const result = mockContract.liquidate(user);
    expect(result).toEqual({ error: ERRORS.NOT_LIQUIDATABLE });
  });

  it("should transfer admin", () => {
    const newAdmin = "ST3NEWADMIN0000000000";
    const result = mockContract.setAdmin(mockContract.admin, newAdmin);
    expect(result).toEqual({ value: true });
    expect(mockContract.admin).toBe(newAdmin);
  });

  it("should fail to set admin from non-admin", () => {
    const result = mockContract.setAdmin("ST4NOTADMIN", "ST5SOMEONE");
    expect(result).toEqual({ error: ERRORS.NOT_AUTHORIZED });
  });

  it("should reject empty admin address", () => {
    const result = mockContract.setAdmin(mockContract.admin, "SP000000000000000000002Q6VF78");
    expect(result).toEqual({ error: ERRORS.ZERO_ADDRESS });
  });
});
