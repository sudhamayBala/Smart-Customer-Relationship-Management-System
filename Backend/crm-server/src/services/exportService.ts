import ExcelJS from "exceljs";
import { Writable } from "stream";
import Property from "../models/Property";
import { buildPropertyWhere, PropertyFilters } from "./propertyService";

const exportProperties = async (
  filters: PropertyFilters,
  response: Writable
) => {
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: response,
    useStyles: false,
    useSharedStrings: false,
  });

  const worksheet = workbook.addWorksheet("Properties");

  worksheet.columns = [
    { header: "ID", key: "id", width: 38 },
    { header: "Title", key: "title", width: 30 },
    { header: "Type", key: "type", width: 16 },
    { header: "Listing Type", key: "listingType", width: 15 },
    { header: "Locality", key: "locality", width: 20 },
    { header: "BHK", key: "bhk", width: 10 },
    { header: "Area", key: "area", width: 15 },
    { header: "Price", key: "price", width: 15 },
    { header: "Status", key: "status", width: 18 },
    { header: "Amenities", key: "amenities", width: 28 },
    { header: "Building Name", key: "buildingName", width: 25 },
    { header: "Unit No", key: "unitNo", width: 15 },
    { header: "Owner Name", key: "ownerName", width: 25 },
    { header: "Owner Phone", key: "ownerPhone", width: 20 },
    { header: "Assignee ID", key: "assigneeId", width: 38 },
    { header: "Version", key: "version", width: 10 },
  ];

  const batchSize = 500;
  let offset = 0;
  const where = buildPropertyWhere(filters);
  const sortFields = new Set([
    "title", "type", "locality", "bhk", "area", "price", "status", "createdAt", "updatedAt",
  ]);
  const sortBy = filters.sortBy && sortFields.has(filters.sortBy)
    ? filters.sortBy
    : "createdAt";
  const sortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";

  while (true) {
    const properties = await Property.findAll({
      where,
      order: [[sortBy, sortOrder]],
      limit: batchSize,
      offset,
    });

    if (properties.length === 0) {
      break;
    }

    for (const property of properties) {
      worksheet.addRow({
        id: property.id,
        title: property.title,
        type: property.type,
        listingType: property.listingType,
        locality: property.locality,
        bhk: property.bhk,
        area: property.area,
        price: property.price,
        status: property.status,
        amenities: (property.amenities || []).join(", "),
        buildingName: property.buildingName,
        unitNo: property.unitNo,
        ownerName: property.ownerName,
        ownerPhone: property.ownerPhone,
        assigneeId: property.assigneeId,
        version: property.version,
      }).commit();
    }

    offset += properties.length;

    if (properties.length < batchSize) {
      break;
    }
  }

  worksheet.commit();

  await workbook.commit();
};

export default exportProperties;