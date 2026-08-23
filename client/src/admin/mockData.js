// Static/mock data shared across the admin panel's Phase-1 UI screens.
// No backend, API, or persistence involved — realistic placeholder content only.

export const MASJIDS = [
  { id: "MSJ-1042", name: "Green Valley Masjid", city: "Toronto", country: "Canada", region: "Americas", status: "pending", campaigns: 2, raised: 186400, registered: "Aug 19, 2026", imam: "Sheikh Idris Bello" },
  { id: "MSJ-0988", name: "Masjid Al-Noor", city: "Birmingham", country: "United Kingdom", region: "Europe", status: "verified", campaigns: 3, raised: 412900, registered: "Jul 30, 2026" , imam: "Imam Tariq Hussain"},
  { id: "MSJ-1051", name: "Baitul Aman Masjid", city: "Dhaka", country: "Bangladesh", region: "Asia", status: "pending", campaigns: 1, raised: 298500, registered: "Aug 18, 2026", imam: "Maulana Kabir Ahmed" },
  { id: "MSJ-0876", name: "Masjid Ar-Rahman", city: "Cape Town", country: "South Africa", region: "Africa", status: "verified", campaigns: 2, raised: 74200, registered: "Jun 12, 2026", imam: "Sheikh Yusuf Adams" },
  { id: "MSJ-1039", name: "Masjid Al-Ihsan", city: "Jakarta", country: "Indonesia", region: "Asia", status: "pending", campaigns: 1, raised: 51200, registered: "Aug 16, 2026", imam: "Ustadz Rahman Wibowo" },
  { id: "MSJ-0745", name: "Noor Islamic Center", city: "Houston", country: "United States", region: "Americas", status: "pending", campaigns: 1, raised: 22800, registered: "Aug 15, 2026", imam: "Imam Zaid Karim" },
  { id: "MSJ-0621", name: "Masjid Al-Falah", city: "London", country: "United Kingdom", region: "Europe", status: "verified", campaigns: 4, raised: 520100, registered: "Mar 2, 2026", imam: "Sheikh Bilal Rashid" },
  { id: "MSJ-0559", name: "Masjid Umar Ibn Al-Khattab", city: "Kuala Lumpur", country: "Malaysia", region: "Asia", status: "verified", campaigns: 2, raised: 168300, registered: "Feb 21, 2026", imam: "Ustaz Hafiz Anuar" },
  { id: "MSJ-0432", name: "Masjid Al-Taqwa", city: "Sydney", country: "Australia", region: "Oceania", status: "verified", campaigns: 1, raised: 91500, registered: "Jan 14, 2026", imam: "Imam Karim Osman" },
  { id: "MSJ-0311", name: "Masjid Bilal", city: "Nairobi", country: "Kenya", region: "Africa", status: "rejected", campaigns: 0, raised: 0, registered: "Aug 10, 2026", imam: "—" },
  { id: "MSJ-1063", name: "Islamic Center of Chicago", city: "Chicago", country: "United States", region: "Americas", status: "pending", campaigns: 1, raised: 34600, registered: "Aug 20, 2026", imam: "Imam Suleiman Cole" },
  { id: "MSJ-0798", name: "Masjid Al-Huda", city: "Karachi", country: "Pakistan", region: "Asia", status: "verified", campaigns: 3, raised: 245700, registered: "May 5, 2026", imam: "Mufti Adeel Qureshi" },
];

export const CAMPAIGNS = [
  { id: "CMP-3301", name: "Winter Relief Drive", masjid: "Masjid Al-Falah", category: "Relief", raised: 186400, goal: 200000, status: "active", ends: "Sep 12, 2026" },
  { id: "CMP-3287", name: "Masjid Renovation Fund", masjid: "Green Valley Masjid", category: "Infrastructure", raised: 412000, goal: 650000, status: "active", ends: "Nov 1, 2026" },
  { id: "CMP-3244", name: "Ramadan Food Bank", masjid: "Baitul Aman Masjid", category: "Relief", raised: 298500, goal: 300000, status: "active", ends: "Aug 28, 2026" },
  { id: "CMP-3198", name: "Youth Education Fund", masjid: "Masjid Ar-Rahman", category: "Education", raised: 74200, goal: 150000, status: "active", ends: "Oct 5, 2026" },
  { id: "CMP-3150", name: "New Wudu Facility", masjid: "Noor Islamic Center", category: "Infrastructure", raised: 22800, goal: 40000, status: "active", ends: "Sep 30, 2026" },
  { id: "CMP-3122", name: "Clean Water Initiative", masjid: "Masjid Al-Ihsan", category: "Relief", raised: 51200, goal: 80000, status: "active", ends: "Oct 20, 2026" },
  { id: "CMP-2986", name: "Orphan Sponsorship Program", masjid: "Masjid Al-Huda", category: "Community", raised: 145700, goal: 145700, status: "completed", ends: "Aug 1, 2026" },
  { id: "CMP-2911", name: "Emergency Relief Fund", masjid: "Masjid Al-Falah", category: "Relief", raised: 100000, goal: 100000, status: "completed", ends: "Jul 15, 2026" },
  { id: "CMP-2870", name: "Library & Learning Center", masjid: "Masjid Umar Ibn Al-Khattab", category: "Education", raised: 88300, goal: 120000, status: "paused", ends: "Dec 1, 2026" },
];

