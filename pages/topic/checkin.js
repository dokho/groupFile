const { ajax, common, db } = getApp()

Page(Object.assign({}, common, db, {
  data: {
    maskHidden: true,
    selectList:[
      {
        title: '是否发热',
        showTitle: '有发热现象',
        extend: false,
        type: 'switch',
        fieldname: 'isHot'
      },
      {
        title: '是否与湖北人员接触',
        showTitle: '接触过湖北人员',
        extend: false,
        type: 'switch',
        fieldname: 'isTouch'
      },
      {
        title: '新出京',
        showTitle: '新出京',
        extend: true,
        type: 'switch',
        fieldname: 'isGoTo',
        subOption: {
          title: '出京具体时间',
          type: 'picker',
          fieldname: 'isGoToTime'
        }
      },
      {
        title: '今日回京',
        showTitle: '今日回京',
        extend: true,
        type: 'switch',
        fieldname: 'isBack',
        subOption: {
          title: '回京具体时间',
          type: 'picker',
          fieldname: 'isBackTime'
        }
      }
    ]
  },

  onLoad(option) {
    var that = this;
    var safeArea = wx.getStorageSync('safeArea');
    var userInfo = wx.getStorageSync('userInfo');
    var id = option.id;

    this.setData({
      userInfo: userInfo,
      checkId: id
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

      if(result.isTeacher) {
        setTimeout(function () {
          that.statsCheckIn();
        }, 1000)
      }
    })

    var where = {
      _id: id
    }

    db.get('checkin', where).then(res=>{
      wx.setNavigationBarTitle({
        title: res.name
      })

      this.setData({
        studentList: res.student
      })
    })
  },

  onReady: function (options) {
    this.toast = this.selectComponent("#tui-tips-ctx")
  },

  statsCheckIn() {
    var that = this;
    var d = new Date();
    var nowYear = d.getFullYear();
    var nowMonth = d.getMonth() + 1;
    var nowDay = d.getDate();
    var nowWeek = d.getDay();
    var studentList = this.data.studentList;
    var selectList = this.data.selectList;

    wx.showLoading({
      title: '努力加载中',
    })

    db.getCheckInStats(nowYear, nowMonth, nowDay).then(res => {
      var list = res.list;
      var statsResult = {};
      var noneCheckIn = [];
      var noneStatus = [];
      var studentNumList = [];

      for(let i in selectList) {
        var fieldname = selectList[i]['fieldname'];
        statsResult[fieldname] = [];       
          
        for (let s in list) {
          studentNumList.push(list[s]['studentNum']);
          if(list[s][fieldname]) {
            statsResult[fieldname].push(list[s])
          }
        }
      }

      for (let i in studentList) {
        if(common.in_array(studentList[i]['idNum'], studentNumList) == false) {
          noneCheckIn.push(studentList[i])
        } else {
          noneStatus.push(studentList[i])
        }
      }

      setTimeout(function () {
        wx.hideLoading();
        that.setData({
          year: nowYear,
          month: nowMonth,
          day: nowDay,
          statsResult,
          noneStatus,
          noneCheckIn
        })
      }, 1000)
    })
  },

  selectStudent(event) {
    var index = event.detail.value;
    var studentList = this.data.studentList;
    this.setData({
      index: index,
      studentName: studentList[index]['name'],
      studentNum: studentList[index]['idNum']
    })
  },

  bindStudent() {
    var studentNum = this.data.studentNum;

    if(!studentNum) {
      var params = {
        title: '没有选择学生信息'
      }
      this.toast.show(params);
      return;
    }
    
    this.setData({
      confirmBindStudent: true
    })
  },

  confirmBind(event) {
    var that = this;
    var index = event.detail.index;
    var userInfo = this.data.userInfo;
    var studentName = this.data.studentName;
    var studentNum = this.data.studentNum;

    this.setData({
      confirmBindStudent: false
    })

    if(index == 1) {
      db.update('user', userInfo._id, {studentName: studentName, studentNum: studentNum}).then(res=>{
        var params = {
          title: '绑定成功',
          icon: true,
          imgUrl: '/images/icon/success.png'
        }
        this.toast.show(params);

        setTimeout(function () {
          userInfo['studentName'] = studentName
          userInfo['studentNum'] = studentNum
          that.setData({
            userInfo
          })
        }, 1000)
      })
    }
  },

  confirmInfo() {
    this.setData({
      confirmInfo: true
    })
  },

  infoSubmit(event) {
    var that = this;
    var index = event.detail.index;
    var userInfo = this.data.userInfo;
    var submitList = this.data.selectList;

    var d = new Date();
    var nowYear = d.getFullYear();
    var nowMonth = d.getMonth() + 1;
    var nowDay = d.getDate();
    var nowWeek = d.getDay();

    this.setData({
      confirmInfo: false
    })

    if(index == 1) {
      var checkInData = {}
      var i = 0;
  
      for(i in submitList) {
        checkInData[submitList[i]['fieldname']] = submitList[i]['value'];
        if(submitList[i]['subOption']) {
          checkInData[submitList[i]['subOption']['fieldname']] = submitList[i]['subOption']['value'];
        }
      }

      checkInData['year'] = nowYear
      checkInData['month'] = nowMonth
      checkInData['day'] = nowDay
      checkInData['studentId'] = userInfo.studentId
      checkInData['studentName'] = userInfo.studentName
      checkInData['studentNum'] = userInfo.studentNum
      checkInData['createTime'] = new Date().getTime();
      checkInData['createDate'] = new Date();

      db.add('checkinLog', checkInData).then(res => {
        console.log(res);
      })
    }
  },

  switchChange(event) {
    var switchid = event.currentTarget.dataset.switchid;
    var extend = event.currentTarget.dataset.extend;
    var value = event.detail.value;
    var selectList = this.data.selectList;

    selectList[switchid]['value'] = value;
    selectList[switchid]['extend'] = extend;
    selectList[switchid]['show'] = value ? true : false;

    this.setData({
      selectList
    })
  },

  subChange(event) {
    var switchid = event.currentTarget.dataset.switchid;
    var value = event.detail.value;
    var selectList = this.data.selectList;

    selectList[switchid]['subOption']['value'] = value;

    this.setData({
      selectList
    })
  }
}))
