// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

//Need to add Blacklisted accounts, need to add ROLE, 
//need to add max_transfer limit,  maxTotalSupply ,

contract Compliance is AccessControl{
    uint256 public maxTotalSupply;
    uint256 public maxTransferLimit;
    

    //uint256 public constant maxTotalSupply=10*20;
    //uint256 public constant max_transfer=10000000;

    bytes32 public constant COMPLIANCE_ROLE= keccak256("COMPLIANCE_ROLE");

    mapping(address => bool) public isBlacklisted;

    event MaxTotalSupply(uint256  amount);
    event MaxTransferLimit(uint256  amount);
    event BlackListed(address indexed user);
    event UnBlackListed(address indexed user);
   

    error InvalidAmount();
    error ZeroAddress();
    error AlreadyBlacklisted();
    error AlreadyUnBlacklisted();
    error TransferLimitExceeded();
    error TotalSupplyLimitExceeded();

    constructor(){
        _grantRole(COMPLIANCE_ROLE, msg.sender);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    function setMaxTotalSupply(uint256 _totalSupply) public onlyRole(COMPLIANCE_ROLE){
        if(_totalSupply==0) revert InvalidAmount();
        maxTotalSupply = _totalSupply;
        emit MaxTotalSupply(_totalSupply);
    }

    function setTransferLimit(uint256 transferLimit) public onlyRole(COMPLIANCE_ROLE){
        if(transferLimit==0) revert InvalidAmount();
        maxTransferLimit = transferLimit;
        emit MaxTransferLimit(transferLimit);
    }

    function addBlacklist(address user) public onlyRole(COMPLIANCE_ROLE) {
        if(user== address(0))revert ZeroAddress();
        if(isBlacklisted[user]) revert AlreadyBlacklisted();
        isBlacklisted[user]= true;
    }

    function removeBlacklist(address user) public onlyRole(COMPLIANCE_ROLE) {
      if(user== address(0))revert ZeroAddress();
       if(!isBlacklisted[user]) revert AlreadyUnBlacklisted();
        isBlacklisted[user]= false;
    }

    function checkBlacklist(address user) view public returns(bool) {
      if(user== address(0))revert ZeroAddress();
       return (isBlacklisted[user]);
    }

   
   function canTransfer(address from,address to, uint256 amount) public view returns (bool)
    {
        if (isBlacklisted[from] || isBlacklisted[to]) revert AlreadyBlacklisted();
        if (maxTransferLimit != 0 && amount > maxTransferLimit) revert TransferLimitExceeded();
    
        return true;
    }

    function canMint(address to, uint256 currentSupply,uint256 amount) public view returns (bool)
    {   if(maxTotalSupply < currentSupply + amount) revert TotalSupplyLimitExceeded();
        if (isBlacklisted[to]) revert AlreadyBlacklisted();
        return true;
    }

    function checkMaxSupply() view public returns(uint256) {
      return maxTotalSupply;
    }
    function checkMaxTransferLimit() view public returns(uint256) {
      return maxTransferLimit;
    }

}
