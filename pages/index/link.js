const { ajax, common, db } = getApp()

var url = 'http://file.jiandanhui.cn';

Page(Object.assign({}, common, db, {
  data: {
    maskHidden: true,
    defaultSize: 1024 * 1024 * 1024,
    buttonBgColor: '#F5F5F5'
  },

  onLoad(option) {
    var that = this;
    var safeArea = wx.getStorageSync('safeArea');
    var fileId = option.id;

    wx.showLoading({
      title: '努力加载中',
    })

    wx.setNavigationBarTitle({
      title: '获取下载链接'
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

    wx.cloud.callFunction({
      name: 'getFile',
      data: {
        fileId: fileId
      },
      success: res => {
        setTimeout(function () {
          wx.hideLoading();
          that.setData({
            fileInfo: res.result.data[0],
            buttonBgColor: "rgba(253, 87, 70, 0.8)"
          })
        }, 500)
      }
    })
  },

  onReady: function (options) {
    this.toast = this.selectComponent("#tui-tips-ctx")
  },

  getDownloadLink() {
    var userInfo = this.data.userInfo;
    var fileInfo = this.data.fileInfo;
    var fileId = fileInfo['_id'];

    var randStr = common.randomString(16);
    var downLoadUrl = url + '?id=' + fileId + '&auth=' + randStr;
    var that = this;

    var addData = {
      code: randStr,
      fileId: fileId,
      openid: userInfo['_openid'],
      status: true,
      createTime: new Date().getTime(),
      expiryTime: new Date().getTime() + 300 * 1000,
    }

    db.add('login', addData).then(res => {
      wx.setClipboardData({
        data: downLoadUrl,
        success (res) {
        }
      })
    })    
  }
}))
