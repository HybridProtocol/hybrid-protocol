// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IIndexHybridToken is IERC20 {
    function updateComposition(bytes8[] calldata _assets, uint16[] calldata _weights) external;
    function mintAmount(address[] calldata _accounts, uint256 _amount) external;
    function mintAmounts(address[] calldata _accounts, uint256[] calldata _amounts) external;
}