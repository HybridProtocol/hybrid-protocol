import { Web3Provider } from 'ethers/providers';
import { Arrayish, BigNumber, bigNumberify } from 'ethers/utils';
import { ethers } from '@nomiclabs/buidler';

export function expandTo18Decimals(n: number): BigNumber {
  return bigNumberify(n).mul(bigNumberify(10).pow(18));
}

export function expandFrom18Decimals(n: BigNumber): number {
  return bigNumberify(n).div(bigNumberify(10).pow(18)).toNumber();
}

export function expandBigToDecimals(n: BigNumber, d: number): BigNumber {
  return n.mul(bigNumberify(10).pow(d));
}

export function expandToDecimals(n: BigNumber, d: number): BigNumber {
  return bigNumberify(n).mul(bigNumberify(10).pow(d));
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

export async function mineBlock(provider: Web3Provider, timestamp?: number): Promise<void> {
  await new Promise(async (resolve, reject) => {
    (provider._web3Provider.sendAsync as any)(
      { jsonrpc: '2.0', method: 'evm_mine', params: [timestamp] },
      (error: any, result: any): void => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      },
    );
  });
}

export async function mineBlocks(provider: Web3Provider, blockCount: number): Promise<void> {
  for (let ind = 0; ind < blockCount; ind++) {
    await mineBlock(provider);
  }
}

export function convertStringToArrayish(data: string): Arrayish {
  let dataBuffer = Buffer.from(data);
  if (dataBuffer.byteLength < 8) {
    const zeroBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    dataBuffer = Buffer.concat([dataBuffer, zeroBuffer], 8);
  }
  const hexNumber = dataBuffer.toString('hex');
  return `0x${hexNumber}`;
}
