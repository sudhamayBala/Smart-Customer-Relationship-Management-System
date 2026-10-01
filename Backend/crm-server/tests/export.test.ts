import request from "supertest";
import { Response } from "express";
import exportProperties from "../src/controllers/exportController";

jest.mock("../src/services/exportService", () => ({
  __esModule: true,
  default: jest.fn()
}));

import exportService from "../src/services/exportService";

describe("Property Export", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should export properties for the authenticated tenant", async () => {
    const response = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as unknown as Response;

    const request = {
      user: {
        id: "user-1",
        tenantId: "tenant-1",
        role: "ADMIN"
      },
      query: {
        listingType: "SALE",
        type: "Apartment",
        bhk: "2,3",
        minPrice: "5000000",
        maxPrice: "15000000",
        locality: "Rajarhat",
        sortBy: "price",
        sortOrder: "asc",
      },
    } as any;

    (exportService as jest.Mock).mockResolvedValue(undefined);

    await exportProperties(request, response);

    expect(exportService).toHaveBeenCalledWith(
      {
        tenantId: "tenant-1",
        userId: "user-1",
        role: "ADMIN",
        search: undefined,
        listingType: "SALE",
        assigneeId: undefined,
        type: "Apartment",
        bhk: [2, 3],
        minPrice: 5000000,
        maxPrice: 15000000,
        locality: "Rajarhat",
        status: undefined,
        sortBy: "price",
        sortOrder: "asc",
      },
      response
    );
  });
});