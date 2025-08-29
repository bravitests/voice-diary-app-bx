// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title VoiceDiarySubscription
 * @dev Smart contract for managing Voice Diary Pro subscriptions on Base
 */
contract VoiceDiarySubscription is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    // Subscription tiers
    enum SubscriptionTier { FREE, PRO }
    
    // Subscription duration in seconds (30 days)
    uint256 public constant SUBSCRIPTION_DURATION = 30 days;
    
    // Pro subscription price in wei (0.01 ETH)
    uint256 public proPrice = 0.01 ether;
    
    // Counter for subscription IDs
    Counters.Counter private _subscriptionIds;
    
    // Subscription struct
    struct Subscription {
        uint256 id;
        address user;
        SubscriptionTier tier;
        uint256 startTime;
        uint256 endTime;
        bool active;
        uint256 amountPaid;
    }
    
    // Mappings
    mapping(address => Subscription) public userSubscriptions;
    mapping(uint256 => Subscription) public subscriptions;
    mapping(address => bool) public hasActiveSubscription;
    
    // Events
    event SubscriptionCreated(
        uint256 indexed subscriptionId,
        address indexed user,
        SubscriptionTier tier,
        uint256 startTime,
        uint256 endTime,
        uint256 amountPaid
    );
    
    event SubscriptionCancelled(
        uint256 indexed subscriptionId,
        address indexed user
    );
    
    event SubscriptionExpired(
        uint256 indexed subscriptionId,
        address indexed user
    );
    
    event PriceUpdated(uint256 newPrice);
    
    event FundsWithdrawn(address indexed owner, uint256 amount);
    
    constructor() {}
    
    /**
     * @dev Subscribe to Pro tier
     */
    function subscribeToPro() external payable nonReentrant {
        require(msg.value >= proPrice, "Insufficient payment");
        require(!hasActiveSubscription[msg.sender], "Already has active subscription");
        
        _subscriptionIds.increment();
        uint256 subscriptionId = _subscriptionIds.current();
        
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + SUBSCRIPTION_DURATION;
        
        Subscription memory newSubscription = Subscription({
            id: subscriptionId,
            user: msg.sender,
            tier: SubscriptionTier.PRO,
            startTime: startTime,
            endTime: endTime,
            active: true,
            amountPaid: msg.value
        });
        
        userSubscriptions[msg.sender] = newSubscription;
        subscriptions[subscriptionId] = newSubscription;
        hasActiveSubscription[msg.sender] = true;
        
        emit SubscriptionCreated(
            subscriptionId,
            msg.sender,
            SubscriptionTier.PRO,
            startTime,
            endTime,
            msg.value
        );
        
        // Refund excess payment
        if (msg.value > proPrice) {
            payable(msg.sender).transfer(msg.value - proPrice);
        }
    }
    
    /**
     * @dev Cancel active subscription
     */
    function cancelSubscription() external {
        require(hasActiveSubscription[msg.sender], "No active subscription");
        
        Subscription storage subscription = userSubscriptions[msg.sender];
        require(subscription.active, "Subscription already cancelled");
        
        subscription.active = false;
        hasActiveSubscription[msg.sender] = false;
        
        // Update the subscription in the mapping
        subscriptions[subscription.id] = subscription;
        
        emit SubscriptionCancelled(subscription.id, msg.sender);
    }
    
    /**
     * @dev Check if user has active subscription
     */
    function isSubscriptionActive(address user) external view returns (bool) {
        if (!hasActiveSubscription[user]) {
            return false;
        }
        
        Subscription memory subscription = userSubscriptions[user];
        return subscription.active && block.timestamp <= subscription.endTime;
    }
    
    /**
     * @dev Get user's subscription details
     */
    function getUserSubscription(address user) external view returns (Subscription memory) {
        return userSubscriptions[user];
    }
    
    /**
     * @dev Get subscription by ID
     */
    function getSubscription(uint256 subscriptionId) external view returns (Subscription memory) {
        return subscriptions[subscriptionId];
    }
    
    /**
     * @dev Check if subscription has expired and mark it
     */
    function checkAndExpireSubscription(address user) external {
        require(hasActiveSubscription[user], "No active subscription");
        
        Subscription storage subscription = userSubscriptions[user];
        require(subscription.active, "Subscription already inactive");
        require(block.timestamp > subscription.endTime, "Subscription not yet expired");
        
        subscription.active = false;
        hasActiveSubscription[user] = false;
        
        // Update the subscription in the mapping
        subscriptions[subscription.id] = subscription;
        
        emit SubscriptionExpired(subscription.id, user);
    }
    
    /**
     * @dev Update Pro subscription price (owner only)
     */
    function updateProPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be greater than 0");
        proPrice = newPrice;
        emit PriceUpdated(newPrice);
    }
    
    /**
     * @dev Withdraw contract funds (owner only)
     */
    function withdrawFunds() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        payable(owner()).transfer(balance);
        emit FundsWithdrawn(owner(), balance);
    }
    
    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get total number of subscriptions
     */
    function getTotalSubscriptions() external view returns (uint256) {
        return _subscriptionIds.current();
    }
    
    /**
     * @dev Emergency function to pause contract (owner only)
     */
    function emergencyPause() external onlyOwner {
        // In a production contract, you might want to implement a pause mechanism
        // For now, this is a placeholder for emergency functionality
    }
}
