import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const MasjidDonationAccount = sequelize.define(
  "MasjidDonationAccount",
  {
    masjidId: { type: DataTypes.INTEGER, allowNull: false },

    upiId: { type: DataTypes.STRING, allowNull: true },
    upiAccountHolder: { type: DataTypes.STRING, allowNull: true },

    // bankId is the source of truth once set (resolved server-side from the
    // Bank dropdown, never taken as free text from the client); bankName is
    // kept alongside it, denormalized, so admin's existing usage-count-by-
    // name reporting (adminBankController.js) keeps working unchanged even
    // if a bank is later renamed or removed from the master list.
    bankId: { type: DataTypes.INTEGER, allowNull: true },
    bankName: { type: DataTypes.STRING, allowNull: true },
    accountHolderName: { type: DataTypes.STRING, allowNull: true },
    accountNumber: { type: DataTypes.STRING, allowNull: true },
    ifscCode: { type: DataTypes.STRING, allowNull: true },
    // Always server-derived from a verified IFSC lookup (ifscLookupService.js)
    // — never accepted as free text from the client, so it can't drift out
    // of sync with the IFSC it was resolved from.
    branchName: { type: DataTypes.STRING, allowNull: true },
    branchAddress: { type: DataTypes.STRING, allowNull: true },
    branchCity: { type: DataTypes.STRING, allowNull: true },
    branchState: { type: DataTypes.STRING, allowNull: true },

    verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    tableName: "masjid_donation_accounts",
    indexes: [{ unique: true, fields: ["masjidId"], name: "masjid_donation_masjid_id_unique" }],
  }
);

export default MasjidDonationAccount;
