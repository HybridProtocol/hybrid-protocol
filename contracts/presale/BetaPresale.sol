// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.6;

import "../../libraries/PresaleConstants.sol";
import "./Presale.sol";


contract BetaPresale is Presale {

    constructor(address _USDC, address _sHBT, uint _duration) public Presale(_USDC, _sHBT, _duration) {
        rate = PresaleConstants.BETA_PRESALE_RATE;              // 0.2 USDC
        purchasedLimit = PresaleConstants.BETA_PURCHASE_LIMIT;  // 20 000 sHBT
        totalLimit = PresaleConstants.BETA_PRESALE_LIMIT;       // 5 000 000 sHBT
    }
}
