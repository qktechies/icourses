import Vue from 'vue'
import axios from 'axios'

import App from './App'
import router from './router'
import store from './store'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))
Vue.use(ElementUI)
Vue.http = Vue.prototype.$http = axios
Vue.config.productionTip = false

axios.defaults.baseURL = 'http://mobile.icourses.cn'
// 最长超时60秒
// axios.defaults.timeout = 60000

axios.interceptors.response.use(response => {
  let data = response.data
  if (data.status === '1') {
    return data.data
  } else {
    ElementUI.Message.error(data.message)
    return Promise.reject(new Error(data.message))
  }
}, error => {
  if (error.code === 'ECONNABORTED') {
    ElementUI.Message.error('网络请求超时！')
  } else {
    ElementUI.Message.error('未知错误!')
  }
  return Promise.reject(error)
})

/* eslint-disable no-new */
new Vue({
  components: { App },
  router,
  store,
  template: '<App/>'
}).$mount('#app')
