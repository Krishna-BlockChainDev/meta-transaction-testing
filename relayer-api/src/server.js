import express from 'express';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import fs from 'fs';

dotenv.config();

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

const RPC_URL = process.env.SEPOLIA_RPC_URL;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;

console.log('ENV CHECK');
console.log('RPC:', process.env.SEPOLIA_RPC_URL);
console.log('CONTRACT:', process.env.CONTRACT_ADDRESS);
console.log('PRIVATE KEY LOADED:', !!process.env.RELAYER_PRIVATE_KEY);
console.log('PRIVATE KEY LENGTH:', process.env.RELAYER_PRIVATE_KEY?.length);
console.log(
  'PRIVATE KEY PREFIX:',
  process.env.RELAYER_PRIVATE_KEY?.slice(0, 4),
);

// --------------------------------------------------
// ABi, Provider, Relayer Wallet & Contracts
// --------------------------------------------------

const artifact = JSON.parse(
  fs.readFileSync(new URL('./abi/MiniERC20.json', import.meta.url), 'utf8'),
);

const ABI = artifact.abi;
const provider = new ethers.JsonRpcProvider(RPC_URL);
const relayer = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
const token = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

// --------------------------------------------------
// EIP-712 Types
// --------------------------------------------------

const permitTypes = {
  Permit: [
    {
      name: 'owner',
      type: 'address',
    },
    {
      name: 'spender',
      type: 'address',
    },
    {
      name: 'value',
      type: 'uint256',
    },
    {
      name: 'nonce',
      type: 'uint256',
    },
    {
      name: 'deadline',
      type: 'uint256',
    },
  ],
};

