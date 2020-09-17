const { ajax, common, db } = getApp()

Page(Object.assign({}, common, db, {
  data: {
    isLogin: false
  },

  onLoad(option) {
    var that = this;
    var safeArea = wx.getStorageSync('safeArea');
    var userInfo = wx.getStorageSync('userInfo');
    var id = option.id;
    var scene = decodeURIComponent(option.scene);

    this.setData({
      scene: scene,
      userInfo: userInfo,
      folderId: id,
      firstFolder: id,
      lengthScreen: safeArea.bottom > 667 ? true : false
    })

    wx.setNavigationBarTitle({
      title: '确认登录'
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

    var where = {
      code: scene,
      status: true
    }

    db.get('login', where).then(res => {
      var nowTime = new Date().getTime();

      if(nowTime > res.expiryTime * 1000) {
        this.setData({
          isExpiry:true
        })
      } else {
        if(res.openid) {
          this.setData({
            isLogin:true
          })
        }
      }
    })
  },

  onShow(option) {
    wx.hideHomeButton();
  },

  confirmLogin() {
    var scene = this.data.scene;

    wx.cloud.callFunction({
      name: 'qrcodeLogin',
      data: {
        code:scene
      },
      complete: res => {
        console.log(res)
      }
    })

    this.setData({
      isLogin: true
    })
  },

  goToHome() {
    wx.redirectTo({
      url: '/pages/index/index'
    });
  }
}))
