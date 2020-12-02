// SPDX-License-Identifier: Apache-2.0

pragma solidity >=0.6.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../IndexHybridToken.sol";


contract TestIndexHybridToken is IndexHybridToken {

    constructor (
        uint256 _totalSupply,
        uint256 _maxMintedSupply
    ) public IndexHybridToken(_totalSupply, _maxMintedSupply) {}

    function mint(address _account, uint _amount) public {
        _mint(_account, _amount);
    }
}