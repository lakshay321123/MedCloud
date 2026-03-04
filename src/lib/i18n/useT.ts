import { useApp } from '@/lib/context'
import translations, { Language } from './translations'

type Section = keyof typeof translations
type Key<S extends Section> = keyof (typeof translations)[S]
type Entry = { en: string; ar: string; es: string }

/**
 * useT — Translation hook
 *
 * Usage:
 *   const { t, lang } = useT()
 *   t('nav', 'dashboard')        // → 'Dashboard' | 'لوحة التحكم' | 'Panel Principal'
 *   t('actions', 'save')         // → 'Save' | 'حفظ' | 'Guardar'
 */
export function useT() {
  const { language } = useApp()
  const lang = language as Language

  function t<S extends Section>(section: S, key: Key<S>): string {
    const entry = translations[section][key] as Entry
    return entry[lang] ?? entry['en']
  }

  return { t, lang, isRTL: lang === 'ar' }
}
