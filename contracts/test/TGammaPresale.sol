// SPDX-License-Identifier: Apache-2.0

pragma solidity >=0.6.6;

import "./TPresale.sol";


contract TGammaPresale is TPresale {

    constructor(address _USDC, address _sHBT, uint _duration) public TPresale(_USDC, _sHBT, _duration) {
        rate = GAMMA_PRESALE_RATE;              // 0.25 USDC
        purchasedLimit = GAMMA_PURCHASE_LIMIT;  // 40 000 sHBT
        totalLimit = GAMMA_PRESALE_LIMIT;       // 4 000 000 sHBT
    }
}
