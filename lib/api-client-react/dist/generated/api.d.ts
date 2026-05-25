import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { AddressInput, Email, ErrorResponse, HealthStatus, ListRecentEmailsParams, StatsSummary, Subdomain, SubdomainInput, TempAddress, WebhookEmailPayload } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List all subdomains
 */
export declare const getListSubdomainsUrl: () => string;
export declare const listSubdomains: (options?: RequestInit) => Promise<Subdomain[]>;
export declare const getListSubdomainsQueryKey: () => readonly ["/api/subdomains"];
export declare const getListSubdomainsQueryOptions: <TData = Awaited<ReturnType<typeof listSubdomains>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSubdomains>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSubdomains>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSubdomainsQueryResult = NonNullable<Awaited<ReturnType<typeof listSubdomains>>>;
export type ListSubdomainsQueryError = ErrorType<unknown>;
/**
 * @summary List all subdomains
 */
export declare function useListSubdomains<TData = Awaited<ReturnType<typeof listSubdomains>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSubdomains>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Add a new subdomain
 */
export declare const getCreateSubdomainUrl: () => string;
export declare const createSubdomain: (subdomainInput: SubdomainInput, options?: RequestInit) => Promise<Subdomain>;
export declare const getCreateSubdomainMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSubdomain>>, TError, {
        data: BodyType<SubdomainInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createSubdomain>>, TError, {
    data: BodyType<SubdomainInput>;
}, TContext>;
export type CreateSubdomainMutationResult = NonNullable<Awaited<ReturnType<typeof createSubdomain>>>;
export type CreateSubdomainMutationBody = BodyType<SubdomainInput>;
export type CreateSubdomainMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Add a new subdomain
 */
export declare const useCreateSubdomain: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSubdomain>>, TError, {
        data: BodyType<SubdomainInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createSubdomain>>, TError, {
    data: BodyType<SubdomainInput>;
}, TContext>;
/**
 * @summary Get a subdomain by ID
 */
export declare const getGetSubdomainUrl: (id: number) => string;
export declare const getSubdomain: (id: number, options?: RequestInit) => Promise<Subdomain>;
export declare const getGetSubdomainQueryKey: (id: number) => readonly [`/api/subdomains/${number}`];
export declare const getGetSubdomainQueryOptions: <TData = Awaited<ReturnType<typeof getSubdomain>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSubdomain>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSubdomain>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSubdomainQueryResult = NonNullable<Awaited<ReturnType<typeof getSubdomain>>>;
export type GetSubdomainQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get a subdomain by ID
 */
export declare function useGetSubdomain<TData = Awaited<ReturnType<typeof getSubdomain>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSubdomain>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Delete a subdomain and all its emails
 */
export declare const getDeleteSubdomainUrl: (id: number) => string;
export declare const deleteSubdomain: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteSubdomainMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSubdomain>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteSubdomain>>, TError, {
    id: number;
}, TContext>;
export type DeleteSubdomainMutationResult = NonNullable<Awaited<ReturnType<typeof deleteSubdomain>>>;
export type DeleteSubdomainMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Delete a subdomain and all its emails
 */
export declare const useDeleteSubdomain: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteSubdomain>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteSubdomain>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List emails for a subdomain
 */
export declare const getListEmailsBySubdomainUrl: (id: number) => string;
export declare const listEmailsBySubdomain: (id: number, options?: RequestInit) => Promise<Email[]>;
export declare const getListEmailsBySubdomainQueryKey: (id: number) => readonly [`/api/subdomains/${number}/emails`];
export declare const getListEmailsBySubdomainQueryOptions: <TData = Awaited<ReturnType<typeof listEmailsBySubdomain>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listEmailsBySubdomain>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listEmailsBySubdomain>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListEmailsBySubdomainQueryResult = NonNullable<Awaited<ReturnType<typeof listEmailsBySubdomain>>>;
export type ListEmailsBySubdomainQueryError = ErrorType<ErrorResponse>;
/**
 * @summary List emails for a subdomain
 */
export declare function useListEmailsBySubdomain<TData = Awaited<ReturnType<typeof listEmailsBySubdomain>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listEmailsBySubdomain>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List all generated temp addresses
 */
export declare const getListAddressesUrl: () => string;
export declare const listAddresses: (options?: RequestInit) => Promise<TempAddress[]>;
export declare const getListAddressesQueryKey: () => readonly ["/api/addresses"];
export declare const getListAddressesQueryOptions: <TData = Awaited<ReturnType<typeof listAddresses>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAddresses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAddresses>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListAddressesQueryResult = NonNullable<Awaited<ReturnType<typeof listAddresses>>>;
export type ListAddressesQueryError = ErrorType<unknown>;
/**
 * @summary List all generated temp addresses
 */
export declare function useListAddresses<TData = Awaited<ReturnType<typeof listAddresses>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAddresses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Generate a new random temp email address at a subdomain
 */
export declare const getGenerateAddressUrl: () => string;
export declare const generateAddress: (addressInput: AddressInput, options?: RequestInit) => Promise<TempAddress>;
export declare const getGenerateAddressMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateAddress>>, TError, {
        data: BodyType<AddressInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof generateAddress>>, TError, {
    data: BodyType<AddressInput>;
}, TContext>;
export type GenerateAddressMutationResult = NonNullable<Awaited<ReturnType<typeof generateAddress>>>;
export type GenerateAddressMutationBody = BodyType<AddressInput>;
export type GenerateAddressMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Generate a new random temp email address at a subdomain
 */
export declare const useGenerateAddress: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateAddress>>, TError, {
        data: BodyType<AddressInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof generateAddress>>, TError, {
    data: BodyType<AddressInput>;
}, TContext>;
/**
 * @summary Get a generated address by ID
 */
export declare const getGetAddressUrl: (id: number) => string;
export declare const getAddress: (id: number, options?: RequestInit) => Promise<TempAddress>;
export declare const getGetAddressQueryKey: (id: number) => readonly [`/api/addresses/${number}`];
export declare const getGetAddressQueryOptions: <TData = Awaited<ReturnType<typeof getAddress>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAddress>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAddress>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAddressQueryResult = NonNullable<Awaited<ReturnType<typeof getAddress>>>;
export type GetAddressQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get a generated address by ID
 */
export declare function useGetAddress<TData = Awaited<ReturnType<typeof getAddress>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAddress>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Delete a generated address
 */
export declare const getDeleteAddressUrl: (id: number) => string;
export declare const deleteAddress: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteAddressMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAddress>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteAddress>>, TError, {
    id: number;
}, TContext>;
export type DeleteAddressMutationResult = NonNullable<Awaited<ReturnType<typeof deleteAddress>>>;
export type DeleteAddressMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Delete a generated address
 */
export declare const useDeleteAddress: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAddress>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteAddress>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List all emails received at a specific generated address
 */
export declare const getListEmailsByAddressUrl: (id: number) => string;
export declare const listEmailsByAddress: (id: number, options?: RequestInit) => Promise<Email[]>;
export declare const getListEmailsByAddressQueryKey: (id: number) => readonly [`/api/addresses/${number}/emails`];
export declare const getListEmailsByAddressQueryOptions: <TData = Awaited<ReturnType<typeof listEmailsByAddress>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listEmailsByAddress>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listEmailsByAddress>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListEmailsByAddressQueryResult = NonNullable<Awaited<ReturnType<typeof listEmailsByAddress>>>;
export type ListEmailsByAddressQueryError = ErrorType<ErrorResponse>;
/**
 * @summary List all emails received at a specific generated address
 */
export declare function useListEmailsByAddress<TData = Awaited<ReturnType<typeof listEmailsByAddress>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listEmailsByAddress>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List recent emails across all subdomains
 */
export declare const getListRecentEmailsUrl: (params?: ListRecentEmailsParams) => string;
export declare const listRecentEmails: (params?: ListRecentEmailsParams, options?: RequestInit) => Promise<Email[]>;
export declare const getListRecentEmailsQueryKey: (params?: ListRecentEmailsParams) => readonly ["/api/emails", ...ListRecentEmailsParams[]];
export declare const getListRecentEmailsQueryOptions: <TData = Awaited<ReturnType<typeof listRecentEmails>>, TError = ErrorType<unknown>>(params?: ListRecentEmailsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listRecentEmails>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listRecentEmails>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListRecentEmailsQueryResult = NonNullable<Awaited<ReturnType<typeof listRecentEmails>>>;
export type ListRecentEmailsQueryError = ErrorType<unknown>;
/**
 * @summary List recent emails across all subdomains
 */
export declare function useListRecentEmails<TData = Awaited<ReturnType<typeof listRecentEmails>>, TError = ErrorType<unknown>>(params?: ListRecentEmailsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listRecentEmails>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get an email by ID
 */
export declare const getGetEmailUrl: (id: number) => string;
export declare const getEmail: (id: number, options?: RequestInit) => Promise<Email>;
export declare const getGetEmailQueryKey: (id: number) => readonly [`/api/emails/${number}`];
export declare const getGetEmailQueryOptions: <TData = Awaited<ReturnType<typeof getEmail>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getEmail>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getEmail>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetEmailQueryResult = NonNullable<Awaited<ReturnType<typeof getEmail>>>;
export type GetEmailQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get an email by ID
 */
export declare function useGetEmail<TData = Awaited<ReturnType<typeof getEmail>>, TError = ErrorType<ErrorResponse>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getEmail>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Delete an email
 */
export declare const getDeleteEmailUrl: (id: number) => string;
export declare const deleteEmail: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteEmailMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteEmail>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteEmail>>, TError, {
    id: number;
}, TContext>;
export type DeleteEmailMutationResult = NonNullable<Awaited<ReturnType<typeof deleteEmail>>>;
export type DeleteEmailMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Delete an email
 */
export declare const useDeleteEmail: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteEmail>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteEmail>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Mark an email as read
 */
export declare const getMarkEmailReadUrl: (id: number) => string;
export declare const markEmailRead: (id: number, options?: RequestInit) => Promise<Email>;
export declare const getMarkEmailReadMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markEmailRead>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof markEmailRead>>, TError, {
    id: number;
}, TContext>;
export type MarkEmailReadMutationResult = NonNullable<Awaited<ReturnType<typeof markEmailRead>>>;
export type MarkEmailReadMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Mark an email as read
 */
export declare const useMarkEmailRead: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markEmailRead>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof markEmailRead>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Webhook endpoint to receive incoming emails
 */
export declare const getReceiveEmailWebhookUrl: () => string;
export declare const receiveEmailWebhook: (webhookEmailPayload: WebhookEmailPayload, options?: RequestInit) => Promise<Email>;
export declare const getReceiveEmailWebhookMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof receiveEmailWebhook>>, TError, {
        data: BodyType<WebhookEmailPayload>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof receiveEmailWebhook>>, TError, {
    data: BodyType<WebhookEmailPayload>;
}, TContext>;
export type ReceiveEmailWebhookMutationResult = NonNullable<Awaited<ReturnType<typeof receiveEmailWebhook>>>;
export type ReceiveEmailWebhookMutationBody = BodyType<WebhookEmailPayload>;
export type ReceiveEmailWebhookMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Webhook endpoint to receive incoming emails
 */
export declare const useReceiveEmailWebhook: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof receiveEmailWebhook>>, TError, {
        data: BodyType<WebhookEmailPayload>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof receiveEmailWebhook>>, TError, {
    data: BodyType<WebhookEmailPayload>;
}, TContext>;
/**
 * @summary Get overall stats summary
 */
export declare const getGetStatsSummaryUrl: () => string;
export declare const getStatsSummary: (options?: RequestInit) => Promise<StatsSummary>;
export declare const getGetStatsSummaryQueryKey: () => readonly ["/api/stats/summary"];
export declare const getGetStatsSummaryQueryOptions: <TData = Awaited<ReturnType<typeof getStatsSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStatsSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getStatsSummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetStatsSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getStatsSummary>>>;
export type GetStatsSummaryQueryError = ErrorType<unknown>;
/**
 * @summary Get overall stats summary
 */
export declare function useGetStatsSummary<TData = Awaited<ReturnType<typeof getStatsSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStatsSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map