import {createRouter, createWebHistory} from 'vue-router'
import {useAuthStore} from '@/stores/auth'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {path: '/login', component: () => import('@/views/LoginView.vue')},
        {
            path: '/',
            component: () => import('@/layouts/AdminLayout.vue'),
            redirect: '/dashboard',
            children: [
                {
                    path: 'dashboard',
                    component: () => import('@/views/DashboardView.vue'),
                    meta: {permission: 'dashboard:view'}
                },
                {
                    path: 'users',
                    component: () => import('@/views/customers/UserListView.vue'),
                    meta: {permission: 'customers:view'}
                },
                {
                    path: 'customers/users/:id',
                    name: 'customer-user-detail',
                    component: () => import('@/views/customers/UserDetailView.vue'),
                    meta: {permission: 'customers:view'}
                },
                {
                    path: 'customers/users/:id/credits',
                    name: 'customer-credit-ledger',
                    component: () => import('@/views/customers/CreditLedgerView.vue'),
                    meta: {permission: 'customers:view'}
                },
                {
                    path: 'tickets',
                    component: () => import('@/views/customers/TicketListView.vue'),
                    meta: {permission: 'customers:view'}
                },
                {
                    path: 'tickets/:id',
                    name: 'ticket-detail',
                    component: () => import('@/views/customers/TicketDetailView.vue'),
                    meta: {permission: 'customers:view'}
                },
                {
                    path: 'ai-operations',
                    component: () => import('@/views/ai-operations/WorkflowListView.vue'),
                    meta: {permission: 'workflow:view'}
                },
                {
                    path: 'ai-operations/workflows/:id',
                    name: 'workflow-detail',
                    component: () => import('@/views/ai-operations/WorkflowDetailView.vue'),
                    meta: {permission: 'workflow:view'}
                },
                {path: 'jobs', redirect: '/ai-operations'},
                {
                    path: 'risk/events',
                    component: () => import('@/views/risk/RiskEventListView.vue'),
                    meta: {permission: 'risk:view'}
                },
                {
                    path: 'risk/events/:id',
                    name: 'risk-event-detail',
                    component: () => import('@/views/risk/RiskEventDetailView.vue'),
                    meta: {permission: 'risk:view'}
                },
                {path: 'contents', redirect: '/risk/events'},
                {
                    path: 'billing/orders',
                    component: () => import('@/views/billing/OrderListView.vue'),
                    meta: {permission: 'billing:view'}
                },
                {
                    path: 'billing/orders/:id',
                    name: 'billing-order-detail',
                    component: () => import('@/views/billing/OrderDetailView.vue'),
                    meta: {permission: 'billing:view'}
                },
                {path: 'orders', redirect: '/billing/orders'},
                {path: 'system', component: () => import('@/views/SystemView.vue'), meta: {permission: 'system:view'}},
            ]
        },
        {path: '/:pathMatch(.*)*', redirect: '/dashboard'},
    ],
})
router.beforeEach((to) => {
    const auth = useAuthStore()
    if (to.path !== '/login' && !auth.loggedIn) return '/login'
    if (to.path === '/login' && auth.loggedIn) return '/dashboard'
    const requiredPermission = to.matched.map((record) => record.meta.permission).find((permission): permission is string => typeof permission === 'string')
    if (requiredPermission && !auth.hasPermission(requiredPermission)) return '/dashboard'
})
export default router
