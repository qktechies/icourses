<template>
    <div id="download">
        <div style="margin-bottom: 10px">
            <el-input style="width: calc(100% - 176px);" placeholder="请输入课程名、老师、学校名查询" v-model="keyword" class="input-with-select" @keyup.enter.native="searchCourse">
                <el-button slot="append" icon="el-icon-search" @click="searchCourse"></el-button>
            </el-input>
            <el-button type="primary" @click="aria2DialogVisible = true" style="margin-left: 10px">修改aria2下载路径</el-button>
        </div>

        <el-table border :data="courseData" v-loading="loading" >
            <el-table-column type="expand">
                <template slot-scope="props">
                    <el-form label-position="left" inline class="table-expand">
                        <el-form-item label="名称:">
                            <span v-html="props.row.courseName"></span>
                        </el-form-item>
                        <el-form-item label="简介:">
                            <span v-html="props.row.courseBrief"></span>
                        </el-form-item>
                        <el-form-item label="教师团队:">
                            <span v-html="props.row.courseLectors"></span>
                        </el-form-item>
                        <el-form-item label="学校:">
                            <span v-html="props.row.courseSchool"></span>
                        </el-form-item>
                        <el-form-item label="教师:">
                            <span v-html="props.row.courseTeacher"></span>
                        </el-form-item>
                    </el-form>
                </template>
            </el-table-column>
            <el-table-column
                    label="图片" width="137">
                <template slot-scope="scope">
                    <img :src="scope.row.courseLogo" alt="" width="117" height="66">
                </template>
            </el-table-column>
            <el-table-column
                    label="名称">
                <template slot-scope="scope">
                    <span v-html="scope.row.courseName"></span>
                </template>
            </el-table-column>
            <el-table-column
                    label="学校">
                <template slot-scope="scope">
                    <span v-html="scope.row.courseSchool"></span>
                </template>
            </el-table-column>
            <el-table-column
                    label="教师">
                <template slot-scope="scope">
                    <span v-html="scope.row.courseTeacher"></span>
                </template>
            </el-table-column>
            <el-table-column label="操作" width="210">
                <template slot-scope="scope">
                    <el-button
                            type="primary"
                            size="mini"
                            @click="thunderDownload(scope.$index, scope.row)">迅雷下载
                    </el-button>
                    <el-button
                            type="primary"
                            size="mini"
                            @click="aria2Download(scope.$index, scope.row)">aria2下载
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
        <el-pagination
                style="margin-top: 10px"
                align="right"
                @current-change="handleCurrentChange"
                :current-page.sync="currentPage"
                :page-sizes="[10]"
                :page-size="10"
                layout="total, sizes, prev, pager, next, jumper"
                :total="totalPage">
        </el-pagination>

        <el-dialog title="修改aria2默认下载路径" :visible.sync="aria2DialogVisible">
            <el-form label-width="80px">
                <el-form-item label="下载路径:">
                    <el-input v-model="aria2CacheBaseFolder" auto-complete="off" disabled></el-input>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="selectAria2CacheFolder()">修改</el-button>
                </el-form-item>
            </el-form>
            <div slot="footer" class="dialog-footer">
                <el-button @click="aria2DialogVisible = false">关闭</el-button>
            </div>
        </el-dialog>
    </div>
