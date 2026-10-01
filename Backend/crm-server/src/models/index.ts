import sequelize from "../config/database";
import ChatMessage from "./ChatMessage";
import MasterData from "./MasterData";
import Note from "./Note";
import Property from "./Property";
import PropertyActivity from "./PropertyActivity";
import SiteVisit from "./SiteVisit";
import User from "./User";

const models = {
  ChatMessage,
  MasterData,
  Note,
  Property,
  PropertyActivity,
  SiteVisit,
  User,
};

export { sequelize, ChatMessage, MasterData, Note, Property, PropertyActivity, SiteVisit, User };
export default models;