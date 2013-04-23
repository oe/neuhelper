var timer = {'in':null,'out':null};


function removeLogBefore(day) { //clear log before "day" days ago
	day = day | 0;
	if (day > 0 && db) {
		db.transaction(function  (tx) {
			var time = + new Date();
			time -= day * 24 *  60 * 60 * 1000;
			tx.executeSql('DELETE FROM klog WHERE id < ?',[time]);
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
		checked = false,
		timesetting = null,
		checktype = 0,
		htmlstr = '',
		htmlstr2 = '';
	if (settings && settings.checktype) {
		checktype = settings.checktype;
	}
	if (!checktype) {
		return;
	}
	htmlstr =  config.htmlstr;
	htmlstr = htmlstr.substring(start,end);
	htmlstr = htmlstr.replace(/<img[^>]+>/g,''); //remove img tag
	htmlstr = htmlstr.replace(/background="[^"]+"/g,''); //remove background image
	if (-1 == htmlstr.indexOf('name="attendanceForm"')) {
		localdata_attr('settings','checktype',0);
		push_notification({body:"用户名密码不好使啊！请在选项页中再次输入您的用户名及密码！"});
		return;
	}
	div = document.createElement('div');
	div.innerHTML = htmlstr;
	table = div.querySelectorAll('table')[8]; // focus on attendance table
	table = table.querySelectorAll('tr');
	if ((CHCKIN & checktype) == CHCKIN) {
		checked = false;
		htmlstr2 = htmlstr;
		if (table[2]) {
			checked = true;
			htmlstr2 = table[2].innerText.replace(/\s+/g,' ');
		}
		timesetting = settings.checktime['in'];
		checkAttendaceTime (timesetting,checked,htmlstr2);
	}

	if ((CHCKOUT & checktype) == CHCKOUT) {
		checked = false;
		htmlstr2 = htmlstr;
		if (table[4]) {
			checked = true;
			htmlstr2 = table[4].innerText.replace(/\s+/g,' ');
		}
		timesetting = settings.checktime['out'];
		checkAttendaceTime (timesetting,checked,htmlstr2);
	}
	div = null;
	table = null;
	config = null;
}

function checkAttendaceTime (timesetting,checked,html) {
	var log = '';
	if (checked) {
		log = '已经' + timesetting.name + '。';
		if (html.length < 100) {
			log += '打卡信息为:<br />' + html;
		}
		logmsg({'log':log});
		setCheckinoutTimer(timesetting,true);
	} else{
		var d = new Date(),
			day = d.getDay(),
			hour = d.getHours(),
			minute = d.getMinutes(),
			noweekend = localdata_attr('settings','noweekend');
		if (noweekend) {
			if (day == 6 || day === 0) {
				setCheckinoutTimer(timesetting,true);
				return false;
			}
		}
		if (hour < timesetting.hour || (hour == timesetting.hour && minute < timesetting.minminute)) {
			setCheckinoutTimer(timesetting,false);
		} else if(hour == timesetting.hour && minute >= timesetting.minminute && minute <= timesetting.maxminute) {
			__doAttendance(html);
			setCheckinoutTimer(timesetting,true);
		} else {
			log = '已经过了' + timesetting.name + '时间，未自动打卡';
			logmsg({'log':log,'type':'warning'});
			log += ' 现在时间： ' + formatDate(d);
			push_notification({body:log,tile:'自动打卡通知',time:false});
			setCheckinoutTimer(timesetting,true);
		}
	}
}

function __doAttendance (html) {
	console.log('attenace check in called ');
	return false;
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
			console.log(str);
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
	clearTimeout(timer[timesetting.type]);
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
	timer[timesetting.type] = setTimeout(autoCheckInOut,time);
	newTime = new Date(d.getTime() + time);
	log = '下次' + timesetting.name + '时间为：' + formatDate(newTime);
	logmsg({'log':log});
}

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
	if (request.method == "getAccountInfo"){
		if (localdata_attr('account','available')) {
			sendResponse(localdata_attr('account','default'));
		} else {
			push_notification({title:'账户通知',body:'账户配置不正确，请到选项中的账户管理页中填写正确的用户名密码。'});
			sendResponse({'available':false});
		}
	}else if(request.method == 'showAddAccountTip'){
		push_notification({title:'账户通知',body:'您还没有添加账户哦，请到选项中的账户管理页中添加账户！'});
		sendResponse({});
	}
	else
		sendResponse({}); //
});

function init () {
	var account = localdata_attr('account','default');
	if (account) {
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
				clearTimeout(timer['in']);
				clearTimeout(timer['out']);
				logmsg({'log':'关闭了自动打卡'});
			}
			return;
		}
		available = localdata_attr('account','available');
		if (!available) {
			logmsg({'log':'因账户设置错误，自动打卡启用失败。','type':'warning'});
			clearTimeout(timer['in']);
			clearTimeout(timer['out']);
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
					logmsg({'log':'启用了自动签到'});
					clearTimeout(timer['out']);
					break;
				case 2:
					logmsg({'log':'启用了自动签退'});
					clearTimeout(timer['in']);
					break;
				case 3:
					logmsg({'log':'启用了自动签到、签退'});
					break;
			}
		}
		loginKaoqin({callback:doAttendance});
	} else if (event.key == 'account') {
		checktype = localdata_attr('settings','checktype');
		if (!newValue.available && !checktype) {
			logmsg({'log':'因账户配置错误，已取消自动打卡','type':'warning'});
			clearTimeout(timer['in']);
			clearTimeout(timer['out']);
		}
	}
}, false);

init();