import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'download',
      component: require('@/components/Download').default
    },
    {
      path: '*',
      redirect: '/'
    }
  ]
})
