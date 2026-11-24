import {
  Award, CalendarCheck, Clover, Crown, Droplets, Flame, Flower2, Gem, Hand, Layers, Leaf, Medal, Moon, Repeat,
  Sparkles, Sprout, Star, Sunrise, Target, TreeDeciduous, Trophy, Zap,
} from "lucide-react"
import type { BadgeCardProps } from "@/components/AchievementBadge"
import type { IntervalUnit } from "@/lib/habits"
import type { PlantTypeId } from "@/pottedPlant/plants/plantTypes"

/*
 * PLACEHOLDER DATA. The badges backend is not built yet, so the Badges page
 * (#253) reads everything from here. When the backend exists, replace these
 * with the API response and keep the shapes. Badge ideas: docs/badges-ideas.md.
 */

export interface PlaceholderAchievement extends BadgeCardProps {
  id: string
}

export interface PlaceholderCategory {
  id: string
  title: string
  badges: PlaceholderAchievement[]
}

/** Achievement badges, grouped like the sections of docs/badges-ideas.md. Secret badges are only ever earned ones. */
export const placeholderCategories: PlaceholderCategory[] = [
  {
    id: "getting-started",
    title: "Getting started",
    badges: [
      { id: "seed-money", name: "Seed Money", description: "Create your first habit.", tier: "bronze", state: "earned", art: { icon: Sprout }, earnedOn: "Nov 12" },
      { id: "first-drop", name: "First Drop of Water", description: "Log your first activity.", tier: "bronze", state: "earned", art: { icon: Droplets }, earnedOn: "Nov 12" },
      { id: "green-thumb", name: "Green Thumb", description: "Reach plant stage 2 on any habit.", tier: "bronze", state: "earned", art: { icon: Leaf }, earnedOn: "Nov 14" },
      { id: "full-bloom", name: "Full Bloom", description: "Reach plant stage 4 on any habit.", tier: "bronze", state: "earned", art: { icon: Flower2 }, earnedOn: "Nov 19" },
      { id: "roots-down", name: "Roots Down", description: "Have 3 active habits at once.", tier: "bronze", state: "in_progress", art: { icon: Layers }, progress: { count: 2, target: 3 } },
    ],
  },
  {
    id: "logging",
    title: "Logging milestones",
    badges: [
      { id: "ten-taps", name: "Ten Taps", description: "Log 10 activities in total.", tier: "bronze", state: "in_progress", art: { icon: Hand }, progress: { count: 7, target: 10 } },
      { id: "fifty-strong", name: "Fifty Strong", description: "Log 50 activities in total.", tier: "bronze", state: "in_progress", art: { icon: Zap }, progress: { count: 7, target: 50 } },
      { id: "century-club", name: "Century Club", description: "Log 100 activities in total.", tier: "silver", state: "in_progress", art: { icon: Target }, progress: { count: 7, target: 100 } },
      { id: "five-hundred", name: "Five Hundred Fold", description: "Log 500 activities in total.", tier: "gold", state: "locked", art: { icon: Gem } },
      { id: "thousand-petal", name: "Thousand-Petal Rose", description: "Log 1,000 activities in total.", tier: "platinum", state: "locked", art: { icon: Flower2 } },
    ],
  },
  {
    id: "habits",
    title: "Finishing habits",
    badges: [
      { id: "first-harvest", name: "First Harvest", description: "Finish your first habit with any badge.", tier: "bronze", state: "earned", art: { icon: Award }, earnedOn: "Nov 21" },
      { id: "gold-standard", name: "Gold Standard", description: "Earn a Gold on a habit.", tier: "silver", state: "earned", art: { icon: Medal }, earnedOn: "Nov 22" },
      { id: "ten-harvests", name: "Ten Harvests", description: "Finish 10 habits with any badge.", tier: "silver", state: "in_progress", art: { icon: CalendarCheck }, progress: { count: 3, target: 10 } },
      { id: "triple-gold", name: "Triple Gold", description: "Earn Gold on 3 habits.", tier: "gold", state: "in_progress", art: { icon: Crown }, progress: { count: 1, target: 3 } },
      { id: "perfect-score", name: "Perfect Score", description: "Finish a habit at 100% progress and 100% consistency.", tier: "gold", state: "locked", art: { icon: Star } },
    ],
  },
  {
    id: "streaks",
    title: "Streaks",
    badges: [
      { id: "two-in-a-row", name: "Two in a Row", description: "Reach a streak of 2.", tier: "bronze", state: "earned", art: { icon: Repeat }, earnedOn: "Nov 16" },
      { id: "habit-forming", name: "Habit Forming", description: "Reach a streak of 4.", tier: "bronze", state: "earned", art: { icon: Clover }, earnedOn: "Nov 21" },
      { id: "eight-is-great", name: "Eight Is Great", description: "Reach a streak of 8.", tier: "silver", state: "in_progress", art: { icon: Flame }, progress: { count: 4, target: 8 } },
      { id: "half-year", name: "Half-Year Hero", description: "Reach a streak of 26.", tier: "gold", state: "locked", art: { icon: Trophy } },
      { id: "evergreen", name: "Evergreen", description: "Reach a streak of 52.", tier: "platinum", state: "locked", art: { icon: TreeDeciduous } },
    ],
  },
]

