// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init();
const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {

	try {
    var folderId = event.folderId;
    var sort = event.sort;

    var timeStamp = new Date();
    var len = timeStamp.getTime();
    var offset = timeStamp.getTimezoneOffset() * 60000;
    var utcTime = len + offset;
    var nowTimeStamp = new Date(utcTime + 3600000 * 8);

    var year = nowTimeStamp.getFullYear(); 
    var month = nowTimeStamp.getMonth() + 1; 
    var date = nowTimeStamp.getDate(); 
    var hour = nowTimeStamp.getHours(); 
    var minute = nowTimeStamp.getMinutes(); 
    var second = nowTimeStamp.getSeconds();

    month = month < 10 ? '0' + month: month;
    date = date < 10 ? '0' + date: date;
    hour = hour < 10 ? '0' + hour: hour;
    minute = minute < 10 ? '0' + minute: minute;

    var nowDate = year+"-"+month+"-"+date+" "+hour+":"+minute;

    const setting = await db.collection('setting')
          .where({
            type: 'subscribe',
            sort: sort,
          })
          .get();

    const sendData = setting['data'][0]['data'];

    for(let key  in sendData) {
      if(sendData[key]['value'] == 'date') {
        sendData[key]['value'] = nowDate
      }
    }

    const messages = await db.collection('subscribeMessage')
          .where({
            folderId: folderId,
            done: false,
          })
          .get();

    const sendPromises = await messages.data.map(async message => {
          try {
            await cloud.openapi.subscribeMessage.send({
              touser: message._openid,
              page: message.page,
              data: sendData,
              miniprogramState: message.miniprogram_state,
              templateId: message.templateId,
            });
          } catch (e) {
            return e;
          }
        });

    const returnData = db.collection('subscribeMessage')
            .where({
              folderId: folderId,
              done: false
            })
            .update({
              data: {
                done: true,
              },
		        });

    return returnData;
  } catch (err) {
    return err;
  }
}