import { useState, useEffect } from 'react'

/**
 * Returns true after the component has mounted on the client.
 * Use this to avoid SSR hydration mismatches when reading from localStorage.
 */
export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  return mounted
}
