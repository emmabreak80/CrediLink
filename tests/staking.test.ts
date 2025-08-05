import { describe, it, expect, beforeEach } from 'vitest';

class MockStakingContract {
  admin = 'SP000000000000000000002Q6VF78';
  paused = false;
  rewardRate = 1n;

  stakedAmount = new Map<string, bigint>();
  lastStakedBlock = new Map<string, number>();
  rewards = new Map<string, bigint>();

  blockHeight = 1000;

  setAdmin(sender: string, newAdmin: string) {
    if (sender !== this.admin) return { error: 100 };
    if (newAdmin === 'ST000000000000000000002AMW42H') return { error: 103 };
    this.admin = newAdmin;
    return { value: true };
  }

  setPaused(sender: string, pause: boolean) {
    if (sender !== this.admin) return { error: 100 };
    this.paused = pause;
    return { value: true };
  }

  setRewardRate(sender: string, rate: bigint) {
    if (sender !== this.admin) return { error: 100 };
    this.rewardRate = rate;
    return { value: true };
  }

  updateReward(user: string) {
    const last = this.lastStakedBlock.get(user) ?? 0;
    const staked = this.stakedAmount.get(user) ?? 0n;
    const blocks = BigInt(this.blockHeight - last);
    const pending = staked * blocks * this.rewardRate;
    const existing = this.rewards.get(user) ?? 0n;

    this.rewards.set(user, existing + pending);
    this.lastStakedBlock.set(user, this.blockHeight);
  }

  stake(sender: string, amount: bigint) {
    if (this.paused) return { error: 101 };
    if (amount === 0n) return { error: 103 };

    this.updateReward(sender);
    const current = this.stakedAmount.get(sender) ?? 0n;
    this.stakedAmount.set(sender, current + amount);
    return { value: true };
  }

  unstake(sender: string, amount: bigint) {
    const current = this.stakedAmount.get(sender) ?? 0n;
    if (current < amount) return { error: 102 };

    this.updateReward(sender);
    this.stakedAmount.set(sender, current - amount);
    return { value: true };
  }

  claim(sender: string) {
    const reward = this.rewards.get(sender) ?? 0n;
    if (reward === 0n) return { error: 0 };

    this.rewards.set(sender, 0n);
    return { value: reward };
  }
}

describe('Staking Contract (mock)', () => {
  let contract: MockStakingContract;
  const admin = 'SP000000000000000000002Q6VF78';
  const user = 'SP123';

  beforeEach(() => {
    contract = new MockStakingContract();
  });

  it('should allow staking', () => {
    const result = contract.stake(user, 100n);
    expect(result).toEqual({ value: true });
    expect(contract.stakedAmount.get(user)).toBe(100n);
  });

  it('should prevent staking when paused', () => {
    contract.setPaused(admin, true);
    const result = contract.stake(user, 50n);
    expect(result).toEqual({ error: 101 });
  });

  it('should not allow zero stake', () => {
    const result = contract.stake(user, 0n);
    expect(result).toEqual({ error: 103 });
  });

  it('should accumulate rewards on stake', () => {
    contract.stake(user, 100n);
    contract.blockHeight += 10;
    contract.stake(user, 100n);
    expect(contract.rewards.get(user)).toBe(100n * 10n * 1n);
  });

  it('should allow unstaking', () => {
    contract.stake(user, 100n);
    const result = contract.unstake(user, 40n);
    expect(result).toEqual({ value: true });
    expect(contract.stakedAmount.get(user)).toBe(60n);
  });

  it('should prevent over-unstaking', () => {
    const result = contract.unstake(user, 50n);
    expect(result).toEqual({ error: 102 });
  });

  it('should allow claiming rewards', () => {
  contract.stake(user, 100n);
  contract.blockHeight += 20;
  contract.updateReward(user); // ⬅️ manual trigger
  const result = contract.claim(user);
  expect(result).toEqual({ value: 100n * 20n * 1n });
  expect(contract.rewards.get(user)).toBe(0n);
});

  it('should not claim when no rewards', () => {
    const result = contract.claim(user);
    expect(result).toEqual({ error: 0 });
  });

  it('should allow admin to set paused', () => {
    const result = contract.setPaused(admin, true);
    expect(result).toEqual({ value: true });
    expect(contract.paused).toBe(true);
  });

  it('should prevent non-admin from setting paused', () => {
    const result = contract.setPaused(user, true);
    expect(result).toEqual({ error: 100 });
  });

  it('should transfer admin role', () => {
    const result = contract.setAdmin(admin, 'SP999');
    expect(result).toEqual({ value: true });
    expect(contract.admin).toBe('SP999');
  });

  it('should reject empty address for admin', () => {
    const result = contract.setAdmin(admin, 'ST000000000000000000002AMW42H');
    expect(result).toEqual({ error: 103 });
  });
});
