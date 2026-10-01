import { baseApi } from "./baseApi";

export const siteVisitApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSiteVisits: builder.query({
      query: (params = {}) => ({
        url: "/site-visits",
        method: "GET",
        params,
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((visit) => ({
                type: "SiteVisit",
                id: visit.id,
              })),
              { type: "SiteVisit", id: "LIST" },
            ]
          : [{ type: "SiteVisit", id: "LIST" }],
    }),

    getSiteVisit: builder.query({
      query: (id) => ({
        url: `/site-visits/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [
        { type: "SiteVisit", id },
      ],
    }),

    createSiteVisit: builder.mutation({
      query: (data) => ({
        url: "/site-visits",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "SiteVisit", id: "LIST" },
        "Dashboard",
      ],
    }),

    updateSiteVisit: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/site-visits/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "SiteVisit", id },
        { type: "SiteVisit", id: "LIST" },
        "Dashboard",
      ],
    }),

    deleteSiteVisit: builder.mutation({
      query: (id) => ({
        url: `/site-visits/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "SiteVisit", id },
        { type: "SiteVisit", id: "LIST" },
        "Dashboard",
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSiteVisitsQuery,
  useGetSiteVisitQuery,
  useCreateSiteVisitMutation,
  useUpdateSiteVisitMutation,
  useDeleteSiteVisitMutation,
} = siteVisitApi;