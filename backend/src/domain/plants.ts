// The plant types a habit can have.
// [PLACEHOLDER] The list is pending a team decision (it may not match the plants the frontend has built).
export const PLANT_TYPES = ["flower", "tree", "shrub", "vine", "kelp"] as const;

export type PlantType = (typeof PLANT_TYPES)[number];
