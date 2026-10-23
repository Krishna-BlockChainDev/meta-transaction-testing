import { expect } from 'chai';
import { network } from 'hardhat';

describe('MiniERC20 - Permit', function () {
  it('should execute gasless permit', async function () {
    const { ethers } = await network.connect();

    const [deployer, owner, spender, relayer] = await ethers.getSigners();

    const MiniERC20 = await ethers.getContractFactory('MiniERC20');

    const token = await MiniERC20.deploy('Mini ERC20', 'M20');

    await token.waitForDeployment();

    const value = ethers.parseEther('100');

    const block = await ethers.provider.getBlock('latest');

    if (!block) {
      throw new Error('Latest block not found');
    }

    const deadline = BigInt(block.timestamp) + 3600n;

    const nonce = await token.nonces(owner.address);

    const networkInfo = await ethers.provider.getNetwork();

    const domain = {
      name: 'Mini ERC20',
      version: '1',
      chainId: networkInfo.chainId,
      verifyingContract: await token.getAddress(),
    };

    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };

    const message = {
      owner: owner.address,
      spender: spender.address,
      value,
      nonce,
      deadline,
    };

    // Owner signs OFF-CHAIN
    const signature = await owner.signTypedData(domain, types, message);

    const sig = ethers.Signature.from(signature);

    // Relayer pays gas
    await token
      .connect(relayer)
      .permit(
        owner.address,
        spender.address,
        value,
        deadline,
        sig.v,
        sig.r,
        sig.s,
      );

    expect(await token.allowances(owner.address, spender.address)).to.equal(
      value,
    );

    expect(await token.nonces(owner.address)).to.equal(1n);
  });

  it('should emit Approval event when permit is executed', async function () {
    const { ethers } = await network.connect();

    const [deployer, owner, spender, relayer] = await ethers.getSigners();

    const MiniERC20 = await ethers.getContractFactory('MiniERC20');

    const token = await MiniERC20.deploy('Mini ERC20', 'M20');

    await token.waitForDeployment();

    const value = ethers.parseEther('100');

    const block = await ethers.provider.getBlock('latest');

    if (!block) {
      throw new Error('Latest block not found');
    }

    const deadline = BigInt(block.timestamp) + 3600n;

    const nonce = await token.nonces(owner.address);

    const networkInfo = await ethers.provider.getNetwork();

    const domain = {
      name: 'Mini ERC20',
      version: '1',
      chainId: networkInfo.chainId,
      verifyingContract: await token.getAddress(),
    };

    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };

    const message = {
      owner: owner.address,
      spender: spender.address,
      value,
      nonce,
      deadline,
    };

    const signature = await owner.signTypedData(domain, types, message);

    const sig = ethers.Signature.from(signature);

    await expect(
      token
        .connect(relayer)
        .permit(
          owner.address,
          spender.address,
          value,
          deadline,
          sig.v,
          sig.r,
          sig.s,
        ),
    )
      .to.emit(token, 'Approval')
      .withArgs(owner.address, spender.address, value);
  });

  it('should start owner nonce at zero', async function () {
    const { ethers } = await network.connect();

    const [deployer, owner, spender, relayer] = await ethers.getSigners();

    const MiniERC20 = await ethers.getContractFactory('MiniERC20');

    const token = await MiniERC20.deploy('Mini ERC20', 'M20');

    await token.waitForDeployment();

    expect(await token.nonces(owner.address)).to.equal(0n);
  });

  it('should increment nonce after successful permit', async function () {
    const { ethers } = await network.connect();

    const [deployer, owner, spender, relayer] = await ethers.getSigners();

    const MiniERC20 = await ethers.getContractFactory('MiniERC20');

    const token = await MiniERC20.deploy('Mini ERC20', 'M20');

    await token.waitForDeployment();

    const value = ethers.parseEther('100');

    const block = await ethers.provider.getBlock('latest');

    if (!block) {
      throw new Error('Latest block not found');
    }

    const deadline = BigInt(block.timestamp) + 3600n;

    const nonce = await token.nonces(owner.address);

    const networkInfo = await ethers.provider.getNetwork();

    const domain = {
      name: 'Mini ERC20',
      version: '1',
      chainId: networkInfo.chainId,
      verifyingContract: await token.getAddress(),
    };

    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };

    const message = {
      owner: owner.address,
      spender: spender.address,
      value,
      nonce,
      deadline,
    };

    const signature = await owner.signTypedData(domain, types, message);

    const sig = ethers.Signature.from(signature);

    expect(await token.nonces(owner.address)).to.equal(0n);

    await token
      .connect(relayer)
      .permit(
        owner.address,
        spender.address,
        value,
        deadline,
        sig.v,
        sig.r,
        sig.s,
      );

    expect(await token.nonces(owner.address)).to.equal(1n);
  });

  it('should reject replaying the same permit signature', async function () {
    const { ethers } = await network.connect();

    const [deployer, owner, spender, relayer] = await ethers.getSigners();

    const MiniERC20 = await ethers.getContractFactory('MiniERC20');

    const token = await MiniERC20.deploy('Mini ERC20', 'M20');

    await token.waitForDeployment();

    const value = ethers.parseEther('100');

    const block = await ethers.provider.getBlock('latest');

    if (!block) {
      throw new Error('Latest block not found');
    }

    const deadline = BigInt(block.timestamp) + 3600n;

    const nonce = await token.nonces(owner.address);

    const networkInfo = await ethers.provider.getNetwork();

    const domain = {
      name: 'Mini ERC20',
      version: '1',
      chainId: networkInfo.chainId,
      verifyingContract: await token.getAddress(),
    };

    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };

    const message = {
      owner: owner.address,
      spender: spender.address,
      value,
      nonce,
      deadline,
    };

    const signature = await owner.signTypedData(domain, types, message);

    const sig = ethers.Signature.from(signature);

    // First execution
    await token
      .connect(relayer)
      .permit(
        owner.address,
        spender.address,
        value,
        deadline,
        sig.v,
        sig.r,
        sig.s,
      );

    expect(await token.nonces(owner.address)).to.equal(1n);

    // Replay same signature
    await expect(
      token
        .connect(relayer)
        .permit(
          owner.address,
          spender.address,
          value,
          deadline,
          sig.v,
          sig.r,
          sig.s,
        ),
    ).to.be.revertedWithCustomError(token, 'InvalidSigner');
  });

  it('should reject permit signed by wrong account', async function () {
    const { ethers } = await network.connect();

    const [deployer, owner, spender, relayer, attacker] =
      await ethers.getSigners();

    const MiniERC20 = await ethers.getContractFactory('MiniERC20');

    const token = await MiniERC20.deploy('Mini ERC20', 'M20');

    await token.waitForDeployment();

    const value = ethers.parseEther('100');

    const block = await ethers.provider.getBlock('latest');

    if (!block) {
      throw new Error('Latest block not found');
    }

    const deadline = BigInt(block.timestamp) + 3600n;

    const nonce = await token.nonces(attacker.address);

    const networkInfo = await ethers.provider.getNetwork();

    const domain = {
      name: 'Mini ERC20',
      version: '1',
      chainId: networkInfo.chainId,
      verifyingContract: await token.getAddress(),
    };

    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };

    const message = {
      owner: attacker.address,
      spender: spender.address,
      value,
      nonce,
      deadline,
    };

    // Attacker signs
    const signature = await attacker.signTypedData(domain, types, message);

    const sig = ethers.Signature.from(signature);

    // Claim owner = legitimate owner
    await expect(
      token
        .connect(relayer)
        .permit(
          owner.address,
          spender.address,
          value,
          deadline,
          sig.v,
          sig.r,
          sig.s,
        ),
    ).to.be.revertedWithCustomError(token, 'InvalidSigner');
  });

  it('should reject expired permit', async function () {
    const { ethers } = await network.connect();

    const [deployer, owner, spender, relayer] = await ethers.getSigners();

    const MiniERC20 = await ethers.getContractFactory('MiniERC20');

    const token = await MiniERC20.deploy('Mini ERC20', 'M20');

    await token.waitForDeployment();

    const value = ethers.parseEther('100');

    const block = await ethers.provider.getBlock('latest');

    if (!block) {
      throw new Error('Latest block not found');
    }

    // Deadline is already expired
    const deadline = BigInt(block.timestamp) - 1n;

    const nonce = await token.nonces(owner.address);

    const networkInfo = await ethers.provider.getNetwork();

    const domain = {
      name: 'Mini ERC20',
      version: '1',
      chainId: networkInfo.chainId,
      verifyingContract: await token.getAddress(),
    };

    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };

    const message = {
      owner: owner.address,
      spender: spender.address,
      value,
      nonce,
      deadline,
    };

    const signature = await owner.signTypedData(domain, types, message);

    const sig = ethers.Signature.from(signature);

    await expect(
      token
        .connect(relayer)
        .permit(
          owner.address,
          spender.address,
          value,
          deadline,
          sig.v,
          sig.r,
          sig.s,
        ),
    ).to.be.revertedWithCustomError(token, 'PermitExpired');
  });

  it('should allow transferFrom after permit', async function () {
    const { ethers } = await network.connect();

    const [deployer, owner, spender, relayer, recipient] =
      await ethers.getSigners();

    const MiniERC20 = await ethers.getContractFactory('MiniERC20');

    const token = await MiniERC20.deploy('Mini ERC20', 'M20');

    await token.waitForDeployment();

    await token
      .connect(deployer)
      .setMaxTotalSupply(ethers.parseEther('1000000000'));

    await token
      .connect(deployer)
      .setTransferLimit(ethers.parseEther('1000000000'));

    // ------------------------------------------------
    // 1. Mint tokens to owner
    // ------------------------------------------------

    const mintAmount = ethers.parseEther('1000');

    const transferAmount = ethers.parseEther('100');

    await token.connect(deployer).mint(owner.address, mintAmount);

    expect(await token.balances(owner.address)).to.equal(mintAmount);

    // ------------------------------------------------
    // 2. Create permit
    // ------------------------------------------------

    const block = await ethers.provider.getBlock('latest');

    if (!block) {
      throw new Error('Latest block not found');
    }

    const deadline = BigInt(block.timestamp) + 3600n;

    const nonce = await token.nonces(owner.address);

    const networkInfo = await ethers.provider.getNetwork();

    const domain = {
      name: 'Mini ERC20',
      version: '1',
      chainId: networkInfo.chainId,
      verifyingContract: await token.getAddress(),
    };

    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };

    const message = {
      owner: owner.address,
      spender: spender.address,
      value: transferAmount,
      nonce,
      deadline,
    };

    // Owner signs OFF-CHAIN
    const signature = await owner.signTypedData(domain, types, message);

    const sig = ethers.Signature.from(signature);

    // ------------------------------------------------
    // 3. Relayer submits permit
    // ------------------------------------------------

    await token
      .connect(relayer)
      .permit(
        owner.address,
        spender.address,
        transferAmount,
        deadline,
        sig.v,
        sig.r,
        sig.s,
      );

    // ------------------------------------------------
    // 4. Verify allowance
    // ------------------------------------------------

    expect(await token.allowances(owner.address, spender.address)).to.equal(
      transferAmount,
    );

    // ------------------------------------------------
    // 5. Spender transfers tokens
    // ------------------------------------------------

    await token
      .connect(spender)
      .transferFrom(owner.address, recipient.address, transferAmount);

    // ------------------------------------------------
    // 6. Verify balances
    // ------------------------------------------------

    expect(await token.balances(owner.address)).to.equal(
      mintAmount - transferAmount,
    );

    expect(await token.balances(recipient.address)).to.equal(transferAmount);

    // ------------------------------------------------
    // 7. Allowance consumed
    // ------------------------------------------------

    expect(await token.allowances(owner.address, spender.address)).to.equal(0n);
  });
});
