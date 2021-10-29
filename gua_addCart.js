/*

 */
let jd_smiek_addCart_activityId = ''// 活动ID
let jd_smiek_addCart_activityUrl = ''// 活动地址



const $ = new Env('关注加购有礼');
const notify = $.isNode() ? require('./sendNotify') : '';
//Node.js用户请在jdCookie.js处填写京东ck;
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
const cleanCart = require('./gua_cleancart_activity.js');

$.openCardBean = 20 // 京豆大于等于才会 入会

//IOS等用户直接用NobyDa的jd cookie
let cookiesArr = [], cookie = '', message = '', messageTitle = '';
activityId = $.getdata('jd_smiek_addCart_activityId') ? $.getdata('jd_smiek_addCart_activityId') : jd_smiek_addCart_activityId;// 活动ID
activityUrl = $.getdata('jd_smiek_addCart_activityUrl') ? $.getdata('jd_smiek_addCart_activityUrl') : jd_smiek_addCart_activityUrl;// 活动地址
let activityCookie = '';// 活动Cookie
let onMessage = false
if ($.isNode()) {
	if (process.env.jd_smiek_addCart_activityId) activityId = process.env.jd_smiek_addCart_activityId
	if (process.env.jd_smiek_addCart_activityUrl) activityUrl = process.env.jd_smiek_addCart_activityUrl

	Object.keys(jdCookieNode).forEach((item) => {
		cookiesArr.push(jdCookieNode[item])
	})
	if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => {
	};
	if(JSON.stringify(process.env).indexOf('GITHUB')>-1) process.exit(0)
}else {
	let cookiesData = $.getdata('CookiesJD') || "[]";
	cookiesData = jsonParse(cookiesData);
	cookiesArr = cookiesData.map(item => item.cookie);
	cookiesArr.reverse();
	cookiesArr.push(...[$.getdata('CookieJD2'), $.getdata('CookieJD')]);
	cookiesArr.reverse();
	cookiesArr = cookiesArr.filter(item => item !== "" && item !== null && item !== undefined);
}

if(activityUrl.indexOf('activityId') > -1){
	activityId = activityUrl.match(/activityId=([^&]+)/) && activityUrl.match(/activityId=([^&]+)/)[1] || ''
}
activityUrl = activityUrl.match(/(https?:\/\/[^/]+)/) && activityUrl.match(/(https?:\/\/[^/]+)/)[1] || ''

!(async () => {
	if (!cookiesArr[0]) {
		$.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/', {"open-url": "https://bean.m.jd.com/"});
		return;
	}
	if(!activityId || !activityUrl){
		$.msg($.name, '', `活动id不存在`);
		return
	}
	$.memberCount = 0;
	messageTitle += `活动id: ${activityId}\n`;
	console.log(`活动id: ${activityId}`)
	console.log(`活动url: ${activityUrl}`)
	$.toactivity = true
	$.out = false
	$.outFlag = false
	for (let i = 0; i < cookiesArr.length; i++) {
		if (cookiesArr[i]) {
			cookie = cookiesArr[i];
			$.UserName = decodeURIComponent(cookie.match(/pt_pin=(.+?);/) && cookie.match(/pt_pin=(.+?);/)[1])
			$.index = i + 1;
			$.isLogin = true;
			$.nickName = '';
			console.log(`\n******开始【京东账号${$.index}】${$.nickName || $.UserName}*********\n`);
			getUA()
			await run();
			if($.out || $.outFlag) break
		}
	}
	await showMsg();
})()
	.catch((e) => {
		$.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
	})
	.finally(() => {
		$.done();
	})

