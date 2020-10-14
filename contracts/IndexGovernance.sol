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
    uint lastProposalId;
    mapping (uint => mapping (address => uint)) public votesOfUserByProposalId;

    struct Proposal {
        uint id;
        bytes8[] assets;
        uint16[] weights;
        uint deadline;
        address initiator;
        uint pros;
        uint cons;
    }

    Proposal public proposal;

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
        require(_duration <= 6500);
        if (proposal.deadline != 0) {
            finalize();
        }

        uint totalWeights;
        for (uint i = 0; i < _weights.length; i++) {
            totalWeights += _weights[i];
        }
        require(totalWeights == 10000, "IndexGovernance: TOTAL_WEIGHTS");

        proposal = Proposal(++lastProposalId, _assets, _weights, block.number.add(_duration), msg.sender, 0, 0);
        emit ProposalCreated(_assets, _weights, _duration, msg.sender);
    }

    function vote(uint _amount, bool _decision) public {
        require(proposal.deadline > block.number, "IndexGovernance: VOTING_NOT_IN_PROGRESS");
        SafeTransfer.transferFromERC20(address(stakingToken), msg.sender, address(this), _amount);
        if (_decision) {
            proposal.pros = proposal.pros.add(_amount);
        } else {
            proposal.cons = proposal.cons.add(_amount);
        }
        votesOfUserByProposalId[proposal.id][msg.sender] = votesOfUserByProposalId[proposal.id][msg.sender].add(_amount);
        emit Voted(msg.sender, _amount, _decision);
    }

    function finalize() public {
        require(proposal.deadline < block.number, "IndexGovernance: VOTING_IN_PROGRESS");
        if (proposal.pros > proposal.cons) {
            IIndexHybridToken(indexToken).updateComposition(proposal.assets, proposal.weights);
        }
        emit ProposalClosed(proposal.pros > proposal.cons,proposal.assets,proposal.weights,proposal.pros,proposal.cons,msg.sender);
        delete proposal;
    }

    function claimFunds(uint _amount, uint _proposalId) public {
        if (proposal.id == _proposalId) {
            require(proposal.deadline > block.number, "IndexGovernance: VOTING_IN_PROGRESS");
        }
        votesOfUserByProposalId[_proposalId][msg.sender] = votesOfUserByProposalId[_proposalId][msg.sender].sub(_amount);
        SafeTransfer.sendERC20(address(stakingToken), msg.sender, _amount);
    }

}