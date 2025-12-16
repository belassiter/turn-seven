Turn Seven is a web implementation of the card game Flip Seven

# High-level requirements

1. Game can be played in common web browsers, including desktop and mobile
2. Game mode: local. Multiple players play on the same device
3. Game mode: remote. Each player plays on a separate device
4. Game board shows
5. All players' cards
6. All players' scores
7. Number of cards in discard pile and draw pile
8. Indicator of which player's turn it is
9. Indicator of which players are active/inactive
10. Names of players
11. Current player sees buttons for Hit & Stay
12. Implement rules from rules.md
13. At the end of the game, show a victory screen with a score summary
14. Allow the selection of bot players
15. Animations for
16. Turning a card from the draw pile
17. Player receiving a card
18. Busting
19. Collecting cards to the discard pile
20. Freezing
21. Footer: attribution, link to buy card game, link to GitHub repo

# Architecture: Reusable Card Game Engine

The project will be built as a generic card game engine with "Turn Seven" as the first game-specific implementation. This is a more complex initial setup (~15-25% more work) for the benefit of much faster development of future card games. The project will be structured as a monorepo with separate packages for the `engine` and `games/turn-seven`.

## Reusable Engine (`engine` package)

- **Framework:** React with TypeScript.
- **Project Setup:** Vite in a `pnpm` monorepo.
- **Generic UI Components:** Will include a `GameBoard`, `PlayerHand`, `Card` (with turn animation), and `Deck`. These will be styleable and configurable.
- **Styling:** Tailwind CSS will be used for utility-first styling.
- **Testing:** We will use **Vitest** as our testing framework. Our strategy is:
  - **Strict TDD for the Core Engine:** For the `packages/engine`, we will strictly adhere to TDD (Test-Driven Development). This means writing failing tests before any implementation. This ensures the engine is robust and has a clean, stable API.
  - **TDD for Bug Fixes:** When fixing bugs in any package (engine or games), we must ALWAYS create a failing test case that reproduces the bug before writing the fix. This ensures the bug is confirmed and prevents regression.
  - **Conventional Testing for Game Logic & UI:** For the `packages/games/turn-seven`, we will write unit and integration tests for game logic and components, but not strictly follow TDD for new features. This allows for more flexibility and faster iteration on the user-facing parts of the application.
- **State Management:** A decoupled state model ("UI State" vs "Server State") will be managed by a generic `useGameState` hook.
- **Backend & Hosting:** All backend and hosting will be managed by Firebase.
  - **Hosting:** Firebase Hosting.
  - **Authentication:** Firebase Anonymous Authentication.
  - **Database:** Firestore will hold the game state.
  - **Generic Backend Logic:** A single Firebase Cloud Function will serve as a generic `performAction` endpoint. It will dynamically load and apply the correct game logic module based on the game type.

## Turn Seven Specifics (`games/turn-seven` package)

- **Game Logic:** A pure TypeScript module (`TurnSevenLogic.ts`) will define the deck, rules, scoring, and win/loss conditions for Turn Seven. This module will be executed by the generic backend function.
- **UI Composition:** A root `<TurnSevenGame />` component will assemble the generic engine components and provide the specific UI (like "Hit"/"Stay" buttons) and card designs for the game.

# Increments

The work will be divided between building the engine and implementing the game.

1.  **Engine Foundation & Local Mode Single Player (Completed):**

    - [x] Set up the monorepo with `engine` and `games/turn-seven` packages.
    - [x] **Engine:** Create generic `Card`, `PlayerHand`, and `GameBoard` components.
    - [x] **Engine:** Implement a simple, client-only state manager.
    - [x] **Turn Seven:** Define the initial deck (number cards only) and rules for Hit/Stay.
    - [x] **Turn Seven:** Assemble the components to create a playable local, single-player game.

2.  **Engine: Add Core Game Logic & Multiple Local Players (Completed):**

    - [x] **Engine:** Refine the state manager to handle multiple players in a local game.
    - [x] **Turn Seven:** Implement the logic for busting and turn progression.

3.  **Advanced Rules (Completed):**

    - [x] **Turn Seven:** Implement the logic for `+` and `x2` cards.
    - [x] **Turn Seven:** Implement the logic for all remaining action cards (Lock, Turn Three, Life Saver).
    - [x] **Turn Seven:** Implement "Instant Win" (7 unique cards) condition.
    - [x] **Turn Seven:** Implement immediate resolution for Action cards drawn via HIT.

