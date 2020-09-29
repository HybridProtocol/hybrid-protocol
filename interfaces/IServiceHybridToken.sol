// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IServiceHybridToken is IERC20 {

    function burnFor(address _presale, uint _amount) external;
}