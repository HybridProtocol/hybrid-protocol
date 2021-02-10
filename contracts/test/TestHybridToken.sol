// SPDX-License-Identifier: Apache-2.0

pragma solidity >=0.6.6;

import "../HybridToken.sol";


contract TestHybridToken is HybridToken {
    constructor(
        string memory _name,
        string memory _symbol,
        address _initialAccount,
        uint _initialBalance
    ) HybridToken(_name, _symbol, _initialAccount, _initialBalance) public {}

    function mint(address _account, uint _amount) external {
        _mint(_account, _amount);
    }
}