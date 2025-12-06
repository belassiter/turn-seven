// A simple in-memory store for the game state.
export class ClientGameStateManager {
  state;
  subscribers = [];
  constructor(initialState) {
    this.state = initialState;
  }
  getState() {
    return this.state;
  }
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notifySubscribers();
  }
  subscribe(callback) {
    this.subscribers.push(callback);
    // return an unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }
  notifySubscribers() {
    this.subscribers.forEach((cb) => cb(this.state));
  }
}
