// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title FanClubZEscrow
 * @notice Escrow contract for handling USDC deposits and prediction bets
 * @dev Manages user balances, locked funds for active predictions, and payouts
 */
contract FanClubZEscrow is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    /// @notice USDC token contract
    IERC20 public immutable usdc;

    /// @notice Available balance for each user (can withdraw or bet)
    mapping(address => uint256) public balances;

    /// @notice Reserved/locked balance for active predictions
    mapping(address => uint256) public reserved;

    /// @notice Total deposited by each user (for tracking)
    mapping(address => uint256) public totalDeposited;

    /// @notice Total withdrawn by each user (for tracking)
    mapping(address => uint256) public totalWithdrawn;

    /// @notice Authorized operators who can lock/release funds
    mapping(address => bool) public operators;

    /// @notice Platform fee percentage (in basis points, e.g., 250 = 2.5%)
    uint256 public platformFeeBps;

    /// @notice Accumulated platform fees
    uint256 public platformFees;

    /// @notice Minimum deposit amount (6 decimals for USDC)
    uint256 public constant MIN_DEPOSIT = 1_000_000; // 1 USDC

    /// @notice Maximum deposit amount (to prevent accidental large deposits)
    uint256 public constant MAX_DEPOSIT = 100_000_000_000; // 100,000 USDC

    // ============ Events ============

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event FundsLocked(address indexed user, uint256 amount, bytes32 indexed predictionId);
    event FundsReleased(address indexed user, uint256 amount, bytes32 indexed predictionId, bool won);
    event OperatorAdded(address indexed operator);
    event OperatorRemoved(address indexed operator);
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event PlatformFeesWithdrawn(address indexed recipient, uint256 amount);
    event EmergencyWithdrawal(address indexed user, uint256 amount);

    // Merkle settlement events
    event SettlementRootPosted(bytes32 indexed predictionId, bytes32 indexed root, address indexed creator, uint256 creatorFee, address platform, uint256 platformFee);
    event Claimed(bytes32 indexed predictionId, address indexed account, uint256 amount);

    // ============ Errors ============

    error InsufficientBalance(uint256 requested, uint256 available);
    error InsufficientReserved(uint256 requested, uint256 reserved);
    error InvalidAmount();
    error InvalidAddress();
    error NotOperator();
    error FeeTooHigh();
    error TransferFailed();
    error AlreadySettled();
    error InvalidProof();
    error AlreadyClaimed();

    // ============ Modifiers ============

    modifier onlyOperator() {
        if (!operators[msg.sender] && msg.sender != owner()) {
            revert NotOperator();
        }
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Initialize the escrow contract
     * @param _usdc Address of USDC token on Base Sepolia
     * @param _initialOwner Address of the contract owner
     */
    constructor(address _usdc, address _initialOwner) Ownable(_initialOwner) {
        if (_usdc == address(0)) revert InvalidAddress();
        usdc = IERC20(_usdc);
        platformFeeBps = 250; // 2.5% default fee
    }

    // ============ User Functions ============

    /**
     * @notice Deposit USDC into escrow
     * @param amount Amount of USDC to deposit (6 decimals)
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        if (amount < MIN_DEPOSIT || amount > MAX_DEPOSIT) {
            revert InvalidAmount();
        }

        // Transfer USDC from user to contract
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Update balances
        balances[msg.sender] += amount;
        totalDeposited[msg.sender] += amount;

        emit Deposited(msg.sender, amount);
    }

    /**
     * @notice Withdraw available USDC balance
     * @param amount Amount of USDC to withdraw (6 decimals)
     */
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        if (balances[msg.sender] < amount) {
            revert InsufficientBalance(amount, balances[msg.sender]);
        }

        // Update balance before transfer (CEI pattern)
        balances[msg.sender] -= amount;
        totalWithdrawn[msg.sender] += amount;

        // Transfer USDC to user
        usdc.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Get total balance (available + reserved) for a user
     * @param user Address to query
     * @return total Total USDC balance
     */
    function getTotalBalance(address user) external view returns (uint256 total) {
        return balances[user] + reserved[user];
    }

    /**
     * @notice Get detailed balance information for a user
     * @param user Address to query
     * @return available Available balance (can withdraw/bet)
     * @return locked Reserved balance (in active predictions)
     * @return deposited Total deposited all-time
     * @return withdrawn Total withdrawn all-time
     */
    function getBalanceInfo(address user) 
        external 
        view 
        returns (
            uint256 available,
            uint256 locked,
            uint256 deposited,
            uint256 withdrawn
        ) 
    {
        return (
            balances[user],
            reserved[user],
            totalDeposited[user],
            totalWithdrawn[user]
        );
    }

    // ============ Operator Functions ============

    /**
     * @notice Lock funds for a prediction (called when user places bet)
     * @param user User whose funds to lock
     * @param amount Amount to lock
     * @param predictionId Unique identifier for the prediction
     */
    function lockFunds(
        address user,
        uint256 amount,
        bytes32 predictionId
    ) external onlyOperator whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        if (balances[user] < amount) {
            revert InsufficientBalance(amount, balances[user]);
        }

        // Move from available to reserved
        balances[user] -= amount;
        reserved[user] += amount;

        emit FundsLocked(user, amount, predictionId);
    }

    /**
     * @notice Release locked funds after prediction resolves
     * @param user User whose funds to release
     * @param amount Original bet amount
     * @param predictionId Unique identifier for the prediction
     * @param won Whether user won the prediction
     * @param payout Total payout amount (if won)
     */
    function releaseFunds(
        address user,
        uint256 amount,
        bytes32 predictionId,
        bool won,
        uint256 payout
    ) external onlyOperator whenNotPaused {
        if (reserved[user] < amount) {
            revert InsufficientReserved(amount, reserved[user]);
        }

        // Release from reserved
        reserved[user] -= amount;

        if (won) {
            // Calculate platform fee
            uint256 profit = payout > amount ? payout - amount : 0;
            uint256 fee = (profit * platformFeeBps) / 10000;
            uint256 userPayout = payout - fee;

            // Add winnings to user balance
            balances[user] += userPayout;
            
            // Accumulate platform fees
            if (fee > 0) {
                platformFees += fee;
            }
        }
        // If lost, funds stay in contract (distributed to winners)

        emit FundsReleased(user, amount, predictionId, won);
    }

    /**
     * @notice Batch release funds for multiple users (gas efficient)
     * @param users Array of user addresses
     * @param amounts Array of bet amounts
     * @param predictionId Prediction identifier
     * @param won Array of win/loss status
     * @param payouts Array of payout amounts
     */
    function batchReleaseFunds(
        address[] calldata users,
        uint256[] calldata amounts,
        bytes32 predictionId,
        bool[] calldata won,
        uint256[] calldata payouts
    ) external onlyOperator whenNotPaused {
        uint256 length = users.length;
        require(
            length == amounts.length && 
            length == won.length && 
            length == payouts.length,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < length; i++) {
            if (reserved[users[i]] >= amounts[i]) {
                reserved[users[i]] -= amounts[i];

                if (won[i]) {
                    uint256 profit = payouts[i] > amounts[i] ? payouts[i] - amounts[i] : 0;
                    uint256 fee = (profit * platformFeeBps) / 10000;
                    uint256 userPayout = payouts[i] - fee;

                    balances[users[i]] += userPayout;
                    if (fee > 0) {
                        platformFees += fee;
                    }
                }

                emit FundsReleased(users[i], amounts[i], predictionId, won[i]);
            }
        }
    }

    // ============ Admin Functions ============

    /**
     * @notice Add an authorized operator
     * @param operator Address to authorize
     */
    function addOperator(address operator) external onlyOwner {
        if (operator == address(0)) revert InvalidAddress();
        operators[operator] = true;
        emit OperatorAdded(operator);
    }

    /**
     * @notice Remove an authorized operator
     * @param operator Address to deauthorize
     */
    function removeOperator(address operator) external onlyOwner {
        operators[operator] = false;
        emit OperatorRemoved(operator);
    }

    /**
     * @notice Update platform fee percentage
     * @param newFeeBps New fee in basis points (max 1000 = 10%)
     */
    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > 1000) revert FeeTooHigh(); // Max 10%
        uint256 oldFee = platformFeeBps;
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(oldFee, newFeeBps);
    }

    /**
     * @notice Withdraw accumulated platform fees
     * @param recipient Address to receive fees
     * @param amount Amount to withdraw
     */
    function withdrawPlatformFees(address recipient, uint256 amount) external onlyOwner {
        if (recipient == address(0)) revert InvalidAddress();
        if (amount > platformFees) revert InvalidAmount();

        platformFees -= amount;
        usdc.safeTransfer(recipient, amount);

        emit PlatformFeesWithdrawn(recipient, amount);
    }

    /**
     * @notice Admin-only helper to move a user's reserved funds back into their available balance.
     *         Intended for test/unlock scenarios. Does not transfer tokens, only adjusts internal balances.
     */
    function adminUnlock(address user, uint256 amount) external onlyOwner {
        require(user != address(0), "bad user");
        require(amount > 0, "bad amount");
        uint256 r = reserved[user];
        require(r >= amount, "insufficient reserved");
        reserved[user] = r - amount;
        balances[user] += amount;
        emit FundsReleased(user, amount, bytes32(0), false);
    }

    /**
     * @notice Admin-only helper to move all reserved balance for a user back to available.
     */
    function adminUnlockAll(address user) external onlyOwner {
        require(user != address(0), "bad user");
        uint256 r = reserved[user];
        if (r > 0) {
            reserved[user] = 0;
            balances[user] += r;
            emit FundsReleased(user, r, bytes32(0), false);
        }
    }

    /**
     * @notice Pause all deposits and withdrawals (emergency only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Resume normal operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdrawal (if contract needs to be migrated)
     * @param user User to withdraw for
     * @param recipient Address to receive funds
     */
    function emergencyWithdrawal(address user, uint256 amount, address recipient) external onlyOwner whenPaused {
        if (recipient == address(0)) revert InvalidAddress();
        uint256 r = balances[user] + reserved[user];
        if (amount > r) revert InvalidAmount();
        // Reduce from reserved first, then balances
        uint256 fromRes = amount > reserved[user] ? reserved[user] : amount;
        if (fromRes > 0) {
            reserved[user] -= fromRes;
        }
        uint remainder = amount - fromRes;
        if (remainder > 0) {
            require(balances[user] >= remainder, "insufficient balance");
            balances[user] -= remainder;
        }
        usdc.safeTransfer(recipient, amount);
        emit FundsReleased(user, amount, bytes32(0), false);
    }

    /**
     * @notice Get contract USDC balance
     * @return Current USDC balance held by contract
     */
    function getContractBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    // ============ Merkle Settlement ============

    /// @notice Merkle root per prediction; once set it cannot be changed
    mapping(bytes32 => bytes32) public settlementRoot;

    /// @notice Claimed bitmap per prediction and account
    mapping(bytes32 => mapping(address => bool)) public claimed;

    /**
     * @notice Post final settlement root and pay creator/platform fees on-chain
     * @dev For MVP creators post this directly. Funds (losing stakes) must already reside in the contract.
     */
    function postSettlementRoot(
        bytes32 predictionId,
        bytes32 root,
        address creator,
        uint256 creatorFee,
        address platform,
        uint256 platformFee
    ) external nonReentrant whenNotPaused {
        if (settlementRoot[predictionId] != bytes32(0)) revert AlreadySettled();
        settlementRoot[predictionId] = root;

        // Pay creator fee on-chain
        if (creator != address(0) && creatorFee > 0) {
            usdc.safeTransfer(creator, creatorFee);
        }
        // Pay platform fee on-chain
        if (platform != address(0) && platformFee > 0) {
            usdc.safeTransfer(platform, platformFee);
        }

        emit SettlementRootPosted(predictionId, root, creator, creatorFee, platform, platformFee);
    }

    /**
     * @notice Claim winnings using a Merkle proof. Transfers USDC to msg.sender
     */
    function claim(
        bytes32 predictionId,
        uint256 amount,
        bytes32[] calldata proof
    ) external nonReentrant whenNotPaused {
        bytes32 root = settlementRoot[predictionId];
        if (root == bytes32(0)) revert InvalidProof();
        if (claimed[predictionId][msg.sender]) revert AlreadyClaimed();

        // Compute leaf and verify
        bytes32 leaf = keccak256(abi.encodePacked(predictionId, msg.sender, amount));
        if (!_verifyProof(leaf, root, proof)) revert InvalidProof();

        claimed[predictionId][msg.sender] = true;
        usdc.safeTransfer(msg.sender, amount);
        emit Claimed(predictionId, msg.sender, amount);
    }

    /**
     * @dev Verifies a merkle proof for a leaf against a root using pairwise hashing with sorted pairs.
     */
    function _verifyProof(
        bytes32 leaf,
        bytes32 root,
        bytes32[] calldata proof
    ) internal pure returns (bool) {
        bytes32 computed = leaf;
        uint256 len = proof.length;
        for (uint256 i = 0; i < len; i++) {
            bytes32 sibling = proof[i];
            if (computed <= sibling) {
                computed = keccak256(abi.encodePacked(computed, sibling));
            } else {
                computed = keccak256(abi.encodePacked(sibling, computed));
            }
        }
        return computed == root || (len == 0 && root == keccak256(""));
    }
}
