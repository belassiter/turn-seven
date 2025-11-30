import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
export const Card = ({ card }) => {
    const { rank, suit, isFaceUp = false } = card;
    const normalizedSuit = String(suit).toLowerCase();
    const labelText = String(rank);
    const isAction = normalizedSuit === 'action';
    const isModifier = normalizedSuit === 'modifier' || labelText.startsWith('+');
    const showOnlyCenter = normalizedSuit === 'number' || isAction || isModifier;
    const compactThreshold = 10;
    const isCompact = labelText.length > compactThreshold;
    const cardWidthPx = 100;
    const horizontalPaddingPx = 12;
    const availableWidthPx = Math.max(20, cardWidthPx - horizontalPaddingPx);
    const baseSizePx = 48;
    const minSizePx = 8;
    const estimateFontSize = () => {
        const approxCharWidthFactor = 0.55;
        const estimatedFontPx = Math.floor(availableWidthPx / Math.max(1, labelText.length * approxCharWidthFactor));
        return Math.min(baseSizePx, Math.max(minSizePx, estimatedFontPx));
    };
    // Simple fallback centerStyle; browser measurement happens in the React
    // source via canvas; here we provide a deterministic initial value so
    // server-side/JSDOM tests have a predictable style.
    const centerStyle = isCompact ? { fontSize: `${estimateFontSize()}px` } : undefined;
    const cardClasses = [
        'card',
        isFaceUp ? 'face-up' : 'face-down',
        `suit-${normalizedSuit}`,
        `rank-${String(rank).toLowerCase()}`,
        normalizedSuit === 'number' ? 'number-card' : '',
        isCompact ? 'compact-label' : ''
    ].join(' ');
    return (_jsx("div", { className: cardClasses, children: isFaceUp ? (_jsxs(_Fragment, { children: [showOnlyCenter ? _jsx("span", { className: "rank-center", "data-testid": "rank-center", style: centerStyle, children: labelText }) : _jsxs(_Fragment, { children: [_jsx("span", { className: "rank top-left", children: labelText }), _jsx("span", { className: "suit-icon" }), _jsx("span", { className: "rank-center", "data-testid": "rank-center", style: centerStyle, children: labelText }), _jsx("span", { className: "rank bottom-right", children: labelText })] })] })) : (_jsx("div", { className: "card-back" })) }));
};