export const DONATIONS = [
  { id: "DN-88231", donor: "Yusuf Rahman", initials: "YR", campaign: "Winter Relief Drive", amount: 12500, date: "Aug 21, 2026", status: "ok", method: "Card" },
  { id: "DN-88230", donor: "Anonymous", initials: "AN", campaign: "Masjid Al-Falah Renovation", amount: 5000, date: "Aug 21, 2026", status: "ok", method: "Bank Transfer" },
  { id: "DN-88227", donor: "Fatima Noor", initials: "FN", campaign: "Ramadan Food Bank", amount: 25000, date: "Aug 20, 2026", status: "ok", method: "Card" },
  { id: "DN-88219", donor: "Ibrahim Malik", initials: "IM", campaign: "New Wudu Facility", amount: 8750, date: "Aug 20, 2026", status: "warn", method: "Bank Transfer" },
  { id: "DN-88204", donor: "Sana Ahmed", initials: "SA", campaign: "Youth Education Fund", amount: 3200, date: "Aug 19, 2026", status: "ok", method: "Wallet" },
  { id: "DN-88198", donor: "Anonymous", initials: "AN", campaign: "Emergency Relief Fund", amount: 15000, date: "Aug 19, 2026", status: "ok", method: "Card" },
  { id: "DN-88190", donor: "Khalid Osman", initials: "KO", campaign: "Clean Water Initiative", amount: 6400, date: "Aug 18, 2026", status: "ok", method: "Card" },
  { id: "DN-88177", donor: "Layla Hassan", initials: "LH", campaign: "Masjid Renovation Fund", amount: 42000, date: "Aug 18, 2026", status: "ok", method: "Bank Transfer" },
  { id: "DN-88160", donor: "Omar Siddiqui", initials: "OS", campaign: "Ramadan Food Bank", amount: 1800, date: "Aug 17, 2026", status: "failed", method: "Card" },
  { id: "DN-88144", donor: "Anonymous", initials: "AN", campaign: "Winter Relief Drive", amount: 9000, date: "Aug 17, 2026", status: "ok", method: "Wallet" },
];

export const DONORS = [
  { id: "DR-5510", name: "Yusuf Rahman", initials: "YR", email: "y.rahman@example.com", donations: 24, total: 128400, since: "Jan 2025", tier: "Champion" },
  { id: "DR-5498", name: "Layla Hassan", initials: "LH", email: "layla.h@example.com", donations: 18, total: 96200, since: "Mar 2025", tier: "Champion" },
  { id: "DR-5471", name: "Fatima Noor", initials: "FN", email: "fatima.noor@example.com", donations: 31, total: 84900, since: "Nov 2024", tier: "Champion" },
  { id: "DR-5440", name: "Khalid Osman", initials: "KO", email: "khalid.o@example.com", donations: 12, total: 41200, since: "May 2025", tier: "Regular" },
  { id: "DR-5402", name: "Sana Ahmed", initials: "SA", email: "sana.ahmed@example.com", donations: 9, total: 22600, since: "Jul 2025", tier: "Regular" },
  { id: "DR-5388", name: "Omar Siddiqui", initials: "OS", email: "omar.s@example.com", donations: 6, total: 8400, since: "Sep 2025", tier: "New" },
  { id: "DR-5350", name: "Ibrahim Malik", initials: "IM", email: "i.malik@example.com", donations: 4, total: 15750, since: "Oct 2025", tier: "New" },
];

