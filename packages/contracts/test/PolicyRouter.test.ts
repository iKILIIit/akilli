import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import type { PolicyRouter } from "../typechain-types";

type VenuePolicyStruct = {
  enabled: boolean;
  executor: string;
  maxAmount: bigint;
  cooldownSeconds: number;
  maxQuoteAgeSeconds: number;
  minUserRiskScore: number;
  requiresRecipientMatch: boolean;
};

type ExecutionRequestStruct = {
  user: string;
  action: number;
  venueIdHash: string;
  token: string;
  amount: bigint;
  minOutputAmount: bigint;
  quoteTimestamp: number;
  quoteExpiresAt: number;
  maxSlippageBps: number;
  recipient: string;
};

const STAY_LIQUID = 0;

async function deployFixture() {
  const [owner, admin, user, other] = await ethers.getSigners();

  const PolicyRouter = await ethers.getContractFactory("PolicyRouter");
  const router = (await PolicyRouter.deploy(owner.address)) as unknown as PolicyRouter;
  await router.waitForDeployment();

  const MockToken = await ethers.getContractFactory("MockERC20");
  const token = await MockToken.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  return { router, token, tokenAddress, owner, admin, user, other };
}

function makeVenuePolicy(overrides: Partial<VenuePolicyStruct> = {}): VenuePolicyStruct {
  return {
    enabled: true,
    executor: "0x1000000000000000000000000000000000000001",
    maxAmount: ethers.parseUnits("10000", 6),
    cooldownSeconds: 0,
    maxQuoteAgeSeconds: 3600,
    minUserRiskScore: 0,
    requiresRecipientMatch: true,
    ...overrides
  };
}

async function makeRequest(
  router: PolicyRouter,
  user: string,
  tokenAddress: string,
  overrides: Partial<ExecutionRequestStruct> = {}
): Promise<ExecutionRequestStruct> {
  const venueIdHash = ethers.keccak256(ethers.toUtf8Bytes("wallet-liquid"));
  const now = await time.latest();
  return {
    user,
    action: STAY_LIQUID,
    venueIdHash,
    token: tokenAddress,
    amount: ethers.parseUnits("100", 6),
    minOutputAmount: ethers.parseUnits("100", 6),
    quoteTimestamp: now,
    quoteExpiresAt: now + 600,
    maxSlippageBps: 0,
    recipient: user,
    ...overrides
  };
}

