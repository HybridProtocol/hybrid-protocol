// SPDX-License-Identifier: Apache-2.0

pragma solidity >=0.6.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./presale/PresaleConstants.sol";
import "../utils/Maintenance.sol";


contract HybridToken is ERC20, PresaleConstants, Maintenance {
    constructor(
        string memory _name,
        string memory _symbol,
        address initialAccount,
        uint initialBalance
    ) ERC20(_name, _symbol) public {
        _mint(initialAccount, initialBalance);
    }

    function mintForSwap(address _vestingSwap) external onlyMaintainers {
        uint total = ALPHA_PRESALE_LIMIT.add(BETA_PRESALE_LIMIT).add(GAMMA_PRESALE_LIMIT);
        _mint(_vestingSwap, total);
    }
}