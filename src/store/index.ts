import { defineStore } from 'pinia'

export const useStore = defineStore('user-storeId', {
    state: () => ({
        token: localStorage.getItem('token') as (string | null),
        freeEntry: localStorage.getItem('freeEntry') as (string | null)
    }),
    actions: {
        setToken(newToken: string, persist = false) {
            this.token = newToken
            if (persist) {
                localStorage.setItem('freeEntry', persist.toString())
            }
            localStorage.setItem('token', newToken)
        },
        clearToken() {
            this.token = ''
            this.freeEntry = ''
            localStorage.removeItem('token')
            localStorage.removeItem('freeEntry')
        }
    }
})