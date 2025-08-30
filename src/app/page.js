"use client";
import { ethers } from "ethers";
import { useState, useEffect, useMemo } from "react";

export default function Home() {
  // ---- UI state ----
  const [account, setAccount] = useState(null);
  const [contractBalance, setContractBalance] = useState(null);
  const [ethAmount, setEthAmount] = useState("");
  const [showWindow, setShowWindow] = useState(false);
  const [showMinContribution, setShowMinContribution] = useState(false);

  // ---- contract info ----
  const contractAddress = "0xe5B77f2B20B86B36D1E502F256B121F592Be6dEe";
  const abi = [
    "event Funded(address indexed funder, uint256 amount)",
    "function withdraw() public",
    "function getOwner() external view returns (address)",
    "function fund() public payable",
  ];

  // ---- providers ----
  // Read-only provider pinned to Sepolia -> works even if no wallet / wrong wallet network
  const SEPOLIA_RPC =
    "https://eth-sepolia.g.alchemy.com/v2/2ef7uiLLqGeZqzXmhWIPu";
  const readProvider = useMemo(
    () => new ethers.JsonRpcProvider(SEPOLIA_RPC),
    []
  );
  const [provider, setProvider] = useState(null); // wallet provider (for writes)

  // Create read-only contract once
  const contractRead = useMemo(() => {
    return new ethers.Contract(contractAddress, abi, readProvider);
  }, [readProvider]);

  // Init wallet provider + listeners
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const p = new ethers.BrowserProvider(window.ethereum);
      setProvider(p);

      window.ethereum.on?.("accountsChanged", (accs) =>
        setAccount(accs?.[0] ?? null)
      );
      window.ethereum.on?.("chainChanged", () => window.location.reload());
    }
  }, []);

  // ---- helpers ----
  const REQUIRED_CHAIN_ID = 11155111n; // Sepolia

  const refreshBalance = async () => {
    try {
      const wei = await readProvider.getBalance(contractAddress);
      setContractBalance(parseFloat(ethers.formatEther(wei)).toFixed(5));
    } catch (e) {}
  };

  const getSignerAndContract = async () => {
    if (!provider) throw new Error("No wallet provider");
    const net = await provider.getNetwork();
    if (net.chainId !== REQUIRED_CHAIN_ID) {
      // Light, built-in chain switch
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }], // Sepolia
        });
      } catch {
        alert("Please switch your wallet to Sepolia.");
        throw new Error("Wrong network");
      }
    }
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(contractAddress, abi, signer);
    return { signer, contract };
  };

  // ---- initial load + live updates ----
  useEffect(() => {
    (async () => {
      // sanity log (optional)
      try {
        const net = await readProvider.getNetwork();
        const code = await readProvider.getCode(contractAddress);
      } catch {}
      await refreshBalance();
    })();

    // listen to Funded events to refresh balance live
    const onFunded = async () => {
      await refreshBalance();
    };
    contractRead.on("Funded", onFunded);

    // light polling as a fallback
    const id = setInterval(refreshBalance, 10000);

    return () => {
      contractRead.off("Funded", onFunded);
      clearInterval(id);
    };
  }, [contractRead, readProvider, contractAddress]);

  // ---- actions ----
  const connectWallet = async () => {
    if (!window?.ethereum) {
      // Lightweight mobile deeplink to MetaMask
      const dappURL = encodeURIComponent(window.location.href);
      window.location.href = `https://metamask.app.link/dapp/${dappURL}`;
      return;
    }
    const p = new ethers.BrowserProvider(window.ethereum);
    const [selectedAccount] = await p.send("eth_requestAccounts", []);
    setProvider(p);
    setAccount(selectedAccount);
  };

  const fundContract = async () => {
    try {
      if (!ethAmount || isNaN(ethAmount) || parseFloat(ethAmount) <= 0) {
        alert("Please enter a valid amount of ETH!");
        return;
      }
      const { signer, contract } = await getSignerAndContract();
      const valueWei = ethers.parseEther(ethAmount);

      // Preflight: signer balance
      const me = await signer.getAddress();
      const bal = await signer.provider.getBalance(me); // v6: read via provider
      if (bal < valueWei) {
        alert("Not enough ETH");
        return;
      }

      // Preflight: estimate gas via provider (v6-safe)
      const data = contract.interface.encodeFunctionData("fund", []);
      await signer.provider.estimateGas({
        to: contractAddress,
        from: me,
        data,
        value: valueWei,
      });

      // Send tx
      const tx = await contract.fund({ value: valueWei });
      await tx.wait();

      setEthAmount("");
      await refreshBalance();
    } catch (e) {
      const msg =
        e?.shortMessage ||
        e?.reason ||
        e?.info?.error?.message ||
        e?.message ||
        "Transaction failed";
      alert(msg);
    }
  };

  const withdrawFunds = async () => {
    try {
      const { signer, contract } = await getSignerAndContract();
      const owner = await contract.getOwner();
      const me = await signer.getAddress();
      if (me.toLowerCase() !== owner.toLowerCase()) {
        setShowWindow(true);
        return;
      }
      const tx = await contract.withdraw();
      await tx.wait();
      await refreshBalance();
    } catch (e) {
      alert("Error during withdrawal");
    }
  };

  return (
    <div className="min-h-screen bg-[#483460] bg-cover bg-center flex flex-col items-center justify-center text-white px-4 md:px-0 overflow-hidden">
      {/* Connect Wallet Button Positioned at the Top-Right */}
      <div className="absolute md:top-5 md:right-5 top-0 left-0 flex md:justify-end justify-center mt-4 md:mt-0 px-4 w-full">
        {account ? (
          <button className="bg-[#00B354] text-white font-semibold py-3 px-6 rounded-md shadow-lg hover:bg-green-600 transition">
            {account.slice(0, 10)}...{account.slice(-8)}
          </button>
        ) : (
          <button
            onClick={connectWallet}
            className="bg-white/20 text-white font-semibold py-3 px-6 rounded-md shadow-lg backdrop-blur-md hover:bg-white/30 transition"
          >
            Connect Wallet
          </button>
        )}
      </div>

      {/* Title Section */}
      <h1 className="text-5xl font-bold mb-8 mt-24 md:mt-8 text-[#EEEAF6] text-center z-10">
        <a
          href="https://github.com/yourgithubusername"
          target="_blank"
          className="relative transition-all duration-300 hover:text-white before:absolute before:bottom-0 before:left-0 before:w-0 before:h-1 before:bg-green-400 before:transition-all before:duration-300 hover:before:w-full"
        >
          Leti's
        </a>{" "}
        Funding Portal
      </h1>

      <p className="text-md text-gray-300  text-center mb-8">
        This project was part of my journey becoming a smart contract developer.
        If you’d like to try it out and support my work, it's possible directly
        through this <span className="font-semibold">dApp.</span>
      </p>
      <p className="text-lg text-gray-300 font-semibold text-center mb-4">
        Use <span className="text-green-600">Arbitrum Blockchain</span> to
        interact
      </p>

      {/* Input Section */}

      <div className="mt-4 p-4 bg-white/10 backdrop-blur-sm rounded-md shadow-md flex items-center max-w-lg mx-4 w-full space-x-3">
        <input
          type="text"
          placeholder="Amount in ETH"
          value={ethAmount}
          onChange={(e) => setEthAmount(e.target.value)}
          onFocus={() => setShowMinContribution(true)}
          onBlur={() => setShowMinContribution(false)}
          className="py-3 px-4 rounded-lg bg-gray-300 text-black border border-gray-400 w-1/2 md:w-2/3 outline-none text-center"
        />
        <button
          onClick={fundContract}
          className="bg-[#009B4E] text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-green-600 transition whitespace-nowrap w-1/2 md:w-auto text-center"
        >
          Send Funds
        </button>
      </div>

      {/* Show minimum contribution message*/}
      {showMinContribution && (
        <p className="text-red-300 text-sm mt-2  ">
          * Minimum contribution: 5USD worth of ETH.
        </p>
      )}

      {/* Contract Balance and Withdraw Section */}

      <div className="rounded-lg mt-2 p-4 flex flex-col items-center max-w-sm mx-auto">
        <p className="rounded-md py-4 px-6 bg-gray-800 text-white border border-gray-600 text-center font-semibold w-full">
          Balance:{" "}
          <span className="text-green-300">
            {contractBalance ?? "Not funded yet 0"} ETH
          </span>
        </p>

        <button
          onClick={withdrawFunds}
          className="mt-3 w-1/3 rounded-md bg-gray-500 text-white d py-2 shadow-md transition"
        >
          Withdraw
        </button>
      </div>

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
              I know
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
