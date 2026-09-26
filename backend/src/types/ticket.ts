export interface SupportTicket {
    id: string
    title: string
    category: 'JOB_FAILURE' | 'BILLING' | 'CONTENT_RISK' | 'ACCOUNT' | 'PUBLISHING' | 'OTHER'
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    status: 'OPEN' | 'PROCESSING' | 'WAITING_USER' | 'RESOLVED' | 'CLOSED'
    userId: string
    organizationId?: string
    workflowId?: string
    jobId?: string
    orderId?: string
    contentId?: string
    assigneeId?: string
    description: string
    resolution?: string
    createdAt: string
    updatedAt: string
    resolvedAt?: string
}

export interface CreateSupportTicketRequest {
    title: string
    category: SupportTicket['category']
    priority: SupportTicket['priority']
    userId: string
    organizationId?: string
    workflowId?: string
    jobId?: string
    orderId?: string
    contentId?: string
    description: string
}

export interface UpdateSupportTicketRequest {
    status?: SupportTicket['status']
    assigneeId?: string
    resolution?: string
}
