import {request} from './client'
import type {
    ApiResponse,
    CreateCreditAdjustmentRequest,
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
