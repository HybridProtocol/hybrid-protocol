// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../libraries/PresaleConstants.sol";
import "../utils/Whitelist.sol";

contract ServiceHybridToken is ERC20, Ownable, Whitelist {

    string internal constant NAME = "Service Hybrid Token";
    string internal constant SYMBOL = "sHBT";

    uint internal alphaTokensaleLimit = PresaleConstants.ALPHA_PRESALE_LIMIT; // 3% of total supply
    uint internal betaTokensaleLimit = PresaleConstants.BETA_PRESALE_LIMIT;   // 5% of total supply
    uint internal gammaTokensaleLimit = PresaleConstants.GAMMA_PRESALE_LIMIT; // 4% of total supply

    address internal alphaTokensale;
    address internal betaTokensale;
    address internal gammaTokensale;

    mapping(address => bool) isBurnedFor;


    modifier onlyAvailableAmount(address _contract, uint _amount) {
        require(_contract == alphaTokensale ||
            _contract == betaTokensale ||
            _contract == gammaTokensale
        );

        if (_contract == alphaTokensale) {
            require(_amount <= alphaTokensaleLimit);
        } else if (_contract == betaTokensale) {
            require(_amount <= betaTokensaleLimit);
        } else if (_contract == gammaTokensale) {
            require(_amount <= gammaTokensaleLimit);
        }
        _;
    }

    constructor() ERC20(NAME, SYMBOL) public {}

    function mintPresale(
        address _alphaTokensale,
        address _betaTokensale,
        address _gammaTokensale
    ) external onlyOwner {
        alphaTokensale = _alphaTokensale;
        betaTokensale = _betaTokensale;
        gammaTokensale = _gammaTokensale;

        _mint(_alphaTokensale, alphaTokensaleLimit);
        _mint(_betaTokensale, betaTokensaleLimit);
        _mint(_gammaTokensale, gammaTokensaleLimit);
    }

    function burnFor(
        address _presale,
        uint _amount)
    external onlyWhitelisted onlyAvailableAmount(_presale, _amount) {
        require(!isBurnedFor[_presale], "ServiceHybridToken: ONLY_ONCE_BURN");
        _burn(msg.sender, _amount);
        isBurnedFor[_presale] = true;
    }
}