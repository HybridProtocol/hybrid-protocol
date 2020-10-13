//SPDX-License-Identifier: Unlicense
pragma solidity ^0.6.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./IndexHybridToken.sol";
import "../interfaces/IIndexHybridToken.sol";
import "../interfaces/IHybridToken.sol";
import "../utils/Maintenance.sol";
import "../libraries/SafeTransfer.sol";

contract IndexGovernance is Maintenance {
    using SafeMath for uint256;

    address public indexToken;
    address public stakingToken;
    uint public pros;
    uint public cons;

    struct Proposal {
        bytes8[] assets;
        uint16[] weights;
        uint votingDuration;
        uint votingStart;
        address initiator;
    }

    struct Vote {
        address voter;
        uint amount;
        bool decision;
    }

    Proposal public proposal;
    Vote[] private votes;

    event ProposalCreated(bytes8[] assets, uint16[] weights, uint votingDuration, address initiator);
    event Voted(address voter, uint amount, bool decision);
    event ProposalClosed(bool accepted, bytes8[] assets, uint16[] weights, uint pros, uint cons, address initiator);

    constructor(address _indexToken) public {
        indexToken = _indexToken;
    }

    function createProposal(
        bytes8[] memory _assets, 
        uint16[] memory _weights,
        uint _duration
    ) public onlyMaintainers {
        require(_assets.length == _weights.length, "IndexGovernance: INVALID_LENGTH");
        assert(pros == 0 && cons == 0);
        uint totalWeights;
        for (uint i = 0; i < _weights.length; i++) {
            totalWeights += _weights[i];
        }
        require(totalWeights == 10000, "IndexGovernance: TOTAL_WEIGHTS");
        proposal = Proposal(_assets, _weights, _duration, now, msg.sender);
        emit ProposalCreated(_assets, _weights, _duration, msg.sender);
    }

    function vote(uint _amount, bool _decision) public {
        require(proposal.votingStart.add(proposal.votingDuration) > now, "IndexGovernance: VOTING_NOT_IN_PROGRESS");
        require(SafeTransfer.transferFromERC20(address(stakingToken), msg.sender, address(this), _amount), "IndexGovernance: TRANSFER_FROM");
        if (_decision) {
            pros++;
        } else {
            cons++;
        }
        votes.push(Vote(msg.sender, _amount, _decision));
        emit Voted(msg.sender, _amount, _decision);
    }

    function finalize() public {
        require(proposal.votingStart.add(proposal.votingDuration) < now, "IndexGovernance: VOTING_IN_PROGRESS");
        if (pros > cons) {
            IIndexHybridToken(indexToken).updateComposition(proposal.assets, proposal.weights);
        }
        for (uint i = 0; i < votes.length; i++) {
            require(SafeTransfer.sendERC20(address(stakingToken), votes[i].voter, votes[i].amount), "IndexGovernance: SEND_ERC20");
        }
        emit ProposalClosed(pros > cons, proposal.assets, proposal.weights, pros, cons, msg.sender);

        delete proposal;
        delete votes;
        delete pros;
        delete cons;
    }

}