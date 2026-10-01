"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const database_1 = __importStar(require("./config/database"));
const auth_routh_1 = __importDefault(require("./routs/auth-routh"));
const keys_1 = require("./auth/keys");
const tenantProfileSchema_1 = require("./service/tenantProfileSchema");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = Number(process.env.PORT ?? 5000);
app.use((0, cors_1.default)({
    origin: ["http://localhost:9430", "http://127.0.0.1:9430"],
    credentials: true,
}));
app.use(express_1.default.json());
// Auth routes
app.use("/api/auth", auth_routh_1.default);
// Health check
app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "auth-server",
        timestamp: new Date().toISOString(),
    });
});
// Start server
const startServer = async () => {
    try {
        const databaseReady = await (0, database_1.ensureDatabaseExists)();
        if (databaseReady) {
            await database_1.default.authenticate();
            console.log("MySQL database connected successfully");
            await database_1.default.sync();
            await (0, tenantProfileSchema_1.ensureTenantProfileSchema)();
            console.log("Database tables synchronized");
        }
        else {
            console.warn("MySQL database is unavailable; server will continue in demo mode.");
        }
        app.listen(port, () => {
            console.log(`Auth server running on http://localhost:${port}`);
        });
    }
    catch (error) {
        console.error("Unable to connect to MySQL:", error);
        process.exit(1);
    }
};
app.get("/.well-known/jwks.json", async (_req, res) => {
    try {
        const { publicJwk } = await (0, keys_1.getAuthKeys)();
        return res.json({
            keys: [publicJwk],
        });
    }
    catch (error) {
        console.error("JWKS error:", error);
        return res.status(500).json({
            message: "Unable to load JWKS",
        });
    }
});
startServer();
