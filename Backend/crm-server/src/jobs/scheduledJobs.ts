import cron from "node-cron";
import { Op } from "sequelize";
import { Server } from "socket.io";
import PropertyActivity from "../models/PropertyActivity";
import Property from "../models/Property";
import SiteVisit from "../models/SiteVisit";
import logger from "../config/logger";

const startScheduledJobs = (io: Server) => {
  const remindedVisits = new Set<string>();

  cron.schedule("* * * * *", async () => {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 14 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 15 * 60 * 1000);

    try {
      const visits = await SiteVisit.findAll({
        where: {
          status: "SCHEDULED",
          scheduledAt: {
            [Op.gte]: windowStart,
            [Op.lt]: windowEnd,
          },
        },
        attributes: ["id", "tenantId", "propertyId", "agentId", "clientName", "scheduledAt"],
      });
      const properties = visits.length
        ? await Property.findAll({
            where: { id: { [Op.in]: [...new Set(visits.map((visit) => visit.propertyId))] } },
            attributes: ["id", "title", "unitNo"],
          })
        : [];
      const propertyById = new Map(properties.map((property) => [property.id, property]));

      for (const visit of visits) {
        if (remindedVisits.has(visit.id)) continue;
        const property = propertyById.get(visit.propertyId);
        io.to(`tenant:${visit.tenantId}:user:${visit.agentId}`).emit("siteVisit:reminder", {
          id: visit.id,
          propertyId: visit.propertyId,
          clientName: visit.clientName,
          scheduledAt: visit.scheduledAt,
          propertyTitle: property?.title || "Property",
          unitNo: property?.unitNo || "",
        });
        remindedVisits.add(visit.id);
      }

      for (const visitId of remindedVisits) {
        if (!visits.some((visit) => visit.id === visitId)) remindedVisits.delete(visitId);
      }
    } catch (error) {
      logger.error({ message: "Site visit reminder job failed", error });
    }
  });

  cron.schedule("0 3 * * *", async () => {
    try {
      const cutoffDate = new Date();

      cutoffDate.setDate(
        cutoffDate.getDate() - 90
      );

      const deletedCount =
        await PropertyActivity.destroy({
          where: {
            createdAt: {
              [Op.lt]: cutoffDate,
            },
          },
        });

      logger.info({
        message: "Old property activities cleaned",
        deletedCount,
      });
    } catch (error) {
      logger.error({
        message: "Scheduled cleanup failed",
        error,
      });
    }
  });
};

export default startScheduledJobs;