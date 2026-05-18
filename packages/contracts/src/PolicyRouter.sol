// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IYieldVenueExecutor {
    function executeDeposit(
        address user,
        address token,
        uint256 amount,
        uint256 minOutputAmount,
        address recipient
    ) external returns (uint256 outputAmount);
}

contract PolicyRouter {
    enum PolicyAction {
        StayLiquid,
        DepositMiniPayBoost,
        DepositKiln,
        DepositDirectCeloLending
    }

    struct ExecutionRequest {
        address user;
        PolicyAction action;
        bytes32 venueIdHash;
        address token;
        uint256 amount;
        uint256 minOutputAmount;
        uint64 quoteTimestamp;
        uint64 quoteExpiresAt;
        uint16 maxSlippageBps;
        address recipient;
    }

    struct VenuePolicy {
        bool enabled;
        address executor;
        uint128 maxAmount;
        uint32 cooldownSeconds;
        uint32 maxQuoteAgeSeconds;
        uint8 minUserRiskScore;
        bool requiresRecipientMatch;
    }

    address public owner;
    bool public paused;

    mapping(address => bool) public policyAdmins;
    mapping(address => uint8) public userRiskScores;
    mapping(address => bool) public allowedTokens;
    mapping(bytes32 => VenuePolicy) public venuePolicies;
    mapping(address => mapping(bytes32 => uint256)) public lastExecutionAt;

    event OwnerTransferred(address indexed previousOwner, address indexed newOwner);
    event PolicyAdminSet(address indexed admin, bool allowed);
    event TokenAllowed(address indexed token, bool allowed);
    event UserRiskScoreSet(address indexed user, uint8 riskScore);
    event VenuePolicySet(
        bytes32 indexed venueIdHash,
        address indexed executor,
        bool enabled,
        uint128 maxAmount,
        uint32 cooldownSeconds,
        uint32 maxQuoteAgeSeconds,
        uint8 minUserRiskScore,
        bool requiresRecipientMatch
    );
    event RouterPaused(bool paused);
    event PolicyActionExecuted(
        address indexed user,
        bytes32 indexed venueIdHash,
        PolicyAction action,
        address token,
        uint256 amount,
        address recipient
    );

    error NotOwner();
    error NotPolicyAdmin();
    error RouterPausedError();
    error TokenNotAllowed();
    error VenueNotEnabled();
    error AmountExceedsVenueLimit();
    error QuoteExpired();
    error QuoteTooOld();
    error CooldownActive();
    error RiskScoreTooLow();
    error RecipientMismatch();
    error ExecutionOutputTooLow();

    constructor(address initialOwner) {
        owner = initialOwner;
        emit OwnerTransferred(address(0), initialOwner);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyPolicyAdmin() {
        if (msg.sender != owner && !policyAdmins[msg.sender]) revert NotPolicyAdmin();
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        emit OwnerTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setPolicyAdmin(address admin, bool allowed) external onlyOwner {
        policyAdmins[admin] = allowed;
        emit PolicyAdminSet(admin, allowed);
    }

    function setPaused(bool nextPaused) external onlyPolicyAdmin {
        paused = nextPaused;
        emit RouterPaused(nextPaused);
    }

    function setAllowedToken(address token, bool allowed) external onlyPolicyAdmin {
        allowedTokens[token] = allowed;
        emit TokenAllowed(token, allowed);
    }

    function setUserRiskScore(address user, uint8 riskScore) external onlyPolicyAdmin {
        userRiskScores[user] = riskScore;
        emit UserRiskScoreSet(user, riskScore);
    }

    function setVenuePolicy(
        bytes32 venueIdHash,
        VenuePolicy calldata policy
    ) external onlyPolicyAdmin {
        venuePolicies[venueIdHash] = policy;

        emit VenuePolicySet(
            venueIdHash,
            policy.executor,
            policy.enabled,
            policy.maxAmount,
            policy.cooldownSeconds,
            policy.maxQuoteAgeSeconds,
            policy.minUserRiskScore,
            policy.requiresRecipientMatch
        );
    }

    function executePolicyAction(ExecutionRequest calldata request) external returns (uint256 outputAmount) {
        if (paused) revert RouterPausedError();
        if (!allowedTokens[request.token]) revert TokenNotAllowed();

        VenuePolicy memory policy = venuePolicies[request.venueIdHash];

        if (!policy.enabled || policy.executor == address(0)) revert VenueNotEnabled();
        if (request.amount > policy.maxAmount) revert AmountExceedsVenueLimit();
        if (block.timestamp > request.quoteExpiresAt) revert QuoteExpired();
        if (block.timestamp > request.quoteTimestamp + policy.maxQuoteAgeSeconds) revert QuoteTooOld();
        if (userRiskScores[request.user] < policy.minUserRiskScore) revert RiskScoreTooLow();

        uint256 nextAllowedExecution = lastExecutionAt[request.user][request.venueIdHash] + policy.cooldownSeconds;
        if (block.timestamp < nextAllowedExecution) revert CooldownActive();
        if (policy.requiresRecipientMatch && request.recipient != request.user) revert RecipientMismatch();

        lastExecutionAt[request.user][request.venueIdHash] = block.timestamp;

        if (request.action == PolicyAction.StayLiquid) {
            emit PolicyActionExecuted(
                request.user,
                request.venueIdHash,
                request.action,
                request.token,
                request.amount,
                request.recipient
            );
            return request.amount;
        }

        outputAmount = IYieldVenueExecutor(policy.executor).executeDeposit(
            request.user,
            request.token,
            request.amount,
            request.minOutputAmount,
            request.recipient
        );

        if (outputAmount < request.minOutputAmount) revert ExecutionOutputTooLow();

        emit PolicyActionExecuted(
            request.user,
            request.venueIdHash,
            request.action,
            request.token,
            request.amount,
            request.recipient
        );
    }
}
