const { ajax, common, db } = getApp()

Page(Object.assign({}, common, db, {
  data: {
    maskHidden: true,
    noneFile: false,
    lists:[],
    completeDownLoadList: [],
    selectAll: true,
    extendTool: false,
    completeFileNum: 0,
    failFileNum: 0,
    uploadFileNum: 0,
    banButton: [{
      text: "确认",
      type: "red"
    }],
    fileType: {
      image: '图片',
      video: '视频',
      doc: '文档',
      pdf: 'PDF',
      xls: '表格',
      audio: '音频',
      other: '其他'
    },
    topicType: {
      album: '相册',
      article: '文章',
      music: '音乐'
    },
    nowFileInfo: [],
    extension: [
      'jpg','jpeg','gif','png','bmp','mp3', 
      'mp4','pdf','wav','avi','txt','doc', 
      'docx','xls','xlsx','ppt','pptx', 
      'pdf','csv','txt','zip','rar', 'mov'
    ]
  },

  onLoad(option) {
    var that = this;
    var safeArea = wx.getStorageSync('safeArea');
    var userGuide = wx.getStorageSync('userGuide');
    var folderId = option.folderId ? option.folderId : '';
    var userGuide = userGuide ? userGuide : 1;

    this.setData({
      userGuide: userGuide,
      folderId: folderId,
      lengthScreen: safeArea.bottom > 667 ? true : false
    })

    wx.setNavigationBarTitle({
      title: '我存'
    })

    if(folderId) {
      db.get('file', {_id:folderId}).then(res => {
        this.setData({
          folderId: folderId,
          saveFolderId: res.saveFolderId
        })
        wx.setNavigationBarTitle({
          title: res.filename
        })
      })
    }

    wx.showShareMenu({
      withShareTicket: true
    })

    common.getSetting().then(res => {
      if(res) {
        this.setData({
          ad: res['ad']['index'],
          setting: res['option']
        })
      }
    })

    db.getUserInfo().then(result => {
      if(!result) {
        wx.cloud.callFunction({
          name: 'loginUser',
          data: {},
          success: res => {
            this.setData({
              userInfo: res.result
            })
          }
        })
      } else {
        this.setData({
          userInfo: result
        })
      }
    })

    this.loadData(folderId);
  },

  onShow() {
    var that = this;

    db.getFileTotalSize().then(res => {
      this.setData({
        totalFileSize: res ? res.totalSize : 0
      })
    })
  },

  onReady: function (options) {
    this.toast = this.selectComponent("#tui-tips-ctx")
  },

  onHide() {
    wx.removeStorageSync('shareTicket')
  },

  onPullDownRefresh() {
    var folderId = this.data.folderId;

    this.setData({
      folderId: folderId,
      lists: [],
      noneFile: false,
      loading: true
    })

    this.loadData();
  },

  onReachBottom: function () {
    var bottom = true;
    var folderId = this.data.folderId;

    this.loadData(folderId, bottom);
  },

  loadData(folderId, bottom = false, saveFolderId = '') {
    wx.showLoading({
      title: '努力加载中',
    })

    var that = this;
    var folderId = this.data.folderId ? this.data.folderId: folderId;
    var prevFolderId = this.data.prevFolderId;
    var keyword = this.data.keyword ? this.data.keyword: keyword;
    var type = this.data.type ? this.data.type: type;
    var old_data = this.data.lists;
    
    this.getTotalNum();

    if(!folderId) {
      wx.setNavigationBarTitle({
        title: '我存'
      })
    }

    db.getFileList(old_data.length, type, folderId, keyword).then(res => {
      if(res.length > 0) {
        var resultList = this.formatList(res);
        setTimeout(function () {
          wx.hideLoading();
          wx.stopPullDownRefresh();

          that.setData({
            loading: false,
            lists:old_data.concat(resultList)
          })
        }, 500)
      } else if(bottom) {
        wx.hideLoading();
        var params = {
          title: '没有更多文件了'
        }
        that.toast.show(params);
      } else {
        wx.hideLoading()
        that.setData({
          prevFolderId: prevFolderId,
          noneFile: true,
          loading: false,
        })
      }
    })
  },

  uploadGroupFile() {
    var that = this;
    var folderId = this.data.folderId;
    var extension = this.data.extension;

    this.setData({
      maskHidden: true,
      uploadModal: false,
      isComplete: false,
    })

    wx.chooseMessageFile({
      count: 100,
      type: 'all',
      extension: extension,
      success (res) {
        var fileList = res.tempFiles
        var uploadFileList = common.formatUploadFile(fileList, extension, folderId);

        that.setData({
          uploadFileList
        })

        setTimeout(function () {
          that.uploadFile()
        }, 500)
      },
      fail (res) {
        that.setData({
          uploadTips: false
        })
      }
    })
  },

  uploadPhoneFile() {
    var that = this;
    var folderId = this.data.folderId;
    var extension = this.data.extension;

    this.setData({
      maskHidden: true,
      uploadModal: false,
      isComplete: false,
    })

    wx.chooseImage({
      count: 9,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success (res) {
        var fileList = res.tempFiles
        var uploadFileList = common.formatUploadFile(fileList, extension, folderId);

        that.setData({
          uploadFileList
        })

        setTimeout(function () {
          that.uploadFile()
        }, 500)
      },
      fail (res) {
        that.setData({
          uploadTips: false
        })
      }
    })
  },

  uploadFile(id = 0) {
    var that = this;
    var totalFileSize = this.data.totalFileSize;
    var maxTotalFileSize = this.data.userInfo.maxTotalFileSize;
    var uploadFileList = this.data.uploadFileList;
    var uploadFileNum = uploadFileList.length;
    var progress = this.data.progress;
    var folderNum = this.data.folderNum;
    var lists = this.data.lists;
    var folderId = this.data.folderId;

    var completeFileNum = this.data.completeFileNum;
    var failFileNum = this.data.failFileNum;
    var nextId = id + 1;

    if(uploadFileList[id]) {
      var fileInfo = uploadFileList[id];
      var suffix = fileInfo['suffix'];
      var path = fileInfo['path'];
      var size = fileInfo['size'];
      var md5 = fileInfo['md5'];

      var userInfo = this.data.userInfo;
      var openid = userInfo._openid;

      var nowTime = new Date().getTime();
      var randStr = Math.random(5).toString(36).slice(-10);
      var filename = randStr + nowTime;
      var cloudPath = openid + '/' + filename + '.' + suffix;

      that.setData({
        uploadTips: true
      })

      that.fade(1, 1000);

      if(totalFileSize + size <= maxTotalFileSize) {
        common.uploadCosFile(cloudPath, path, md5).then(res => {
          if(res.Location) {
            fileInfo['fileId'] = 'https://' + res.Location;
            fileInfo['createTime'] = nowTime;
            fileInfo['createDate'] = new Date();

            common.addFileData(fileInfo).then(res => {
              fileInfo['_id'] = res['_id'];
              var formatFileInfo = common.formatFileInfo(fileInfo);

              if(folderNum > 0) {
                lists.splice(folderNum, 0, formatFileInfo);
              } else {
                lists.unshift(formatFileInfo);
              }

              completeFileNum++

              that.setData({
                lists,
                totalFileSize: totalFileSize + fileInfo['size'],
                completeFileNum: completeFileNum,
                failFileNum: failFileNum,
                uploadFileNum: uploadFileNum,
                nowFileNum: nextId
              })
            });
          }

          setTimeout(function () {
            that.uploadFile(nextId);
          }, 500)
        })
      } else {
        this.setData({
          confirmUpdate: true
        })
      }
    } else {
      this.getTotalNum();

      this.setData({
        uploadTips: true,
        isComplete: true,
        nowFileNum: 0,
        uploadFileNum: 0,
        completeFileNum: 0,
        failFileNum: 0
      })

      if(folderId) {
        wx.cloud.callFunction({
          name: 'sendSubscribeMessage',
          data: {
            folderId:folderId
          },
          success: res => {
            console.log(res)
          }
        })
      }

      setTimeout(function () {
        that.fade(0, 1500);
      }, 1500)
    }
  },

  delConfirm() {
    var that = this;
    var selectedFile = this.data.selectedFile;
    var selectedLength = selectedFile ? selectedFile.length : 0;

    if(selectedLength == 0) {
      var params = {
        title: '没有选择要删除的文件'
      }
      this.toast.show(params);
    } else {
      this.setData({
        confirmDelete: true,
        delTotalNum: selectedFile.length
      })
    }
  },

  delOp(event) {
    var type = event.currentTarget.dataset.type
    var index = event.detail.index;

    if(type == 'folder') {
      if(index == 1) {
        this.delFolder()
      } else {
        this.setData({
          confirmDeleteFolder: false,
          nowFileInfo: []
        })
      }
    } else {
      if(index == 1) {
        this.delFile()
      } else {
        this.selectAll();
      }
      this.closeMask();
    }
  },

  delFile() {
    var that = this;
    var selectedFile = this.data.selectedFile;
    var delFileNum = selectedFile.length;
    var lists = this.data.lists;
    var fileTotal = this.data.fileTotal;
    var delList = [];
    var i, update;

    wx.showLoading({
      title: '文件删除中',
    })

    this.setData({
      confirmDelete: false,
    })

    for(i in selectedFile) {
      var key = selectedFile[i];
      var id = lists[key]['id'];
      var fileId = lists[key]['fileId'];
      var size = lists[key]['size'];
      var isTopic = lists[key]['isTopic'];

      if(!isTopic) {
        delList.push(fileId);
      }

      delete lists[key];

      db.update('file', id, {status:false}).then(res => {
        wx.hideLoading();
        if(res.stats.updated > 0) {
          that.setData({
            lists
          })
        }
      })
    }

    common.deleteFile(delList).then(res => {
      if(delFileNum == fileTotal) {
        update = true
      }

      if(delFileNum >= 20 && delFileNum < fileTotal) {
        update = true
      }

      this.setData({
        selectAll: true,
        showFolderTools: false,
        isSelected: false
      })

      this.getTotalNum();
      this.closeMask();

      db.getFileTotalSize().then(res => {
        this.setData({
          totalFileSize: res.totalSize
        })
      })

      if(update) {
        this.reLoadList()
      }
    })
  },

  delFolder() {
    var that = this;
    var lists = this.data.lists;
    var nowFileInfo = this.data.nowFileInfo;
    var nowFileIndex = this.data.nowFileIndex;

    wx.showLoading({
      title: '文件夹删除中',
    })

    this.setData({
      confirmDeleteFolder: false,
    })

    var id = nowFileInfo['id'];
    delete lists[nowFileIndex];

    db.update('file', id, {status:false}).then(res => {
      wx.hideLoading();
      if(res.stats.updated > 0) {
        that.setData({
          lists
        })
      }
    })
  },

  downLoadConfirm() {
    var selectedFile = this.data.selectedFile;
    var selectedLength = selectedFile ? selectedFile.length : 0;

    if(selectedLength == 0) {
      var params = {
        title: '没有选择要下载的文件'
      }
      this.toast.show(params);
    } else {
      this.setData({
        confirmDownLoad:true
      })
    }
  },

  downLoadFile(event) {
    var that = this;
    var index = event.detail.index;
    var showBottomTools = this.data.showBottomTools;

    if(index == 1) {
      var selectedFile = this.data.selectedFile;
      var lists = this.data.lists;
      var downloadFileList = [];
      var completeDownLoadList = this.data.completeDownLoadList;
      var i = 0;

      wx.showLoading({
        title: '文件下载中',
      })

      this.setData({
        confirmDownLoad: false
      })

      for (i in selectedFile) {
        var key = selectedFile[i];
        var fileId = lists[key]['fileId'];
        var isImage = lists[key]['isImage'];
        var isVideo = lists[key]['isVideo'];
        var isCos = lists[key]['isCos'];

        if(isImage || isVideo) {
          var fileInfo = {
            fileId: fileId,
            isImage: isImage,
            isVideo: isVideo,
            isCos: isCos
          }
          downloadFileList.push(fileInfo);
        }
      }

      this.setData({
        downloadFileList:downloadFileList
      })

      setTimeout(function () {
        that.downLoadComplete();
      }, 500)
    } else {
      showBottomTools['Op'] = false;
      this.setData({
        confirmDownLoad:false,
        maskHidden: true,
        extendTool: false,
        showBottomTools
      })
    }
  },

  downLoadComplete(id = 0) {
    var that = this;
    var downloadFileList = this.data.downloadFileList;
    var nowFileInfo = this.data.nowFileInfo;
    var fileInfo = nowFileInfo ? nowFileInfo : downloadFileList[id];
    var nextId = id + 1;

    if(nowFileInfo) {
      wx.showLoading({
        title: '文件下载中',
      })
    }

    if(fileInfo) {
      var fileId = fileInfo['fileId'];
      var isImage = fileInfo['isImage'];
      var isVideo = fileInfo['isVideo'];
      var isCos = fileInfo['isCos'];

      if(isImage || isVideo) {
        if(isCos) {
          wx.downloadFile({
            url: fileId,
            success: file => {
              if(isImage) {
                wx.saveImageToPhotosAlbum({
                  filePath: file.tempFilePath
                })
              } else if(isVideo) {
                wx.saveVideoToPhotosAlbum({
                  filePath: file.tempFilePath
                })
              }

              if(nowFileInfo) {
                this.setData({
                  nowFileInfo:[]
                })

                this.closeMask();
                setTimeout(function () {
                  wx.hideLoading();

                  var params = {
                    title: '下载完成，请到手机相册查看',
                    icon: true,
                    imgUrl: '/images/icon/success.png'
                  }
                  that.toast.show(params);
                  that.closeMask();
                }, 1000)
              } else {
                setTimeout(function () {
                  that.downLoadComplete(nextId)
                }, 1000)
              }
            }
          })
        } else {
          wx.cloud.downloadFile({
            fileID: fileId,
            success: file => {
              if(isImage) {
                wx.saveImageToPhotosAlbum({
                  filePath: file.tempFilePath
                })
              } else if(isVideo) {
                wx.saveVideoToPhotosAlbum({
                  filePath: file.tempFilePath
                })
              }

              if(nowFileInfo) {
                this.setData({
                  nowFileInfo:[]
                })

                this.closeMask();
                setTimeout(function () {
                  wx.hideLoading();

                  var params = {
                    title: '下载完成，请到手机相册查看',
                    icon: true,
                    imgUrl: '/images/icon/success.png'
                  }
                  that.toast.show(params);
                  that.closeMask();
                }, 1000)
              } else {
                setTimeout(function () {
                  that.downLoadComplete(nextId)
                }, 1000)
              }
            }
          })
        }
      }
    } else {
      setTimeout(function () {
        wx.hideLoading();

        var params = {
          title: '下载完成，请到手机相册查看',
          icon: true,
          imgUrl: '/images/icon/success.png'
        }
        that.toast.show(params);
        that.closeMask();
      }, 1000)
    }
  },

  openFile(event) {
    var that = this
    var lists = this.data.lists;
    var index = event.currentTarget.dataset.index;
    var saveFolderId = this.data.saveFolderId;
    var picList = [];

    var fileInfo = lists[index];

    if(fileInfo['isFolder']) {
      var folderId = fileInfo['saveFolderId'] ? fileInfo['saveFolderId'] : fileInfo['id'];
      var saveFolderId = fileInfo['folderId'] ? saveFolderId : fileInfo['saveFolderId'];

      this.setData({
        folderId: folderId,
        prevFolderId: fileInfo['folderId'],
        saveFolderId: saveFolderId,
        nowFileInfo: '',
        lists: [],
        noneFile: false
      })

      wx.setNavigationBarTitle({
        title: fileInfo['filename']
      })

      this.loadData(folderId, false, saveFolderId);
    }

    if(fileInfo['isImage']) {
      wx.showLoading({
        title: '图片加载中',
      })

      for (var i = 0; i < lists.length; i++) {
        if(lists[i]['isImage']) {
          picList.push(lists[i]['fileId']);
        }
      }

      setTimeout(function () {
        wx.hideLoading()
        wx.previewImage({
          current: fileInfo['fileId'], // 当前显示图片的http链接
          urls: picList // 需要预览的图片http链接列表
        })
      }, 1000)
    }

    if(fileInfo['isDoc']) {

      wx.showLoading({
        title: '文件加载中',
      })

      if(fileInfo['isCos']) {
        wx.downloadFile({
          url: fileInfo['fileId'],
          success: file => {
            that.openDocument(file.tempFilePath)
          },
          fail: res => {
            console.log(res)
          }
        })
      } else {
        wx.cloud.downloadFile({
          fileID: fileInfo['fileId'],
          success: res => {
            that.openDocument(res.tempFilePath)
          }
        })
      }
    }
  },

  openDocument(file) {
    wx.openDocument({
      filePath: file,
      success: res => {
        wx.hideLoading()
      }
    })
  },

  goToDownLoadLink(event) {
    var nowFileInfo = this.data.nowFileInfo;
    var fileId = nowFileInfo['id'];

    wx.navigateTo({
      url: '/pages/index/link?id=' + fileId
    });
  },
  
  showFolderTools(event) {
    var lists = this.data.lists;
    var index = event.currentTarget.dataset.index;

    this.setData({
      maskHidden: false,
      showFolderTools: true,
      hideTools: true,
      extendTool: false,
      nowFileInfo: lists[index],
      nowFileIndex: index
    })
  },

  confirmRenameFolder() {
    this.setData({
      maskHidden: true,
      hideTools:false,
      createFolder: true
    })
  },

  confirmDelFolder() {
    this.setData({
      confirmDeleteFolder: true,
      maskHidden: true,
      hideTools:false
    })
  },

  cancelDel() {
    this.setData({
      maskHidden: true,
      showFolderTools: false
    })
  },

  formFolder(event) {
    var that = this;
    var folderName = event.detail.value ? event.detail.value.folderName : '';
    var folderId = this.data.folderId;
    var prevFolderId = this.data.prevFolderId
    var groupId = this.data.groupId;
    var lists = this.data.lists;
    var nowFileInfo = this.data.nowFileInfo;
    var nowFileIndex = this.data.nowFileIndex;
    var groupId = this.data.groupId;
    var selectedFile = this.data.selectedFile;
    var createType = this.data.createType;

    if(!folderName) {
      var params = {
        title: '没有填写名称'
      }
      that.toast.show(params);
      return
    }

    common.secCheck(folderName, 'text').then(res =>{
      var result = res.result.errCode
      if(result == 87014) {
        var params = {
          title: '名称中含有违规信息请修改'
        }
        that.toast.show(params);
        return
      }
    })

    var nowFileId = nowFileInfo['id'];

    if(nowFileId) {
      lists[nowFileIndex]['filename'] = folderName;

      db.update('file', nowFileId, {filename:folderName}).then(res => {
        this.setData({
          lists,
          maskHidden: true,
          showFolderTools: false,
          createFolder: false
        })
      })
    } else {
      var folderInfo = {};
      folderInfo['filename'] = folderName;
      folderInfo['groupId'] = groupId;
      folderInfo['folderId'] = folderId;
      folderInfo['prevFolderId'] = prevFolderId;
      folderInfo['isFolder'] = true;
      folderInfo['type'] = createType ? 'topic' : 'folder';
      folderInfo['topicType'] = createType;
      folderInfo['createTime'] = new Date().getTime();
      folderInfo['createDate'] = new Date();

      common.addFolderData(folderInfo).then(res => {
        if(res) {
          folderInfo['id'] = res._id;
          if(createType) {
            this.addTopic(res._id, selectedFile);
          } else {
            lists.unshift(folderInfo);
          }
          this.setData({
            lists,
            maskHidden: true,
            createFolder: false,
            groupId: '',
            showBottomTools: []
          })
        }
      });
    }
  },

  addTopic(folderId, selectedFile) {
    var lists = this.data.lists;
    var i = 0;

    for(i in selectedFile) {
      var key = selectedFile[i];
      var id = lists[key]['id'];
      db.update('file', id, {topicId:folderId});
    }
  },

  showTools(event) {
    var type = event.currentTarget.dataset.type;
    var extend = event.currentTarget.dataset.extend;
    var createFolder = this.data.createFolder;
    var showBottomTools = {
      Filter: false,
      Topic: false,
      Add: false,
      Group: false,
      Op: false
    };

    var maskHidden = showBottomTools[type] ? true : false;
    var extendTool = false;

    if(extend) {
      extendTool = showBottomTools[type] ? false : true;
    }
    
    showBottomTools[type] = showBottomTools[type] ? false : true;

    this.setData({
      maskHidden: maskHidden,
      extendTool: extendTool,
      showBottomTools
    })
  },

  showCreateFolder(event) {
    var type = event.currentTarget.dataset.type;
    var selectedFile = this.data.selectedFile;
    var selectedLength = selectedFile ? selectedFile.length : 0;

    if(selectedLength == 0 && type) {
      var params = {
        title: '没有选择专辑文件'
      }
      that.toast.show(params);
    } else {
      this.setData({
        createType: type,
        createFolder: true,
        nowFileInfo: []
      })
    }
  },

  closeTips() {
    this.setData({
      showShare: false
    })
  },

  closeMask() {
    console.log('close')
    var showBottomTools = {
      Filter: false,
      Topic: false,
      Add: false,
      Group: false,
      Op:false
    }

    this.setData({
      maskHidden: true,
      showFolderTools: false,
      showBottomTools,
      hideTools: false,
      nowFileInfo: [],
      confirmDeleteFolder: false,
      confirmDelete: false
    })
  },

  closeCreateFolder() {
    this.setData({
      maskHidden: true,
      createFolder: false,
      nowFileInfo: [],
      showBottomTools: []
    })
  },

  formatList(list) {
    var that = this;
      var fileList = [];
      var folderList = [];
      var folderNum = 0;
      var data, prevFolderId;
    
      for (var i = 0; i < list.length; i++) {
        if(list[i]['isFolder']) {
          data = common.formatFolderInfo(list[i]);
          folderNum++;
        } else {
          data = common.formatFileInfo(list[i])
        }

        fileList.push(data);
      }

      this.setData({
        folderNum: folderNum
      })

      return fileList;
  },

  getTotalNum() {
    db.getFileCount().then(res => {
      this.setData({
        fileTotal: res
      })
    })
  },

  reLoadList() {
    var folderId = this.data.folderId;

    this.setData({
      folderId: folderId,
      lists: [],
      selectedFile: [],
      noneFile: false
    })

    this.loadData();
  },

  selectAll() {
    var lists = this.data.lists;
    var selectAll = this.data.selectAll;
    var isSelected = this.data.isSelected;
    var i = '';
    var selectedFile = [];

    this.closeMask();
    
    if(selectAll) {
      for(i in lists) {
          lists[i]['checked'] = '';
          selectedFile.push(i);
          selectAll = false;
          isSelected = true
      }
    } else {
      for(i in lists) {
          lists[i]['checked'] = '';
          selectAll = true;
          isSelected = false
      }
    }

    this.setData({
      lists,
      selectedFile,
      selectAll: selectAll,
      isSelected: isSelected
    })
  },

  checkboxChange: function (event) {
    var selectedFile = event.detail.value;
    this.setData({
      selectedFile: selectedFile,
      selectAll: false
    })
  },

  fade(opacity, duration, id = '') {
    var attentionAnim = wx.createAnimation({
      duration: duration,
      timingFunction: 'ease',
      delay: 0
    })

    var animationData = [];

    if(id) {
      animationData[id] = attentionAnim.opacity(opacity).step().export()
    } else {
      animationData = attentionAnim.opacity(opacity).step().export()
    }

    this.setData({
      animationData,
    })
  },

  closeModal() {
    this.setData({
      confirmDelete: false
    })
  },

  selectType(event) {
    var type = event.currentTarget.dataset.type;
    this.setData({
      type: type,
      lists: [],
      noneFile: false,
      maskHidden: true,
      extendTool: false,
      showFilter: false,
      selectAll: true
    })

    this.loadData();
  },

  goToSearch(event) {
    var keyword = event.detail.value;

    this.setData({
      keyword: keyword,
      lists: [],
      noneFile: false
    })

    this.loadData();
  },

  clearSearch() {
    this.setData({
      keyword: '',
      lists: [],
      noneFile: false
    })

    this.loadData();
  },

  clearType() {
    this.setData({
      type: '',
      lists: [],
      noneFile: false
    })

    this.loadData();
  },

  goToReturn() {
    var folderId = this.data.folderId;
    var saveFolderId = this.data.saveFolderId;
    
    db.get('file', {_id:folderId}).then(res => {
      this.setData({
        folderId: res.folderId,
        saveFolderId: saveFolderId,
        lists: [],
        noneFile: false,
        selectAll: true
      })

      this.loadData();
    })
  },

  goToPage(event) {
    var page = event.currentTarget.dataset.page;

    wx.navigateTo({
      url: '/pages/' + page + '/index'
    });
  },

  goToAd(event) {
    var index = event.currentTarget.dataset.index;
    var location = event.currentTarget.dataset.location;
    var ad = this.data.ad;
    var url = ad['location'][location][index]['url'];

    wx.navigateTo({
      url: url
    });
  },

  onShareAppMessage: function (res) {
    var userInfo = this.data.userInfo;
    var title = "保存管理微信文件，快来试试吧";
    var imageUrl = "/images/share/cover.png";
    var path = "";

    if (res.from === 'button') {
      title = userInfo.nickName + '推荐给你“' + res.target.dataset.title +'"';
      imageUrl = "/images/share/cover.png";
      path = "/pages/topic/index?id=" + res.target.dataset.fid;
    }

    return {
      title: title,
      path: path,
      imageUrl: imageUrl
    }
  },

  goToTask(event) {
    var index = event.detail.index;
    this.setData({
      confirmUpdate: false
    })

    if(index == 1) {

    }
  },

  newGuide() {
    var userGuide = this.data.userGuide;

    userGuide = userGuide + 1;
    wx.setStorageSync('userGuide', userGuide);
    
    this.setData({
      userGuide: userGuide
    })
  },

  getUserInfo(event) {
    var that = this;
    var totalFileSize = this.data.totalFileSize;
    var userInfo = this.data.userInfo;

    var userInfo = {
      avatarUrl: event.detail.userInfo.avatarUrl,
      city: event.detail.userInfo.city,
      country: event.detail.userInfo.country,
      gender: event.detail.userInfo.gender,
      language: event.detail.userInfo.language,
      nickName: event.detail.userInfo.nickName,
      province: event.detail.userInfo.province,
      credits: 0,
      exp: 0,
      level: 1,
      totalFileSize: totalFileSize ? totalFileSize : 0,
      maxTotalFileSize: 1024 * 1024 * 100
    }

    db.getUserInfo().then(res => {
      if(res) {
        db.update('user', res._id, userInfo).then(res => {
          this.setData({
            userInfo
          })
        });
      }
    })
  }
}))
