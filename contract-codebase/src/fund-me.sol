//SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import {Converter} from "./Converter.sol";
import {AggregatorV3Interface} from
    "../lib/chainlink-brownie-contracts/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

using Converter for uint256;

//0x76Cdd5a850a5B721A4f8285405d8a7ab5c3fc7E4 deployed and verified on Sepolia testnet

contract FundMe {
    error fundMe__NotOwner();
    error fundMe__NotEnoughEthSent();
    error fundMe__WithdrawFailed();

    uint256 public constant MINIMUM_VALUE_USD = 5e18; 
    address[] private s_listOfAddressSentMoney;
    mapping(address addressOfSender => uint256 amountSent) private s_addressToAmountSent; 
    address private immutable i_owner; 
    AggregatorV3Interface private s_priceFeed;

    event Funded(address indexed funder, uint256 amount);

    modifier CheckIfItsOwner() {
        if (msg.sender != i_owner) {
            revert fundMe__NotOwner();
        } 
        _; 
    }

    constructor(address priceFeed) {
        i_owner = msg.sender;
        s_priceFeed = AggregatorV3Interface(priceFeed);
    }

    function fund() public payable {
        if (msg.value.getConversionRate(s_priceFeed) < MINIMUM_VALUE_USD) {
            revert fundMe__NotEnoughEthSent();
        }
        s_listOfAddressSentMoney.push(msg.sender);
        s_addressToAmountSent[msg.sender] += msg.value;
        emit Funded(msg.sender, msg.value);
    }

    function withdraw() public CheckIfItsOwner {
        uint256 fundersLength = s_listOfAddressSentMoney.length;
        for (uint256 i = 0; i < fundersLength; ++i) {
            address funder = s_listOfAddressSentMoney[i];
            s_addressToAmountSent[funder] = 0; 
        }

       
        delete s_listOfAddressSentMoney;

        (bool callSuccess,) = payable(msg.sender).call{value: address(this).balance}("");
        if (!callSuccess) {
            revert fundMe__WithdrawFailed();
        }
    }

    
    receive() external payable {
        fund();
    }

    
    fallback() external payable {
        fund();
    }

   
    function getAddressToAmountSent(address fundingAddress) external view returns (uint256) {
        return s_addressToAmountSent[fundingAddress];
    }

    function getAddressOfFunder(uint256 index) external view returns (address) {
        return s_listOfAddressSentMoney[index];
    }

    function getOwner() external view returns (address) {
        return i_owner;
    }

    function getLatestFunder() external view returns (address) {
        uint256 len = s_listOfAddressSentMoney.length;
        return len == 0 ? address(0) : s_listOfAddressSentMoney[len - 1];
    }

    function getFundersCount() external view returns (uint256) {
        return s_listOfAddressSentMoney.length;
    }
}
