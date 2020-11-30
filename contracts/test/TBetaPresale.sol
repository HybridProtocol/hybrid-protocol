// SPDX-License-Identifier: Apache-2.0

pragma solidity >=0.6.6;

import "./TPresale.sol";


contract TBetaPresale is TPresale {

    constructor(address _USDC, address _sHBT, uint _duration) public TPresale(_USDC, _sHBT, _duration) {
        rate = BETA_PRESALE_RATE;              // 0.2 USDC
        purchasedLimit = BETA_PURCHASE_LIMIT;  // 20 000 sHBT
        totalLimit = BETA_PRESALE_LIMIT;       // 5 000 000 sHBT
    }
}
