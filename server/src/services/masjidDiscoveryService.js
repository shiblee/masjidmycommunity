import { sequelize } from "../config/db.js";
import Masjid from "../models/Masjid.js";
import MasjidPhoto from "../models/MasjidPhoto.js";
import MasjidHistory from "../models/MasjidHistory.js";
import MasjidImportSource from "../models/MasjidImportSource.js";
import User from "../models/User.js";
import Translation from "../models/Translation.js";
import { generateUniqueSlug } from "../utils/slugify.js";
import { INDIA_CITIES, INTERNATIONAL_CITIES, pickRandom } from "../constants/syntheticGeo.js";
import { MASJID_BOT_EMAIL } from "../seed/masjidBotUserDefaults.js";
import { searchMosques, getPlaceDetails } from "./googlePlacesService.js";
import { checkForDuplicate } from "./masjidDuplicateDetectionService.js";
import { generateMasjidDescription, generateTranslation } from "./aiProviderService.js";
import { ensurePrayerScheduleForMasjid } from "./prayerCalculationEngine.js";
import { ensureMasjidRegisteredActivity } from "../seed/masjidRegisteredActivityBackfill.js";

const MAX_PHOTOS_PER_IMPORT = 5;
const TRANSLATION_LANGUAGES = ["hi", "ur", "ar"];

// Google's addressComponents (New) are typed by a `types` array, not a
// fixed field name — pulls out just the pieces Masjid.js's own address
// fields already model, everything else (route, sublocality, etc.) is
// folded into `formattedAddress` instead, same as a real user's manual
// address entry does today.
function parseAddressComponents(components = []) {
  const byType = (type) => components.find((c) => c.types?.includes(type))?.longText || null;
  return {
    area: byType("sublocality") || byType("neighborhood"),
    city: byType("locality") || byType("administrative_area_level_2"),
    district: byType("administrative_area_level_2"),
    state: byType("administrative_area_level_1"),
    country: byType("country"),
    postalCode: byType("postal_code"),
  };
}

