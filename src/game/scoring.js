import {
  TARGET_SCORE,
  PENALTY_SCORE,
  MIN_PIN_NUMBER,
  MAX_PIN_NUMBER,
  MIN_MULTI_PINS,
} from './constants.js';

export function calculateSinglePinScore(pinNumber) {
  if (!Number.isInteger(pinNumber) || pinNumber < MIN_PIN_NUMBER || pinNumber > MAX_PIN_NUMBER) {
    throw new RangeError(`Pin number must be between ${MIN_PIN_NUMBER} and ${MAX_PIN_NUMBER}`);
  }
  return pinNumber;
}

export function calculateMultiPinScore(pinsKnocked) {
  if (!Number.isInteger(pinsKnocked) || pinsKnocked < MIN_MULTI_PINS || pinsKnocked > MAX_PIN_NUMBER) {
    throw new RangeError(`Pins knocked must be between ${MIN_MULTI_PINS} and ${MAX_PIN_NUMBER}`);
  }
  return pinsKnocked;
}

export function applyScore(currentScore, points) {
  const newScore = currentScore + points;
  if (newScore > TARGET_SCORE) {
    return PENALTY_SCORE;
  }
  return newScore;
}

export function isVictory(score) {
  return score === TARGET_SCORE;
}

export function pointsNeeded(currentScore) {
  return TARGET_SCORE - currentScore;
}
