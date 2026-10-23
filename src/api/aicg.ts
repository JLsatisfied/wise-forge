import { httpDefault, httpFormData } from '@/utils/http/axios'

export const aicgApi = {
    // ai图片生成接口
    queryImg(reqBody: object) {
        return httpDefault.post('/queryImg', reqBody)
    },
    // 删除大模型对话接口
    deleteDialogue(reqBody: object) {
        return httpDefault.post('/deleteDialogue', reqBody)
    },
    // 新增大模型对话接口
    addDialogue(reqBody: any) {
        return httpDefault.post('/addDialogue', reqBody)
    },
    // 覆盖保存整段对话接口（编辑重发后同步当前活动分支）
    replaceDialogue(reqBody: object) {
        return httpDefault.post('/replaceDialogue', reqBody)
    },
    // 查询大模型对话接口
    queryDialogue(reqBody: object) {
        return httpDefault.get('/queryDialogue', reqBody)
    },
    // 保存对话分支树接口
    saveDialogueTree(reqBody: object) {
        return httpDefault.post('/saveDialogueTree', reqBody)
    },
    // 查询对话分支树接口
    queryDialogueTree(reqBody: object) {
        return httpDefault.get('/queryDialogueTree', reqBody)
    },
    // 联网搜索接口
    webSearch(reqBody: object) {
        return httpDefault.post('/webSearch', reqBody)
    },
    // 查询用户大模型分类
    queryCategory(reqBody: object) {
        return httpDefault.get('/queryCategory', reqBody)
    },
    // 删除用户大模型分类
    deleteCategory(reqBody: object) {
        return httpDefault.post('/deleteCategory', reqBody)
    },
    // 查询分类
    queryPrompt() {
        return httpDefault.get('/queryPrompt')
    },
    // 新增大模型分类
    addCategory(reqBody: object) {
        return httpDefault.post('/addCategory', reqBody)
    },
    // 查询大模型分类
    queryTemplate(reqBody: object) {
        return httpDefault.get('/queryTemplate', reqBody)
    },
    // 客服配置接口
    addCustomerService(reqBody: object) {
        return httpDefault.post('/addCustomerService', reqBody)
    },
    // 上传文件接口
    uploadFile(reqBody: any) {
        return httpFormData.post('/uploadFile', reqBody)
    }
}