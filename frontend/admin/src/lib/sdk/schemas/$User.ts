/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $User = {
    properties: {
        id: {
            type: 'number',
            format: 'int64',
        },
        email: {
            type: 'string',
        },
        name: {
            type: 'string',
        },
        is_superadmin: {
            type: 'boolean',
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