describe("PolicyRouter", () => {
  describe("Deployment", () => {
    it("sets owner correctly on deployment", async () => {
      const { router, owner } = await loadFixture(deployFixture);
      expect(await router.owner()).to.equal(owner.address);
    });
  });

  describe("executePolicyAction — paused", () => {
    it("reverts with RouterPausedError when paused", async () => {
      const { router, tokenAddress, owner, user } = await loadFixture(deployFixture);
      await router.connect(owner).setPaused(true);
      const request = await makeRequest(router, user.address, tokenAddress);
      await expect(router.connect(user).executePolicyAction(request)).to.be.revertedWithCustomError(
        router,
        "RouterPausedError"
      );
    });
  });

  describe("executePolicyAction — token not allowed", () => {
    it("reverts with TokenNotAllowed when token is not in allowlist", async () => {
      const { router, tokenAddress, user } = await loadFixture(deployFixture);
      const request = await makeRequest(router, user.address, tokenAddress);
      await expect(router.connect(user).executePolicyAction(request)).to.be.revertedWithCustomError(
        router,
        "TokenNotAllowed"
      );
    });
  });

  describe("executePolicyAction — venue not enabled", () => {
    it("reverts with VenueNotEnabled when venue policy is not set", async () => {
      const { router, tokenAddress, owner, user } = await loadFixture(deployFixture);
      await router.connect(owner).setAllowedToken(tokenAddress, true);
      const request = await makeRequest(router, user.address, tokenAddress);
      await expect(router.connect(user).executePolicyAction(request)).to.be.revertedWithCustomError(
        router,
        "VenueNotEnabled"
      );
    });
  });

  describe("executePolicyAction — quote expired", () => {
    it("reverts with QuoteExpired when quoteExpiresAt is in the past", async () => {
      const { router, tokenAddress, owner, user } = await loadFixture(deployFixture);
      await router.connect(owner).setAllowedToken(tokenAddress, true);

      const venueIdHash = ethers.keccak256(ethers.toUtf8Bytes("wallet-liquid"));
      const policy = makeVenuePolicy();
      await router.connect(owner).setVenuePolicy(venueIdHash, policy);

      const now = await time.latest();
      const request = await makeRequest(router, user.address, tokenAddress, {
        venueIdHash,
        quoteTimestamp: now - 1200,
        quoteExpiresAt: now - 1
      });

      await expect(router.connect(user).executePolicyAction(request)).to.be.revertedWithCustomError(
        router,
        "QuoteExpired"
      );
    });
  });

  describe("executePolicyAction — risk score too low", () => {
    it("reverts with RiskScoreTooLow when user risk score is below minimum", async () => {
      const { router, tokenAddress, owner, user } = await loadFixture(deployFixture);
      await router.connect(owner).setAllowedToken(tokenAddress, true);

      const venueIdHash = ethers.keccak256(ethers.toUtf8Bytes("wallet-liquid"));
      const policy = makeVenuePolicy({ minUserRiskScore: 60 });
      await router.connect(owner).setVenuePolicy(venueIdHash, policy);

      const request = await makeRequest(router, user.address, tokenAddress, { venueIdHash });
      await expect(router.connect(user).executePolicyAction(request)).to.be.revertedWithCustomError(
        router,
        "RiskScoreTooLow"
      );
    });
  });

  describe("executePolicyAction — cooldown active", () => {
    it("reverts with CooldownActive after first execution within cooldown window", async () => {
      const { router, tokenAddress, owner, user } = await loadFixture(deployFixture);
      await router.connect(owner).setAllowedToken(tokenAddress, true);
      await router.connect(owner).setUserRiskScore(user.address, 100);

      const venueIdHash = ethers.keccak256(ethers.toUtf8Bytes("wallet-liquid"));
      const policy = makeVenuePolicy({ cooldownSeconds: 3600 });
      await router.connect(owner).setVenuePolicy(venueIdHash, policy);

      const request = await makeRequest(router, user.address, tokenAddress, { venueIdHash });
      await router.connect(user).executePolicyAction(request);

      const request2 = await makeRequest(router, user.address, tokenAddress, { venueIdHash });
      await expect(router.connect(user).executePolicyAction(request2)).to.be.revertedWithCustomError(
        router,
        "CooldownActive"
      );
    });
  });

  describe("executePolicyAction — recipient mismatch", () => {
    it("reverts with RecipientMismatch when recipient != user and requiresRecipientMatch=true", async () => {
      const { router, tokenAddress, owner, user, other } = await loadFixture(deployFixture);
      await router.connect(owner).setAllowedToken(tokenAddress, true);
      await router.connect(owner).setUserRiskScore(user.address, 100);

      const venueIdHash = ethers.keccak256(ethers.toUtf8Bytes("wallet-liquid"));
      const policy = makeVenuePolicy({ requiresRecipientMatch: true });
      await router.connect(owner).setVenuePolicy(venueIdHash, policy);

      const request = await makeRequest(router, user.address, tokenAddress, {
        venueIdHash,
        recipient: other.address
      });

      await expect(router.connect(user).executePolicyAction(request)).to.be.revertedWithCustomError(
        router,
        "RecipientMismatch"
      );
    });
  });

  describe("executePolicyAction — StayLiquid success", () => {
    it("succeeds for StayLiquid action and emits PolicyActionExecuted", async () => {
      const { router, tokenAddress, owner, user } = await loadFixture(deployFixture);
      await router.connect(owner).setAllowedToken(tokenAddress, true);
      await router.connect(owner).setUserRiskScore(user.address, 100);

      const venueIdHash = ethers.keccak256(ethers.toUtf8Bytes("wallet-liquid"));
      const policy = makeVenuePolicy();
      await router.connect(owner).setVenuePolicy(venueIdHash, policy);

      const request = await makeRequest(router, user.address, tokenAddress, { venueIdHash });

      await expect(router.connect(user).executePolicyAction(request))
        .to.emit(router, "PolicyActionExecuted")
        .withArgs(
          user.address,
          venueIdHash,
          STAY_LIQUID,
          tokenAddress,
          request.amount,
          user.address
        );
    });
  });

  describe("setPolicyAdmin", () => {
    it("allows owner to grant admin rights", async () => {
      const { router, owner, admin } = await loadFixture(deployFixture);
      await expect(router.connect(owner).setPolicyAdmin(admin.address, true))
        .to.emit(router, "PolicyAdminSet")
        .withArgs(admin.address, true);
      expect(await router.policyAdmins(admin.address)).to.be.true;
    });

    it("reverts when non-owner tries to set admin", async () => {
      const { router, user, admin } = await loadFixture(deployFixture);
      await expect(
        router.connect(user).setPolicyAdmin(admin.address, true)
      ).to.be.revertedWithCustomError(router, "NotOwner");
    });
  });

  describe("transferOwnership", () => {
    it("transfers owner correctly and emits OwnerTransferred", async () => {
      const { router, owner, other } = await loadFixture(deployFixture);
      await expect(router.connect(owner).transferOwnership(other.address))
        .to.emit(router, "OwnerTransferred")
        .withArgs(owner.address, other.address);
      expect(await router.owner()).to.equal(other.address);
    });

    it("reverts when non-owner tries to transfer ownership", async () => {
      const { router, user, other } = await loadFixture(deployFixture);
      await expect(
        router.connect(user).transferOwnership(other.address)
      ).to.be.revertedWithCustomError(router, "NotOwner");
    });
  });

  describe("executePolicyAction — amount exceeds max", () => {
    it("reverts with AmountExceedsMax when amount > policy maxAmount", async () => {
      const { router, tokenAddress, owner, user } = await loadFixture(deployFixture);
      await router.connect(owner).setAllowedToken(tokenAddress, true);
      await router.connect(owner).setUserRiskScore(user.address, 100);

      const venueIdHash = ethers.keccak256(ethers.toUtf8Bytes("wallet-liquid"));
      const policy = makeVenuePolicy({ maxAmount: ethers.parseUnits("50", 6) });
      await router.connect(owner).setVenuePolicy(venueIdHash, policy);

      const request = await makeRequest(router, user.address, tokenAddress, {
        venueIdHash,
        amount: ethers.parseUnits("100", 6)
      });
      await expect(router.connect(user).executePolicyAction(request)).to.be.revertedWithCustomError(
        router,
        "AmountExceedsVenueLimit"
      );
    });
  });

  describe("setVenuePolicy", () => {
    it("only policy admin can call setVenuePolicy", async () => {
      const { router, owner, admin, user } = await loadFixture(deployFixture);
      await router.connect(owner).setPolicyAdmin(admin.address, true);

      const venueIdHash = ethers.keccak256(ethers.toUtf8Bytes("test-venue"));
      const policy = makeVenuePolicy();

      await expect(router.connect(admin).setVenuePolicy(venueIdHash, policy)).to.emit(
        router,
        "VenuePolicySet"
      );

      await expect(
        router.connect(user).setVenuePolicy(venueIdHash, policy)
      ).to.be.revertedWithCustomError(router, "NotPolicyAdmin");
    });
  });
});
