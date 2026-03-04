/**
 * MedCloud Translation Strings
 * Supports: English (en) | Arabic (ar) | Spanish (es)
 * Arabic uses RTL — direction is set on <html dir> in context.tsx
 */

export type Language = 'en' | 'ar' | 'es'

const translations = {
  // ── Navigation / Modules ───────────────────────────────────────────────
  nav: {
    dashboard:      { en: 'Dashboard',         ar: 'لوحة التحكم',       es: 'Panel Principal' },
    claims:         { en: 'Claims Center',     ar: 'مركز المطالبات',     es: 'Centro de Reclamaciones' },
    coding:         { en: 'AI Coding',         ar: 'الترميز الذكي',     es: 'Codificación IA' },
    eligibility:    { en: 'Eligibility',       ar: 'التأهيلية',          es: 'Elegibilidad' },
    denials:        { en: 'Denials & Appeals', ar: 'الرفض والطعون',      es: 'Denegaciones y Apelaciones' },
    ar:             { en: 'A/R Management',    ar: 'إدارة الذمم',        es: 'Gestión de Cuentas por Cobrar' },
    posting:        { en: 'Payment Posting',   ar: 'ترحيل المدفوعات',   es: 'Registro de Pagos' },
    contracts:      { en: 'Contract Manager',  ar: 'إدارة العقود',       es: 'Gestión de Contratos' },
    voice:          { en: 'Voice AI',          ar: 'الذكاء الصوتي',      es: 'IA de Voz' },
    scribe:         { en: 'AI Scribe',         ar: 'الكاتب الذكي',       es: 'Transcriptor IA' },
    tasks:          { en: 'Tasks & Workflows', ar: 'المهام والسير',       es: 'Tareas y Flujos' },
    documents:      { en: 'Documents',         ar: 'المستندات',           es: 'Documentos' },
    credentialing:  { en: 'Credentialing',     ar: 'الاعتماد المهني',    es: 'Acreditación' },
    analytics:      { en: 'Analytics',         ar: 'التحليلات',           es: 'Analítica' },
    admin:          { en: 'Admin & Settings',  ar: 'الإدارة والإعدادات', es: 'Administración y Ajustes' },
    integrations:   { en: 'Integration Hub',   ar: 'مركز التكامل',       es: 'Hub de Integración' },
    appointments:   { en: 'Appointments',      ar: 'المواعيد',            es: 'Citas' },
    scan:           { en: 'Scan & Submit',     ar: 'مسح وإرسال',         es: 'Escanear y Enviar' },
    watch:          { en: 'Watch & Track',     ar: 'متابعة وتتبع',       es: 'Seguimiento' },
    patients:       { en: 'Patients',          ar: 'المرضى',              es: 'Pacientes' },
    messages:       { en: 'Messages',          ar: 'الرسائل',             es: 'Mensajes' },
  },

  // ── Section Labels ─────────────────────────────────────────────────────
  sections: {
    operations:  { en: 'OPERATIONS',      ar: 'العمليات',            es: 'OPERACIONES' },
    ai:          { en: 'AI & AUTOMATION', ar: 'الذكاء والأتمتة',     es: 'IA Y AUTOMATIZACIÓN' },
    management:  { en: 'MANAGEMENT',      ar: 'الإدارة',              es: 'GESTIÓN' },
    portal:      { en: 'CLIENT PORTAL',   ar: 'بوابة العميل',        es: 'PORTAL DEL CLIENTE' },
    system:      { en: 'SYSTEM',          ar: 'النظام',               es: 'SISTEMA' },
    clinical:    { en: 'CLINICAL',        ar: 'السريري',              es: 'CLÍNICO' },
    myportal:    { en: 'MY PORTAL',       ar: 'بوابتي',               es: 'MI PORTAL' },
  },

  // ── Common Actions ─────────────────────────────────────────────────────
  actions: {
    save:         { en: 'Save',           ar: 'حفظ',        es: 'Guardar' },
    cancel:       { en: 'Cancel',         ar: 'إلغاء',       es: 'Cancelar' },
    submit:       { en: 'Submit',         ar: 'إرسال',       es: 'Enviar' },
    search:       { en: 'Search',         ar: 'بحث',         es: 'Buscar' },
    filter:       { en: 'Filter',         ar: 'تصفية',       es: 'Filtrar' },
    export:       { en: 'Export',         ar: 'تصدير',       es: 'Exportar' },
    import:       { en: 'Import',         ar: 'استيراد',     es: 'Importar' },
    add:          { en: 'Add',            ar: 'إضافة',       es: 'Agregar' },
    edit:         { en: 'Edit',           ar: 'تعديل',       es: 'Editar' },
    delete:       { en: 'Delete',         ar: 'حذف',         es: 'Eliminar' },
    close:        { en: 'Close',          ar: 'إغلاق',       es: 'Cerrar' },
    confirm:      { en: 'Confirm',        ar: 'تأكيد',       es: 'Confirmar' },
    refresh:      { en: 'Refresh',        ar: 'تحديث',       es: 'Actualizar' },
    download:     { en: 'Download',       ar: 'تنزيل',       es: 'Descargar' },
    upload:       { en: 'Upload',         ar: 'رفع',         es: 'Subir' },
    back:         { en: 'Back',           ar: 'رجوع',        es: 'Atrás' },
    next:         { en: 'Next',           ar: 'التالي',       es: 'Siguiente' },
    verify:       { en: 'Verify',         ar: 'تحقق',        es: 'Verificar' },
    approve:      { en: 'Approve',        ar: 'موافقة',      es: 'Aprobar' },
    reject:       { en: 'Reject',         ar: 'رفض',         es: 'Rechazar' },
    generate:     { en: 'Generate',       ar: 'توليد',       es: 'Generar' },
    runBatch:     { en: 'Run Batch',      ar: 'تشغيل دفعة', es: 'Ejecutar Lote' },
    logout:       { en: 'Logout',         ar: 'تسجيل خروج', es: 'Cerrar Sesión' },
  },

  // ── Status Labels ──────────────────────────────────────────────────────
  status: {
    active:       { en: 'Active',         ar: 'نشط',         es: 'Activo' },
    inactive:     { en: 'Inactive',       ar: 'غير نشط',     es: 'Inactivo' },
    pending:      { en: 'Pending',        ar: 'قيد الانتظار', es: 'Pendiente' },
    approved:     { en: 'Approved',       ar: 'موافق عليه',  es: 'Aprobado' },
    denied:       { en: 'Denied',         ar: 'مرفوض',        es: 'Denegado' },
    submitted:    { en: 'Submitted',      ar: 'مُرسَل',        es: 'Enviado' },
    inReview:     { en: 'In Review',      ar: 'قيد المراجعة', es: 'En Revisión' },
    paid:         { en: 'Paid',           ar: 'مدفوع',        es: 'Pagado' },
    failed:       { en: 'Failed',         ar: 'فشل',          es: 'Fallido' },
    completed:    { en: 'Completed',      ar: 'مكتمل',        es: 'Completado' },
    inNetwork:    { en: 'In-Network',     ar: 'داخل الشبكة',  es: 'En Red' },
    outOfNetwork: { en: 'Out-of-Network', ar: 'خارج الشبكة',  es: 'Fuera de Red' },
    open:         { en: 'Open',           ar: 'مفتوح',        es: 'Abierto' },
    closed:       { en: 'Closed',         ar: 'مغلق',         es: 'Cerrado' },
    appealed:     { en: 'Appealed',       ar: 'مطعون فيه',    es: 'Apelado' },
  },

  // ── Dashboard ──────────────────────────────────────────────────────────
  dashboard: {
    title:            { en: 'Dashboard',                ar: 'لوحة التحكم',              es: 'Panel Principal' },
    subtitle:         { en: 'Revenue Cycle Overview',   ar: 'نظرة عامة على دورة الإيراد', es: 'Resumen del Ciclo de Ingresos' },
    revenueCollected: { en: 'Revenue Collected',        ar: 'الإيراد المحصّل',           es: 'Ingresos Recaudados' },
    claimsSubmitted:  { en: 'Claims Submitted',         ar: 'المطالبات المقدّمة',         es: 'Reclamaciones Enviadas' },
    denialRate:       { en: 'Denial Rate',              ar: 'معدل الرفض',               es: 'Tasa de Denegación' },
    daysInAR:         { en: 'Days in A/R',              ar: 'أيام الذمم المدينة',        es: 'Días en Cuentas por Cobrar' },
    cleanClaimRate:   { en: 'Clean Claim Rate',         ar: 'معدل المطالبات النظيفة',   es: 'Tasa de Reclamaciones Limpias' },
    collectionRate:   { en: 'Net Collection Rate',      ar: 'معدل التحصيل الصافي',      es: 'Tasa Neta de Cobro' },
    pendingClaims:    { en: 'Pending Claims',           ar: 'المطالبات المعلقة',          es: 'Reclamaciones Pendientes' },
    openDenials:      { en: 'Open Denials',             ar: 'الرفوض المفتوحة',           es: 'Denegaciones Abiertas' },
    recentActivity:   { en: 'Recent Activity',          ar: 'النشاط الأخير',             es: 'Actividad Reciente' },
  },

  // ── Claims ─────────────────────────────────────────────────────────────
  claims: {
    title:        { en: 'Claims Center',     ar: 'مركز المطالبات',   es: 'Centro de Reclamaciones' },
    subtitle:     { en: 'Manage and track all claims', ar: 'إدارة ومتابعة جميع المطالبات', es: 'Gestionar y rastrear reclamaciones' },
    newClaim:     { en: 'New Claim',         ar: 'مطالبة جديدة',     es: 'Nueva Reclamación' },
    claimId:      { en: 'Claim ID',          ar: 'رقم المطالبة',     es: 'ID de Reclamación' },
    patient:      { en: 'Patient',           ar: 'المريض',            es: 'Paciente' },
    payer:        { en: 'Payer',             ar: 'الدافع',            es: 'Pagador' },
    amount:       { en: 'Amount',            ar: 'المبلغ',            es: 'Monto' },
    dateOfService: { en: 'Date of Service',  ar: 'تاريخ الخدمة',     es: 'Fecha de Servicio' },
    submitClaim:  { en: 'Submit Claim',      ar: 'إرسال المطالبة',   es: 'Enviar Reclamación' },
    scrubClaim:   { en: 'Scrub Claim',       ar: 'فحص المطالبة',     es: 'Revisar Reclamación' },
  },

  // ── Eligibility ────────────────────────────────────────────────────────
  eligibility: {
    title:        { en: 'Eligibility',           ar: 'التأهيلية',              es: 'Elegibilidad' },
    subtitle:     { en: 'Verify patient insurance coverage', ar: 'التحقق من تغطية تأمين المريض', es: 'Verificar cobertura de seguro' },
    verifyNow:    { en: 'Verify Now',             ar: 'تحقق الآن',             es: 'Verificar Ahora' },
    selectPatient: { en: 'Select Patient',        ar: 'اختر المريض',           es: 'Seleccionar Paciente' },
    copay:        { en: 'Copay',                  ar: 'المشاركة في الدفع',     es: 'Copago' },
    deductible:   { en: 'Deductible',             ar: 'قابل للخصم',            es: 'Deducible' },
    priorAuth:    { en: 'Prior Authorization',    ar: 'التفويض المسبق',        es: 'Autorización Previa' },
    batchCheck:   { en: 'Batch Check',            ar: 'فحص دفعي',              es: 'Verificación por Lote' },
    noBatchYet:   { en: 'No batch run yet this session', ar: 'لا توجد دفعة بعد', es: 'Sin lote ejecutado aún' },
  },

  // ── Denials ────────────────────────────────────────────────────────────
  denials: {
    title:        { en: 'Denials & Appeals',  ar: 'الرفض والطعون',     es: 'Denegaciones y Apelaciones' },
    subtitle:     { en: 'Track and appeal denied claims', ar: 'تتبع وطعن المطالبات المرفوضة', es: 'Rastrear y apelar reclamaciones denegadas' },
    openDenials:  { en: 'Open Denials',       ar: 'الرفوض المفتوحة',   es: 'Denegaciones Abiertas' },
    inAppeal:     { en: 'In Appeal',          ar: 'قيد الطعن',          es: 'En Apelación' },
    writeOff:     { en: 'Write-off Rate',     ar: 'معدل الشطب',         es: 'Tasa de Cancelación' },
    generateAppeal: { en: 'Generate Appeal',  ar: 'توليد طعن',          es: 'Generar Apelación' },
    appealLevel:  { en: 'Appeal Level',       ar: 'مستوى الطعن',        es: 'Nivel de Apelación' },
  },

  // ── Patients ───────────────────────────────────────────────────────────
  patients: {
    title:        { en: 'Patients',           ar: 'المرضى',             es: 'Pacientes' },
    subtitle:     { en: 'Manage patient records', ar: 'إدارة سجلات المرضى', es: 'Gestionar registros de pacientes' },
    addPatient:   { en: 'Add Patient',        ar: 'إضافة مريض',         es: 'Agregar Paciente' },
    firstName:    { en: 'First Name',         ar: 'الاسم الأول',         es: 'Nombre' },
    lastName:     { en: 'Last Name',          ar: 'الاسم الأخير',        es: 'Apellido' },
    dateOfBirth:  { en: 'Date of Birth',      ar: 'تاريخ الميلاد',      es: 'Fecha de Nacimiento' },
    gender:       { en: 'Gender',             ar: 'الجنس',               es: 'Género' },
    phone:        { en: 'Phone',              ar: 'الهاتف',               es: 'Teléfono' },
    email:        { en: 'Email',              ar: 'البريد الإلكتروني',   es: 'Correo Electrónico' },
    insurance:    { en: 'Insurance',          ar: 'التأمين',              es: 'Seguro' },
    mrn:          { en: 'MRN',               ar: 'الرقم الطبي',          es: 'NHC' },
  },

  // ── Common Table Headers ───────────────────────────────────────────────
  table: {
    id:           { en: 'ID',              ar: 'الرقم',       es: 'ID' },
    name:         { en: 'Name',            ar: 'الاسم',       es: 'Nombre' },
    status:       { en: 'Status',          ar: 'الحالة',      es: 'Estado' },
    date:         { en: 'Date',            ar: 'التاريخ',     es: 'Fecha' },
    amount:       { en: 'Amount',          ar: 'المبلغ',      es: 'Monto' },
    actions:      { en: 'Actions',         ar: 'الإجراءات',   es: 'Acciones' },
    client:       { en: 'Client',          ar: 'العميل',      es: 'Cliente' },
    provider:     { en: 'Provider',        ar: 'المزود',      es: 'Proveedor' },
    notes:        { en: 'Notes',           ar: 'الملاحظات',   es: 'Notas' },
    type:         { en: 'Type',            ar: 'النوع',       es: 'Tipo' },
    noData:       { en: 'No data found',   ar: 'لا توجد بيانات', es: 'Sin datos' },
  },

  // ── Topbar ─────────────────────────────────────────────────────────────
  topbar: {
    searchPlaceholder: { en: 'Search patients, claims, docs...', ar: 'ابحث عن مرضى، مطالبات، مستندات...', es: 'Buscar pacientes, reclamaciones, docs...' },
    selectClient:      { en: 'All Clients',  ar: 'جميع العملاء',  es: 'Todos los Clientes' },
    language:          { en: 'Language',     ar: 'اللغة',          es: 'Idioma' },
  },

  // ── A/R Management ─────────────────────────────────────────────────────
  ar: {
    title:        { en: 'A/R Management',   ar: 'إدارة الذمم',      es: 'Gestión de Cuentas por Cobrar' },
    subtitle:     { en: 'Accounts receivable tracking', ar: 'تتبع الذمم المدينة', es: 'Seguimiento de cuentas por cobrar' },
    logCall:      { en: 'Log Manual Call',  ar: 'تسجيل مكالمة',    es: 'Registrar Llamada' },
    daysInAR:     { en: 'Days in A/R',      ar: 'أيام الذمم',       es: 'Días en C×C' },
    totalAR:      { en: 'Total A/R',        ar: 'إجمالي الذمم',     es: 'Total C×C' },
    followUp:     { en: 'Follow Up Date',   ar: 'تاريخ المتابعة',   es: 'Fecha de Seguimiento' },
  },

  // ── Payment Posting ────────────────────────────────────────────────────
  posting: {
    title:         { en: 'Payment Posting', ar: 'ترحيل المدفوعات',  es: 'Registro de Pagos' },
    subtitle:      { en: 'Process ERAs and post payments', ar: 'معالجة ملفات ERA وترحيل المدفوعات', es: 'Procesar ERAs y registrar pagos' },
    postApproved:  { en: 'Post All Approved', ar: 'ترحيل جميع الموافق عليها', es: 'Registrar Todos Aprobados' },
    posting:       { en: 'Posting…',        ar: 'جارٍ الترحيل…',    es: 'Registrando…' },
    erasPending:   { en: 'ERAs Pending',    ar: 'ERAs معلقة',        es: 'ERAs Pendientes' },
    autoPostRate:  { en: 'Auto-Post Rate',  ar: 'معدل الترحيل التلقائي', es: 'Tasa de Registro Automático' },
  },

  // ── Tasks ──────────────────────────────────────────────────────────────
  tasks: {
    title:        { en: 'Tasks & Workflows', ar: 'المهام والسير',    es: 'Tareas y Flujos de Trabajo' },
    subtitle:     { en: 'Manage team tasks and workflows', ar: 'إدارة مهام الفريق', es: 'Gestionar tareas del equipo' },
    saveChanges:  { en: 'Save Changes',     ar: 'حفظ التغييرات',    es: 'Guardar Cambios' },
    assignedTo:   { en: 'Assigned To',      ar: 'مُسنَد إلى',        es: 'Asignado a' },
    dueDate:      { en: 'Due Date',         ar: 'تاريخ الاستحقاق',  es: 'Fecha de Vencimiento' },
    priority:     { en: 'Priority',         ar: 'الأولوية',           es: 'Prioridad' },
  },

  // ── Misc / Global ──────────────────────────────────────────────────────
  misc: {
    loading:      { en: 'Loading...',       ar: 'جارٍ التحميل...',  es: 'Cargando...' },
    error:        { en: 'Something went wrong', ar: 'حدث خطأ',      es: 'Algo salió mal' },
    tryAgain:     { en: 'Try Again',        ar: 'حاول مجدداً',      es: 'Intentar de Nuevo' },
    noResults:    { en: 'No results found', ar: 'لا توجد نتائج',    es: 'Sin resultados' },
    required:     { en: 'Required',         ar: 'مطلوب',             es: 'Requerido' },
    optional:     { en: 'Optional',         ar: 'اختياري',           es: 'Opcional' },
    of:           { en: 'of',               ar: 'من',                es: 'de' },
    total:        { en: 'Total',            ar: 'الإجمالي',           es: 'Total' },
    region:       { en: 'Region',           ar: 'المنطقة',            es: 'Región' },
    usa:          { en: 'United States',    ar: 'الولايات المتحدة',  es: 'Estados Unidos' },
    uae:          { en: 'UAE',              ar: 'الإمارات',           es: 'Emiratos' },
    demoNotice:   { en: 'Demo data — live data connects in Sprint 2', ar: 'بيانات تجريبية — البيانات المباشرة في Sprint 2', es: 'Datos de demo — datos en vivo en Sprint 2' },
  },
} as const

export type TranslationKey = typeof translations
export default translations
