import Company from "../models/Company.js";

const DEFAULTS = [
  // IT / software services
  "Tata Consultancy Services (TCS)", "Infosys", "Wipro", "HCLTech", "Tech Mahindra", "Cognizant",
  "Capgemini India", "Accenture India", "IBM India", "LTIMindtree", "Mphasis", "Persistent Systems",
  "Hexaware Technologies", "L&T Technology Services", "Zensar Technologies", "Cyient", "Birlasoft",
  "Coforge", "Happiest Minds Technologies",
  // Global tech / product (India offices)
  "Google India", "Microsoft India", "Amazon India", "Meta India", "Apple India", "Adobe India",
  "Oracle India", "SAP India", "Salesforce India", "VMware India", "Cisco India", "Intel India",
  "Qualcomm India", "Samsung R&D India", "Dell Technologies India", "HP India", "NVIDIA India",
  "Uber India", "Netflix India", "LinkedIn India",
  // Indian startups / unicorns
  "Flipkart", "Zomato", "Swiggy", "Paytm", "Ola", "PhonePe", "BYJU'S", "Nykaa", "PolicyBazaar",
  "Freshworks", "Zoho Corporation", "Razorpay", "CRED", "Meesho", "Udaan", "Delhivery", "Dream11",
  "Unacademy", "upGrad", "Groww", "Zerodha", "Lenskart", "BigBasket", "Urban Company", "InMobi",
  "Postman", "BrowserStack", "Innovaccer", "Physics Wallah", "Vedantu",
  // Banking
  "State Bank of India (SBI)", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank",
  "Punjab National Bank", "Bank of Baroda", "IndusInd Bank", "Yes Bank", "IDFC First Bank",
  "Canara Bank", "Union Bank of India", "Bandhan Bank",
  // Insurance & NBFC
  "Life Insurance Corporation of India (LIC)", "HDFC Life", "ICICI Prudential Life Insurance",
  "SBI Life Insurance", "Bajaj Finance", "Bajaj Finserv", "Muthoot Finance", "Shriram Finance",
  // Conglomerates
  "Tata Group", "Reliance Industries", "Aditya Birla Group", "Mahindra Group", "Adani Group",
  "Bajaj Group", "Godrej Group", "ITC Limited", "Larsen & Toubro (L&T)", "JSW Group",
  // FMCG
  "Hindustan Unilever (HUL)", "Nestlé India", "Procter & Gamble India", "Britannia Industries",
  "Dabur India", "Marico", "Colgate-Palmolive India", "Patanjali Ayurved", "Amul (GCMMF)",
  // Automotive
  "Maruti Suzuki India", "Tata Motors", "Mahindra & Mahindra", "Hyundai Motor India", "Bajaj Auto",
  "Hero MotoCorp", "TVS Motor Company", "Ashok Leyland", "Honda Cars India",
  // Telecom
  "Reliance Jio", "Bharti Airtel", "Vodafone Idea (Vi)", "BSNL",
  // E-commerce & retail
  "Reliance Retail", "DMart (Avenue Supermarts)", "Tata CLiQ", "Myntra", "Shoppers Stop",
  // Healthcare & pharma
  "Apollo Hospitals", "Fortis Healthcare", "Max Healthcare", "Sun Pharmaceutical",
  "Dr. Reddy's Laboratories", "Cipla", "Lupin", "Aurobindo Pharma", "Biocon",
  // PSU / government / defence
  "Indian Railways", "Indian Oil Corporation (IOCL)", "Oil and Natural Gas Corporation (ONGC)",
  "NTPC Limited", "Coal India Limited", "Bharat Heavy Electricals Limited (BHEL)",
  "Steel Authority of India (SAIL)", "Bharat Electronics Limited (BEL)",
  "Hindustan Aeronautics Limited (HAL)", "Indian Space Research Organisation (ISRO)",
  "Defence Research and Development Organisation (DRDO)", "Government of India", "State Government",
  // Consulting / professional services
  "Deloitte India", "EY (Ernst & Young) India", "KPMG India", "PwC India",
  "McKinsey & Company India", "Boston Consulting Group (BCG) India", "Bain & Company India",
  // Media & entertainment
  "Zee Entertainment Enterprises", "Sony Pictures Networks India", "Star India",
  "Times Internet", "Network18",
  // Aviation
  "Air India", "IndiGo (InterGlobe Aviation)", "SpiceJet", "Vistara",
  // Self / other
  "Self-Employed / Freelance", "Other",
];

export async function ensureCompanyDefaults() {
  const count = await Company.count();
  if (count > 0) return;
  await Promise.all(DEFAULTS.map((name, i) => Company.create({ name, sortOrder: i })));
}
