import { PRODUCTS_URL, UPLOADS_URL } from "../constants";
import { apiSlice } from "./apiSlice";

export const productsApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getProductsDetails: builder.query({
            query: (productId) => ({
                url: `${PRODUCTS_URL}/${productId}`,
            }),
            providesTags: ['Product'],
            keepUnusedDataFor: 5
        }),
        getProducts: builder.query({
            query: () => ({
                url: `${PRODUCTS_URL}`,
            }),
            keepUnusedDataFor: 5
        }),
        createProduct: builder.mutation({
            query: () => ({
                url: PRODUCTS_URL,
                method: 'POST'
            }),
            invalidatesTags: ['Product']
        }),
        updateProduct: builder.mutation({
            query: ( updatedProduct ) => ({
                url: `${PRODUCTS_URL}/${updatedProduct.productId}`,
                method: 'PUT',
                body:  updatedProduct ,
            }),
            invalidatesTags: ['Product']
        }),
        uploadProductImage: builder.mutation({
            query: (data) => ({
                url: `${UPLOADS_URL}`,
                method: 'POST',
                body: data,
            })
        }),
        deleteProduct: builder.mutation({
            query: ({ productId }) => ({
                url: `${PRODUCTS_URL}/${productId}`,
                method: 'DELETE'
            })
        })
    }),
});

export const { useGetProductsQuery, useGetProductsDetailsQuery, useCreateProductMutation, useUpdateProductMutation, useUploadProductImageMutation, useDeleteProductMutation } = productsApiSlice;