function dataCompletenessOf({ address, city, state, country, phone, website, photoCount }) {
  const checks = [!!address, !!city, !!state, !!country, !!phone, !!website, photoCount > 0];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

const LANDMARK_TYPES = ["historical_landmark", "historical_place", "tourist_attraction"];

// Used when AI text-polish isn't available (or fails) — every sentence
// here is either a directly-confirmed fact (name, address) or a general
// statement true of any mosque (prayer, community role), never a specific
// invented claim about this one. Richer than a single bare fact sentence
// on purpose, since a one-liner reads as too thin for a real directory
// listing.
// Google's formattedAddress for well-known landmarks often repeats the
// place's own name as its first line (e.g. "Badshahi Mosque, Badshahi
// Mosque, Fort Rd, ..."), which would otherwise duplicate awkwardly right
// after "<name> is a mosque located at <address>".
function stripLeadingNameFromAddress(name, formattedAddress) {
  if (!formattedAddress || !name) return formattedAddress;
  const prefix = `${name}, `;
  let result = formattedAddress;
  // Some places (seen on a real import) repeat the name twice in Google's
  // own formattedAddress — strip every leading occurrence, not just one.
  while (result.toLowerCase().startsWith(prefix.toLowerCase())) {
    result = result.slice(prefix.length);
  }
  return result;
}

function buildFallbackMasjidCopy({ name, formattedAddress, city, state, country, placeTypes }) {
  const location = stripLeadingNameFromAddress(name, formattedAddress) || [city, state, country].filter(Boolean).join(", ");
  const isLandmark = (placeTypes || []).some((t) => LANDMARK_TYPES.includes(t));

  const tagline = `Mosque in ${[city, country].filter(Boolean).join(", ") || "the local area"}`.slice(0, 80);

  const sentences = [
    `${name} is a mosque${location ? ` located at ${location}` : ""}.`,
    "As a place of worship, it serves the local Muslim community as a center for daily prayers, the Friday (Jumu'ah) congregational prayer, and communal gatherings.",
  ];
  if (isLandmark) sentences.push(`${name} is also recognized as a place of local historical or cultural interest.`);
  sentences.push("Prayer times, photos, and further details for this masjid are being added on Masjid My Community.");

  return { tagline, description: sentences.join(" ") };
}

async function getBotUser() {
  const user = await User.findOne({ where: { email: MASJID_BOT_EMAIL } });
  if (!user) throw new Error("Masjid Bot system user is not seeded.");
  return user;
}

async function writeTranslations(masjidId, name, tagline, about) {
  for (const lang of TRANSLATION_LANGUAGES) {
    for (const [field, text] of [["name", name], ["tagline", tagline], ["about", about]]) {
      if (!text) continue;
      const result = await generateTranslation({ text, targetLanguageCode: lang }).catch(() => null);
      if (!result?.translated) continue;
      await Translation.upsert({ key: `masjid.${field}.${masjidId}`, category: "masjid", languageCode: lang, value: result.translated });
    }
  }
}

/** Imports one place: fetches full details, writes Masjid + MasjidImportSource
 * + MasjidPhoto rows in a transaction, then best-effort AI description and
 * translations outside it (never blocking the write on AI availability). */
async function importPlace(place, { autoPublish }) {
  const details = await getPlaceDetails(place.id);
  const address = parseAddressComponents(details.addressComponents);
  const name = details.displayName?.text || place.displayName?.text || "Unnamed Masjid";
  const photos = (details.photos || []).slice(0, MAX_PHOTOS_PER_IMPORT);

  const botUser = await getBotUser();
  const slug = await generateUniqueSlug(Masjid, name, { fallback: "masjid" });

  const placeTypes = details.types || [];
  const cleanedAddress = stripLeadingNameFromAddress(name, details.formattedAddress);
  const descriptionResult = await generateMasjidDescription({
    name, address: cleanedAddress, city: address.city, state: address.state, country: address.country, category: null, placeTypes,
  }).catch(() => null);
  const fallbackCopy = buildFallbackMasjidCopy({ name, formattedAddress: details.formattedAddress, city: address.city, state: address.state, country: address.country, placeTypes });
  const tagline = descriptionResult?.tagline || fallbackCopy.tagline;
  const about = descriptionResult?.description || fallbackCopy.description;

  const completeness = dataCompletenessOf({
    address: details.formattedAddress, city: address.city, state: address.state, country: address.country,
    phone: details.internationalPhoneNumber, website: details.websiteUri, photoCount: photos.length,
  });

  const result = await sequelize.transaction(async (t) => {
    const masjid = await Masjid.create(
      {
        userId: botUser.id,
        creationMethod: "bot_import",
        name,
        slug,
        tagline,
        about,
        category: "Other",
        address: details.formattedAddress || null,
        area: address.area,
        city: address.city,
        district: address.district,
        state: address.state,
        country: address.country,
        postalCode: address.postalCode,
        formattedAddress: details.formattedAddress || null,
        latitude: details.location?.latitude ?? null,
        longitude: details.location?.longitude ?? null,
        placeId: details.id,
        status: autoPublish ? "approved" : "under_review",
        submittedAt: new Date(),
        reviewedAt: autoPublish ? new Date() : null,
        approvedAt: autoPublish ? new Date() : null,
      },
      { transaction: t }
    );

    await MasjidImportSource.create(
      {
        masjidId: masjid.id,
        source: "google_places",
        placeId: details.id,
        rawPlaceTypes: details.types || [],
        dataCompletenessPercent: completeness,
        duplicateCheckResult: "passed",
        sourceRefreshedAt: new Date(),
        importedAt: new Date(),
      },
      { transaction: t }
    );

    for (let i = 0; i < photos.length; i++) {
      // url references the photo row's own id, so it's created with a
      // placeholder first, then updated once that id exists.
      const photoRow = await MasjidPhoto.create(
        {
          masjidId: masjid.id,
          url: "",
          mediaType: "photo",
          category: i === 0 ? "exterior" : "other",
          isCover: i === 0,
          sortOrder: i,
          sourceType: "google_places",
          sourcePhotoReference: photos[i].name,
          attributionText: photos[i].authorAttributions?.[0]?.displayName
            ? `Photo: ${photos[i].authorAttributions[0].displayName}, via Google Maps`
            : "Photo via Google Maps",
        },
        { transaction: t }
      );
      photoRow.url = `/api/masjids/photos/${photoRow.id}/media`;
      await photoRow.save({ transaction: t });
    }

    await MasjidHistory.create(
      {
        masjidId: masjid.id,
        action: autoPublish ? "bot_imported_and_published" : "bot_imported",
        actorType: "bot",
        actorName: "Masjid My Community",
        note: `Discovered via Google Places (Place ID ${details.id}). Data completeness ${completeness}%.`,
      },
      { transaction: t }
    );

    return masjid;
  });

  await writeTranslations(result.id, name, tagline, about).catch(() => {});
  await ensurePrayerScheduleForMasjid(result.id).catch((e) => console.error("ensurePrayerScheduleForMasjid failed:", e.message));
  // Only when autoPublish actually landed this masjid at "approved" — a
  // Wall post linking to a still-under_review profile would 404. If it's
  // approved later via the admin review flow instead, that path creates the
  // post at that point (same idempotent function, so never a duplicate).
  if (result.status === "approved") {
    await ensureMasjidRegisteredActivity(result.id).catch((e) => console.error("ensureMasjidRegisteredActivity failed:", e.message));
  }

  return { id: result.id, name, city: address.city, country: address.country, status: result.status, dataCompletenessPercent: completeness, photoCount: photos.length };
}

/** Regenerates tagline/about for existing bot-imported masjids using the
 * current (improved) copy-generation logic — entirely from data already
 * in the database (Masjid + MasjidImportSource.rawPlaceTypes), no Google
 * API calls needed. Used once as a one-time catch-up after the copy logic
 * was improved; safe to call again any time it improves further. Skips a
 * masjid if an admin has since manually edited its tagline/about away from
 * the original bot-generated text (best-effort heuristic: only touches
 * masjids still at status "under_review" or ones never edited since
 * import — approximated here by only ever running this immediately after
 * a code change, not as a recurring job). */
export async function backfillMasjidCopy() {
  const masjids = await Masjid.findAll({ where: { creationMethod: "bot_import" } });
  let updated = 0;
  for (const masjid of masjids) {
    const source = await MasjidImportSource.findOne({ where: { masjidId: masjid.id } });
    const placeTypes = source?.rawPlaceTypes || [];
    const cleanedAddress = stripLeadingNameFromAddress(masjid.name, masjid.formattedAddress);
    const descriptionResult = await generateMasjidDescription({
      name: masjid.name, address: cleanedAddress, city: masjid.city, state: masjid.state, country: masjid.country, category: null, placeTypes,
    }).catch(() => null);
    const fallbackCopy = buildFallbackMasjidCopy({ name: masjid.name, formattedAddress: masjid.formattedAddress, city: masjid.city, state: masjid.state, country: masjid.country, placeTypes });
    masjid.tagline = descriptionResult?.tagline || fallbackCopy.tagline;
    masjid.about = descriptionResult?.description || fallbackCopy.description;
    await masjid.save();
    await writeTranslations(masjid.id, masjid.name, masjid.tagline, masjid.about).catch(() => {});
    updated += 1;
  }
  return { updated };
}

/** One full discovery cycle: pick a search center, search, dedup-check
 * every result, import the first genuinely-new one found. Returns null if
 * nothing new was found this cycle (common once an area is well-covered) —
 * that's a normal outcome, not an error. */
export async function runDiscoveryCycle(settings) {
  const isIndia = Math.random() * 100 < settings.indiaPercent;
  const geo = pickRandom(isIndia ? INDIA_CITIES : INTERNATIONAL_CITIES);
  const query = `mosque in ${geo.city}`;

  const places = await searchMosques({ query, lat: geo.lat, lng: geo.lng });

  for (const place of places) {
    const dup = await checkForDuplicate({
      name: place.displayName?.text,
      lat: place.location?.latitude,
      lng: place.location?.longitude,
      placeId: place.id,
    });
    if (dup.isDuplicate) continue;

    return importPlace(place, { autoPublish: settings.autoPublish });
  }

  return null;
}
