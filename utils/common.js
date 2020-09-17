import db from 'db.js'
import cos from 'cos.js'
import config from 'config.js'

'use strict';
export default {

	getSetting() {
		return new Promise((resolve, reject) => {
			db.getList('setting', {}, 'type').then(res => {
		      var setting = res;
		      var option = {};

		      for (let i in setting) {
		        option[setting[i]['type']] = setting[i]['value'];       
		      }

		      resolve(option)
		    })
		})
	},

	uploadFile(cloudPath, filePath, md5) {
		return new Promise((resolve, reject) => {
			db.get('file', {md5: md5}).then(res => {
				if(res) {
					resolve(res)
				} else {
					wx.cloud.uploadFile({
					  cloudPath: cloudPath,
					  filePath: filePath, // 文件路径
					  success: res => {
					    resolve(res)
					  },
					  fail: err => {
					    resolve(err)
					  }
					})
				}
			})
		})
	},

	uploadCosFile(cloudPath, filePath, md5) {
		return new Promise((resolve, reject) => {
			cos.postObject({
				Bucket: config.Bucket,
                Region: config.Region,
                Key: cloudPath,
                FilePath: filePath
			}, function (err, data) {
			    resolve(data)
			})
		})
	},

	uploadCloudFile(cloudPath, filePath) {
		return new Promise((resolve, reject) => {
			wx.cloud.uploadFile({
				cloudPath: cloudPath,
				filePath: filePath, // 文件路径
				success: res => {
					resolve(res)
				},
				fail: err => {
					resolve(err)
				}
			})
		})
	},

	deleteFile(fileIdList) {
		return new Promise((resolve, reject) => {
			/*wx.cloud.deleteFile({
	      		fileList: fileIdList,
	      		success: res => {
					resolve(res)
				},
			  	fail: err => {
			    	resolve(err)
			  	}
	    	})*/
	   })
	},

	formatUploadFile(fileList, suffixArray, folderId = '') {
		var i = 0;
		var isImage, isDoc, isVideo, type;
		var uploadFileList = [];
		var fileInfo = [];
		var that = this;

		for(i in fileList) {
          	var name = fileList[i]['name'];
          	var size = fileList[i]['size'];
	        var path = fileList[i]['path'];
          	if(name) {
	        	var index = name.lastIndexOf(".");
	        	var suffix = name.substr(index + 1);
          	} else {
          		var index = path.lastIndexOf(".");
	        	var suffix = path.substr(index + 1);
	        	var nowTime = new Date().getTime();
			    var randStr = Math.random().toString(36).slice(-10);
			    var name = randStr + nowTime + '.' + suffix;
          	}
          
          	var suffixPicArray = ['jpg', 'jpeg', 'gif', 'png', 'bmp']
          	var suffixVideoArray = ['mp4', 'avi', 'mov', 'wmv']
          	var suffixDocArray = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'csv']

          	isImage = this.in_array(suffix, suffixPicArray) ? true : false;
          	isDoc = this.in_array(suffix, suffixDocArray) ? true : false;
          	isVideo = this.in_array(suffix, suffixVideoArray) ? true : false;
          
          	var type = this.in_array(suffix, suffixArray) ? suffix : 'other';

          	fileInfo = {
		        filename: name,
		        size: size,
		        path: path,
		        type: type,
		        suffix: suffix,
		        folderId: folderId,
		        isImage: isImage,
		        isDoc: isDoc,
		        isVideo: isVideo,
		        showSize: that.getFileSize(size)
		    }

		    uploadFileList.push(fileInfo);
        }

        return uploadFileList
	},

	addFileData(fileInfo) {
		var d = new Date();
	    var nowYear = d.getFullYear();
	    var nowMonth = d.getMonth() + 1;
	    var nowDay = d.getDate();
	    var nowWeek = d.getDay();

		var fileData = {
          year: nowYear,
          month: nowMonth,
          day: nowDay,
          md5: fileInfo['md5'],
          size: fileInfo['size'],
          suffix: fileInfo['suffix'],
          type: fileInfo['type'],
          fileId: fileInfo['fileId'],
          status: true,
          folderId: fileInfo['folderId'],
          prevFolderId: fileInfo['prevFolderId'],
          filename: fileInfo['filename'],
          isImage: fileInfo['isImage'],
          isDoc: fileInfo['isDoc'],
          isVideo: fileInfo['isVideo'],
          isTopic: fileInfo['isTopic'],
          isCos: true,
          createTime: fileInfo['createTime'],
          createDate: fileInfo['createDate'],
        }

        return db.add('file', fileData);
	},

	addFolderData(folderInfo) {
		var d = new Date();
	    var nowYear = d.getFullYear();
	    var nowMonth = d.getMonth() + 1;
	    var nowDay = d.getDate();
	    var nowWeek = d.getDay();

		var folderData = {
          year: nowYear,
          month: nowMonth,
          day: nowDay,
          status: true,
          isFolder: true,
          type: folderInfo['type'],
          filename: folderInfo['filename'],
          folderId: folderInfo['folderId'],
          prevFolderId: folderInfo['prevFolderId'],
          groupId: folderInfo['groupId'],
          topicType: folderInfo['topicType'],
          createTime: folderInfo['createTime'],
          createDate: folderInfo['createDate'],
        }

        return db.add('file', folderData);
	},

	formatFolderInfo(folderInfo) {
	    var data;

	    return data = {
	      id: folderInfo['_id'],
	      type: folderInfo['type'],
	      isFolder: true,
	      filename: folderInfo['filename'],
	      groupId: folderInfo['groupId'],
	      folderId: folderInfo['folderId'],
	      prevFolderId: folderInfo['prevFolderId'],
	      createTime: this.formatDate(folderInfo['createTime']),
	    }
	},

	formatFileInfo(fileInfo) {
	    var suffixPicArray = ['jpg', 'jpeg', 'gif', 'png', 'bmp'];
	    var suffixVideoArray = ['mp4', 'avi', 'mov', 'wmv'];
	    var suffixAudioArray = ['mp3', 'wav'];
	    var suffixDocArray = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'csv']
	    var suffixArray = [
	      'jpg','jpeg','gif','png','bmp','mp3', 
	      'mp4','pdf','wav','avi','txt','doc', 
	      'docx','xls','xlsx','ppt','pptx', 
	      'pdf','csv','txt','zip','rar', 'mov'
	    ];
	    var type = '';
	    var data = [];

	    if(fileInfo['type'] == 'other') {
	      var index = fileInfo['filename'].lastIndexOf(".");
	      var suffix = fileInfo['filename'].substr(index + 1);
	      type = this.in_array(suffix, suffixArray) ? suffix : 'other';
	    } else {
	      type = fileInfo['type']
	    }
	      
	    return data = {
	      id: fileInfo['_id'],
	      type: type,
	      isImage: this.in_array(type, suffixPicArray) ? true : false,
	      isDoc: this.in_array(type, suffixDocArray) ? true : false,
	      isVideo: this.in_array(type, suffixVideoArray) ? true : false,
	      isAudio: this.in_array(type, suffixAudioArray) ? true : false,
	      isTopic: fileInfo['isTopic'],
	      isCos: fileInfo['isCos'],
	      filename: fileInfo['filename'],
	      fileId: fileInfo['fileId'],
	      size: this.getFileSize(fileInfo['size']),
	      createTime: this.formatDate(fileInfo['createTime']),
	    }
	},

	formatDate(timeStamp) {
	    if(timeStamp > 0) {
	      var timeStamp = new Date(timeStamp);
	      var year = timeStamp.getFullYear(); 
	      var month = timeStamp.getMonth() + 1; 
	      var date = timeStamp.getDate(); 
	      var hour = timeStamp.getHours(); 
	      var minute = timeStamp.getMinutes(); 
	      var second = timeStamp.getSeconds();

	      month = month < 10 ? '0' + month: month;
	      date = date < 10 ? '0' + date: date;
	      hour = hour < 10 ? '0' + hour: hour;
	      minute = minute < 10 ? '0' + minute: minute;

	      return year+"-"+month+"-"+date+" "+hour+":"+minute;
	    } else {
	      return null;
	    }
	},

	secCheck(content, type) {
		return new Promise((resolve, reject) => {
			wx.cloud.callFunction({
				name: 'secCheck',
		      	data: {
		        	type: type,
		        	content: content
		      	},
      			success: res => {
			    	resolve(res)
			  	},
			  	fail: err => {
			    	resolve(err)
			  	}
			})
		})
	},

	getFileSize(fileByte, point = 2) {
	    var fileSizeByte = fileByte;
	    var fileSizeMsg = "";
	    if (fileSizeByte < 1048576) fileSizeMsg = (fileSizeByte / 1024).toFixed(point) + "K";
	    else if (fileSizeByte == 1048576) fileSizeMsg = "1MB";
	    else if (fileSizeByte > 1048576 && fileSizeByte < 1073741824) fileSizeMsg = (fileSizeByte / (1024 * 1024)).toFixed(point) + "M";
	    else if (fileSizeByte > 1048576 && fileSizeByte == 1073741824) fileSizeMsg = "1G";
	    else if (fileSizeByte > 1073741824 && fileSizeByte < 1099511627776) fileSizeMsg = (fileSizeByte / (1024 * 1024 * 1024)).toFixed(point) + "G";
	    else fileSizeMsg = "文件超过1TB";
	    return fileSizeMsg;
	},

	in_array(search, array) {
	    for(var i in array){
	        if(array[i] == search){
	            return true;
	        }
	    }
	    return false;
	},

	randomString(len) {
		len = len || 32;
		var chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';    /****默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1****/
		var maxPos = chars.length;
		var pwd = '';
		for (let i = 0; i < len; i++) {
			pwd += chars.charAt(Math.floor(Math.random() * maxPos));
  　　　　}
		
		return pwd;
	}
}

