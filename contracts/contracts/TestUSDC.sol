// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestUSDC
 * @dev Simple ERC20 token for testing deposits on Base Sepolia
 * This mimics USDC with 6 decimals
 */
contract TestUSDC is ERC20, Ownable {
    uint8 private constant DECIMALS = 6;
    
    constructor() ERC20("Test USDC", "USDC") Ownable(msg.sender) {
        // Mint 1 million USDC to deployer for testing
        _mint(msg.sender, 1_000_000 * 10**DECIMALS);
    }
    
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }
    
    /**
     * @dev Mint tokens to any address (for testing only)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint (in base units, not decimals)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Faucet function - anyone can mint 100 USDC for testing
     */
    function faucet() external {
        require(balanceOf(msg.sender) < 1000 * 10**DECIMALS, "Already have enough tokens");
        _mint(msg.sender, 100 * 10**DECIMALS);
    }
}
