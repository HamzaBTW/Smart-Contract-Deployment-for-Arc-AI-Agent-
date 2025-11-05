// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// Minimal IERC20 interface to avoid external imports
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

// Minimal Ownable implementation to avoid external dependency
contract Ownable {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), _owner);
    }

    modifier onlyOwner() {
        require(owner() == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    function owner() public view returns (address) {
        return _owner;
    }

    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

/**
 * @title SubscriptionTipping
 * @notice Simple subscription and tipping contract using an ERC-20 token (USDC)
 * @dev Users must approve this contract to spend their USDC before subscriptions or tips can be processed.
 *
 * Usage patterns:
 * - User calls `subscribe(creator, amount)` to register a recurring subscription (30 days cadence).
 * - Anyone (typically a backend cron) calls `processSubscription(user, creator)` when payment is due; the contract calls `transferFrom(user, creator, amount)`.
 * - A user can call `tip(creator, amount)` to immediately transfer tokens to a creator (requires prior approval).
 * - Users can cancel or reactivate subscriptions.
 *
 * Deployment note (Arc Testnet):
 * - This contract is EVM-compatible. Use Hardhat or Foundry configured with Arc testnet RPC to deploy.
 * - Ensure `usdc` in the constructor points to the USDC token contract on Arc testnet (or a test token).
 */
contract SubscriptionTipping is Ownable {

    IERC20 public immutable token; // USDC or test ERC20

    uint256 public constant PAYMENT_INTERVAL = 30 days;

    struct Subscription {
        uint256 amount; // amount in token smallest unit (e.g., 6 decimals for USDC)
        uint256 nextPayment; // unix timestamp
        bool active;
        uint256 lastPayment;
    }

    // user => creator => subscription
    mapping(address => mapping(address => Subscription)) public subscriptions;

    event Subscribed(address indexed user, address indexed creator, uint256 amount, uint256 nextPayment);
    // txId is optional external transaction id (e.g. Circle tx id)
    event SubscriptionPaid(address indexed user, address indexed creator, uint256 amount, uint256 timestamp, string txId);
    event SubscriptionCancelled(address indexed user, address indexed creator, uint256 timestamp);
    event SubscriptionReactivated(address indexed user, address indexed creator, uint256 nextPayment);
    event TipSent(address indexed from, address indexed to, uint256 amount, uint256 timestamp);
    event EmergencyWithdraw(address indexed owner, address token, uint256 amount);

    // Relayer whitelist (addresses allowed to call recordPayment)
    mapping(address => bool) public relayers;

    /**
     * @param _token ERC20 token address used for payments (USDC)
     */
    constructor(address _token) {
        require(_token != address(0), "token address required");
        token = IERC20(_token);
    }

    /**
     * @notice Subscribe to a creator with a recurring amount
     * @dev Does not attempt the first charge automatically. Call `processSubscription` to charge immediately.
     * @param creator The address receiving the payments
     * @param amount The recurring payment amount (in token smallest unit)
     */
    function subscribe(address creator, uint256 amount) external {
        require(creator != address(0), "invalid creator");
        require(amount > 0, "amount must be > 0");

        Subscription storage s = subscriptions[msg.sender][creator];
        s.amount = amount;
        s.active = true;
        s.lastPayment = 0;
        s.nextPayment = block.timestamp + PAYMENT_INTERVAL;

        emit Subscribed(msg.sender, creator, amount, s.nextPayment);
    }

    /**
     * @notice Cancel your subscription to a creator
     */
    function cancelSubscription(address creator) external {
        Subscription storage s = subscriptions[msg.sender][creator];
        require(s.active, "subscription not active");
        s.active = false;

        emit SubscriptionCancelled(msg.sender, creator, block.timestamp);
    }

    /**
     * @notice Reactivate a previously cancelled subscription
     */
    function reactivateSubscription(address creator) external {
        Subscription storage s = subscriptions[msg.sender][creator];
        require(!s.active, "subscription already active");
        require(s.amount > 0, "no subscription exists");
        s.active = true;
        s.nextPayment = block.timestamp + PAYMENT_INTERVAL;

        emit SubscriptionReactivated(msg.sender, creator, s.nextPayment);
    }

    /**
     * @notice Owner can add a relayer (e.g. Circle smart contract platform or backend relayer)
     */
    function addRelayer(address r) external onlyOwner {
        require(r != address(0), "invalid relayer");
        relayers[r] = true;
    }

    /**
     * @notice Owner can remove a relayer
     */
    function removeRelayer(address r) external onlyOwner {
        relayers[r] = false;
    }

    /**
     * @notice Process a due subscription payment for a specific user -> creator pair.
     * @dev Anyone can call this (backend cron, relayer); it will revert if not due or not active.
     * @param user The subscriber paying the amount
     * @param creator The recipient of the subscription
     */
    function processSubscription(address user, address creator) external {
        Subscription storage s = subscriptions[user][creator];
        require(s.active, "subscription not active");
        require(block.timestamp >= s.nextPayment, "payment not due");
        require(s.amount > 0, "invalid subscription amount");

        // Attempt transferFrom user -> creator. User must have approved this contract.
    _safeTransferFrom(token, user, creator, s.amount);

        s.lastPayment = block.timestamp;
        // advance nextPayment by PAYMENT_INTERVAL; keep schedule consistent
        s.nextPayment = s.nextPayment + PAYMENT_INTERVAL;

        emit SubscriptionPaid(user, creator, s.amount, block.timestamp, "");
    }

    /**
     * @notice Record a subscription payment that was performed off-chain or by a platform-controlled wallet.
     * @dev Callable by a whitelisted relayer or the contract owner. This does NOT transfer tokens; it's a bookkeeping hook
     *      that advances the subscription schedule and emits an event with an optional txId (e.g. Circle transaction id).
     * @param user Subscriber address
     * @param creator Recipient address
     * @param amount Amount paid (for audit)
     * @param txId External transaction id or hash (optional)
     */
    function recordPayment(address user, address creator, uint256 amount, string calldata txId) external {
        require(relayers[msg.sender] || msg.sender == owner(), "not authorized");

        Subscription storage s = subscriptions[user][creator];
        require(s.active, "subscription not active");
        require(s.amount > 0, "invalid subscription amount");

        s.lastPayment = block.timestamp;
        s.nextPayment = s.nextPayment + PAYMENT_INTERVAL;

        emit SubscriptionPaid(user, creator, amount, block.timestamp, txId);
    }

    /**
     * @notice Batch variant of `recordPayment` to process multiple payments in one tx.
     * @param users Array of subscriber addresses
     * @param creators Array of recipient addresses
     * @param amounts Array of paid amounts
     * @param txIds Array of external tx ids
     */
    function recordPayments(
        address[] calldata users,
        address[] calldata creators,
        uint256[] calldata amounts,
        string[] calldata txIds
    ) external {
        require(relayers[msg.sender] || msg.sender == owner(), "not authorized");
        uint256 len = users.length;
        require(creators.length == len && amounts.length == len && txIds.length == len, "array length mismatch");

        for (uint256 i = 0; i < len; i++) {
            Subscription storage s = subscriptions[users[i]][creators[i]];
            if (!s.active || s.amount == 0) {
                // skip invalid subscription entries
                continue;
            }
            s.lastPayment = block.timestamp;
            s.nextPayment = s.nextPayment + PAYMENT_INTERVAL;
            emit SubscriptionPaid(users[i], creators[i], amounts[i], block.timestamp, txIds[i]);
        }
    }

    /**
     * @dev Internal safe transferFrom wrapper that handles tokens that do not return boolean.
     */
    function _safeTransferFrom(IERC20 t, address from, address to, uint256 value) internal {
        (bool success, bytes memory data) = address(t).call(abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "TRANSFER_FROM_FAILED");
    }

    /**
     * @dev Internal safe transfer wrapper.
     */
    function _safeTransfer(IERC20 t, address to, uint256 value) internal {
        (bool success, bytes memory data) = address(t).call(abi.encodeWithSelector(IERC20.transfer.selector, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "TRANSFER_FAILED");
    }

    /**
     * @notice Send an immediate tip from caller to creator
     * @dev Caller must approve this contract for the tip amount beforehand.
     * @param creator Recipient address
     * @param amount Token amount to tip
     */
    function tip(address creator, uint256 amount) external {
        require(creator != address(0), "invalid creator");
        require(amount > 0, "amount must be > 0");

    _safeTransferFrom(token, msg.sender, creator, amount);

        emit TipSent(msg.sender, creator, amount, block.timestamp);
    }

    /**
     * @notice View subscription details for a user -> creator
     */
    function getSubscription(address user, address creator) external view returns (Subscription memory) {
        return subscriptions[user][creator];
    }

    /**
     * @notice Emergency withdraw tokens accidentally sent to this contract
     * @dev Only owner can call
     */
    function emergencyWithdraw(address tokenAddress, uint256 amount) external onlyOwner {
        _safeTransfer(IERC20(tokenAddress), msg.sender, amount);
        emit EmergencyWithdraw(msg.sender, tokenAddress, amount);
    }

    /**
     * @notice Change a user's subscription amount (caller must be the user)
     */
    function updateSubscriptionAmount(address creator, uint256 newAmount) external {
        require(newAmount > 0, "amount must be > 0");
        Subscription storage s = subscriptions[msg.sender][creator];
        require(s.amount > 0, "subscription not found");
        s.amount = newAmount;
    }
}
