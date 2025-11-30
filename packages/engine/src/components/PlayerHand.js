import { jsx as _jsx } from "react/jsx-runtime";
import { Card } from './Card';
export const PlayerHand = ({ cards, isCurrentPlayer = false }) => {
    const handClasses = [
        'player-hand',
        isCurrentPlayer ? 'current-player' : ''
    ].join(' ');
    return (_jsx("div", { className: handClasses, children: cards.map(card => (_jsx(Card, { card: card }, card.id))) }));
};
