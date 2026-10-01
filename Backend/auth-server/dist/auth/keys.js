"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rotateAuthKeys = exports.getAuthKeys = void 0;
const jose_1 = require("jose");
let authKeys = null;
const createKeyId = () => `propflow-key-${Date.now().toString(36)}`;
const getAuthKeys = async () => {
    if (authKeys) {
        return authKeys;
    }
    const { privateKey, publicKey } = await (0, jose_1.generateKeyPair)("RS256");
    const publicJwk = await (0, jose_1.exportJWK)(publicKey);
    publicJwk.use = "sig";
    publicJwk.alg = "RS256";
    publicJwk.kid = createKeyId();
    authKeys = {
        privateKey,
        publicKey,
        publicJwk,
        createdAt: new Date(),
    };
    return authKeys;
};
exports.getAuthKeys = getAuthKeys;
const rotateAuthKeys = async () => {
    const { privateKey: previousPrivateKey } = await (0, exports.getAuthKeys)();
    const { privateKey, publicKey } = await (0, jose_1.generateKeyPair)("RS256");
    const publicJwk = await (0, jose_1.exportJWK)(publicKey);
    publicJwk.use = "sig";
    publicJwk.alg = "RS256";
    publicJwk.kid = createKeyId();
    authKeys = {
        privateKey,
        publicKey,
        publicJwk,
        createdAt: new Date(),
    };
    void previousPrivateKey;
    return authKeys;
};
exports.rotateAuthKeys = rotateAuthKeys;
