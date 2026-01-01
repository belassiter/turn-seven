import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { TurnSevenLogic, GameState } from '@turn-seven/engine';

admin.initializeApp();

const db = admin.firestore();
// Ignore undefined properties when writing to Firestore (helps avoid runtime errors)
db.settings({ ignoreUndefinedProperties: true });

export const performAction = onCall({ cors: true, invoker: 'public' }, async (request) => {
  const { data, auth } = request;
  const { gameId, action } = data;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const gameRef = db.collection('games').doc(gameId);

  return db.runTransaction(async (transaction) => {
    const gameDoc = await transaction.get(gameRef);
    if (!gameDoc.exists) {
      throw new HttpsError('not-found', 'Game not found');
    }

    const gameData = gameDoc.data();
    let gameState = gameData?.gameState as GameState;

    const logic = new TurnSevenLogic();

    if (!gameState) {
      if (action.type === 'INIT_GAME') {
        // Initialize game
        // payload should be player configs
        const playerConfigs = action.payload;
        if (!Array.isArray(playerConfigs)) {
          throw new HttpsError('invalid-argument', 'Invalid player config');
        }
        gameState = logic.createInitialStateFromConfig(playerConfigs);
      } else {
        throw new HttpsError('failed-precondition', 'Game not started');
      }
    } else {
      // TODO: Validate player turn matches context.auth.uid (if we map uid to playerId)
      const newState = logic.performAction(gameState, action);
      gameState = newState;
    }

    // Remove any undefined properties from gameState (Firestore rejects undefined)
    const sanitizedGameState = JSON.parse(JSON.stringify(gameState));

    transaction.update(gameRef, { gameState: sanitizedGameState, status: 'playing' });

    return { success: true };
  });
});
