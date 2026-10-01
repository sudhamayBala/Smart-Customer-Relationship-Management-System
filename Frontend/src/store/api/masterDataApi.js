import { baseApi } from "./baseApi";

export const masterDataApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMasterData: builder.query({
      query: (params = {}) => ({
        url: "/master-data",
        method: "GET",
        params,
      }),
      providesTags: (result) => result?.data
        ? [
            ...result.data.map((item) => ({ type: "MasterData", id: item.id })),
            { type: "MasterData", id: "LIST" },
          ]
        : [{ type: "MasterData", id: "LIST" }],
    }),

    createMasterData: builder.mutation({
      query: (data) => ({ url: "/master-data", method: "POST", body: data }),
      invalidatesTags: [{ type: "MasterData", id: "LIST" }, "PropertyFilters"],
    }),

    updateMasterData: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/master-data/${id}`, method: "PUT", body: data }),
      invalidatesTags: (result, error, { id }) => [
        { type: "MasterData", id },
        { type: "MasterData", id: "LIST" },
        "PropertyFilters",
      ],
    }),

    deleteMasterData: builder.mutation({
      query: (id) => ({ url: `/master-data/${id}`, method: "DELETE" }),
      invalidatesTags: (result, error, id) => [
        { type: "MasterData", id },
        { type: "MasterData", id: "LIST" },
        "PropertyFilters",
      ],
    }),

    reorderMasterData: builder.mutation({
      query: (body) => ({ url: "/master-data/reorder", method: "PATCH", body }),
      invalidatesTags: [{ type: "MasterData", id: "LIST" }, "PropertyFilters"],
    }),
  }),
});

export const {
  useGetMasterDataQuery,
  useCreateMasterDataMutation,
  useUpdateMasterDataMutation,
  useDeleteMasterDataMutation,
  useReorderMasterDataMutation,
} = masterDataApi;