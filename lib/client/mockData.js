// lib/client/mockData.js
// Mock data shaped exactly like docs/02_API_CONTRACT.md
// Swap these for real API calls in later phases — keep the shape identical.

export const mockCharacter = {
  id: "mock-uuid-1",
  name: "Aria",
  gender: "female",
  level: 4,
  totalXP: 1280,
  xpForNextLevel: 1600,
  intelligence: 12,
  strength: 5,
  discipline: 9,
  currentStreak: 3,
  longestStreak: 6,
  villageTier: 2,
  coins: 240,
  gems: 3,
};

export const mockQuests = [
  {
    id: "quest-1",
    title: "Read 10 pages",
    description: "The Librarian wants you to read.",
    category: "Intelligence",
    source: "npc",
    npcName: "Librarian",
    hotspot: "library",
    status: "available",
    rewardXP: 40,
    rewardCoins: 15,
    rewardGems: 0,
  },
  {
    id: "quest-2",
    title: "Morning workout",
    description: "The Trainer wants you to move.",
    category: "Strength",
    source: "npc",
    npcName: "Trainer",
    hotspot: "gym",
    status: "accepted",
    rewardXP: 30,
    rewardCoins: 10,
    rewardGems: 0,
  },
  {
    id: "quest-3",
    title: "No phone before bed",
    description: "The Elder wants you to unwind mindfully.",
    category: "Discipline",
    source: "npc",
    npcName: "Elder",
    hotspot: "home",
    status: "available",
    rewardXP: 25,
    rewardCoins: 5,
    rewardGems: 1,
  },
];

export const mockShopItems = [
  { id: "item-1", name: "Golden Cape", type: "cosmetic", costCoins: 100, costGems: 0, owned: false, equipped: false },
  { id: "item-2", name: "Garden Fence", type: "decoration", costCoins: 60, costGems: 0, owned: true, equipped: true },
  { id: "item-3", name: "Straw Hat", type: "cosmetic", costCoins: 40, costGems: 0, owned: false, equipped: false },
  { id: "item-4", name: "Crystal Lantern", type: "decoration", costCoins: 0, costGems: 2, owned: false, equipped: false },
  { id: "item-5", name: "Scholar's Spectacles", type: "cosmetic", costCoins: 60, costGems: 0, owned: true, equipped: false },
  { id: "item-6", name: "Wanderer's Boots", type: "cosmetic", costCoins: 0, costGems: 3, owned: false, equipped: false },
  { id: "item-7", name: "Stone Well", type: "decoration", costCoins: 120, costGems: 0, owned: false, equipped: false },
  { id: "item-8", name: "Wind Chimes", type: "decoration", costCoins: 30, costGems: 0, owned: false, equipped: false },
];

export const mockBuildings = [
  { type: "Academy", level: 1, nextUpgradeCost: 150 },
  { type: "Gym", level: 2, nextUpgradeCost: 220 },
  { type: "Home", level: 1, nextUpgradeCost: 100 },
];