import {authHandlers} from './auth'
import {billingHandlers} from './billing'
import {customerHandlers} from './customers'
import {dashboardHandlers} from './dashboard'
import {riskHandlers} from './risk'
import {systemHandlers} from './system'
import {ticketHandlers} from './tickets'
import {workflowHandlers} from './workflows'

export const handlers = [
    ...authHandlers,
    ...dashboardHandlers,
    ...customerHandlers,
    ...ticketHandlers,
    ...workflowHandlers,
    ...riskHandlers,
    ...billingHandlers,
    ...systemHandlers,
]
