import { DataTypes } from "sequelize";
import sequelize from "./database";

const ensurePropertySchema = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const columns = await queryInterface.describeTable("properties");

  if (!columns.type) {
    await queryInterface.addColumn("properties", "type", {
      type: DataTypes.STRING(80),
      allowNull: false,
      defaultValue: "Apartment",
    });
  }

  if (!columns.locality) {
    await queryInterface.addColumn("properties", "locality", {
      type: DataTypes.STRING(150),
      allowNull: true,
    });
  }

  if (!columns.city) {
    await queryInterface.addColumn("properties", "city", {
      type: DataTypes.STRING(100),
      allowNull: true,
    });
  }

  if (!columns.address) {
    await queryInterface.addColumn("properties", "address", {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  }

  if (!columns.floor) {
    await queryInterface.addColumn("properties", "floor", {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
  }

  if (!columns.total_floors) {
    await queryInterface.addColumn("properties", "total_floors", {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
  }

  if (!columns.furnishing) {
    await queryInterface.addColumn("properties", "furnishing", {
      type: DataTypes.STRING(60),
      allowNull: true,
    });
  }

  if (!columns.facing) {
    await queryInterface.addColumn("properties", "facing", {
      type: DataTypes.STRING(40),
      allowNull: true,
    });
  }

  if (!columns.listed_price) {
    await queryInterface.addColumn("properties", "listed_price", {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
    });
    await queryInterface.sequelize.query(
      "UPDATE properties SET listed_price = price WHERE listed_price IS NULL"
    );
  }

  if (!columns.status) {
    await queryInterface.addColumn("properties", "status", {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "Listed",
    });
  }

  if (!columns.amenities) {
    await queryInterface.addColumn("properties", "amenities", {
      type: DataTypes.JSON,
      allowNull: true,
    });
  }

  const masterDataColumns = await queryInterface.describeTable("master_data");
  if (!masterDataColumns.is_terminal) {
    await queryInterface.addColumn("master_data", "is_terminal", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  }
};

export default ensurePropertySchema;