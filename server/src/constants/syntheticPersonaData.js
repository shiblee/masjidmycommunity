// Name pools and role-title hints for the synthetic USER generator
// (syntheticUserGeneratorService.js). These are plain, common given/family
// names — not modeled on any specific real individual — used only to
// assemble a synthetic persona; MUSLIM_PERSONA below is purely a
// name-pool-selection knob (matching UserBotSettings.muslimPersonaPercent)
// and is never stored anywhere as a claim about an account's actual
// religion.

export const MUSLIM_FIRST_NAMES_MALE = [
  "Ayaan", "Zayd", "Ibrahim", "Yusuf", "Imran", "Farhan", "Zaid", "Bilal",
  "Hamza", "Rayyan", "Adam", "Ismail", "Arham", "Faizan", "Sameer", "Kabir",
  "Nadeem", "Rizwan", "Shoaib", "Tariq", "Usman", "Waseem", "Zubair", "Aariz",
  "Danish", "Fahad", "Junaid", "Khalid", "Mustafa", "Naveed",
];

export const MUSLIM_FIRST_NAMES_FEMALE = [
  "Ayesha", "Fatima", "Zainab", "Maryam", "Amina", "Sana", "Hina", "Rabia",
  "Sadia", "Nadia", "Farah", "Kiran", "Sameera", "Yasmin", "Zara", "Alina",
  "Iqra", "Mahnoor", "Rukhsar", "Shazia", "Tahira", "Uzma", "Wafa", "Aliya",
  "Bushra", "Fariha", "Huma", "Naila", "Rida", "Sabiha",
];

export const MUSLIM_LAST_NAMES = [
  "Khan", "Ahmed", "Sheikh", "Siddiqui", "Ansari", "Qureshi", "Malik",
  "Hussain", "Rizvi", "Chaudhry", "Farooqi", "Baig", "Iqbal", "Rahman",
  "Chowdhury", "Sayed", "Mirza", "Shaikh", "Abbasi", "Hashmi",
];

export const GENERIC_FIRST_NAMES_MALE = [
  "Aarav", "Vikram", "Rohan", "Arjun", "Karan", "Rahul", "Aditya", "Nikhil",
  "Sameer", "Vivek", "James", "Michael", "David", "Daniel", "Ryan",
];

export const GENERIC_FIRST_NAMES_FEMALE = [
  "Ananya", "Priya", "Neha", "Divya", "Kavya", "Pooja", "Sneha", "Riya",
  "Emma", "Olivia", "Sophia", "Grace", "Chloe", "Hannah", "Laura",
];

export const GENERIC_LAST_NAMES = [
  "Sharma", "Verma", "Gupta", "Reddy", "Nair", "Iyer", "Smith", "Johnson",
  "Brown", "Wilson", "Taylor", "Anderson", "Clark", "Lewis", "Walker",
];

// Keyword-matched against a FieldOfStudy name (case-insensitive substring
// match) rather than an exact dictionary — the meta table has 50+ seeded
// fields and grows, so a small set of representative keyword buckets scales
// better than an exhaustive one-to-one mapping. First matching bucket wins;
// GENERIC is the fallback when nothing matches.
export const ROLE_TITLES_BY_FIELD_KEYWORD = [
  { keyword: "computer", titles: ["Software Engineer", "Backend Developer", "Frontend Developer", "Full-Stack Developer"] },
  { keyword: "information technology", titles: ["IT Support Engineer", "Systems Analyst", "IT Consultant"] },
  { keyword: "data", titles: ["Data Analyst", "Data Scientist", "Business Intelligence Analyst"] },
  { keyword: "artificial intelligence", titles: ["Machine Learning Engineer", "AI Research Associate"] },
  { keyword: "cyber", titles: ["Security Analyst", "Cybersecurity Engineer"] },
  { keyword: "cloud", titles: ["Cloud Engineer", "DevOps Engineer"] },
  { keyword: "engineering", titles: ["Design Engineer", "Project Engineer", "Site Engineer"] },
  { keyword: "business", titles: ["Business Analyst", "Operations Executive", "Account Manager"] },
  { keyword: "commerce", titles: ["Accountant", "Finance Executive", "Auditor"] },
  { keyword: "management", titles: ["Project Manager", "Operations Manager", "Team Lead"] },
  { keyword: "marketing", titles: ["Marketing Executive", "Digital Marketing Specialist", "Brand Manager"] },
  { keyword: "design", titles: ["Product Designer", "UI/UX Designer", "Graphic Designer"] },
  { keyword: "medic", titles: ["Medical Officer", "Clinical Associate"] },
  { keyword: "nursing", titles: ["Staff Nurse", "Clinical Nurse"] },
  { keyword: "law", titles: ["Legal Associate", "Legal Advisor"] },
  { keyword: "education", titles: ["Teacher", "Academic Coordinator", "Lecturer"] },
  { keyword: "journalism", titles: ["Content Writer", "Journalist", "Copy Editor"] },
  { keyword: "architecture", titles: ["Architect", "Architectural Associate"] },
  { keyword: "finance", titles: ["Financial Analyst", "Investment Associate"] },
];

export const GENERIC_ROLE_TITLES = ["Associate", "Executive", "Coordinator", "Specialist", "Analyst"];

export function titlesForField(fieldOfStudy) {
  const normalized = (fieldOfStudy || "").toLowerCase();
  const match = ROLE_TITLES_BY_FIELD_KEYWORD.find((r) => normalized.includes(r.keyword));
  return match ? match.titles : GENERIC_ROLE_TITLES;
}
