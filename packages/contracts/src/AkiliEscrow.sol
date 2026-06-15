// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title AkiliEscrow
 * @notice FX-triggered escrow for Akili. User locks USDC/USDT, Akili backend
 *         releases funds to recipient when the target FX rate is reached.
 *         The backend executor supplies the live rate — no on-chain oracle needed.
 */
contract AkiliEscrow {
    using SafeERC20 for IERC20;

    // USDC and USDT on Celo mainnet
    address public constant USDC = 0xcebA9300f2b948710d2653dD7B07f33A8B32118C;
    address public constant USDT = 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e;

    address public executor;   // Akili backend hot wallet
    address public owner;      // contract admin (can update executor)

    struct Order {
        address user;
        address token;         // USDC or USDT
        address recipient;
        uint256 amount;
        uint256 targetRate;    // e.g. 1620 for NGN/USD = 1620, scaled x100 for decimals
        string  currency;      // "NGN" | "KES" | "GHS" | "ZAR"
        bool    executed;
        bool    cancelled;
        uint256 createdAt;
    }

    mapping(bytes32 => Order) public orders;

    // Per-user list of order IDs for frontend enumeration
    mapping(address => bytes32[]) public userOrders;

    event OrderCreated(
        bytes32 indexed orderId,
        address indexed user,
        address token,
        address recipient,
        uint256 amount,
        uint256 targetRate,
        string  currency
    );
    event OrderExecuted(bytes32 indexed orderId, uint256 executedRate);
    event OrderCancelled(bytes32 indexed orderId);
    event ExecutorUpdated(address indexed newExecutor);

    error NotExecutor();
    error NotOrderOwner();
    error InvalidToken();
    error InvalidOrder();
    error RateNotMet(uint256 current, uint256 target);
    error NotOwner();

    modifier onlyExecutor() {
        if (msg.sender != executor) revert NotExecutor();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address _executor) {
        executor = _executor;
        owner    = msg.sender;
    }

    /**
     * @notice Lock tokens in escrow for FX-triggered send.
     * @param token     USDC or USDT address
     * @param recipient Destination wallet (can be any address, e.g. family member)
     * @param amount    Token amount in smallest unit (6 decimals for USDC/USDT)
     * @param targetRate Target FX rate × 100 (e.g. NGN 1620.50 → 162050)
     * @param currency  ISO currency code: "NGN", "KES", "GHS", or "ZAR"
     */
    function createOrder(
        address token,
        address recipient,
        uint256 amount,
        uint256 targetRate,
        string calldata currency
    ) external returns (bytes32 orderId) {
        if (token != USDC && token != USDT) revert InvalidToken();

        orderId = keccak256(
            abi.encodePacked(msg.sender, recipient, amount, targetRate, currency, block.timestamp)
        );

        orders[orderId] = Order({
            user:       msg.sender,
            token:      token,
            recipient:  recipient,
            amount:     amount,
            targetRate: targetRate,
            currency:   currency,
            executed:   false,
            cancelled:  false,
            createdAt:  block.timestamp
        });

        userOrders[msg.sender].push(orderId);

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        emit OrderCreated(orderId, msg.sender, token, recipient, amount, targetRate, currency);
    }

    /**
     * @notice Execute an order when the FX rate condition is met.
     *         Only callable by the Akili backend executor wallet.
     * @param orderId     The order to execute
     * @param currentRate Live rate × 100 sourced from open.er-api.com
     */
    function execute(bytes32 orderId, uint256 currentRate) external onlyExecutor {
        Order storage order = orders[orderId];
        if (order.executed || order.cancelled || order.user == address(0)) revert InvalidOrder();
        if (currentRate < order.targetRate) revert RateNotMet(currentRate, order.targetRate);

        order.executed = true;
        IERC20(order.token).safeTransfer(order.recipient, order.amount);

        emit OrderExecuted(orderId, currentRate);
    }

    /**
     * @notice Cancel an order and refund the user. Only the order creator can cancel.
     */
    function cancel(bytes32 orderId) external {
        Order storage order = orders[orderId];
        if (order.user != msg.sender) revert NotOrderOwner();
        if (order.executed || order.cancelled) revert InvalidOrder();

        order.cancelled = true;
        IERC20(order.token).safeTransfer(order.user, order.amount);

        emit OrderCancelled(orderId);
    }

    /**
     * @notice Get all order IDs for a user.
     */
    function getOrderIds(address user) external view returns (bytes32[] memory) {
        return userOrders[user];
    }

    /**
     * @notice Update the executor wallet (e.g. key rotation).
     */
    function setExecutor(address _executor) external onlyOwner {
        executor = _executor;
        emit ExecutorUpdated(_executor);
    }
}
