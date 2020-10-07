// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../utils/Whitelist.sol";


contract IndexHybridToken is ERC20, Whitelist {

    string private constant NAME = "Index Hybrid Token";
    string private constant SYMBOL = "xHBT";

    struct Asset {
        bytes8 symbol;
        uint16 weight; // e.g. 100.00 as 10000
    }

    Asset[] public portfolio;

    event AssetAdded(bytes8 asset, uint16 weight);
    event CompositionUpdated();

    uint256 public immutable maxMintedSupply;

    constructor (
        uint256 _totalSupply,
        uint256 _maxMintedSupply
    ) public ERC20(NAME, SYMBOL) {
        _mint(msg.sender, _totalSupply);
        require(_totalSupply <= _maxMintedSupply, "IndexHybridToken: MAX_MINTED_SUPPLY_LIMIT");
        maxMintedSupply = _maxMintedSupply;
    }

    function updateComposition(bytes8[] calldata _assets, uint16[] calldata _weights) external onlyWhitelisted {
        require(_assets.length == _weights.length, "IndexHybridToken: INVALID_LENGTH");
        uint totalWeights;
        for (uint i = 0; i < portfolio.length; i++) {
            totalWeights += _weights[i];
        }
        require(totalWeights == 10000, "IndexHybridToken: TOTAL_WEIGHTS");
        delete portfolio;
        for (uint i = 0; i < portfolio.length; i++) {
            totalWeights += _weights[i];
            _addAsset(_assets[i], _weights[i]);
        }
        emit CompositionUpdated();
    }

    function mintAmount(address[] calldata _accounts, uint256 _amount) external onlyWhitelisted {
        for (uint i = 0; i < _accounts.length; ++i) {
            _mint(_accounts[i], _amount);
        }
        require(totalSupply() <= maxMintedSupply, "IndexHybridToken: MAX_MINTED_SUPPLY_LIMIT");
    }

    function mintAmounts(address[] calldata _accounts, uint256[] calldata _amounts) external onlyWhitelisted {
        require(_accounts.length == _amounts.length, "IndexHybridToken: INVALID_LENGTH");
        for (uint i = 0; i < _accounts.length; ++i) {
            _mint(_accounts[i], _amounts[i]);
        }
        require(totalSupply() <= maxMintedSupply, "IndexHybridToken: MAX_MINTED_SUPPLY_LIMIT");
    }

    function _addAsset(bytes8 _symbol, uint16 _weight) private onlyWhitelisted {
        portfolio.push(Asset(_symbol, _weight));
        emit AssetAdded(_symbol, _weight);
    }
}