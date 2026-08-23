import {defineStore} from 'pinia';
import {computed, ref} from 'vue';
import type {AdminUser} from '@/types';
import {hasPermission as includesPermission} from '@/constants/permissions'

function readStoredAdmin(): AdminUser | null {
    const raw = localStorage.getItem('shopro-admin')
    if (!raw) return null
    try {
        const value: unknown = JSON.parse(raw)
        if (
            typeof value === 'object' && value !== null && 'id' in value && 'name' in value && 'email' in value && 'role' in value
            && typeof value.id === 'string' && typeof value.name === 'string' && typeof value.email === 'string' && typeof value.role === 'string'
            && 'permissions' in value && Array.isArray(value.permissions) && value.permissions.every((permission) => typeof permission === 'string')
        ) {
            return {
                id: value.id,
                name: value.name,
                email: value.email,
                role: value.role as AdminUser['role'],
                permissions: value.permissions
            }
        }
    } catch {
        localStorage.removeItem('shopro-admin')
    }
    return null
}

export const useAuthStore = defineStore('auth', () => {
    const user = ref<AdminUser | null>(readStoredAdmin());
    const loggedIn = computed(() => !!user.value);

    function setUser(v: AdminUser) {
        user.value = v;
        localStorage.setItem('shopro-admin', JSON.stringify(v))
    }

    function logout() {
        user.value = null;
        localStorage.removeItem('shopro-admin')
    }

    function hasPermission(permission: string): boolean {
        return !!user.value && includesPermission(user.value.permissions, permission)
    }

    return {user, loggedIn, setUser, logout, hasPermission}
});
