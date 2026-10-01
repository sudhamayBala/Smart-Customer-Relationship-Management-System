import { createSlice } from "@reduxjs/toolkit";

const storedToken = localStorage.getItem("accessToken");

const initialState = {
  accessToken: storedToken,
  user: null,
  isAuthenticated: Boolean(storedToken),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { accessToken, user } = action.payload;

      state.accessToken = accessToken;
      state.user = user || null;
      state.isAuthenticated = true;

      localStorage.setItem("accessToken", accessToken);
    },

    setUser: (state, action) => {
      state.user = action.payload;
    },

    logout: (state) => {
      state.accessToken = null;
      state.user = null;
      state.isAuthenticated = false;

      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    },
  },
});

export const { setCredentials, setUser, logout } = authSlice.actions;
export const authReducer = authSlice.reducer;

export default authReducer;