//SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Test, console} from "forge-std/Test.sol"; //Test gives access to assertions and cheatcodes (vm, assertEq, etc.)
import {FundMe} from "../src/fund-me.sol";
import {FundMeScript} from "../script/FundMe.s.sol";

contract FundMeTest is Test {
    FundMe fundMe;
    uint256 constant ONE_ETH = 1e18;
    address USER = makeAddr("user"); //makeAddr() is a Foundry utility function that generate a unique random Ethereum address.
    uint256 constant USER_INITIAL_BALANCE = 10e18;

    modifier funded() {
        //so we dont have to repeat this prank user all the time
        vm.prank(USER);
        fundMe.fund{value: ONE_ETH}();
        _;
    }

    function setUp() external {
        FundMeScript deployFundMe = new FundMeScript();
        fundMe = deployFundMe.run();
        vm.deal(USER, USER_INITIAL_BALANCE); //vm.deal Foundry cheatcode that allows you to directly set the balance of any address for testing purposes.
        //syntax vm.deal(address, amount);
    }

    //here testing if the variable MINIMUM_VALUE_USD is actually returning 5
    //ps: need to check the variable to the function
    //assertEq() is sort of require()
    function test_CheckMinDollarIsFive() public view {
        assertEq(fundMe.MINIMUM_VALUE_USD(), 5e18);
    }

    //checking if the sender of the contract will be set to the owner
    function test_Owner_IsTheContractOwner() public view {
        // forge test -vv  the number of console.log we want to return
        console.log(fundMe.getOwner()); //address that was test deployed
        console.log(msg.sender); //the actualm owner address
        assertEq(fundMe.getOwner(), msg.sender);
    }

    //////////////////////////////////////////////////////////////
    ///////////////////     FUND FUNCTION        /////////////////
    //////////////////////////////////////////////////////////////

    function test_Fund_UpdatesDataStructure() public {
        vm.prank(USER); //the next transaction will be sent by USER aadress
        //This line simulates someone funding the FundMe contract with 1 ETH (in wei).
        fundMe.fund{value: ONE_ETH}();
        //Calls the getAddressToAmountToAmountSent function to check how much ETH the current contract (test contract) has sent to fundMe.
        uint256 amountFunded = fundMe.getAddressToAmountToAmountSent(address(USER));
        //Using Foundry’s assertEq function to verify that the amountFunded matches 1e18 (1 ETH).
        assertEq(amountFunded, ONE_ETH);
    }

    function test_Fund_AddsFunderToArrayOfFunders() public {
        vm.prank(USER);
        fundMe.fund{value: ONE_ETH}();

        address funder = fundMe.getAddressOfFunder(0);
        assertEq(funder, USER);
    }

    function test_Fund_Reverts_IfFundIsBelowMinimum() public {
        vm.prank(USER);
        vm.expectRevert(FundMe.fundMe__NotEnoughEthSent.selector);
        fundMe.fund{value: 1}(); // way below threshold
    }

    function test_Fund_EmitsEventAfterFunded() public {
        vm.prank(USER);
        vm.expectEmit(true, false, false, true); // indexed funder, others don't matter
        emit FundMe.Funded(USER, 1 ether);
        fundMe.fund{value: 1 ether}();
    }

    //////////////////////////////////////////////////////////////
    ///////////////////     WITHDRAW        //////////////////////
    //////////////////////////////////////////////////////////////
    function test_Withdraw_Reverts_IfNotOwnerWithdraw() public funded {
        //this should revert bcs the user funding is not expected to revert only the owner
        vm.prank(USER);
        vm.expectRevert();

        fundMe.withdraw();
    }

    function test_Withdraw_Success_WithSingleFunder() public funded {
        //arrange
        uint256 startingOwnerBalance = fundMe.getOwner().balance; //getting owners balance
        uint256 startingFundMeBalance = address(fundMe).balance;
        //act
        vm.prank(fundMe.getOwner());
        fundMe.withdraw();
        //assert
        uint256 endingOwnerBalance = fundMe.getOwner().balance;
        uint256 endingFundMeBalance = address(fundMe).balance;
        assertEq(endingFundMeBalance, 0);
        assertEq(startingFundMeBalance + startingOwnerBalance, endingOwnerBalance);
    }

    function test_Withdraw_Success_FromMultipleFunders() public funded {
        uint160 numberOfFunders = 10;
        uint160 startingFunderIndex = 1;
        for (uint160 i = startingFunderIndex; i < numberOfFunders; i++) {
            //HOAX is vm.pran() vm.deal() combined
            hoax(address(i), ONE_ETH);
            fundMe.fund{value: ONE_ETH}();
        }

        uint256 startingOwnerBalance = fundMe.getOwner().balance;
        uint256 startingFundMeBalance = address(fundMe).balance;
        //act
        vm.startPrank(fundMe.getOwner());
        fundMe.withdraw();
        vm.stopPrank();
        //assert

        assert(address(fundMe).balance == 0);
        assert(startingFundMeBalance + startingOwnerBalance == fundMe.getOwner().balance);
    }

    function test_Withdraw_ResetsState() public {
        vm.prank(USER);
        fundMe.fund{value: 1 ether}();

        vm.prank(fundMe.getOwner());
        fundMe.withdraw();

        // mapping reset
        assertEq(fundMe.getAddressToAmountToAmountSent(USER), 0);
        // array cleared
        assertEq(fundMe.getFundersCount(), 0);
        // balance drained
        assertEq(address(fundMe).balance, 0);
    }

    function test_Withdraw_NoFunds_TransfersZero() public {
        address owner = fundMe.getOwner();
        uint256 before = owner.balance;

        vm.prank(owner);
        fundMe.withdraw();

        assertEq(address(fundMe).balance, 0);
        assertEq(owner.balance, before); // nothing to withdraw, balance unchanged
    }

    /// receive: empty data -> should fund
    function test_receive_RoutesToFund() public {
        vm.prank(USER);
        (bool ok,) = address(fundMe).call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(fundMe.getAddressToAmountToAmountSent(USER), 1 ether);
    }

    /// fallback: non-empty data -> should fund
    function test_fallback_RoutesToFund() public {
        vm.prank(USER);
        (bool ok,) = address(fundMe).call{value: 1 ether}(hex"01");
        assertTrue(ok);
        assertEq(fundMe.getAddressToAmountToAmountSent(USER), 1 ether);
    }

    //////////////////////////////////////////////////////////////
    ///////////////////     GETTERS        //////////////////////
    //////////////////////////////////////////////////////////////

    function test_GetAmount_AfterFunding() public {
        vm.prank(USER);
        // fundMe.fund{value: ONE_ETH}();
        (bool ok,) = address(fundMe).call{value: ONE_ETH}(""); // routes to receive() -> getFunds()
        assertTrue(ok);

        assertEq(fundMe.getAddressToAmountToAmountSent(USER), ONE_ETH);
    }


    function test_GetAddressOfFunder() public {
        vm.prank(USER);
        // fundMe.fund{value: ONE_ETH}();
        (bool ok,) = address(fundMe).call{value: ONE_ETH}("");
        assertTrue(ok);

        assertEq(fundMe.getAddressOfFunder(0), USER);
    }



    function test_GetLatestFunder_ReturnsZeroWhenNone() public view {
        // no funders yet → should return address(0)
        assertEq(fundMe.getLatestFunder(), address(0));
    }

    function test_GetLatestFunder_ReturnsLastFunder() public {
        address user1 = makeAddr("user1");
        address user2 = makeAddr("user2");
        vm.deal(user1, 1 ether);
        vm.deal(user2, 1 ether);

        vm.prank(user1);
        fundMe.fund{value: 0.5 ether}(); // first funder

        vm.prank(user2);
        fundMe.fund{value: 1 ether}(); // second (latest) funder

        assertEq(fundMe.getLatestFunder(), user2);
    }
}

//forge test = to run the test file
//Modular deployments
//Modular testings
