/**
 * MedCloud Translation Strings
 * English (en) | Arabic (ar) | Spanish (es)
 * Language type lives in src/types/index.ts — imported from there
 * Arabic = RTL — direction set on <html dir> via context.tsx
 */

import type { Language } from '@/types'

const translations = {

  nav: {
    dashboard:     { en: 'Dashboard',           ar: 'لوحة التحكم',          es: 'Panel Principal' },
    claims:        { en: 'Claims Center',       ar: 'مركز المطالبات',       es: 'Centro de Reclamaciones' },
    coding:        { en: 'AI Coding',           ar: 'الترميز الذكي',        es: 'Codificación IA' },
    eligibility:   { en: 'Eligibility',         ar: 'التأهيلية',             es: 'Elegibilidad' },
    denials:       { en: 'Denials & Appeals',   ar: 'الرفض والطعون',        es: 'Denegaciones y Apelaciones' },
    ar:            { en: 'A/R Management',      ar: 'إدارة الذمم',           es: 'Gestión de C×C' },
    posting:       { en: 'Payment Posting',     ar: 'ترحيل المدفوعات',     es: 'Registro de Pagos' },
    contracts:     { en: 'Contract Manager',    ar: 'إدارة العقود',          es: 'Gestión de Contratos' },
    voice:         { en: 'Voice AI',            ar: 'الذكاء الصوتي',        es: 'IA de Voz' },
    scribe:        { en: 'AI Scribe',           ar: 'الكاتب الذكي',         es: 'Transcriptor IA' },
    tasks:         { en: 'Tasks & Workflows',   ar: 'المهام والسير',         es: 'Tareas y Flujos' },
    documents:     { en: 'Documents',           ar: 'المستندات',              es: 'Documentos' },
    credentialing: { en: 'Credentialing',       ar: 'الاعتماد المهني',      es: 'Acreditación' },
    analytics:     { en: 'Analytics',           ar: 'التحليلات',              es: 'Analítica' },
    admin:         { en: 'Admin & Settings',    ar: 'الإدارة والإعدادات',   es: 'Administración y Ajustes' },
    integrations:  { en: 'Integration Hub',     ar: 'مركز التكامل',          es: 'Hub de Integración' },
    appointments:  { en: 'Appointments',        ar: 'المواعيد',                es: 'Citas' },
    scan:          { en: 'Scan & Submit',       ar: 'مسح وإرسال',            es: 'Escanear y Enviar' },
    watch:         { en: 'Watch & Track',       ar: 'متابعة وتتبع',           es: 'Seguimiento' },
    patients:      { en: 'Patients',            ar: 'المرضى',                  es: 'Pacientes' },
    messages:      { en: 'Messages',            ar: 'الرسائل',                es: 'Mensajes' },
  },

  sections: {
    operations: { en: 'OPERATIONS',      ar: 'العمليات',            es: 'OPERACIONES' },
    ai:         { en: 'AI & AUTOMATION', ar: 'الذكاء والأتمتة',    es: 'IA Y AUTOMATIZACIÓN' },
    management: { en: 'MANAGEMENT',      ar: 'الإدارة',              es: 'GESTIÓN' },
    portal:     { en: 'CLIENT PORTAL',   ar: 'بوابة العميل',        es: 'PORTAL DEL CLIENTE' },
    system:     { en: 'SYSTEM',          ar: 'النظام',               es: 'SISTEMA' },
    clinical:   { en: 'CLINICAL',        ar: 'السريري',              es: 'CLÍNICO' },
    myportal:   { en: 'MY PORTAL',       ar: 'بوابتي',               es: 'MI PORTAL' },
  },

  actions: {
    save:          { en: 'Save',           ar: 'حفظ',             es: 'Guardar' },
    cancel:        { en: 'Cancel',         ar: 'إلغاء',            es: 'Cancelar' },
    submit:        { en: 'Submit',         ar: 'إرسال',            es: 'Enviar' },
    search:        { en: 'Search',         ar: 'بحث',              es: 'Buscar' },
    filter:        { en: 'Filter',         ar: 'تصفية',            es: 'Filtrar' },
    export:        { en: 'Export',         ar: 'تصدير',            es: 'Exportar' },
    add:           { en: 'Add',            ar: 'إضافة',            es: 'Agregar' },
    edit:          { en: 'Edit',           ar: 'تعديل',            es: 'Editar' },
    delete:        { en: 'Delete',         ar: 'حذف',              es: 'Eliminar' },
    close:         { en: 'Close',          ar: 'إغلاق',            es: 'Cerrar' },
    confirm:       { en: 'Confirm',        ar: 'تأكيد',            es: 'Confirmar' },
    refresh:       { en: 'Refresh',        ar: 'تحديث',            es: 'Actualizar' },
    download:      { en: 'Download',       ar: 'تحميل',            es: 'Descargar' },
    back:          { en: 'Back',           ar: 'رجوع',             es: 'Volver' },
    next:          { en: 'Next',           ar: 'التالي',           es: 'Siguiente' },
    verify:        { en: 'Verify',         ar: 'تحقق',             es: 'Verificar' },
    approve:       { en: 'Approve',        ar: 'موافقة',           es: 'Aprobar' },
    reject:        { en: 'Reject',         ar: 'رفض',              es: 'Rechazar' },
    generate:      { en: 'Generate',       ar: 'إنشاء',            es: 'Generar' },
    logout:        { en: 'Logout',         ar: 'تسجيل الخروج',    es: 'Cerrar Sesión' },
    bulkUpload:    { en: 'Bulk Upload',    ar: 'رفع مجمّع',        es: 'Carga Masiva' },
  },

  status: {
    active:        { en: 'Active',         ar: 'نشط',              es: 'Activo' },
    inactive:      { en: 'Inactive',       ar: 'غير نشط',          es: 'Inactivo' },
    pending:       { en: 'Pending',        ar: 'معلق',             es: 'Pendiente' },
    approved:      { en: 'Approved',       ar: 'موافق عليه',       es: 'Aprobado' },
    denied:        { en: 'Denied',         ar: 'مرفوض',            es: 'Denegado' },
    submitted:     { en: 'Submitted',      ar: 'مُرسَل',           es: 'Enviado' },
    inReview:      { en: 'In Review',      ar: 'قيد المراجعة',     es: 'En Revisión' },
    paid:          { en: 'Paid',           ar: 'مدفوع',            es: 'Pagado' },
    failed:        { en: 'Failed',         ar: 'فشل',              es: 'Fallido' },
    completed:     { en: 'Completed',      ar: 'مكتمل',            es: 'Completado' },
    open:          { en: 'Open',           ar: 'مفتوح',            es: 'Abierto' },
    closed:        { en: 'Closed',         ar: 'مغلق',             es: 'Cerrado' },
    appealed:      { en: 'Appealed',       ar: 'مُستأنَف',         es: 'Apelado' },
    urgent:        { en: 'Urgent',         ar: 'عاجل',             es: 'Urgente' },
    high:          { en: 'High',           ar: 'مرتفع',            es: 'Alto' },
    medium:        { en: 'Medium',         ar: 'متوسط',            es: 'Medio' },
    low:           { en: 'Low',            ar: 'منخفض',            es: 'Bajo' },
  },

  topbar: {
    searchPlaceholder: { en: 'Search patients, claims, documents…', ar: 'ابحث عن مرضى، مطالبات، مستندات…', es: 'Buscar pacientes, reclamaciones, documentos…' },
    selectClient:      { en: 'Select Client',  ar: 'اختر العميل',   es: 'Seleccionar Cliente' },
    language:          { en: 'Language',        ar: 'اللغة',          es: 'Idioma' },
  },

  dashboard: {
    title:             { en: 'Executive Dashboard',    ar: 'لوحة القيادة التنفيذية',    es: 'Panel Ejecutivo' },
    subtitle:          { en: 'Live revenue cycle KPIs', ar: 'مؤشرات دورة الإيرادات',   es: 'KPIs del ciclo de ingresos' },
    revenueCollected:  { en: 'Revenue Collected',      ar: 'الإيرادات المحصّلة',        es: 'Ingresos Cobrados' },
    claimsSubmitted:   { en: 'Claims Submitted',       ar: 'المطالبات المُرسَلة',       es: 'Reclamaciones Enviadas' },
    denialRate:        { en: 'Denial Rate',            ar: 'معدل الرفض',                es: 'Tasa de Denegación' },
    daysInAR:          { en: 'Avg Days in A/R',        ar: 'متوسط أيام الذمم',          es: 'Promedio Días en C×C' },
    cleanClaimRate:    { en: 'Clean Claim Rate',       ar: 'معدل المطالبات النظيفة',    es: 'Tasa de Reclamaciones Limpias' },
    collectionRate:    { en: 'Net Collection Rate',    ar: 'معدل التحصيل الصافي',       es: 'Tasa Neta de Cobro' },
    activePatients:    { en: 'Active Patients',        ar: 'المرضى النشطون',             es: 'Pacientes Activos' },
    aiCallsToday:      { en: 'AI Calls Today',         ar: 'مكالمات الذكاء اليوم',      es: 'Llamadas IA Hoy' },
    aiCodingAcc:       { en: 'AI Coding Accuracy',     ar: 'دقة الترميز الذكي',         es: 'Precisión Codificación IA' },
    overdueAccounts:   { en: 'Overdue Accounts',       ar: 'حسابات متأخرة',             es: 'Cuentas Vencidas' },
  },

  claims: {
    title:            { en: 'Claims Center',        ar: 'مركز المطالبات',          es: 'Centro de Reclamaciones' },
    subtitle:         { en: 'Manage claims across all clients', ar: 'إدارة المطالبات لجميع العملاء', es: 'Gestionar reclamaciones de todos los clientes' },
    newClaim:         { en: 'New Claim',            ar: 'مطالبة جديدة',            es: 'Nueva Reclamación' },
    claimId:          { en: 'Claim ID',             ar: 'رقم المطالبة',            es: 'ID de Reclamación' },
    patient:          { en: 'Patient',              ar: 'المريض',                   es: 'Paciente' },
    payer:            { en: 'Payer',                ar: 'جهة الدفع',               es: 'Pagador' },
    amount:           { en: 'Amount',               ar: 'المبلغ',                   es: 'Monto' },
    dateOfService:    { en: 'Date of Service',      ar: 'تاريخ الخدمة',            es: 'Fecha de Servicio' },
    cleanClaimRate:   { en: 'Clean Claim Rate',     ar: 'معدل المطالبات النظيفة',  es: 'Tasa de Reclamaciones Limpias' },
    avgDaysToPayment: { en: 'Avg Days to Payment',  ar: 'متوسط أيام السداد',       es: 'Promedio Días al Pago' },
  },

  coding: {
    title:        { en: 'AI Coding',               ar: 'الترميز الذكي',     es: 'Codificación IA' },
    subtitle:     { en: 'Review and approve AI-suggested codes', ar: 'مراجعة وقبول الرموز المقترحة', es: 'Revisar y aprobar códigos sugeridos por IA' },
    myQueue:      { en: 'My Queue',                ar: 'قائمة انتظاري',    es: 'Mi Cola' },
    codedToday:   { en: 'Coded Today',             ar: 'تم ترميزه اليوم',  es: 'Codificados Hoy' },
    aiAcceptance: { en: 'AI Acceptance',           ar: 'قبول الذكاء',      es: 'Aceptación IA' },
    generateCDI:  { en: 'Generate CDI Query',      ar: 'إنشاء استعلام CDI', es: 'Generar Consulta CDI' },
  },

  eligibility: {
    title:       { en: 'Eligibility Verification', ar: 'التحقق من التأهيلية',  es: 'Verificación de Elegibilidad' },
    subtitle:    { en: 'Check insurance coverage and benefits', ar: 'التحقق من التغطية والمزايا', es: 'Verificar cobertura y beneficios del seguro' },
    verifyNow:   { en: 'Verify Now',               ar: 'تحقق الآن',            es: 'Verificar Ahora' },
    selectPatient:{ en: 'Select a patient',        ar: 'اختر مريضاً',          es: 'Seleccionar paciente' },
    copay:       { en: 'Copay',                    ar: 'مشاركة التكلفة',       es: 'Copago' },
    deductible:  { en: 'Deductible',               ar: 'الخصم',                es: 'Deducible' },
    batchCheck:  { en: 'Run Batch Check',          ar: 'تشغيل الدُفعة',        es: 'Ejecutar Verificación por Lotes' },
    noBatchYet:  { en: 'No batch run yet',         ar: 'لم تُشغَّل دُفعة بعد', es: 'Sin lotes ejecutados aún' },
  },

  denials: {
    title:            { en: 'Denials & Appeals',   ar: 'الرفض والطعون',         es: 'Denegaciones y Apelaciones' },
    subtitle:         { en: 'Manage denied claims and appeal workflows', ar: 'إدارة المطالبات المرفوضة والطعون', es: 'Gestionar reclamaciones denegadas y apelaciones' },
    openDenials:      { en: 'Open Denials',        ar: 'الرفض المفتوح',         es: 'Denegaciones Abiertas' },
    inAppeal:         { en: 'In Appeal',           ar: 'قيد الاستئناف',         es: 'En Apelación' },
    generateAppeal:   { en: 'Generate Appeal',     ar: 'إنشاء طعن',             es: 'Generar Apelación' },
    appealLevel:      { en: 'Appeal Level',        ar: 'مستوى الطعن',           es: 'Nivel de Apelación' },
  },

  ar: {
    title:               { en: 'A/R Management',        ar: 'إدارة الذمم',               es: 'Gestión de C×C' },
    subtitle:            { en: 'Accounts receivable follow-up and collections', ar: 'متابعة وتحصيل الذمم', es: 'Seguimiento y cobro de cuentas por cobrar' },
    logCall:             { en: 'Log Manual Call',       ar: 'تسجيل مكالمة يدوية',       es: 'Registrar Llamada Manual' },
    daysInAR:            { en: 'Avg Days in A/R',       ar: 'متوسط أيام الذمم',          es: 'Promedio Días en C×C' },
    totalAR:             { en: 'Total A/R',             ar: 'إجمالي الذمم',               es: 'Total C×C' },
    workedToday:         { en: 'Worked Today',          ar: 'عولج اليوم',                es: 'Trabajadas Hoy' },
    followupsDue:        { en: 'Follow-ups Due',        ar: 'متابعات مستحقة',            es: 'Seguimientos Pendientes' },
    selectReason:        { en: 'Select a reason…',      ar: 'اختر سبباً…',               es: 'Seleccionar motivo…' },
    smallBalanceWriteOff:{ en: 'Small balance (under threshold)', ar: 'رصيد صغير (دون الحد)', es: 'Saldo pequeño (bajo umbral)' },
    timelyFilingExceeded:{ en: 'Timely filing deadline passed',   ar: 'انتهى موعد التقديم',    es: 'Plazo de presentación vencido' },
    noAuthOnFile:        { en: 'No authorization on file',        ar: 'لا يوجد تفويض',         es: 'Sin autorización en expediente' },
    medNecessityNotMet:  { en: 'Medical necessity – exhausted appeals', ar: 'ضرورة طبية – طعون مُستنفَدة', es: 'Necesidad médica – apelaciones agotadas' },
    contractualAdjustment:{ en: 'Contractual adjustment',         ar: 'تعديل تعاقدي',          es: 'Ajuste contractual' },
    charityCare:         { en: 'Charity care / financial hardship', ar: 'رعاية خيرية / ضائقة مالية', es: 'Atención benéfica / dificultad financiera' },
    patientBankruptcy:   { en: 'Patient bankruptcy',              ar: 'إفلاس المريض',          es: 'Quiebra del paciente' },
  },

  posting: {
    title:        { en: 'Payment Posting',     ar: 'ترحيل المدفوعات',    es: 'Registro de Pagos' },
    subtitle:     { en: 'Post ERA payments and manage remittance', ar: 'ترحيل مدفوعات ERA وإدارة التسويات', es: 'Registrar pagos ERA y gestionar remesas' },
    postApproved: { en: 'Post All Approved',   ar: 'ترحيل الموافق عليه', es: 'Registrar Todos los Aprobados' },
    posting:      { en: 'Posting…',            ar: 'جارٍ الترحيل…',      es: 'Registrando…' },
    erasPending:  { en: 'ERAs Pending',        ar: 'ERAs معلقة',         es: 'ERAs Pendientes' },
    autoPostRate: { en: 'Auto-Post Rate',      ar: 'معدل الترحيل التلقائي', es: 'Tasa de Registro Automático' },
  },

  tasks: {
    title:      { en: 'Tasks & Workflows',  ar: 'المهام والسير',     es: 'Tareas y Flujos' },
    subtitle:   { en: 'Track and manage team workload', ar: 'تتبع وإدارة عبء العمل', es: 'Seguir y gestionar la carga de trabajo' },
    createTask: { en: 'Create Task',        ar: 'إنشاء مهمة',       es: 'Crear Tarea' },
    assignedTo: { en: 'Assigned To',        ar: 'مُسنَد إلى',       es: 'Asignado A' },
    dueDate:    { en: 'Due Date',           ar: 'تاريخ الاستحقاق',  es: 'Fecha Límite' },
    priority:   { en: 'Priority',           ar: 'الأولوية',          es: 'Prioridad' },
    saveChanges:{ en: 'Save Changes',       ar: 'حفظ التغييرات',    es: 'Guardar Cambios' },
  },

  voice: {
    title:       { en: 'Voice AI',          ar: 'الذكاء الصوتي',   es: 'IA de Voz' },
    subtitle:    { en: 'AI-powered payer and patient calls', ar: 'مكالمات ذكية مع الدافعين والمرضى', es: 'Llamadas IA con pagadores y pacientes' },
    callsToday:  { en: 'Calls Today',       ar: 'مكالمات اليوم',   es: 'Llamadas Hoy' },
    successRate: { en: 'Success Rate',      ar: 'معدل النجاح',     es: 'Tasa de Éxito' },
    avgDuration: { en: 'Avg Duration',      ar: 'متوسط المدة',     es: 'Duración Promedio' },
  },

  scribe: {
    title:          { en: 'AI Scribe',                        ar: 'الكاتب الذكي',                         es: 'Transcriptor IA' },
    subtitleProvider:{ en: 'Dictate and review clinical notes', ar: 'إملاء ومراجعة الملاحظات السريرية',  es: 'Dictar y revisar notas clínicas' },
    subtitleCoder:  { en: 'Review AI-generated clinical notes', ar: 'مراجعة الملاحظات المُولَّدة بالذكاء', es: 'Revisar notas clínicas generadas por IA' },
    notesToday:     { en: 'Notes Today',                      ar: 'ملاحظات اليوم',                        es: 'Notas Hoy' },
    keep:           { en: 'Keep',                             ar: 'احتفظ',                                 es: 'Conservar' },
  },

  analytics: {
    title:             { en: 'Analytics',              ar: 'التحليلات',                    es: 'Analítica' },
    subtitle:          { en: 'Financial and operational reporting', ar: 'التقارير المالية والتشغيلية', es: 'Informes financieros y operativos' },
    sumOfPaidAmounts:  { en: 'Sum of paid amounts',    ar: 'مجموع المبالغ المدفوعة',       es: 'Suma de montos pagados' },
    revenueFormula:    { en: 'Revenue ÷ (Charges − Adj)', ar: 'الإيراد ÷ (الرسوم − التعديل)', es: 'Ingresos ÷ (Cargos − Ajuste)' },
    arFormula:         { en: 'AR ÷ (90-day charges ÷ 90)', ar: 'الذمم ÷ (رسوم 90 يوم ÷ 90)', es: 'C×C ÷ (Cargos 90 días ÷ 90)' },
    deniedFormula:     { en: 'Denied ÷ Submitted',     ar: 'المرفوض ÷ المُرسَل',           es: 'Denegadas ÷ Enviadas' },
    deniedBilled:      { en: 'Denied + Appealed billed', ar: 'المرفوض والمطعون',           es: 'Denegadas + Apeladas facturadas' },
    ofClaimsPassScrub: { en: 'of claims pass scrub',   ar: 'من المطالبات تجتاز الفحص',    es: 'de reclamaciones pasan revisión' },
    paidFirstTry:      { en: 'paid first try',          ar: 'مدفوعة من أول محاولة',        es: 'pagadas al primer intento' },
    dosToSubmit:       { en: 'DOS to submit',           ar: 'من تاريخ الخدمة للإرسال',     es: 'DOS a envío' },
    eraToPost:         { en: 'ERA to post',             ar: 'من ERA للترحيل',              es: 'ERA a registro' },
    last30:            { en: 'Last 30 Days',            ar: 'آخر 30 يوماً',                es: 'Últimos 30 Días' },
    last90:            { en: 'Last 90 Days',            ar: 'آخر 90 يوماً',                es: 'Últimos 90 Días' },
    ytd:               { en: 'Year to Date',            ar: 'منذ بداية العام',              es: 'Año hasta la Fecha' },
  },

  admin: {
    title:      { en: 'Admin & Settings', ar: 'الإدارة والإعدادات', es: 'Administración y Ajustes' },
    subtitle:   { en: 'System administration', ar: 'إدارة النظام',    es: 'Administración del sistema' },
    addUser:    { en: 'Add User',         ar: 'إضافة مستخدم',         es: 'Agregar Usuario' },
    createUser: { en: 'Create User',      ar: 'إنشاء مستخدم',         es: 'Crear Usuario' },
  },

  credentialing: {
    title:            { en: 'Credentialing',       ar: 'الاعتماد المهني',      es: 'Acreditación' },
    subtitle:         { en: 'Provider credentials and payer enrollment', ar: 'اعتمادات المزودين والتسجيل لدى الدافعين', es: 'Credenciales de proveedores e inscripción' },
    activeProviders:  { en: 'Active Providers',    ar: 'المزودون النشطون',     es: 'Proveedores Activos' },
    expiring30:       { en: 'Expiring in 30 Days', ar: 'تنتهي في 30 يوماً',   es: 'Vencen en 30 Días' },
    totalEnrollments: { en: 'Total Enrollments',   ar: 'إجمالي التسجيلات',    es: 'Total de Inscripciones' },
    initiateRecred:   { en: 'Initiate Re-credentialing', ar: 'بدء إعادة الاعتماد', es: 'Iniciar Re-acreditación' },
    addPayer:         { en: 'Add Payer Enrollment', ar: 'إضافة تسجيل دافع',   es: 'Agregar Inscripción de Pagador' },
  },

  contracts: {
    title:         { en: 'Contract Manager',   ar: 'إدارة العقود',           es: 'Gestión de Contratos' },
    subtitle:      { en: 'Payer contracts, fee schedules, and underpayment detection', ar: 'عقود الدافعين وجداول الرسوم', es: 'Contratos, tarifas y detección de pagos insuficientes' },
    activeContracts:{ en: 'Active Contracts',  ar: 'عقود نشطة',              es: 'Contratos Activos' },
    totalPayers:   { en: 'Total Payers',       ar: 'إجمالي الدافعين',        es: 'Total de Pagadores' },
    expiring90:    { en: 'Expiring in 90 Days', ar: 'تنتهي في 90 يوماً',    es: 'Vencen en 90 Días' },
  },

  documents: {
    title:      { en: 'Documents',       ar: 'المستندات',              es: 'Documentos' },
    subtitle:   { en: 'Document vault, fax center, and unlinked queue', ar: 'مخزن المستندات ومركز الفاكس', es: 'Bóveda de documentos, centro de fax y cola sin vincular' },
    searchDocs: { en: 'Search documents…', ar: 'ابحث في المستندات…',  es: 'Buscar documentos…' },
    bulkUpload: { en: 'Bulk Upload',      ar: 'رفع مجمّع',             es: 'Carga Masiva' },
    discard:    { en: 'Discard',          ar: 'تجاهل',                 es: 'Descartar' },
  },

  integrations: {
    title:    { en: 'Integration Hub', ar: 'مركز التكامل', es: 'Hub de Integración' },
    subtitle: { en: 'Manage EHR and clearinghouse connections', ar: 'إدارة اتصالات السجلات الصحية والتسويات', es: 'Gestionar conexiones EHR y cámara de compensación' },
  },

  messages: {
    title:       { en: 'Messages',      ar: 'الرسائل',    es: 'Mensajes' },
    subtitle:    { en: 'Team and client communications', ar: 'تواصل الفريق والعملاء', es: 'Comunicaciones del equipo y clientes' },
    placeholder: { en: 'Type a message…', ar: 'اكتب رسالة…', es: 'Escribe un mensaje…' },
  },

  patients: {
    title:       { en: 'Patients',      ar: 'المرضى',               es: 'Pacientes' },
    subtitle:    { en: 'Patient records and demographics', ar: 'سجلات المرضى والمعلومات الديموغرافية', es: 'Registros de pacientes y datos demográficos' },
    addPatient:  { en: 'Add Patient',   ar: 'إضافة مريض',           es: 'Agregar Paciente' },
    firstName:   { en: 'First Name',    ar: 'الاسم الأول',           es: 'Nombre' },
    lastName:    { en: 'Last Name',     ar: 'الاسم الأخير',          es: 'Apellido' },
    dateOfBirth: { en: 'Date of Birth', ar: 'تاريخ الميلاد',        es: 'Fecha de Nacimiento' },
    gender:      { en: 'Gender',        ar: 'الجنس',                 es: 'Género' },
    phone:       { en: 'Phone',         ar: 'الهاتف',                es: 'Teléfono' },
    email:       { en: 'Email',         ar: 'البريد الإلكتروني',     es: 'Correo Electrónico' },
    insurance:   { en: 'Insurance',     ar: 'التأمين',               es: 'Seguro' },
    mrn:         { en: 'MRN',          ar: 'رقم السجل الطبي',      es: 'Número de Historia Clínica' },
  },

  appointments: {
    title:          { en: 'Appointments',       ar: 'المواعيد',              es: 'Citas' },
    subtitle:       { en: 'Schedule and manage patient appointments', ar: 'جدولة وإدارة مواعيد المرضى', es: 'Programar y gestionar citas de pacientes' },
    book:           { en: 'Book Appointment',   ar: 'حجز موعد',              es: 'Reservar Cita' },
    verifyNow:      { en: 'Verify Eligibility', ar: 'التحقق من التأهيلية',   es: 'Verificar Elegibilidad' },
    eligVerified:   { en: '✓ Verified',         ar: '✓ تم التحقق',           es: '✓ Verificado' },
    eligInactive:   { en: '⚠ Inactive',         ar: '⚠ غير نشط',            es: '⚠ Inactivo' },
    eligNotChecked: { en: 'Not Verified',        ar: 'لم يتم التحقق',        es: 'No Verificado' },
  },

  scan: {
    title:         { en: 'Scan & Submit',    ar: 'مسح وإرسال',           es: 'Escanear y Enviar' },
    subtitle:      { en: 'Upload documents and superbills', ar: 'رفع المستندات وقوائم الخدمات', es: 'Subir documentos y superbills' },
    billingNotes:  { en: 'Billing Notes',    ar: 'ملاحظات الفوترة',      es: 'Notas de Facturación' },
    reviewSubmit:  { en: 'Review & Submit',  ar: 'مراجعة وإرسال',        es: 'Revisar y Enviar' },
  },

  watch: {
    title:        { en: 'Watch & Track',    ar: 'متابعة وتتبع',          es: 'Seguimiento' },
    subtitle:     { en: 'Track your submitted claims', ar: 'تتبع مطالباتك المُرسَلة', es: 'Seguir tus reclamaciones enviadas' },
    totalClaims:  { en: 'Total Claims',     ar: 'إجمالي المطالبات',      es: 'Total Reclamaciones' },
    totalCharges: { en: 'Total Charges',    ar: 'إجمالي الرسوم',         es: 'Total Cargos' },
    collected:    { en: 'Collected',        ar: 'المحصّل',               es: 'Cobrado' },
    avgDaysToPay: { en: 'Avg Days to Pay',  ar: 'متوسط أيام الدفع',     es: 'Promedio Días al Pago' },
    searchClaims: { en: 'Search claims…',   ar: 'ابحث في المطالبات…',    es: 'Buscar reclamaciones…' },
    allStatuses:  { en: 'All Statuses',     ar: 'جميع الحالات',          es: 'Todos los Estados' },
  },

  table: {
    id:      { en: 'ID',      ar: 'المعرّف',    es: 'ID' },
    name:    { en: 'Name',    ar: 'الاسم',      es: 'Nombre' },
    status:  { en: 'Status',  ar: 'الحالة',     es: 'Estado' },
    date:    { en: 'Date',    ar: 'التاريخ',    es: 'Fecha' },
    amount:  { en: 'Amount',  ar: 'المبلغ',     es: 'Monto' },
    actions: { en: 'Actions', ar: 'الإجراءات', es: 'Acciones' },
    noData:  { en: 'No data', ar: 'لا توجد بيانات', es: 'Sin datos' },
  },

  misc: {
    loading:    { en: 'Loading…',    ar: 'جارٍ التحميل…',   es: 'Cargando…' },
    error:      { en: 'Error',       ar: 'خطأ',             es: 'Error' },
    errors:     { en: 'Errors',      ar: 'أخطاء',           es: 'Errores' },
    tryAgain:   { en: 'Try Again',   ar: 'حاول مرة أخرى',   es: 'Intentar de Nuevo' },
    noResults:  { en: 'No results',  ar: 'لا نتائج',         es: 'Sin resultados' },
    required:   { en: 'Required',    ar: 'مطلوب',           es: 'Requerido' },
    optional:   { en: 'Optional',    ar: 'اختياري',         es: 'Opcional' },
    of:         { en: 'of',          ar: 'من',              es: 'de' },
    total:      { en: 'Total',       ar: 'الإجمالي',        es: 'Total' },
    region:     { en: 'Region',      ar: 'المنطقة',         es: 'Región' },
    usa:        { en: 'USA',         ar: 'الولايات المتحدة', es: 'EE.UU.' },
    uae:        { en: 'UAE',         ar: 'الإمارات',        es: 'EAU' },
    other:      { en: 'Other',       ar: 'أخرى',            es: 'Otro' },
  },

} as const

export type TranslationSection = keyof typeof translations
export type TranslationKey<S extends TranslationSection> = keyof (typeof translations)[S]

export default translations
