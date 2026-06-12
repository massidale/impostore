import cardsData from '../data/cards.json';
import type { TabooCard } from '../types';

const defaultCards: TabooCard[] = cardsData as TabooCard[];
let activeCards: TabooCard[] = defaultCards;

export function setCustomCards(cards: TabooCard[]): void {
  activeCards = cards.slice();
}

export function resetToDefaultCards(): void {
  activeCards = defaultCards;
}

export function isUsingCustomCards(): boolean {
  return activeCards !== defaultCards;
}

export function getActiveCards(): TabooCard[] {
  return activeCards.slice();
}
