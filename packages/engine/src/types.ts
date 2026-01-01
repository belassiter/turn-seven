export interface CardModel {
  id: string; // A unique ID for this card instance
  suit: string; // e.g., 'hearts', 'spades'
  rank: string; // e.g., 'A', '7', 'K'
  isFaceUp?: boolean;
}

export interface PlayerModel {
  id: string;
  name: string;
  hand: CardModel[];
  // Optional flags useful for games: whether the player has chosen to stay or is active
  hasStayed?: boolean;
  isLocked?: boolean;
  isActive?: boolean;
  hasBusted?: boolean;
  // Whether the player is holding a Life Saver action
  hasLifeSaver?: boolean;
  // Action cards held for later play (action cards drawn during play)
  reservedActions?: CardModel[];
  // IDs of action cards that must be resolved immediately (cannot HIT or STAY until resolved)
  pendingImmediateActionIds?: string[];
  // per-round and cumulative scores
  roundScore?: number;
  totalScore?: number;
  // Bot configuration
  isBot?: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard' | 'omg' | 'omniscient';
}
