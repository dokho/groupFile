// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init();
const db = cloud.database();
const _ = db.command;
const $ = db.command.aggregate

// 云函数入口函数
exports.main = async (event, context) => {
	try {
  		const wxContext = cloud.getWXContext();
  		const fileId = event.fileId;

  		return await db.collection('file')
                    .where({
                    	_id:fileId, 
                    	status: true
                    })
                    .get();
  	} catch(e) {
    	console.error(e)
  	}
}