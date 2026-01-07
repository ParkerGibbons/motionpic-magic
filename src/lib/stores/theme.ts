import { writable } from 'svelte/store'

type Theme = 'light' | 'dark'

// Default to dark for media application
const defaultTheme: Theme = 'dark'

// Check localStorage or use default
const stored = typeof localStorage !== 'undefined'
  ? localStorage.getItem('theme') as Theme | null
  : null

export const theme = writable<Theme>(stored || defaultTheme)

// Apply theme to document root
theme.subscribe(value => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', value)
    localStorage.setItem('theme', value)
  }
})

export function toggleTheme() {
  theme.update(current => current === 'dark' ? 'light' : 'dark')
}
