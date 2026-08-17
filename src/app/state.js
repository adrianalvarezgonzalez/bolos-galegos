let activeGame = null;

export function getActiveGame() {
  return activeGame;
}

export function setActiveGame(game) {
  activeGame = game;
}

export function clearActiveGame() {
  activeGame = null;
}
