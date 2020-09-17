// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

// 云函数入口函数
exports.main = async (event, context) => {
  	const wxContext = cloud.getWXContext()
  	const content = event.content;
  	const contentType = event.contentType;
  	const type = event.type;

  	try {
  		if(type == 'text') {
  			const res = await cloud.openapi.security.msgSecCheck({content:content});
  			return res;
  		} else if(type == 'image') {
  			const fileID = content;

			const file = await cloud.downloadFile({
			   fileID: fileID,
			});

			const buffer = file.fileContent;

			const res = await cloud.openapi.security.imgSecCheck({
						  media: {
						    contentType: contentType,
						    value: buffer
						  }
						})

			return res;
  		}
	} catch (err) {
		return err;
	}

}