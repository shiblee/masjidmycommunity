import Hobby from "../models/Hobby.js";

const DEFAULTS = [
  "Reading", "Writing", "Blogging", "Poetry", "Traveling", "Photography", "Videography",
  "Cooking", "Baking", "Gardening", "Painting", "Drawing", "Sketching", "Calligraphy",
  "Playing a Musical Instrument", "Singing", "Nasheed / Islamic Music", "Dancing",
  "Yoga", "Meditation", "Fitness / Gym", "Running", "Cycling", "Swimming", "Hiking",
  "Camping", "Fishing", "Cricket", "Football", "Badminton", "Table Tennis", "Basketball",
  "Volleyball", "Chess", "Video Gaming", "Board Games", "Puzzles", "Volunteering",
  "Community Service", "Quran Recitation", "Islamic Studies", "Public Speaking",
  "Debating", "Coding / Programming", "DIY & Crafts", "Knitting / Sewing", "Tailoring",
  "Collecting (Stamps / Coins)", "Astronomy / Stargazing", "Bird Watching", "Pottery",
  "Home Decor", "Fashion & Styling", "Automobiles", "Investing / Personal Finance",
  "Language Learning", "Martial Arts", "Movies & TV Shows", "Theatre", "Origami",
  "Content Creation", "Podcasting", "Other",
];

export async function ensureHobbyDefaults() {
  const count = await Hobby.count();
  if (count > 0) return;
  await Promise.all(DEFAULTS.map((name, i) => Hobby.create({ name, sortOrder: i })));
}
