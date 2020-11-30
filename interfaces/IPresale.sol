// SPDX-License-Identifier: Apache-2.0

pragma solidity >=0.6.6;

interface IPresale {
    function start() external;
    function burn() external;
    function sendUSDC(address _to, uint _amount) external;
    function buy(uint _amountUSDC) external;
    function purchasedAmount(address _account) external view returns (uint);
    function totalSold() external view returns (uint);
    function presaleIsActive() external view returns (bool);
}