async function run() {
	if($.out || $.outFlag) return
	$.sid = '', $.userId = '', $.Token = '', $.Pin = '', $.id = '';
	$.saveTeam = false
	await getCk()
	await getshopInfo()
	if($.sid && $.userId){
		await getToken()
		if($.Token) await getPin()
		if(!$.Pin) {
			message += `【京东账号${$.index}】 获取pin失败\n`;
			return
		}
		await getSimpleActInfoVo()
		// console.log($.userId)
		// console.log('pin:' + $.Pin)
		await activityContent()
		if(!$.id){
			console.log('获取不到活动信息')
			return
		}
		console.log(`加购件数${$.hasCollectionSize}/${$.needCollectionSize}`)
		console.log(`\n奖品->${$.drawName} 类型${$.drawType}`)
		if(messageTitle.indexOf('奖品: ') == -1){
			console.log($.shopName)
			messageTitle += `奖品: ${$.drawName}\n`
		}
		if(![6,16].includes(Number($.drawType))){
			console.log('\n奖品不是京豆或红包')
			$.out = true
			onMessage = true
			return
		}
		if(![5,6].includes(Number($.type))){
			messageTitle += `活动可能不是关注或者加购\n`;
			console.log('活动可能不是关注或者加购')
			// console.log('活动要求不是关注店铺，可能需要加入店铺会员')
			$.out = true
			return
		}
		if($.out) return
		await getActMemberInfo()
		if(!$.openCard && $.openCardLink){
			if(Number($.drawName.replace('京豆','')) >= $.openCardBean || $.drawName.indexOf('现金红包') > -1){
				await join($.userId)
				await $.wait(1000);
			}else{
				if(messageTitle.indexOf('需要入会') == -1){
					messageTitle += `需要入会: 奖品京豆大于${$.openCardBean}或者是现金红包\n`
				}
				console.log(`需要入会: 奖品京豆大于${$.openCardBean}或者是现金红包\n不符合脚本要求`)
				message += `【京东账号${$.index}】 需要入会，不符合脚本要求\n`;
				// $.out = true
				onMessage = true
				return
			}
		}
		// if($.needFollow && !$.hasFollow){
			await followShop()
			await $.wait(1000);
		// }
		// 加购列表信息 需要替换
		// await findSkus()
		// /act/common/findSkus
		$.num = $.hasCollectionSize || 0
		let skuIdAll = ''
		let addNameAll = ''
		$.runFlag = false
		let flag = false
		for(let i of $.cpvos){
			if(i.collection == false){
				if($.num >= $.needCollectionSize) break
				if(!skuIdAll){
					skuIdAll = []
					addNameAll = []
					$.cpvos.forEach(function(value,index,array) {
						if(skuIdAll.length < $.needCollectionSize) skuIdAll.push(value.skuId)
						if(addNameAll.length < $.needCollectionSize) addNameAll.push(value.title)
					});
					skuIdAll = '['+skuIdAll.join(',')+']'
				}
				await task($.type, i.skuId, skuIdAll)
				if($.out || $.outFlag || $.runFlag) break
				flag = true
				await $.wait(parseInt(Math.random() * 500 + 500, 10));
			}
		}
		
		if($.out) return
		if($.type == 6 && flag){
			try{
				addNameAll = JSON.parse(addNameAll)
			}catch(e){
			}
			await $.wait(parseInt(Math.random() * 2500 + 3000, 10));
			await cleanCart.clean(cookie,'https://jd.smiek.tk/jdcleancatr_21102717',addNameAll)
		// 	await getPrize(!flag)
		// 	await $.wait(parseInt(Math.random() * 500 + 1000, 10));
		}
		await getPrize(flag,0)
		// if($.index >= 3 && $.type == 6) $.out = true
		if($.out) return
		await $.wait(2000);
	}else{
		onMessage = true
		console.log( `【京东账号${$.index}】 未能获取活动信息`)
		message += `【京东账号${$.index}】 未能获取活动信息\n`;
	}
}

function showMsg() {
	return new Promise(async resolve => {
		let url = `${activityUrl}/wxCollectionActivity/activity2/${activityId}?activityId=${activityId}`
		if(activityUrl.indexOf('cjhy-isv.isvjcloud.com') > -1) url = `${activityUrl}/wxCollectionActivity/activity?activityId=${activityId}`
		// let openAppUrl = openAppUrl()
		console.log('\n运行完毕')
			$.msg($.name, ``, `${$.shopName}\n${messageTitle}${message}`);
		if(onMessage){
			if ($.isNode()){
				await notify.sendNotify(`${$.name}`, `${$.shopName}\n${messageTitle}${message}\n\n${url}`);
			}else{
				await tgBotNotifys($.name,`${$.shopName}\n${messageTitle}${message}\n\n${url}`)
			}
		}
		// console.log(`\n复制到浏览器打开可在京东APP查看该活动详情：\n${url}`)
		resolve()
	})
}
function openAppUrl() {
	let url = `${activityUrl}/wxCollectionActivity/activity2/${activityId}?activityId=${activityId}`;
	let openUrl = url;
	if (url.substr(0, 5) === 'https') {
		// 按照打开淘宝的方式打开京东，会出现无法跳转到对应的商品链接的问题
		// 这里需要添加上参数，这样就能够正确跳转，这个方法是在uni-app社区看到的
		let data = {category:'jump', des:'getCoupon',url: url.substr(8)}
		openUrl = `openApp.jdMobile://virtual?params=${encodeURIComponent(JSON.stringify(data))}`;
	} else if (url.substr(0, 4) === 'http') {
		let data = {category:'jump', des:'getCoupon',url: url.substr(7)}
		openUrl = `openApp.jdMobile://virtual?params=${encodeURIComponent(JSON.stringify(data))}`;
	}
	return openUrl;
}


