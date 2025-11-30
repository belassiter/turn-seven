This project is a web implementation of the card game Flip Seven, called Turn Seven.

# High-level requirements
1. Game can be played in common web browsers, including desktop and mobile
2. Game mode: local. Multiple players play on the same device
3. Game mode: remote. Each player plays on a separate device
4. Game board shows
  1. All players' cards
  2. All players' scores
  3. Number of cards in discard pile and draw pile
  4. Indicator of which player's turn it is
  5. Indicator of which players are active/inactive
  6. Names of players
  7. Current player sees buttons for Hit & Stay
5. Implement rules from rules.md
6. At the end of the game, show a victory screen with a score summary
7. Allow the selection of bot players
8. Animations for
  1. Flipping a card from the draw pile
  2. Player receiving a card
  3. Busting
  4. Collecting cards to the discard pile
  5. Freezing
9. Footer: attribution, link to buy card game, link to GitHub repo

# Architecture: Reusable Card Game Engine
The project will be built as a generic card game engine with "Flip Seven" as the first game-specific implementation. This is a more complex initial setup (~15-25% more work) for the benefit of much faster development of future card games. The project will be structured as a monorepo with separate packages for the `engine` and `games/flip-seven`.

## Reusable Engine (`engine` package)
- **Framework:** React with TypeScript.
- **Project Setup:** Vite in a `pnpm` monorepo.
- **Generic UI Components:** Will include a `GameBoard`, `PlayerHand`, `Card` (with flip animation), and `Deck`. These will be styleable and configurable.
- **Styling:** Tailwind CSS will be used for utility-first styling.
- **Testing:** We will use **Vitest** as our testing framework. Our strategy is:
  - **Strict TDD for the Core Engine:** For the `packages/engine`, we will strictly adhere to TDD (Test-Driven Development). This means writing failing tests before any implementation. This ensures the engine is robust and has a clean, stable API.
  - **Conventional Testing for Game Logic & UI:** For the `packages/games/flip-seven`, we will write unit and integration tests for game logic and components, but not strictly follow TDD. This allows for more flexibility and faster iteration on the user-facing parts of the application.
- **State Management:** A decoupled state model ("UI State" vs "Server State") will be managed by a generic `useGameState` hook.
- **Backend & Hosting:** All backend and hosting will be managed by Firebase.
  - **Hosting:** Firebase Hosting.
  - **Authentication:** Firebase Anonymous Authentication.
  - **Database:** Firestore will hold the game state.
  - **Generic Backend Logic:** A single Firebase Cloud Function will serve as a generic `performAction` endpoint. It will dynamically load and apply the correct game logic module based on the game type.

## Flip Seven Specifics (`games/flip-seven` package)
- **Game Logic:** A pure TypeScript module (`FlipSevenLogic.ts`) will define the deck, rules, scoring, and win/loss conditions for Flip Seven. This module will be executed by the generic backend function.
- **UI Composition:** A root `<FlipSevenGame />` component will assemble the generic engine components and provide the specific UI (like "Hit"/"Stay" buttons) and card designs for the game.

# Increments
The work will be divided between building the engine and implementing the game.

1.  **Engine Foundation & Local Mode Single Player (In Progress):**
    - **Done:** Set up the monorepo with `engine` and `games/flip-seven` packages.
    - **Engine:** Create generic `Card`, `PlayerHand`, and `GameBoard` components.
    - **Engine:** Implement a simple, client-only state manager.
    - **Flip Seven:** Define the initial deck (number cards only) and rules for Hit/Stay.
    - **Flip Seven:** Assemble the components to create a playable local, single-player game.
2.  **Engine: Add Core Game Logic & Multiple Local Players:**
    - **Engine:** Refine the state manager to handle multiple players in a local game.
    - **Flip Seven:** Implement the logic for busting and turn progression.
3.  **Backend Integration (Remote Play):**
    - **TODO:** Set up Firebase.
    - **Engine:** Set up Firebase, Auth, Firestore, and the generic `performAction` Cloud Function.
    - **Engine:** Create the `useGameState` hook to subscribe to Firestore.
    - **Flip Seven:** Adapt the game to use the new `useGameState` hook, enabling remote play.
4.  **Advanced Rules:**
    - **Flip Seven:** Implement the logic for `+` and `x2` cards.
    - **Flip Seven:** Implement the logic for all remaining action cards.
5.  **Polish & Animations:**
    - **Engine:** Refine the card flip animation and add other generic animations (e.g., card dealing).
    - **Flip Seven:** Add game-specific animations like busting or freezing effects.

