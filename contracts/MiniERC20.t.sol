// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MiniERC20} from "./MiniERC20.sol";

contract MiniERC20Test is Test {
    MiniERC20 token;

    address owner;
    address spender;
    address relayer;

    uint256 ownerPrivateKey = 0xA11CE;

    function setUp() public {
        owner = vm.addr(ownerPrivateKey);

        spender = makeAddr("spender");
        relayer = makeAddr("relayer");

        token = new MiniERC20(
            "Mini ERC20",
            "M20"
        );
    }

    function testPermit() public {
        uint256 value = 100 ether;

        // ------------------------------------------------
        // 1. Get current nonce
        // ------------------------------------------------

        uint256 nonce = token.nonces(owner);

        assertEq(nonce, 0);

        // ------------------------------------------------
        // 2. Create deadline
        // ------------------------------------------------

        uint256 deadline = block.timestamp + 1 hours;

        // ------------------------------------------------
        // 3. Create EIP-712 domain
        // ------------------------------------------------

        bytes32 domainSeparator = token.DOMAIN_SEPARATOR();

        // ------------------------------------------------
        // 4. Create Permit struct hash
        // ------------------------------------------------

        bytes32 permitTypeHash = token.PERMIT_TYPEHASH();

        bytes32 structHash = keccak256(
            abi.encode(
                permitTypeHash,
                owner,
                spender,
                value,
                nonce,
                deadline
            )
        );

        // ------------------------------------------------
        // 5. Create EIP-712 digest
        // ------------------------------------------------

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                domainSeparator,
                structHash
            )
        );

        // ------------------------------------------------
        // 6. Owner signs OFF-CHAIN
        // ------------------------------------------------

        (uint8 v, bytes32 r, bytes32 s) =
            vm.sign(ownerPrivateKey, digest);

        // ------------------------------------------------
        // 7. Relayer submits permit()
        // ------------------------------------------------

        vm.prank(relayer);

        token.permit(
            owner,
            spender,
            value,
            deadline,
            v,
            r,
            s
        );

        // ------------------------------------------------
        // 8. Check allowance
        // ------------------------------------------------

        assertEq(
            token.allowances(owner, spender),
            value
        );

        // ------------------------------------------------
        // 9. Check nonce increased
        // ------------------------------------------------

        assertEq(
            token.nonces(owner),
            1
        );
    }
}