export const PROJECTS = [
  { id: "PRJ-441", name: "Masjid Al-Falah Extension", masjid: "Masjid Al-Falah, London", status: "ongoing", budget: 650000, spent: 412000, milestone: "Foundation & structure complete", eta: "Nov 2026" },
  { id: "PRJ-437", name: "Community Kitchen Build", masjid: "Baitul Aman Masjid, Dhaka", status: "ongoing", budget: 90000, spent: 61500, milestone: "Kitchen fit-out in progress", eta: "Oct 2026" },
  { id: "PRJ-429", name: "Solar Power Retrofit", masjid: "Masjid Al-Taqwa, Sydney", status: "ongoing", budget: 48000, spent: 12000, milestone: "Panels procured", eta: "Dec 2026" },
  { id: "PRJ-402", name: "Library & Learning Center", masjid: "Masjid Umar Ibn Al-Khattab, KL", status: "ongoing", budget: 120000, spent: 88300, milestone: "Interior fit-out underway", eta: "Dec 2026" },
  { id: "PRJ-388", name: "Orphan Sponsorship Program", masjid: "Masjid Al-Huda, Karachi", status: "completed", budget: 145700, spent: 145700, milestone: "Program delivered to 210 families", eta: "Completed Aug 2026" },
  { id: "PRJ-371", name: "Wudu Facility Upgrade", masjid: "Masjid Ar-Rahman, Cape Town", status: "completed", budget: 38000, spent: 36900, milestone: "Handed over", eta: "Completed Jul 2026" },
  { id: "PRJ-360", name: "Emergency Flood Relief", masjid: "Masjid Al-Falah, London", status: "completed", budget: 100000, spent: 100000, milestone: "Aid distributed to 1,200 households", eta: "Completed Jul 2026" },
];

export const VERIFICATIONS = [
  { id: "VR-901", masjid: "Green Valley Masjid", loc: "Toronto, Canada", submitted: "2 days ago", docs: ["Registration Certificate", "Imam ID", "Utility Bill"] },
  { id: "VR-897", masjid: "Baitul Aman Masjid", loc: "Dhaka, Bangladesh", submitted: "3 days ago", docs: ["Registration Certificate", "Bank Statement"] },
  { id: "VR-889", masjid: "Masjid Al-Ihsan", loc: "Jakarta, Indonesia", submitted: "5 days ago", docs: ["Registration Certificate", "Imam ID", "Property Deed"] },
  { id: "VR-874", masjid: "Noor Islamic Center", loc: "Houston, USA", submitted: "6 days ago", docs: ["Registration Certificate", "Bank Statement", "Utility Bill"] },
  { id: "VR-862", masjid: "Islamic Center of Chicago", loc: "Chicago, USA", submitted: "1 week ago", docs: ["Registration Certificate", "Imam ID"] },
];

export const USERS = [
  { id: "USR-01", name: "Aisha Karim", email: "admin@masjidmycommunity.org", role: "Platform Administrator", status: "active", initials: "AK", last: "Active now" },
  { id: "USR-02", name: "Daniyal Farooq", email: "daniyal.f@masjidmycommunity.org", role: "Verification Reviewer", status: "active", initials: "DF", last: "2h ago" },
  { id: "USR-03", name: "Mariam Siddiqui", email: "mariam.s@masjidmycommunity.org", role: "Finance Analyst", status: "active", initials: "MS", last: "5h ago" },
  { id: "USR-04", name: "Hamza Yousef", email: "hamza.y@masjidmycommunity.org", role: "Content Editor", status: "invited", initials: "HY", last: "Invitation sent" },
  { id: "USR-05", name: "Noor Fatima", email: "noor.f@masjidmycommunity.org", role: "Support Agent", status: "suspended", initials: "NF", last: "12d ago" },
];

export const CONTENT_ITEMS = [
  { id: "CT-01", title: "Home Page — Hero & Featured Campaigns", type: "Page", status: "published", updated: "Aug 18, 2026", author: "Hamza Yousef" },
  { id: "CT-02", title: "How It Works — Donor Journey", type: "Page", status: "published", updated: "Aug 10, 2026", author: "Hamza Yousef" },
  { id: "CT-03", title: "Winter Relief Drive — Campaign Story", type: "Campaign Story", status: "published", updated: "Aug 21, 2026", author: "Aisha Karim" },
  { id: "CT-04", title: "FAQ — Donor & Masjid Questions", type: "Page", status: "draft", updated: "Aug 19, 2026", author: "Mariam Siddiqui" },
  { id: "CT-05", title: "Ramadan 2027 Announcement Banner", type: "Announcement", status: "scheduled", updated: "Aug 20, 2026", author: "Aisha Karim" },
  { id: "CT-06", title: "Terms of Use", type: "Legal", status: "published", updated: "Jul 2, 2026", author: "Aisha Karim" },
  { id: "CT-07", title: "Masjid Al-Falah — Featured Story", type: "Masjid Story", status: "review", updated: "Aug 17, 2026", author: "Hamza Yousef" },
];

export function currency(n) {
  return `₹${n.toLocaleString("en-IN")}`;
}
