<template>
    <div id="download">
        <div style="margin-bottom: 10px">
            <el-input style="width: calc(100% - 85px);" placeholder="请输入课程名、老师、学校名查询" v-model="keyword" class="input-with-select" @keyup.enter.native="searchCourse">
                <el-button slot="append" icon="el-icon-search" @click="searchCourse"></el-button>
            </el-input>
            <el-button type="primary" @click="aria2DialogVisible = true" style="margin-left: 10px">设置</el-button>
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

        <el-dialog title="设置" :visible.sync="aria2DialogVisible" width="70%">
            <el-form label-width="130px">
                <el-form-item label="下载路径:">
                    <el-input v-model="aria2CacheBaseFolder" auto-complete="off" disabled class="input-with-select">
                      
                      <el-button type="primary" slot="append" @click="selectAria2CacheFolder()">修改</el-button>
                    </el-input>

                </el-form-item>

                <el-form-item label="资源共享课下载：">
                  <el-checkbox-group v-model="shareCourseDownloadList">
                    <el-checkbox :label="DOWNLOAD_CHARPTER"></el-checkbox>
                    <el-checkbox :label="DOWNLOAD_EXERCISE"></el-checkbox>
                    <el-checkbox :label="DOWNLOAD_EXAM"></el-checkbox>
                    <el-checkbox :label="DOWNLOAD_OTHER"></el-checkbox>
                  </el-checkbox-group>
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
      const DOWNLOAD_CHARPTER = '课程章节'
      const DOWNLOAD_EXERCISE = '习题作业'
      const DOWNLOAD_EXAM = '测试试卷'
      const DOWNLOAD_OTHER = '其他资源'

      return {
        keyword: '',
        loading: false,
        courseData: [],
        totalPage: 0,
        currentPage: 1,
        aria2DialogVisible: false,
        aria2CacheBaseFolder: '',
        DOWNLOAD_CHARPTER,
        DOWNLOAD_EXERCISE,
        DOWNLOAD_EXAM,
        DOWNLOAD_OTHER,
        shareCourseDownloadList: [DOWNLOAD_CHARPTER, DOWNLOAD_EXERCISE, DOWNLOAD_EXAM, DOWNLOAD_OTHER]
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
      async thunderDownload (index, row) {
        const loading = this.$loading({
          lock: true,
          text: '导出迅雷下载中...',
          spinner: 'el-icon-loading'
        })

        try {
          let { baseFolder, tasks } = await this.getTaskArr(index, row)

          tasks = tasks.map(task => {
            return {
              name: task.out,
              url: task.url,
              dir: task.dir
            }
          })

          // 通过参数创建批量任务
          /* global thunderLink */
          thunderLink.newTask({
            downloadDir: baseFolder,
            tasks: tasks
          })
        } catch (e) {
          this.$message.error(e.message)
          loading.close()
        }
      },

      // aria2下载
      async aria2Download (index, row) {
        const loading = this.$loading({
          lock: true,
          text: '导出aria2下载中...',
          spinner: 'el-icon-loading'
        })

        try {
          let { baseFolder, tasks } = await this.getTaskArr(index, row)

          tasks = tasks.map(task => {
            return ['addUri', [task.url], {
              dir: path.join(baseFolder, task.dir),
              out: task.out
            }]
          })
          this.aria2AddDownloadTask(tasks, () => {
            loading.close()
          })
        } catch (e) {
          this.$message.error(e.message)
          loading.close()
        }
      },

      async getTaskArr (index, row) {
        let courseType = row.courseType

        if (courseType === 1 || courseType === 2) {
          // 默认下载到用户下载路径下
          let baseFolder = path.join(this.aria2CacheBaseFolder, this.getTextFromHtml(row.courseSchool + '_' + row.courseName))

          try {
            if (courseType === 2) {
              // 视频公开课下载
              let data = await this.getVideoCourseFileList(row.courseId, courseType)
              let taskArr = []
              for (let i = 0; i < data.length; i++) {
                let resInfo = data[i]
                taskArr.push({
                  dir: '.',
                  out: i + '_' + resInfo.title + '.' + path.extname(resInfo.fullLinkUrl),
                  url: resInfo.fullLinkUrl
                })
              }

              return Promise.resolve(taskArr)
            } else {
              // 资源共享课下载
              let taskArr = []

              let addDataToTaskArr = (data, subDir) => {
                for (let i = 0; i < data.length; i++) {
                  let charpter = data[i]

                  for (let j = 0; j < charpter.childList.length; j++) {
                    let subCharpter = charpter.childList[j]

                    for (let k = 0; k < subCharpter.resList.length; k++) {
                      let resInfo = subCharpter.resList[k]

                      taskArr.push({
                        dir: `${subDir}/第${charpter.selfId}章 ${charpter.title}/${charpter.selfId}.${subCharpter.selfId}${subCharpter.title}`,
                        out: (k + 1) + '_' + resInfo.title + '.' + resInfo.mediaType,
                        url: resInfo.fullResUrl
                      })
                    }
                  }
                }
              }

              // 课程章节下载
              if (this.shareCourseDownloadList.indexOf(this.DOWNLOAD_CHARPTER) !== -1) {
                let data = []
                try {
                  data = await this.getShareCourseFileListOld(row.courseId, courseType)
                } catch (e) {
                  data = await this.getShareCourseFileList(row.courseId, courseType)
                }
                addDataToTaskArr(data, this.DOWNLOAD_CHARPTER)
              }

              // 习题作业下载
              if (this.shareCourseDownloadList.indexOf(this.DOWNLOAD_EXERCISE) !== -1) {
                let data = await this.getShareCourseExcercises(row.courseId, courseType)
                addDataToTaskArr(data, this.DOWNLOAD_EXERCISE)
              }

              // 测试试卷下载
              if (this.shareCourseDownloadList.indexOf(this.DOWNLOAD_EXAM) !== -1) {
                let data = await this.getShareCourseExam(row.courseId, courseType)
                addDataToTaskArr(data, this.DOWNLOAD_EXAM)
              }

              // 其他资源下载
              if (this.shareCourseDownloadList.indexOf(this.DOWNLOAD_OTHER) !== -1) {
                let data = await this.getShareCourseOtherRes(row.courseId, courseType)
                for (let i = 0; i < data.length; i++) {
                  let resInfo = data[i]
                  taskArr.push({
                    dir: this.DOWNLOAD_OTHER,
                    out: (i + 1) + '_' + resInfo.title + '.' + resInfo.mediaType,
                    url: resInfo.fullLinkUrl
                  })
                }
              }

              if (taskArr.length === 0) {
                throw new Error('请在设置中勾选需要下载的内容')
              }

              return Promise.resolve({
                baseFolder: baseFolder,
                tasks: taskArr
              })
            }
          } catch (e) {
            return Promise.reject(new Error(`获取下载内容失败，失败原因:${e.message}`))
          }
        } else {
          return Promise.reject(new Error('暂不支持该课程下载...'))
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
      getShareCourseFileListOld (courseId, subjectType) {
        return this.$http.post('/hep-mobile/sword/app/share/detail/getCharacters', qs.stringify({
          courseId: courseId,
          subjectType: subjectType
        }))
      },

      async getShareCourseFileList (courseId, subjectType) {
        let data = await this.$http.post('/hep-mobile/sword/app/share/detail/getCharactersInfo', qs.stringify({
          courseId: courseId,
          subjectType: subjectType
        }))

        for (let charpter of data) {
          for (let subCharpter of charpter.childList) {
            let result = await this.$http.post('/hep-mobile/sword/app/share/detail/getCharacterRess', qs.stringify({
              sectionId: subCharpter.id
            }))

            subCharpter.resList = result
          }
        }

        return data
      },

      // 资源共享课习题作业
      getShareCourseExcercises (courseId, subjectType) {
        return this.$http.post('/hep-mobile/sword/app/share/detail/getExcercises', qs.stringify({
          courseId: courseId,
          subjectType: subjectType
        }))
      },

      // 资源共享课测试试卷
      getShareCourseExam (courseId, subjectType) {
        return this.$http.post('/hep-mobile/sword/app/share/detail/getExam', qs.stringify({
          courseId: courseId,
          subjectType: subjectType
        }))
      },

      // 资源共享课其他资源
      getShareCourseOtherRes (courseId, subjectType) {
        return this.$http.post('/hep-mobile/sword/app/share/detail/getOtherRes', qs.stringify({
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