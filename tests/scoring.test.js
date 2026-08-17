import { describe, it, expect } from 'vitest';
import {
  calculateSinglePinScore,
  calculateMultiPinScore,
  applyScore,
  isVictory,
  pointsNeeded,
} from '../src/game/scoring.js';

describe('calculateSinglePinScore', () => {
  it('returns the pin number as score', () => {
    expect(calculateSinglePinScore(1)).toBe(1);
    expect(calculateSinglePinScore(7)).toBe(7);
    expect(calculateSinglePinScore(12)).toBe(12);
  });

  it('throws for pin numbers out of range', () => {
    expect(() => calculateSinglePinScore(0)).toThrow(RangeError);
    expect(() => calculateSinglePinScore(13)).toThrow(RangeError);
    expect(() => calculateSinglePinScore(-1)).toThrow(RangeError);
    expect(() => calculateSinglePinScore(1.5)).toThrow(RangeError);
  });
});

describe('calculateMultiPinScore', () => {
  it('returns the number of pins knocked as score', () => {
    expect(calculateMultiPinScore(2)).toBe(2);
    expect(calculateMultiPinScore(6)).toBe(6);
    expect(calculateMultiPinScore(12)).toBe(12);
  });

  it('throws for invalid pin counts', () => {
    expect(() => calculateMultiPinScore(1)).toThrow(RangeError);
    expect(() => calculateMultiPinScore(0)).toThrow(RangeError);
    expect(() => calculateMultiPinScore(13)).toThrow(RangeError);
  });
});

describe('applyScore', () => {
  it('adds points normally when under target', () => {
    expect(applyScore(0, 7)).toBe(7);
    expect(applyScore(30, 10)).toBe(40);
    expect(applyScore(43, 7)).toBe(50);
  });

  it('resets to 25 when exceeding 50', () => {
    expect(applyScore(48, 3)).toBe(25);
    expect(applyScore(49, 2)).toBe(25);
    expect(applyScore(47, 5)).toBe(25);
    expect(applyScore(45, 12)).toBe(25);
  });

  it('reaches exactly 50 without penalty', () => {
    expect(applyScore(43, 7)).toBe(50);
    expect(applyScore(38, 12)).toBe(50);
    expect(applyScore(48, 2)).toBe(50);
  });
});

describe('isVictory', () => {
  it('returns true only for 50', () => {
    expect(isVictory(50)).toBe(true);
    expect(isVictory(49)).toBe(false);
    expect(isVictory(0)).toBe(false);
    expect(isVictory(25)).toBe(false);
  });
});

describe('pointsNeeded', () => {
  it('calculates remaining points to 50', () => {
    expect(pointsNeeded(0)).toBe(50);
    expect(pointsNeeded(43)).toBe(7);
    expect(pointsNeeded(25)).toBe(25);
  });
});
