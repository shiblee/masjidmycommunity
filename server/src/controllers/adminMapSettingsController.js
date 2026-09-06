import MapSettings from "../models/MapSettings.js";

export const getSettings = async (req, res) => {
  try {
    const settings = await MapSettings.findByPk(1);
    res.json({
      googleMapsApiKey: settings?.googleMapsApiKey || "",
      addressCountry: settings?.addressCountry || "",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const updates = {};
    if (req.body.googleMapsApiKey !== undefined) {
      updates.googleMapsApiKey = req.body.googleMapsApiKey.trim() || null;
    }
    if (req.body.addressCountry !== undefined) {
      const country = req.body.addressCountry.trim().toLowerCase();
      if (country && !/^[a-z]{2}$/.test(country)) {
        return res.status(400).json({ message: "Country must be a 2-letter code, e.g. \"in\"." });
      }
      updates.addressCountry = country || null;
    }

    const [settings] = await MapSettings.findOrCreate({ where: { id: 1 }, defaults: { id: 1, ...updates } });
    Object.assign(settings, updates);
    await settings.save();

    res.json({
      googleMapsApiKey: settings.googleMapsApiKey || "",
      addressCountry: settings.addressCountry || "",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
