import { LOGBOOK_WEATHER_LABELS } from '../constants/weatherConstants';

export const isUnworkable = (hourlyData) => {
  const totalScore = hourlyData.reduce((sum, val) => sum + val, 0);
  return totalScore >= 64;
};

export const getStatusLabel = (hourlyData) => {
  if (hourlyData.every(v => v === 0)) return 'N/A';
  return isUnworkable(hourlyData) ? 'UNWORKABLE (1)' : 'WORKABLE';
};

export const getWeatherDescription = (hourlyData) => {
  if (hourlyData.every(v => v === 0)) return 'N/A';
  const uniqueValues = Array.from(new Set(hourlyData.filter(v => v > 0))).sort((a, b) => a - b);
  if (uniqueValues.length === 0) return '';
  return uniqueValues.map(v => LOGBOOK_WEATHER_LABELS[v]).join(' / ');
};

const parsePattern = (pattern) => pattern.split('').map(Number);

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const UNWORKABLE_PATTERNS = [
  "222223333333444444444444",
  "222222233333333444444444",
  "333333344444444444444444",
  "222224444444444444444444",
  "222222244444444444444444",
  "222222224444444444444444",
  "222224444444444444333333",
  "222222224444444444333333",
  "222224444444444444222222",
  "222222244444444422222222",
];

const WORKABLE_VARIANTS = [
  "111111222222222222111111",
  "222222222222111111111111",
  "111111111222222222111111",
  "111111222222111111222222",
  "111111111111111122222222",
];

export const generateDayPattern = (targetUnworkable) => {
  if (targetUnworkable) {
    const rand = Math.random();
    if (rand < 1 / 3) return Array(24).fill(4);
    const selected = UNWORKABLE_PATTERNS[Math.floor(Math.random() * UNWORKABLE_PATTERNS.length)];
    return parsePattern(selected);
  } else {
    const rand = Math.random();
    if (rand < 1 / 3) return Array(24).fill(1);
    else if (rand < 2 / 3) return Array(24).fill(2);
    else {
      const selected = WORKABLE_VARIANTS[Math.floor(Math.random() * WORKABLE_VARIANTS.length)];
      return parsePattern(selected);
    }
  }
};

export const generateRangeData = (startDay, endDay, unworkableCount, currentData) => {
  const newData = [...currentData.map(d => [...d])];
  const count = endDay - startDay + 1;
  const indices = Array.from({ length: count }, (_, i) => startDay - 1 + i);
  const shuffledIndices = shuffle(indices);
  const unworkableSet = new Set(shuffledIndices.slice(0, unworkableCount));

  let variationPool = shuffle([...UNWORKABLE_PATTERNS, ...UNWORKABLE_PATTERNS]);

  const getUnworkableVariant = () => {
    if (variationPool.length === 0) {
      variationPool = shuffle([...UNWORKABLE_PATTERNS, ...UNWORKABLE_PATTERNS]);
    }
    return parsePattern(variationPool.pop());
  };

  for (let i = 0; i < count; i++) {
    const dayIdx = startDay - 1 + i;
    const prevPattern = dayIdx > 0 ? newData[dayIdx - 1] : Array(24).fill(1);
    const prevWasUnworkable = isUnworkable(prevPattern);

    if (unworkableSet.has(dayIdx)) {
      if (!prevWasUnworkable) {
        newData[dayIdx] = getUnworkableVariant();
      } else {
        if (Math.random() < 0.3) {
          newData[dayIdx] = Array(24).fill(4);
        } else {
          newData[dayIdx] = getUnworkableVariant();
        }
      }
    } else {
      if (prevWasUnworkable) {
        const rand = Math.random();
        if (rand < 0.7) {
          newData[dayIdx] = Array(24).fill(2);
        } else {
          const cloudyStartVariants = WORKABLE_VARIANTS.filter(p => p.startsWith('2'));
          if (cloudyStartVariants.length > 0) {
            const selected = cloudyStartVariants[Math.floor(Math.random() * cloudyStartVariants.length)];
            newData[dayIdx] = parsePattern(selected);
          } else {
            newData[dayIdx] = Array(24).fill(2);
          }
        }
      } else {
        const rand = Math.random();
        if (rand < 0.33) {
          newData[dayIdx] = Array(24).fill(1);
        } else if (rand < 0.66) {
          newData[dayIdx] = Array(24).fill(2);
        } else {
          const selected = WORKABLE_VARIANTS[Math.floor(Math.random() * WORKABLE_VARIANTS.length)];
          newData[dayIdx] = parsePattern(selected);
        }
      }
    }
  }

  return newData;
};
