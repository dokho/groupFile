const { ajax, common, db } = getApp()

Page(Object.assign({}, common, db, {
  data: {
    maskHidden: true,
    defaultSize: 1024 * 1024 * 1024,
    lists: []
  },

  onLoad(option) {
    var that = this;
    var safeArea = wx.getStorageSync('safeArea');

    this.setData({
      lengthScreen: safeArea.bottom > 667 ? true : false
    })

    wx.setNavigationBarTitle({
      title: '我的订阅'
    })

    this.loadData();
  },

  onPullDownRefresh() {
    this.setData({
      lists: [],
    })

    this.loadData();
  },

  onReachBottom: function () {
    this.loadData();
  },

  loadData() {
    var that = this;
    var old_data = this.data.lists;

    wx.showLoading({
      title: '努力加载中',
    })

    db.getSubscribeList(old_data.length).then(res => {
      setTimeout(function () {
        wx.hideLoading();
        wx.stopPullDownRefresh();

        that.setData({
          lists:old_data.concat(res)
        })
      }, 500)
    })
  },

  goToFolder(event) {
    var index = event.currentTarget.dataset.index;
    var lists = this.data.lists;

    var folderId = lists[index]['folderId'];

    wx.navigateTo({
      url: '/pages/topic/index?id=' + folderId
    });
  }
}))
