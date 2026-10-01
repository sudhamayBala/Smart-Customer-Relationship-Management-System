import { exportJWK, generateKeyPair, type JWK } from "jose";

export type AuthKeys = {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicJwk: JWK;
  createdAt: Date;
};

let authKeys: AuthKeys | null = null;

const createKeyId = () => `propflow-key-${Date.now().toString(36)}`;

export const getAuthKeys = async (): Promise<AuthKeys> => {
  if (authKeys) {
    return authKeys;
  }

  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);

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

export const rotateAuthKeys = async (): Promise<AuthKeys> => {
  const { privateKey: previousPrivateKey } = await getAuthKeys();
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);

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