/** Secret badges the user has already found. Unfound secret badges are never listed, so none are here. */
export const placeholderSecretBadges: PlaceholderAchievement[] = [
  { id: "early-bird", name: "Early Bird", description: "Log an activity before 6 AM.", tier: "bronze", state: "earned", art: { icon: Sunrise }, secret: true, earnedOn: "Nov 18" },
  { id: "night-owl", name: "Night Owl", description: "Log an activity between midnight and 4 AM.", tier: "bronze", state: "earned", art: { icon: Moon }, secret: true, earnedOn: "Nov 20" },
  { id: "leap-of-faith", name: "Leap of Faith", description: "Log an activity on February 29th.", tier: "gold", state: "earned", art: { icon: Sparkles }, secret: true, earnedOn: "Nov 20" },
]

export type HabitBadgeLevel = "gold" | "silver" | "bronze"

/** A finished habit that earned a Bronze, Silver or Gold badge. Mirrors what GET /dashboard's `finished` list plus the habit's goal will give. */
export interface PlaceholderHabitBadge {
  id: string
  name: string
  plantType: PlantTypeId
  level: HabitBadgeLevel
  endDate: string
  targetCount: number
  intervalCount: number
  intervalUnit: IntervalUnit
  numPeriods: number
  /** 0 to 1. */
  progress: number
  /** 0 to 1. */
  consistency: number
  totalActivities: number
  finalStage: 1 | 2 | 3 | 4
  finalHealth: "healthy" | "slightly_wilted" | "wilted"
}

export const placeholderHabitBadges: PlaceholderHabitBadge[] = [
  { id: "demo-read", name: "Read a little", plantType: "pothos", level: "gold", endDate: "2026-11-22", targetCount: 3, intervalCount: 1, intervalUnit: "week", numPeriods: 4, progress: 1, consistency: 1, totalActivities: 13, finalStage: 4, finalHealth: "healthy" },
  { id: "demo-walk", name: "Take a walk", plantType: "monstera", level: "gold", endDate: "2026-11-15", targetCount: 5, intervalCount: 1, intervalUnit: "week", numPeriods: 6, progress: 1, consistency: 0.83, totalActivities: 31, finalStage: 4, finalHealth: "healthy" },
  { id: "demo-piano", name: "Practice piano", plantType: "rose", level: "silver", endDate: "2026-11-08", targetCount: 4, intervalCount: 1, intervalUnit: "week", numPeriods: 4, progress: 1, consistency: 0.75, totalActivities: 16, finalStage: 4, finalHealth: "slightly_wilted" },
  { id: "demo-water", name: "Drink water", plantType: "peace_lily", level: "bronze", endDate: "2026-10-30", targetCount: 7, intervalCount: 1, intervalUnit: "week", numPeriods: 3, progress: 0.71, consistency: 0.33, totalActivities: 15, finalStage: 3, finalHealth: "wilted" },
]
