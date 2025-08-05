import { describe, it, expect, beforeEach } from 'vitest';

class TimeLockedSavingsMock {
  savings: Map<string, { amount: bigint; unlockBlock: number }> = new Map();
  contractBalance = 0n;
  balances: Map<string, bigint> = new Map();
  blockHeight = 1000;

  setBalance(user: string, amount: bigint) {
    this.balances.set(user, amount);
  }

  lock(user: string, amount: bigint, unlockBlock: number) {
    if (this.savings.has(user)) return { error: 102 }; // ERR-ALREADY-LOCKED
    if (unlockBlock <= this.blockHeight) return { error: 103 }; // ERR-ZERO-LOCK

    const userBalance = this.balances.get(user) ?? 0n;
    if (userBalance < amount) return { error: 999 }; // Insufficient funds

    this.balances.set(user, userBalance - amount);
    this.contractBalance += amount;
    this.savings.set(user, { amount, unlockBlock });
    return { value: true };
  }

  withdraw(user: string) {
    const entry = this.savings.get(user);
    if (!entry) return { error: 100 }; // ERR-NOT-OWNER
    if (this.blockHeight < entry.unlockBlock) return { error: 101 }; // ERR-NOT-UNLOCKED

    this.savings.delete(user);
    this.contractBalance -= entry.amount;
    this.balances.set(user, (this.balances.get(user) ?? 0n) + entry.amount);
    return { value: true };
  }

  getSavings(user: string) {
    return this.savings.get(user) ?? null;
  }

  mineBlocks(count: number) {
    this.blockHeight += count;
  }
}

describe('Time Locked Savings Contract (mock)', () => {
  let contract: TimeLockedSavingsMock;
  const user = 'wallet_1';

  beforeEach(() => {
    contract = new TimeLockedSavingsMock();
    contract.setBalance(user, 10_000n);
  });

  it('should allow locking funds until future block', () => {
    const result = contract.lock(user, 2000n, contract.blockHeight + 50);
    expect(result).toEqual({ value: true });
    const saved = contract.getSavings(user);
    expect(saved).toEqual({ amount: 2000n, unlockBlock: 1050 });
  });

  it('should prevent locking if already locked', () => {
    contract.lock(user, 2000n, contract.blockHeight + 50);
    const result = contract.lock(user, 1000n, contract.blockHeight + 100);
    expect(result).toEqual({ error: 102 });
  });

  it('should prevent locking with past block height', () => {
    const result = contract.lock(user, 1000n, contract.blockHeight);
    expect(result).toEqual({ error: 103 });
  });

  it('should prevent withdrawal before unlock block', () => {
    contract.lock(user, 2000n, contract.blockHeight + 50);
    const result = contract.withdraw(user);
    expect(result).toEqual({ error: 101 });
  });

  it('should allow withdrawal after unlock block', () => {
    contract.lock(user, 2000n, contract.blockHeight + 1);
    contract.mineBlocks(2);
    const result = contract.withdraw(user);
    expect(result).toEqual({ value: true });
    expect(contract.getSavings(user)).toBeNull();
    expect(contract.balances.get(user)).toBe(10_000n); // returned full amount
  });

  it('should not allow withdrawal if no lock exists', () => {
    const result = contract.withdraw(user);
    expect(result).toEqual({ error: 100 });
  });
});
