import { Language } from '@/types'

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation sections
    'nav.operations': 'Operations',
    'nav.ai': 'AI & Automation',
    'nav.management': 'Management',
    'nav.portal': 'Client Portal',
    'nav.system': 'System',

    // 23 Modules
    'mod.dashboard': 'Dashboard',
    'mod.claims': 'Claims Center',
    'mod.coding': 'AI Coding',
    'mod.eligibility': 'Eligibility',
    'mod.denials': 'Denials & Appeals',
    'mod.ar': 'A/R Management',
    'mod.posting': 'Payment Posting',
    'mod.contracts': 'Contract Manager',
    'mod.scheduling': 'Scheduling',
    'mod.tasks': 'Tasks & Workflows',
    'mod.documents': 'Documents',
    'mod.credentialing': 'Credentialing',
    'mod.voice': 'Voice AI',
    'mod.scribe': 'AI Scribe',
    'mod.analytics': 'Analytics',
    'mod.admin': 'Admin & Settings',
    'mod.integrations': 'Integration Hub',
    'mod.scan': 'Scan & Submit',
    'mod.watch': 'Watch & Track',
    'mod.talk': 'Talk to Us',
    'mod.patients': 'Patients',

    // Common
    'common.search': 'Search...',
    'common.notifications': 'Notifications',
    'common.settings': 'Settings',
    'common.logout': 'Sign Out',
    'common.loading': 'Loading...',
    'common.noData': 'No data available',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.export': 'Export',
    'common.filter': 'Filter',
    'common.upload': 'Upload',
    'common.comingSoon': 'Coming Soon',
    'common.moduleShell': 'Module shell ready — Sprint {{sprint}} build',
  },
  ar: {
    'nav.operations': 'العمليات',
    'nav.ai': 'الذكاء الاصطناعي والأتمتة',
    'nav.management': 'الإدارة',
    'nav.portal': 'بوابة العميل',
    'nav.system': 'النظام',

    'mod.dashboard': 'لوحة القيادة',
    'mod.claims': 'مركز المطالبات',
    'mod.coding': 'الترميز الذكي',
    'mod.eligibility': 'الأهلية',
    'mod.denials': 'الرفض والاستئناف',
    'mod.ar': 'إدارة المستحقات',
    'mod.posting': 'ترحيل المدفوعات',
    'mod.contracts': 'إدارة العقود',
    'mod.scheduling': 'الجدولة',
    'mod.tasks': 'المهام وسير العمل',
    'mod.documents': 'المستندات',
    'mod.credentialing': 'الاعتماد',
    'mod.voice': 'الصوت الذكي',
    'mod.scribe': 'الكاتب الذكي',
    'mod.analytics': 'التحليلات',
    'mod.admin': 'الإدارة والإعدادات',
    'mod.integrations': 'مركز التكامل',
    'mod.scan': 'المسح والإرسال',
    'mod.watch': 'المراقبة والتتبع',
    'mod.talk': 'تواصل معنا',
    'mod.patients': 'المرضى',

    'common.search': 'بحث...',
    'common.notifications': 'الإشعارات',
    'common.settings': 'الإعدادات',
    'common.logout': 'تسجيل الخروج',
    'common.loading': 'جار التحميل...',
    'common.noData': 'لا توجد بيانات',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.export': 'تصدير',
    'common.filter': 'تصفية',
    'common.upload': 'رفع',
    'common.comingSoon': 'قريباً',
    'common.moduleShell': 'وحدة جاهزة — سبرنت {{sprint}}',
  },
  es: {
    'nav.operations': 'Operaciones',
    'nav.ai': 'IA y Automatización',
    'nav.management': 'Gestión',
    'nav.portal': 'Portal del Cliente',
    'nav.system': 'Sistema',

    'mod.dashboard': 'Panel Principal',
    'mod.claims': 'Centro de Reclamos',
    'mod.coding': 'Codificación IA',
    'mod.eligibility': 'Elegibilidad',
    'mod.denials': 'Negaciones y Apelaciones',
    'mod.ar': 'Gestión de Cuentas',
    'mod.posting': 'Registro de Pagos',
    'mod.contracts': 'Gestor de Contratos',
    'mod.scheduling': 'Programación',
    'mod.tasks': 'Tareas y Flujos',
    'mod.documents': 'Documentos',
    'mod.credentialing': 'Acreditación',
    'mod.voice': 'Voz IA',
    'mod.scribe': 'Escriba IA',
    'mod.analytics': 'Analíticas',
    'mod.admin': 'Admin y Config',
    'mod.integrations': 'Centro de Integración',
    'mod.scan': 'Escanear y Enviar',
    'mod.watch': 'Observar y Rastrear',
    'mod.talk': 'Contáctenos',
    'mod.patients': 'Pacientes',

    'common.search': 'Buscar...',
    'common.notifications': 'Notificaciones',
    'common.settings': 'Configuración',
    'common.logout': 'Cerrar Sesión',
    'common.loading': 'Cargando...',
    'common.noData': 'Sin datos disponibles',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.export': 'Exportar',
    'common.filter': 'Filtrar',
    'common.upload': 'Subir',
    'common.comingSoon': 'Próximamente',
    'common.moduleShell': 'Módulo listo — Sprint {{sprint}}',
  },
}

export function t(key: string, lang: Language = 'en', vars?: Record<string, string>): string {
  let text = translations[lang]?.[key] || translations.en[key] || key
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(`{{${k}}}`, v)
    })
  }
  return text
}

export function getDirection(lang: Language): 'ltr' | 'rtl' {
  return lang === 'ar' ? 'rtl' : 'ltr'
}

export default translations
