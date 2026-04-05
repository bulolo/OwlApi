/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $Gateway = {
    properties: {
        id: {
            type: 'number',
            format: 'int64',
        },
        tenant_id: {
            type: 'number',
            format: 'int64',
        },
        name: {
            type: 'string',
        },
        status: {
            type: 'Enum',
        },
        ip: {
            type: 'string',
        },
        last_seen: {
            type: 'string',
            format: 'date-time',
        },
        version: {
            type: 'string',
        },
    },
} as const;
