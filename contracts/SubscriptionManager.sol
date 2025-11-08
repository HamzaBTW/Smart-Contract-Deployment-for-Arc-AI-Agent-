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
    
    // 🤖 AI Agent wallet address - only this wallet can trigger automated payments
    address public agentWallet;
    
    // Platform fee (in basis points, e.g., 250 = 2.5%)
    uint256 public platformFee = 250;
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    // Custom errors for gas efficiency
    error UnauthorizedAgent();
    error UnauthorizedUser();
    error InvalidAddress();
    error InvalidAmount();
    error InvalidInterval();
    error SubscriptionNotActive();
    error SubscriptionAlreadyExists();
    error PaymentNotDue();
    error NoBalanceToWithdraw();
    error TransferFailed();
    error EscrowAlreadyExists();
    error EscrowAlreadyReleased();
    
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
    
    event AgentWalletUpdated(
        address indexed oldAgent,
        address indexed newAgent
    );
    
    // 🔐 Modifier: Only AI agent can call
    modifier onlyAgent() {
        if (msg.sender != agentWallet) revert UnauthorizedAgent();
        _;
    }
    
    // 🔐 Modifier: Only subscription owner can call
    modifier onlySubscriber(bytes32 subscriptionId) {
        if (msg.sender != subscriptions[subscriptionId].subscriber) revert UnauthorizedUser();
        _;
    }
    
    /**
     * @notice Constructor
     * @param _usdcToken Address of USDC token on Arc
     * @param _agentWallet Address of AI agent wallet that will trigger automated payments
     */
    constructor(address _usdcToken, address _agentWallet) Ownable(msg.sender) {
        if (_usdcToken == address(0)) revert InvalidAddress();
        if (_agentWallet == address(0)) revert InvalidAddress();
        usdcToken = IERC20(_usdcToken);
        agentWallet = _agentWallet;
        emit AgentWalletUpdated(address(0), _agentWallet);
    }
    
    /**
     * @notice Update the AI agent wallet address
     * @dev Only owner can change this - important security control
     * @param _newAgent New agent wallet address
     */
    function setAgentWallet(address _newAgent) external onlyOwner {
        if (_newAgent == address(0)) revert InvalidAddress();
        address oldAgent = agentWallet;
        agentWallet = _newAgent;
        emit AgentWalletUpdated(oldAgent, _newAgent);
    }
    
    /**
     * @notice AI Agent creates a subscription on behalf of a user
     * @dev User must have approved USDC spending first. Only agent can call.
     * @param subscriber Address of the user subscribing
     * @param creator Address of the content creator
     * @param amount Subscription amount in USDC (6 decimals)
     * @param interval Payment interval in seconds (e.g., 30 days)
     * @return subscriptionId Unique identifier for the subscription
     */
    function createSubscription(
        address subscriber,
        address creator,
        uint256 amount,
        uint256 interval
    ) external onlyAgent nonReentrant returns (bytes32) {
        if (creator == address(0)) revert InvalidAddress();
        if (subscriber == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (interval < 1 days) revert InvalidInterval();
        
        // Generate unique subscription ID
        bytes32 subscriptionId = keccak256(
            abi.encodePacked(subscriber, creator, block.timestamp, amount)
        );
        
        if (subscriptions[subscriptionId].subscriber != address(0)) revert SubscriptionAlreadyExists();
        
        // Process first payment
        uint256 platformCut = (amount * platformFee) / FEE_DENOMINATOR;
        uint256 creatorAmount = amount - platformCut;
        
        if (!usdcToken.transferFrom(subscriber, address(this), amount)) revert TransferFailed();
        
        creatorBalances[creator] += creatorAmount;
        
        // Create subscription
        subscriptions[subscriptionId] = Subscription({
            subscriber: subscriber,
            creator: creator,
            amount: amount,
            interval: interval,
            nextPaymentDue: block.timestamp + interval,
            active: true,
            totalPaid: amount,
            paymentsCount: 1
        });
        
        userSubscriptions[subscriber].push(subscriptionId);
        creatorSubscriptions[creator].push(subscriptionId);
        
        emit SubscriptionCreated(subscriptionId, subscriber, creator, amount, interval);
        emit SubscriptionPaymentProcessed(
            subscriptionId,
            subscriber,
            creator,
            amount,
            block.timestamp + interval
        );
        
        return subscriptionId;
    }
    
    /**
     * @notice AI Agent processes recurring subscription payment
     * @dev Only callable by agent when payment is due. Automatically processes payment.
     * @param subscriptionId The subscription to process
     */
    function processSubscriptionPayment(bytes32 subscriptionId) external onlyAgent nonReentrant {
        Subscription storage sub = subscriptions[subscriptionId];
        
        if (!sub.active) revert SubscriptionNotActive();
        if (block.timestamp < sub.nextPaymentDue) revert PaymentNotDue();
        
        // Process payment
        uint256 platformCut = (sub.amount * platformFee) / FEE_DENOMINATOR;
        uint256 creatorAmount = sub.amount - platformCut;
        
        if (!usdcToken.transferFrom(sub.subscriber, address(this), sub.amount)) revert TransferFailed();
        
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
     * @dev Can be called by subscriber or contract owner
     * @param subscriptionId The subscription to cancel
     */
    function cancelSubscription(bytes32 subscriptionId) external {
        Subscription storage sub = subscriptions[subscriptionId];
        
        if (msg.sender != sub.subscriber && msg.sender != owner()) revert UnauthorizedUser();
        if (!sub.active) revert SubscriptionNotActive();
        
        sub.active = false;
        
        emit SubscriptionCancelled(subscriptionId, sub.subscriber, sub.creator);
    }
    
    /**
     * @notice AI Agent sends a tip from user to creator
     * @dev Triggered when AI detects user consumed valuable content. Only agent can call.
     * @param user Address of the user sending the tip
     * @param creator Address of the creator
     * @param amount Tip amount in USDC
     * @param contentId Optional content identifier
     */
    function sendTip(
        address user,
        address creator,
        uint256 amount,
        string calldata contentId
    ) external onlyAgent nonReentrant {
        if (creator == address(0)) revert InvalidAddress();
        if (user == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        
        uint256 platformCut = (amount * platformFee) / FEE_DENOMINATOR;
        uint256 creatorAmount = amount - platformCut;
        
        if (!usdcToken.transferFrom(user, address(this), amount)) revert TransferFailed();
        
        creatorBalances[creator] += creatorAmount;
        totalTipsReceived[creator] += amount;
        
        emit TipSent(user, creator, amount, contentId);
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
        if (creator == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        
        bytes32 escrowId = keccak256(
            abi.encodePacked(msg.sender, creator, contentId, block.timestamp)
        );
        
        if (escrows[escrowId].payer != address(0)) revert EscrowAlreadyExists();
        
        if (!usdcToken.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        
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
        
        if (msg.sender != escrow.payer && msg.sender != owner()) revert UnauthorizedUser();
        if (escrow.released) revert EscrowAlreadyReleased();
        
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
        if (balance == 0) revert NoBalanceToWithdraw();
        
        creatorBalances[msg.sender] = 0;
        
        if (!usdcToken.transfer(msg.sender, balance)) revert TransferFailed();
        
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
        if (!usdcToken.transfer(owner(), amount)) revert TransferFailed();
    }
}
