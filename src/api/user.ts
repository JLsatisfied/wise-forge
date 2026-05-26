import { httpDefault } from '../utils/http/axios'

interface LoginToken {
    code: number
    msg: string
    token: string
}

interface Users {
    id: number
    nickname: string
    img_url: string
    appid: string,
    username: string
}

interface UserInfo {
    code: number
    msg: string
    users: Users
}

export const userApi = {
    // 登录接口
    login(reqBody: object) {
        return httpDefault.post<LoginToken>('/login', reqBody)
    },
    logout() {
        return httpDefault.post('/logout')
    },
    // 注册接口
    register(reqBody: object) {
        return httpDefault.post('/register', reqBody)
    },
    // 修改密码
    changePassword(reqBody: object) {
        return httpDefault.post('/changePassword', reqBody)
    },
    // 重置密码接口
    resetPassword(reqBody: object) {
        return httpDefault.post('/resetPassword', reqBody)
    },
    // 验证码接口
    captcha() {
        return httpDefault.get(`/captcha?${new Date().getTime()}`)
    },
    // rsa公钥接口
    publicKey() {
        return httpDefault.get('/publicKey')
    },
    // 用户信息接口
    getUserData() {
        return httpDefault.get<UserInfo>('/getUser')
    },
    // 修改用户信息接口
    updateUser(reqBody: object) {
        return httpDefault.post('/updateUser', reqBody)
    }
}