function getPrize(flag=false,count=0) {
	return new Promise(resolve => {
		let pin = `${encodeURIComponent($.Pin)}`
		if(activityUrl.indexOf('cjhy-isv.isvjcloud.com') > -1) pin = `${encodeURIComponent(encodeURIComponent($.Pin))}`
		let body = `activityId=${activityId}&pin=${pin}`
		$.post(taskPostUrl('/wxCollectionActivity/getPrize',body), async(err, resp, data) => {
			try {
				if (err) {
					if(resp && typeof resp.statusCode != 'undefined'){
						if(resp.statusCode == 493){
							console.log('此ip已被限制，请过10分钟后再执行脚本\n')
							$.outFlag = true
						}
					}
					console.log(`${$.toStr(err)}`)
					console.log(`${$.name} 领奖 API请求失败，请检查网路重试`)
				} else {
					// console.log(data)
					let res = $.toObj(data)
					if(typeof res == 'object' && res.result == true){
						if(res.data){
							console.log(`领奖->${res.data.drawOk && res.data.name || res.data.errorMessage || '空气💨'}`)
							message += `【京东账号${$.index}】 ${res.data.drawOk && res.data.name && "获得"+res.data.name || res.data.errorMessage || '空气💨'}\n`
							onMessage = true
							if(res.data.errorMessage && res.data.errorMessage.indexOf('余额不足') > -1) $.out = true
						}
						if(typeof res.data.drawOk === 'undefined') console.log(`\n领奖->${data || ''}`)
					}else if(typeof res == 'object' && res.errorMessage){
						console.log(`领奖->${res.errorMessage || ''}`)
						if(res.errorMessage.indexOf('奖品已发完') > -1){
							$.out = true
						}
						if((res.errorMessage.indexOf('擦肩而过') > -1 || res.errorMessage.indexOf('未达到') > -1) && count < 10){
							await $.wait(2000)
							await getPrize(flag,++count)
						}else if(res.errorMessage.indexOf('您已领过奖了') === -1){
							if(!flag) message += `【京东账号${$.index}】 ${res.errorMessage}\n`
							onMessage = true
						}
					}else{
						console.log(data)
					}
				}
			} catch (e) {
				$.logErr(e, resp)
			} finally {
				resolve();
			}
		})
	})
}
function task(type, productId, productIds) {
	let info = ''
	let title = ''
	if(type == 6){
		// info = 'addCart'
		info = 'oneKeyAddCart' // 一键加购
		title = '加购'
	}else if(type == 5){
		info = 'collection'
		title = '关注'
	}
	if(info == '') return
	return new Promise(resolve => {
		let pin = `${encodeURIComponent($.Pin)}`
		if(activityUrl.indexOf('cjhy-isv.isvjcloud.com') > -1){
			pin = `${encodeURIComponent(encodeURIComponent($.Pin))}`
			info = 'addCart'
		}
		let body = `activityId=${activityId}&pin=${pin}`
		if(info == 'oneKeyAddCart'){
			body += `&productIds=${productIds}`
		}else{
			body += `&productId=${productId}`
		}
		$.post(taskPostUrl(`/wxCollectionActivity/${info}`,body), async(err, resp, data) => {
			try {
				if (err) {
					if(resp && typeof resp.statusCode != 'undefined'){
						if(resp.statusCode == 493){
							console.log('此ip已被限制，请过10分钟后再执行脚本\n')
							$.outFlag = true
						}
					}
					console.log(`${$.toStr(err)}`)
					console.log(`${$.name} ${title}商品 API请求失败，请检查网路重试`)
				} else {
					let res = $.toObj(data)
					if(typeof res == 'object' && res.result == true){
						if(res.data && typeof res.data.hasAddCartSize != 'undefined') $.num = res.data.hasAddCartSize
						if(res.data && typeof res.data.hasCollectionSize != 'undefined') $.num = res.data.hasCollectionSize
						console.log(`${title}商品${$.num}件`)
					}else if(typeof res == 'object' && res.errorMessage){
						console.log(`${title}商品->${res.errorMessage || ''}`)
						if(res.errorMessage.indexOf('活动已结束') > -1){
							message += `【京东账号${$.index}】 ${res.errorMessage}\n`
							messageTitle += `${res.errorMessage}\n`
							$.out = true
						}else{
							$.runFlag = true
						}
					}else{
						console.log(data)
					}
				}
			} catch (e) {
				$.logErr(e, resp)
			} finally {
				resolve();
			}
		})
	})
}
function followShop() {
	return new Promise(resolve => {
		let body = `userId=${$.userId}&activityId=${activityId}&buyerNick=${encodeURIComponent($.Pin)}&activityType=${$.type}`
		let url = '/wxActionCommon/followShop'
		if(activityUrl.indexOf('cjhy-isv.isvjcloud.com') > -1){
			body = `venderId=${$.userId}&activityId=${activityId}&buyerPin=${encodeURIComponent(encodeURIComponent($.Pin))}&activityType=${$.type}`
			url = `/wxActionCommon/newFollowShop`
		}
		$.post(taskPostUrl(url,body), async(err, resp, data) => {
			try {
				if (err) {
					console.log(`${$.toStr(err)}`)
					console.log(`${$.name} 关注 API请求失败，请检查网路重试`)
				} else {
					let res = $.toObj(data)
					if(typeof res == 'object' && res.result == true){
						console.log(data)
					}else if(typeof res == 'object' && res.errorMessage){
						console.log(`关注 ${res.errorMessage || ''}`)
					}else{
						console.log(data)
					}
				}
			} catch (e) {
				$.logErr(e, resp)
			} finally {
				resolve();
			}
		})
	})
}

