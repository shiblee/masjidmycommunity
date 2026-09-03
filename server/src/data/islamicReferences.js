// Curated, verified references only — the AI is never allowed to write or
// paraphrase scripture (enforced in the aiProviderService system prompt).
// This is the only source an "Ask AI" answer may attach a reference from,
// and only via a plain keyword match (knowledgeRetrievalService), never via
// model generation. Extends the same references already vetted and shipped
// on the About Us / Contact / Raise a Concern pages — not new sourcing.
export const ISLAMIC_REFERENCES = [
  {
    type: "Hadith",
    arabic: "مَنْ بَنَى مَسْجِدًا لِلَّهِ بَنَى اللَّهُ لَهُ بَيْتًا فِي الْجَنَّةِ",
    translation: "Whoever builds a masjid for the sake of Allah, Allah will build for him a house in Paradise.",
    source: "Sahih Muslim 533",
    keywords: ["build", "masjid", "construction", "register", "registration", "empower", "empowerment"],
  },
  {
    type: "Qur'an",
    arabic: "مَّثَلُ الَّذِينَ يُنفِقُونَ أَمْوَالَهُمْ فِي سَبِيلِ اللَّهِ كَمَثَلِ حَبَّةٍ أَنبَتَتْ سَبْعَ سَنَابِلَ فِي كُلِّ سُنبُلَةٍ مِّائَةُ حَبَّةٍ",
    translation:
      "The example of those who spend their wealth in the way of Allah is like a seed which grows seven spikes; in each spike is a hundred grains.",
    source: "Surah Al-Baqarah 2:261",
    keywords: ["donate", "donation", "spend", "zakat", "sadaqah", "charity", "give", "fund", "funding"],
  },
  {
    type: "Qur'an",
    arabic: "وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا وَلَا تَفَرَّقُوا",
    translation: "And hold firmly to the rope of Allah, all together, and do not become divided.",
    source: "Surah Ali 'Imran 3:103",
    keywords: ["community", "unity", "together", "cooperation", "connect"],
  },
  {
    type: "Hadith",
    arabic: "مَن دَلَّ عَلَى خَيْرٍ فَلَهُ مِثْلُ أَجْرِ فَاعِلِهِ",
    translation: "Whoever guides someone to goodness will have a reward like the one who did it.",
    source: "Sahih Muslim 1893",
    keywords: ["help", "guide", "support", "volunteer", "getting started"],
  },
  {
    type: "Hadith",
    arabic: "مَنْ رَأَى مِنْكُمْ مُنْكَرًا فَلْيُغَيِّرْهُ بِيَدِهِ، فَإِنْ لَمْ يَسْتَطِعْ فَبِلِسَانِهِ",
    translation: "Whoever among you sees a wrong, let him change it with his hand; if he cannot, then with his tongue.",
    source: "Sahih Muslim 49",
    keywords: ["concern", "report", "trust", "safety", "moderation", "raise a concern"],
  },
];
