import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const MasjidDonationAccount = sequelize.define(
  "MasjidDonationAccount",
  {
    masjidId: { type: DataTypes.INTEGER, allowNull: false },

    upiId: { type: DataTypes.STRING, allowNull: true },
    upiAccountHolder: { type: DataTypes.STRING, allowNull: true },

    bankName: { type: DataTypes.STRING, allowNull: true },
    accountHolderName: { type: DataTypes.STRING, allowNull: true },
    accountNumber: { type: DataTypes.STRING, allowNull: true },
    ifscCode: { type: DataTypes.STRING, allowNull: true },
    branchName: { type: DataTypes.STRING, allowNull: true },

    verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    tableName: "masjid_donation_accounts",
    indexes: [{ unique: true, fields: ["masjidId"], name: "masjid_donation_masjid_id_unique" }],
  }
);

export default MasjidDonationAccount;
