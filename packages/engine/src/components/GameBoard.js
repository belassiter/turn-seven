import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PlayerHand } from './PlayerHand';
import { Card } from './Card';
export const GameBoard = ({ players, currentPlayerId, deck, discardPile }) => {
    return (_jsxs("div", { className: "game-board", children: [_jsx("div", { className: "players-area", children: players.map(player => (_jsxs("div", { className: "player-area", children: [_jsx("h2", { children: player.name }), _jsx(PlayerHand, { cards: player.hand, isCurrentPlayer: player.id === currentPlayerId })] }, player.id))) }), _jsxs("div", { className: "common-area", children: [_jsx("div", { className: "deck-area", children: _jsxs("div", { className: "card-pile", children: [_jsx("div", { className: "card-back" }), _jsxs("span", { children: ["Deck: ", deck.length] })] }) }), _jsx("div", { className: "discard-pile-area", children: _jsxs("div", { className: "card-pile", children: [discardPile.length > 0 ? _jsx(Card, { card: { ...discardPile[discardPile.length - 1], isFaceUp: true } }) : _jsx("div", { className: "card-placeholder" }), _jsxs("span", { children: ["Discard: ", discardPile.length] })] }) })] })] }));
};
