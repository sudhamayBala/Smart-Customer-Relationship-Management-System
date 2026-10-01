import Property from "../src/models/Property";
import {
  getProperties,
  getPropertyById
} from "../src/services/propertyService";

jest.mock("../src/models/Property", () => ({
  findAndCountAll: jest.fn(),
  findOne: jest.fn()
}));

jest.mock("../src/services/cacheService", () => ({
  getPropertyCacheKey: jest.fn(() => "test-cache-key"),
  getCachedData: jest.fn().mockResolvedValue(null),
  setCachedData: jest.fn().mockResolvedValue(undefined),
  invalidatePropertyCache: jest.fn().mockResolvedValue(undefined)
}));

describe("Tenant Isolation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should include tenantId when listing properties", async () => {
    (Property.findAndCountAll as jest.Mock).mockResolvedValue({
      rows: [],
      count: 0
    });

    await getProperties({
      tenantId: "tenant-1",
      userId: "user-1",
      role: "ADMIN",
      page: 1,
      limit: 20
    });

    expect(Property.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-1"
        })
      })
    );
  });

  it("should include tenantId when getting a property", async () => {
    (Property.findOne as jest.Mock).mockResolvedValue(null);

    await getPropertyById(
      "tenant-1",
      "user-1",
      "ADMIN",
      "property-1"
    );

    expect(Property.findOne).toHaveBeenCalledWith({
      where: {
        id: "property-1",
        tenantId: "tenant-1"
      }
    });
  });

  it("should restrict agents to their own properties", async () => {
    (Property.findAndCountAll as jest.Mock).mockResolvedValue({
      rows: [],
      count: 0
    });

    await getProperties({
      tenantId: "tenant-1",
      userId: "agent-1",
      role: "AGENT",
      page: 1,
      limit: 20
    });

    expect(Property.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-1",
          assigneeId: "agent-1"
        })
      })
    );
  });
});