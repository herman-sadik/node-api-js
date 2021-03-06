import {
    IWithProofs,
    TTransaction,
    TTransactionFromAPI,
    TTransactionMap
} from '@waves/ts-types';
import { TRANSACTION_STATUSES, TTransactionStatuses } from '../../constants';
import { TLong, IWithApplicationStatus } from '../../interface';
import { fetchHeight } from '../blocks';
import request, { RequestInit } from '../../tools/request';
import query from '../../tools/query';
import { deepAssign } from '../../tools/utils';
import stringify from '../../tools/stringify';


/**
 * GET /transactions/unconfirmed/size
 * Number of unconfirmed transactions
 */
export function fetchUnconfirmedSize(base: string, options: RequestInit = Object.create(null)): Promise<IUnconfirmedSize> {
    return request({
        base,
        url: '/transactions/unconfirmed/size',
        options
    })
}

interface IUnconfirmedSize {
    size: number;
}


// @TODO: when correct API key is received
/**
 * POST /transactions/sign/{signerAddress}
 * Sign a transaction with a non-default private key
 */

 /**
 * POST /transactions/calculateFee
 * Calculate transaction fee
 */
export function fetchCalculateFee<T extends keyof TTransactionMap<TLong>>(
    base: string,
    tx: Partial<TTransactionMap<TLong>[T]> & { type: T },
    options: RequestInit = Object.create(null)
): Promise<TFeeInfo> {
    return request({
        base,
        url: '/transactions/calculateFee',
        options: deepAssign(
            {...options},
            {
                method: 'POST',
                body: stringify(tx),
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        )
    });
}

export type TFeeInfo<LONG = TLong> = {
    feeAssetId: string | null;
    feeAmount: LONG;
}

/**
 * GET /transactions/unconfirmed
 * Unconfirmed transactions
 */
export function fetchUnconfirmed(base: string, options: RequestInit = Object.create(null)): Promise<Array<TTransactionFromAPI<TLong>>> {
    return request({
        base,
        url: '/transactions/unconfirmed',
        options
    })
}

/**
 * Список транзакций по адресу
 * @param address
 * @param limit      максимальное количество транзакций в результате
 * @param after      искать транзакции после ID указанного в after
 * @param retry      количество попыток на выполнение запроса
 */
export function fetchTransactions(
    base: string,
    address: string,
    limit: number,
    after?: string,
    retry?: number,
    options: RequestInit = Object.create(null)
): Promise<Array<TTransactionFromAPI<TLong>>> {
    return request<Array<Array<TTransactionFromAPI<TLong>>>>({
        base,
        url: `/transactions/address/${address}/limit/${limit}${query({ after })}`,
        options
    }).then(([list]) => list);
}

/**
 * GET /transactions/unconfirmed/info/{id}
 * Unconfirmed transaction info
 */
export function fetchUnconfirmedInfo(base: string, id: string, options: RequestInit = Object.create(null)): Promise<TTransactionFromAPI<TLong>> {
    return request({
        base,
        url: `/transactions/unconfirmed/info/${id}`,
        options
    });
}

// @TODO when correct API key is received
/**
 * POST /transactions/sign
 * Sign a transaction
 */


/**
 * GET /transactions/info/{id}
 * Transaction info
 */
export function fetchInfo(base: string, id: string, options: RequestInit = Object.create(null)): Promise<TTransactionFromAPI<TLong> & IWithApplicationStatus> {
    return request({ base, url: `/transactions/info/${id}`, options });
}

export function fetchStatus(base: string, list: Array<string>): Promise<ITransactionsStatus> {
    const DEFAULT_STATUS: ITransactionStatus = {
        id: '',
        confirmations: -1,
        height: -1,
        inUTX: false,
        status: TRANSACTION_STATUSES.NOT_FOUND
    };

    const loadAllTxInfo: Array<Promise<ITransactionStatus>> = list.map(id =>
        fetchUnconfirmedInfo(base, id)
            .then(() => ({ ...DEFAULT_STATUS, id, status: TRANSACTION_STATUSES.UNCONFIRMED, inUTX: true }))
            .catch(() => fetchInfo(base, id)
                .then(tx => ({
                    ...DEFAULT_STATUS,
                    id,
                    status: TRANSACTION_STATUSES.IN_BLOCKCHAIN,
                    height: tx.height as number,
                    applicationStatus: tx.applicationStatus
                })))
            .catch(() => ({ ...DEFAULT_STATUS, id }))
    );

    return Promise.all([
        fetchHeight(base),
        Promise.all(loadAllTxInfo)
    ]).then(([{ height }, statuses]) => ({
        height,
        statuses: statuses.map(item => ({
            ...item,
            confirmations: item.status === TRANSACTION_STATUSES.IN_BLOCKCHAIN ? height - item.height : item.confirmations
        }))
    }));
}

export interface ITransactionsStatus {
    height: number;
    statuses: Array<ITransactionStatus>;
}

export interface ITransactionStatus {
    id: string;
    status: TTransactionStatuses;
    inUTX: boolean;
    confirmations: number;
    height: number;
}

export function broadcast(base: string, tx: TTransaction<TLong> & IWithProofs, options: RequestInit = Object.create(null)): Promise<TTransactionFromAPI<TLong>> {
    return request({
        base, url: '/transactions/broadcast',
        options: deepAssign(
            {...options},
            {
                method: 'POST',
                body: stringify(tx),
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        )
    });
}