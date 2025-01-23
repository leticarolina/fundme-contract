"use client";
import { ethers } from "ethers";
import { useState } from "react";

export default function Home() {
  const [account, setAccount] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [contractBalance, setContractBalance] = useState(null);
  const [ethAmount, setEthAmount] = useState("");
  const [showWindow, setShowWindow] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [showMinContribution, setShowMinContribution] = useState(false);

  //to be checked
  const contractAddress = "0x933b20396aa6214a5795cdb0b13aef7c4cf160bb";
  const abi = [
    "function withdraw() public",
    "function getOwner() external view returns (address)",
    "function getFunds() public payable",
  ];
  const provider = new ethers.BrowserProvider(window.ethereum);
  // Check contract balance with toggle functionality
  const checkContractBalance = async () => {
    try {
      if (!showBalance) {
        const balance = await provider.getBalance(contractAddress);
        const formattedBalance = parseFloat(
          ethers.formatEther(balance)
        ).toFixed(5);
        setContractBalance(formattedBalance);
      }
      setShowBalance(!showBalance);
    } catch (error) {
      console.error("Error fetching contract balance:", error);
    }
  };

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== "undefined") {
        const [selectedAccount] = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAccount(selectedAccount);
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };

  const fundContract = async () => {
    try {
      if (!ethAmount || isNaN(ethAmount) || parseFloat(ethAmount) <= 0) {
        alert("Please enter a valid amount of ETH!");
        return;
      }

      // Ensure MetaMask is available
      if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
      }

      // Connect provider and get signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Create contract instance with signer to allow transactions
      const contract = new ethers.Contract(contractAddress, abi, signer);

      // Send funds to contract
      const tx = await contract.getFunds({
        value: ethers.parseEther(ethAmount), // Convert ETH to wei
      });

      console.log("Funds transaction sent:", tx.hash);
      await tx.wait();
      alert("Funds transaction confirmed!");

      setEthAmount(""); // Clear input after transaction
    } catch (error) {
      console.error("Error sending funds:", error);
      alert("Transaction failed! Please try again.");
    }
  };

  const withdrawFunds = async () => {
    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi, signer);
      const owner = await contract.connect(provider).getOwner();
      const connectedAccount = await signer.getAddress();

      if (connectedAccount.toLowerCase() !== owner.toLowerCase()) {
        setShowWindow(true);
        return;
      }

      const tx = await contract.withdraw();
      await tx.wait();
    } catch (error) {
      console.error("Error during withdrawal:", error);
    }
  };

  return (
    <div className="bg-pattern bg-cover bg-center h-screen opacity-90 flex flex-col items-center justify-center text-white">
      {/* Connect Wallet Button Positioned at the Top-Right */}
      <div className="absolute top-5 right-5">
        {account ? (
          <button className="bg-green-500 text-white font-semibold py-3 px-6 rounded-sm shadow-lg hover:bg-green-600 transition">
            Connected
          </button>
        ) : (
          <button
            onClick={connectWallet}
            className="bg-white/20 text-white font-semibold py-3 px-6 rounded-sm shadow-lg backdrop-blur-md hover:bg-white/30 transition"
          >
            Connect Wallet
          </button>
        )}
      </div>
      {/* Title Section */}
      <h1 className="text-5xl font-bold mb-12 text-white text-center">
        Leti's Funding Portal
      </h1>
      {/* Wallet Info & Input Section */}
      <div className=" p-4 bg-white/30 backdrop-blur-lg rounded-sm shadow-md text-center text-xl font-medium text-white max-w-lg mx-auto">
        {account ? (
          <p className="flex items-center justify-center">
            Connected Wallet:{" "}
            <span className="font-bold text-green-600 ml-2">
              {account.slice(0, 10)}...{account.slice(-8)}
            </span>
          </p>
        ) : (
          <p className="text-red-600 font-semibold text-lg">
            No wallet connected.
          </p>
        )}
      </div>
      <div className="mt-4 p-4 bg-white/10 backdrop-blur-sm rounded-sm shadow-md flex flex-col md:flex-row items-center max-w-lg mx-auto w-full">
        <input
          type="text"
          placeholder="Enter amount in ETH"
          value={ethAmount}
          onChange={(e) => setEthAmount(e.target.value)}
          onFocus={() => setShowMinContribution(true)}
          onBlur={() => setShowMinContribution(false)}
          className="py-3 px-4 rounded-sm bg-gray-300 text-black border border-gray-400 w-full outline-none"
        />
        <button
          onClick={fundContract}
          className="ml-4 bg-green-500 text-white font-semibold py-3 px-6 rounded-sm shadow-md hover:bg-green-600 transition whitespace-nowrap w-full md:w-auto"
        >
          Send Funds
        </button>
      </div>{" "}
      {/* Show minimum contribution message when input is focused */}
      {showMinContribution && (
        <p className="text-red-500 text-sm mt-2 font-semibold">
          * Minimum contribution required: 5 USD worth of ETH.
        </p>
      )}
      {/* Check Contract Balance Button */}
      <div className="mt-6">
        <button
          onClick={checkContractBalance}
          className="bg-purple-400/70 text-white py-3 px-6 rounded-sm shadow-md hover:bg-purple-500/80 transition"
        >
          Check Contract Balance
        </button>
      </div>
      {/* Contract Balance and Withdraw Section */}
      {contractBalance && (
        <div className="mt-6 p-2 bg-white/10  rounded-sm shadow-md flex items-center max-w-lg w-md">
          <p className="py-3 px-4 rounded-sm bg-gray-800 text-white border border-gray-600 w-md text-center font-semibold">
            Balance:{" "}
            <span className="text-green-300">{contractBalance} ETH</span>
          </p>
          <button
            onClick={withdrawFunds}
            className="ml-4 bg-red-500 text-white font-semibold py-2 px-4 rounded-sm shadow-md hover:bg-red-600 transition whitespace-nowrap h-full"
          >
            Withdraw Funds
          </button>
        </div>
      )}
      {/* Modal Popup for Non-Owner Access */}
      {showWindow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white text-black p-6 rounded-lg shadow-lg text-center">
            <p className="text-xl font-semibold">
              You are not the contract owner to withdraw!
            </p>
            <button
              onClick={() => setShowWindow(false)}
              className="mt-4 bg-blue-900 text-white py-2 px-6 rounded-lg hover:bg-blue-800 transition"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
