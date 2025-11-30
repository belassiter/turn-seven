import React, { useEffect, useState } from 'react';

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
  const labelText = String(rank);
  const isAction = normalizedSuit === 'action';
  const isModifier = normalizedSuit === 'modifier' || labelText.startsWith('+');
  const showOnlyCenter = normalizedSuit === 'number' || isAction || isModifier;
  const compactThreshold = 10;
  const isCompact = labelText.length > compactThreshold;

  // Scale the font-size to fit the card width. Prefer measuring text in the
  // browser when possible; fall back to a deterministic estimate in JSDOM.
  const cardWidthPx = 100; // matches `.card { width: 100px }` in CSS
  const horizontalPaddingPx = 12; // left+right internal padding allowance
  const availableWidthPx = Math.max(20, cardWidthPx - horizontalPaddingPx);
  const baseSizePx = 48;
  const minSizePx = 8;

  const estimateFontSize = () => {
    const approxCharWidthFactor = 0.55; // approximate width per character relative to font-size
    const estimatedFontPx = Math.floor(availableWidthPx / Math.max(1, labelText.length * approxCharWidthFactor));
    return Math.min(baseSizePx, Math.max(minSizePx, estimatedFontPx));
  };

  const [centerStyle, setCenterStyle] = useState<React.CSSProperties | undefined>(
    isCompact ? { fontSize: `${estimateFontSize()}px` } : undefined
  );

  useEffect(() => {
    if (!isCompact) return;
    // Try to measure with canvas in real browsers for accurate fitting. If
    // canvas isn't available (JSDOM) fall back to the estimate.
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext && canvas.getContext('2d');
      if (!ctx) {
        setCenterStyle({ fontSize: `${estimateFontSize()}px` });
        return;
      }

      // Binary search for the largest font-size that fits availableWidthPx
      let lo = minSizePx;
      let hi = baseSizePx;
      let best = lo;
      const fontFamily = getComputedStyle(document.documentElement).fontFamily || 'sans-serif';
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        ctx.font = `${mid}px ${fontFamily}`;
        const w = ctx.measureText(labelText).width;
        if (w <= availableWidthPx) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      setCenterStyle({ fontSize: `${best}px` });
    } catch (e) {
      setCenterStyle({ fontSize: `${estimateFontSize()}px` });
    }
  }, [labelText, isCompact]);

  const cardClasses = [
    'card',
    isFaceUp ? 'face-up' : 'face-down',
    `suit-${normalizedSuit}`,
    `rank-${String(rank).toLowerCase()}`,
    normalizedSuit === 'number' ? 'number-card' : '',
    isCompact ? 'compact-label' : ''
  ].join(' ');

  return (
    <div className={cardClasses}>
      {isFaceUp ? (
        <>
          {/* For number and action cards render only the centered rank in the DOM; for other suits render corners + center. */}
            {showOnlyCenter ? (
            <span className="rank-center" data-testid="rank-center" style={centerStyle}>{labelText}</span>
          ) : (
            <>
              <span className="rank top-left">{labelText}</span>
              <span className="suit-icon"></span>
              <span className="rank-center" data-testid="rank-center" style={centerStyle}>{labelText}</span>
              <span className="rank bottom-right">{labelText}</span>
            </>
          )}
        </>
      ) : (
        <div className="card-back"></div>
      )}
    </div>
  );
};
