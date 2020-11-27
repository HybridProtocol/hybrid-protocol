// SPDX-License-Identifier: Apache-2.0

pragma solidity >=0.6.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../../interfaces/ISaleHybridToken.sol";
import "../../interfaces/IPresale.sol";
import "../../libraries/SafeTransfer.sol";



contract TVestingSwap is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    address private alphaPresale;
    address private betaPresale;
    address private gammaPresale;

    uint32 private constant SECONDS_PER_4_HOURS = 4 * 60 * 60;
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

    event AlphaSwapInitialized(uint, uint8[7]);
    event BetaSwapInitialized(uint, uint8[7]);
    event GammaSwapInitialized(uint, uint8[7]);
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
    }

    function startAlphaSwap() external onlyOwner nonReentrant {
        uint8[7] memory percentages = [10, 30, 30, 30, 0, 0, 0];
        _initVestingData(alphaPresale, percentages);
        swap[alphaPresale].start = now;
        emit AlphaSwapInitialized(now, percentages);
    }

    function startBetaSwap() external onlyOwner nonReentrant {
        uint8[7] memory percentages = [10, 15, 15, 15, 15, 15, 15];
        _initVestingData(betaPresale, percentages);
        swap[betaPresale].start = now;
        emit BetaSwapInitialized(now, percentages);
    }

    function startGammaSwap() external onlyOwner nonReentrant {
        uint8[7] memory percentages = [10, 15, 15, 15, 15, 15, 15];
        _initVestingData(gammaPresale, percentages);
        swap[gammaPresale].start = now;
        emit GammaSwapInitialized(now, percentages);
    }

    function alphaSwap(uint _amount) external nonReentrant isStarted(alphaPresale) {
        _swap(alphaPresale, _amount);
    }

    function betaSwap(uint _amount) external nonReentrant isStarted(betaPresale) {
        _swap(betaPresale, _amount);
    }

    function gammaSwap(uint _amount) external nonReentrant isStarted(gammaPresale) {
        _swap(gammaPresale, _amount);
    }

    function availableAmountFor(address _presale) public view returns (uint) {
        uint256 totalUnlockedAmount;
        uint256 monthsElapsed = now.sub(swap[_presale].start).div(SECONDS_PER_4_HOURS);
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
        SafeTransfer.sendERC20(address(HBT), msg.sender, _amount);
        swappedAmountOf[msg.sender] = swappedAmountOf[msg.sender].add(_amount);
        emit Swap(msg.sender, _amount);
    }

    function _initVestingData(address _presale, uint8[7] memory _percentages) private {
        uint sold = IPresale(_presale).totalSold();
        for(uint i = 0; i < _percentages.length; i++) {
            if (_percentages[i] != 0) {
                swap[_presale].vesting.push(sold * _percentages[i] / uint(100));
            }
        }
    }
}

