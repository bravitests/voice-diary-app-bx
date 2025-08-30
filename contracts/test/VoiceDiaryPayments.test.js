const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VoiceDiaryPayments", function () {
  let contract;
  let owner;
  let user1;
  let user2;
  
  const PRO_PRICE = ethers.parseEther("0.01");
  const PRO_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const VoiceDiaryPayments = await ethers.getContractFactory("VoiceDiaryPayments");
    contract = await VoiceDiaryPayments.deploy();
    await contract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("Should set the correct PRO price", async function () {
      expect(await contract.subscriptionPrices(1)).to.equal(PRO_PRICE);
    });
  });

  describe("Subscription Purchase", function () {
    it("Should allow user to purchase PRO subscription", async function () {
      await expect(
        contract.connect(user1).purchaseProSubscription({ value: PRO_PRICE })
      ).to.emit(contract, "SubscriptionPurchased");

      expect(await contract.hasActiveProSubscription(user1.address)).to.be.true;
    });

    it("Should reject insufficient payment", async function () {
      const insufficientAmount = ethers.parseEther("0.005");
      
      await expect(
        contract.connect(user1).purchaseProSubscription({ value: insufficientAmount })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should refund excess payment", async function () {
      const excessAmount = ethers.parseEther("0.02");
      const initialBalance = await ethers.provider.getBalance(user1.address);
      
      const tx = await contract.connect(user1).purchaseProSubscription({ value: excessAmount });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const finalBalance = await ethers.provider.getBalance(user1.address);
      const expectedBalance = initialBalance - PRO_PRICE - gasUsed;
      
      expect(finalBalance).to.be.closeTo(expectedBalance, ethers.parseEther("0.001"));
    });

    it("Should extend existing subscription", async function () {
      // First purchase
      await contract.connect(user1).purchaseProSubscription({ value: PRO_PRICE });
      const firstSub = await contract.getUserSubscription(user1.address);
      
      // Second purchase (should extend)
      await contract.connect(user1).purchaseProSubscription({ value: PRO_PRICE });
      const secondSub = await contract.getUserSubscription(user1.address);
      
      expect(secondSub.expiryTimestamp).to.be.greaterThan(firstSub.expiryTimestamp);
    });
  });

  describe("Subscription Status", function () {
    beforeEach(async function () {
      await contract.connect(user1).purchaseProSubscription({ value: PRO_PRICE });
    });

    it("Should return correct subscription details", async function () {
      const sub = await contract.getUserSubscription(user1.address);
      
      expect(sub.tier).to.equal(1); // PRO tier
      expect(sub.isActive).to.be.true;
      expect(sub.isExpired).to.be.false;
      expect(sub.expiryTimestamp).to.be.greaterThan(Math.floor(Date.now() / 1000));
    });

    it("Should calculate time remaining correctly", async function () {
      const timeRemaining = await contract.getTimeRemaining(user1.address);
      expect(timeRemaining).to.be.greaterThan(PRO_DURATION - 60); // Allow for some execution time
    });
  });

  describe("Owner Functions", function () {
    beforeEach(async function () {
      await contract.connect(user1).purchaseProSubscription({ value: PRO_PRICE });
    });

    it("Should allow owner to withdraw payments", async function () {
      const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
      
      await expect(contract.withdrawPayments())
        .to.emit(contract, "PaymentWithdrawn")
        .withArgs(owner.address, PRO_PRICE);
      
      const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
      expect(finalOwnerBalance).to.be.greaterThan(initialOwnerBalance);
    });

    it("Should allow owner to update prices", async function () {
      const newPrice = ethers.parseEther("0.02");
      
      await expect(contract.updatePrice(1, newPrice))
        .to.emit(contract, "PriceUpdated")
        .withArgs(1, newPrice);
      
      expect(await contract.subscriptionPrices(1)).to.equal(newPrice);
    });

    it("Should allow owner to cancel subscriptions", async function () {
      await contract.cancelSubscription(user1.address);
      
      const sub = await contract.getUserSubscription(user1.address);
      expect(sub.isActive).to.be.false;
    });

    it("Should not allow non-owner to withdraw", async function () {
      await expect(
        contract.connect(user1).withdrawPayments()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Security", function () {
    it("Should reject direct ETH transfers", async function () {
      await expect(
        user1.sendTransaction({
          to: await contract.getAddress(),
          value: PRO_PRICE
        })
      ).to.be.revertedWith("Direct payments not allowed. Use purchaseProSubscription()");
    });

    it("Should pause and unpause correctly", async function () {
      await contract.pause();
      
      await expect(
        contract.connect(user1).purchaseProSubscription({ value: PRO_PRICE })
      ).to.be.revertedWith("Pausable: paused");
      
      await contract.unpause();
      
      await expect(
        contract.connect(user1).purchaseProSubscription({ value: PRO_PRICE })
      ).to.not.be.reverted;
    });
  });
});