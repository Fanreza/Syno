export function useTheme() {
  const isDark = useState<boolean>('theme:isDark', () => false)

  function init() {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') isDark.value = true
    else if (stored === 'light') isDark.value = false
    else isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  function toggle() {
    isDark.value = !isDark.value
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  }

  return { isDark, init, toggle }
}
