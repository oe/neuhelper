var timer = 0,
	db = null; //db handle;

(function (window) { // init db handle
	db = openDatabase('Neuhelper','1.0','Neuhelper\'s datebase',2 * 1024 * 1024);
	db.transaction(function  (tx) {
		tx.executeSql('CREATE TABLE IF NOT EXISTS klog (id integer PRIMARY KEY autoincrement,log,time,type)');
	});
})(window);

function logmsg (data) { //write log to database
	if (db && data && data.log) {
		var d = new Date();
		data.type = data.type || 'info';
		db.transaction(function  (tx) {
			tx.executeSql('INSERT INTO klog (log,time,type) VALUES (?,?,?)',[data.log,formatDate(d),data.type]);
		});
	}
}

function removeLogOver(number) { //clear log before "day" days ago
	number = number | 0;
	if (number > 0 && db) {
		db.transaction(function  (tx) {
			tx.executeSql('DELETE FROM klog WHERE id NOT IN (SELECT id FROM klog ORDER BY id DESC limit ?)',[number]);
		});
	}
}

function doAttendance (config) {
	var table = '',
		div = null;
		start = config.htmlstr.indexOf('<body>') + 6,
		end = config.htmlstr.indexOf('</body>'),
		accountAccessAble = false,
		settings = localdata_attr('settings'),
		checktype = 0,
		htmlstr = '',
		d = new Date(),
		checked = -1,
		now = {
			'hour':   d.getHours(),
			'minute': d.getMinutes()
		},
		day = d.getDay(),
		log = '',
		checkStatus = {};
	if (settings && settings.checktype) {
		checktype = settings.checktype;
	}
	if (!checktype) {
		return;
	}

	if (settings.noweekend && ((day === 0) || (day == 6))) {
		if (CHCKIN == (checktype & CHCKIN)) {
			setCheckinoutTimer(settings.checktime['in'],true);
		} else {
			setCheckinoutTimer(settings.checktime['out'],true);
		}
		return;
	}

	htmlstr =  config.htmlstr
				.substring(start,end)
				.replace(/<img[^>]+>/g,'') //remove img tag
				.replace(/background="[^"]+"/g,'');//remove background image
	if (-1 == htmlstr.indexOf('name="attendanceForm"')) {
		localdata_attr('settings','checktype',0);
		push_notification({body:"用户名密码不好使啊！请在选项页中再次输入您的用户名及密码！",title:'账户通知'});
		return;
	}
	div = document.createElement('div');
	div.innerHTML = htmlstr;
	table = div.querySelectorAll('table')[8]; // focus on attendance table
	table = table.querySelectorAll('tr');
	if ((checktype & CHCKIN) == CHCKIN) {
		checkStatus['in'] = {'checked':false};
		if (table[2] && (-1 == table[2].innerText.indexOf('今天还没有打卡记录'))) {
			checkStatus['in']['checked'] = true;
			checkStatus['in']['timestr'] = table[2].innerText.replace(/\s+/g,' ');
		}
		checkStatus['in']['status'] = compareChecktime(now,settings.checktime['in']);
	}

	if ((checktype & CHCKOUT) == CHCKOUT) {
		checkStatus['out'] = {'checked':false};
		if (table[4]) {
				checkStatus['out']['checked'] = true;
				checkStatus['out']['timestr'] = table[4].innerText.replace(/\s+/g,' ');
		}
		checkStatus['out']['status'] = compareChecktime(now,settings.checktime['out']);
	}
	if (checktype != 3) {
		if (checkStatus['in']) {
			checkStatus = checkStatus['in'];
			settings = settings.checktime['in'];
		} else {
			checkStatus = checkStatus['out'];
			settings = settings.checktime['out'];
		}
		if (!settings) {
			logmsg();
			return;
		}
		if (checkStatus['status'] < 0) {
			if (checkStatus['checked']) {
				log = '已经' +settings.name + '了，打卡信息为<br>' + checkStatus['timestr'];
				logmsg({'log':log});
				setCheckinoutTimer (settings,true);
			} else {
				setCheckinoutTimer (settings,false);
			}
		} else if(!checkStatus['status']) {
			if (checkStatus['checked']) {
				log = '已经' +settings.name + '了，打卡信息为<br>' + checkStatus['timestr'];
				logmsg({'log':log});
			} else {
				__doAttendance(htmlstr);
			}
			setCheckinoutTimer (settings,true);
		} else {
			if (!checkStatus['checked']) {
				log = '已经过了' +settings.name + '时间，未自动' +settings.name + '。当前时间 ' + formatDate(d);
				push_notification({body:log,title:'自动打卡通知',time:false});
				logmsg({'log':log,type:'warning'});
			}
			setCheckinoutTimer (settings,true);
		}
	} else {
		if (checkStatus['out']['status'] == checkStatus['in']['status']) {
			if (checkStatus['in']['status'] < 0) {
				if (checkStatus['in']['checked']) {
					log = '已经签到了，打卡信息为<br>' + checkStatus['in']['timestr'];
					logmsg({'log':log});
					setCheckinoutTimer (settings.checktime['out'],false);
				} else {
					setCheckinoutTimer (settings.checktime['in'],false);
				}
			} else {
				log = '';
				if (!checkStatus['in']['checked'] && !checkStatus['out']['checked']) {
					log = '已经过了签到和签退的时间，没有自动签到和签退。当前时间' + formatDate(d);
				} else if (!checkStatus['out']['checked']) {
					log = '已经过了签退的时间，没有自动签退。当前时间' + formatDate(d);
				}
				if (log) {
					push_notification({'body':log,'title':'自动打卡通知','time':false});
					logmsg({'log':log,type:'warning'});
				}
				setCheckinoutTimer(settings.checktime['in'],true);
			}
		} else {
			if (!checkStatus['in']['status']) {
				if (checkStatus['in']['checked']) {
					log = '已经签到了，打卡信息为<br>' + checkStatus['in']['timestr'];
					logmsg({'log':log});
				} else {
					__doAttendance(htmlstr);
				}
				setCheckinoutTimer(settings.checktime['out'],false);
			} else {
				if (!checkStatus['out']['status']) {
					if (checkStatus['out']['checked']) {
						log = '已经签退了，打卡信息为<br>' + checkStatus['out']['timestr'];
						logmsg({'log':log});
					} else {
						__doAttendance(htmlstr);
					}
					setCheckinoutTimer (settings.checktime['in'],true);
				} else {
					if (checkStatus['out']['checked']) {
						log = '已经过了签退的时间，没有自动签退。当前时间' + formatDate(d);
						push_notification({'body':log,'title':'自动打卡通知','time':false});
						setCheckinoutTimer (settings.checktime['in'],true);
					} else {
						setCheckinoutTimer (settings.checktime['out'],false);
					}
				}
			}
		}
	}
	div = null;
	table = null;
	config = null;
}

