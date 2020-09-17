import common from './utils/common.js'
import db from './utils/db.js'


App({
  db,
  common,
  
  onLaunch(options) {
    var that = this;
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      /*wx.cloud.init({
        env: 'cuntest-dcyrx'
      })*/

      wx.cloud.init({
        env: 'cun-jpqv8'
      })
    }

    wx.getSystemInfo({
      success: function(res) {
        wx.setStorageSync('safeArea', res.safeArea)
      }
    })
  },

  onShow(option) {
    var that = this;

    const updateManager = wx.getUpdateManager();

    updateManager.onCheckForUpdate(function (res) {
      if(res.hasUpdate) {
        updateManager.applyUpdate()
      }
    })
  }
})