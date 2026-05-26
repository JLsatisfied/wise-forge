import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';
import { BASE_URL, TIMEOUT, ContentType } from './config';
import router from '@/router/index'
import { ElMessage } from 'element-plus'
import { useStore } from '@/store/index'

const authStore = useStore();
class HttpRequest {
  private axiosInstance: AxiosInstance;

  constructor(config: AxiosRequestConfig) {
    this.axiosInstance = axios.create(config);

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = authStore.token
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse)=> {
        return response;
      },
      (error) => {
        let message = '网络异常，请稍后再试'
        if (error.response) {
          const status = error.response.status
          const backendMsg = error.response.data?.msg
          if (status === 401) {
            authStore.clearToken()
            router.push('/')
            message = backendMsg || '登录已过期，请重新登录'
          } else if (status === 403) {
            message = backendMsg || '没有访问权限'
          } else if (status >= 500) {
            message = backendMsg || '服务器异常，请稍后再试'
          } else {
            message = backendMsg || '请求失败'
          }
        } else if (error.code === 'ECONNABORTED') {
          message = '请求超时，请检查网络'
        }
        ElMessage({ message, type: 'error', plain: true })
        return Promise.reject(error)
      }
    );
  }

  public get<T = any>(url: string, params?: any) {
    return this.axiosInstance.get<T>(url, { params });
  }

  public post<T = any>(url: string, data?: any) {
    return this.axiosInstance.post<T>(url, data);
  }
}

export const httpDefault = new HttpRequest({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': ContentType.JSON
  }
});

export const httpFormData = new HttpRequest({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': ContentType.FORM_DATA
  }
});