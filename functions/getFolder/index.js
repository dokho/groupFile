// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init('cun-jpqv8');
const db = cloud.database();
const _ = db.command;
const $ = db.command.aggregate

// 云函数入口函数
exports.main = async (event, context) => {
	try {
  	const wxContext = cloud.getWXContext();
  	const folderId = event.folderId;
    const topic = event.topic;
  	const skip = event.skip;

  	const folder = await db.collection('file')
                    .where({_id:folderId})
                    .get();

    const fileList = await db.collection('file')
                  .where({
                    folderId: folderId,
                    status: true
                  })
                  .orderBy('isFolder', 'desc')
                  .orderBy('createTime', 'desc')
                  .skip(skip)
                  .limit(21)
                  .get()

  	const returnData = {
  		folderName: folder['data'][0]['filename'],
  		folderUser: folder['data'][0]['_openid'],
      folderTopic: folder['data'][0]['topic'],
      folderShare: folder['data'][0]['shareId'],
  		fileList: fileList['data']
  	}

  	return returnData;
  } catch(e) {
    console.error(e)
  }
}