type adminObject = {
    adminText: string;
    isShow: boolean;
}

type thinkObject = { 
    thinkText: string;
    isShow: boolean;
    status: string;
    isOpen: boolean;
}

type imgObject = {
    imgContent: string;
    isShow: boolean;
}

type allInstall = {
    userText: string;
    adminContent: adminObject;
    thinkContent?: thinkObject;
    category_id?: number;
    classify?: string;
    introduce?: string;
}

type categories = {
    category_id: number;
    name: string;
    introduce: string;
    user_id: number;
    self_introduction: string;
    my_name: string;
    category_img: string;
}

type menuObject = {
  label: string;
  id: number;
}

type promptObject = {
    id: number;
    type: number;
    name: string;
}

type templateObject = {
    id: number;
    characterSettings: string;
    info: string;
    instructionDescription: string;
    name: string;
    template_id: number;
}

type imgList = {
    userText: string;
    adminContent: imgObject;
}

type aiModelsObject = {
    id: string,
    name: string
}

type requestObject = {
    role: string;
    content: string;
}

export type {
    allInstall,
    categories,
    menuObject,
    promptObject,
    templateObject,
    imgList,
    aiModelsObject,
    requestObject
}