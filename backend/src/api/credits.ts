import {request} from './client'
import type {
    ApiResponse,
    CreateCreditAdjustmentRequest,
    CreateCreditReversalRequest,
    CreditAdjustmentResult,
    CreditLedgerEntry,
    ListQuery,
    PageResult
} from '@/types'

export function getUserCreditLedger(
    userId: string,
    params: ListQuery,
): Promise<ApiResponse<PageResult<CreditLedgerEntry>>> {
    return request<PageResult<CreditLedgerEntry>>({
        method: 'GET',
        url: `/admin/customers/users/${userId}/credit-ledger`,
        params
    })
}

export function createCreditAdjustment(
    userId: string,
    payload: CreateCreditAdjustmentRequest,
): Promise<ApiResponse<CreditAdjustmentResult>> {
    return request<CreditAdjustmentResult>({
        method: 'POST',
        url: `/admin/customers/users/${userId}/credit-adjustments`,
        data: payload,
    })
}

/** 冲正：为一条已落账的不可变流水生成方向相反的 REVERSAL 流水。 */
export function createCreditReversal(
    entryId: string,
    payload: CreateCreditReversalRequest,
): Promise<ApiResponse<CreditLedgerEntry>> {
    return request<CreditLedgerEntry>({
        method: 'POST',
        url: `/admin/customers/credit-ledger/${entryId}/reversal`,
        data: payload,
    })
}
