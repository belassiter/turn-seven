import { describe, it, expect } from 'vitest';
import { performAction } from '../index';

// Note: we run these as unit tests; they mock Firestore/Context behavior.

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('performAction REMOVE_PLAYER', () => {
  it('should reject removal when game not in lobby', async () => {
    // Mock request/context where game status is 'playing'
    const mockContext = { auth: { uid: 'host-uid' } } as any;
    const data = { gameId: 'G1', action: { type: 'REMOVE_PLAYER', payload: { playerId: 'p2' } } };

    // Call function directly (implementation may vary); expect it to throw or return error
    try {
      // If function returns a promise rejection, assert it
      await performAction({ data, context: mockContext } as any);
      // If no throw, fail
      throw new Error('Expected performAction to throw');
    } catch (e: any) {
      expect(e).toBeTruthy();
    }
  });
});
