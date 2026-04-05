/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $CreateEndpointRequest = {
    properties: {
        path: {
            type: 'string',
            isRequired: true,
        },
        methods: {
            type: 'array',
            contains: {
                type: 'string',
            },
            isRequired: true,
        },
        sql: {
            type: 'string',
            isRequired: true,
        },
        params: {
            type: 'array',
            contains: {
                type: 'string',
            },
        },
    },
} as const;
