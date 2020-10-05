//SPDX-License-Identifier: Unlicense
pragma solidity ^0.6.8;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract HybridToken is ERC20 {
    constructor(
        string memory _name,
        string memory _symbol,
        address initialAccount,
        uint initialBalance
    ) ERC20(_name, _symbol) public {
        _mint(initialAccount, initialBalance);
    }
}