function compareChecktime (now,timesetting) {
	if (!timesetting) {
		return 1;
	}
	if (now.hour < timesetting.hour || (now.hour == timesetting.hour && now.minute < timesetting.minminute)) {
		return -1;
	} else if(now.hour == timesetting.hour && now.minute >= timesetting.minminute && now.minute <= timesetting.maxminute) {
		return 0;
	} else {
		return 1;
	}
}


function __doAttendance (html) {
	var tmpid,
		start,
		end,
		data;
	start = html.indexOf('value="') + 7;
	end = html.indexOf('"',start);
	tmpid = html.substring(start,end);
	data = 'currentempoid=' + tmpid;
	$.ajax({
		url: urls.kaoqin.attendance_url,
		dataType:'html',
		method: "POST",
		data: data,
		success: function  (str) {
			logmsg({'log':'打卡成功！','type':'success'});
			removeLogOver(100);
		}
	});
}

function setCheckinoutTimer (timesetting,checked) {
	var d = new Date(),
		day = d.getDay(),
		hour = d.getHours(),
		minute = d.getMinutes(),
		time = timesetting.hour,
		noweekend = localdata_attr('settings','noweekend'),
		newTime,
		log;
	clearTimeout(timer);
	if (checked) {
		if (noweekend) {
			if (day == 5) {
				time += 24 + 24 + 24;
			} else if(day == 6) {
				time += 24 + 24;
			} else {
				time += 24;
			}
		} else {
			time += 24;
		}
	} else {
		if (noweekend) {
			if (day == 6) {
				time += 24 + 24;
			} else if(day === 0) {
				time += 24;
			}
		}
	}

	time -= hour; // hours left
	time *= 60; // turn hours to minutes
	time -= minute;
	time += timesetting.minminute;
	time += Math.random() * 10 | 0; // genertate a random time, 
									// make attendance time between 8:15 AM and 8:30;
	time *= 60 * 1000; // make it to microsecond
	timer = setTimeout(autoCheckInOut,time);
	newTime = new Date(d.getTime() + time);
	log = '下次' + timesetting.name + '时间为：' + formatDate(newTime);
	logmsg({'log':log});
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	var method = request.method;
	if (method) {
		switch(method) {
			case 'getAccountInfo':
				if (localdata_attr('account','available')) {
					sendResponse(localdata_attr('account','default'));
				} else {
					push_notification({title:'账户通知',body:'账户配置不正确，请到选项中的账户管理页中填写正确的用户名密码。'});
					sendResponse({'available':false});
				}
				break;
			case 'showAddAccountTip':
				push_notification({title:'账户通知',body:'您还没有添加账户哦，请到选项中的账户管理页中添加账户！'});
				sendResponse({});
				break;
			case 'kqdown':
				push_notification({title:'系统通知',body:'考勤网站挂了，自动打卡已取消。',time:false});
				logmsg({'log':'无法正常访问考勤网站，已取消自动打卡','type':'error'});
				clearTimeout(timer);
				sendResponse({});
				break;
			default:
				sendResponse({});
		}
	} else {
		sendResponse({});
	}
});

