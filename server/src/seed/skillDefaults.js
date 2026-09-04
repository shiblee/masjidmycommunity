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
  "Web Development", "Mobile App Development", "JavaScript", "Python", "Java", "React",
  "Node.js", "SQL / Databases", "Data Analysis", "Data Science", "Machine Learning",
  "Cloud Computing (AWS / Azure / GCP)", "Cybersecurity", "Networking", "DevOps",
  "UI / UX Design", "Graphic Design", "Video Editing", "Animation",
  // Business tools
  "Microsoft Excel", "Microsoft Office", "Accounting", "Financial Analysis",
  "Bookkeeping", "Taxation", "Auditing",
  // HR / education
  "Human Resource Management", "Recruitment", "Teaching / Training", "Curriculum Design",
  "Mentoring", "Quran Teaching", "Islamic Jurisprudence Knowledge",
  // Languages
  "Arabic Language", "Urdu Language", "Hindi Language", "English Language",
  "Translation & Interpretation",
  // Event / community
  "Event Management", "Fundraising", "Community Organizing", "Volunteer Coordination",
  // Legal
  "Legal Drafting", "Contract Management", "Legal Research",
  // Trades
  "Carpentry", "Plumbing", "Electrical Work", "Automobile Repair", "Driving",
  "First Aid / CPR", "Cooking", "Tailoring",
  "Other",
];

export async function ensureSkillDefaults() {
  const count = await Skill.count();
  if (count > 0) return;
  await Promise.all(DEFAULTS.map((name, i) => Skill.create({ name, sortOrder: i })));
}
