const { ajax, common, db } = getApp()

Page(Object.assign({}, common, db, {
  data: {
    maskHidden: true,
    subFolder: false,
    noneFile: false,
    selectAll: true,
    isSelected: false,
    lists:[]
  },

  onLoad(option) {
    var that = this;
    var safeArea = wx.getStorageSync('safeArea');
    var userInfo = wx.getStorageSync('userInfo');
    var id = option.id;

    this.setData({
      userInfo: userInfo,
      folderId: id,
      firstFolder: id,
      lengthScreen: safeArea.bottom > 667 ? true : false
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
    setTimeout(function () {
      that.loadData();
    }, 500)
  },

  onShow() {
    var that = this;
    var shareTicket = wx.getStorageSync('shareTicket');

    if(shareTicket) {
      wx.getShareInfo({
        shareTicket: shareTicket,
        success: res => {
          const cloudID = res.cloudID
          wx.cloud.callFunction({
            name: 'getOpenData',
            data: {
              info: wx.cloud.CloudID(cloudID)
            },
            success: share => {
              var groupId = share.result.info.data.openGId;
              that.setData({
                groupId:groupId
              })
            }
          })
        }
      })
    }
  },

  onReady: function (options) {
    this.toast = this.selectComponent("#tui-tips-ctx")
  },

  onPullDownRefresh() {
    var folderId = this.data.folderId;

    this.setData({
      folderId: folderId,
      lists: [],
      noneFile: false
    })

    this.loadData();
  },

  onReachBottom: function () {
    var bottom = true;
    var folderId = this.data.folderId;

    this.loadData(folderId);
  },

  loadData(folderId) {
    wx.showLoading({
      title: '努力加载中',
    })

    var that = this;
    var folderId = this.data.folderId ? this.data.folderId: folderId;
    var prevFolderId = this.data.prevFolderId;
    var old_data = this.data.lists;
    var skip = old_data.length;
    var topic = this.data.topic;
    var groupId = this.data.groupId;

    wx.cloud.callFunction({
      name: 'getFolder',
      data: {
        folderId:folderId,
        topic:topic,
        skip:skip
      },
      success: res => {
        var title = res.result.folderName;
        var topic = res.result.folderTopic;
        var folderUser = res.result.folderUser;
        var folderShare = res.result.folderShare;
        var fileList = res.result.fileList;
        var isOp = folderShare == groupId ? true : false;

        that.setData({
          isOp: isOp
        })

        wx.setNavigationBarTitle({
          title: title
        })

        if(fileList.length > 0) {
          var resultList = this.formatList(fileList);
          setTimeout(function () {
            wx.hideLoading();
            wx.stopPullDownRefresh();

            that.setData({
              topic: topic,
              lists:old_data.concat(resultList)
            })
          }, 500)
        } else {
          wx.hideLoading()
          that.setData({
            prevFolderId: prevFolderId,
            noneFile: true
          })
        }
      }
    })
  },

  showFolderTools(event) {
    var lists = this.data.lists;
    var index = event.currentTarget.dataset.index;

    var fileInfo = lists[index];

    if(fileInfo['isFolder']) {
      this.openFolder(fileInfo);
    } else {
      this.setData({
        maskHidden: false,
        showFolderTools: true,
        hideTools: true,
        extendTool: false,
        nowFileInfo: lists[index],
        nowFileIndex: index
      })
    }
  },

  openFile(event) {
    var that = this;
    var lists = this.data.lists;
    var index = event.currentTarget.dataset.index;
    var nowFileInfo = this.data.nowFileInfo;
    var picList = [];

    var fileInfo = nowFileInfo ? nowFileInfo : lists[index];

    if(fileInfo['isFolder']) {
      this.openFolder(fileInfo);
    }

    if(fileInfo['isImage']) {
      wx.showLoading({
        title: '图片下载中',
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

  openFolder(fileInfo) {
    var folderId = fileInfo['id'];
    var firstFolder = this.data.firstFolder;
    var subFolder = firstFolder != folderId ? true : false;
      
    this.setData({
      folderId: folderId,
      prevFolderId: fileInfo['folderId'],
      subFolder: subFolder,
      nowFileInfo: '',
      lists: [],
      noneFile: false
    })

    this.loadData(folderId)
  },

  goToReturn() {
    var folderId = this.data.folderId;
    var subFolder = this.data.subFolder;
    var firstFolder = this.data.firstFolder;
    var prevFolderId = this.data.prevFolderId;

    db.get('file', {_id:folderId}).then(res => {
      subFolder = res.folderId != firstFolder ? true : false;
      this.setData({
        folderId: res.folderId,
        lists: [],
        noneFile: false,
        subFolder: subFolder
      })

      this.loadData();
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

  selectAll() {
    var lists = this.data.lists;
    var selectAll = this.data.selectAll;
    var isSelected = this.data.isSelected;
    var i = '';
    var selectedFile = [];
    
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

  closeMask() {
    var showBottomTools = {
      Filter: false,
      Topic: false,
      Add: false,
      Group: false
    }
    this.setData({
      maskHidden: true,
      showFolderTools: false,
      showBottomTools,
      hideTools: false,
      nowFileInfo: []
    })
  }
}))
