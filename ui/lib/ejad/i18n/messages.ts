// Every Arabic and English string in the Ejad UI, side by side for review.
//
// - `{name}` is filled in by t("key", { name }).
// - An entry with plural forms is picked by the `count` var. Arabic uses
//   zero/one/two/few/many/other (Intl.PluralRules), English one/other.
// - Atom Administration pages are not translated.
//
// Arabic wording follows common Saudi/Gulf technical usage.

type Plural = {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
};
type Messages = Record<string, { en: string | Plural; ar: string | Plural }>;

export const messages = {
  // ── Common ──────────────────────────────────────────────────────────────
  "common.cancel": { en: "Cancel", ar: "إلغاء" },
  "common.close": { en: "Close", ar: "إغلاق" },
  "common.save": { en: "Save", ar: "حفظ" },
  "common.saving": { en: "Saving…", ar: "جارٍ الحفظ…" },
  "common.create": { en: "Create", ar: "إنشاء" },
  "common.creating": { en: "Creating…", ar: "جارٍ الإنشاء…" },
  "common.delete": { en: "Delete", ar: "حذف" },
  "common.deleting": { en: "Deleting…", ar: "جارٍ الحذف…" },
  "common.remove": { en: "Remove", ar: "إزالة" },
  "common.removing": { en: "Removing…", ar: "جارٍ الإزالة…" },
  "common.edit": { en: "Edit", ar: "تعديل" },
  "common.rename": { en: "Rename", ar: "إعادة تسمية" },
  "common.back": { en: "Back", ar: "رجوع" },
  "common.next": { en: "Next", ar: "التالي" },
  "common.previous": { en: "Previous", ar: "السابق" },
  "common.refresh": { en: "Refresh", ar: "تحديث" },
  "common.retry": { en: "Try again", ar: "حاول مرة أخرى" },
  "common.search": { en: "Search", ar: "بحث" },
  "common.loading": { en: "Loading", ar: "جارٍ التحميل" },
  "common.loadingEllipsis": { en: "Loading…", ar: "جارٍ التحميل…" },
  "common.copy": { en: "Copy", ar: "نسخ" },
  "common.copied": { en: "Copied", ar: "تم النسخ" },
  "common.copyFailed": { en: "Could not copy", ar: "تعذّر النسخ" },
  "common.name": { en: "Name", ar: "الاسم" },
  "common.description": { en: "Description", ar: "الوصف" },
  "common.type": { en: "Type", ar: "النوع" },
  "common.status": { en: "Status", ar: "الحالة" },
  "common.created": { en: "Created", ar: "تاريخ الإنشاء" },
  "common.updated": { en: "Updated", ar: "آخر تحديث" },
  "common.actions": { en: "Actions", ar: "الإجراءات" },
  "common.id": { en: "ID", ar: "المعرّف" },
  "common.yes": { en: "Yes", ar: "نعم" },
  "common.no": { en: "No", ar: "لا" },
  "common.none": { en: "None", ar: "لا يوجد" },
  "common.enabled": { en: "Enabled", ar: "مفعّل" },
  "common.disabled": { en: "Disabled", ar: "معطّل" },
  "common.enable": { en: "Enable", ar: "تفعيل" },
  "common.disable": { en: "Disable", ar: "تعطيل" },
  "common.optional": { en: "Optional", ar: "اختياري" },
  "common.never": { en: "Never", ar: "أبدًا" },
  "common.unknown": { en: "Unknown", ar: "غير معروف" },
  "common.openMenu": { en: "Open menu", ar: "فتح القائمة" },
  "common.moreActions": { en: "More actions", ar: "إجراءات أخرى" },
  "common.selectAll": { en: "Select all", ar: "تحديد الكل" },
  "common.selectRow": { en: "Select row", ar: "تحديد الصف" },
  "common.askAdmin": {
    en: "Ask a workspace admin if you need one.",
    ar: "اطلب ذلك من مسؤول مساحة العمل إذا احتجت إليه.",
  },
  "common.noMatches": {
    en: "Nothing matches your search.",
    ar: "لا توجد نتائج مطابقة لبحثك.",
  },
  "common.rowsSelected": {
    en: { one: "{count} selected", other: "{count} selected" },
    ar: {
      zero: "لم يُحدَّد شيء",
      one: "عنصر واحد محدد",
      two: "عنصران محددان",
      few: "{count} عناصر محددة",
      many: "{count} عنصرًا محددًا",
      other: "{count} عنصر محدد",
    },
  },
  "common.pageOf": {
    en: "Page {page} of {pages}",
    ar: "الصفحة {page} من {pages}",
  },
  "common.rangeOf": {
    en: "{first}–{last} of {total}",
    ar: "{first}–{last} من {total}",
  },

  // ── Language ────────────────────────────────────────────────────────────
  "language.label": { en: "Language", ar: "اللغة" },
  "language.en": { en: "English", ar: "English" },
  "language.ar": { en: "العربية", ar: "العربية" },
  "language.switchTo": {
    en: "Switch to Arabic",
    ar: "التبديل إلى الإنجليزية",
  },

  // ── App shell ───────────────────────────────────────────────────────────
  "shell.toggleSidebar": {
    en: "Toggle sidebar",
    ar: "إظهار/إخفاء القائمة الجانبية",
  },
  "shell.profile": { en: "Profile settings", ar: "إعدادات الملف الشخصي" },
  "shell.theme": { en: "Theme", ar: "المظهر" },
  "shell.themeLight": { en: "Light", ar: "فاتح" },
  "shell.themeDark": { en: "Dark", ar: "داكن" },
  "shell.themeSystem": { en: "System", ar: "حسب الجهاز" },
  "shell.logout": { en: "Log out", ar: "تسجيل الخروج" },
  "shell.workspace": { en: "Workspace", ar: "مساحة العمل" },
  "shell.workspaceTooltip": {
    en: "Workspace: {name}",
    ar: "مساحة العمل: {name}",
  },
  "shell.global": { en: "Global", ar: "عام" },
  "shell.badgePlatform": { en: "platform", ar: "المنصة" },
  "shell.badgeWorkspace": { en: "workspace", ar: "مساحة عمل" },
  "shell.englishOnly": {
    en: "Administration pages are in English only.",
    ar: "صفحات الإدارة متوفرة باللغة الإنجليزية فقط.",
  },
  "shell.sessionEnding": {
    en: "Your session is about to end.",
    ar: "ستنتهي جلستك قريبًا.",
  },
  "shell.sessionExpired": {
    en: "Your session has ended. Sign in again to continue.",
    ar: "انتهت جلستك. سجّل الدخول مرة أخرى للمتابعة.",
  },

  // ── Navigation ──────────────────────────────────────────────────────────
  "nav.overview": { en: "Overview", ar: "نظرة عامة" },
  "nav.workspace": { en: "Workspace", ar: "مساحة العمل" },
  "nav.administration": { en: "Administration", ar: "الإدارة" },
  "nav.home": { en: "Home", ar: "الرئيسية" },
  "nav.workspaces": { en: "Workspaces", ar: "مساحات العمل" },
  "nav.users": { en: "Users", ar: "المستخدمون" },
  "nav.devices": { en: "Devices", ar: "الأجهزة" },
  "nav.channels": { en: "Channels", ar: "القنوات" },
  "nav.groups": { en: "Groups", ar: "المجموعات" },
  "nav.messages": { en: "Messages", ar: "الرسائل" },
  "nav.dashboards": { en: "Dashboards", ar: "لوحات المعلومات" },
  "nav.members": { en: "Members", ar: "الأعضاء" },
  "nav.needsWorkspace": {
    en: "Select a workspace in the Workspace switcher above to use these pages.",
    ar: "اختر مساحة عمل من قائمة مساحات العمل في الأعلى لاستخدام هذه الصفحات.",
  },
  "nav.selectWorkspaceFirst": {
    en: "{title}: select a workspace first",
    ar: "{title}: اختر مساحة عمل أولًا",
  },

  // ── Sign in ─────────────────────────────────────────────────────────────
  "auth.signIn": { en: "Sign In", ar: "تسجيل الدخول" },
  "auth.identifier": {
    en: "Email or Username",
    ar: "البريد الإلكتروني أو اسم المستخدم",
  },
  "auth.identifierRequired": {
    en: "Email or username is required",
    ar: "أدخل البريد الإلكتروني أو اسم المستخدم",
  },
  "auth.password": { en: "Password", ar: "كلمة المرور" },
  "auth.passwordRequired": {
    en: "Password is required",
    ar: "أدخل كلمة المرور",
  },
  "auth.failed": { en: "Sign in failed", ar: "تعذّر تسجيل الدخول" },
  "auth.unable": { en: "Unable to sign in", ar: "تعذّر تسجيل الدخول" },
  "auth.badCredentials": {
    en: "The email, username or password is not correct.",
    ar: "البريد الإلكتروني أو اسم المستخدم أو كلمة المرور غير صحيحة.",
  },
  "auth.needAccess": {
    en: "Need access? Ask an administrator to onboard you.",
    ar: "تحتاج إلى حساب؟ اطلب من مسؤول النظام إضافتك.",
  },
  "auth.newTo": { en: "New to {brand}?", ar: "جديد على {brand}؟" },
  "auth.createAccount": { en: "Create account", ar: "إنشاء حساب" },
  "auth.brandName": {
    en: "Ejad IoT Platform",
    ar: "منصة إيجاد لإنترنت الأشياء",
  },

  // ── Errors (Atom GraphQL error codes) ───────────────────────────────────
  "error.BAD_REQUEST": {
    en: "Some of the details are not valid. Check them and try again.",
    ar: "بعض البيانات غير صحيحة. راجعها وحاول مرة أخرى.",
  },
  "error.UNAUTHENTICATED": {
    en: "Your session has ended. Sign in again to continue.",
    ar: "انتهت جلستك. سجّل الدخول مرة أخرى للمتابعة.",
  },
  "error.FORBIDDEN": {
    en: "You do not have permission to do this in this workspace.",
    ar: "ليست لديك صلاحية لتنفيذ هذا الإجراء في مساحة العمل هذه.",
  },
  "error.NOT_FOUND": {
    en: "This item no longer exists, or you cannot see it.",
    ar: "هذا العنصر غير موجود، أو لا تملك صلاحية عرضه.",
  },
  "error.CONFLICT": {
    en: "This conflicts with something that already exists or was just changed. Refresh and try again.",
    ar: "يتعارض هذا مع عنصر موجود أو تم تعديله للتو. حدّث الصفحة وحاول مرة أخرى.",
  },
  "error.PAYLOAD_TOO_LARGE": {
    en: "This is too large to send. Make it smaller and try again.",
    ar: "الحجم أكبر من المسموح. قلّل الحجم وحاول مرة أخرى.",
  },
  "error.RATE_LIMITED": {
    en: "Too many requests right now. Wait a moment and try again.",
    ar: "عدد الطلبات كبير حاليًا. انتظر قليلًا ثم حاول مرة أخرى.",
  },
  "error.SERVICE_UNAVAILABLE": {
    en: "The service is temporarily unavailable. Try again in a moment.",
    ar: "الخدمة غير متاحة مؤقتًا. حاول مرة أخرى بعد قليل.",
  },
  "error.INTERNAL": {
    en: "Something went wrong on our side. Try again later.",
    ar: "حدث خطأ من جهتنا. حاول مرة أخرى لاحقًا.",
  },
  "error.network": {
    en: "Cannot reach the server. Check your connection and try again.",
    ar: "تعذّر الاتصال بالخادم. تحقق من اتصالك وحاول مرة أخرى.",
  },
  "error.unknown": {
    en: "Something went wrong. Try again.",
    ar: "حدث خطأ ما. حاول مرة أخرى.",
  },
  "error.reference": {
    en: "Reference for support:",
    ar: "الرقم المرجعي للدعم الفني:",
  },
  "error.couldNotLoad": {
    en: "Could not load {what}",
    ar: "تعذّر تحميل {what}",
  },
  "error.notFoundTitle": {
    en: "{what} not found",
    ar: "لم يتم العثور على {what}",
  },
  "error.notFoundHint": {
    en: "It may have been deleted, or you may not have access to it.",
    ar: "ربما تم حذفه، أو لا تملك صلاحية الوصول إليه.",
  },
  "error.pageTitle": { en: "Something went wrong", ar: "حدث خطأ ما" },
  // ── Loading problems on detail pages ────────────────────────────────────
  "load.notFound.device": {
    en: "This device was not found",
    ar: "لم يتم العثور على هذا الجهاز",
  },
  "load.notFound.channel": {
    en: "This channel was not found",
    ar: "لم يتم العثور على هذه القناة",
  },
  "load.notFound.group": {
    en: "This group was not found",
    ar: "لم يتم العثور على هذه المجموعة",
  },
  "load.notFound.dashboard": {
    en: "This dashboard was not found",
    ar: "لم يتم العثور على لوحة المعلومات هذه",
  },
  "load.notFoundHint": {
    en: "It may have been deleted, or it belongs to another workspace. Check the workspace selected in the sidebar.",
    ar: "ربما تم حذفه، أو أنه يتبع مساحة عمل أخرى. تحقق من مساحة العمل المختارة في القائمة الجانبية.",
  },
  "load.failed.device": {
    en: "Could not load this device",
    ar: "تعذّر تحميل هذا الجهاز",
  },
  "load.failed.channel": {
    en: "Could not load this channel",
    ar: "تعذّر تحميل هذه القناة",
  },
  "load.failed.group": {
    en: "Could not load this group",
    ar: "تعذّر تحميل هذه المجموعة",
  },
  "load.failed.dashboard": {
    en: "Could not load this dashboard",
    ar: "تعذّر تحميل لوحة المعلومات هذه",
  },
  // ── Messages sent by /api/ejad routes and lib/ejad validators ───────────
  // The English must match the server text exactly to be translated.
  "server.selectWorkspace": {
    en: "Select a workspace first.",
    ar: "اختر مساحة عمل أولًا.",
  },
  "server.pickRole": { en: "Pick a role.", ar: "اختر دورًا." },
  "server.pickMember": { en: "Pick a member.", ar: "اختر عضوًا." },
  "server.pickUser": { en: "Pick a user.", ar: "اختر مستخدمًا." },
  "server.pickSecret": { en: "Pick a secret.", ar: "اختر مفتاحًا سريًا." },
  "server.pickDevice": { en: "Pick a device.", ar: "اختر جهازًا." },
  "server.pickChannel": { en: "Pick a channel.", ar: "اختر قناة." },
  "server.unknownAction": { en: "Unknown action.", ar: "إجراء غير معروف." },
  "server.typeThree": {
    en: "Type at least 3 characters.",
    ar: "اكتب ٣ أحرف على الأقل.",
  },
  "server.noActiveSecret": {
    en: "This device has no active secret.",
    ar: "لا يوجد مفتاح سري فعّال لهذا الجهاز.",
  },
  "server.deviceNotHere": {
    en: "The device is not in this workspace.",
    ar: "هذا الجهاز لا يتبع مساحة العمل الحالية.",
  },
  "server.channelNotHere": {
    en: "The channel is not in this workspace.",
    ar: "هذه القناة لا تتبع مساحة العمل الحالية.",
  },
  "server.cantDeleteSelf": {
    en: "You can't delete your own account.",
    ar: "لا يمكنك حذف حسابك.",
  },
  "server.cantDeleteAdmin": {
    en: "The built-in admin account can't be deleted.",
    ar: "لا يمكن حذف حساب المسؤول الافتراضي.",
  },
  "server.userNotFound": { en: "User not found.", ar: "المستخدم غير موجود." },
  "server.userExists": {
    en: "A user with that username or email already exists.",
    ar: "يوجد مستخدم بنفس اسم المستخدم أو البريد الإلكتروني.",
  },
  "server.invalidWorkspaceIds": {
    en: "Invalid workspace ids.",
    ar: "معرّفات مساحات العمل غير صحيحة.",
  },
  "server.deniedView": {
    en: "You don't have access to this workspace.",
    ar: "ليست لديك صلاحية الوصول إلى مساحة العمل هذه.",
  },
  "server.deniedManage": {
    en: "Your role in this workspace can't make changes here.",
    ar: "دورك في مساحة العمل هذه لا يسمح بإجراء تغييرات هنا.",
  },
  "server.deniedConnect": {
    en: "Your role in this workspace can't connect devices and channels.",
    ar: "دورك في مساحة العمل هذه لا يسمح بربط الأجهزة والقنوات.",
  },
  "server.deniedMembers": {
    en: "Only workspace admins can manage members.",
    ar: "إدارة الأعضاء متاحة لمسؤولي مساحة العمل فقط.",
  },
  "server.deniedUsers": {
    en: "Only platform admins can manage users.",
    ar: "إدارة المستخدمين متاحة لمسؤولي المنصة فقط.",
  },
  "server.csvEmpty": { en: "The CSV file is empty.", ar: "ملف CSV فارغ." },
  "server.csvNoDevices": {
    en: "The CSV file has no devices.",
    ar: "لا يحتوي ملف CSV على أي أجهزة.",
  },
  "server.csvUnclosedQuote": {
    en: "The CSV file has an unclosed quote.",
    ar: "يحتوي ملف CSV على علامة اقتباس غير مغلقة.",
  },
  "server.metadataJson": {
    en: "Metadata must be valid JSON.",
    ar: "يجب أن تكون البيانات الوصفية بصيغة JSON صحيحة.",
  },
  "server.metadataObject": {
    en: "Metadata must be a JSON object.",
    ar: "يجب أن تكون البيانات الوصفية كائن JSON.",
  },
  "server.dashboardNoWorkspace": {
    en: "The dashboard has no workspace.",
    ar: "لوحة المعلومات غير مرتبطة بمساحة عمل.",
  },
  "server.dashboardGone": {
    en: "The dashboard no longer exists.",
    ar: "لوحة المعلومات لم تعد موجودة.",
  },
  "server.nothingToSave": {
    en: "Nothing to save.",
    ar: "لا توجد تغييرات للحفظ.",
  },
  "server.noGroupSelected": {
    en: "No group selected.",
    ar: "لم يتم اختيار مجموعة.",
  },
  // ── Page titles and descriptions ────────────────────────────────────────
  "page.home.title": { en: "Home", ar: "الرئيسية" },
  "page.home.description": {
    en: "What is happening in your Ejad workspace: devices, channels and the latest readings.",
    ar: "ما يحدث في مساحة عملك على إيجاد: الأجهزة والقنوات وآخر القراءات.",
  },
  "page.workspaces.title": { en: "Workspaces", ar: "مساحات العمل" },
  "page.workspaces.description": {
    en: "A workspace keeps one project's devices, channels and people together. Pick one to work in, or create a new one.",
    ar: "تجمع مساحة العمل أجهزة المشروع الواحد وقنواته والأشخاص العاملين عليه. اختر مساحة للعمل عليها أو أنشئ مساحة جديدة.",
  },
  "page.users.title": { en: "Users", ar: "المستخدمون" },
  "page.users.description": {
    en: "Accounts that can sign in. Add them to workspaces on each workspace’s Members page.",
    ar: "الحسابات التي يمكنها تسجيل الدخول. أضفها إلى مساحات العمل من صفحة الأعضاء في كل مساحة.",
  },
  "page.devices.title": { en: "Devices", ar: "الأجهزة" },
  "page.devices.description": {
    en: "Register devices, manage their secrets, and connect them to channels.",
    ar: "سجّل الأجهزة، وأدر مفاتيحها السرية، واربطها بالقنوات.",
  },
  "page.device.title": { en: "Device", ar: "الجهاز" },
  "page.device.description": {
    en: "Device details, secrets and activity.",
    ar: "تفاصيل الجهاز ومفاتيحه السرية ونشاطه.",
  },
  "page.channels.title": { en: "Channels", ar: "القنوات" },
  "page.channels.description": {
    en: "Create channels that devices publish to and subscribe from.",
    ar: "أنشئ قنوات تنشر الأجهزة إليها وتشترك فيها.",
  },
  "page.channel.title": { en: "Channel", ar: "القناة" },
  "page.channel.description": {
    en: "Channel details, connections and messages.",
    ar: "تفاصيل القناة واتصالاتها ورسائلها.",
  },
  "page.groups.title": { en: "Groups", ar: "المجموعات" },
  "page.groups.description": {
    en: "Organize devices and channels into a tree of groups, for example by site, building or floor.",
    ar: "نظّم الأجهزة والقنوات في شجرة من المجموعات، مثلًا حسب الموقع أو المبنى أو الطابق.",
  },
  "page.group.title": { en: "Group", ar: "المجموعة" },
  "page.group.description": {
    en: "A group’s devices, channels and subgroups.",
    ar: "أجهزة المجموعة وقنواتها ومجموعاتها الفرعية.",
  },
  "page.messages.title": { en: "Messages", ar: "الرسائل" },
  "page.messages.description": {
    en: "Browse messages published on this workspace’s channels.",
    ar: "تصفّح الرسائل المنشورة على قنوات مساحة العمل هذه.",
  },
  "page.dashboards.title": { en: "Dashboards", ar: "لوحات المعلومات" },
  "page.dashboards.description": {
    en: "Live charts and values from your channels’ stored messages.",
    ar: "رسوم بيانية وقيم مباشرة من الرسائل المخزّنة في قنواتك.",
  },
  "page.dashboard.title": { en: "Dashboard", ar: "لوحة المعلومات" },
  "page.dashboard.description": {
    en: "Live charts and values from your channels.",
    ar: "رسوم بيانية وقيم مباشرة من قنواتك.",
  },
  "page.members.title": { en: "Members", ar: "الأعضاء" },
  "page.members.description": {
    en: "Manage who has access to this workspace and what they can do.",
    ar: "حدّد من يمكنه الوصول إلى مساحة العمل هذه وما يمكنه فعله.",
  },
  "noWorkspace.title": {
    en: "Pick a workspace first",
    ar: "اختر مساحة عمل أولًا",
  },
  "noWorkspace.description": {
    en: "This page shows one workspace at a time. Choose a workspace in the Workspace switcher in the sidebar, or open the list of workspaces.",
    ar: "تعرض هذه الصفحة مساحة عمل واحدة في كل مرة. اختر مساحة عمل من القائمة الجانبية، أو افتح قائمة مساحات العمل.",
  },
  "noWorkspace.action": {
    en: "Go to workspaces",
    ar: "الانتقال إلى مساحات العمل",
  },

  // ── Home ────────────────────────────────────────────────────────────────
  "home.pickWorkspace": { en: "Pick a workspace", ar: "اختر مساحة عمل" },
  "home.pickWorkspaceHint": {
    en: "A workspace holds one project’s devices, channels and people. Choose one in the Workspace switcher in the sidebar, or open the list of workspaces.",
    ar: "تضم مساحة العمل أجهزة المشروع الواحد وقنواته والأشخاص العاملين عليه. اختر واحدة من القائمة الجانبية، أو افتح قائمة مساحات العمل.",
  },
  "home.platform": { en: "Platform", ar: "المنصة" },
  "home.loadFailed": {
    en: "Could not load the workspace overview",
    ar: "تعذّر تحميل ملخص مساحة العمل",
  },
  "home.emptyTitle": {
    en: "This workspace is empty",
    ar: "مساحة العمل هذه فارغة",
  },
  "home.emptyHint": {
    en: "Start by adding a device, then create a channel and connect the device to it. Its messages show up here once the channel stores them.",
    ar: "ابدأ بإضافة جهاز، ثم أنشئ قناة واربط الجهاز بها. ستظهر رسائله هنا عند تفعيل تخزين الرسائل في القناة.",
  },
  "home.addDevice": { en: "Add a device", ar: "إضافة جهاز" },
  "home.createChannel": { en: "Create a channel", ar: "إنشاء قناة" },
  "home.overview": { en: "Workspace overview", ar: "ملخص مساحة العمل" },
  "home.storing": {
    en: { one: "{count} storing messages", other: "{count} storing messages" },
    ar: {
      zero: "لا توجد قنوات تخزّن الرسائل",
      one: "قناة واحدة تخزّن الرسائل",
      two: "قناتان تخزّنان الرسائل",
      few: "{count} قنوات تخزّن الرسائل",
      many: "{count} قناة تخزّن الرسائل",
      other: "{count} قناة تخزّن الرسائل",
    },
  },
  "home.lastHour": {
    en: "Messages in the last hour",
    ar: "الرسائل خلال الساعة الأخيرة",
  },
  "home.noStoring": {
    en: "No channel stores messages yet",
    ar: "لا توجد قناة تخزّن الرسائل حتى الآن",
  },
  "home.allChannels": {
    en: "Stored messages, all channels",
    ar: "الرسائل المخزّنة في جميع القنوات",
  },
  "home.latest": { en: "Latest values", ar: "آخر القيم" },
  "home.noStored": {
    en: "No stored messages yet. Turn on “Store messages” on a channel and publish to it.",
    ar: "لا توجد رسائل مخزّنة بعد. فعّل «تخزين الرسائل» في إحدى القنوات وانشر إليها.",
  },
  "home.openChannels": { en: "Open channels", ar: "فتح القنوات" },
  // ── Status and roles ────────────────────────────────────────────────────
  "status.active": { en: "active", ar: "نشط" },
  "status.enabled": { en: "enabled", ar: "مفعّل" },
  "status.disabled": { en: "disabled", ar: "معطّل" },
  "status.inactive": { en: "inactive", ar: "غير نشط" },
  "status.suspended": { en: "suspended", ar: "موقوف" },
  "status.deleted": { en: "deleted", ar: "محذوف" },
  "status.revoked": { en: "revoked", ar: "ملغى" },
  "status.expired": { en: "expired", ar: "منتهي" },
  "status.frozen": { en: "frozen", ar: "مجمّد" },
  "role.admin": { en: "Admin", ar: "مسؤول" },
  "role.operator": { en: "Operator", ar: "مشغّل" },
  "role.viewer": { en: "Viewer", ar: "مشاهد" },
  "role.none": { en: "No role", ar: "بدون دور" },
  "common.actionsFor": { en: "Actions for {name}", ar: "إجراءات {name}" },
  "common.saveChanges": { en: "Save changes", ar: "حفظ التغييرات" },

  // ── Workspaces ──────────────────────────────────────────────────────────
  "workspaces.loadFailed": {
    en: "Could not load workspaces",
    ar: "تعذّر تحميل مساحات العمل",
  },
  "workspaces.emptyTitle": {
    en: "No workspaces yet",
    ar: "لا توجد مساحات عمل بعد",
  },
  "workspaces.emptyHint": {
    en: "Create your first workspace, then add devices and channels to it.",
    ar: "أنشئ أول مساحة عمل، ثم أضف إليها الأجهزة والقنوات.",
  },
  "workspaces.open": {
    en: "Open workspace {name}",
    ar: "فتح مساحة العمل {name}",
  },
  "workspaces.current": { en: "Current", ar: "الحالية" },
  "workspaces.create": { en: "Create workspace", ar: "إنشاء مساحة عمل" },
  "workspaces.createHint": {
    en: "A workspace holds your devices, channels and dashboards. You become its administrator.",
    ar: "تضم مساحة العمل أجهزتك وقنواتك ولوحات المعلومات. ستكون أنت مسؤولها.",
  },
  "workspaces.created": {
    en: "Workspace “{name}” created",
    ar: "تم إنشاء مساحة العمل «{name}»",
  },
  "workspaces.seedFailed": {
    en: "Default device types were not added: {error}",
    ar: "لم تتم إضافة أنواع الأجهزة الافتراضية: {error}",
  },
  "workspaces.routeTaken": {
    en: "This route is already used by another workspace.",
    ar: "هذا المسار مستخدم في مساحة عمل أخرى.",
  },
  "workspaces.namePlaceholder": {
    en: "Riyadh water network",
    ar: "شبكة مياه الرياض",
  },
  "workspaces.route": { en: "Route", ar: "المسار" },
  "workspaces.routeHint": {
    en: "Lowercase letters, digits and hyphens. Devices use it in message topics, for example",
    ar: "أحرف إنجليزية صغيرة وأرقام وشرطات. تستخدمه الأجهزة في مواضيع الرسائل، مثل",
  },
  "workspaces.routeFixed": {
    en: "The route cannot be changed after the workspace is created.",
    ar: "لا يمكن تغيير المسار بعد إنشاء مساحة العمل.",
  },
  "workspaces.routeLocked": {
    en: "The route cannot be changed.",
    ar: "لا يمكن تغيير المسار.",
  },
  "workspaces.edit": { en: "Edit workspace", ar: "تعديل مساحة العمل" },
  "workspaces.editHint": {
    en: "Change the name, tags and metadata of this workspace.",
    ar: "غيّر اسم مساحة العمل ووسومها وبياناتها الوصفية.",
  },
  "workspaces.updated": {
    en: "Workspace “{name}” updated",
    ar: "تم تحديث مساحة العمل «{name}»",
  },
  "workspaces.tags": { en: "Tags", ar: "الوسوم" },
  "workspaces.tagsPlaceholder": {
    en: "Type a tag and press Enter",
    ar: "اكتب وسمًا ثم اضغط Enter",
  },
  "workspaces.metadata": { en: "Metadata", ar: "البيانات الوصفية" },
  "workspaces.metadataHint": { en: "A JSON object.", ar: "كائن JSON." },
  "workspaces.deleted": {
    en: "Workspace “{name}” deleted",
    ar: "تم حذف مساحة العمل «{name}»",
  },
  "workspaces.deleteTitle": {
    en: "Delete workspace “{name}”?",
    ar: "حذف مساحة العمل «{name}»؟",
  },
  "workspaces.deleteHint": {
    en: "Members lose access and devices in {name} can no longer connect or send messages. A platform administrator can restore it until it is purged.",
    ar: "سيفقد الأعضاء صلاحية الوصول، ولن تتمكن الأجهزة في {name} من الاتصال أو إرسال الرسائل. يمكن لمسؤول المنصة استعادتها ما لم تُحذف نهائيًا.",
  },
  "workspaces.delete": { en: "Delete workspace", ar: "حذف مساحة العمل" },

  // ── Validation (the English must match lib/ejad exactly) ────────────────
  "valid.nameRequired": { en: "Name is required.", ar: "الاسم مطلوب." },
  "valid.routeRequired": { en: "Route is required.", ar: "المسار مطلوب." },
  "valid.routeChars": {
    en: "Use only lowercase letters, digits and hyphens.",
    ar: "استخدم أحرفًا إنجليزية صغيرة وأرقامًا وشرطات فقط.",
  },
  "valid.routeStart": {
    en: "Route must start with a letter or digit.",
    ar: "يجب أن يبدأ المسار بحرف أو رقم.",
  },
  "valid.routeEnd": {
    en: "Route must not end with a hyphen.",
    ar: "يجب ألا ينتهي المسار بشرطة.",
  },
  "valid.routeUuid": {
    en: "Route must not look like a UUID.",
    ar: "يجب ألا يشبه المسار معرّف UUID.",
  },
  "valid.tagsUnique": {
    en: "Tags must be unique.",
    ar: "يجب ألا تتكرر الوسوم.",
  },
  // ── Tables ──────────────────────────────────────────────────────────────
  "table.search": { en: "Search…", ar: "بحث…" },
  "table.filterBy": { en: "Filter by {label}", ar: "تصفية حسب {label}" },
  "table.noResults": { en: "No results.", ar: "لا توجد نتائج." },
  "table.rows": {
    en: { one: "{count} row", other: "{count} rows" },
    ar: {
      zero: "لا توجد صفوف",
      one: "صف واحد",
      two: "صفّان",
      few: "{count} صفوف",
      many: "{count} صفًا",
      other: "{count} صف",
    },
  },
  "table.rowsPerPage": { en: "Rows per page", ar: "عدد الصفوف في الصفحة" },
  "table.firstPage": { en: "First page", ar: "الصفحة الأولى" },
  "table.previousPage": { en: "Previous page", ar: "الصفحة السابقة" },
  "table.nextPage": { en: "Next page", ar: "الصفحة التالية" },
  "table.lastPage": { en: "Last page", ar: "الصفحة الأخيرة" },
  "table.sort": { en: "Sort", ar: "الترتيب" },
  "table.direction": { en: "Direction", ar: "الاتجاه" },
  "table.asc": { en: "Asc", ar: "تصاعدي" },
  "table.desc": { en: "Desc", ar: "تنازلي" },
  "table.view": { en: "View", ar: "عرض" },
  "table.toggleColumns": { en: "Toggle columns", ar: "إظهار/إخفاء الأعمدة" },
  "table.live": { en: "Live", ar: "الحالية" },
  "table.all": { en: "All", ar: "الكل" },
  "table.allOf": { en: "All {label}", ar: "{label}: الكل" },
  "table.deleted": { en: "Deleted", ar: "المحذوفة" },
  "common.open": { en: "Open", ar: "فتح" },

  // ── Devices ─────────────────────────────────────────────────────────────
  "devices.externalId": { en: "External ID", ar: "المعرّف الخارجي" },
  "devices.group": { en: "Group", ar: "المجموعة" },
  "devices.created": {
    en: "Device “{name}” created",
    ar: "تم إنشاء الجهاز «{name}»",
  },
  "devices.secretHint": {
    en: "The device authenticates with this secret, for example with the HTTP header “Authorization: Client <secret>”.",
    ar: "يستخدم الجهاز هذا المفتاح السري للمصادقة، مثلًا عبر ترويسة HTTP ‏«Authorization: Client <secret>».",
  },
  "devices.loadFailed": {
    en: "Could not load devices",
    ar: "تعذّر تحميل الأجهزة",
  },
  "devices.search": {
    en: "Search by name, tag or external ID…",
    ar: "ابحث بالاسم أو الوسم أو المعرّف الخارجي…",
  },
  "devices.noMatches": {
    en: "No devices match your search.",
    ar: "لا توجد أجهزة مطابقة لبحثك.",
  },
  "devices.emptyTitle": { en: "No devices yet", ar: "لا توجد أجهزة بعد" },
  "devices.emptyHint": {
    en: "A device is a sensor, gateway or machine that sends and receives messages. Add one, or upload a CSV file to add many at once.",
    ar: "الجهاز هو حساس أو بوابة أو آلة ترسل الرسائل وتستقبلها. أضف جهازًا، أو ارفع ملف CSV لإضافة عدة أجهزة دفعة واحدة.",
  },
  "devices.emptyHintReadOnly": {
    en: "A device is a sensor, gateway or machine that sends and receives messages. Ask a workspace admin to add one.",
    ar: "الجهاز هو حساس أو بوابة أو آلة ترسل الرسائل وتستقبلها. اطلب من مسؤول مساحة العمل إضافة جهاز.",
  },
  "devices.keyFailed": {
    en: "The device was created but its secret was not: {error}. Add one from the Credentials tab.",
    ar: "تم إنشاء الجهاز لكن لم يتم إنشاء مفتاحه السري: {error}. أضف مفتاحًا من تبويب بيانات الاعتماد.",
  },
  "devices.externalIdTaken": {
    en: "Another device in this workspace already uses this ID.",
    ar: "يوجد جهاز آخر في مساحة العمل هذه يستخدم هذا المعرّف.",
  },
  "devices.create": { en: "Create device", ar: "إنشاء جهاز" },
  "devices.createHint": {
    en: "A secret is generated for the device. You will see it once, right after the device is created.",
    ar: "سيتم توليد مفتاح سري للجهاز، وسيظهر لك مرة واحدة فقط بعد إنشاء الجهاز مباشرة.",
  },
  "devices.externalIdPlaceholder": {
    en: "Serial number or MAC address",
    ar: "الرقم التسلسلي أو عنوان MAC",
  },
  "devices.externalIdHint": {
    en: "Optional. Must be unique in this workspace.",
    ar: "اختياري. يجب ألا يتكرر داخل مساحة العمل.",
  },
  "devices.copySecret": { en: "Copy secret", ar: "نسخ المفتاح السري" },
  "devices.onceTitle": {
    en: "This secret is shown only once",
    ar: "يظهر هذا المفتاح السري مرة واحدة فقط",
  },
  "devices.onceHint": {
    en: "Copy it now and store it safely. After you close this dialog it is not displayed again here.",
    ar: "انسخه الآن واحفظه في مكان آمن، فلن يظهر هنا مرة أخرى بعد إغلاق هذه النافذة.",
  },
  "devices.copiedSecret": {
    en: "I have copied the secret",
    ar: "نسخت المفتاح السري",
  },
  "devices.enabled": {
    en: "Device “{name}” enabled",
    ar: "تم تفعيل الجهاز «{name}»",
  },
  "devices.disabled": {
    en: "Device “{name}” disabled",
    ar: "تم تعطيل الجهاز «{name}»",
  },
  "devices.enableTitle": {
    en: "Enable device “{name}”?",
    ar: "تفعيل الجهاز «{name}»؟",
  },
  "devices.disableTitle": {
    en: "Disable device “{name}”?",
    ar: "تعطيل الجهاز «{name}»؟",
  },
  "devices.enableHint": {
    en: "The device can authenticate with its secret and send messages again.",
    ar: "سيتمكن الجهاز من المصادقة بمفتاحه السري وإرسال الرسائل مجددًا.",
  },
  "devices.disableHint": {
    en: "The device can no longer authenticate or send messages until it is enabled again. Its secrets are kept.",
    ar: "لن يتمكن الجهاز من المصادقة أو إرسال الرسائل حتى يُعاد تفعيله. ستبقى مفاتيحه السرية محفوظة.",
  },
  "devices.enabling": { en: "Enabling…", ar: "جارٍ التفعيل…" },
  "devices.disabling": { en: "Disabling…", ar: "جارٍ التعطيل…" },
  "devices.enable": { en: "Enable device", ar: "تفعيل الجهاز" },
  "devices.disable": { en: "Disable device", ar: "تعطيل الجهاز" },
  "devices.deleted": {
    en: "Device “{name}” deleted",
    ar: "تم حذف الجهاز «{name}»",
  },
  "devices.deleteTitle": {
    en: "Delete device “{name}”?",
    ar: "حذف الجهاز «{name}»؟",
  },
  "devices.deleteHint": {
    en: "The device and its secrets stop working immediately and it is removed from this workspace. A platform administrator can restore it until it is purged.",
    ar: "سيتوقف الجهاز ومفاتيحه السرية عن العمل فورًا وتتم إزالته من مساحة العمل. يمكن لمسؤول المنصة استعادته ما لم يُحذف نهائيًا.",
  },
  "devices.delete": { en: "Delete device", ar: "حذف الجهاز" },
  "devices.back": { en: "Back to devices", ar: "العودة إلى الأجهزة" },
  "devices.id": { en: "Device ID", ar: "معرّف الجهاز" },
  "devices.copyId": { en: "Copy device ID", ar: "نسخ معرّف الجهاز" },
  "tabs.overview": { en: "Overview", ar: "نظرة عامة" },
  "tabs.credentials": { en: "Credentials", ar: "بيانات الاعتماد" },
  "tabs.connections": { en: "Connections", ar: "الاتصالات" },
  "tabs.audit": { en: "Audit", ar: "سجل التدقيق" },
  "tabs.messages": { en: "Messages", ar: "الرسائل" },
  "detail.details": { en: "Details", ar: "التفاصيل" },
  "detail.noMetadata": { en: "No metadata.", ar: "لا توجد بيانات وصفية." },
  "common.working": { en: "Working…", ar: "جارٍ التنفيذ…" },

  // ── Device credentials ──────────────────────────────────────────────────
  "credentials.kind.sharedKey": {
    en: "Secret (shared key)",
    ar: "مفتاح سري (مشترك)",
  },
  "credentials.kind.accessToken": { en: "Access token", ar: "رمز وصول" },
  "credentials.kind.certificate": { en: "Certificate", ar: "شهادة" },
  "credentials.newHint": {
    en: "New secret for “{name}”. The device authenticates with it, for example with the HTTP header “Authorization: Client <secret>”.",
    ar: "مفتاح سري جديد للجهاز «{name}». يستخدمه الجهاز للمصادقة، مثلًا عبر ترويسة HTTP ‏«Authorization: Client <secret>».",
  },
  "credentials.created": { en: "Secret created", ar: "تم إنشاء المفتاح السري" },
  "credentials.revealTitle": {
    en: "Device secret",
    ar: "المفتاح السري للجهاز",
  },
  "credentials.revealHint": {
    en: "Secret {id} of “{name}”. Revealing a secret is recorded in the audit log.",
    ar: "المفتاح السري {id} للجهاز «{name}». يُسجَّل كشف المفتاح السري في سجل التدقيق.",
  },
  "credentials.revoked": { en: "Secret revoked", ar: "تم إلغاء المفتاح السري" },
  "credentials.revokeFailed": {
    en: "A new secret was created, but the old one was not revoked: {error}",
    ar: "تم إنشاء مفتاح سري جديد، لكن لم يتم إلغاء المفتاح القديم: {error}",
  },
  "credentials.rotated": { en: "Secret rotated", ar: "تم تدوير المفتاح السري" },
  "credentials.none": {
    en: "This device has no active secret and cannot authenticate.",
    ar: "لا يوجد مفتاح سري فعّال لهذا الجهاز، لذا لا يمكنه المصادقة.",
  },
  "credentials.active": {
    en: { one: "{count} active secret.", other: "{count} active secrets." },
    ar: {
      one: "مفتاح سري فعّال واحد.",
      two: "مفتاحان سريان فعّالان.",
      few: "{count} مفاتيح سرية فعّالة.",
      many: "{count} مفتاحًا سريًا فعّالًا.",
      other: "{count} مفتاح سري فعّال.",
    },
  },
  "credentials.create": { en: "Create secret", ar: "إنشاء مفتاح سري" },
  "credentials.loadFailed": {
    en: "Could not load secrets",
    ar: "تعذّر تحميل المفاتيح السرية",
  },
  "credentials.credential": { en: "Credential", ar: "بيانات الاعتماد" },
  "credentials.expires": { en: "Expires", ar: "تاريخ الانتهاء" },
  "credentials.empty": { en: "No credentials.", ar: "لا توجد بيانات اعتماد." },
  "credentials.reveal": { en: "Reveal", ar: "كشف" },
  "credentials.rotate": { en: "Rotate", ar: "تدوير" },
  "credentials.revoke": { en: "Revoke", ar: "إلغاء" },
  "credentials.rotateTitle": {
    en: "Rotate this secret?",
    ar: "تدوير هذا المفتاح السري؟",
  },
  "credentials.revokeTitle": {
    en: "Revoke this secret?",
    ar: "إلغاء هذا المفتاح السري؟",
  },
  "credentials.rotateHint": {
    en: "A new secret is created and the current one is revoked. The device must be updated with the new secret to keep connecting.",
    ar: "سيتم إنشاء مفتاح سري جديد وإلغاء المفتاح الحالي. يجب تحديث الجهاز بالمفتاح الجديد ليستمر في الاتصال.",
  },
  "credentials.revokeHint": {
    en: "The device can no longer authenticate with this secret. This cannot be undone.",
    ar: "لن يتمكن الجهاز من المصادقة بهذا المفتاح السري. لا يمكن التراجع عن هذا الإجراء.",
  },
  "credentials.onlyActive": {
    en: "It is the device's only active secret.",
    ar: "هذا هو المفتاح السري الفعّال الوحيد للجهاز.",
  },
  "credentials.rotateAction": {
    en: "Rotate secret",
    ar: "تدوير المفتاح السري",
  },
  "credentials.revokeAction": {
    en: "Revoke secret",
    ar: "إلغاء المفتاح السري",
  },
  // ── Bulk device upload ──────────────────────────────────────────────────
  "bulk.keyFailed": {
    en: "Secret not created: {error}",
    ar: "لم يتم إنشاء المفتاح السري: {error}",
  },
  "bulk.closeConfirm": {
    en: "The generated secrets are shown only once and you have not downloaded them. Close anyway?",
    ar: "تظهر المفاتيح السرية المولّدة مرة واحدة فقط ولم تقم بتنزيلها. هل تريد الإغلاق رغم ذلك؟",
  },
  "bulk.button": { en: "Bulk upload", ar: "رفع مجمّع" },
  "bulk.title": { en: "Bulk upload devices", ar: "رفع الأجهزة دفعة واحدة" },
  "bulk.headers": {
    en: "Upload a CSV file with the headers",
    ar: "ارفع ملف CSV بالأعمدة",
  },
  "bulk.hint": {
    en: "Leave Secret blank to generate one. Separate tags with commas or semicolons; Metadata is a JSON object.",
    ar: "اترك عمود Secret فارغًا لتوليد مفتاح تلقائيًا. افصل بين الوسوم بفاصلة أو فاصلة منقوطة، وعمود Metadata كائن JSON.",
  },
  "bulk.choose": { en: "Choose a CSV file", ar: "اختر ملف CSV" },
  "bulk.limit": {
    en: "Up to {count} devices per file.",
    ar: "حتى {count} جهاز في الملف الواحد.",
  },
  "bulk.readFailed": { en: "Could not read the file", ar: "تعذّرت قراءة الملف" },
  "bulk.template": { en: "Download a template", ar: "تنزيل نموذج" },
  "bulk.progress": {
    en: "Creating devices… {done} of {total}",
    ar: "جارٍ إنشاء الأجهزة… {done} من {total}",
  },
  "bulk.keepOpen": {
    en: "Keep this dialog open until it finishes.",
    ar: "أبقِ هذه النافذة مفتوحة حتى تنتهي العملية.",
  },
  "bulk.ready": {
    en: "{count} ready to create",
    ar: {
      one: "صف واحد جاهز للإنشاء",
      two: "صفّان جاهزان للإنشاء",
      few: "{count} صفوف جاهزة للإنشاء",
      other: "{count} صفًا جاهزًا للإنشاء",
      zero: "لا توجد صفوف جاهزة",
    },
  },
  "bulk.withErrors": {
    en: "{count} with errors",
    ar: {
      one: "صف واحد به أخطاء",
      two: "صفّان بهما أخطاء",
      few: "{count} صفوف بها أخطاء",
      other: "{count} صفًا بها أخطاء",
    },
  },
  "bulk.line": { en: "Line", ar: "السطر" },
  "bulk.secret": { en: "Secret", ar: "المفتاح السري" },
  "bulk.check": { en: "Check", ar: "التحقق" },
  "bulk.provided": { en: "Provided", ar: "مُدخل" },
  "bulk.generate": { en: "Generate", ar: "توليد تلقائي" },
  "bulk.ok": { en: "OK", ar: "سليم" },
  "bulk.skipped": {
    en: "Rows with errors are skipped.",
    ar: "سيتم تخطي الصفوف التي بها أخطاء.",
  },
  "bulk.another": { en: "Choose another file", ar: "اختيار ملف آخر" },
  "bulk.createN": {
    en: { one: "Create {count} device", other: "Create {count} devices" },
    ar: {
      zero: "إنشاء الأجهزة",
      one: "إنشاء جهاز واحد",
      two: "إنشاء جهازين",
      few: "إنشاء {count} أجهزة",
      many: "إنشاء {count} جهازًا",
      other: "إنشاء {count} جهاز",
    },
  },
  "bulk.createdN": {
    en: { one: "{count} device created", other: "{count} devices created" },
    ar: {
      zero: "لم يتم إنشاء أي جهاز",
      one: "تم إنشاء جهاز واحد",
      two: "تم إنشاء جهازين",
      few: "تم إنشاء {count} أجهزة",
      many: "تم إنشاء {count} جهازًا",
      other: "تم إنشاء {count} جهاز",
    },
  },
  "bulk.failedN": { en: "{count} failed", ar: "فشل {count}" },
  "bulk.onceTitle": {
    en: "The secrets are shown only once",
    ar: "تظهر المفاتيح السرية مرة واحدة فقط",
  },
  "bulk.onceHint": {
    en: "Download the result file now and store it safely. It contains every device secret in plain text.",
    ar: "نزّل ملف النتائج الآن واحفظه في مكان آمن، فهو يحتوي على جميع المفاتيح السرية للأجهزة كنص غير مشفّر.",
  },
  "bulk.result": { en: "Result", ar: "النتيجة" },
  "bulk.createdOne": { en: "Created", ar: "تم الإنشاء" },
  "bulk.copyFor": {
    en: "Copy secret for {name}",
    ar: "نسخ المفتاح السري لـ {name}",
  },
  "bulk.download": { en: "Download results (CSV)", ar: "تنزيل النتائج (CSV)" },
  "common.comma": { en: ", ", ar: "، " },
  // ── Channels ────────────────────────────────────────────────────────────
  "channels.loadFailed": {
    en: "Could not load channels",
    ar: "تعذّر تحميل القنوات",
  },
  "channels.search": {
    en: "Search by name, route or tag…",
    ar: "ابحث بالاسم أو المسار أو الوسم…",
  },
  "channels.noMatches": {
    en: "No channels match your search.",
    ar: "لا توجد قنوات مطابقة لبحثك.",
  },
  "channels.emptyTitle": { en: "No channels yet", ar: "لا توجد قنوات بعد" },
  "channels.emptyHint": {
    en: "A channel is a topic that devices publish messages to and subscribe to. Create one, then connect devices to it.",
    ar: "القناة موضوع تنشر الأجهزة رسائلها إليه وتشترك فيه. أنشئ قناة ثم اربط الأجهزة بها.",
  },
  "channels.emptyHintReadOnly": {
    en: "A channel is a topic that devices publish messages to and subscribe to. Ask a workspace admin to create one.",
    ar: "القناة موضوع تنشر الأجهزة رسائلها إليه وتشترك فيه. اطلب من مسؤول مساحة العمل إنشاء قناة.",
  },
  "valid.channelRouteStart": {
    en: "Route must start with a letter.",
    ar: "يجب أن يبدأ المسار بحرف.",
  },
  "valid.channelRouteChars": {
    en: "Use only letters, digits, hyphens and underscores.",
    ar: "استخدم الأحرف الإنجليزية والأرقام والشرطات والشرطات السفلية فقط.",
  },
  "valid.channelRouteDouble": {
    en: "Route must not contain “__” or “--”.",
    ar: "يجب ألا يحتوي المسار على «__» أو «--».",
  },
  "valid.channelNameIsRoute": {
    en: "Another channel is named exactly like this route, so messages could reach the wrong channel.",
    ar: "توجد قناة أخرى اسمها مطابق لهذا المسار، وقد تصل الرسائل إلى القناة الخطأ.",
  },
  "channels.created": {
    en: "Channel “{name}” created",
    ar: "تم إنشاء القناة «{name}»",
  },
  "channels.create": { en: "Create channel", ar: "إنشاء قناة" },
  "channels.createHint": {
    en: "Devices publish and subscribe to a channel by its route.",
    ar: "تنشر الأجهزة إلى القناة وتشترك فيها عبر مسارها.",
  },
  "channels.namePlaceholder": {
    en: "Floor 1 temperature",
    ar: "حرارة الطابق الأول",
  },
  "channels.routeHint": {
    en: "Cannot be changed later. Letters, digits, “-” and “_”, starting with a letter.",
    ar: "لا يمكن تغييره لاحقًا. أحرف إنجليزية وأرقام و«-» و«_»، ويبدأ بحرف.",
  },
  "channels.topic": { en: "Topic:", ar: "الموضوع:" },
  "channels.deleted": {
    en: "Channel “{name}” deleted",
    ar: "تم حذف القناة «{name}»",
  },
  "channels.deleteTitle": {
    en: "Delete channel “{name}”?",
    ar: "حذف القناة «{name}»؟",
  },
  "channels.deleteHint": {
    en: "Devices can no longer publish or subscribe to this channel and it is removed from this workspace. A platform administrator can restore it until it is purged.",
    ar: "لن تتمكن الأجهزة من النشر إلى هذه القناة أو الاشتراك فيها، وستتم إزالتها من مساحة العمل. يمكن لمسؤول المنصة استعادتها ما لم تُحذف نهائيًا.",
  },
  "channels.deleteHintRoute": {
    en: "Devices can no longer publish or subscribe to this channel (route “{route}”) and it is removed from this workspace. A platform administrator can restore it until it is purged.",
    ar: "لن تتمكن الأجهزة من النشر إلى هذه القناة (المسار «{route}») أو الاشتراك فيها، وستتم إزالتها من مساحة العمل. يمكن لمسؤول المنصة استعادتها ما لم تُحذف نهائيًا.",
  },
  "channels.delete": { en: "Delete channel", ar: "حذف القناة" },
  "channels.back": { en: "Back to channels", ar: "العودة إلى القنوات" },
  "channels.id": { en: "Channel ID", ar: "معرّف القناة" },
  "channels.copyId": { en: "Copy channel ID", ar: "نسخ معرّف القناة" },
  "channels.copyRoute": { en: "Copy route", ar: "نسخ المسار" },
  "channels.mqttTopic": { en: "MQTT topic", ar: "موضوع MQTT" },
  "channels.copyTopic": { en: "Copy MQTT topic", ar: "نسخ موضوع MQTT" },
  "channels.httpPath": { en: "HTTP path", ar: "مسار HTTP" },
  "channels.copyHttpPath": {
    en: "Copy HTTP publish path",
    ar: "نسخ مسار النشر عبر HTTP",
  },
  "common.removeName": { en: "Remove {name}", ar: "إزالة {name}" },
  "common.loadMore": { en: "Load more", ar: "تحميل المزيد" },
  "combo.select": { en: "Select…", ar: "اختر…" },

  // ── Connections ─────────────────────────────────────────────────────────
  "connections.added": {
    en: { one: "{count} connection added", other: "{count} connections added" },
    ar: {
      one: "تمت إضافة اتصال واحد",
      two: "تمت إضافة اتصالين",
      few: "تمت إضافة {count} اتصالات",
      many: "تمت إضافة {count} اتصالًا",
      other: "تمت إضافة {count} اتصال",
    },
  },
  "connections.removed": {
    en: {
      one: "{count} connection removed",
      other: "{count} connections removed",
    },
    ar: {
      one: "تمت إزالة اتصال واحد",
      two: "تمت إزالة اتصالين",
      few: "تمت إزالة {count} اتصالات",
      many: "تمت إزالة {count} اتصالًا",
      other: "تمت إزالة {count} اتصال",
    },
  },
  "connections.existed": {
    en: "{count} already existed",
    ar: "{count} موجود مسبقًا",
  },
  "connections.notConnected": {
    en: "{count} were not connected",
    ar: "{count} غير متصل أصلًا",
  },
  "connections.failed": {
    en: "{count} failed: {error}",
    ar: "فشل {count}: {error}",
  },
  "connections.nothing": {
    en: "Nothing to change",
    ar: "لا يوجد ما يتطلب التغيير",
  },
  "connections.publish": { en: "Publish", ar: "نشر" },
  "connections.publishHint": {
    en: "The device can send messages.",
    ar: "يمكن للجهاز إرسال الرسائل.",
  },
  "connections.subscribe": { en: "Subscribe", ar: "اشتراك" },
  "connections.subscribeHint": {
    en: "The device can receive messages.",
    ar: "يمكن للجهاز استقبال الرسائل.",
  },
  "connections.connectedChannels": {
    en: "Connected channels",
    ar: "القنوات المتصلة",
  },
  "connections.connectedDevices": {
    en: "Connected devices",
    ar: "الأجهزة المتصلة",
  },
  "connections.connectToChannel": {
    en: "Connect to channel",
    ar: "الربط بقناة",
  },
  "connections.connectDevices": { en: "Connect devices", ar: "ربط الأجهزة" },
  "connections.loadFailed": {
    en: "Could not load connections",
    ar: "تعذّر تحميل الاتصالات",
  },
  "connections.emptyDevice": {
    en: "This device is not connected to any channel yet. Connect it so it can publish or subscribe to messages.",
    ar: "هذا الجهاز غير مربوط بأي قناة بعد. اربطه بقناة ليتمكن من نشر الرسائل أو الاشتراك فيها.",
  },
  "connections.emptyChannel": {
    en: "No devices are connected to this channel yet. Connect devices so they can publish or subscribe to its messages.",
    ar: "لا توجد أجهزة مربوطة بهذه القناة بعد. اربط الأجهزة لتتمكن من نشر رسائلها أو الاشتراك فيها.",
  },
  "connections.permissions": { en: "Permissions", ar: "الصلاحيات" },
  "connections.deletedChannel": { en: "deleted channel", ar: "قناة محذوفة" },
  "connections.deletedDevice": { en: "deleted device", ar: "جهاز محذوف" },
  "connections.disconnect": { en: "Disconnect", ar: "فصل" },
  "connections.disconnecting": { en: "Disconnecting…", ar: "جارٍ الفصل…" },
  "connections.disconnectTitle": {
    en: "Disconnect “{name}”?",
    ar: "فصل «{name}»؟",
  },
  "connections.disconnectHint": {
    en: "Choose what device “{device}” should no longer be allowed to do on channel “{channel}”. This takes effect immediately.",
    ar: "اختر ما لن يُسمح للجهاز «{device}» بفعله على القناة «{channel}». يسري ذلك فورًا.",
  },
  "connections.deviceHint": {
    en: "Allow device “{name}” to publish and/or subscribe to a channel in this workspace.",
    ar: "اسمح للجهاز «{name}» بالنشر إلى قناة في مساحة العمل هذه و/أو الاشتراك فيها.",
  },
  "connections.selectChannel": { en: "Select a channel", ar: "اختر قناة" },
  "connections.searchChannels": {
    en: "Search channels…",
    ar: "ابحث في القنوات…",
  },
  "connections.noChannels": {
    en: "No channels found.",
    ar: "لم يتم العثور على قنوات.",
  },
  "connections.connecting": { en: "Connecting…", ar: "جارٍ الربط…" },
  "connections.connect": { en: "Connect", ar: "ربط" },
  "connections.maxDevices": {
    en: "Pick at most {count} devices at a time.",
    ar: "يمكنك اختيار {count} جهاز كحد أقصى في المرة الواحدة.",
  },
  "connections.channelHint": {
    en: "Allow devices to publish and/or subscribe to channel “{name}”.",
    ar: "اسمح للأجهزة بالنشر إلى القناة «{name}» و/أو الاشتراك فيها.",
  },
  "connections.searchDevices": {
    en: "Search devices…",
    ar: "ابحث في الأجهزة…",
  },
  "connections.loadingDevices": {
    en: "Loading devices…",
    ar: "جارٍ تحميل الأجهزة…",
  },
  "connections.noDevices": {
    en: "No devices found.",
    ar: "لم يتم العثور على أجهزة.",
  },
  "connections.badgesHint": {
    en: "Badges show what a device can already do here; existing permissions are kept.",
    ar: "توضّح الشارات ما يستطيع الجهاز فعله هنا حاليًا، وتبقى الصلاحيات الحالية كما هي.",
  },
  "connections.connectN": {
    en: { one: "Connect {count} device", other: "Connect {count} devices" },
    ar: {
      one: "ربط جهاز واحد",
      two: "ربط جهازين",
      few: "ربط {count} أجهزة",
      many: "ربط {count} جهازًا",
      other: "ربط {count} جهاز",
    },
  },
  "valid.pickDevices": {
    en: "Pick at least one device.",
    ar: "اختر جهازًا واحدًا على الأقل.",
  },
  "valid.pickChannels": {
    en: "Pick at least one channel.",
    ar: "اختر قناة واحدة على الأقل.",
  },
  "valid.pickTypes": {
    en: "Pick Publish, Subscribe or both.",
    ar: "اختر النشر أو الاشتراك أو كليهما.",
  },
  "valid.connectShape": {
    en: "Connect many devices to one channel, or one device to many channels.",
    ar: "اربط عدة أجهزة بقناة واحدة، أو جهازًا واحدًا بعدة قنوات.",
  },
  // ── Messages ────────────────────────────────────────────────────────────
  "messages.pickChannel": { en: "Pick a channel", ar: "اختر قناة" },
  "messages.pickChannelHint": {
    en: "Choose a channel above to see the messages devices published on it. Messages are kept only for channels with “Store messages” turned on.",
    ar: "اختر قناة من الأعلى لعرض الرسائل التي نشرتها الأجهزة عليها. تُحفظ الرسائل فقط في القنوات التي فُعّل فيها «تخزين الرسائل».",
  },
  "messages.goToChannels": { en: "Go to channels", ar: "الانتقال إلى القنوات" },
  "store.on": {
    en: "Messages on this channel are now stored.",
    ar: "سيتم الآن تخزين رسائل هذه القناة.",
  },
  "store.off": {
    en: "Messages on this channel are no longer stored.",
    ar: "لن يتم تخزين رسائل هذه القناة بعد الآن.",
  },
  "store.label": { en: "Store messages", ar: "تخزين الرسائل" },
  "store.loadFailed": {
    en: "Could not load the setting.",
    ar: "تعذّر تحميل الإعداد.",
  },
  "store.hint": {
    en: "Save messages published to this channel so they appear below.",
    ar: "احفظ الرسائل المنشورة على هذه القناة لتظهر في الأسفل.",
  },
  "store.hintReadOnly": {
    en: "Whether messages published to this channel are saved. Only workspace Admins and Operators can change this.",
    ar: "يحدد ما إذا كانت الرسائل المنشورة على هذه القناة تُحفظ. يمكن لمسؤولي ومشغّلي مساحة العمل فقط تغيير ذلك.",
  },
  "messages.csvTruncated": {
    en: "Downloaded the newest {count} of {total} messages (limit {limit}). Narrow the time range for the rest.",
    ar: "تم تنزيل أحدث {count} من أصل {total} رسالة (الحد الأقصى {limit}). ضيّق النطاق الزمني لتنزيل البقية.",
  },
  "messages.csvDone": {
    en: {
      one: "Downloaded {count} message.",
      other: "Downloaded {count} messages.",
    },
    ar: {
      zero: "لا توجد رسائل للتنزيل.",
      one: "تم تنزيل رسالة واحدة.",
      two: "تم تنزيل رسالتين.",
      few: "تم تنزيل {count} رسائل.",
      many: "تم تنزيل {count} رسالة.",
      other: "تم تنزيل {count} رسالة.",
    },
  },
  "messages.csvFailed": {
    en: "Could not download messages",
    ar: "تعذّر تنزيل الرسائل",
  },
  "messages.live": {
    en: "Live, refreshing every 5 s",
    ar: "مباشر، يتحدّث كل ٥ ثوانٍ",
  },
  "messages.paused": { en: "Paused", ar: "متوقف مؤقتًا" },
  "messages.updatedAt": { en: "updated {time}", ar: "آخر تحديث {time}" },
  "messages.pause": { en: "Pause", ar: "إيقاف مؤقت" },
  "messages.resume": { en: "Resume", ar: "استئناف" },
  "messages.preparing": { en: "Preparing…", ar: "جارٍ التجهيز…" },
  "messages.downloadCsv": { en: "Download CSV", ar: "تنزيل CSV" },
  "messages.namePlaceholder": { en: "e.g. temperature", ar: "مثل temperature" },
  "messages.publisher": { en: "Publisher", ar: "الناشر" },
  "messages.anyDevice": { en: "Any device", ar: "أي جهاز" },
  "messages.protocol": { en: "Protocol", ar: "البروتوكول" },
  "messages.anyProtocol": { en: "Any protocol", ar: "أي بروتوكول" },
  "messages.value": { en: "Value", ar: "القيمة" },
  "messages.comparator": { en: "Value comparator", ar: "معامل المقارنة" },
  "messages.number": { en: "number", ar: "رقم" },
  "messages.from": { en: "From", ar: "من" },
  "messages.to": { en: "To", ar: "إلى" },
  "messages.anyTime": { en: "Any time", ar: "أي وقت" },
  "messages.now": { en: "Now", ar: "الآن" },
  "messages.aggregation": { en: "Aggregation", ar: "التجميع" },
  "messages.interval": { en: "Interval", ar: "الفترة" },
  "messages.aggregationNeeds": {
    en: "Aggregation needs both a From and a To time.",
    ar: "يتطلب التجميع تحديد وقت البداية «من» ووقت النهاية «إلى».",
  },
  "messages.apply": { en: "Apply filters", ar: "تطبيق عوامل التصفية" },
  "messages.reset": { en: "Reset", ar: "إعادة تعيين" },
  "messages.per": {
    en: "{aggregation} per {interval}",
    ar: "{aggregation} لكل {interval}",
  },
  "messages.loadFailed": {
    en: "Could not load messages",
    ar: "تعذّر تحميل الرسائل",
  },
  "messages.intervalStart": { en: "Interval start", ar: "بداية الفترة" },
  "messages.time": { en: "Time", ar: "الوقت" },
  "messages.unit": { en: "Unit", ar: "الوحدة" },
  "messages.loading": { en: "Loading messages…", ar: "جارٍ تحميل الرسائل…" },
  "messages.none": { en: "No messages", ar: "لا توجد رسائل" },
  "messages.refreshing": { en: "refreshing", ar: "جارٍ التحديث" },
  "messages.noMatches": {
    en: "No messages match these filters.",
    ar: "لا توجد رسائل مطابقة لعوامل التصفية.",
  },
  "messages.emptyHint": {
    en: "No messages stored yet. Messages are saved only when a rule in the rules engine routes this channel to a “Save SenML” output.",
    ar: "لا توجد رسائل مخزّنة بعد. تُحفظ الرسائل فقط عندما توجّه قاعدة في محرك القواعد هذه القناة إلى مخرج «Save SenML».",
  },
  "messages.unknownDevice": { en: "Unknown device", ar: "جهاز غير معروف" },
  "valid.aggNeedsTimes": {
    en: "Aggregation needs both a start and an end time.",
    ar: "يتطلب التجميع وقت بداية ووقت نهاية.",
  },
  "valid.aggNeedsFromTo": {
    en: "Aggregation needs both from and to.",
    ar: "يتطلب التجميع تحديد «من» و«إلى».",
  },
  "valid.measurementName": {
    en: "Enter a measurement name.",
    ar: "أدخل اسم القياس.",
  },
  "valid.comparator": {
    en: "Pick a comparator for the value filter.",
    ar: "اختر معامل مقارنة لتصفية القيمة.",
  },
  "send.title": { en: "Send message", ar: "إرسال رسالة" },
  "send.sent": {
    en: "Message sent. It shows up once the rules engine saves it.",
    ar: "تم إرسال الرسالة، وستظهر بعد أن يحفظها محرك القواعد.",
  },
  "send.sentTo": {
    en: "Message sent to {topic}. It shows up once the rules engine saves it.",
    ar: "تم إرسال الرسالة إلى {topic}، وستظهر بعد أن يحفظها محرك القواعد.",
  },
  "send.hint": {
    en: "Publish a SenML record to “{name}” over HTTP as one of its connected devices.",
    ar: "انشر سجل SenML إلى «{name}» عبر HTTP باسم أحد الأجهزة المربوطة بها.",
  },
  "send.noPublishers": {
    en: "No device may publish to this channel. Connect a device with the publish permission on the Connections tab first.",
    ar: "لا يوجد جهاز مسموح له بالنشر إلى هذه القناة. اربط جهازًا بصلاحية النشر من تبويب الاتصالات أولًا.",
  },
  "send.selectDevice": { en: "Select a device", ar: "اختر جهازًا" },
  "send.typesHint": {
    en: "A number is sent as a numeric value, true/false as a boolean and anything else as text.",
    ar: "يُرسل الرقم كقيمة رقمية، وtrue/false كقيمة منطقية، وأي شيء آخر كنص.",
  },
  "send.sending": { en: "Sending…", ar: "جارٍ الإرسال…" },
  "send.send": { en: "Send", ar: "إرسال" },
  "valid.publisherId": {
    en: "Publisher must be a device ID.",
    ar: "يجب أن يكون الناشر معرّف جهاز.",
  },
  "valid.valueNumber": {
    en: "The value filter needs a number.",
    ar: "تتطلب تصفية القيمة رقمًا.",
  },
  "valid.startTime": {
    en: "The start time is not valid.",
    ar: "وقت البداية غير صحيح.",
  },
  "valid.endTime": {
    en: "The end time is not valid.",
    ar: "وقت النهاية غير صحيح.",
  },
  "valid.startBeforeEnd": {
    en: "The start time must be before the end time.",
    ar: "يجب أن يكون وقت البداية قبل وقت النهاية.",
  },
  "valid.interval": {
    en: "Pick an aggregation interval.",
    ar: "اختر فترة التجميع.",
  },
  "commands.mqttPub": { en: "Publish over MQTT", ar: "النشر عبر MQTT" },
  "commands.mqttSub": { en: "Subscribe over MQTT", ar: "الاشتراك عبر MQTT" },
  "commands.httpPub": { en: "Publish over HTTP", ar: "النشر عبر HTTP" },
  "commands.title": { en: "Device commands", ar: "أوامر الجهاز" },
  "commands.none": {
    en: "Connect a device to this channel to get commands for it.",
    ar: "اربط جهازًا بهذه القناة للحصول على الأوامر الخاصة به.",
  },
  "commands.hide": { en: "Hide secret", ar: "إخفاء المفتاح السري" },
  "commands.revealing": { en: "Revealing…", ar: "جارٍ الكشف…" },
  "commands.reveal": { en: "Reveal secret", ar: "كشف المفتاح السري" },
  "commands.topic": { en: "Topic", ar: "الموضوع" },
  "commands.includesSecret": {
    en: "The commands include the device secret; treat them as a password.",
    ar: "تتضمن الأوامر المفتاح السري للجهاز، لذا تعامل معها ككلمة مرور.",
  },
  "commands.placeholder": {
    en: "The secret is shown as {placeholder} until you reveal it. Revealing is recorded in the audit log.",
    ar: "يظهر المفتاح السري بصيغة {placeholder} حتى تكشفه. يُسجَّل الكشف في سجل التدقيق.",
  },
  "commands.placeholderReadOnly": {
    en: "The secret is shown as {placeholder}; only workspace Admins and Operators can reveal device secrets.",
    ar: "يظهر المفتاح السري بصيغة {placeholder}، ويمكن لمسؤولي ومشغّلي مساحة العمل فقط كشف المفاتيح السرية للأجهزة.",
  },
  "commands.notConnected": {
    en: "this device is not connected for this",
    ar: "الجهاز غير مربوط لهذا الغرض",
  },
  "commands.copy": { en: "Copy command: {title}", ar: "نسخ الأمر: {title}" },
  // ── Groups ──────────────────────────────────────────────────────────────
  "groups.create": { en: "Create group", ar: "إنشاء مجموعة" },
  "groups.loadFailed": {
    en: "Could not load groups",
    ar: "تعذّر تحميل المجموعات",
  },
  "groups.search": { en: "Search groups…", ar: "ابحث في المجموعات…" },
  "groups.expandAll": { en: "Expand all", ar: "توسيع الكل" },
  "groups.collapseAll": { en: "Collapse all", ar: "طي الكل" },
  "groups.noMatches": {
    en: "No groups match your search.",
    ar: "لا توجد مجموعات مطابقة لبحثك.",
  },
  "groups.emptyTitle": { en: "No groups yet", ar: "لا توجد مجموعات بعد" },
  "groups.emptyHint": {
    en: "Groups let you organize devices and channels, and filter lists by site or area. Create a top-level group to start.",
    ar: "تتيح لك المجموعات تنظيم الأجهزة والقنوات وتصفية القوائم حسب الموقع أو المنطقة. أنشئ مجموعة رئيسية للبدء.",
  },
  "groups.emptyHintReadOnly": {
    en: "Groups let you organize devices and channels. Ask a workspace admin to create one.",
    ar: "تتيح لك المجموعات تنظيم الأجهزة والقنوات. اطلب من مسؤول مساحة العمل إنشاء مجموعة.",
  },
  "groups.collapse": { en: "Collapse {name}", ar: "طي {name}" },
  "groups.expand": { en: "Expand {name}", ar: "توسيع {name}" },
  "groups.subgroups": {
    en: { one: "{count} subgroup", other: "{count} subgroups" },
    ar: {
      one: "مجموعة فرعية واحدة",
      two: "مجموعتان فرعيتان",
      few: "{count} مجموعات فرعية",
      many: "{count} مجموعة فرعية",
      other: "{count} مجموعة فرعية",
    },
  },
  "groups.allGroups": { en: "All groups", ar: "كل المجموعات" },
  "groups.addSubgroup": { en: "Add subgroup", ar: "إضافة مجموعة فرعية" },
  "groups.move": { en: "Move", ar: "نقل" },
  "groups.moving": { en: "Moving…", ar: "جارٍ النقل…" },
  "groups.saved": {
    en: "Group “{name}” saved",
    ar: "تم حفظ المجموعة «{name}»",
  },
  "groups.created": {
    en: "Group “{name}” created",
    ar: "تم إنشاء المجموعة «{name}»",
  },
  "groups.edit": { en: "Edit group", ar: "تعديل المجموعة" },
  "groups.createSubgroup": { en: "Create subgroup", ar: "إنشاء مجموعة فرعية" },
  "groups.editHint": {
    en: "Change the group’s name and description.",
    ar: "غيّر اسم المجموعة ووصفها.",
  },
  "groups.createInside": {
    en: "The new group is created inside “{name}”.",
    ar: "سيتم إنشاء المجموعة الجديدة داخل «{name}».",
  },
  "groups.createHint": {
    en: "Groups organize the workspace’s devices and channels.",
    ar: "تنظّم المجموعات أجهزة مساحة العمل وقنواتها.",
  },
  "groups.namePlaceholder": { en: "Building A", ar: "المبنى أ" },
  "groups.deleted": {
    en: "Group “{name}” deleted",
    ar: "تم حذف المجموعة «{name}»",
  },
  "groups.deleteTitle": {
    en: "Delete group “{name}”?",
    ar: "حذف المجموعة «{name}»؟",
  },
  "groups.cannotDeleteTitle": {
    en: "Cannot delete group “{name}”",
    ar: "لا يمكن حذف المجموعة «{name}»",
  },
  "groups.hasChildren": {
    en: "It contains {subgroups}. Move or delete them first.",
    ar: "تحتوي على {subgroups}. انقلها أو احذفها أولًا.",
  },
  "groups.membersLeave": {
    en: "Its {devices} and {channels} leave the group; they are not deleted.",
    ar: "ستخرج {devices} و{channels} من المجموعة دون أن تُحذف.",
  },
  "groups.emptyDelete": {
    en: "The group is empty. Devices and channels are never deleted with a group.",
    ar: "المجموعة فارغة. لا تُحذف الأجهزة والقنوات أبدًا مع المجموعة.",
  },
  "groups.delete": { en: "Delete group", ar: "حذف المجموعة" },
  "groups.movedTop": {
    en: "Moved “{name}” to the top level",
    ar: "تم نقل «{name}» إلى المستوى الأعلى",
  },
  "groups.movedInto": {
    en: "Moved “{name}” to “{parent}”",
    ar: "تم نقل «{name}» إلى «{parent}»",
  },
  "groups.moveTitle": { en: "Move group", ar: "نقل المجموعة" },
  "groups.moveHint": {
    en: "Choose the new parent of “{name}”. Its subgroups, devices and channels move with it.",
    ar: "اختر المجموعة الأم الجديدة لـ «{name}». ستنتقل معها مجموعاتها الفرعية وأجهزتها وقنواتها.",
  },
  "groups.parent": { en: "Parent", ar: "المجموعة الأم" },
  "groups.topLevel": {
    en: "Top level (no parent)",
    ar: "المستوى الأعلى (بدون مجموعة أم)",
  },
  "count.devices": {
    en: { one: "{count} device", other: "{count} devices" },
    ar: {
      zero: "لا أجهزة",
      one: "جهاز واحد",
      two: "جهازان",
      few: "{count} أجهزة",
      many: "{count} جهازًا",
      other: "{count} جهاز",
    },
  },
  "count.channels": {
    en: { one: "{count} channel", other: "{count} channels" },
    ar: {
      zero: "لا قنوات",
      one: "قناة واحدة",
      two: "قناتان",
      few: "{count} قنوات",
      many: "{count} قناة",
      other: "{count} قناة",
    },
  },
  "groups.back": { en: "Back to groups", ar: "العودة إلى المجموعات" },
  "groups.parents": { en: "Parent groups", ar: "المجموعات الأم" },
  "groups.createdAt": { en: "created {date}", ar: "أُنشئت في {date}" },
  "groups.subgroupsTab": { en: "Subgroups", ar: "المجموعات الفرعية" },
  "groups.noSubgroups": {
    en: "No subgroups. Devices and channels of subgroups are not listed here; open a subgroup to see its members.",
    ar: "لا توجد مجموعات فرعية. لا تظهر هنا أجهزة المجموعات الفرعية وقنواتها؛ افتح المجموعة الفرعية لعرض أعضائها.",
  },

  // ── Group members (device / channel variants) ──────────────────────────
  "members.removedFromGroup": {
    en: "Removed “{name}” from “{group}”",
    ar: "تمت إزالة «{name}» من «{group}»",
  },
  "gm.removeAria": {
    en: "Remove {name} from the group",
    ar: "إزالة {name} من المجموعة",
  },
  "gm.loadFailed.device": {
    en: "Could not load devices",
    ar: "تعذّر تحميل الأجهزة",
  },
  "gm.loadFailed.channel": {
    en: "Could not load channels",
    ar: "تعذّر تحميل القنوات",
  },
  "gm.search.device": {
    en: "Search devices in this group…",
    ar: "ابحث في أجهزة هذه المجموعة…",
  },
  "gm.search.channel": {
    en: "Search channels in this group…",
    ar: "ابحث في قنوات هذه المجموعة…",
  },
  "gm.noMatches.device": {
    en: "No devices in this group match your search.",
    ar: "لا توجد أجهزة في هذه المجموعة مطابقة لبحثك.",
  },
  "gm.noMatches.channel": {
    en: "No channels in this group match your search.",
    ar: "لا توجد قنوات في هذه المجموعة مطابقة لبحثك.",
  },
  "gm.emptyTitle.device": {
    en: "No devices in this group yet",
    ar: "لا توجد أجهزة في هذه المجموعة بعد",
  },
  "gm.emptyTitle.channel": {
    en: "No channels in this group yet",
    ar: "لا توجد قنوات في هذه المجموعة بعد",
  },
  "gm.emptyHint.device": {
    en: "Add devices to this group to organize them and filter the device list by it.",
    ar: "أضف أجهزة إلى هذه المجموعة لتنظيمها وتصفية قائمة الأجهزة حسبها.",
  },
  "gm.emptyHint.channel": {
    en: "Add channels to this group to organize them and filter the channel list by it.",
    ar: "أضف قنوات إلى هذه المجموعة لتنظيمها وتصفية قائمة القنوات حسبها.",
  },
  "gm.emptyHintReadOnly.device": {
    en: "Ask a workspace admin to add devices to this group.",
    ar: "اطلب من مسؤول مساحة العمل إضافة أجهزة إلى هذه المجموعة.",
  },
  "gm.emptyHintReadOnly.channel": {
    en: "Ask a workspace admin to add channels to this group.",
    ar: "اطلب من مسؤول مساحة العمل إضافة قنوات إلى هذه المجموعة.",
  },
  "gm.add.device": { en: "Add devices", ar: "إضافة أجهزة" },
  "gm.add.channel": { en: "Add channels", ar: "إضافة قنوات" },
  "gm.removeTitle": {
    en: "Remove “{name}” from “{group}”?",
    ar: "إزالة «{name}» من «{group}»؟",
  },
  "gm.removeHint.device": {
    en: "The device itself is kept, along with its connections. It only stops being a member of this group.",
    ar: "سيبقى الجهاز نفسه واتصالاته كما هي، ويتوقف فقط عن كونه عضوًا في هذه المجموعة.",
  },
  "gm.removeHint.channel": {
    en: "The channel itself is kept, along with its connections. It only stops being a member of this group.",
    ar: "ستبقى القناة نفسها واتصالاتها كما هي، وتتوقف فقط عن كونها عضوًا في هذه المجموعة.",
  },
  "gm.max.device": {
    en: "Pick at most {count} devices at a time.",
    ar: "يمكنك اختيار {count} جهاز كحد أقصى في المرة الواحدة.",
  },
  "gm.max.channel": {
    en: "Pick at most {count} channels at a time.",
    ar: "يمكنك اختيار {count} قناة كحد أقصى في المرة الواحدة.",
  },
  "gm.added.device": {
    en: {
      one: "Added {count} device to “{group}”",
      other: "Added {count} devices to “{group}”",
    },
    ar: {
      one: "تمت إضافة جهاز واحد إلى «{group}»",
      two: "تمت إضافة جهازين إلى «{group}»",
      few: "تمت إضافة {count} أجهزة إلى «{group}»",
      many: "تمت إضافة {count} جهازًا إلى «{group}»",
      other: "تمت إضافة {count} جهاز إلى «{group}»",
    },
  },
  "gm.added.channel": {
    en: {
      one: "Added {count} channel to “{group}”",
      other: "Added {count} channels to “{group}”",
    },
    ar: {
      one: "تمت إضافة قناة واحدة إلى «{group}»",
      two: "تمت إضافة قناتين إلى «{group}»",
      few: "تمت إضافة {count} قنوات إلى «{group}»",
      many: "تمت إضافة {count} قناة إلى «{group}»",
      other: "تمت إضافة {count} قناة إلى «{group}»",
    },
  },
  "gm.partial": {
    en: "Added {done}, failed {failed}: {error}",
    ar: "تمت إضافة {done}، وفشل {failed}: {error}",
  },
  "gm.addHint.device": {
    en: "Add devices to “{group}”. A device can belong to several groups.",
    ar: "أضف أجهزة إلى «{group}». يمكن أن ينتمي الجهاز إلى عدة مجموعات.",
  },
  "gm.addHint.channel": {
    en: "Add channels to “{group}”. A channel can belong to several groups.",
    ar: "أضف قنوات إلى «{group}». يمكن أن تنتمي القناة إلى عدة مجموعات.",
  },
  "gm.searchAll.device": { en: "Search devices…", ar: "ابحث في الأجهزة…" },
  "gm.searchAll.channel": { en: "Search channels…", ar: "ابحث في القنوات…" },
  "gm.loading.device": { en: "Loading devices…", ar: "جارٍ تحميل الأجهزة…" },
  "gm.loading.channel": { en: "Loading channels…", ar: "جارٍ تحميل القنوات…" },
  "gm.none.device": { en: "No devices found.", ar: "لم يتم العثور على أجهزة." },
  "gm.none.channel": {
    en: "No channels found.",
    ar: "لم يتم العثور على قنوات.",
  },
  "gm.inGroup": { en: "In group", ar: "في المجموعة" },
  "gm.adding": { en: "Adding…", ar: "جارٍ الإضافة…" },
  "gm.addN.device": {
    en: { one: "Add {count} device", other: "Add {count} devices" },
    ar: {
      one: "إضافة جهاز واحد",
      two: "إضافة جهازين",
      few: "إضافة {count} أجهزة",
      many: "إضافة {count} جهازًا",
      other: "إضافة {count} جهاز",
    },
  },
  "gm.addN.channel": {
    en: { one: "Add {count} channel", other: "Add {count} channels" },
    ar: {
      one: "إضافة قناة واحدة",
      two: "إضافة قناتين",
      few: "إضافة {count} قنوات",
      many: "إضافة {count} قناة",
      other: "إضافة {count} قناة",
    },
  },
  // ── Members ─────────────────────────────────────────────────────────────
  "members.roleChanged": { en: "Role changed", ar: "تم تغيير الدور" },
  "members.removed": { en: "Removed “{name}”", ar: "تمت إزالة «{name}»" },
  "members.yourRole": {
    en: "Your role in this workspace is {role}.",
    ar: "دورك في مساحة العمل هذه: {role}.",
  },
  "members.noRole": {
    en: "You have no role in this workspace.",
    ar: "ليس لديك دور في مساحة العمل هذه.",
  },
  "members.loadFailed": {
    en: "Could not load members",
    ar: "تعذّر تحميل الأعضاء",
  },
  "members.emptyTitle": { en: "No members yet", ar: "لا يوجد أعضاء بعد" },
  "members.emptyHint": {
    en: "Members are the people who can sign in and work in this workspace. Add a user and pick their role: Admin, Operator or Viewer.",
    ar: "الأعضاء هم الأشخاص الذين يمكنهم تسجيل الدخول والعمل في مساحة العمل هذه. أضف مستخدمًا واختر دوره: مسؤول أو مشغّل أو مشاهد.",
  },
  "members.user": { en: "User", ar: "المستخدم" },
  "members.role": { en: "Role", ar: "الدور" },
  "members.you": { en: "You", ar: "أنت" },
  "members.roleOf": { en: "Role of {name}", ar: "دور {name}" },
  "members.roles": { en: "Roles", ar: "الأدوار" },
  "members.summary.admin": {
    en: "Everything in the workspace, including members and their roles.",
    ar: "كل شيء في مساحة العمل، بما في ذلك الأعضاء وأدوارهم.",
  },
  "members.summary.operator": {
    en: "Devices and their secrets, channels, connections, groups, dashboards and the Store messages switch. No members.",
    ar: "الأجهزة ومفاتيحها السرية، والقنوات، والاتصالات، والمجموعات، ولوحات المعلومات، وخيار تخزين الرسائل. دون إدارة الأعضاء.",
  },
  "members.summary.viewer": {
    en: "Reads devices, channels, groups, messages and dashboards. Can't change anything or see device secrets.",
    ar: "يطّلع على الأجهزة والقنوات والمجموعات والرسائل ولوحات المعلومات، دون إمكانية التعديل أو رؤية المفاتيح السرية للأجهزة.",
  },
  "members.removeTitle": { en: "Remove “{name}”?", ar: "إزالة «{name}»؟" },
  "members.removeHint": {
    en: "They lose all access to this workspace. Their user account is kept and can be added again later.",
    ar: "سيفقد كل صلاحيات الوصول إلى مساحة العمل هذه. يبقى حساب المستخدم محفوظًا ويمكن إضافته مرة أخرى لاحقًا.",
  },
  "members.added": { en: "Member added", ar: "تمت إضافة العضو" },
  "members.add": { en: "Add member", ar: "إضافة عضو" },
  "members.addHint": {
    en: "Give an existing user access to this workspace. Platform admins create users on the Users page.",
    ar: "امنح مستخدمًا موجودًا صلاحية الوصول إلى مساحة العمل هذه. ينشئ مسؤولو المنصة المستخدمين من صفحة المستخدمين.",
  },
  "members.pickUser": { en: "Pick a user", ar: "اختر مستخدمًا" },
  "members.searchUsers": {
    en: "Type 3+ letters of a name or email…",
    ar: "اكتب ٣ أحرف أو أكثر من الاسم أو البريد الإلكتروني…",
  },
  "members.searchHint": {
    en: "Type at least 3 letters to find users.",
    ar: "اكتب ٣ أحرف على الأقل للبحث عن المستخدمين.",
  },
  // ── Users ───────────────────────────────────────────────────────────────
  "users.deleted": { en: "Deleted “{name}”", ar: "تم حذف «{name}»" },
  "users.disabled": { en: "Disabled “{name}”", ar: "تم تعطيل «{name}»" },
  "users.enabled": { en: "Enabled “{name}”", ar: "تم تفعيل «{name}»" },
  "users.create": { en: "Create user", ar: "إنشاء مستخدم" },
  "users.askAdmin": {
    en: "Ask a platform admin to create or change user accounts.",
    ar: "اطلب من مسؤول المنصة إنشاء حسابات المستخدمين أو تعديلها.",
  },
  "users.loadFailed": {
    en: "Could not load users",
    ar: "تعذّر تحميل المستخدمين",
  },
  "users.builtIn": { en: "Built-in", ar: "مدمج" },
  "users.resetPassword": {
    en: "Reset password",
    ar: "إعادة تعيين كلمة المرور",
  },
  "users.deleteTitle": { en: "Delete “{name}”?", ar: "حذف «{name}»؟" },
  "users.disableTitle": { en: "Disable “{name}”?", ar: "تعطيل «{name}»؟" },
  "users.deleteHint": {
    en: "The account is deleted, its passwords and sessions are revoked, and it loses access to every workspace.",
    ar: "سيُحذف الحساب وتُلغى كلمات المرور والجلسات الخاصة به، ويفقد الوصول إلى جميع مساحات العمل.",
  },
  "users.disableHint": {
    en: "The user can no longer sign in until the account is enabled again. Their workspace memberships are kept.",
    ar: "لن يتمكن المستخدم من تسجيل الدخول حتى يُعاد تفعيل الحساب. تبقى عضوياته في مساحات العمل محفوظة.",
  },
  "users.created": {
    en: "User “{name}” created",
    ar: "تم إنشاء المستخدم «{name}»",
  },
  "users.createHint": {
    en: "The user signs in with the username (or email) and this password, and can create workspaces of their own.",
    ar: "يسجّل المستخدم الدخول باسم المستخدم (أو البريد الإلكتروني) وكلمة المرور هذه، ويمكنه إنشاء مساحات عمل خاصة به.",
  },
  "users.username": { en: "Username", ar: "اسم المستخدم" },
  "users.emailOptional": {
    en: "Email (optional)",
    ar: "البريد الإلكتروني (اختياري)",
  },
  "users.minLength": {
    en: "At least {count} characters.",
    ar: "{count} أحرف على الأقل.",
  },
  "users.passwordReset": {
    en: "Password of “{name}” reset",
    ar: "تمت إعادة تعيين كلمة مرور «{name}»",
  },
  "users.resetTitle": {
    en: "Reset password of “{name}”",
    ar: "إعادة تعيين كلمة مرور «{name}»",
  },
  "users.resetHint": {
    en: "The new password replaces every existing one. Share it with the user over a safe channel.",
    ar: "تحل كلمة المرور الجديدة محل جميع كلمات المرور الحالية. شاركها مع المستخدم عبر وسيلة آمنة.",
  },
  "users.newPassword": { en: "New password", ar: "كلمة المرور الجديدة" },
  "valid.passwordRequired": {
    en: "Password is required.",
    ar: "كلمة المرور مطلوبة.",
  },
  "valid.emailInvalid": {
    en: "Email is not valid.",
    ar: "البريد الإلكتروني غير صحيح.",
  },
  "valid.passwordLength": {
    en: "Password must be at least 8 characters.",
    ar: "يجب ألا تقل كلمة المرور عن ٨ أحرف.",
  },

  // ── Dashboards ──────────────────────────────────────────────────────────
  "dashboards.create": { en: "Create dashboard", ar: "إنشاء لوحة معلومات" },
  "dashboards.loadFailed": {
    en: "Could not load dashboards",
    ar: "تعذّر تحميل لوحات المعلومات",
  },
  "dashboards.search": {
    en: "Search dashboards…",
    ar: "ابحث في لوحات المعلومات…",
  },
  "dashboards.noMatches": {
    en: "No dashboards match your search.",
    ar: "لا توجد لوحات معلومات مطابقة لبحثك.",
  },
  "dashboards.emptyTitle": {
    en: "No dashboards yet",
    ar: "لا توجد لوحات معلومات بعد",
  },
  "dashboards.emptyHint": {
    en: "A dashboard shows live charts, gauges and values from the messages your devices send. Turn on “Store messages” on a channel first, then create a dashboard.",
    ar: "تعرض لوحة المعلومات رسومًا بيانية ومؤشرات وقيمًا مباشرة من رسائل أجهزتك. فعّل «تخزين الرسائل» في إحدى القنوات أولًا، ثم أنشئ لوحة معلومات.",
  },
  "dashboards.emptyHintReadOnly": {
    en: "A dashboard shows live charts and values from your devices’ messages. Ask a workspace admin to create one.",
    ar: "تعرض لوحة المعلومات رسومًا بيانية وقيمًا مباشرة من رسائل أجهزتك. اطلب من مسؤول مساحة العمل إنشاء لوحة.",
  },
  "dashboards.widgets": {
    en: { one: "{count} widget", other: "{count} widgets" },
    ar: {
      zero: "لا توجد عناصر",
      one: "عنصر واحد",
      two: "عنصران",
      few: "{count} عناصر",
      many: "{count} عنصرًا",
      other: "{count} عنصر",
    },
  },
  "dashboards.updated": { en: "updated {when}", ar: "آخر تحديث {when}" },
  "dashboards.duplicate": { en: "Duplicate", ar: "نسخ" },
  "dashboards.createHint": {
    en: "Start with an empty dashboard and add widgets to it.",
    ar: "ابدأ بلوحة معلومات فارغة وأضف إليها العناصر.",
  },
  "dashboards.created": {
    en: "Dashboard “{name}” created",
    ar: "تم إنشاء لوحة المعلومات «{name}»",
  },
  "dashboards.rename": {
    en: "Rename dashboard",
    ar: "إعادة تسمية لوحة المعلومات",
  },
  "dashboards.renameHint": {
    en: "Change the dashboard’s name.",
    ar: "غيّر اسم لوحة المعلومات.",
  },
  "dashboards.renamed": {
    en: "Dashboard “{name}” renamed",
    ar: "تمت إعادة تسمية لوحة المعلومات «{name}»",
  },
  "dashboards.duplicateTitle": {
    en: "Duplicate dashboard",
    ar: "نسخ لوحة المعلومات",
  },
  "dashboards.duplicateHint": {
    en: "The copy gets the same widgets.",
    ar: "ستحتوي النسخة على العناصر نفسها.",
  },
  "dashboards.namePlaceholder": { en: "Cold room", ar: "غرفة التبريد" },
  "dashboards.deleted": {
    en: "Dashboard “{name}” deleted",
    ar: "تم حذف لوحة المعلومات «{name}»",
  },
  "dashboards.deleteTitle": {
    en: "Delete dashboard “{name}”?",
    ar: "حذف لوحة المعلومات «{name}»؟",
  },
  "dashboards.deleteHint": {
    en: "Its widgets are removed. Channels and their stored messages are not affected.",
    ar: "ستُحذف عناصرها، ولن تتأثر القنوات ورسائلها المخزّنة.",
  },
  "dashboards.delete": { en: "Delete dashboard", ar: "حذف لوحة المعلومات" },
  "dashboards.saved": { en: "Dashboard saved", ar: "تم حفظ لوحة المعلومات" },
  "dashboards.back": {
    en: "Back to dashboards",
    ar: "العودة إلى لوحات المعلومات",
  },
  "dashboards.editHint": {
    en: "Drag widgets to reorder them, pick a size, then save.",
    ar: "اسحب العناصر لإعادة ترتيبها، واختر حجمها، ثم احفظ.",
  },
  "dashboards.liveHint": {
    en: "Updates every few seconds from stored messages.",
    ar: "تتحدّث كل بضع ثوانٍ من الرسائل المخزّنة.",
  },
  "dashboards.addWidget": { en: "Add widget", ar: "إضافة عنصر" },
  "dashboards.fullScreen": { en: "Full screen", ar: "ملء الشاشة" },
  "dashboards.exitFullScreen": {
    en: "Exit full screen",
    ar: "الخروج من ملء الشاشة",
  },
  "dashboards.noWidgets": {
    en: "This dashboard has no widgets yet.",
    ar: "لا تحتوي لوحة المعلومات هذه على عناصر بعد.",
  },
  "dashboards.widgetsLabel": { en: "Widgets", ar: "العناصر" },
  // ── Dashboard widgets ───────────────────────────────────────────────────
  "widget.sizeS": { en: "S", ar: "ص" },
  "widget.sizeM": { en: "M", ar: "م" },
  "widget.sizeL": { en: "L", ar: "ك" },
  "widget.small": { en: "small", ar: "صغير" },
  "widget.medium": { en: "medium", ar: "متوسط" },
  "widget.large": { en: "large", ar: "كبير" },
  "widget.channelGone": {
    en: "This channel no longer exists.",
    ar: "هذه القناة لم تعد موجودة.",
  },
  "widget.storeOff": {
    en: "Store messages is off.",
    ar: "تخزين الرسائل متوقف.",
  },
  "widget.turnOn": { en: "Turn it on", ar: "تفعيله" },
  "widget.sizeOf": { en: "Size of {title}", ar: "حجم {title}" },
  "widget.moveEarlier": { en: "Move earlier", ar: "نقل للأمام" },
  "widget.moveLater": { en: "Move later", ar: "نقل للخلف" },
  "widget.type.line": { en: "Line chart", ar: "رسم بياني خطي" },
  "widget.type.value": { en: "Latest value", ar: "آخر قيمة" },
  "widget.type.gauge": { en: "Gauge", ar: "مؤشر" },
  "widget.type.table": { en: "Latest messages", ar: "آخر الرسائل" },
  "widget.type.deviceStatus": { en: "Device status", ar: "حالة الأجهزة" },
  "range.15m": { en: "Last 15 minutes", ar: "آخر ١٥ دقيقة" },
  "range.1h": { en: "Last hour", ar: "آخر ساعة" },
  "range.6h": { en: "Last 6 hours", ar: "آخر ٦ ساعات" },
  "range.24h": { en: "Last 24 hours", ar: "آخر ٢٤ ساعة" },
  "range.7d": { en: "Last 7 days", ar: "آخر ٧ أيام" },
  "widget.noData": {
    en: "No stored messages yet.",
    ar: "لا توجد رسائل مخزّنة بعد.",
  },
  "widget.noValues": {
    en: "No values in the {range}.",
    ar: "لا توجد قيم خلال {range}.",
  },
  "widget.notNumber": {
    en: "The latest “{name}” is not a number.",
    ar: "آخر قيمة لـ «{name}» ليست رقمًا.",
  },
  "widget.gaugeAria": {
    en: "{value} {unit} on a scale from {min} to {max}",
    ar: "{value} {unit} على مقياس من {min} إلى {max}",
  },
  "widget.outside": { en: "Outside the scale", ar: "خارج المقياس" },
  "widget.devicesWord": {
    en: { one: "device", other: "devices" },
    ar: {
      zero: "جهاز",
      one: "جهاز",
      two: "جهازان",
      few: "أجهزة",
      many: "جهازًا",
      other: "جهاز",
    },
  },
  // ── Widget form ─────────────────────────────────────────────────────────
  "widgetForm.hint.line": {
    en: "One or more measurements over time",
    ar: "قياس واحد أو أكثر عبر الزمن",
  },
  "widgetForm.hint.value": {
    en: "The newest reading, with colour thresholds",
    ar: "أحدث قراءة مع حدود ملوّنة",
  },
  "widgetForm.hint.gauge": {
    en: "The newest reading between a min and max",
    ar: "أحدث قراءة بين حد أدنى وحد أعلى",
  },
  "widgetForm.hint.table": {
    en: "The newest messages of a channel",
    ar: "أحدث رسائل القناة",
  },
  "widgetForm.hint.deviceStatus": {
    en: "Devices by status in this workspace",
    ar: "الأجهزة حسب حالتها في مساحة العمل هذه",
  },
  "widgetForm.add.line": { en: "Add line chart", ar: "إضافة رسم بياني خطي" },
  "widgetForm.add.value": { en: "Add latest value", ar: "إضافة آخر قيمة" },
  "widgetForm.add.gauge": { en: "Add gauge", ar: "إضافة مؤشر" },
  "widgetForm.add.table": {
    en: "Add latest messages",
    ar: "إضافة آخر الرسائل",
  },
  "widgetForm.add.deviceStatus": {
    en: "Add device status",
    ar: "إضافة حالة الأجهزة",
  },
  "widgetForm.edit": { en: "Edit widget", ar: "تعديل العنصر" },
  "widgetForm.pickHint": {
    en: "Pick what the widget shows. Channel data comes from stored messages.",
    ar: "اختر ما يعرضه العنصر. تأتي بيانات القنوات من الرسائل المخزّنة.",
  },
  "widgetForm.apply": { en: "Apply", ar: "تطبيق" },
  "widgetForm.title": { en: "Title", ar: "العنوان" },
  "widgetForm.noChannels": {
    en: "No channels in this workspace",
    ar: "لا توجد قنوات في مساحة العمل هذه",
  },
  "widgetForm.measurementFilter": {
    en: "Measurement filter",
    ar: "تصفية القياس",
  },
  "widgetForm.measurement": { en: "Measurement", ar: "القياس" },
  "widgetForm.filterHint": {
    en: "Leave empty to show every measurement.",
    ar: "اتركه فارغًا لعرض جميع القياسات.",
  },
  "widgetForm.allMeasurements": { en: "All measurements", ar: "جميع القياسات" },
  "widgetForm.timeRange": { en: "Time range", ar: "النطاق الزمني" },
  "widgetForm.averagePer": {
    en: "average per {interval}",
    ar: "المتوسط لكل {interval}",
  },
  "widgetForm.unitHint": {
    en: "Leave empty to use the unit sent with the message.",
    ar: "اتركه فارغًا لاستخدام الوحدة المرسلة مع الرسالة.",
  },
  "widgetForm.min": { en: "Min", ar: "الحد الأدنى" },
  "widgetForm.max": { en: "Max", ar: "الحد الأعلى" },
  "widgetForm.rows": { en: "Rows", ar: "عدد الصفوف" },
  "widgetForm.nMessages": {
    en: "{count} messages",
    ar: {
      one: "رسالة واحدة",
      two: "رسالتان",
      few: "{count} رسائل",
      many: "{count} رسالة",
      other: "{count} رسالة",
    },
  },
  "widgetForm.size": { en: "Size", ar: "الحجم" },
  "widgetForm.looking": {
    en: "Looking for measurements…",
    ar: "جارٍ البحث عن القياسات…",
  },
  "widgetForm.noSuggestions": {
    en: "No stored messages yet; type the measurement name (SenML “n”).",
    ar: "لا توجد رسائل مخزّنة بعد؛ اكتب اسم القياس (الحقل «n» في SenML).",
  },
  "widgetForm.seenRecently": {
    en: "Measurements seen recently",
    ar: "القياسات الأخيرة",
  },
  "widgetForm.measurements": { en: "Measurements", ar: "القياسات" },
  "widgetForm.seriesHint": {
    en: "Up to {count}. Numeric values are charted.",
    ar: "حتى {count}. تُرسم القيم الرقمية فقط.",
  },
  "widgetForm.another": { en: "Another measurement name", ar: "اسم قياس آخر" },
  "widgetForm.add": { en: "Add", ar: "إضافة" },
  "widgetForm.thresholds": { en: "Colour thresholds", ar: "الحدود الملوّنة" },
  "widgetForm.thresholdsHint": {
    en: "From each value upwards the reading is marked with that state.",
    ar: "ابتداءً من كل قيمة فما فوق، تُعلَّم القراءة بالحالة المحددة.",
  },
  "widgetForm.thresholdValue": {
    en: "Threshold {n} value",
    ar: "قيمة الحد {n}",
  },
  "widgetForm.thresholdState": {
    en: "Threshold {n} state",
    ar: "حالة الحد {n}",
  },
  "widgetForm.thresholdRemove": {
    en: "Remove threshold {n}",
    ar: "إزالة الحد {n}",
  },
  "widgetForm.addThreshold": { en: "Add threshold", ar: "إضافة حد" },
  "threshold.good": { en: "Good", ar: "جيد" },
  "threshold.warning": { en: "Warning", ar: "تحذير" },
  "threshold.serious": { en: "Serious", ar: "خطير" },
  "threshold.critical": { en: "Critical", ar: "حرج" },
  "valid.pickMeasurement": {
    en: "Pick at least one measurement.",
    ar: "اختر قياسًا واحدًا على الأقل.",
  },
  "valid.thresholdNumber": {
    en: "Every threshold needs a number.",
    ar: "يجب أن يكون لكل حد قيمة رقمية.",
  },
  "valid.minNumber": {
    en: "Min must be a number.",
    ar: "يجب أن يكون الحد الأدنى رقمًا.",
  },
  "valid.maxNumber": {
    en: "Max must be a number.",
    ar: "يجب أن يكون الحد الأعلى رقمًا.",
  },
  "valid.maxGreater": {
    en: "Max must be greater than min.",
    ar: "يجب أن يكون الحد الأعلى أكبر من الحد الأدنى.",
  },
  "valid.widgetIncomplete": {
    en: "The widget is not complete.",
    ar: "بيانات العنصر غير مكتملة.",
  },
  // ── Shared inputs ───────────────────────────────────────────────────────
  "audit.emptyEntity": {
    en: "No audit logs for this entity.",
    ar: "لا توجد سجلات تدقيق لهذا العنصر.",
  },
  "audit.empty": {
    en: "No audit logs for this item.",
    ar: "لا توجد سجلات تدقيق لهذا العنصر.",
  },
  "audit.event": { en: "Event", ar: "الحدث" },
  "audit.outcome": { en: "Outcome", ar: "النتيجة" },
  "audit.total": { en: "{count} total", ar: "الإجمالي {count}" },
  "picker.placeholder": {
    en: "Pick a date and time",
    ar: "اختر التاريخ والوقت",
  },
  "picker.clear": { en: "Clear", ar: "مسح" },
  "password.show": { en: "Show password", ar: "إظهار كلمة المرور" },
  "password.hide": { en: "Hide password", ar: "إخفاء كلمة المرور" },
  "tags.hint": {
    en: "Press Enter to add multiple {label}.",
    ar: "اضغط Enter لإضافة عدة {label}.",
  },
  "entityKind.human": { en: "human", ar: "مستخدم" },
} satisfies Messages;

export type MessageKey = keyof typeof messages;
