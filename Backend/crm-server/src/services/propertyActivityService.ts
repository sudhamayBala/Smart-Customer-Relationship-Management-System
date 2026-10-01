import { Op } from "sequelize";
import PropertyActivity from "../models/PropertyActivity";
import Property from "../models/Property";
import User from "../models/User";

interface CreateActivityData {
  tenantId: string;
  propertyId: string;
  userId?: string | null;
  action: string;
  details?: string | null;
}

const createActivity = async (data: CreateActivityData) => {
  return PropertyActivity.create({
    tenantId: data.tenantId,
    propertyId: data.propertyId,
    userId: data.userId || null,
    action: data.action,
    details: data.details || null,
    createdAt: new Date(),
  });
};

const getPropertyActivities = async (
  tenantId: string,
  propertyId: string,
  userId?: string,
  role?: string
) => {
  const propertyWhere: Record<string, string> = { tenantId, id: propertyId };
  if (role === "AGENT" && userId) propertyWhere.assigneeId = userId;
  const property = await Property.findOne({ where: propertyWhere });
  if (!property) return null;

  const activities = await PropertyActivity.findAll({
    where: {
      tenantId,
      propertyId,
    },
    order: [["createdAt", "DESC"]],
  });
  const userIds = [...new Set(activities.map((activity) => activity.userId).filter(Boolean))] as string[];
  const users = userIds.length
    ? await User.findAll({
        where: { tenantId, id: { [Op.in]: userIds } },
        attributes: ["id", "name"],
      })
    : [];
  const namesById = new Map(users.map((user) => [user.id, user.name]));

  return activities.map((activity) => ({
    ...activity.toJSON(),
    userName: activity.userId ? namesById.get(activity.userId) || "Team member" : "Team member",
  }));
};

const deletePropertyActivities = async (
  tenantId: string,
  propertyId: string
) => {
  return PropertyActivity.destroy({
    where: {
      tenantId,
      propertyId,
    },
  });
};

export {
  createActivity,
  getPropertyActivities,
  deletePropertyActivities,
};