4.  **Backend Integration (Remote Play):**

    - [ ] **TODO:** Set up Firebase.
    - [ ] **Engine:** Set up Firebase, Auth, Firestore, and the generic `performAction` Cloud Function.
    - [ ] **Engine:** Create the `useGameState` hook to subscribe to Firestore.
    - [ ] **Turn Seven:** Adapt the game to use the new `useGameState` hook, enabling remote play.

5.  **Polish & Animations:**
    - [x] **Engine:** Refine the card turn animation and add other generic animations (e.g., card dealing).
    - [x] **Turn Seven:** Add game-specific animations like busting or freezing effects.
    - [x] **Turn Seven:** Make the cards look better, have more character
6.  **Card analysis**
    - [x] Probability of busting (based on full deck)
    - [x] Probability of busting (visible cards)
    - [x] Probability of busting based on all cards seen since shuffle
    - [x] same conditions as above, but expected score if hit
7.  **Bot players**
    - [x] Easy: randomly chooses Hit/Stay. Randomly assigns action cards (even to self)
    - [x] Medium: chooses Hit/Stay based on green odds. Assigns action cards based on total score from last round
    - [x] Hard: chooses Hit/Stay based on blue odds. Assigns action cards based on total score including current round.
    - [x] OMG: chooses Hit/Stay based on purple odds. Assigns action cards based on total score including current round.
    - [ ] Advanced logic if near the end of the game
8.  **Mobile layout**
    - [ ] UI that works for Mobile, vertical
    - [ ] UI that works for Mobile, horizontal

## Bot Implementation Details

### Configuration

- **Setup Screen:**
  - Toggle for "Bot" next to each player.
  - Difficulty dropdown for bots: Easy (Green), Medium (Yellow), Hard (Orange), OMG (Dark Red).
  - Bot names assigned randomly from a pool, prepended with "🤖 ".
  - Bot names colored by difficulty.

### Bot Logic

- **Decision (Hit/Stay):**
  - **Easy:** Random choice (50/50).
  - **Medium/Hard/OMG:** Calculate expected score gain using the corresponding odds mode (Green/Blue/Purple).
    - If `Expected Score Gain > 0`, HIT.
    - Else, STAY.
- **Targeting (Action Cards):**
  - **Easy:** Random target.
  - **Medium/Hard/OMG:**
    - **Lock / Turn Three:** Target player with the **highest** total score (disadvantage leader).
    - **Life Saver:** Target player with the **lowest** total score (help underdog).
- **Execution:**
  - 1-second delay before action.
  - Bots simulate clicks on the actual UI buttons (`.click()`).
  - Input is locked for humans while bot is "thinking" (during the delay).

### Bot Name Pool

- C-3PO, Data, HAL 9000, R2-D2, T-800, Johnny 5, Wall-E, Bender, KITT, Marvin, Lore, GLaDOS, Cortana, Claptrap, EDI, HK-47, R. Daneel, Skynet, J.A.R.V.I.S., Agent Smith.

## Recent Tasks (Completed)

### Bot Players

- [x] Implement Bot Configuration in Setup Screen (Toggle, Difficulty, Names).
- [x] Implement Bot Logic (Hit/Stay based on odds, Targeting based on score).
- [x] Implement Bot Execution (1s delay, simulate clicks).
- [x] Lock input for humans during bot turn.

### Fix Card Text Truncation

- [x] Refactor `Card.tsx` to use dynamic font scaling instead of static `compact-label` class.
- [x] Remove `compact-label` styles from `styles.css` as they will be obsolete.
- [x] Verify "Turn Three" and "Life Saver" fit correctly within the card boundaries without ellipsis.
- [x] Ensure Action card text is split onto two lines (e.g., "Turn\nThree").

### Action Card Logic & Tests

- [x] Add unit tests for action card behavior (`Lock`, `TurnThree`, `LifeSaver`).
- [x] Fix bug where revealed action cards were not added to `reservedActions`.
- [x] Ensure number cards retain large font size (fixed regression).
- [x] Implement immediate round end for "Turn Three" 7-unique bonus.
- [x] Implement blocking UI for pending immediate actions.

### UI Improvements

- [x] Add UI hook for action-card targeting (`useActionTargeting`).
- [x] Refactor `TurnSevenGame` to use the new hook.
- [x] Add unit tests for `useActionTargeting`.
- [x] Integrate game logo into Header and Card backs.
