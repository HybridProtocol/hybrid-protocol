// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/ISaleHybridToken.sol";
import "../interfaces/IPresale.sol";
import "../libraries/SafeTransfer.sol";
import "../libraries/PresaleConstants.sol";


contract VestingSwap is Ownable {
    using SafeMath for uint256;

    address private alphaPresale;
    address private betaPresale;
    address private gammaPresale;

    uint32 private constant SECONDS_PER_DAY = 24 * 60 * 60;
    uint32 private constant SECONDS_PER_MONTH = SECONDS_PER_DAY * 30;

    address private HBT;

    struct SwapInfo {
        uint sold;
        uint[] vesting;
        uint start;
        uint swapped;
    }

    mapping(address => SwapInfo) public swap;
    mapping(address => uint) public swappedAmountOf;

    event Swap(address account, uint amount);

    modifier isStarted(address _presale) {
        require(swap[_presale].start > 0);
        _;
    }

    constructor(address _alphaPresale, address _betaPresale, address _gammaPresale, address _HBT) public {
        HBT = _HBT;

        alphaPresale = _alphaPresale;
        betaPresale = _betaPresale;
        gammaPresale = _gammaPresale;

        swap[alphaPresale].sold = IPresale(alphaPresale).totalSold();
        swap[betaPresale].sold = IPresale(betaPresale).totalSold();
        swap[gammaPresale].sold = IPresale(gammaPresale).totalSold();

        _initVestingData();
    }

    function startAlphaSwap() external onlyOwner {
        swap[alphaPresale].start = now;
    }

    function startBetaSwap() external onlyOwner {
        swap[betaPresale].start = now;
    }

    function startGammaSwap() external onlyOwner {
        swap[gammaPresale].start = now;
    }

    function alphaSwap(uint _amount) external isStarted(alphaPresale) {
        _swap(alphaPresale, _amount);
    }

    function betaSwap(uint _amount) external isStarted(betaPresale) {
        _swap(betaPresale, _amount);
    }

    function gammaSwap(uint _amount) external isStarted(gammaPresale) {
        _swap(gammaPresale, _amount);
    }

    function availableAmountFor(address _presale) public view returns (uint) {
        uint256 totalUnlockedAmount;
        uint256 monthsElapsed = now.sub(swap[_presale].start).div(SECONDS_PER_MONTH);
        if (monthsElapsed > 6) {
            totalUnlockedAmount = swap[_presale].sold;
        } else {
            for (uint8 i = 0; i <= monthsElapsed; i++ ) {
                totalUnlockedAmount = totalUnlockedAmount.add(swap[_presale].vesting[i]);
            }
        }
        return totalUnlockedAmount.sub(swap[_presale].swapped);
    }

    function _swap(address _presale, uint _amount) private {
        uint purchased = IPresale(_presale).purchasedAmount(msg.sender);
        require(_amount <= purchased.sub(swappedAmountOf[msg.sender]), "VestingSwap: USER_LIMIT");
        uint availableAmount = availableAmountFor(_presale);
        require(_amount <= availableAmount.sub(swap[_presale].swapped), "VestingSwap: VESTING_LIMIT");
        ISaleHybridToken(_presale).burnFor(msg.sender, _amount);
        require(SafeTransfer.sendERC20(address(HBT), msg.sender, _amount), "VestingSwap: SEND_ERC20");
        swappedAmountOf[msg.sender] = swappedAmountOf[msg.sender].add(_amount);
        emit Swap(msg.sender, _amount);
    }

    function _initVestingData() private {
        uint8[7] memory alphaPercentages = [10, 30, 30, 30, 0, 0, 0];
        uint8[7] memory betaPercentages  = [10, 15, 15, 15, 15, 15, 15];
        uint8[7] memory gammaPercentages = [10, 15, 15, 15, 15, 15, 15];

        for(uint i = 0; i < 7; i++) {
            if (alphaPercentages[i] != 0) {
                swap[alphaPresale].vesting[i] = swap[alphaPresale].sold.mul(alphaPercentages[i]).div(100);
            }
            swap[betaPresale].vesting[i] = swap[betaPresale].sold.mul(betaPercentages[i]).div(100);
            swap[gammaPresale].vesting[i] = swap[gammaPresale].sold.mul(gammaPercentages[i]).div(100);
        }
    }
}

