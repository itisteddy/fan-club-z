// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {FanClubZEscrow} from "../FanClubZEscrow.sol";

contract DeployEscrow is Script {
    function run() external returns (address) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address usdcAddress = vm.envAddress("USDC_ADDRESS");
        address initialOwner = vm.addr(deployerPrivateKey);

        console.log("===========================================");
        console.log("Deploying FanClubZ Escrow Contract");
        console.log("===========================================");
        console.log("Deployer:", initialOwner);
        console.log("USDC Address:", usdcAddress);
        console.log("Network: Base Sepolia (Chain ID 84532)");
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        FanClubZEscrow escrow = new FanClubZEscrow(
            usdcAddress,
            initialOwner
        );

        vm.stopBroadcast();

        console.log("===========================================");
        console.log("DEPLOYMENT SUCCESSFUL!");
        console.log("===========================================");
        console.log("Escrow Contract:", address(escrow));
        console.log("USDC Address:", usdcAddress);
        console.log("Owner:", initialOwner);
        console.log("===========================================");
        console.log("");
        console.log("NEXT STEPS:");
        console.log("1. Copy the Escrow Contract address above");
        console.log("2. Update server/.env:");
        console.log("   BASE_ESCROW_ADDRESS=%s", address(escrow));
        console.log("3. Update client/.env.local:");
        console.log("   VITE_BASE_ESCROW_ADDRESS=%s", address(escrow));
        console.log("   VITE_ESCROW_ADDRESS_BASE_SEPOLIA=%s", address(escrow));
        console.log("4. Restart both server and client");
        console.log("5. Test with a small deposit!");
        console.log("===========================================");

        return address(escrow);
    }
}
