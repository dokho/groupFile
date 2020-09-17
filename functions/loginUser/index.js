// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
   	try {
   		const wxContext = cloud.getWXContext()
   		const data = {
    		_openid: wxContext.OPENID,
		  	unionid: wxContext.UNIONID,
			avatarUrl: '',
			city: '',
			country: '',
			gender: '',
			language: '',
			nickName: '',
			province: '',
			credits: 0,
			exp: 0,
			level: 1,
			totalFileSize: 0,
      		maxTotalFileSize: 1024 * 1024 * 100,
		    createTime: new Date().getTime()
    	}

    	await db.collection('user').add({data});

    	return data;
    } catch(e) {
    	console.error(e)
  	}
}