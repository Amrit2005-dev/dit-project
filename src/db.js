const STORAGE_KEYS = {
  user: 'visionfit_user',
  routine: 'visionfit_selected_routine',
}

function safeParse(json) {
  try {
    return json ? JSON.parse(json) : null
  } catch {
    return null
  }
}

// User profile -------------------------------------------------

export function saveUserProfile(profile) {
  if (!profile || typeof profile !== 'object') return
  const toStore = {
    name: profile.name || '',
    email: profile.email || '',
    // Never store real passwords in production; this is demo-only
    password: profile.password || '',
    createdAt: profile.createdAt || new Date().toISOString(),
  }
  window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(toStore))
}

export function getUserProfile() {
  const raw = window.localStorage.getItem(STORAGE_KEYS.user)
  return safeParse(raw)
}

// Workout routine selection ------------------------------------

export function saveSelectedRoutine(routineId) {
  if (!routineId) return
  window.localStorage.setItem(
    STORAGE_KEYS.routine,
    JSON.stringify({ id: routineId, savedAt: new Date().toISOString() }),
  )
}

export function getSelectedRoutine() {
  const raw = window.localStorage.getItem(STORAGE_KEYS.routine)
  const parsed = safeParse(raw)
  return parsed?.id || null
}

