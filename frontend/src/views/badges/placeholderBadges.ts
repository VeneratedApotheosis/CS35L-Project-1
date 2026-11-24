import {
  Award, Bird, BookOpen, Calendar, CalendarCheck, Clock, Clover, Compass, Crown, Droplets, Flame, Flower, Flower2, Footprints, Gem,
  Hand, Heart, HeartPulse, Hourglass, Infinity as InfinityIcon, Layers, Leaf, Library, ListChecks, Medal, Moon, Mountain, PartyPopper, Repeat,
  Rocket, Shield, Sparkles, Sprout, Star, Sun, Sunrise, Swords, Target, Timer, TreeDeciduous, Trophy, Umbrella, Wind, Zap,
} from "lucide-react"
import type { BadgeInfo } from "@/components/AchievementBadge"

/*
 * PLACEHOLDER DATA. The badges backend is not built yet, so the Badges page
 * (#253) reads everything from here. When the backend exists, replace these
 * with the API response and keep the shapes. Badge ideas: docs/badges-ideas.md.
 */

export interface PlaceholderAchievement extends BadgeInfo {
  id: string
}

export interface PlaceholderChapter {
  id: string
  title: string
  badges: PlaceholderAchievement[]
}

type Row = [id: string, name: string, description: string, tier: PlaceholderAchievement["tier"], art: PlaceholderAchievement["art"]["icon"]]
type Progress = [count: number, target: number]

/** Builds one chapter. `earned` maps an id to its date, `progress` an id to [count, target]. Everything else is locked. */
function chapter(id: string, title: string, rows: Row[], earned: Record<string, string> = {}, progress: Record<string, Progress> = {}): PlaceholderChapter {
  return {
    id, title,
    badges: rows.map(([badgeId, name, description, tier, icon]) => {
      const base = { id: badgeId, name, description, tier, art: { icon } }
      if (earned[badgeId]) return { ...base, state: "earned" as const, earnedOn: earned[badgeId] }
      if (progress[badgeId]) return { ...base, state: "in_progress" as const, progress: { count: progress[badgeId][0], target: progress[badgeId][1] } }
      return { ...base, state: "locked" as const }
    }),
  }
}

