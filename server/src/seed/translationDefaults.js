import Translation from "../models/Translation.js";

// Phase 1 pilot set — Navbar, Footer's language switcher, and Auth's
// primary login/register surface. English is the source of truth; hi/ur/ar
// are a best-effort starting point and should be reviewed by a native
// speaker before being treated as production-quality copy. Everything else
// in the app still renders its hardcoded English text — t() falls back to
// that automatically for any key not listed here, so nothing breaks as more
// pages are migrated over time.
const DEFAULTS = [
  ["nav", "nav.announce", "Empowering masjids. Strengthening communities. Join the global movement.", "मस्जिदों को सशक्त बनाना। समुदायों को मज़बूत करना। वैश्विक आंदोलन से जुड़ें।", "مساجد کو بااختیار بنانا۔ برادریوں کو مضبوط کرنا۔ عالمی تحریک میں شامل ہوں۔", "تمكين المساجد. تعزيز المجتمعات. انضم إلى الحركة العالمية."],
  ["nav", "nav.exploreCampaigns", "Explore campaigns →", "अभियान देखें →", "مہمات دیکھیں ←", "استكشف الحملات ←"],
  ["nav", "nav.exploreMasjids", "Explore Masjids", "मस्जिदें खोजें", "مساجد تلاش کریں", "استكشف المساجد"],
  ["nav", "nav.myCommunity", "My Community", "मेरा समुदाय", "میری کمیونٹی", "مجتمعي"],
  ["nav", "nav.impact", "Impact", "प्रभाव", "اثرات", "الأثر"],
  ["nav", "nav.aboutUs", "About Us", "हमारे बारे में", "ہمارے بارے میں", "من نحن"],
  ["nav", "nav.logIn", "Log in", "लॉग इन करें", "لاگ ان کریں", "تسجيل الدخول"],
  ["nav", "nav.startCampaign", "Start a Campaign", "अभियान शुरू करें", "مہم شروع کریں", "ابدأ حملة"],
  ["nav", "nav.markAllRead", "Mark all as read", "सभी को पढ़ा हुआ चिह्नित करें", "سب کو پڑھا ہوا نشان زد کریں", "تحديد الكل كمقروء"],
  ["nav", "nav.noNotifications", "You're all caught up — no notifications yet.", "आप पूरी तरह अपडेट हैं — अभी कोई सूचना नहीं है।", "آپ بالکل اپ ٹو ڈیٹ ہیں — ابھی تک کوئی اطلاع نہیں۔", "أنت على اطلاع كامل — لا توجد إشعارات بعد."],
  ["nav", "nav.myMasjids", "My Masjids", "मेरी मस्जिदें", "میری مساجد", "مساجدي"],
  ["nav", "nav.myCampaigns", "My Campaigns", "मेरे अभियान", "میری مہمات", "حملاتي"],
  ["nav", "nav.editProfile", "Edit Profile", "प्रोफ़ाइल संपादित करें", "پروفائل میں ترمیم کریں", "تعديل الملف الشخصي"],
  ["nav", "nav.logOut", "Log Out", "लॉग आउट करें", "لاگ آؤٹ کریں", "تسجيل الخروج"],
  ["nav", "nav.registerMasjid", "Register Your Masjid", "अपनी मस्जिद पंजीकृत करें", "اپنی مسجد رجسٹر کریں", "سجّل مسجدك"],

  ["auth", "auth.tabs.login", "Login", "लॉगिन", "لاگ ان", "تسجيل الدخول"],
  ["auth", "auth.tabs.createAccount", "Create Account", "खाता बनाएं", "اکاؤنٹ بنائیں", "إنشاء حساب"],
  ["auth", "auth.art.welcomeBack.eyebrow", "Welcome Back", "वापसी पर स्वागत है", "خوش آمدید", "مرحبًا بعودتك"],
  ["auth", "auth.art.welcomeBack.title", "Sign in to your account.", "अपने खाते में साइन इन करें।", "اپنے اکاؤنٹ میں سائن ان کریں۔", "سجّل الدخول إلى حسابك."],
  ["auth", "auth.art.welcomeBack.sub", "Manage your campaigns, track donations, and stay connected with your community.", "अपने अभियानों को प्रबंधित करें, दान को ट्रैक करें, और अपने समुदाय से जुड़े रहें।", "اپنی مہمات کا نظم کریں، عطیات کو ٹریک کریں، اور اپنی کمیونٹی سے جڑے رہیں۔", "أدر حملاتك، وتابع التبرعات، وابقَ على تواصل مع مجتمعك."],
  ["auth", "auth.art.register.eyebrow", "Create Account", "खाता बनाएं", "اکاؤنٹ بنائیں", "إنشاء حساب"],
  ["auth", "auth.art.register.title", "Join the movement.", "इस मुहिम से जुड़ें।", "اس تحریک میں شامل ہوں۔", "انضم إلى الحركة."],
  ["auth", "auth.art.register.sub", "Register a masjid, launch a campaign, or support one that matters to you.", "एक मस्जिद पंजीकृत करें, एक अभियान शुरू करें, या किसी ऐसे अभियान का समर्थन करें जो आपके लिए मायने रखता है।", "ایک مسجد رجسٹر کریں، ایک مہم شروع کریں، یا کسی ایسی مہم کی حمایت کریں جو آپ کے لیے اہم ہو۔", "سجّل مسجدًا، أو أطلق حملة، أو ادعم حملة تهمك."],
  ["auth", "auth.art.campaign.eyebrow", "Start a Campaign", "अभियान शुरू करें", "مہم شروع کریں", "ابدأ حملة"],
  ["auth", "auth.art.campaign.title", "One step before you begin.", "शुरू करने से पहले एक कदम।", "شروع کرنے سے پہلے ایک قدم۔", "خطوة واحدة قبل أن تبدأ."],
  ["auth", "auth.art.campaign.sub", "Sign in or create your account — it only takes a minute — and you'll be ready to launch your campaign.", "साइन इन करें या अपना खाता बनाएं — इसमें बस एक मिनट लगता है — और आप अपना अभियान शुरू करने के लिए तैयार हो जाएंगे।", "سائن ان کریں یا اپنا اکاؤنٹ بنائیں — اس میں صرف ایک منٹ لگتا ہے — اور آپ اپنی مہم شروع کرنے کے لیے تیار ہو جائیں گے۔", "سجّل الدخول أو أنشئ حسابك — الأمر يستغرق دقيقة واحدة فقط — وستكون جاهزًا لإطلاق حملتك."],
  ["auth", "auth.why.launch", "Launch and manage fundraising campaigns", "फंडरेज़िंग अभियान शुरू करें और प्रबंधित करें", "فنڈ ریزنگ مہمات شروع اور منظم کریں", "أطلق حملات جمع التبرعات وأدرها"],
  ["auth", "auth.why.track", "Track donations and progress in real time", "दान और प्रगति को वास्तविक समय में ट्रैक करें", "عطیات اور پیش رفت کو حقیقی وقت میں ٹریک کریں", "تتبّع التبرعات والتقدم في الوقت الفعلي"],
  ["auth", "auth.why.join", "Join a trusted, verified global community", "एक विश्वसनीय, सत्यापित वैश्विक समुदाय से जुड़ें", "ایک قابل اعتماد، تصدیق شدہ عالمی کمیونٹی میں شامل ہوں", "انضم إلى مجتمع عالمي موثوق ومُتحقق منه"],
  ["auth", "auth.login.emailOrMobile", "Email or Mobile Number", "ईमेल या मोबाइल नंबर", "ای میل یا موبائل نمبر", "البريد الإلكتروني أو رقم الجوال"],
  ["auth", "auth.login.emailOrMobilePlaceholder", "you@example.com or 10-digit mobile number", "you@example.com या 10 अंकों का मोबाइल नंबर", "you@example.com یا 10 ہندسوں کا موبائل نمبر", "you@example.com أو رقم جوال مكوّن من 10 أرقام"],
  ["auth", "auth.login.password", "Password", "पासवर्ड", "پاس ورڈ", "كلمة المرور"],
  ["auth", "auth.login.passwordPlaceholder", "Enter your password", "अपना पासवर्ड दर्ज करें", "اپنا پاس ورڈ درج کریں", "أدخل كلمة المرور"],
  ["auth", "auth.login.rememberMe", "Remember me", "मुझे याद रखें", "مجھے یاد رکھیں", "تذكرني"],
  ["auth", "auth.login.forgotPassword", "Forgot password?", "पासवर्ड भूल गए?", "پاس ورڈ بھول گئے؟", "هل نسيت كلمة المرور؟"],
  ["auth", "auth.login.signIn", "Sign In", "साइन इन करें", "سائن ان کریں", "تسجيل الدخول"],
  ["auth", "auth.login.signingIn", "Signing in…", "साइन इन हो रहा है…", "سائن ان ہو رہا ہے…", "جارٍ تسجيل الدخول…"],
  ["auth", "auth.login.newHere", "New to Masjid My Community?", "Masjid My Community पर नए हैं?", "Masjid My Community پر نئے ہیں؟", "جديد على Masjid My Community؟"],
  ["auth", "auth.login.createAccount", "Create an account", "खाता बनाएं", "اکاؤنٹ بنائیں", "إنشاء حساب"],
  ["auth", "auth.register.fullName", "Full Name", "पूरा नाम", "پورا نام", "الاسم الكامل"],
  ["auth", "auth.register.fullNamePlaceholder", "Your full name", "आपका पूरा नाम", "آپ کا پورا نام", "اسمك الكامل"],
  ["auth", "auth.register.contact", "Email Address or Mobile Number", "ईमेल पता या मोबाइल नंबर", "ای میل ایڈریس یا موبائل نمبر", "البريد الإلكتروني أو رقم الجوال"],
  ["auth", "auth.register.contactPlaceholder", "you@example.com or 10-digit mobile number", "you@example.com या 10 अंकों का मोबाइल नंबर", "you@example.com یا 10 ہندسوں کا موبائل نمبر", "you@example.com أو رقم جوال مكوّن من 10 أرقام"],
  ["auth", "auth.register.password", "Password", "पासवर्ड", "پاس ورڈ", "كلمة المرور"],
  ["auth", "auth.register.passwordPlaceholder", "At least 8 characters", "कम से कम 8 वर्ण", "کم از کم 8 حروف", "8 أحرف على الأقل"],
  ["auth", "auth.register.createAccount", "Create Account", "खाता बनाएं", "اکاؤنٹ بنائیں", "إنشاء حساب"],
  ["auth", "auth.register.creatingAccount", "Creating account…", "खाता बनाया जा रहा है…", "اکاؤنٹ بنایا جا رہا ہے…", "جارٍ إنشاء الحساب…"],
  ["auth", "auth.register.alreadyHaveAccount", "Already have an account?", "पहले से खाता है?", "پہلے سے اکاؤنٹ ہے؟", "لديك حساب بالفعل؟"],
  ["auth", "auth.register.signIn", "Sign in", "साइन इन करें", "سائن ان کریں", "تسجيل الدخول"],
  ["auth", "auth.errGeneric", "Something went wrong. Please try again.", "कुछ गलत हो गया। कृपया पुनः प्रयास करें।", "کچھ غلط ہو گیا۔ براہ کرم دوبارہ کوشش کریں۔", "حدث خطأ ما. يرجى المحاولة مرة أخرى."],
  ["auth", "auth.login.errEmailOrMobile", "Enter your email address or mobile number.", "अपना ईमेल पता या मोबाइल नंबर दर्ज करें।", "اپنا ای میل ایڈریس یا موبائل نمبر درج کریں۔", "أدخل بريدك الإلكتروني أو رقم جوالك."],
  ["auth", "auth.login.errPassword", "Enter your password.", "अपना पासवर्ड दर्ज करें।", "اپنا پاس ورڈ درج کریں۔", "أدخل كلمة المرور."],
  ["auth", "auth.register.errFullName", "Full name is required.", "पूरा नाम आवश्यक है।", "پورا نام درکار ہے۔", "الاسم الكامل مطلوب."],
  ["auth", "auth.register.errContactRequired", "Provide an email address or a mobile number.", "एक ईमेल पता या मोबाइल नंबर दर्ज करें।", "ای میل ایڈریس یا موبائل نمبر فراہم کریں۔", "يرجى تقديم بريد إلكتروني أو رقم جوال."],
  ["auth", "auth.register.errEmailInvalid", "Enter a valid email address.", "एक मान्य ईमेल पता दर्ज करें।", "ایک درست ای میل ایڈریس درج کریں۔", "أدخل بريدًا إلكترونيًا صالحًا."],
  ["auth", "auth.register.errMobileInvalid", "Enter a valid 10-digit mobile number.", "एक मान्य 10 अंकों का मोबाइल नंबर दर्ज करें।", "ایک درست 10 ہندسوں کا موبائل نمبر درج کریں۔", "أدخل رقم جوال صالحًا مكوّنًا من 10 أرقام."],
  ["auth", "auth.register.errPassword", "At least 8 characters with a letter and a number.", "कम से कम 8 वर्ण, जिनमें एक अक्षर और एक अंक हो।", "کم از کم 8 حروف، جن میں ایک حرف اور ایک ہندسہ ہو۔", "8 أحرف على الأقل تحتوي على حرف ورقم."],
];

// Additive, not "seed once": every deploy that adds new keys to DEFAULTS
// above needs those new rows to land even though earlier keys already
// exist. ignoreDuplicates (INSERT IGNORE) inserts only rows that don't
// already match the (key, languageCode) unique index, so it never
// overwrites a value an admin has since edited by hand.
export async function ensureTranslationDefaults() {
  const rows = [];
  for (const [category, key, en, hi, ur, ar] of DEFAULTS) {
    rows.push({ key, category, languageCode: "en", value: en });
    rows.push({ key, category, languageCode: "hi", value: hi });
    rows.push({ key, category, languageCode: "ur", value: ur });
    rows.push({ key, category, languageCode: "ar", value: ar });
  }
  await Translation.bulkCreate(rows, { ignoreDuplicates: true });
}
