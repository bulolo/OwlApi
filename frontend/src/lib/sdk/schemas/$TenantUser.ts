/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $TenantUser = {
    properties: {
        tenant_id: {
            type: 'number',
            format: 'int64',
        },
        user_id: {
            type: 'number',
            format: 'int64',
        },
        role: {
            type: 'Enum',
        },
        joined_at: {
            type: 'string',
            format: 'date-time',
        },
        user: {
            type: 'User',
        },
    },
} as const;
