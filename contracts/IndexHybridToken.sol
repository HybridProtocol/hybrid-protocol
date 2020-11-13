// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../utils/Maintenance.sol";


contract IndexHybridToken is ERC20, Maintenance, ReentrancyGuard {

    string private constant NAME = "Index Hybrid Token";
    string private constant SYMBOL = "xHBT";

    struct Asset {
        bytes8 symbol;
        uint16 weight; // e.g. 100.00 as 10000
    }

    Asset[] public portfolio;

    event CompositionUpdated(bytes8[] assets, uint16[] weight);

    uint256 public immutable maxMintedSupply;

    constructor (
        uint256 _totalSupply,
        uint256 _maxMintedSupply
    ) public ERC20(NAME, SYMBOL) {
        _mint(msg.sender, _totalSupply);
        require(_totalSupply <= _maxMintedSupply, "IndexHybridToken: MAX_MINTED_SUPPLY_LIMIT");
        maxMintedSupply = _maxMintedSupply;
    }

    function updateComposition(bytes8[] calldata _assets, uint16[] calldata _weights) external onlyMaintainers nonReentrant {
        require(_assets.length == _weights.length, "IndexHybridToken: INVALID_LENGTH");
        uint totalWeights;
        for (uint i = 0; i < _weights.length; i++) {
            totalWeights += _weights[i];
        }
        require(totalWeights == 10000, "IndexHybridToken: TOTAL_WEIGHTS");
        delete portfolio;
        for (uint i = 0; i < _weights.length; i++) {
            portfolio.push(Asset(_assets[i], _weights[i]));
        }
        emit CompositionUpdated(_assets, _weights);
    }

    function mintAmount(address[] calldata _accounts, uint256 _amount) external onlyMaintainers nonReentrant {
        for (uint i = 0; i < _accounts.length; ++i) {
            _mint(_accounts[i], _amount);
        }
        require(totalSupply() <= maxMintedSupply, "IndexHybridToken: MAX_MINTED_SUPPLY_LIMIT");
    }

    function mintAmounts(address[] calldata _accounts, uint256[] calldata _amounts) external onlyMaintainers nonReentrant {
        require(_accounts.length == _amounts.length, "IndexHybridToken: INVALID_LENGTH");
        for (uint i = 0; i < _accounts.length; ++i) {
            _mint(_accounts[i], _amounts[i]);
        }
        require(totalSupply() <= maxMintedSupply, "IndexHybridToken: MAX_MINTED_SUPPLY_LIMIT");
    }
}