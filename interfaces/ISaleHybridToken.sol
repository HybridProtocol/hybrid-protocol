// SPDX-License-Identifier: Apache-2.0

pragma solidity >=0.6.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ISaleHybridToken is IERC20 {
    function mintPresale(address _alphaTokensale, address _betaTokensale, address _gammaTokensale) external;
    function burnForPresale(address _presale, uint _amount) external;
    function burn(address _account, uint _amount) external;
}