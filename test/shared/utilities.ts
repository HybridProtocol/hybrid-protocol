import { ethers, network } from 'hardhat';
import { BigNumber, BytesLike } from 'ethers';
import yesno from 'yesno';

export function expandTo18Decimals(n: number): BigNumber {
  return BigNumber.from(n).mul(BigNumber.from(10).pow(18));
}

export function expandFrom18Decimals(n: BigNumber): number {
  return BigNumber.from(n).div(BigNumber.from(10).pow(18)).toNumber();
}

export function expandBigToDecimals(n: BigNumber, d: number): BigNumber {
  return n.mul(BigNumber.from(10).pow(d));
}

export function expandToDecimals(n: BigNumber, d: number): BigNumber {
  return BigNumber.from(n).mul(BigNumber.from(10).pow(d));
}

export function assert<T>(property: string, value: T | undefined): T {
  assertDefined(property, value);
  return value;
}

export function assertNotEmpty(property: string, value: string | undefined): string {
  assertDefined(property, value);
  if (!value) {
    throw new Error(`Empty property: ${property}`);
  }
  return value;
}

export function assertNotEmptyArray<T>(property: string, value: T[] | undefined): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`Empty property: ${property} is not array`);
  }
  if (value.length === 0) {
    throw new Error(`Empty property: ${property} is empty array`);
  }
  return value;
}

export function assertDefined<T>(property: string, obj: T): asserts obj is NonNullable<T> {
  if (obj === undefined || obj === null) {
    throw new Error(`Undefined property: ${property}`);
  }
}

export function parseEthAddresses(property: string, values: string | undefined): string[] {
  assertDefined(property, values);
  assertNotEmpty(property, values);
  const array = values.split(/[ ,]+/);
  assertNotEmptyArray(property, array);
  return array.map((a, i) => parseEthAddress(`${property}[${i}]`, a));
}

export function parseEthAddress(property: string, value: string | undefined): string {
  assertDefined(property, value);
  try {
    return ethers.utils.getAddress(value);
  } catch (e) {
    throw new Error(`Invalid address ${property}: ${value}`);
  }
}

export function parseBigNumber(property: string, value: string | undefined, decimals: number): BigNumber {
  assertDefined(property, value);
  assertNotEmpty(property, value);
  return ethers.utils.parseUnits(value, decimals);
}

export function parseBigNumbers(property: string, value: string | undefined, decimals: number): BigNumber[] {
  assertDefined(property, value);
  assertNotEmpty(property, value);
  const array = value.split(/[ ,]+/);
  assertNotEmptyArray(property, array);
  return array.map((v, i) => parseBigNumber(`${property}[${i}]`, v, decimals));
}

export async function mineBlock(provider: any, timestamp?: number): Promise<void> {
  await provider.send('evm_mine', []);
}

export async function mineBlocks(provider: any, blockCount: number): Promise<void> {
  for (let i = 0; i < blockCount; i++) {
    await mineBlock(provider);
  }
}

export function convertStringToArrayish(data: string): BytesLike {
  let dataBuffer = Buffer.from(data);
  if (dataBuffer.byteLength < 8) {
    const zeroBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    dataBuffer = Buffer.concat([dataBuffer, zeroBuffer], 8);
  }
  const hexNumber = dataBuffer.toString('hex');
  return `0x${hexNumber}`;
}

export const USDCAddress: string = (() => {
  switch (network.name) {
    case 'homestead':
      return '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'; // Mainnet
    case 'rinkeby':
    case 'ropsten':
    case 'hardhat':
    case 'localhost':
      return '0x0000000000000000000000000000000000000000';
    default:
      throw new Error(`Unknown network ${network?.name}`);
  }
})();

export async function requestConfirmation(message = 'Ready to continue?'): Promise<void> {
  const ok = await yesno({
    yesValues: ['', 'yes', 'y', 'yes'],
    question: message,
  });
  if (!ok) {
    throw new Error('Script cancelled.');
  }
}
