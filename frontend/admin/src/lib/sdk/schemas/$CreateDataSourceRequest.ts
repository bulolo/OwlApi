/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $CreateDataSourceRequest = {
    properties: {
        name: {
            type: 'string',
            isRequired: true,
        },
        env: {
            type: 'Enum',
            isRequired: true,
        },
        type: {
            type: 'Enum',
            isRequired: true,
        },
        dsn: {
            type: 'string',
            isRequired: true,
        },
        gateway_id: {
            type: 'number',
            isRequired: true,
            format: 'int64',
        },
    },
} as const;
