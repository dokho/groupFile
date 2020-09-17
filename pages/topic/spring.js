const { ajax, common, db } = getApp()

Page(Object.assign({}, common, db, {
  data: {
    fadeAnimate:[
      {opacity: 0.2},
      {opacity: 0.5},
      {opacity: 1.0},
    ],
    cover: true,
    lists:[0,1,2,3,4,5,6,7,8,9,10,11]
  },

  onLoad(options) {
    var safeArea = wx.getStorageSync('safeArea');
    var topMenu = wx.getMenuButtonBoundingClientRect();
    
    this.setData({
      topMenu: topMenu,
      lengthScreen: safeArea.bottom > 667 ? true : false
    })
  },

  onShow(){
    var that = this;
    var fadeAnimate = this.data.fadeAnimate;
    var picStart = wx.getStorageSync('picStart');

    if(picStart) {
      this.loadPic();
      this.setData({
        cover: false
      })
    }

    setTimeout(function () {
      that.animate('#bg', fadeAnimate, 500, function () {
        setTimeout(function () {
          that.animate('#container', fadeAnimate, 800, function () {
            setTimeout(function () {
              that.animate('#join', fadeAnimate, 500)
            }, 800)
          }.bind(this))
        }, 800)
      }.bind(this))
    }, 200)
  },

  startAlbunm() {
    wx.setStorageSync('picStart', true);
    this.loadPic();
    this.setData({
      cover: false
    })
  },

  savePic() {
    var that = this;
    var lists = this.data.lists;
    var folderInfo = [];
    var folderId = '';

    wx.showLoading({
      title: '图片保存中',
    })

    if(lists.length) {
      db.get('file', {topicType: 'spring'}).then(res => {
        if(!res) {
          folderInfo['filename'] = '鼠年春节分享图';
          folderInfo['isFolder'] = true;
          folderInfo['folderId'] = '';
          folderInfo['type'] = 'folder';
          folderInfo['topicType'] = 'spring';
          folderInfo['createTime'] = new Date().getTime();
          folderInfo['createDate'] = new Date();

          common.addFolderData(folderInfo).then(res => {
            if(res) {
              folderId = res._id;
              setTimeout(function () {
                that.addFile(folderId);
              }, 500)
            }
          });
        } else {
          folderId = res._id;
          setTimeout(function () {
            that.addFile(folderId);
          }, 500)
        }
      })
    }
  },

  addFile(folderId) {
    var that = this;
    var lists = this.data.lists;
    var i = 0;
    var fileInfo = [];
    var uploadList = [];
    var uploadedList = [];

    db.getList('file', {isTopic: 'spring', status: true}, 'createTime').then(res => {
      if(res) {
        for(i in res) {
          uploadedList.push(res[i]['fileId']);
        }
      }

      for(i in lists) {
        var name = lists[i]['name'];
        var path = lists[i]['url'];

        if(!common.in_array(path, uploadedList)) {
          var index = name.lastIndexOf(".");
          var suffix = name.substr(index + 1);

          fileInfo = {
            filename: name,
            fileId: path,
            size: 0,
            type: suffix,
            suffix: suffix,
            folderId: folderId,
            isImage: true,
            isDoc: false,
            isVideo: false,
            isTopic: 'spring', 
            showSize: '',
            createTime: new Date().getTime(),
            createDate: new Date()
          }

          common.addFileData(fileInfo)
        }
      }

      setTimeout(function () {
        wx.hideLoading();
        that.setData({
          folderId: folderId,
          commpleteUpdate: true
        })
      }, 1500)

    })
  },

  loadPic() {
    var that = this;
    var i = 0;
    var fadeAnimate = [
      {opacity: 0},
      {opacity: 0.5},
      {opacity: 1.0},
    ];

    wx.showLoading({
      title: '努力加载中',
    })

    db.getSpringPic().then(res => {

      that.setData({
        lists:res
      })

      setTimeout(function () {
        wx.hideLoading();

        for(var i = 0; i < 12; i++){
          that.animate('#pic' + i, fadeAnimate, 1000 + ((i + 1) * 300))
        }
      }, 500)
    })
  },

  previewImage(event) {
    var id = event.currentTarget.dataset.id
    var lists = this.data.lists;
    var i = 0;
    var picList = [];

    for(i in lists) {
      picList.push(lists[i]['url'])
    }

    wx.previewImage({
      current: lists[id]['url'], // 当前显示图片的http链接
      urls: picList // 需要预览的图片http链接列表
    })
  },

  goToFolder(event) {
    var index = event.detail.index;
    var folderId = this.data.folderId;
    if(index == 1) {
      wx.navigateTo({
        url: '/pages/index/index?folderId=' + folderId
      });
    } else {
      this.setData({
        commpleteUpdate: false,
      })
    }
  },

  goToHome(event) {
    wx.navigateTo({
      url: '/pages/index/index'
    });
  },

  onHide: function () {

  },

  onShareAppMessage: function () {
    var title = "你到了，年就到了，祝您";
    var imageUrl = "/images/share/spring.png";
    var path = "/pages/topic/spring";

    return {
      title: title,
      path: path,
      imageUrl: imageUrl
    }
  }

}))