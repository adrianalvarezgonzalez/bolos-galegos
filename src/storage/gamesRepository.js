import { dbGet, dbGetAll, dbPut, dbGetByIndex, dbClear } from './database.js';

const STORE = 'games';

export function getAllGames() {
  return dbGetAll(STORE);
}

export function getGame(id) {
  return dbGet(STORE, id);
}

export function saveGame(game) {
  return dbPut(STORE, game);
}

export function getActiveGame() {
  return dbGetByIndex(STORE, 'status', 'playing').then(games => games[0] || null);
}

export async function getFinishedGames() {
  const games = await dbGetByIndex(STORE, 'status', 'finished');
  return games.sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt));
}

export function deleteAllGames() {
  return dbClear(STORE);
}
