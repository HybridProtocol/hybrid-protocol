// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.6;

import "@openzeppelin/contracts/access/Ownable.sol";


/**
 * @title Whitelist
 * @dev The Whitelist contract has a whitelist of addresses, and provides basic authorization control functions.
 * @dev This simplifies the implementation of "user permissions".
 */
contract Maintenance is Ownable {
    mapping(address => bool) public maintainers;

    event MaintainerAddressAdded(address addr);
    event WhitelistedAddressRemoved(address addr);


    modifier onlyMaintainers() {
        require(maintainers[msg.sender]);
        _;
    }

    function addAddressToMaintainers(address addr) onlyOwner public returns(bool success) {
        if (!maintainers[addr]) {
            maintainers[addr] = true;
            MaintainerAddressAdded(addr);
            success = true; 
        }
    }

    function addAddressesToMainteiners(address[] memory addrs) onlyOwner public returns(bool success) {
        for (uint256 i = 0; i < addrs.length; i++) {
            if (addAddressToMaintainers(addrs[i])) {
                success = true;
            }
        }
    }

    function removeAddressFromMaintainers(address addr) onlyOwner public returns(bool success) {
        if (maintainers[addr]) {
            maintainers[addr] = false;
            WhitelistedAddressRemoved(addr);
            success = true;
        }
    }

    function removeAddressesFromWhitelist(address[] memory addrs) onlyOwner public returns(bool success) {
        for (uint256 i = 0; i < addrs.length; i++) {
            if (removeAddressFromMaintainers(addrs[i])) {
                success = true;
            }
        }
    }

}