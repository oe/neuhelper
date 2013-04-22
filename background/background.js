var timer = {'in':null,'out':null},
	CHCKIN = 1,
	CHCKOUT = 2,
	db;

function logmsg (data) { //write log to database
	if (db && data && data.log) {
		var d = new Date();
		data.type = data.type || 'info';
		db.transaction(function  (tx) {
			tx.executeSql('INSERT INTO klog (id,log,time,type) VALUES (?,?,?,?)',[+d,data.log,formatDate(d),data.type]);
		});
	}
}

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
		checkintime = localdata_attr('settings','checkintime'),
		checktype = localdata_attr('settings','checktype'),
		checked = false,
		timesetting = null;
	config.htmlstr = config.htmlstr.substring(start,end);
	config.htmlstr = config.htmlstr.replace(/<img[^>]+>/g,''); //remove img tag
	config.htmlstr = config.htmlstr.replace(/background="[^"]+"/g,''); //remove background image
	if (-1 == config.htmlstr.indexOf('name="attendanceForm"')) {
		localdata_attr('settings','autocheckin',false);
		push_notification({body:"用户名密码不好使啊！请在选项页中再次输入您的用户名及密码！"});
		return;
	}
	div = document.createElement('div');
	div.innerHTML = config.htmlstr;
	table = div.querySelectorAll('table')[8]; // focus on attendance table
	table = table.querySelectorAll('tr');
	if (CHCKIN & checktype == CHCKIN) {
		checked = table[2] ? true : false;
		timesetting = localdata_attr(settings,'checkintime');
		checkAttendaceTime (timesetting,checked,config.htmlstr);
	}

	if (CHCKOUT & checktype == CHCKOUT) {
		checked = table[2] ? true : false;
		timesetting = localdata_attr(settings,'checkouttime');
		checkAttendaceTime (timesetting,checked,config.htmlstr);
	}
}

function checkAttendaceTime (timesetting,checked,html) {
	if (checked) {
		log('has checked in');
		setCheckinoutTimer(timesetting,checked);
	} else{
		var d = new Date(),
			day = d.getDay(),
			hour = d.getHours(),
			minute = d.getMinutes();
		if (notCheckInWeekend) {
			if (day == 6 || day === 0) {
				setCheckinoutTimer(timesetting,checked);
				return false;
			}
		}
		if (hour < timesetting.hour || (hour == timesetting.hour && minute < timesetting.minminute)) {
			setCheckinoutTimer();
		} else if(hour == timesetting.hour && minute >= timesetting.minminute && minute <= timesetting.maxminute) {
			docheckin();
			setCheckinoutTimer(timesetting,checked);
		} else {
			var log = '已经过了' + timesetting.name + '时间，未自动打卡';
			logmsg({'log':log,'type':'warning'});
			log += ' 现在时间： ' + formatDate(d);
			push_notification({body:log,tile:'自动打卡通知',time:false});
			setCheckinoutTimer(timesetting,checked);
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
		hour = date.getHours(),
		minute = date.getMinutes(),
		time = timesetting.hour,
		notCheckInWeekend = localdata_attr('settings','notCheckInWeekend'),
		newTime,
		log;
	clearTimeout(timer[timesetting.type]);
	if (checked) {
		if (notCheckInWeekend) {
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
		if (notCheckInWeekend) {
			if (day == 5) {
				time += 24 + 24 + 24;
			} else if(day == 6) {
				time += 24 + 24;
			} else {
				time += 24;
			}
		} else {
			if (hour > timesetting.hour || (hour == timesetting.hour && minute > timesetting.minminute)) {
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
	timer[timesetting.type] = setTimeout(loginKaoqin,time);
	newTime = new Date(d.getTime() + time);
	log = '下次' + timesetting.name + '时间为：' + formatDate(newTime);
	logmsg({'log':log});
}

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
	if (request.method == "getAccountInfo"){
		sendResponse(localdata_attr('account','default'));
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
		if(localdata_attr('settings','autocheckin')){
			loginKaoqin({callback:doAttendance});
			// clearTimeout(morningTimer);
		}
	}else{
		push_notification({title:'账户通知',body:'您还没有添加账户哦，请到选项中的账户管理页中添加账户！ init'});
	}
}


window.addEventListener("storage", function  (event) {
	console.log('storage event');
	if (event.key == 'settings') {
		if(!localdata_attr('settings','autocheckin')){
			clearTimeout(morningTimer);
		}
	}
	console.log('end storage event');
	// loginKaoqin();
}, false);

init();