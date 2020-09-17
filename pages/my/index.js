const { ajax, common, db } = getApp()

Page(Object.assign({}, common, db, {
  data: {
    maskHidden: true,
    defaultSize: 1024 * 1024 * 1024
  },

  onLoad(option) {
    var that = this;
    var safeArea = wx.getStorageSync('safeArea');

    this.setData({
      lengthScreen: safeArea.bottom > 667 ? true : false
    })

    wx.setNavigationBarTitle({
      title: '我的'
    })

    db.getUserInfo().then(result => {
      if(!result) {
        wx.cloud.callFunction({
          name: 'loginUser',
          data: {},
          success: res => {
            that.setData({
              userInfo: res.result
            })
            that.getTotalSize(res.result);
          }
        })
      } else {
        that.setData({
          userInfo: result
        })
        that.getTotalSize(result);
      }
    })
  },

  getUserInfo(event) {
    var that = this;
    var totalFileSize = this.data.totalFileSize;
    var userInfo = this.data.userInfo;

    if(!userInfo.avatarUrl) {
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
  },

  getTotalSize(userInfo) {
    var defaultSize = this.data.defaultSize;
    var maxTotalFileSize = userInfo.maxTotalFileSize ? userInfo.maxTotalFileSize : defaultSize;
    var showMaxSize = common.getFileSize(maxTotalFileSize, 0);

    db.getFileTotalSize().then(res => {
      var userTotalSize = res ? res.totalSize : 0;
      var showUserSize = common.getFileSize(userTotalSize, 1);
      var sizeProgress = parseInt((userTotalSize / maxTotalFileSize * 100).toFixed(1))
      this.setData({
        totalFileSize: res ? res.totalSize : 0,
        sizeProgress: sizeProgress,
        showMaxSize: showMaxSize,
        showUserSize: showUserSize
      })
    })
  },

  goToSubscribe() {
    wx.navigateTo({
      url: '/pages/my/subscribe'
    });
  },

  goToAlbum() {
    wx.navigateTo({
      url: '/pages/my/album'
    });
  }
}))