function activityContent() {
	return new Promise(resolve => {
		let pin = `${encodeURIComponent($.Pin)}`
		if(activityUrl.indexOf('cjhy-isv.isvjcloud.com') > -1) pin = `${encodeURIComponent(encodeURIComponent($.Pin))}`
		let body = `activityId=${activityId}&pin=${pin}`
		$.post(taskPostUrl('/wxCollectionActivity/activityContent',body), async(err, resp, data) => {
			try {
				if (err) {
					console.log(`${$.toStr(err)}`)
					console.log(`${$.name} activityContent API请求失败，请检查网路重试`)
				} else {
					// console.log(data)
					let res = $.toObj(data)
					if(typeof res == 'object' && res.result == true){
						if(res.data && typeof res.data.id != 'undefined') $.id = res.data.id
						if(res.data && typeof res.data.hasFollow != 'undefined') $.hasFollow = res.data.hasFollow || ''
						if(res.data && typeof res.data.needFollow != 'undefined') $.needFollow = res.data.needFollow || ''
						if(res.data && typeof res.data.needCollectionSize != 'undefined') $.needCollectionSize = res.data.needCollectionSize || 0
						if(res.data && typeof res.data.hasCollectionSize != 'undefined') $.hasCollectionSize = res.data.hasCollectionSize || 0
						if(res.data && typeof res.data.type != 'undefined') $.type = res.data.type
						if(res.data && typeof res.data.cpvos != 'undefined') $.cpvos = res.data.cpvos
						if(res.data && typeof res.data.drawInfo != 'undefined') $.drawName = res.data.drawInfo.name
						if(res.data && typeof res.data.drawInfo != 'undefined') $.drawType = res.data.drawInfo.drawInfoType
					}else if(typeof res == 'object' && res.errorMessage){
						console.log(`activityContent ${res.errorMessage || ''}`)
					}else{
						console.log(data)
					}
				}
			} catch (e) {
				$.logErr(e, resp)
			} finally {
				resolve();
			}
		})
	})
}

