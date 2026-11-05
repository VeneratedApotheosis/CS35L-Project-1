// The plant types a habit can have. These match the plants the frontend draws
// (see frontend/src/plants/plantTypes.tsx). Keep the two lists identical: the
// backend validates plant_type against this list, so any mismatch rejects an
// otherwise valid habit.
export const PLANT_TYPES = ["pothos", "peace_lily", "pilea"] as const;

export type PlantType = (typeof PLANT_TYPES)[number];
