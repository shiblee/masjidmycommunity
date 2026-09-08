// Static place-name datasets shared by the synthetic visitor bot
// (syntheticVisitorService.js) and the synthetic user generator
// (syntheticUserGeneratorService.js). These are plain geographic labels
// only — no personal or identity data of any kind — used to assign a
// believable city/country (and, for User accounts, approximate
// coordinates matching User.locationLat/Lng) to clearly-labeled synthetic
// records, never to represent a real person's location.

export const INDIA_CITIES = [
  { city: "Mumbai", state: "Maharashtra", lat: 19.076, lng: 72.8777 },
  { city: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567 },
  { city: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882 },
  { city: "Delhi", state: "Delhi", lat: 28.7041, lng: 77.1025 },
  { city: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946 },
  { city: "Mysuru", state: "Karnataka", lat: 12.2958, lng: 76.6394 },
  { city: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867 },
  { city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707 },
  { city: "Coimbatore", state: "Tamil Nadu", lat: 11.0168, lng: 76.9558 },
  { city: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639 },
  { city: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714 },
  { city: "Surat", state: "Gujarat", lat: 21.1702, lng: 72.8311 },
  { city: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873 },
  { city: "Jodhpur", state: "Rajasthan", lat: 26.2389, lng: 73.0243 },
  { city: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462 },
  { city: "Kanpur", state: "Uttar Pradesh", lat: 26.4499, lng: 80.3319 },
  { city: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126 },
  { city: "Indore", state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577 },
  { city: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376 },
  { city: "Kochi", state: "Kerala", lat: 9.9312, lng: 76.2673 },
  { city: "Thiruvananthapuram", state: "Kerala", lat: 8.5241, lng: 76.9366 },
  { city: "Chandigarh", state: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  { city: "Guwahati", state: "Assam", lat: 26.1445, lng: 91.7362 },
  { city: "Bhubaneswar", state: "Odisha", lat: 20.2961, lng: 85.8245 },
  { city: "Srinagar", state: "Jammu and Kashmir", lat: 34.0837, lng: 74.7973 },
].map((c) => ({ ...c, country: "India", countryCode: "IN", timezone: "Asia/Kolkata" }));

export const INTERNATIONAL_CITIES = [
  { city: "New York", country: "United States", countryCode: "US", timezone: "America/New_York", lat: 40.7128, lng: -74.006 },
  { city: "Chicago", country: "United States", countryCode: "US", timezone: "America/Chicago", lat: 41.8781, lng: -87.6298 },
  { city: "San Francisco", country: "United States", countryCode: "US", timezone: "America/Los_Angeles", lat: 37.7749, lng: -122.4194 },
  { city: "London", country: "United Kingdom", countryCode: "GB", timezone: "Europe/London", lat: 51.5072, lng: -0.1276 },
  { city: "Birmingham", country: "United Kingdom", countryCode: "GB", timezone: "Europe/London", lat: 52.4862, lng: -1.8904 },
  { city: "Toronto", country: "Canada", countryCode: "CA", timezone: "America/Toronto", lat: 43.6532, lng: -79.3832 },
  { city: "Vancouver", country: "Canada", countryCode: "CA", timezone: "America/Vancouver", lat: 49.2827, lng: -123.1207 },
  { city: "Dubai", country: "United Arab Emirates", countryCode: "AE", timezone: "Asia/Dubai", lat: 25.2048, lng: 55.2708 },
  { city: "Abu Dhabi", country: "United Arab Emirates", countryCode: "AE", timezone: "Asia/Dubai", lat: 24.4539, lng: 54.3773 },
  { city: "Riyadh", country: "Saudi Arabia", countryCode: "SA", timezone: "Asia/Riyadh", lat: 24.7136, lng: 46.6753 },
  { city: "Jeddah", country: "Saudi Arabia", countryCode: "SA", timezone: "Asia/Riyadh", lat: 21.4858, lng: 39.1925 },
  { city: "Karachi", country: "Pakistan", countryCode: "PK", timezone: "Asia/Karachi", lat: 24.8607, lng: 67.0011 },
  { city: "Lahore", country: "Pakistan", countryCode: "PK", timezone: "Asia/Karachi", lat: 31.5497, lng: 74.3436 },
  { city: "Dhaka", country: "Bangladesh", countryCode: "BD", timezone: "Asia/Dhaka", lat: 23.8103, lng: 90.4125 },
  { city: "Kuala Lumpur", country: "Malaysia", countryCode: "MY", timezone: "Asia/Kuala_Lumpur", lat: 3.139, lng: 101.6869 },
  { city: "Jakarta", country: "Indonesia", countryCode: "ID", timezone: "Asia/Jakarta", lat: -6.2088, lng: 106.8456 },
  { city: "Sydney", country: "Australia", countryCode: "AU", timezone: "Australia/Sydney", lat: -33.8688, lng: 151.2093 },
  { city: "Melbourne", country: "Australia", countryCode: "AU", timezone: "Australia/Melbourne", lat: -37.8136, lng: 144.9631 },
  { city: "Berlin", country: "Germany", countryCode: "DE", timezone: "Europe/Berlin", lat: 52.52, lng: 13.405 },
  { city: "Paris", country: "France", countryCode: "FR", timezone: "Europe/Paris", lat: 48.8566, lng: 2.3522 },
  { city: "Johannesburg", country: "South Africa", countryCode: "ZA", timezone: "Africa/Johannesburg", lat: -26.2041, lng: 28.0473 },
  { city: "Cairo", country: "Egypt", countryCode: "EG", timezone: "Africa/Cairo", lat: 30.0444, lng: 31.2357 },
  { city: "Istanbul", country: "Turkey", countryCode: "TR", timezone: "Europe/Istanbul", lat: 41.0082, lng: 28.9784 },
  { city: "Lagos", country: "Nigeria", countryCode: "NG", timezone: "Africa/Lagos", lat: 6.5244, lng: 3.3792 },
  { city: "Singapore", country: "Singapore", countryCode: "SG", timezone: "Asia/Singapore", lat: 1.3521, lng: 103.8198 },
  { city: "Doha", country: "Qatar", countryCode: "QA", timezone: "Asia/Qatar", lat: 25.2854, lng: 51.531 },
  { city: "Muscat", country: "Oman", countryCode: "OM", timezone: "Asia/Muscat", lat: 23.588, lng: 58.3829 },
];

export function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}
