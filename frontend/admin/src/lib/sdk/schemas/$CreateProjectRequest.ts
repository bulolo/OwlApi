/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $CreateProjectRequest = {
    properties: {
        name: {
            type: 'string',
            isRequired: true,
        },
        description: {
            type: 'string',
        },
        datasource_id: {
            type: 'number',
            isRequired: true,
            format: 'int64',
        },
    },
} as const;
