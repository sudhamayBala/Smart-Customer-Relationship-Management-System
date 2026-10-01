import { baseApi } from "./baseApi";

export const propertyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProperties: builder.query({
      query: (params = {}) => ({
        url: "/properties",
        method: "GET",
        params,
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((property) => ({
                type: "Property",
                id: property.id,
              })),
              { type: "Property", id: "LIST" },
            ]
          : [{ type: "Property", id: "LIST" }],
    }),

    getPropertyFilters: builder.query({
      query: () => ({
        url: "/properties/filters",
        method: "GET",
      }),
      providesTags: ["PropertyFilters"],
    }),

    getProperty: builder.query({
      query: (id) => ({
        url: `/properties/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [
        { type: "Property", id },
      ],
    }),

    getPropertyActivities: builder.query({
      query: (id) => ({
        url: `/property-activities/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [
        { type: "PropertyActivity", id },
      ],
    }),

    createProperty: builder.mutation({
      query: (data) => ({
        url: "/properties",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [
        { type: "Property", id: "LIST" },
        "Dashboard",
      ],
    }),

    updateProperty: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/properties/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Property", id },
        { type: "PropertyActivity", id },
        { type: "Property", id: "LIST" },
        "Dashboard",
      ],
    }),

    bulkUpdateProperties: builder.mutation({
      query: (body) => ({
        url: "/properties/bulk",
        method: "PATCH",
        body,
      }),
      invalidatesTags: [
        { type: "Property", id: "LIST" },
        "PropertyFilters",
      ],
    }),

    deleteProperty: builder.mutation({
      query: (id) => ({
        url: `/properties/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Property", id },
        { type: "Property", id: "LIST" },
        "Dashboard",
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPropertiesQuery,
  useGetPropertyQuery,
  useGetPropertyActivitiesQuery,
  useGetPropertyFiltersQuery,
  useBulkUpdatePropertiesMutation,
  useCreatePropertyMutation,
  useUpdatePropertyMutation,
  useDeletePropertyMutation,
} = propertyApi;