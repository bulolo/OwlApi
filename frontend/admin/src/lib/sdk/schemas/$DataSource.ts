/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $DataSource = {
    properties: {
        id: {
            type: 'number',
            format: 'int64',
        },
        tenant_id: {
            type: 'number',
            format: 'int64',
        },
        gateway_id: {
            type: 'number',
            format: 'int64',
        },
        name: {
            type: 'string',
        },
        env: {
            type: 'Enum',
        },
        type: {
            type: 'Enum',
        },
        created_at: {
            type: 'string',
            format: 'date-time',
        },
    },
} as const;