app.get('/', async (req, res) => {
  try {
    const network = await provider.getNetwork();

    const relayerBalance = await provider.getBalance(relayer.address);

    res.json({
      success: true,
      network: {
        name: network.name,
        chainId: network.chainId.toString(),
      },
      contract: CONTRACT_ADDRESS,
      relayer: relayer.address,
      relayerBalance: ethers.formatEther(relayerBalance),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// --------------------------------------------------
// GET TOKEN INFORMATION
// --------------------------------------------------

app.get('/token', async (req, res) => {
  try {
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      token.name(),
      token.symbol(),
      token.totalSupply(),
    ]);

    res.json({
      success: true,
      contract: CONTRACT_ADDRESS,
      name,
      symbol,
      totalSupply: totalSupply,
    });
  } catch (error) {
    console.error('Token info error:', error);

    res.status(500).json({
      success: false,
      error: error.shortMessage || error.message,
    });
  }
});

app.get('/token/balance/:address', async (req, res) => {
  try {
    const address = ethers.getAddress(req.params.address);

    const [balance, decimals, symbol] = await Promise.all([
      token.balances(address),
      token.symbol(),
    ]);

    res.json({
      success: true,
      address,
      symbol,
      balance: balance.toString(),
    });
  } catch (error) {
    console.error('Balance error:', error);

    res.status(500).json({
      success: false,
      error: error.shortMessage || error.message,
    });
  }
});

app.get('/token/allowance/:owner/:spender', async (req, res) => {
  try {
    const owner = ethers.getAddress(req.params.owner);
    const spender = ethers.getAddress(req.params.spender);

    const [allowance, symbol] = await Promise.all([
      token.allowances(owner, spender),
      token.symbol(),
    ]);

    res.json({
      success: true,
      owner,
      spender,
      symbol,
      allowance: allowance.toString(),
    });
  } catch (error) {
    console.error('Allowance error:', error);

    res.status(500).json({
      success: false,
      error: error.shortMessage || error.message,
    });
  }
});

// --------------------------------------------------
// GET current nonce and POST Permit
// --------------------------------------------------

app.get('/permit/nonce/:owner', async (req, res) => {
  try {
    const owner = ethers.getAddress(req.params.owner);

    const nonce = await token.nonces(owner);

    res.json({
      success: true,
      owner,
      nonce: nonce.toString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
app.post('/permit', async (req, res) => {
  try {
    const { userPrivateKey, spender, value, deadline } = req.body;

    // ----------------------------------------------
    // Validate request
    // ----------------------------------------------

    if (!userPrivateKey) {
      return res.status(400).json({
        success: false,
        error: 'userPrivateKey is required',
      });
    }

    if (!spender) {
      return res.status(400).json({
        success: false,
        error: 'spender is required',
      });
    }

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'value is required',
      });
    }

    // ----------------------------------------------
    // User wallet
    // ----------------------------------------------

    const userWallet = new ethers.Wallet(userPrivateKey);

    const owner = userWallet.address;

    const normalizedSpender = ethers.getAddress(spender);

    // ----------------------------------------------
    // Get chain information
    // ----------------------------------------------

    const network = await provider.getNetwork();

    const chainId = network.chainId;

    // ----------------------------------------------
    // Get current nonce from contract
    // ----------------------------------------------

    const nonce = await token.nonces(owner);

    // ----------------------------------------------
    // Deadline
    // ----------------------------------------------

    let permitDeadline;

    if (deadline) {
      permitDeadline = BigInt(deadline);
    } else {
      const latestBlock = await provider.getBlock('latest');

      if (!latestBlock) {
        throw new Error('Unable to get latest block');
      }

      permitDeadline = BigInt(latestBlock.timestamp) + 3600n;
    }

    // ----------------------------------------------
    // Check deadline
    // ----------------------------------------------

    const latestBlock = await provider.getBlock('latest');

    if (latestBlock && BigInt(latestBlock.timestamp) > permitDeadline) {
      return res.status(400).json({
        success: false,
        error: 'Permit deadline has expired',
      });
    }

    // ----------------------------------------------
    // EIP-712 Domain
    // ----------------------------------------------

    const domain = {
      name: 'Mini ERC20',
      version: '1',
      chainId: chainId,
      verifyingContract: CONTRACT_ADDRESS,
    };

    // ----------------------------------------------
    // Permit message
    // ----------------------------------------------

    const message = {
      owner,
      spender: normalizedSpender,
      value: BigInt(value),
      nonce,
      deadline: permitDeadline,
    };

    console.log('\n--------------------------------');
    console.log('Permit request');
    console.log('--------------------------------');

    console.log('Owner:', owner);
    console.log('Spender:', normalizedSpender);
    console.log('Value:', value);
    console.log('Nonce:', nonce.toString());
    console.log('Deadline:', permitDeadline.toString());

    // ----------------------------------------------
    // USER SIGNS OFF-CHAIN
    // ----------------------------------------------

    const signature = await userWallet.signTypedData(
      domain,
      permitTypes,
      message,
    );

    const sig = ethers.Signature.from(signature);

    console.log('User signature created');

    console.log('v:', sig.v);

    console.log('r:', sig.r);

    console.log('s:', sig.s);

    // ----------------------------------------------
    // RELAYER SENDS TRANSACTION
    // ----------------------------------------------

    console.log('Relayer:', relayer.address);

    console.log('Sending permit transaction...');

    const tx = await token
      .connect(relayer)
      .permit(
        owner,
        normalizedSpender,
        BigInt(value),
        permitDeadline,
        sig.v,
        sig.r,
        sig.s,
      );

    console.log('Transaction:', tx.hash);

    // ----------------------------------------------
    // WAIT FOR CONFIRMATION
    // ----------------------------------------------

    const receipt = await tx.wait();

    // ----------------------------------------------
    // READ NEW NONCE
    // ----------------------------------------------

    const newNonce = await token.nonces(owner);

    // ----------------------------------------------
    // READ ALLOWANCE
    // ----------------------------------------------

    const allowance = await token.allowances(owner, normalizedSpender);

    // ----------------------------------------------
    // Response
    // ----------------------------------------------

    res.json({
      success: true,

      owner,

      spender: normalizedSpender,

      value: value.toString(),

      nonceBefore: nonce.toString(),

      nonceAfter: newNonce.toString(),

      deadline: permitDeadline.toString(),

      relayer: relayer.address,

      transactionHash: tx.hash,

      blockNumber: receipt.blockNumber,

      allowance: allowance.toString(),
    });
  } catch (error) {
    console.error('Permit error:', error);

    res.status(500).json({
      success: false,
      error: error.shortMessage || error.message,
    });
  }
});

app.post('/permit/replay-test', async (req, res) => {
  try {
    const { userPrivateKey, spender, value, deadline } = req.body;

    if (!userPrivateKey) {
      return res.status(400).json({
        success: false,
        error: 'userPrivateKey is required',
      });
    }

    if (!spender) {
      return res.status(400).json({
        success: false,
        error: 'spender is required',
      });
    }

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'value is required',
      });
    }

    // ----------------------------------------------
    // User wallet, current nonce and Network
    // ----------------------------------------------

    const userWallet = new ethers.Wallet(userPrivateKey);
    const owner = userWallet.address;
    const normalizedSpender = ethers.getAddress(spender);

    const nonce = await token.nonces(owner);

    const network = await provider.getNetwork();
    const chainId = network.chainId;

    // ----------------------------------------------
    // Deadline
    // ----------------------------------------------

    let permitDeadline;

    if (deadline) {
      permitDeadline = BigInt(deadline);
    } else {
      const latestBlock = await provider.getBlock('latest');

      if (!latestBlock) {
        throw new Error('Unable to get latest block');
      }

      permitDeadline = BigInt(latestBlock.timestamp) + 3600n;
    }

    // ----------------------------------------------
    // Domain & Permint message
    // ----------------------------------------------

    const domain = {
      name: 'Mini ERC20',
      version: '1',
      chainId: chainId,
      verifyingContract: CONTRACT_ADDRESS,
    };

    const message = {
      owner,
      spender: normalizedSpender,
      value: BigInt(value),
      nonce,
      deadline: permitDeadline,
    };

    // ----------------------------------------------
    // SIGN ONCE
    // ----------------------------------------------

    const signature = await userWallet.signTypedData(
      domain,
      permitTypes,
      message,
    );

    const sig = ethers.Signature.from(signature);

    console.log('\n================================');
    console.log('REPLAY ATTACK TEST');
    console.log('================================');

    console.log('Owner:', owner);
    console.log('Spender:', normalizedSpender);
    console.log('Value:', value);
    console.log('Nonce:', nonce.toString());
    console.log('Deadline:', permitDeadline.toString());

    console.log('\nSignature:');
    console.log('v:', sig.v);
    console.log('r:', sig.r);
    console.log('s:', sig.s);

    // ----------------------------------------------
    // FIRST TRANSACTION
    // ----------------------------------------------

    console.log('\nSending FIRST permit...');

    const tx1 = await token
      .connect(relayer)
      .permit(
        owner,
        normalizedSpender,
        BigInt(value),
        permitDeadline,
        sig.v,
        sig.r,
        sig.s,
      );

    const receipt1 = await tx1.wait();
    const nonceAfterFirst = await token.nonces(owner);
    console.log('First transaction:', tx1.hash);
    console.log('Nonce after first:', nonceAfterFirst.toString());

    // ----------------------------------------------
    // SECOND TRANSACTION
    // SAME SIGNATURE
    // ----------------------------------------------

    console.log('\nSending SECOND permit using SAME signature...');

    let replayResult;

    try {
      const tx2 = await token.connect(relayer).permit(
        owner,
        normalizedSpender,
        BigInt(value),
        permitDeadline,

        // SAME SIGNATURE
        sig.v,
        sig.r,
        sig.s,
      );

      await tx2.wait();

      replayResult = {
        success: true,
        transactionHash: tx2.hash,
        message: 'WARNING: Replay transaction succeeded',
      };
    } catch (replayError) {
      console.log(
        'Replay attack rejected:',
        replayError.shortMessage || replayError.message,
      );

      replayResult = {
        success: false,
        rejected: true,
        message: 'Replay attack successfully prevented',
        error: replayError.shortMessage || replayError.message,
      };
    }

    // ----------------------------------------------
    // Final nonce
    // ----------------------------------------------

    const finalNonce = await token.nonces(owner);

    const allowance = await token.allowances(owner, normalizedSpender);

    // ----------------------------------------------
    // Response
    // ----------------------------------------------

    res.json({
      success: true,

      test: 'ERC20 Permit Replay Attack',

      owner,

      spender: normalizedSpender,

      value: value.toString(),

      nonceUsedForSignature: nonce.toString(),

      nonceAfterFirst: nonceAfterFirst.toString(),

      finalNonce: finalNonce.toString(),

      deadline: permitDeadline.toString(),

      firstTransaction: {
        hash: tx1.hash,
        blockNumber: receipt1.blockNumber,
      },

      replayAttack: replayResult,

      allowance: allowance.toString(),
    });
  } catch (error) {
    console.error('Replay test error:', error);

    res.status(500).json({
      success: false,
      error: error.shortMessage || error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Relayer API running on http://localhost:${PORT}`);

  console.log('Relayer:', relayer.address);

  console.log('Contract:', CONTRACT_ADDRESS);
});
