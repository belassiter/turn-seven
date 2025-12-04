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

  // Map action card labels to supplied images (if available)
  const actionImageName = (() => {
    const normalized = labelText.toLowerCase().replace(/\s+/g, '');
    if (normalized.includes('turnthree') || /t3/.test(normalized)) return '/turn3.png';
    // support canonical 'lock' rank name
    if (normalized.includes('lock')) return '/lock.png';
    // support canonical LifeSaver label
    if (normalized.includes('lifesaver')) return '/lifesaver.png';
    return undefined;
  })();

  const isModifier = normalizedSuit === 'modifier' || labelText.startsWith('+');
  const showOnlyCenter = normalizedSuit === 'number' || isAction || isModifier;

  const textRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const textEl = textRef.current;
    const containerEl = textEl?.parentElement;

    if (!textEl || !containerEl || !showOnlyCenter) return;

    // Scale action and modifier cards so the centered rank doesn't take more than 90% of the card width.
    // Number cards already fit the layout, but modifiers (e.g. +10, x2) may need scaling too.
    if (!isAction && !isModifier) return;

    // Always set a width cap to keep the text element from overflowing. Even in JSDOM (no layout)
    // this ensures tests can assert the intended restriction.
    textEl.style.width = '90%';

    // If in JSDOM/test environment with no layout, we can't measure, so skip the resize loop.
    if (containerEl.clientWidth === 0 && containerEl.clientHeight === 0) return;

    // Reset to base size to start measurement
    // Start with a large font size (3rem approx 48px) to match number cards
    let currentSize = 48; 
    textEl.style.fontSize = `${currentSize}px`;
    textEl.style.lineHeight = '0.9';
    textEl.style.display = 'inline-block'; // Ensure correct width measurement
    textEl.style.textAlign = 'center';
    textEl.style.whiteSpace = 'pre'; // Respect newlines, don't wrap otherwise
    // Restrict the visible rank span to at most 90% of the card width so very wide labels don't overflow.
    textEl.style.width = '90%';
    
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
  }, [displayLabel, showOnlyCenter, isAction, isModifier]);

  const cardClasses = [
    'card',
    isFaceUp ? 'face-up' : 'face-down',
    `suit-${normalizedSuit}`,
    `rank-${String(rank).toLowerCase()}`,
    // Provide explicit helper classes for styling: number-card, action-card, modifier-card
    normalizedSuit === 'number' ? 'number-card' : (normalizedSuit === 'action' ? 'action-card' : (normalizedSuit === 'modifier' ? 'modifier-card' : '')),
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
              {/* If an image exists for this action, render it centered at 80% width. */}
              {isAction && actionImageName ? (
                <img src={actionImageName} alt={labelText} style={{ width: '80%', display: 'block', margin: '0 auto' }} />
              ) : (
                <span ref={textRef}>{displayLabel}</span>
              )}
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
