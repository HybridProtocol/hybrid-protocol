// SPDX-License-Identifier: Apache-2.0

pragma solidity >=0.6.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../SaleHybridToken.sol";


contract TSaleHybridToken is SaleHybridToken {

    function mint(address _account, uint _amount) public {
        _mint(_account, _amount);
    }
}