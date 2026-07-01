export interface SetLog {
  weight: string
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

export interface Programme {
  summary: string
  weeklyStructure: ProgrammeDay[]
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
  injuries?: string
  notes?: string
  programme?: Programme
  created_at: string
}

export interface ClientSession {
  id: string
  client_id: string
  day_label?: string
  note?: string
  created_at: string
}
