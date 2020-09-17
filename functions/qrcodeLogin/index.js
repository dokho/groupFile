// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const code = event.code;

  try {
    return await db.collection('login').where({
      status: true,
      code: code
    })
    .update({
      data: {
        openid: wxContext.OPENID
      },
    })
  } catch(e) {
    console.error(e)
  }
}