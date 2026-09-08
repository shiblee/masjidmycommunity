// Static place-name datasets for the synthetic visitor bot's geo
// distribution (syntheticVisitorService.js). These are plain geographic
// labels only — no personal or identity data of any kind — used to assign
// a believable city/country to a clearly-labeled synthetic session, never
// to represent a real person's location.

export const INDIA_CITIES = [
  { city: "Mumbai", state: "Maharashtra" },
  { city: "Pune", state: "Maharashtra" },
  { city: "Nagpur", state: "Maharashtra" },
  { city: "Delhi", state: "Delhi" },
  { city: "Bengaluru", state: "Karnataka" },
  { city: "Mysuru", state: "Karnataka" },
  { city: "Hyderabad", state: "Telangana" },
  { city: "Chennai", state: "Tamil Nadu" },
  { city: "Coimbatore", state: "Tamil Nadu" },
  { city: "Kolkata", state: "West Bengal" },
  { city: "Ahmedabad", state: "Gujarat" },
  { city: "Surat", state: "Gujarat" },
  { city: "Jaipur", state: "Rajasthan" },
  { city: "Jodhpur", state: "Rajasthan" },
  { city: "Lucknow", state: "Uttar Pradesh" },
  { city: "Kanpur", state: "Uttar Pradesh" },
  { city: "Bhopal", state: "Madhya Pradesh" },
  { city: "Indore", state: "Madhya Pradesh" },
  { city: "Patna", state: "Bihar" },
  { city: "Kochi", state: "Kerala" },
  { city: "Thiruvananthapuram", state: "Kerala" },
  { city: "Chandigarh", state: "Chandigarh" },
  { city: "Guwahati", state: "Assam" },
  { city: "Bhubaneswar", state: "Odisha" },
  { city: "Srinagar", state: "Jammu and Kashmir" },
].map((c) => ({ ...c, country: "India", countryCode: "IN", timezone: "Asia/Kolkata" }));

export const INTERNATIONAL_CITIES = [
  { city: "New York", country: "United States", countryCode: "US", timezone: "America/New_York" },
  { city: "Chicago", country: "United States", countryCode: "US", timezone: "America/Chicago" },
  { city: "San Francisco", country: "United States", countryCode: "US", timezone: "America/Los_Angeles" },
  { city: "London", country: "United Kingdom", countryCode: "GB", timezone: "Europe/London" },
  { city: "Birmingham", country: "United Kingdom", countryCode: "GB", timezone: "Europe/London" },
  { city: "Toronto", country: "Canada", countryCode: "CA", timezone: "America/Toronto" },
  { city: "Vancouver", country: "Canada", countryCode: "CA", timezone: "America/Vancouver" },
  { city: "Dubai", country: "United Arab Emirates", countryCode: "AE", timezone: "Asia/Dubai" },
  { city: "Abu Dhabi", country: "United Arab Emirates", countryCode: "AE", timezone: "Asia/Dubai" },
  { city: "Riyadh", country: "Saudi Arabia", countryCode: "SA", timezone: "Asia/Riyadh" },
  { city: "Jeddah", country: "Saudi Arabia", countryCode: "SA", timezone: "Asia/Riyadh" },
  { city: "Karachi", country: "Pakistan", countryCode: "PK", timezone: "Asia/Karachi" },
  { city: "Lahore", country: "Pakistan", countryCode: "PK", timezone: "Asia/Karachi" },
  { city: "Dhaka", country: "Bangladesh", countryCode: "BD", timezone: "Asia/Dhaka" },
  { city: "Kuala Lumpur", country: "Malaysia", countryCode: "MY", timezone: "Asia/Kuala_Lumpur" },
  { city: "Jakarta", country: "Indonesia", countryCode: "ID", timezone: "Asia/Jakarta" },
  { city: "Sydney", country: "Australia", countryCode: "AU", timezone: "Australia/Sydney" },
  { city: "Melbourne", country: "Australia", countryCode: "AU", timezone: "Australia/Melbourne" },
  { city: "Berlin", country: "Germany", countryCode: "DE", timezone: "Europe/Berlin" },
  { city: "Paris", country: "France", countryCode: "FR", timezone: "Europe/Paris" },
  { city: "Johannesburg", country: "South Africa", countryCode: "ZA", timezone: "Africa/Johannesburg" },
  { city: "Cairo", country: "Egypt", countryCode: "EG", timezone: "Africa/Cairo" },
  { city: "Istanbul", country: "Turkey", countryCode: "TR", timezone: "Europe/Istanbul" },
  { city: "Lagos", country: "Nigeria", countryCode: "NG", timezone: "Africa/Lagos" },
  { city: "Singapore", country: "Singapore", countryCode: "SG", timezone: "Asia/Singapore" },
  { city: "Doha", country: "Qatar", countryCode: "QA", timezone: "Asia/Qatar" },
  { city: "Muscat", country: "Oman", countryCode: "OM", timezone: "Asia/Muscat" },
];

export function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}
