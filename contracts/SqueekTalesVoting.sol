// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ISqueekCore {
    struct CoreConfiguration {
        bytes32 streamId;
        uint64 genesisTimestamp;
        uint64 roundDuration;
        uint64 maxWorkPerRound;
        uint16 maxRoundsPerBatch;
        address guardian;
        address reporter;
        uint32 initialWorkPerThousandBlocks;
        uint64 targetBlocksPerActiveRound;
        uint64 difficultySmoothingRounds;
        uint96 blockUnitsPerBlock;
    }
    function configuration() external view returns (CoreConfiguration memory);
    function paused() external view returns (bool);
}

/// @notice One free preference vote per address per open Squeekchain round.
///         Votes do not influence the official wheel-work settlement.
contract SqueekTalesVoting {
    error WrongChain();
    error InvalidCore();
    error InvalidChoice();
    error RoundClosed();
    error AlreadyVoted();
    error CorePaused();
    error InvalidPage();

    struct Vote { uint8 choice; uint64 timestamp; bool recorded; }
    ISqueekCore public immutable core;
    uint64 public immutable genesisTimestamp;
    uint64 public immutable roundDuration;
    mapping(uint64 => mapping(address => Vote)) public votes;
    mapping(uint64 => mapping(uint8 => uint256)) public choiceVotes;
    mapping(address => uint256) public voterVotes;
    address[] private voters;
    uint256 public totalVotes;

    event VoteCast(uint64 indexed roundId, uint8 indexed choice, address indexed voter, uint64 timestamp);

    constructor(address coreAddress) {
        if (block.chainid != 11155111) revert WrongChain();
        if (coreAddress.code.length == 0) revert InvalidCore();
        core = ISqueekCore(coreAddress);
        ISqueekCore.CoreConfiguration memory c = core.configuration();
        if (c.genesisTimestamp == 0 || c.roundDuration != 600) revert InvalidCore();
        genesisTimestamp = c.genesisTimestamp;
        roundDuration = c.roundDuration;
    }

    function currentRound() public view returns (uint64) {
        if (block.timestamp < genesisTimestamp) return 0;
        return uint64((block.timestamp - genesisTimestamp) / roundDuration + 1);
    }

    function vote(uint64 roundId, uint8 choice) external {
        if (choice > 1) revert InvalidChoice();
        if (roundId == 0 || roundId != currentRound()) revert RoundClosed();
        if (core.paused()) revert CorePaused();
        if (votes[roundId][msg.sender].recorded) revert AlreadyVoted();
        uint64 timestamp = uint64(block.timestamp);
        votes[roundId][msg.sender] = Vote(choice, timestamp, true);
        choiceVotes[roundId][choice]++;
        if (voterVotes[msg.sender] == 0) voters.push(msg.sender);
        voterVotes[msg.sender]++;
        totalVotes++;
        emit VoteCast(roundId, choice, msg.sender, timestamp);
    }

    function voterCount() external view returns (uint256) { return voters.length; }

    function voterPage(uint256 offset, uint256 limit) external view returns (address[] memory accounts, uint256[] memory counts) {
        if (limit > 100 || offset > voters.length) revert InvalidPage();
        uint256 end = offset + limit;
        if (end > voters.length) end = voters.length;
        accounts = new address[](end - offset);
        counts = new uint256[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            address account = voters[i];
            accounts[i - offset] = account;
            counts[i - offset] = voterVotes[account];
        }
    }
}
