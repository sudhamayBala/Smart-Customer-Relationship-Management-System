import { baseApi } from "./baseApi";

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboard: builder.query({
      query: ({ from, to, days } = {}) => {
        const params = {};

        if (from) {
          params.from = from;
        }

        if (to) {
          params.to = to;
        }

        if (!from && !to && days) {
          params.days = days;
        }

        return {
          url: "/dashboard",
          method: "GET",
          params,
        };
      },
      providesTags: ["Dashboard"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetDashboardQuery } = dashboardApi;