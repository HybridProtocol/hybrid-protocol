//SPDX-License-Identifier: Unlicense
pragma solidity ^0.6.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./IndexHybridToken.sol";
import "../interfaces/IIndexHybridToken.sol";
import "../interfaces/IHybridToken.sol";
import "../utils/Whitelist.sol";
import "../libraries/SafeTransfer.sol";

contract IndexGovernance is Whitelist {
    using SafeMath for uint256;

    address public indexToken;
    address public stakingToken;

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
    event ProposalClosed(bool accepted, bytes8[] assets, uint16[] weights, uint total, uint diff, address initiator);

    constructor(address _indexToken) public {
        indexToken = _indexToken;
    }

    function createProposal(
        bytes8[] memory _assets, 
        uint16[] memory _weights,
        uint _duration
    ) public onlyWhitelisted notInProgress {
        require(_assets.length == _weights.length, "IndexGovernance: INVALID_LENGTH");
        uint totalWeights;
        for (uint i = 0; i < _weights.length; i++) {
            totalWeights += _weights[i];
        }
        require(totalWeights == 10000, "IndexGovernance: TOTAL_WEIGHTS");
        proposal = Proposal(_assets, _weights, _duration, now, msg.sender);
        emit ProposalCreated(_assets, _weights, _duration, msg.sender);
    }

    function vote(uint _amount, bool _decision) public inProgress {
        require(SafeTransfer.transferFromERC20(address(stakingToken), msg.sender, address(this), _amount), "IndexGovernance: TRANSFER_FROM");
        votes.push(Vote(msg.sender, _amount, _decision));
        emit Voted(msg.sender, _amount, _decision);
    }

    function finalize() public inProgress {
        uint pros;
        uint cons;

        for (uint i = 0; i < votes.length; i++) {
            if (votes[i].decision) {
                pros.add(votes[i].amount);
            } else {
                cons.add(votes[i].amount);
            }
        }

        if (pros > cons) {
            IIndexHybridToken(indexToken).updateComposition(proposal.assets, proposal.weights);
            emit ProposalClosed(true, proposal.assets, proposal.weights, pros.add(cons), pros.sub(cons), msg.sender);
        } else {
            emit ProposalClosed(false, proposal.assets, proposal.weights, pros.add(cons), cons.sub(pros), msg.sender);
        }

        for (uint i = 0; i < votes.length; i++) {
            require(SafeTransfer.sendERC20(address(stakingToken), votes[i].voter, votes[i].amount), "IndexGovernance: SEND_ERC20");
        }

        delete proposal;
        delete votes;
    }

    modifier inProgress() {
        require(proposal.votingStart.add(proposal.votingDuration) > now, "IndexGovernance: VOTING_NOT_IN_PROGRESS");
        _;
    }

    modifier notInProgress() {
        require(proposal.votingStart.add(proposal.votingDuration) < now, "IndexGovernance: VOTING_IN_PROGRESS");
        _;
    }

}