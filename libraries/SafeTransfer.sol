// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.6.6;

library SafeTransfer {
    function sendERC20(address _token, address _to, uint256 _amount) internal returns (bool) {
        (bool callSuccess, bytes memory callReturnValueEncoded) = address(_token).call(
            abi.encodeWithSignature("transfer(address,uint256)", _to, _amount)
        );
        // `transfer` method may return (bool) or nothing.
        bool returnedSuccess = callReturnValueEncoded.length == 0 || abi.decode(callReturnValueEncoded, (bool));
        require(callSuccess && returnedSuccess, "SafeTransfer: SEND_ERC20");
    }

    function transferFromERC20(address _token, address _from, address _to, uint256 _amount) internal returns (bool) {
        (bool callSuccess, bytes memory callReturnValueEncoded) = address(_token).call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", _from, _to, _amount)
        );
        // `transferFrom` method may return (bool) or nothing.
        bool returnedSuccess = callReturnValueEncoded.length == 0 || abi.decode(callReturnValueEncoded, (bool));
        require(callSuccess && returnedSuccess,  "SafeTransfer: TRANSFER_FROM");
    }
}
