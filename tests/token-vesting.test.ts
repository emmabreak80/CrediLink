import { describe, it, expect, beforeEach } from 'vitest'

class MockTokenVesting {
  admin: string = 'deployer';
  vestings = new Map<string, {
    total: bigint,
    released: bigint,
    start: number,
    duration: number
  }>();
  blockHeight = 100;

  setAdmin(sender: string, newAdmin: string) {
    if (sender !== this.admin) return { error: 100 };
    if (newAdmin === 'ST000000000000000000002AMW42H') return { error: 101 };
    this.admin = newAdmin;
    return { value: true };
  }

  createVesting(sender: string, beneficiary: string, total: bigint, duration: number) {
    if (sender !== this.admin) return { error: 100 };
    if (this.vestings.has(beneficiary)) return { error: 102 };
    if (total === 0n || duration === 0) return { error: 105 };

    this.vestings.set(beneficiary, {
      total,
      released: 0n,
      start: this.blockHeight,
      duration
    });
    return { value: true };
  }

  getVesting(beneficiary: string) {
    const v = this.vestings.get(beneficiary);
    return v ?? null;
  }

  claim(sender: string) {
    const data = this.vestings.get(sender);
    if (!data) return { error: 103 };

    const elapsed = Math.min(this.blockHeight - data.start, data.duration);
    const claimable = (data.total * BigInt(elapsed)) / BigInt(data.duration);
    const unclaimed = claimable - data.released;

    if (unclaimed <= 0n) return { error: 104 };

    data.released += unclaimed;
    this.vestings.set(sender, data);
    return { value: unclaimed };
  }

  mineBlocks(n: number) {
    this.blockHeight += n;
  }

  reset() {
    this.admin = 'deployer';
    this.vestings.clear();
    this.blockHeight = 100;
  }
}

describe('Token Vesting Contract (mock)', () => {
  const contract = new MockTokenVesting();
  const user = 'wallet_1';
  const other = 'wallet_2';

  beforeEach(() => {
    contract.reset();
  });

  it('should allow admin to create a vesting schedule', () => {
    const result = contract.createVesting('deployer', user, 10000n, 100);
    expect(result).toEqual({ value: true });
  });

  it('should reject non-admin vesting creation', () => {
    const result = contract.createVesting('wallet_2', user, 10000n, 100);
    expect(result).toEqual({ error: 100 });
  });

  it('should prevent duplicate vesting schedules', () => {
    contract.createVesting('deployer', user, 10000n, 100);
    const result = contract.createVesting('deployer', user, 10000n, 100);
    expect(result).toEqual({ error: 102 });
  });

  it('should prevent zero value or duration', () => {
    const result1 = contract.createVesting('deployer', user, 0n, 100);
    const result2 = contract.createVesting('deployer', user, 10000n, 0);
    expect(result1).toEqual({ error: 105 });
    expect(result2).toEqual({ error: 105 });
  });

  it('should return correct vesting data', () => {
    contract.createVesting('deployer', user, 10000n, 100);
    const vest = contract.getVesting(user);
    expect(vest?.total).toBe(10000n);
    expect(vest?.released).toBe(0n);
    expect(vest?.start).toBe(100);
    expect(vest?.duration).toBe(100);
  });

  it('should not allow claiming too early', () => {
    contract.createVesting('deployer', user, 10000n, 100);
    const result = contract.claim(user);
    expect(result).toEqual({ error: 104 });
  });

  it('should allow partial claim after some blocks', () => {
    contract.createVesting('deployer', user, 10000n, 100);
    contract.mineBlocks(25);
    const result = contract.claim(user);
    expect(result).toEqual({ value: 2500n });
  });

  it('should allow full claim at end', () => {
    contract.createVesting('deployer', user, 10000n, 100);
    contract.mineBlocks(100);
    const result = contract.claim(user);
    expect(result).toEqual({ value: 10000n });
  });

  it('should not overclaim more than total', () => {
    contract.createVesting('deployer', user, 5000n, 50);
    contract.mineBlocks(50);
    const claim1 = contract.claim(user);
    const claim2 = contract.claim(user);
    expect(claim1).toEqual({ value: 5000n });
    expect(claim2).toEqual({ error: 104 });
  });

  it('should transfer admin', () => {
    const result = contract.setAdmin('deployer', other);
    expect(result).toEqual({ value: true });
    expect(contract.admin).toBe(other);
  });

  it('should reject admin transfer from non-admin', () => {
    const result = contract.setAdmin('wallet_3', user);
    expect(result).toEqual({ error: 100 });
  });

  it('should reject setting empty address as admin', () => {
    const result = contract.setAdmin('deployer', 'ST000000000000000000002AMW42H');
    expect(result).toEqual({ error: 101 });
  });
});
