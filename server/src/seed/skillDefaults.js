import Skill from "../models/Skill.js";

const DEFAULTS = [
  // Soft / professional skills
  "Communication", "Leadership", "Teamwork", "Problem Solving", "Time Management",
  "Public Speaking", "Project Management", "Critical Thinking", "Negotiation",
  "Customer Service", "Adaptability", "Conflict Resolution", "Decision Making",
  // Sales / marketing / business
  "Sales", "Marketing", "Digital Marketing", "Content Writing", "Copywriting",
  "Social Media Management", "SEO", "Search Engine Marketing (SEM)", "Brand Management",
  "Business Development", "Market Research", "Public Relations",
  // Tech / IT
  "Web Development", "Mobile App Development", "JavaScript", "TypeScript", "Python", "Java",
  "C++", "C#", "PHP", "React", "Angular", "Vue.js", "Node.js", "Django", "Docker", "Kubernetes",
  "Git / Version Control", "SQL / Databases", "Data Analysis", "Data Science", "Machine Learning",
  "Artificial Intelligence", "Natural Language Processing (NLP)", "Blockchain", "Statistical Analysis",
  "Cloud Computing (AWS / Azure / GCP)", "Cybersecurity", "Networking", "DevOps", "Quality Assurance",
  "Product Management", "Agile / Scrum", "Business Analysis",
  "UI / UX Design", "Graphic Design", "Video Editing", "Animation", "Photography", "Videography",
  "Adobe Photoshop", "Adobe Illustrator",
  // Business tools
  "Microsoft Excel", "Microsoft Office", "Microsoft Word", "Microsoft PowerPoint",
  "Accounting", "Financial Analysis", "Bookkeeping", "Taxation", "Auditing", "Budgeting",
  "Risk Management", "Inventory Management", "Strategic Planning", "Stock Trading / Investment",
  "Real Estate Sales",
  // HR / education
  "Human Resource Management", "Recruitment", "Teaching / Training", "Curriculum Design",
  "Mentoring", "Life Coaching", "Counseling", "Quran Teaching", "Islamic Jurisprudence Knowledge",
  "Islamic Finance", "Tajweed (Quran Recitation Rules)", "Hifz-ul-Quran (Memorization)",
  // Languages
  "Arabic Language", "Urdu Language", "Hindi Language", "English Language",
  "Translation & Interpretation",
  // Event / community
  "Event Management", "Fundraising", "Grant Writing", "Community Organizing",
  "Volunteer Coordination", "Anchoring / Hosting", "Content Strategy", "Email Marketing",
  // Legal
  "Legal Drafting", "Contract Management", "Legal Research",
  // Design / creative
  "Interior Designing", "Fashion Designing", "Henna / Mehndi Art",
  // Trades
  "Carpentry", "Plumbing", "Electrical Work", "Automobile Repair", "Driving",
  "First Aid / CPR", "Cooking", "Tailoring", "Welding", "Masonry", "HVAC Repair", "Landscaping",
  "Patient Care",
  "Other",
];

export async function ensureSkillDefaults() {
  const count = await Skill.count();
  if (count > 0) return;
  await Promise.all(DEFAULTS.map((name, i) => Skill.create({ name, sortOrder: i })));
}