function init () {
	var account = localdata_attr('account','default');
	if (account && (typeof account == 'object')) {
		if (!localdata_attr('account','available')) {
			push_notification({title:'账户通知',body:'账户配置不正确，请到选项中的账户管理页中填写正确的用户名密码。'});
		} else {
			if(localdata_attr('settings','checktype')){
				autoCheckInOut();
			}
		}
	}else{
		push_notification({title:'账户通知',body:'您还没有添加账户哦，请到选项中的账户管理页中添加账户!'});
	}
}

function autoCheckInOut () {
	loginKaoqin({callback:doAttendance});
}

window.addEventListener("storage", function  (event) {
	var available,
		checktype,
		newValue = null,
		oldValue = null;
	if (event.oldValue == event.newValue) {
		return;
	}
	oldValue = decryptData(event.oldValue);
	newValue = decryptData(event.newValue);
	if (event.key == 'settings') {
		if (!newValue.checktype) {
			if (oldValue && (oldValue.checktype != newValue.checktype)) {
				clearTimeout(timer);
				logmsg({'log':'关闭了自动打卡'});
			}
			return;
		}
		available = localdata_attr('account','available');
		if (!available) {
			logmsg({'log':'因账户设置错误，自动打卡启用失败。','type':'warning'});
			clearTimeout(timer);
			return;
		}
		if (oldValue && (oldValue.checktype == newValue.checktype)) {
			if (oldValue.noweekend == newValue.noweekend) {
				logmsg({'log':'更新了自动打卡时间'});
			} else {
				if (newValue.noweekend) {
					logmsg({'log':'自动打卡设置更改周末不自动打卡'});
				} else {
					logmsg({'log':'自动打卡设置更改周末自动打卡'});
				}
			}
		} else {
			switch(newValue.checktype) {
				case 1:
					logmsg({'log':'打卡类型改为自动签到'});
					break;
				case 2:
					logmsg({'log':'打卡类型改为自动签退'});
					break;
				case 3:
					logmsg({'log':'打卡类型改为自动签到、签退'});
					break;
			}
		}
		clearTimeout(timer);
		loginKaoqin({callback:doAttendance});
	} else if (event.key == 'account') {
		checktype = localdata_attr('settings','checktype');
		if (newValue.available) {
			logmsg({log:'更新用户信息成功，当前用户名为' + newValue['default'].username});
		} else {
			if (!checktype) {
				logmsg({'log':'因账户配置错误，已取消自动打卡','type':'warning'});
				clearTimeout(timer);
			}
		}
	}
}, false);

init();