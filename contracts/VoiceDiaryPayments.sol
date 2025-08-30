// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title VoiceDiaryPayments
 * @dev Smart contract for handling VoiceDiary subscription payments
 */
contract VoiceDiaryPayments is Ownable, ReentrancyGuard, Pausable {
    
    // Subscription tiers
    enum SubscriptionTier { FREE, PRO }
    
    // Subscription details
    struct Subscription {
        SubscriptionTier tier;
        uint256 expiryTimestamp;
        bool isActive;
    }
    
    // Events
    event SubscriptionPurchased(
        address indexed user,
        SubscriptionTier tier,
        uint256 amount,
        uint256 expiryTimestamp
    );
    
    event PaymentWithdrawn(address indexed owner, uint256 amount);
    event PriceUpdated(SubscriptionTier tier, uint256 newPrice);
    
    // State variables
    mapping(address => Subscription) public subscriptions;
    mapping(SubscriptionTier => uint256) public subscriptionPrices;
    
    // Constants
    uint256 public constant PRO_DURATION = 30 days;
    
    constructor() {
        // Set initial prices (in wei)
        // PRO: 0.01 ETH per month
        subscriptionPrices[SubscriptionTier.PRO] = 0.01 ether;
    }
    
    /**
     * @dev Purchase a PRO subscription
     */
    function purchaseProSubscription() external payable nonReentrant whenNotPaused {
        require(msg.value >= subscriptionPrices[SubscriptionTier.PRO], "Insufficient payment");
        
        address user = msg.sender;
        uint256 currentExpiry = subscriptions[user].expiryTimestamp;
        uint256 newExpiry;
        
        // If user has an active subscription, extend it
        if (currentExpiry > block.timestamp) {
            newExpiry = currentExpiry + PRO_DURATION;
        } else {
            newExpiry = block.timestamp + PRO_DURATION;
        }
        
        subscriptions[user] = Subscription({
            tier: SubscriptionTier.PRO,
            expiryTimestamp: newExpiry,
            isActive: true
        });
        
        emit SubscriptionPurchased(user, SubscriptionTier.PRO, msg.value, newExpiry);
        
        // Refund excess payment
        if (msg.value > subscriptionPrices[SubscriptionTier.PRO]) {
            payable(user).transfer(msg.value - subscriptionPrices[SubscriptionTier.PRO]);
        }
    }
    
    /**
     * @dev Check if user has active PRO subscription
     */
    function hasActiveProSubscription(address user) external view returns (bool) {
        Subscription memory sub = subscriptions[user];
        return sub.tier == SubscriptionTier.PRO && 
               sub.isActive && 
               sub.expiryTimestamp > block.timestamp;
    }
    
    /**
     * @dev Get user's subscription details
     */
    function getUserSubscription(address user) external view returns (
        SubscriptionTier tier,
        uint256 expiryTimestamp,
        bool isActive,
        bool isExpired
    ) {
        Subscription memory sub = subscriptions[user];
        return (
            sub.tier,
            sub.expiryTimestamp,
            sub.isActive,
            sub.expiryTimestamp <= block.timestamp
        );
    }
    
    /**
     * @dev Get time remaining on subscription
     */
    function getTimeRemaining(address user) external view returns (uint256) {
        Subscription memory sub = subscriptions[user];
        if (!sub.isActive || sub.expiryTimestamp <= block.timestamp) {
            return 0;
        }
        return sub.expiryTimestamp - block.timestamp;
    }
    
    /**
     * @dev Owner can withdraw collected payments
     */
    function withdrawPayments() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        payable(owner()).transfer(balance);
        emit PaymentWithdrawn(owner(), balance);
    }
    
    /**
     * @dev Owner can update subscription prices
     */
    function updatePrice(SubscriptionTier tier, uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be greater than 0");
        subscriptionPrices[tier] = newPrice;
        emit PriceUpdated(tier, newPrice);
    }
    
    /**
     * @dev Owner can pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Owner can unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Emergency function to cancel a subscription (owner only)
     */
    function cancelSubscription(address user) external onlyOwner {
        subscriptions[user].isActive = false;
    }
    
    /**
     * @dev Fallback function to reject direct ETH transfers
     */
    receive() external payable {
        revert("Direct payments not allowed. Use purchaseProSubscription()");
    }
}