/*
 * SPDX-License-Identifier: Apache-2.0
 */

// Import reflect-metadata for decorators
import 'reflect-metadata';

// Global test setup
beforeAll(() => {
  // Set up any global test configuration
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  // Clean up any global test resources
});

// Global test utilities
export const createMockContext = () => ({
  clientIdentity: {
    getMSPID: jest.fn()
  },
  stub: {
    getState: jest.fn(),
    putState: jest.fn(),
    getStateByRange: jest.fn(),
    getTxTimestamp: jest.fn().mockReturnValue({
      seconds: { toNumber: () => Math.floor(Date.now() / 1000) }
    })
  }
});

export const createMockStub = () => ({
  getState: jest.fn(),
  putState: jest.fn(),
  getStateByRange: jest.fn(),
  getTxTimestamp: jest.fn().mockReturnValue({
    seconds: { toNumber: () => Math.floor(Date.now() / 1000) }
  })
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn()
}; 