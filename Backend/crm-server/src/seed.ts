import { createHash } from "crypto";
import { sequelize } from "./models";
import User from "./models/User";
import Property from "./models/Property";

const uuidFor = (value: string) => {
  const hex = createHash("sha256")
    .update(value)
    .digest("hex");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(
    13,
    16
  )}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

const seed = async () => {
  try {
    await sequelize.authenticate();

    await sequelize.sync();

    const tenants = [
      {
        id: uuidFor("tenant-1"),
        name: "PropFlow Agency One",
      },
      {
        id: uuidFor("tenant-2"),
        name: "PropFlow Agency Two",
      },
    ];

    for (const tenant of tenants) {
      const users = [
        {
          id: uuidFor(`${tenant.id}-super-admin`),
          tenantId: tenant.id,
          name: "Super Admin",
          email: `superadmin@${tenant.id}.com`,
          role: "SUPER_ADMIN" as const,
        },
        {
          id: uuidFor(`${tenant.id}-admin`),
          tenantId: tenant.id,
          name: "Admin",
          email: `admin@${tenant.id}.com`,
          role: "ADMIN" as const,
        },
        {
          id: uuidFor(`${tenant.id}-manager`),
          tenantId: tenant.id,
          name: "Manager",
          email: `manager@${tenant.id}.com`,
          role: "MANAGER" as const,
        },
        {
          id: uuidFor(`${tenant.id}-agent`),
          tenantId: tenant.id,
          name: "Agent",
          email: `agent@${tenant.id}.com`,
          role: "AGENT" as const,
        },
      ];

      for (const user of users) {
        await User.findOrCreate({
          where: {
            id: user.id,
          },
          defaults: user,
        });
      }
    }

    const existingProperties = await Property.count();

    if (existingProperties < 10000) {
      const propertiesToCreate = 10000 - existingProperties;
      const batchSize = 500;

      for (
        let start = 0;
        start < propertiesToCreate;
        start += batchSize
      ) {
        const end = Math.min(
          start + batchSize,
          propertiesToCreate
        );

        const batch = [];

        for (let index = start; index < end; index++) {
          const tenantNumber =
            (index % 2) + 1;

          const tenantId =
            `tenant-${tenantNumber}`;

          const agentId = uuidFor(
            `${tenantId}-agent`
          );

          batch.push({
            tenantId,
            title: `Property ${index + 1}`,
              listingType:
                index % 2 === 0
                  ? ("SALE" as const)
                  : ("RENT" as const),
            bhk: (index % 4) + 1,
            area: 700 + (index % 2500),
            price:
              1500000 +
              ((index % 1000) * 10000),
            buildingName:
              `Building ${index + 1}`,
            unitNo:
              `Unit-${index + 1}`,
            ownerName:
              `Owner ${index + 1}`,
            ownerPhone:
              `900000${String(
                (index + 1) % 1000000
              ).padStart(6, "0")}`,
            assigneeId: agentId,
            version: 1,
          });
        }

        await Property.bulkCreate(batch);
      }
    }

    console.log(
      "CRM seed completed successfully"
    );
    console.log(
      "Tenants seeded: 2"
    );
    console.log(
      "Users seeded: 8"
    );
    console.log(
      "Properties available: 10000+"
    );
  } catch (error) {
    console.error(
      "CRM seed failed:",
      error
    );
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

seed();
