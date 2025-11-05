// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SubscriptionManager
 * @notice Manages recurring subscriptions, micropayments, and creator tips using USDC on Arc
 * @dev Optimized for Arc blockchain with USDC as native gas token
 */
contract SubscriptionManager is ReentrancyGuard, Ownable {
    
    // USDC token interface
    IERC20 public immutable usdcToken;
    
    // Platform fee (in basis points, e.g., 250 = 2.5%)
    uint256 public platformFee = 250;
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    // Subscription structure
    struct Subscription {
        address subscriber;
        address creator;
        uint256 amount;
        uint256 interval; // in seconds (e.g., 30 days = 2592000)
        uint256 nextPaymentDue;
        bool active;
        uint256 totalPaid;
        uint256 paymentsCount;
    }
    
    // Escrow for content micropayments
    struct Escrow {
        address payer;
        address creator;
        uint256 amount;
        uint256 createdAt;
        bool released;
        string contentId;
    }
    
    // Mappings
    mapping(bytes32 => Subscription) public subscriptions;
    mapping(address => bytes32[]) public userSubscriptions;
    mapping(address => bytes32[]) public creatorSubscriptions;
    mapping(bytes32 => Escrow) public escrows;
    mapping(address => uint256) public creatorBalances;
    mapping(address => uint256) public totalTipsReceived;
    
    // Events
    event SubscriptionCreated(
        bytes32 indexed subscriptionId,
        address indexed subscriber,
        address indexed creator,
        uint256 amount,
        uint256 interval
    );
    
    event SubscriptionPaymentProcessed(
        bytes32 indexed subscriptionId,
        address indexed subscriber,
        address indexed creator,
        uint256 amount,
        uint256 nextPaymentDue
    );
    
    event SubscriptionCancelled(
        bytes32 indexed subscriptionId,
        address indexed subscriber,
        address indexed creator
    );
    
    event TipSent(
        address indexed from,
        address indexed to,
        uint256 amount,
        string contentId
    );
    
    event MicropaymentEscrowed(
        bytes32 indexed escrowId,
        address indexed payer,
        address indexed creator,
        uint256 amount,
        string contentId
    );
    
    event MicropaymentReleased(
        bytes32 indexed escrowId,
        address indexed creator,
        uint256 amount
    );
    
    event CreatorWithdrawal(
        address indexed creator,
        uint256 amount
    );
    
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    
    /**
     * @notice Constructor
     * @param _usdcToken Address of USDC token on Arc
     */
    constructor(address _usdcToken) Ownable(msg.sender) {
        require(_usdcToken != address(0), "Invalid USDC address");
        usdcToken = IERC20(_usdcToken);
    }
    
    /**
     * @notice Create a new subscription
     * @param creator Address of the content creator
     * @param amount Subscription amount in USDC (6 decimals)
     * @param interval Payment interval in seconds (e.g., 30 days)
     * @return subscriptionId Unique identifier for the subscription
     */
    function createSubscription(
        address creator,
        uint256 amount,
        uint256 interval
    ) external nonReentrant returns (bytes32) {
        require(creator != address(0), "Invalid creator address");
        require(amount > 0, "Amount must be greater than 0");
        require(interval >= 1 days, "Interval must be at least 1 day");
        
        // Generate unique subscription ID
        bytes32 subscriptionId = keccak256(
            abi.encodePacked(msg.sender, creator, block.timestamp, amount)
        );
        
        require(subscriptions[subscriptionId].subscriber == address(0), "Subscription already exists");
        
        // Process first payment
        uint256 platformCut = (amount * platformFee) / FEE_DENOMINATOR;
        uint256 creatorAmount = amount - platformCut;
        
        require(
            usdcToken.transferFrom(msg.sender, address(this), amount),
            "USDC transfer failed"
        );
        
        creatorBalances[creator] += creatorAmount;
        
        // Create subscription
        subscriptions[subscriptionId] = Subscription({
            subscriber: msg.sender,
            creator: creator,
            amount: amount,
            interval: interval,
            nextPaymentDue: block.timestamp + interval,
            active: true,
            totalPaid: amount,
            paymentsCount: 1
        });
        
        userSubscriptions[msg.sender].push(subscriptionId);
        creatorSubscriptions[creator].push(subscriptionId);
        
        emit SubscriptionCreated(subscriptionId, msg.sender, creator, amount, interval);
        emit SubscriptionPaymentProcessed(
            subscriptionId,
            msg.sender,
            creator,
            amount,
            block.timestamp + interval
        );
        
        return subscriptionId;
    }
    
    /**
     * @notice Process subscription payment (can be called by anyone)
     * @param subscriptionId The subscription to process
     */
    function processSubscriptionPayment(bytes32 subscriptionId) external nonReentrant {
        Subscription storage sub = subscriptions[subscriptionId];
        
        require(sub.active, "Subscription not active");
        require(block.timestamp >= sub.nextPaymentDue, "Payment not due yet");
        
        // Process payment
        uint256 platformCut = (sub.amount * platformFee) / FEE_DENOMINATOR;
        uint256 creatorAmount = sub.amount - platformCut;
        
        require(
            usdcToken.transferFrom(sub.subscriber, address(this), sub.amount),
            "USDC transfer failed"
        );
        
        creatorBalances[sub.creator] += creatorAmount;
        
        // Update subscription
        sub.nextPaymentDue = block.timestamp + sub.interval;
        sub.totalPaid += sub.amount;
        sub.paymentsCount += 1;
        
        emit SubscriptionPaymentProcessed(
            subscriptionId,
            sub.subscriber,
            sub.creator,
            sub.amount,
            sub.nextPaymentDue
        );
    }
    
    /**
     * @notice Cancel a subscription
     * @param subscriptionId The subscription to cancel
     */
    function cancelSubscription(bytes32 subscriptionId) external {
        Subscription storage sub = subscriptions[subscriptionId];
        
        require(
            msg.sender == sub.subscriber || msg.sender == owner(),
            "Not authorized"
        );
        require(sub.active, "Subscription already inactive");
        
        sub.active = false;
        
        emit SubscriptionCancelled(subscriptionId, sub.subscriber, sub.creator);
    }
    
    /**
     * @notice Send a tip to a creator
     * @param creator Address of the creator
     * @param amount Tip amount in USDC
     * @param contentId Optional content identifier
     */
    function sendTip(
        address creator,
        uint256 amount,
        string calldata contentId
    ) external nonReentrant {
        require(creator != address(0), "Invalid creator address");
        require(amount > 0, "Amount must be greater than 0");
        
        uint256 platformCut = (amount * platformFee) / FEE_DENOMINATOR;
        uint256 creatorAmount = amount - platformCut;
        
        require(
            usdcToken.transferFrom(msg.sender, address(this), amount),
            "USDC transfer failed"
        );
        
        creatorBalances[creator] += creatorAmount;
        totalTipsReceived[creator] += amount;
        
        emit TipSent(msg.sender, creator, amount, contentId);
    }
    
    /**
     * @notice Create escrow for micropayment (e.g., pay-per-view content)
     * @param creator Content creator address
     * @param amount Payment amount
     * @param contentId Content identifier
     * @return escrowId Unique escrow identifier
     */
    function createMicropaymentEscrow(
        address creator,
        uint256 amount,
        string calldata contentId
    ) external nonReentrant returns (bytes32) {
        require(creator != address(0), "Invalid creator address");
        require(amount > 0, "Amount must be greater than 0");
        
        bytes32 escrowId = keccak256(
            abi.encodePacked(msg.sender, creator, contentId, block.timestamp)
        );
        
        require(escrows[escrowId].payer == address(0), "Escrow already exists");
        
        require(
            usdcToken.transferFrom(msg.sender, address(this), amount),
            "USDC transfer failed"
        );
        
        escrows[escrowId] = Escrow({
            payer: msg.sender,
            creator: creator,
            amount: amount,
            createdAt: block.timestamp,
            released: false,
            contentId: contentId
        });
        
        emit MicropaymentEscrowed(escrowId, msg.sender, creator, amount, contentId);
        
        return escrowId;
    }
    
    /**
     * @notice Release escrowed payment to creator
     * @param escrowId The escrow to release
     */
    function releaseMicropayment(bytes32 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        
        require(
            msg.sender == escrow.payer || msg.sender == owner(),
            "Not authorized"
        );
        require(!escrow.released, "Already released");
        
        uint256 platformCut = (escrow.amount * platformFee) / FEE_DENOMINATOR;
        uint256 creatorAmount = escrow.amount - platformCut;
        
        escrow.released = true;
        creatorBalances[escrow.creator] += creatorAmount;
        
        emit MicropaymentReleased(escrowId, escrow.creator, creatorAmount);
    }
    
    /**
     * @notice Creator withdraws accumulated balance
     */
    function withdrawCreatorBalance() external nonReentrant {
        uint256 balance = creatorBalances[msg.sender];
        require(balance > 0, "No balance to withdraw");
        
        creatorBalances[msg.sender] = 0;
        
        require(
            usdcToken.transfer(msg.sender, balance),
            "USDC transfer failed"
        );
        
        emit CreatorWithdrawal(msg.sender, balance);
    }
    
    /**
     * @notice Get user's active subscriptions
     * @param user User address
     * @return Array of subscription IDs
     */
    function getUserSubscriptions(address user) external view returns (bytes32[] memory) {
        return userSubscriptions[user];
    }
    
    /**
     * @notice Get creator's subscriptions
     * @param creator Creator address
     * @return Array of subscription IDs
     */
    function getCreatorSubscriptions(address creator) external view returns (bytes32[] memory) {
        return creatorSubscriptions[creator];
    }
    
    /**
     * @notice Check if subscription payment is due
     * @param subscriptionId Subscription ID
     * @return bool True if payment is due
     */
    function isPaymentDue(bytes32 subscriptionId) external view returns (bool) {
        Subscription storage sub = subscriptions[subscriptionId];
        return sub.active && block.timestamp >= sub.nextPaymentDue;
    }
    
    /**
     * @notice Update platform fee (owner only)
     * @param newFee New fee in basis points
     */
    function updatePlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee cannot exceed 10%");
        uint256 oldFee = platformFee;
        platformFee = newFee;
        emit PlatformFeeUpdated(oldFee, newFee);
    }
    
    /**
     * @notice Withdraw platform fees (owner only)
     * @param amount Amount to withdraw
     */
    function withdrawPlatformFees(uint256 amount) external onlyOwner nonReentrant {
        require(
            usdcToken.transfer(owner(), amount),
            "USDC transfer failed"
        );
    }
}
