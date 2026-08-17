import { dbGet, dbGetAll, dbPut, dbDelete } from './database.js';

const STORE = 'players';

export function getAllPlayers() {
  return dbGetAll(STORE);
}

export function getPlayer(id) {
  return dbGet(STORE, id);
}

export function savePlayer(player) {
  return dbPut(STORE, player);
}

export function deletePlayer(id) {
  return dbDelete(STORE, id);
}

export function createPlayer(name, emoji = '') {
  const player = {
    id: crypto.randomUUID(),
    name: name.trim(),
    emoji,
    createdAt: new Date().toISOString(),
  };
  return savePlayer(player).then(() => player);
}

export async function isNameTaken(name, excludeId = null) {
  const players = await getAllPlayers();
  const normalized = name.trim().toLowerCase();
  return players.some(p => p.name.toLowerCase() === normalized && p.id !== excludeId);
}