</template>
<script>
  import qs from 'querystring'
  import path from 'path'
  import Aria2 from 'aria2'
  import { remote } from 'electron'

  const PAGE_SIZE = 10
  const ARIA2_DEST_FOLDER_KEY = 'aria2DestFolder'

  export default {
    name: 'download',
    data () {
      return {
        keyword: '',
        loading: false,
        courseData: [],
        totalPage: 0,
        currentPage: 1,
        aria2DialogVisible: false,
        aria2CacheBaseFolder: ''
      }
    },
    mounted () {
      this.aria2CacheBaseFolder = localStorage.getItem(ARIA2_DEST_FOLDER_KEY) || remote.app.getPath('downloads')
    },
    methods: {
      selectAria2CacheFolder () {
        remote.dialog.showOpenDialog({
          properties: ['openDirectory']
        }, files => {
          if (files && files.length !== 0) {
            localStorage.setItem(ARIA2_DEST_FOLDER_KEY, files[0])
            this.aria2CacheBaseFolder = files[0]
          }
        })
      },

      // 迅雷下载
      thunderDownload (index, row) {
        let courseType = row.courseType

        if (courseType === 1 || courseType === 2) {
          const loading = this.$loading({
            lock: true,
            text: '导出迅雷下载中',
            spinner: 'el-icon-loading'
          })

          let destFolder = this.getTextFromHtml(row.courseSchool + '_' + row.courseName)

          if (courseType === 2) {
            // 视频公开课
            this.getVideoCourseFileList(row.courseId, row.courseType).then(data => {
              let taskArr = []

              for (let i = 0; i < data.length; i++) {
                let resInfo = data[i]
                taskArr.push({
                  url: resInfo.fullLinkUrl,
                  name: resInfo.no + '_' + resInfo.title + path.extname(resInfo.fullLinkUrl)
                })
              }

              /* global thunderLink */
              thunderLink.newTask({
                taskGroupName: destFolder,
                tasks: taskArr
              })

              loading.close()
            }).catch(_ => {
              loading.close()
            })
          } else {
            // 资源共享课
            this.getShareCourseFileList(row.courseId, row.courseType).then(data => {
              let taskArr = []
              for (let i = 0; i < data.length; i++) {
                let charpterTitle = (i + 1) + '_' + data[i].title

                let childList = data[i].childList
                let resList = data[i].resList

                let idx = 1

                if (Array.isArray(resList)) {
                  for (let j = 0; j < resList.length; j++) {
                    let resInfo = resList[j]
                    taskArr.push({
                      url: resInfo.fullResUrl,
                      name: charpterTitle + '_' + idx + '_' + resInfo.title + '.' + resInfo.mediaType
                    })

                    idx++
                  }
                }

                for (let j = 0; j < childList.length; j++) {
                  let resList = childList[j].resList
                  for (let k = 0; k < resList.length; k++) {
                    let resInfo = resList[k]

                    taskArr.push({
                      url: resInfo.fullResUrl,
                      name: charpterTitle + '_' + idx + '_' + resInfo.title + '.' + resInfo.mediaType
                    })
                    idx++
                  }
                }
              }

              /* global thunderLink */
              thunderLink.newTask({
                taskGroupName: destFolder,
                tasks: taskArr
              })

              loading.close()
            }).catch(_ => {
              loading.close()
            })
          }
        } else {
          this.$message.error('暂不支持该课程下载...')
        }
      },

      aria2Download (index, row) {
        let courseType = row.courseType

        if (courseType === 1 || courseType === 2) {
          const loading = this.$loading({
            lock: true,
            text: '导出aria2下载中...',
            spinner: 'el-icon-loading'
          })

          // 默认下载到用户下载路径下
          let baseFolder = path.join(this.aria2CacheBaseFolder, this.getTextFromHtml(row.courseSchool + '_' + row.courseName))

          if (courseType === 2) {
            // 视频公开课下载
            this.getVideoCourseFileList(row.courseId, courseType).then(data => {
              let taskArr = []
              for (let i = 0; i < data.length; i++) {
                let resInfo = data[i]
                taskArr.push(['addUri', [resInfo.fullLinkUrl], {
                  dir: baseFolder,
                  out: i + '_' + resInfo.title + '.' + path.extname(resInfo.fullLinkUrl)
                }])
              }

              this.aria2AddDownloadTask(taskArr, () => {
                loading.close()
              })
            }).catch(e => {
              loading.close()
            })
          } else {
            // 资源共享课下载
            this.getShareCourseFileList(row.courseId, courseType).then(data => {
              let taskArr = []
              for (let i = 0; i < data.length; i++) {
                let charpterTitle = (i + 1) + '_' + data[i].title
                let charpterFolder = path.join(baseFolder, charpterTitle)

                let childList = data[i].childList
                let resList = data[i].resList

                let idx = 1

                if (Array.isArray(resList)) {
                  for (let j = 0; j < resList.length; j++) {
                    let resInfo = resList[j]
                    taskArr.push(['addUri', [resInfo.fullResUrl], {
                      dir: charpterFolder,
                      out: idx + '_' + resInfo.title + '.' + resInfo.mediaType
                    }])

                    idx++
                  }
                }

                for (let j = 0; j < childList.length; j++) {
                  let childResList = childList[j].resList
                  for (let k = 0; k < childResList.length; k++) {
                    let resInfo = childResList[k]

                    taskArr.push(['addUri', [resInfo.fullResUrl], {
                      dir: charpterFolder,
                      out: idx + '_' + resInfo.title + '.' + resInfo.mediaType
                    }])

                    idx++
                  }
                }
              }

              this.aria2AddDownloadTask(taskArr, () => {
                loading.close()
              })
            }).catch(e => {
              loading.close()
            })
          }
        } else {
          this.$message.error('暂不支持该课程下载...')
        }
      },

      aria2AddDownloadTask (taskArr, cb) {
        const aria2 = new Aria2({
          host: 'localhost',
          port: 6800,
          secure: false,
          secret: '',
          path: '/jsonrpc'
        })

        aria2.socket = new WebSocket(aria2.url('ws'))

        aria2.socket.onerror = _ => {
          this.$message.error('aria打开失败！')
        }

        aria2.socket.onclose = _ => {
          cb()
        }

        if (aria2.socket.readyState === 1) {
          (async () => {
            try {
              await aria2.batch(taskArr)
            } catch (e) {
              this.$message.error('aria打开失败！')
            } finally {
              aria2.socket.close()
            }
          })()
        } else {
          aria2.socket.onopen = async () => {
            try {
              await aria2.batch(taskArr)
            } catch (e) {
              this.$message.error('aria打开失败！')
            } finally {
              aria2.socket.close()
            }
          }
        }
      },

      getTextFromHtml (html) {
        let divElement = document.createElement('div')
        divElement.innerHTML = html
        return divElement.innerText
      },

      // 搜索课程
      searchCourse () {
        this.loading = true
        this.getCourseByKeyword(1, PAGE_SIZE, this.keyword).then(data => {
          this.courseData = data.curPageData
          this.totalPage = data.allDataCount
          this.currentPage = data.curPage
          this.loading = false
        }).catch(_ => {
          this.loading = false
        })
      },

      // 分页切换页面
      handleCurrentChange (page) {
        this.loading = true
        this.getCourseByKeyword(page, PAGE_SIZE, this.keyword).then(data => {
          this.courseData = data.curPageData
          this.totalPage = data.allDataCount
          this.loading = false
        }).catch(_ => {
          this.loading = false
        })
      },

      // 搜索课程
      getCourseByKeyword (page, pageSize, keyword) {
        return this.$http.post('/hep-mobile//sword/app/home/search', qs.stringify({
          curPage: page,
          pageSize: pageSize,
          keyword: keyword
        }))
      },

      // 视频公开课视频列表
      getVideoCourseFileList (courseId, subjectType) {
        return this.$http.post('/hep-mobile/sword/app/video/detail/getSourceList', qs.stringify({
          courseId: courseId,
          subjectType: subjectType
        }))
      },

      // 资源共享课视频列表
      getShareCourseFileList (courseId, subjectType) {
        return this.$http.post('/hep-mobile/sword/app/share/detail/getCharacters', qs.stringify({
          courseId: courseId,
          subjectType: subjectType
        }))
      }
    }
  }
</script>

<style>
    div#download {
        padding: 10px;
    }

    .table-expand {
        font-size: 0;
    }

    .table-expand label {
        width: 75px;
        color: #99a9bf;
        font-weight: bold;
    }

    .table-expand .el-form-item {
        margin-right: 0;
        margin-bottom: 0;
        width: 100%;
    }
</style>