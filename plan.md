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
  - **Emulation Tests:** To run the full integration tests against the Firebase Emulator, use the command `pnpm run emulator:run-tests`.
- **State Management:** A decoupled state model ("UI State" vs "Server State") will be managed by a generic `useGameState` hook.
- **Backend & Hosting:** All backend and hosting will be managed by Firebase.
  - **Hosting:** Firebase Hosting.
  - **Authentication:** Firebase Anonymous Authentication.
  - **Database:** Firestore will hold the game state.
  - **Generic Backend Logic:** A single Firebase Cloud Function will serve as a generic `performAction` endpoint. It will dynamically load and apply the correct game logic module based on the game type.

## Recent Fixes & Improvements (Deployment & Runtime)

- **Deployment Script:** Created `scripts/deploy.js` to handle deployment in a monorepo structure where `workspace:*` protocols are not supported by Google Cloud Build. This script temporarily replaces workspace dependencies with file paths or removes them during deployment.
- **Runtime Environment:** Upgraded Firebase Functions to Node.js 22 (2nd Gen) to resolve deprecation warnings and improve performance.
- **CORS & Connectivity:** Configured Cloud Functions with `{ cors: true, invoker: 'public' }` to allow cross-origin requests from the web app.
- **Circular Dependencies:** Refactored the `engine` package to extract shared interfaces (`CardModel`, `PlayerModel`) into a dedicated `types.ts` file. This resolves circular dependency issues that were causing the Cloud Function to crash silently (manifesting as CORS/Unauthenticated errors) when loading the game logic.
- **IAM Permissions Reset:** Deleted and redeployed the `performAction` function to force a reset of the Cloud Run IAM policies. This ensures the `invoker: 'public'` setting is correctly applied, resolving the "Unauthenticated" 403 error on preflight requests.

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

    - [x] **TODO:** Set up Firebase.
    - [x] **Engine:** Set up Firebase, Auth, Firestore, and the generic `performAction` Cloud Function.
    - [ ] **Engine:** Create the `useGameState` hook to subscribe to Firestore.
    - [ ] **Turn Seven:** Adapt the game to use the new `useGameState` hook, enabling remote play.

    ### Architecture Decisions (Remote Play)

    1.  **Service Abstraction:** We will introduce an `IGameService` interface.
        - `LocalGameService`: Existing implementation for local play/dev.
        - `RemoteGameService`: New implementation that syncs with Firestore and calls Cloud Functions.
    2.  **Host-Driven Bots:** To simplify bot logic and reuse existing hooks, the "Host" player's client will be responsible for triggering bot actions in Remote Play. This avoids complex server-side bot logic.
    3.  **Reusable Lobby:** The Lobby UI will be built as a generic component in the `engine` package, as it is a common requirement for all card games.
    4.  **Animation Safety:** The existing `visualGameState` vs `realGameState` loop in `TurnSevenGame` is robust enough to handle state jumps from server updates, as it reconciles differences one step at a time.
    5.  **Data Privacy (Honor System):** For V1, we will send the full game state to all clients. We acknowledge the risk of cheating (inspecting network traffic) but accept it for the MVP.

    ### Detailed Requirements

    1. On game setup screen, create a tab selector at the top. First option is Local, which is the existing UI. Other option is Remote, which will be new.
    2. Remote will show an option for "Create Game". This will go to the Lobby screen
    3. The game creator will have special permissions, vs people who join
    4. The Lobby will show a game code, which will be part of a URL other players can use to join. There is a button to copy the URL
    5. The creator, in the lobby, can specify a certain number of player slots by pressing a + button. 3 is default.
    6. The creator can assign a player slot to be a bot, with the bot difficulty dropdown appearing
    7. Remote will show an option for "Join Game". This will require the user to input a code. Alternatively, the user could paste a URL to go directly to the lobby
    8. When a player joins the lobby, they are required to enter a name. They are then assigned to a slot.
    9. The creator sees a "-" next to each slot, to remove that slot
    10. Once all slots are filled, the creator sees a "Start Game" button.
    11. When the game is started, it proceeds are usual
    12. Local play should in no way be impacted by remote play.

    ### Future / Backlog

    - **Cheating Prevention:** Implement server-side state sanitization so clients only receive data they are allowed to see (e.g., hiding opponent hands and deck order).
    - **Host Management:** Allow the host to kick players, drop stalled players, or convert them to bots. Implement auto-host reassignment if the host disconnects.

    ### Development Workflow Note

    For local development, this project is configured to use the **Firebase Local Emulator Suite**. This is the standard best practice and provides several key advantages over connecting to the live Firebase project:

    - **Safety:** It prevents the production database from being filled with test data and eliminates any risk of accidentally deleting or corrupting real user data.
    - **Speed:** All backend requests are handled locally with zero network latency, making the development environment much faster.
    - **No Cost:** All operations against the emulators are free, so there is no risk of incurring costs during development and testing.

    To run the project locally:

    1.  In one terminal, run `pnpm firebase emulators:start`.
    2.  In a second terminal, run `pnpm dev`.
    3.  The app will automatically connect to the local emulators. The Emulator UI is available at `http://localhost:4000`.

    ### Deployment

    To deploy the application to Firebase, use the custom deployment script. This script handles the temporary removal of workspace dependencies which are not supported by Cloud Build.

    ```bash
    node scripts/deploy.js
    ```

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
    - [x] UI that works for Mobile, vertical
    - [ ] UI that works for Mobile, horizontal
