// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./Compliance.sol";

contract ERC20 is Pausable,  Compliance{
    //  storage Variable
    string public name;
    string public symbol;
    uint256 public totalSupply;
   
    //  Constant and Immutable variable
    //bytes32 public constant DEFAULT_ADMIN_ROLE=keccak256("DEFAULT_ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE=keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE=keccak256("PAUSER_ROLE");
    
    
    //  mappings and array
    mapping(address=> uint256) public balances;
    mapping(address => mapping(address=>uint256)) public allowances;

    
    //  events
    event Minted (address indexed to,uint256 amount);
    event Burned (address indexed to,uint256 amount);
    event Transferred(address indexed from,address indexed to, uint256 amount);
    event Approval(address indexed owner,address indexed spender, uint256 amount);
    

    //  errors Message
    error InsufficientBalance();
    error AmountZero();
    error InsufficientAllowances();
    error NotTransferred();
     error ReentrantCall();
  
   
    //  constructors
    constructor(string memory _name, string memory _symbol){
        name= _name;
        symbol = _symbol;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(COMPLIANCE_ROLE, msg.sender); 
    }

    //  modifiers
    

    //  functions
    //  mint/Burn/ transfer
    function mint(address to, uint256 amount) external whenNotPaused onlyRole(MINTER_ROLE){
        if(to == address(0)) revert ZeroAddress();
        if(amount == 0) revert AmountZero();
        //bool status =;
        if(!canMint(to, totalSupply,amount)) revert TotalSupplyLimitExceeded();
        balances[to] += amount;
        totalSupply +=amount;
        emit Minted(to, amount);  
    }

    function burn(address from, uint256 amount) external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE){
        if(from == address(0)) revert ZeroAddress();
        if(amount == 0) revert AmountZero();
        if(balances[from] < amount) revert InsufficientBalance();

        balances[from] -= amount;
        totalSupply -=amount;

        emit Burned(from, amount);  
    }

    function transfer(address to, uint256 amount) public whenNotPaused {
        if(to == address(0)) revert ZeroAddress();
        if(amount == 0) revert AmountZero();
         if(balances[msg.sender] < amount) revert InsufficientBalance();
            if(!canTransfer(msg.sender,to, amount)) revert NotTransferred();

        balances[msg.sender] -= amount;
        balances[to] += amount;

        emit Transferred(msg.sender, to, amount); 
    }

    function approve(address spender, uint256 amount) external whenNotPaused{
        if(spender == address(0)) revert ZeroAddress();
        if(amount == 0) revert AmountZero();
        
        allowances[msg.sender][spender] = amount;

        emit Approval(msg.sender, spender, amount);
    }
    

    function increaseAllowance(address spender, uint256 amount) public whenNotPaused{
        if(spender == address(0)) revert ZeroAddress();
        if(amount == 0) revert AmountZero();
        allowances[msg.sender][spender] += amount;
         emit Approval(msg.sender, spender, allowances[msg.sender][spender]);
    }

    function decreaseAllowance(address spender, uint256 amount) external  whenNotPaused{
        if(spender == address(0)) revert ZeroAddress();
        if(amount==0) revert AmountZero();
        if (allowances[msg.sender][spender] < amount) {
                 revert InsufficientAllowances();
        }
        allowances[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowances[msg.sender][spender]);

    }
    function transferFrom(address from, address to, uint256 amount) external whenNotPaused {
        if((to == address(0)) || (from == address(0))) revert ZeroAddress();
        if(amount == 0) revert AmountZero();
        if(allowances[from][msg.sender] < amount) revert InsufficientAllowances();
        if (balances[from] < amount) {
            revert InsufficientBalance();
        }
         if(!canTransfer(from,to, amount)) revert NotTransferred();
        allowances[from][msg.sender] -= amount;

        balances[from] -= amount;
        balances[to] += amount;

        emit Approval(from,msg.sender,allowances[from][msg.sender]);

        emit Transferred(from,to,amount);
    }

    //Pauseablilty
    function pause() external  onlyRole(PAUSER_ROLE){
        _pause();
        
    }

    function unpause() external  onlyRole(PAUSER_ROLE){
        _unpause();
        
    }


    //  compliance
    //  other functions
   
    //for renentrenctcy...
    // uint256 private _reentrancyStatus = 1;

    // modifier nonReentrant() {
    // if (_reentrancyStatus == 2) {revert ReentrantCall();}

    //     _reentrancyStatus = 2;
    //     _;
    //     _reentrancyStatus = 1;
    // }

}