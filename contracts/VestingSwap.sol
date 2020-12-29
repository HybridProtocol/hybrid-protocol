// SPDX-License-Identifier: Apache-2.0

pragma solidity >=0.6.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/ISaleHybridToken.sol";
import "../interfaces/IPresale.sol";
import "../libraries/SafeTransfer.sol";



contract VestingSwap is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    address private alphaPresale;
    address private betaPresale;
    address private gammaPresale;

    uint32 private constant SECONDS_PER_DAY = 24 * 60 * 60;
    uint32 private constant SECONDS_PER_MONTH = SECONDS_PER_DAY * 30;

    address private HBT;
    address private sHBT;

    struct SwapInfo {
        uint sold;
        uint start;
        uint swapped;
        uint8[7] vesting;
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

    constructor(address _alphaPresale, address _betaPresale, address _gammaPresale, address _HBT, address _sHBT) public {
        HBT = _HBT;
        sHBT = _sHBT;
        alphaPresale = _alphaPresale;
        betaPresale = _betaPresale;
        gammaPresale = _gammaPresale;
        swap[alphaPresale].vesting = [10, 30, 30, 30, 0, 0, 0];
        swap[betaPresale].vesting = [10, 15, 15, 15, 15, 15, 15];
        swap[gammaPresale].vesting = [10, 15, 15, 15, 15, 15, 15];
    }

    function startAlphaSwap() external onlyOwner nonReentrant {
        swap[alphaPresale].sold = IPresale(alphaPresale).totalSold();
        require(IERC20(HBT).balanceOf(address(this)) == swap[alphaPresale].sold, "VestingSwap: HBT_NOT_ALLOCATED_FOR_ALPHA");
        swap[alphaPresale].start = now;
        emit AlphaSwapInitialized(now, swap[alphaPresale].vesting);
    }

    function startBetaSwap() external onlyOwner nonReentrant {
        uint leftAmount = swap[alphaPresale].sold.sub(swap[alphaPresale].swapped);
        swap[betaPresale].sold = IPresale(betaPresale).totalSold();
        uint requiredBalance = swap[betaPresale].sold.add(leftAmount);
        require(IERC20(HBT).balanceOf(address(this)) == requiredBalance, "VestingSwap: HBT_NOT_ALLOCATED_FOR_BETA");
        swap[betaPresale].start = now;
        emit BetaSwapInitialized(now, swap[betaPresale].vesting);
    }

    function startGammaSwap() external onlyOwner nonReentrant {
        uint leftAlphaAmount = swap[alphaPresale].sold.sub(swap[alphaPresale].swapped);
        uint leftBetaAmount = swap[betaPresale].sold.sub(swap[betaPresale].swapped);
        swap[gammaPresale].sold = IPresale(gammaPresale).totalSold();
        uint requiredBalance = swap[gammaPresale].sold.add(leftAlphaAmount).add(leftBetaAmount);
        require(IERC20(HBT).balanceOf(address(this)) == requiredBalance, "VestingSwap: HBT_NOT_ALLOCATED_FOR_GAMMA");
        swap[gammaPresale].start = now;
        emit GammaSwapInitialized(now, swap[gammaPresale].vesting);
    }

    function alphaSwap(uint _amount) external nonReentrant isStarted(alphaPresale) {
        _swap(alphaPresale, msg.sender, _amount);
    }

    function betaSwap(uint _amount) external nonReentrant isStarted(betaPresale) {
        _swap(betaPresale, msg.sender, _amount);
    }

    function gammaSwap(uint _amount) external nonReentrant isStarted(gammaPresale) {
        _swap(gammaPresale, msg.sender, _amount);
    }

    function availableAmountFor(address _presale, address _account) public view returns (uint available) {
        uint percentagesUnlocked = 100;
        uint purchased = IPresale(_presale).purchasedAmount(_account);
        uint monthsElapsed = now.sub(swap[_presale].start).div(SECONDS_PER_MONTH);
        if (monthsElapsed < 6) {
            percentagesUnlocked = 0;
            for (uint8 i = 0; i <= monthsElapsed; i++) {
                percentagesUnlocked = percentagesUnlocked.add(swap[_presale].vesting[i]);
            }
        }
        available = purchased.mul(percentagesUnlocked).div(100).sub(swappedAmountOf[_account]);
    }

    function _swap(address _presale, address _account, uint _amount) private {
        uint availableAmount = availableAmountFor(_presale, _account);
        require(_amount <= availableAmount, "VestingSwap: VESTING_LIMIT");
        ISaleHybridToken(sHBT).burn(_account, _amount);
        SafeTransfer.sendERC20(address(HBT), _account, _amount);
        swap[_presale].swapped = swap[_presale].swapped.add(_amount);
        swappedAmountOf[_account] = swappedAmountOf[_account].add(_amount);
        emit Swap(_account, _amount);
    }
}
