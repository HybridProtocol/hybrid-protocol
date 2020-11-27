// SPDX-License-Identifier: Apache-2.0

pragma solidity >=0.6.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract THybridToken is ERC20 {
    constructor(
        string memory _name,
        string memory _symbol,
        address initialAccount,
        uint initialBalance
    ) ERC20(_name, _symbol) public {
        _mint(initialAccount, initialBalance);
    }

    function mint(address _account, uint _amount) public {
        _mint(_account, _amount);
    }
}