/** Achievement badges, one chapter per section of docs/badges-ideas.md. Secret badges are only ever earned ones. */
export const placeholderChapters: PlaceholderChapter[] = [
  chapter("getting-started", "Getting started", [
    ["seed-money", "Seed Money", "Create your first habit.", "bronze", Sprout],
    ["first-drop", "First Drop of Water", "Log your first activity.", "bronze", Droplets],
    ["green-thumb", "Green Thumb", "Reach plant stage 2 on any habit.", "bronze", Leaf],
    ["sapling-season", "Sapling Season", "Reach plant stage 3 on any habit.", "bronze", TreeDeciduous],
    ["full-bloom", "Full Bloom", "Reach plant stage 4 on any habit.", "bronze", Flower2],
    ["backdated", "Backdated", "Log an activity for an earlier day in the current period.", "bronze", Calendar],
    ["personal-touch", "Personal Touch", "Set your display name.", "bronze", Heart],
    ["roots-down", "Roots Down", "Have 3 active habits at once.", "bronze", Layers],
  ], { "seed-money": "Nov 12", "first-drop": "Nov 12", "green-thumb": "Nov 14", "full-bloom": "Nov 19", "personal-touch": "Nov 12" }, { "roots-down": [2, 3] }),
  chapter("logging", "Logging milestones", [
    ["ten-taps", "Ten Taps", "Log 10 activities in total.", "bronze", Hand],
    ["fifty-strong", "Fifty Strong", "Log 50 activities in total.", "bronze", Zap],
    ["century-club", "Century Club", "Log 100 activities in total.", "silver", Target],
    ["five-hundred", "Five Hundred Fold", "Log 500 activities in total.", "gold", Gem],
    ["thousand-petal", "Thousand-Petal Rose", "Log 1,000 activities in total.", "platinum", Flower],
    ["overachiever", "Overachiever", "Log more than the target in a single period.", "bronze", Rocket],
    ["double-time", "Double Time", "Log at least twice the target in a single period.", "silver", Timer],
    ["busy-day", "Busy Day", "Log 5 activities on the same day.", "silver", Sun],
    ["every-hand", "Every Hand on Deck", "Log on 3 different habits in one day.", "bronze", Hand],
    ["full-garden-day", "Full Garden Day", "Log every active habit in one day.", "silver", Clover],
  ], { overachiever: "Nov 17", "every-hand": "Nov 18" }, { "ten-taps": [7, 10], "fifty-strong": [7, 50], "century-club": [7, 100] }),
  chapter("finishing", "Finishing habits", [
    ["first-harvest", "First Harvest", "Finish your first habit with any badge.", "bronze", Award],
    ["ten-harvests", "Ten Harvests", "Finish 10 habits with any badge.", "silver", CalendarCheck],
    ["gold-standard", "Gold Standard", "Earn a Gold on a habit.", "silver", Medal],
    ["triple-gold", "Triple Gold", "Earn Gold on 3 habits.", "gold", Crown],
    ["gold-rush", "Gold Rush", "Earn Gold on 10 habits.", "platinum", Trophy],
    ["perfect-score", "Perfect Score", "Finish a habit at 100% progress and 100% consistency.", "gold", Star],
    ["long-game", "Long Game", "Finish a habit that ran 12 or more periods.", "silver", Hourglass],
    ["marathon", "Marathon Gardener", "Finish a habit that ran 52 or more periods.", "gold", Footprints],
    ["jack-of-all", "Jack of All Trades", "Finish habits with 3 different plant types.", "silver", Compass],
    ["hat-trick", "Hat Trick", "Finish 3 habits in the same week.", "silver", PartyPopper],
  ], { "first-harvest": "Nov 21", "gold-standard": "Nov 22" }, { "ten-harvests": [3, 10], "triple-gold": [1, 3], "long-game": [6, 12] }),
  chapter("streaks", "Streaks", [
    ["two-in-a-row", "Two in a Row", "Reach a streak of 2.", "bronze", Repeat],
    ["habit-forming", "Habit Forming", "Reach a streak of 4.", "bronze", Clover],
    ["eight-is-great", "Eight Is Great", "Reach a streak of 8.", "silver", Flame],
    ["quarter-year", "Quarter Year", "Reach a streak of 13 weeks on a weekly habit.", "silver", Umbrella],
    ["half-year", "Half-Year Hero", "Reach a streak of 26.", "gold", Mountain],
    ["evergreen", "Evergreen", "Reach a streak of 52.", "platinum", TreeDeciduous],
    ["no-misses", "No Misses", "Finish a habit of 4 or more periods with 100% consistency.", "silver", ListChecks],
    ["unbroken", "Unbroken", "Have 3 habits with a streak of 4 or more at once.", "silver", Shield],
    ["daily-devotion", "Daily Devotion", "Log a daily habit 30 days in a row.", "gold", Sun],
    ["weekend-warrior", "Weekend Warrior", "Meet a weekly goal using only weekend logs, 4 weeks in a row.", "silver", Swords],
  ], { "two-in-a-row": "Nov 16", "habit-forming": "Nov 21" }, { "eight-is-great": [4, 8], "daily-devotion": [12, 30] }),
  chapter("garden", "Garden and plants", [
    ["variety-pack", "Variety Pack", "Grow 3 different plant types.", "bronze", Leaf],
    ["botanist", "Botanist", "Grow 6 different plant types.", "silver", BookOpen],
    ["complete-collection", "Complete Collection", "Finish a habit with every plant type.", "platinum", Library],
    ["rose-garden", "Rose Garden", "Have 3 roses in your garden at once.", "silver", Flower2],
    ["jungle", "Jungle", "Have 10 active plants at once.", "gold", TreeDeciduous],
    ["greenhouse", "Greenhouse", "Have 6 plants at stage 4 at once.", "gold", Sprout],
    ["prize-winner", "Prize Winner", "Keep a stage 4 plant healthy for 4 periods straight.", "silver", Award],
    ["matching-set", "Matching Set", "Have 3 habits using the same plant type.", "bronze", Layers],
    ["shelf-full", "Shelf Full", "Fill a shelf with 3 plants.", "bronze", Hand],
    ["hall-of-fame", "Hall of Fame", "Have 5 finished habits in the completed garden.", "silver", Trophy],
  ], { "variety-pack": "Nov 15", "matching-set": "Nov 20" }, { botanist: [4, 6], "shelf-full": [2, 3] }),
  chapter("comebacks", "Comebacks", [
    ["wilted-not-dead", "Wilted but Not Dead", "Have a plant reach Wilted health and recover to Healthy.", "bronze", HeartPulse],
    ["second-wind", "Second Wind", "Meet your goal the period right after missing one.", "bronze", Wind],
    ["clutch", "Clutch", "Meet a period's target on the last day of that period.", "bronze", Clock],
    ["down-to-the-wire", "Down to the Wire", "Meet the final period's target on the habit's last day.", "silver", Timer],
    ["bounce-back", "Bounce Back", "Meet a goal 3 periods in a row right after a miss.", "silver", Repeat],
    ["welcome-back", "Welcome Back", "Log an activity after 14 or more days with no logs.", "silver", Bird],
    ["phoenix-plant", "Phoenix Plant", "Recover a Wilted plant and finish the habit with a Silver or Gold.", "silver", Flame],
    ["resurrection", "Resurrection", "Reach Gold on a habit that was Wilted at some point.", "gold", Sparkles],
  ], { "second-wind": "Nov 17", clutch: "Nov 22" }),
  chapter("challenges", "Hard challenges", [
    ["iron-routine", "Iron Routine", "Finish 3 habits at 100% consistency.", "gold", Shield],
    ["hundred-days", "The Hundred Days", "Log something every day for 100 days.", "gold", Calendar],
    ["perfect-year", "Perfect Year", "Log something every day for 365 days.", "platinum", InfinityIcon],
    ["quit-quitting", "Quit Quitting", "Finish 5 habits that each ran at least 8 periods.", "gold", Mountain],
    ["everything-everywhere", "Everything Everywhere", "Keep 5 active habits all Healthy for 8 weeks.", "gold", Layers],
    ["grandmaster", "Grandmaster Gardener", "Earn Gold on 25 habits.", "platinum", Crown],
    ["triple-crown", "Triple Crown", "Earn a Gold on a daily, a weekly and a monthly habit.", "gold", Trophy],
    ["year-in-bloom", "Year in Bloom", "Finish a habit that ran a full year.", "gold", Flower2],
  ]),
  chapter("meta", "Badge collector", [
    ["trophy-case", "Trophy Case", "Earn 5 badges.", "bronze", Medal],
    ["shelf-of-honours", "Shelf of Honours", "Earn 15 badges.", "silver", Award],
    ["hall-of-plants", "Hall of Plants", "Earn 30 badges.", "gold", Trophy],
    ["secret-keeper", "Secret Keeper", "Find 3 secret badges.", "silver", Sparkles],
    ["truffle-pig", "Truffle Pig", "Find 10 secret badges.", "gold", Gem],
    ["completionist", "Completionist", "Earn every non-secret badge.", "platinum", Crown],
  ], { "trophy-case": "Nov 19", "secret-keeper": "Nov 20" }, { "shelf-of-honours": [14, 15] }),
]

/** Secret badges the user has already found. Unfound secret badges are never listed, so none are here. */
export const placeholderSecretBadges: PlaceholderAchievement[] = [
  { id: "early-bird", name: "Early Bird", description: "Log an activity before 6 AM.", tier: "bronze", state: "earned", art: { icon: Sunrise }, secret: true, earnedOn: "Nov 18" },
  { id: "night-owl", name: "Night Owl", description: "Log an activity between midnight and 4 AM.", tier: "bronze", state: "earned", art: { icon: Moon }, secret: true, earnedOn: "Nov 20" },
  { id: "leap-of-faith", name: "Leap of Faith", description: "Log an activity on February 29th.", tier: "gold", state: "earned", art: { icon: Sparkles }, secret: true, earnedOn: "Nov 20" },
]