function getActMemberInfo() {
	return new Promise(resolve => {
		let pin = `${encodeURIComponent($.Pin)}`
		let url = '/wxCommonInfo/getActMemberInfo'
		let body = `venderId=${$.userId}&activityId=${activityId}&pin=${pin}`
		if(activityUrl.indexOf('cjhy-isv.isvjcloud.com') > -1) {
			pin = `${encodeURIComponent(encodeURIComponent($.Pin))}`
			url = '/mc/new/brandCard/common/shopAndBrand/getOpenCardInfo'
			body = `venderId=${$.userId}&buyerPin=${pin}&activityType=${$.type}`
		}
		$.post(taskPostUrl(url,body), async(err, resp, data) => {
			try {
				if (err) {
					console.log(`${$.toStr(err)}`)
					console.log(`${$.name} getActMemberInfo API请求失败，请检查网路重试`)
				} else {
					let res = $.toObj(data)
					if(typeof res == 'object' && res.result == true){
						if(res.data && typeof res.data.openCard != 'undefined') $.openCard = res.data.openCard
						if(res.data && typeof res.data.openedCard != 'undefined') $.openCard = res.data.openedCard
						if(res.data && typeof res.data.openCardLink != 'undefined') $.openCardLink = res.data.openCardLink || ''
						if(res.data && typeof res.data.openCardUrl != 'undefined') $.openCardLink = res.data.openCardUrl || ''
						if(res.data && typeof res.data.actMemberStatus != 'undefined') $.actMemberStatus = res.data.actMemberStatus
					}else if(typeof res == 'object' && res.errorMessage){
						console.log(`getActMemberInfo ${res.errorMessage || ''}`)
					}else{
						console.log(data)
					}
				}
			} catch (e) {
				$.logErr(e, resp)
			} finally {
				resolve();
			}
		})
	})
}
function getSimpleActInfoVo() {
	return new Promise(resolve => {
		let body = `activityId=${activityId}`
		let url = '/customer/getSimpleActInfoVo'
		$.post(taskPostUrl(url,body), async(err, resp, data) => {
			try {
				if (err) {
					console.log(`${$.toStr(err)}`)
					console.log(`${$.name} getSimpleActInfoVo API请求失败，请检查网路重试`)
				} else {
					// console.log(data)
					let res = $.toObj(data)
					if(typeof res == 'object' && res.result == true){
						if(res.data && typeof res.data.activityType != 'undefined') $.type = res.data.activityType || 0
					}else if(typeof res == 'object' && res.errorMessage){
						console.log(`getSimpleActInfoVo ${res.errorMessage || ''}`)
					}else{
						console.log(data)
					}
				}
			} catch (e) {
				$.logErr(e, resp)
			} finally {
				resolve();
			}
		})
	})
}
function getPin() {
	return new Promise(resolve => {
		let body = `userId=${$.userId}&token=${$.Token}&fromType=APP`
		$.post(taskPostUrl('/customer/getMyPing',body), async(err, resp, data) => {
			try {
				if (err) {
					console.log(`${$.toStr(err)}`)
					console.log(`${$.name} getMyPing API请求失败，请检查网路重试`)
				} else {
					let res = $.toObj(data)
					if(typeof res == 'object' && res.result == true){
						if(res.data && typeof res.data.secretPin != 'undefined') $.Pin = res.data.secretPin
					}else if(typeof res == 'object' && res.errorMessage){
						console.log(`getMyPing ${res.errorMessage || ''}`)
					}else{
						console.log(data)
					}
				}
			} catch (e) {
				$.logErr(e, resp)
			} finally {
				resolve();
			}
		})
	})
}
function getshopInfo() {
	return new Promise(resolve => {
		$.post(taskPostUrl('/wxCollectionActivity/shopInfo',`activityId=${activityId}`), async(err, resp, data) => {
			try {
				if (err) {
					console.log(`${$.toStr(err)}`)
					console.log(`${$.name} shopInfo API请求失败，请检查网路重试`)
				} else {
					// console.log(data)
					let res = $.toObj(data)
					if(typeof res == 'object' && res.result == true){
						if(res.data && typeof res.data.sid != 'undefined') $.sid = res.data.sid
						if(res.data && typeof res.data.userId != 'undefined') $.userId = res.data.userId
						if(res.data && typeof res.data.shopName != 'undefined') $.shopName = res.data.shopName
					}else if(typeof res == 'object' && res.errorMessage){
						console.log(`shopInfo ${res.errorMessage || ''}`)
					}else{
						console.log(data)
					}
				}
			} catch (e) {
				$.logErr(e, resp)
			} finally {
				resolve();
			}
		})
	})
}
function getToken() {
	return new Promise(resolve => {
		let body = `body=%7B%22url%22%3A%22https%3A//lzkj-isv.isvjcloud.com%22%2C%22id%22%3A%22%22%7D&uuid=925ce6441339525429252488722251fff6b10499&client=apple&clientVersion=10.1.4&st=1633777078141&sv=111&sign=00ed6b6f929625c69f367f1a0e5ad7c7`
		if(activityUrl.indexOf('cjhy-isv.isvjcloud.com') > -1) body = 'body=%7B%22url%22%3A%22https%3A//cjhy-isv.isvjcloud.com%22%2C%22id%22%3A%22%22%7D&uuid=920cd9b12a1e621d91ca2c066f6348bb5d4b586b&client=apple&clientVersion=10.1.4&st=1633916729623&sv=102&sign=9eee1d69b69daf9e66659a049ffe075b'
		$.post(taskUrl('?functionId=isvObfuscator',body), async(err, resp, data) => {
			try {
				if (err) {
					console.log(`${$.toStr(err)}`)
					console.log(`${$.name} isvObfuscator API请求失败，请检查网路重试`)
				} else {
					let res = $.toObj(data)
					if(typeof res == 'object' && res.errcode == 0){
						if(typeof res.token != 'undefined') $.Token = res.token
					}else if(typeof res == 'object' && res.message){
						console.log(`isvObfuscator ${res.message || ''}`)
					}else{
						console.log(data)
					}
				}
			} catch (e) {
				$.logErr(e, resp)
			} finally {
				resolve();
			}
		})
	})
}

