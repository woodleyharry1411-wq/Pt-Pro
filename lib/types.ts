export interface SetLog {
  weight: string
  reps_done: string
  done: boolean
}

export interface Exercise {
  name: string
  sets: string
  reps: string
  rpe?: string
  notes?: string
  done?: boolean
  setLogs?: SetLog[]
}

export interface ProgrammeDay {
  label: string
  focus: string
  exercises: Exercise[]
}

export interface ProgrammeWeek {
  weekNumber: number
  label: string  // e.g. "Foundation", "Build", "Overload", "Peak"
  weeklyStructure: ProgrammeDay[]
}

export interface Programme {
  summary: string
  currentWeek?: number         // 0-based index into weeks[], default 0
  weeks?: ProgrammeWeek[]      // multi-week format (new clients)
  weeklyStructure?: ProgrammeDay[] // legacy single-week (existing clients)
}

export interface Client {
  id: string
  trainer_id: string
  name: string
  age: number
  weight: number
  height: number
  gender: string
  goal: string
  fitness_level: string
  equipment: string
  days_per_week: number
  session_duration?: number
  injuries?: string
  notes?: string
  programme?: Programme
  pin?: string
  archived?: boolean
  created_at: string
}

export interface ClientSession {
  id: string
  client_id: string
  day_label?: string
  note?: string
  created_at: string
}

export interface WeekSnapshot {
  id: string
  client_id: string
  week_label?: string
  days: ProgrammeDay[]
  created_at: string
}

export interface ClientFeedback {
  id: string
  client_id: string
  trainer_id: string
  message: string
  from_client: boolean
  created_at: string
}
