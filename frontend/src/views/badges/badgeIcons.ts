import type { LucideIcon } from "lucide-react"
import {
  Award, Bird, BookOpen, Calendar, CalendarCheck, Clock, Clover, Compass, Crown, Droplets, Flame, Flower, Flower2, Footprints, Gem,
  Hand, Heart, HeartPulse, Hourglass, Infinity as InfinityIcon, Layers, Leaf, Library, ListChecks, Medal, Moon, Mountain, PartyPopper, Repeat,
  Rocket, Shield, ShieldCheck, Snowflake, Sparkles, Sprout, Star, Sun, Sunrise, Swords, Target, Timer, TreeDeciduous, Trophy, Umbrella, Warehouse, Wind, Zap,
} from "lucide-react"

/**
 * The icon in the middle of each achievement medal, by badge id. The backend
 * owns the badge list (backend/src/domain/achievements/catalog.ts) and sends
 * no art, so each id is mapped here. A badge missing from this map gets
 * `fallbackBadgeIcon`, so a new backend badge never breaks the page.
 */
export const badgeIcons: Record<string, LucideIcon> = {
  // Getting started
  "seed-money": Sprout, "first-drop": Droplets, "green-thumb": Leaf, "sapling-season": TreeDeciduous, "full-bloom": Flower2,
  backdated: Calendar, "personal-touch": Heart, "roots-down": Layers,
  // Logging milestones
  "ten-taps": Hand, "fifty-strong": Zap, "century-club": Target, "five-hundred": Gem, "thousand-petal": Flower,
  overachiever: Rocket, "double-time": Timer, "busy-day": Sun, "every-hand": Hand, "full-garden-day": Clover,
  // Finishing habits
  "first-harvest": Award, "ten-harvests": CalendarCheck, "twenty-five-harvests": Warehouse, "gold-standard": Medal, "triple-gold": Crown,
  "gold-rush": Trophy, "perfect-score": Star, "long-game": Hourglass, marathon: Footprints, "jack-of-all": Compass,
  "hat-trick": PartyPopper, "clean-sweep": Sparkles,
  // Streaks
  "two-in-a-row": Repeat, "habit-forming": Clover, "eight-is-great": Flame, "quarter-year": Umbrella, "half-year": Mountain,
  evergreen: TreeDeciduous, "no-misses": ListChecks, unbroken: Shield, "triple-threat-streak": ShieldCheck, "daily-devotion": Sun,
  "weekend-warrior": Swords,
  // Garden and plants
  "variety-pack": Leaf, botanist: BookOpen, "complete-collection": Library, "rose-garden": Flower2, jungle: TreeDeciduous,
  greenhouse: Sprout, "prize-winner": Award, "matching-set": Layers, "shelf-full": Hand, "second-floor": Layers, "hall-of-fame": Trophy,
  // Comebacks
  "wilted-not-dead": HeartPulse, "second-wind": Wind, "phoenix-plant": Flame, "bounce-back": Repeat, "welcome-back": Bird,
  clutch: Clock, "down-to-the-wire": Timer, resurrection: Sparkles,
  // Hard challenges
  "iron-routine": Shield, "perfect-year": InfinityIcon, "hundred-days": Calendar, "quit-quitting": Mountain,
  "everything-everywhere": Layers, grandmaster: Crown, "four-seasons": Snowflake, "year-in-bloom": Flower2,
  untouchable: ShieldCheck, "triple-crown": Trophy,
  // Secret (shown only once earned)
  "early-bird": Sunrise, "night-owl": Moon, "leap-of-faith": Sparkles,
  // Badge collector
  "trophy-case": Medal, "shelf-of-honours": Award, "hall-of-plants": Trophy, "secret-keeper": Sparkles, "truffle-pig": Gem,
  completionist: Crown,
}

export const fallbackBadgeIcon: LucideIcon = Award

export const badgeIcon = (id: string): LucideIcon => badgeIcons[id] ?? fallbackBadgeIcon
