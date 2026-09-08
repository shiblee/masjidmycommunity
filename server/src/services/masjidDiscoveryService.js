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

async function getBotUser() {
  const user = await User.findOne({ where: { email: MASJID_BOT_EMAIL } });
  if (!user) throw new Error("Masjid Bot system user is not seeded.");
  return user;
}

async function writeTranslations(masjidId, name, about) {
  for (const lang of TRANSLATION_LANGUAGES) {
    for (const [field, text] of [["name", name], ["about", about]]) {
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

  const descriptionResult = await generateMasjidDescription({
    name, city: address.city, state: address.state, country: address.country, category: null,
  }).catch(() => null);
  const about = descriptionResult?.description
    || `${name} is a mosque located in ${[address.city, address.country].filter(Boolean).join(", ") || "an area found via Google Places"}.`;

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
        actorName: "Masjid My Community — Automated Import",
        note: `Discovered via Google Places (Place ID ${details.id}). Data completeness ${completeness}%.`,
      },
      { transaction: t }
    );

    return masjid;
  });

  await writeTranslations(result.id, name, about).catch(() => {});

  return { id: result.id, name, city: address.city, country: address.country, status: result.status, dataCompletenessPercent: completeness, photoCount: photos.length };
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