9.  **Deploy**
    - [x] Firebase

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

### Mobile vertical layout

Here is the comprehensive summary of the changes required to recreate the mobile vertical layout. You can use this guide to re-implement the features after reverting to a clean state.

1. New Components
   You created two new components to handle mobile-specific interactions:

MobilePlayerDrawer.tsx:
Purpose: A slide-up drawer that displays the PlayerSidebar content on mobile (since the sidebar is hidden).
Key Logic: Uses framer-motion for slide-up animation. Wraps the existing PlayerSidebar component. Auto-closes when a target is selected.
PlayerHud.tsx:
Purpose: A persistent bottom bar showing a compact summary of all players (Score, Card Count, Status Icons like 💥/🔒).
Key Logic: Clicking it opens the Drawer. Displays active turn highlighting. 2. Component Modifications
TurnSevenGame.tsx
State: Added isDrawerOpen state to control the MobilePlayerDrawer.
Layout Structure:
Split Status Bar: Created two distinct divs for the top bar:
.desktop-status-bar: Contains the original layout (Round info left, Controls right).
.mobile-status-bar: New vertical layout (Logo + Round top row, Deck/Discard + Controls bottom row).
Drawer Integration: Added <MobilePlayerDrawer /> and <PlayerHud /> at the bottom of the component.
Logo: Added the <img src="/logo.png" ... /> back into the desktop status bar (it was missing in the intermediate state).
GameSetup.tsx
Split Layout: Divided the setup screen into two main sections to handle mobile scrolling better:
.setup-top-section: Contains Logo, "Start Game" button (mobile only), and Player Count slider. Fixed at the top on mobile.
.setup-bottom-section: Contains the scrollable list of player inputs.
Dual Start Buttons:
Added a "Start Game" button in the top section (visible only on mobile via .mobile-only-start-btn).
Added a "Start Game" button at the bottom (visible only on desktop via .desktop-only-start-btn). 3. CSS Architecture (The "Split" Strategy)
styles.css (Desktop Base)
Revert: This file should remain exactly as it was in the "good" commit.
Patch: Add a small block at the end to hide the new mobile elements on desktop:
src/mobile.css (Mobile Overrides)
Media Query: Wrap everything in @media (max-width: 768px).
Layout Changes:
.turn-seven-layout: Change grid to single column ('main' 'hud').
.game-main-area: Remove fixed height, allow scrolling.
.game-status-bar: Change to flex-direction: column, remove border radius, full width.
Visibility Toggles:
Hide .desktop-status-bar, .player-sidebar, .game-footer, .desktop-only-start-btn.
Show .mobile-status-bar, .mobile-only-start-btn, .player-hud.
Sizing Adjustments:
Scale down cards (width: 45px).
Scale down text/icons.
Hide non-essential buttons (Gallery, Odds) to save space. 4. Entry Point
main.tsx: Import the new CSS file: import './mobile.css';.
This plan allows you to have a completely separate "Mobile View" layer that sits on top of the stable Desktop application without breaking it.
