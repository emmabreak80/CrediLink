import { describe, it, expect, beforeEach } from "vitest";

class MockDaoContract {
  admin = "STADMIN";
  paused = false;
  proposalCounter = 0n;
  proposals = new Map<number, any>();
  voted = new Map<string, boolean>();
  stakeBalances = new Map<string, bigint>();
  blockHeight = 100n;

  stake(sender: string, amount: bigint) {
    if (this.paused) return { error: 101 };
    const balance = this.stakeBalances.get(sender) || 0n;
    this.stakeBalances.set(sender, balance + amount);
    return { value: true };
  }

  propose(sender: string, description: string) {
    if (this.paused) return { error: 101 };
    const id = ++this.proposalCounter;
    this.proposals.set(Number(id), {
      proposer: sender,
      description,
      votesFor: 0n,
      votesAgainst: 0n,
      startBlock: this.blockHeight + 10n,
      executed: false,
    });
    return { value: id };
  }

  vote(sender: string, id: number, support: boolean) {
    if (this.paused) return { error: 101 };
    const key = `${id}-${sender}`;
    if (this.voted.get(key)) return { error: 104 };
    const proposal = this.proposals.get(id);
    if (!proposal) return { error: 102 };
    if (this.blockHeight < proposal.startBlock) return { error: 103 };

    const weight = this.stakeBalances.get(sender) || 0n;
    if (support) proposal.votesFor += weight;
    else proposal.votesAgainst += weight;

    this.voted.set(key, true);
    return { value: true };
  }

  execute(id: number) {
    const proposal = this.proposals.get(id);
    if (!proposal) return { error: 102 };
    if (proposal.executed) return { error: 103 };
    if (proposal.votesFor < 1000n) return { error: 105 };
    proposal.executed = true;
    return { value: true };
  }

  setPaused(sender: string, val: boolean) {
    if (sender !== this.admin) return { error: 100 };
    this.paused = val;
    return { value: true };
  }

  setAdmin(sender: string, newAdmin: string) {
    if (sender !== this.admin) return { error: 100 };
    this.admin = newAdmin;
    return { value: true };
  }
}

describe("DAO Governance Contract (mock)", () => {
  let dao: MockDaoContract;
  const admin = "STADMIN";
  const user = "STUSER";

  beforeEach(() => {
    dao = new MockDaoContract();
  });

  it("should allow staking", () => {
    const res = dao.stake(user, 1500n);
    expect(res).toEqual({ value: true });
    expect(dao.stakeBalances.get(user)).toBe(1500n);
  });

  it("should allow proposal creation", () => {
    const res = dao.propose(user, "Add feature X");
    expect(res).toEqual({ value: 1n }); // Fixed: match bigint
    });


  it("should reject voting before start block", () => {
    dao.stake(user, 1000n);
    const { value: pid } = dao.propose(user, "Change rule");
    const vote = dao.vote(user, Number(pid), true);
    expect(vote).toEqual({ error: 103 });
  });

  it("should allow voting after delay", () => {
    dao.stake(user, 1500n);
    const { value: pid } = dao.propose(user, "Enable rewards");
    dao.blockHeight += 11n;
    const res = dao.vote(user, Number(pid), true);
    expect(res).toEqual({ value: true });
  });

  it("should prevent double voting", () => {
    dao.stake(user, 2000n);
    const { value: pid } = dao.propose(user, "Test vote");
    dao.blockHeight += 20n;
    dao.vote(user, Number(pid), true);
    const res = dao.vote(user, Number(pid), false);
    expect(res).toEqual({ error: 104 });
  });

  it("should reject execution if quorum not met", () => {
    dao.stake(user, 500n);
    const { value: pid } = dao.propose(user, "Do thing");
    dao.blockHeight += 20n;
    dao.vote(user, Number(pid), true);
    const res = dao.execute(Number(pid));
    expect(res).toEqual({ error: 105 });
  });

  it("should execute proposal after quorum", () => {
    dao.stake(user, 2000n);
    const { value: pid } = dao.propose(user, "Deploy DAO");
    dao.blockHeight += 20n;
    dao.vote(user, Number(pid), true);
    const res = dao.execute(Number(pid));
    expect(res).toEqual({ value: true });
  });

  it("should allow pausing by admin", () => {
    const res = dao.setPaused(admin, true);
    expect(res).toEqual({ value: true });
    expect(dao.paused).toBe(true);
  });

  it("should prevent non-admin from pausing", () => {
    const res = dao.setPaused(user, true);
    expect(res).toEqual({ error: 100 });
  });

  it("should transfer admin role", () => {
    const res = dao.setAdmin(admin, user);
    expect(res).toEqual({ value: true });
    expect(dao.admin).toBe(user);
  });
});
