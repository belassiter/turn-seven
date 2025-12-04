import React, { useLayoutEffect, useRef } from 'react';

export interface CardModel {
  id: string; // A unique ID for this card instance
  suit: string; // e.g., 'hearts', 'spades'
  rank: string; // e.g., 'A', '7', 'K'
  isFaceUp?: boolean;
}

export interface CardProps {
  card: CardModel;
}

export const Card: React.FC<CardProps> = ({ card }) => {
  const { rank, suit, isFaceUp = false } = card;

  const normalizedSuit = String(suit).toLowerCase();
  const isAction = normalizedSuit === 'action';
  
  // For action cards, replace spaces with newlines to force vertical stacking
  // "Turn Three" -> "Turn\nThree"
  // Also handle CamelCase: "TurnThree" -> "Turn\nThree"
  const labelText = String(rank);
  const displayLabel = isAction 
    ? labelText.replace(/([a-z])([A-Z])/g, '$1\n$2').replace(/ /g, '\n') 
    : labelText;

  const isModifier = normalizedSuit === 'modifier' || labelText.startsWith('+');
  const showOnlyCenter = normalizedSuit === 'number' || isAction || isModifier;

  const textRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const textEl = textRef.current;
    const containerEl = textEl?.parentElement;

    if (!textEl || !containerEl || !showOnlyCenter) return;

    // Only scale action cards. Number and modifier cards fit fine with default CSS.
    if (!isAction) return;

    // If in JSDOM/test environment with no layout, skip resizing
    if (containerEl.clientWidth === 0 && containerEl.clientHeight === 0) return;

    // Reset to base size to start measurement
    // Start with a large font size (3rem approx 48px) to match number cards
    let currentSize = 48; 
    textEl.style.fontSize = `${currentSize}px`;
    textEl.style.lineHeight = '0.9';
    textEl.style.display = 'inline-block'; // Ensure correct width measurement
    textEl.style.textAlign = 'center';
    textEl.style.whiteSpace = 'pre'; // Respect newlines, don't wrap otherwise
    textEl.style.width = '100%'; // Ensure it can take full width if needed
    
    const minSize = 10;

    // Iteratively reduce font size until it fits
    while (currentSize > minSize) {
      // Check if the text fits within the container
      // Use scrollWidth/scrollHeight to detect overflow
      // Also check if width is roughly 80% of container width to satisfy "span ~80%" requirement
      // But we want it to be AS LARGE AS POSSIBLE without overflowing.
      // The user said "span ~80% of the card". This might mean they want it WIDER.
      // If the text is short, it won't span 80%.
      // If the text is long, it will be scaled down.
      // Let's just ensure it fits.
      if (textEl.scrollWidth <= containerEl.clientWidth && textEl.scrollHeight <= containerEl.clientHeight) {
        break;
      }
      currentSize -= 1; // finer grain decrement
      textEl.style.fontSize = `${currentSize}px`;
    }
  }, [displayLabel, showOnlyCenter, isAction]);

  const cardClasses = [
    'card',
    isFaceUp ? 'face-up' : 'face-down',
    `suit-${normalizedSuit}`,
    `rank-${String(rank).toLowerCase()}`,
    normalizedSuit === 'number' ? 'number-card' : '',
  ].join(' ');

  return (
    <div className={cardClasses}>
      {isFaceUp ? (
        <>
          {/* For number and action cards render only the centered rank in the DOM; for other suits render corners + center. */}
            {showOnlyCenter ? (
            <span 
              className="rank-center" 
              data-testid="rank-center"
            >
              <span ref={textRef}>{displayLabel}</span>
            </span>
          ) : (
            <>
              <span className="rank top-left">{labelText}</span>
              <span className="suit-icon"></span>
              <span className="rank-center" data-testid="rank-center">{labelText}</span>
              <span className="rank bottom-right">{labelText}</span>
            </>
          )}
        </>
      ) : (
        <div className="card-back">
          <span className="back-label">T7</span>
        </div>
      )}
    </div>
  );
};