function getCk() {
	return new Promise(resolve => {
		let url = `${activityUrl}/wxCollectionActivity/activity2/${activityId}?activityId=${activityId}`
		if(activityUrl.indexOf('cjhy-isv.isvjcloud.com') > -1) url = `${activityUrl}/wxCollectionActivity/activity?activityId=${activityId}`
		let get = {
			url,
			followRedirect:false,
			headers: {
				"Cookie": cookie,
				"User-Agent": $.UA,
			}
		}
		$.get(get, async(err, resp, data) => {
			try {
				if (err) {
					console.log(`${$.toStr(err)}`)
					console.log(`${$.name} cookie API请求失败，请检查网路重试`)
				} else {
					let end = data.match(/(活动已经结束)/) && data.match(/(活动已经结束)/)[1] || ''
					if(end){
						$.out = true
						message += '活动已结束'
						console.log('活动已结束')
					}

					let LZ_TOKEN_KEY = ''
					let LZ_TOKEN_VALUE = ''
					let setcookies = resp['headers']['set-cookie'] || resp['headers']['Set-Cookie'] || ''
					let setcookie = ''
					if(setcookies){
						if(typeof setcookies != 'object'){
							setcookie = setcookies.split(',')
						}else setcookie = setcookies
						for (let ck of setcookie) {
							let name = ck.split(";")[0].trim()
							if(name.split("=")[1]){
								if(name.indexOf('LZ_TOKEN_KEY=')>-1) LZ_TOKEN_KEY = name.replace(/ /g,'')+';'
								if(name.indexOf('LZ_TOKEN_VALUE=')>-1) LZ_TOKEN_VALUE = name.replace(/ /g,'')+';'
							}
						}
					}
					if(LZ_TOKEN_KEY && LZ_TOKEN_VALUE) activityCookie = `${LZ_TOKEN_KEY} ${LZ_TOKEN_VALUE}`

				}
			} catch (e) {
				$.logErr(e, resp)
			} finally {
				resolve();
			}
		})
	})
}

