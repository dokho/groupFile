/*wx.cloud.init({
  env: 'cuntest-dcyrx'
})*/

wx.cloud.init({
  env: 'cun-jpqv8'
})

const db = wx.cloud.database();
const userCollection = db.collection('user');
const fileCollection = db.collection('file');
const springCollection = db.collection('spring');
const checkinCollection = db.collection('checkin');
const checkinLogCollection = db.collection('checkinLog');
const subscribeFolderCollection = db.collection('subscribeFolder');

const _ = db.command;
const $ = db.command.aggregate

'use strict';
export default {

  add(table, data) {
    return new Promise((resolve, reject) => {
      db.collection(table)
      .add({data})
      .then(res => {
        resolve(res)
      }).catch((code, msg) => {
        reject(code, msg)
      })
    })
  },

  update(table, id, data) {
    return new Promise((resolve, reject) => {
      db.collection(table)
      .doc(id).update({
        data:data
      }).then(res => {
        resolve(res)
      }).catch((code, msg) => {
        reject(code, msg)
      })
    })
  },

  get(table, where = {}) {
    return new Promise((resolve, reject) => {
      db.collection(table)
      .where(where)
      .get().then(res => {
        resolve(res.data[0])
      }).catch((code, msg) => {
        reject(code, msg)
      })
    })
  },

  getList(table, where = {}, field, order = 'asc') {
    return new Promise((resolve, reject) => {
      db.collection(table)
      .where(where)
      .orderBy(field, order)
      .get()
      .then(res => {
        resolve(res.data)
      }).catch((code, msg) => {
        reject(code, msg)
      })
    })
  },

  getUserInfo(where) {
    return new Promise((resolve, reject) => {
      userCollection.get().then(res => {
        resolve(res.data[0])
      })
    })
  },

  getFileCount() {
    return new Promise((resolve, reject) => {
      fileCollection.where({
        status:true
      })
      .count()
      .then(res => {
        resolve(res.total)
      })
    })
  },

  getFileNum() {
    return new Promise((resolve, reject) => {
      fileCollection.where({
        isFolder:_.exists(false),
        status:true
      })
      .count()
      .then(res => {
        resolve(res.total)
      })
    })
  },

  getSpringPic() {
    return new Promise((resolve, reject) => {
      springCollection.aggregate()
      .sample({
        size: 12
      })
      .end()
      .then(res => {
        resolve(res.list)
      })
    })
  },

  getFileTotalSize() {
    return new Promise((resolve, reject) => {
      fileCollection.aggregate()
      .match({
        status:true
      })
      .group({
        _id: null,
        totalSize: $.sum('$size')
      })
      .end()
      .then(res => {
        resolve(res.list[0])
      })
    })
  },

  getSubscribeList(skip, field = 'createTime', orderBy = 'desc') {
    return new Promise((resolve, reject) => {
      subscribeFolderCollection.where({
        status: true
      })
      .orderBy(field, orderBy)
      .skip(skip)
      .limit(20)
      .get()
      .then(res => {
        resolve(res.data)
      })
    })
  },

  getFileList(skip, type = 'all', folderId = '', keyword = '', field = 'createTime', orderBy = 'desc') {
    return new Promise((resolve, reject) => {
      var fileType = {
        image: ['jpg', 'png', 'bmp', 'gif', 'jpeg'],
        video: ['mp4', 'avi'],
        audio: ['mp3', 'wav'],
        doc: ['doc', 'docx', 'ppt', 'pptx', 'txt', 'pdf'],
        xls: ['xls', 'xlsx', 'csv'],
        pdf: ['pdf'],
        other:['other'],
        all: [
          'jpg','jpeg','gif','png','bmp','mp3', 
          'mp4','pdf','wav','avi','txt','doc', 
          'docx','xls','xlsx','ppt','pptx', 
          'pdf','csv','txt','zip','rar','other', 'mov', 'folder'
        ]
      }

      if(keyword) {
        fileCollection.where({
          filename: db.RegExp({
            regexp: '.*' + keyword,
            options: 'i',
          }),
          status: true
        })
        .orderBy('isFolder', 'desc')
        .orderBy(field, orderBy)
        .skip(skip)
        .limit(20)
        .get()
        .then(res => {
          resolve(res.data)
        })
      } else {
        fileCollection.where({
          folderId: folderId,
          type: _.in(fileType[type]),
          status: true
        })
        .orderBy('isFolder', 'desc')
        .orderBy(field, orderBy)
        .skip(skip)
        .limit(20)
        .get()
        .then(res => {
          resolve(res.data)
        })
      }
    })
  },

  getCheckInStats(year, month, day) {
    return new Promise((resolve, reject) => {
      checkinLogCollection.aggregate()
      .match({
        year:year,
        month: month,
        day: day
      })
      .sort({
        createTime: 1
      })
      .end()
      .then(res => {
        resolve(res)
      })
    })
  },

  getStatsInfo() {
    return new Promise((resolve, reject) => {
      fileCollection.aggregate()
      .match({
        status:true
      })
      .group({
        _id: {
          year: '$year',
          month: '$month',
          day: '$day',
        },
        num: $.sum(1)
      })
      .sort({
        num: 1
      })
      .end()
      .then(res => {
        resolve(res)
      })
    })
  }
}

