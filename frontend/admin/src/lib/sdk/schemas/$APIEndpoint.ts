/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $APIEndpoint = {
    properties: {
        id: {
            type: 'number',
            format: 'int64',
        },
        tenant_id: {
            type: 'number',
            format: 'int64',
        },
        project_id: {
            type: 'number',
            format: 'int64',
        },
        path: {
            type: 'string',
        },
        methods: {
            type: 'array',
            contains: {
                type: 'string',
            },
        },
        sql: {
            type: 'string',
        },
        params: {
            type: 'array',
            contains: {
                type: 'string',
            },
        },
        created_at: {
            type: 'string',
            format: 'date-time',
        },
    },
} as const;