function getshopactivityId(venderId) {
	return new Promise(resolve => {
		$.get(shopactivityId(`${venderId}`), async (err, resp, data) => {
			try {
				data = JSON.parse(data);
				if(data.success == true){
					// console.log($.toStr(data.result))
					// console.log(`入会:${data.result.shopMemberCardInfo.venderCardName || ''}`)
					$.shopactivityId = data.result.interestsRuleList && data.result.interestsRuleList[0] && data.result.interestsRuleList[0].interestsInfo && data.result.interestsRuleList[0].interestsInfo.activityId || ''
				}
			} catch (e) {
				$.logErr(e, resp)
			} finally {
				resolve();
			}
		})
	})
}
function shopactivityId(functionId) {
	return {
		url: `https://api.m.jd.com/client.action?appid=jd_shop_member&functionId=getShopOpenCardInfo&body=%7B%22venderId%22%3A%22${functionId}%22%2C%22channel%22%3A401%7D&client=H5&clientVersion=9.2.0&uuid=88888`,
		headers: {
			'Content-Type': 'text/plain; Charset=UTF-8',
			'Origin': 'https://api.m.jd.com',
			'Host': 'api.m.jd.com',
			'accept': '*/*',
			'User-Agent': $.UA,
			'content-type': 'application/x-www-form-urlencoded',
			'Referer': `https://shopmember.m.jd.com/shopcard/?venderId=${functionId}&shopId=${functionId}&venderType=5&channel=401`,
			'Cookie': cookie
		}
	}
}
function join(venderId) {
	return new Promise(async resolve => {
		$.shopactivityId = ''
		await $.wait(1000)
		await getshopactivityId(venderId)
		$.get(ruhui(`${venderId}`), async (err, resp, data) => {
			try {
				// console.log(data)
				res = $.toObj(data);
				if(typeof res == 'object'){
					if(res.success === true){
						console.log(res.message)
						if(res.result && res.result.giftInfo){
							for(let i of res.result.giftInfo.giftList){
								console.log(`入会获得:${i.discountString}${i.prizeName}${i.secondLineDesc}`)
							}
						}
					}else if(typeof res == 'object' && res.message){
						console.log(`${res.message || ''}`)
					}else{
						console.log(data)
					}
				}else{
					console.log(data)
				}
			} catch (e) {
				$.logErr(e, resp)
			} finally {
				resolve();
			}
		})
	})
}
function ruhui(functionId) {
	let activityId = ``
	if($.shopactivityId) activityId = `,"activityId":${$.shopactivityId}`
	return {
		url: `https://api.m.jd.com/client.action?appid=jd_shop_member&functionId=bindWithVender&body={"venderId":"${functionId}","shopId":"${functionId}","bindByVerifyCodeFlag":1,"registerExtend":{},"writeChildFlag":0${activityId},"channel":401}&client=H5&clientVersion=9.2.0&uuid=88888`,
		headers: {
			'Content-Type': 'text/plain; Charset=UTF-8',
			'Origin': 'https://api.m.jd.com',
			'Host': 'api.m.jd.com',
			'accept': '*/*',
			'User-Agent': $.UA,
			'content-type': 'application/x-www-form-urlencoded',
			'Referer': `https://shopmember.m.jd.com/shopcard/?venderId=${functionId}&shopId=${functionId}&venderType=5&channel=401`,
			'Cookie': cookie
		}
	}
}

function taskPostUrl(url,body) {
	let Referer = `${activityUrl}/wxCollectionActivity/activity2/${activityId}?activityId=${activityId}`
	if(activityUrl.indexOf('cjhy-isv.isvjcloud.com') > -1) Referer = `${activityUrl}/wxCollectionActivity/activity?activityId=${activityId}`
	return {
		url: `${activityUrl}${url}`,
		body: body,
		headers: {
			"Accept": "application/json",
			"Accept-Encoding": "gzip, deflate, br",
			"Accept-Language": "zh-cn",
			"Connection": "keep-alive",
			"Content-Type": "application/x-www-form-urlencoded",
			"Referer": Referer,
			"Cookie": cookie+activityCookie,
			"User-Agent": $.UA,
		}
	}
}

function taskUrl(url,body) {
	return {
		url: `https://api.m.jd.com/client.action${url}`,
		body: body,
		headers: {
			"Accept": "*/*",
			"Accept-Encoding": "gzip, deflate, br",
			"Accept-Language": "zh-cn",
			"Connection": "keep-alive",
			"Content-Type": "application/x-www-form-urlencoded",
			"Host": "api.m.jd.com",
			"Cookie": cookie,
			"User-Agent": $.UA,
		}
	}
}

function getUA(){
	$.UA = `jdapp;iPhone;10.1.0;14.3;${randomString(40)};network/wifi;model/iPhone12,1;addressid/4199175193;appBuild/167774;jdSupportDarkMode/0;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1`
}
function randomString(e) {
	e = e || 32;
	let t = "abcdef0123456789", a = t.length, n = "";
	for (i = 0; i < e; i++)
		n += t.charAt(Math.floor(Math.random() * a));
	return n
}

function jsonParse(str) {
	if (typeof str == "string") {
		try {
			return JSON.parse(str);
		} catch (e) {
			console.log(e);
			$.msg($.name, '', '不要在BoxJS手动复制粘贴修改cookie')
			return [];
		}
	}
}

// prettier-ignore
function Env(t,e){"undefined"!=typeof process&&JSON.stringify(process.env).indexOf("GITHUB")>-1&&process.exit(0);class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),n={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}
