import React from 'react';
export interface CardModel {
    id: string;
    suit: string;
    rank: string;
    isFaceUp?: boolean;
}
export interface CardProps {
    card: CardModel;
}
export declare const Card: React.FC<CardProps>;
