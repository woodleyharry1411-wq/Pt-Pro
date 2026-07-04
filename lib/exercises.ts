// Common exercise library for autocomplete suggestions
export const EXERCISES = [
  // Chest
  "Bench Press", "Incline Bench Press", "Decline Bench Press", "Dumbbell Bench Press",
  "Incline Dumbbell Press", "Chest Press Machine", "Cable Fly", "Dumbbell Fly",
  "Pec Deck", "Push-Ups", "Incline Push-Ups", "Dips",
  // Back
  "Deadlift", "Romanian Deadlift", "Sumo Deadlift", "Barbell Row", "Dumbbell Row",
  "Pendlay Row", "Seated Cable Row", "Lat Pulldown", "Pull-Ups", "Chin-Ups",
  "T-Bar Row", "Face Pull", "Straight Arm Pulldown", "Back Extension", "Good Morning",
  "Rack Pull", "Shrugs",
  // Shoulders
  "Overhead Press", "Military Press", "Dumbbell Shoulder Press", "Arnold Press",
  "Lateral Raise", "Front Raise", "Rear Delt Fly", "Upright Row", "Cable Lateral Raise",
  "Machine Shoulder Press", "Landmine Press",
  // Legs
  "Squat", "Back Squat", "Front Squat", "Goblet Squat", "Bulgarian Split Squat",
  "Leg Press", "Hack Squat", "Lunges", "Walking Lunges", "Reverse Lunges",
  "Step-Ups", "Leg Extension", "Leg Curl", "Seated Leg Curl", "Lying Leg Curl",
  "Hip Thrust", "Glute Bridge", "Calf Raise", "Seated Calf Raise", "Standing Calf Raise",
  "Sissy Squat", "Box Squat", "Pistol Squat", "Wall Sit", "Adductor Machine", "Abductor Machine",
  // Arms
  "Bicep Curl", "Barbell Curl", "Dumbbell Curl", "Hammer Curl", "Preacher Curl",
  "Cable Curl", "Concentration Curl", "EZ Bar Curl", "Incline Dumbbell Curl",
  "Tricep Pushdown", "Tricep Extension", "Overhead Tricep Extension", "Skull Crushers",
  "Close Grip Bench Press", "Tricep Dips", "Tricep Kickback", "Cable Overhead Extension",
  "Wrist Curl", "Reverse Curl",
  // Core
  "Plank", "Side Plank", "Crunches", "Sit-Ups", "Russian Twists", "Leg Raises",
  "Hanging Leg Raises", "Hanging Knee Raises", "Ab Wheel Rollout", "Cable Crunch",
  "Mountain Climbers", "Dead Bug", "Bird Dog", "Bicycle Crunches", "V-Ups",
  "Hollow Hold", "Pallof Press", "Woodchoppers", "Toe Touches",
  // Cardio
  "Treadmill Run", "Treadmill Walk", "Incline Treadmill Walk", "Jogging", "Sprint Intervals",
  "Cycling", "Stationary Bike", "Rowing Machine", "Elliptical", "Stair Climber",
  "Jump Rope", "Swimming", "HIIT Circuit", "Battle Ropes", "Sled Push", "Assault Bike",
  "Box Jumps", "Burpees", "Jumping Jacks", "High Knees",
  // Functional / other
  "Kettlebell Swing", "Kettlebell Goblet Squat", "Turkish Get-Up", "Farmer's Carry",
  "Medicine Ball Slam", "Wall Balls", "Thruster", "Clean and Press", "Power Clean",
  "Snatch", "Renegade Row", "Bear Crawl", "Resistance Band Pull-Apart", "Band Row",
  "Band Squat", "Band Chest Press", "Foam Rolling", "Stretching Circuit", "Yoga Flow",
].sort();

export function suggestExercises(query: string, limit = 6): string[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const starts = EXERCISES.filter(e => e.toLowerCase().startsWith(q));
  const contains = EXERCISES.filter(e => !e.toLowerCase().startsWith(q) && e.toLowerCase().includes(q));
  return [...starts, ...contains].slice(0, limit);
}
