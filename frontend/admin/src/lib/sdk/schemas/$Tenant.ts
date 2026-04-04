/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $Tenant = {
    properties: {
        id: {
            type: 'number',
            format: 'int64',
        },
        name: {
            type: 'string',
        },
        slug: {
            type: 'string',
        },
        plan: {
            type: 'Enum',
        },
        status: {
            type: 'Enum',
        },
        created_at: {
            type: 'string',
            format: 'date-time',
        },
        updated_at: {
            type: 'string',
            format: 'date-time',
        },
    },
} as const;
