'use client'
import { useApp } from '@/lib/context'
import translations, { TranslationSection, TranslationKey } from './translations'
import type { Language } from '@/types'

type Entry = Record<Language, string>

/**
 * useT — Translation hook
 *
 * Usage:
 *   const { t, lang, isRTL } = useT()
 *   t('nav', 'dashboard')   // → 'Dashboard' | 'لوحة التحكم' | 'Panel Principal'
 *   t('actions', 'save')    // → 'Save' | 'حفظ' | 'Guardar'
 */
export function useT() {
  const { language } = useApp()
  const lang = language as Language

  function t<S extends TranslationSection>(section: S, key: TranslationKey<S>): string {
    const entry = translations[section][key] as unknown as Entry
    return entry[lang] ?? entry['en']
  }

  return { t, lang, isRTL: lang === 'ar' }
}
