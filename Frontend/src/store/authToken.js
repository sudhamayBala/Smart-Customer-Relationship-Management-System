const readStoredToken = () => localStorage.getItem("accessToken");

let accessToken = readStoredToken();

export const setAccessToken = (token) => {
  accessToken = token;

  if (token) {
    localStorage.setItem("accessToken", token);
    return;
  }

  localStorage.removeItem("accessToken");
};

export const getAccessToken = () => {
  if (!accessToken) {
    accessToken = readStoredToken();
  }

  return accessToken;
};

export const clearAccessToken = () => {
  accessToken = null;
  localStorage.removeItem("accessToken");
};

export const setRefreshToken = (token) => {
  if (token) {
    localStorage.setItem("refreshToken", token);
    return;
  }

  localStorage.removeItem("refreshToken");
};

export const getRefreshToken = () =>
  localStorage.getItem("refreshToken");

export const clearRefreshToken = () => {
  localStorage.removeItem("refreshToken");
};