var db = null; //db handle;

(function (window) { // init db handle
	db = openDatabase('Neuhelper','1.0','Neuhelper\'s datebase',2 * 1024 * 1024);
	db.transaction(function  (tx) {
		tx.executeSql('CREATE TABLE IF NOT EXISTS klog (id integer PRIMARY KEY autoincrement,log,time,type)');
	});
})(window);

function selectAllLog () {
	if (db) {
		db.transaction(function (tx) {
			tx.executeSql('DELETE FROM klog WHERE id NOT IN (SELECT id FROM klog ORDER BY id DESC limit ?)',[100]);
			tx.executeSql('SELECT * FROM klog ORDER BY id DESC', [], function (tx, results) {
				var len = results.rows.length,
					i = 0,
					msg = '';
				msg += '<table>';
				msg += '<thead><tr><th>时间</th><th>日志内容</th></tr></thead><tbody>';
				if (len) {
					for (i = 0; i < len; ++i) {
						msg += '<tr class="' + results.rows.item(i).type + '">';
						msg += '<td>' + results.rows.item(i).time + '</td>';
						msg += '<td>' + results.rows.item(i).log + '</td></tr>';
					}
				} else {
					msg += '<tr class="info"><td colspan="2">还没有日志呢！</td></tr>';
				}
				msg += '</tbody></table>';
				document.querySelector('#table-log').innerHTML = msg;
			}, null);
		});
	} else {
		var msg = '<table><tr class="error"><td colspan="2">内部错误，如果重复出现，请反馈，谢谢。</td></tr></table>';
		document.querySelector('#table-log').innerHTML = msg;
	}
}

function clearAllLog () {
	if (db) {
		db.transaction(function  (tx) {
			tx.executeSql('DELETE FROM klog');
		});
	}
}
function check_inputs (obj) {
	var ret = true;
	var contents = obj.parents('.setting-content');
	contents = contents.find('input');
	var val = '',input=null;
	for (var i = contents.length - 1; i >= 0; i--) {
		input = $(contents[i]);
		if('' === $.trim(input.val())){
			ret = false;
			input.val('').addClass('warning');
			input.next().text('填个空呗！').fadeIn();
		}
	}
	return ret;
}

function checkTimeSetting (time) {
	var tip = $('#save-settings').next(),
		typenames = {'in':'签到','out':'签退'},
		typename = typenames[time.type];

	if (time.type != 'in' && time.type != 'out') {
		tip.removeClass('info').addClass('warning').html(typename + '签到类型不对啊，你改网页了？').fadeIn();
		return false;
	}
	time.hour = parseInt(time.hour,10);
	if (isNaN(time.hour) || time.hour < 0 || time.hour > 23) {
		tip.removeClass('info').addClass('warning').html(typename + '时钟数需在0~23之间').fadeIn();
		return false;
	}
	time.minminute = parseInt(time.minminute,10);
	time.maxminute = parseInt(time.maxminute,10);
	if(isNaN(time.minminute) || time.minminute < 0 ||
		time.minminute > 59 || isNaN(time.maxminute) ||
		time.minminute < 0 || time.minminute > 59 ||
		(time.minminute + 4 ) >= time.maxminute){
		tip.removeClass('info').addClass('warning').html(typename + '分钟数需在0~59之间，并请确保分钟数之差大于4分钟').fadeIn();
		return false;
	}

	time.range = parseInt(time.range,10);
	if (isNaN(time.range) || time.range < 4 || (time.minminute + time.range) > time.maxminute) {
		tip.removeClass('info').addClass('warning').html('自动' + typename + '时间范围需不小于4分钟，并不得超过公司' + typename + '时间范围').fadeIn();
		return false;
	}

	time['name'] = typename;
	return time;
}

function clearSettingTip () {
	var btn = $('#save-settings');
	setTimeout(function () {
			btn.next().fadeOut(function  () {
				btn.removeClass('warning').addClass('info');
			});
		},4000);
}

function initSettingTab () {
	var settings = ls.attr('settings'),
		checkintime,
		checkouttime,
		checktype,
		noweekend,
		autocheckEnabled = false;
	settings = settings || {};

	if (!settings.checktype) {
		checktype = 3;
	} else {
		checktype = settings.checktype;
		autocheckEnabled = true;
	}

	if (settings.noweekend === undefined) {
		noweekend = true;
	} else {
		noweekend = settings.noweekend;
	}

	if (!settings.checktime || !settings.checktime['in']) {
		checkintime = {
			hour: 8,
			minminute: 15,
			maxminute: 50,
			range: 10
		};
	} else {
		checkintime = settings.checktime['in'];
	}
	if (!settings.checktime || !settings.checktime['out']) {
		checkouttime = {
			hour: 17,
			minminute: 30,
			maxminute: 40,
			range: 10
		};
	} else {
		checkouttime = settings.checktime['out'];
	}
	$('#enable-autocheckin').prop('checked',autocheckEnabled);
	$('#checkin-type').val(checktype + '');
	$('#noweekend').prop('checked',noweekend);
	$('#inhour').val(checkintime.hour);
	$('#inminminute').val(checkintime.minminute);
	$('#inmaxminute').val(checkintime.maxminute);
	$('#inrange').val(checkintime.range);
	$('#outhour').val(checkouttime.hour);
	$('#outminminute').val(checkouttime.minminute);
	$('#outmaxminute').val(checkouttime.maxminute);
	$('#outrange').val(checkouttime.range);
	if (!autocheckEnabled) {
		$('#settings input,#settings select').attr('disabled',true);
		$('#enable-autocheckin').attr('disabled',false);
		return;
	}

	if (CHCKIN != (checktype & CHCKIN) ) {
		$('#checkin').hide();
	}

	if (CHCKOUT != (checktype & CHCKOUT) ) {
		$('#checkout').hide();
	}
}

$(function  ($) {
	var hash = window.location.hash ? window.location.hash : '#accounts',
		feedback;

	$('.sidebar .nav li').on('click',function  () {
		var target;
		if ($(this).hasClass('current')) {
			return;
		}
		target = $(this).attr('data');
		$('.sidebar .nav li.current').removeClass('current');
		$(this).addClass('current');
		window.location.hash = target;
		target = target.substring(1);
		switch(target) {
			case 'accounts':
				var account = ls.attr('account','default');
				if (account) {
					$('#nickname').val(account.nickname);
					$('#username').val(account.username);
					$('#password').val(account.password);
				}
				break;
			case 'settings':
				initSettingTab();
				break;
			case 'kaoqin-log':
				selectAllLog();
				break;
			case 'feedback':
				if (!feedback) {
					feedback = 'http://app.evecalm.com/neuhelper/feedback.html';
					$('#feedbak-frame').attr('src',feedback);
				}
				break;
			default:
				break;
		}
	});

	$('.sidebar .nav li[data="' + hash + '"]')[0].click();

	$('#accounts').on('focus','input[type="text"],input[type="password"]',function  () {
		$(this).removeClass('warning');
		$(this).next().fadeOut();
	});

	$('#accounts').on('keydown','input[type="text"],input[type="password"]',function  (event) {
		if (event.keyCode == 13) {
			$('#save-account').click();
		}
	});

	$('#save-account').on('click',function  () {
		if(check_inputs($(this))){
			var data = {};
			$(this).val('正在验证您的账户...').attr('disabled',true);
			data['username'] = $.trim($('#username').val());
			data['password'] = $.trim($('#password').val());
			data['nickname'] = $.trim($('#nickname').val());
			loginKaoqin({
				savebtn: $(this),
				account: data,
				callback:function  (config) {
					var available = false,
						account = {};
					if (-1 == config.htmlstr.indexOf('name="attendanceForm"')) {
						config.savebtn.next().removeClass('info').addClass('warning').html('用户名密码不好使啊！再试下呗！').fadeIn();
					} else {
						available = true;
						config.savebtn.next().html('账户设置正常！保存成功！').fadeIn();
					}
					account['default'] = config.account;
					account['available'] = available;
					ls.set('account',account);
					config.savebtn.attr('disabled',false);
					config.savebtn.val('保存',false);
					setTimeout(function () {
						config.savebtn.next().fadeOut(function  () {
							$(this).removeClass('warning').addClass('info');
						});
						config = null;
					},4000);
				}});

		}
	});

	$('#save-settings').on('click',function  () {
		var checkin = false,
			checkout = false,
			checktype = $('#checkin-type').val(),
			noweekend = $('#noweekend').prop('checked'),
			checktime = ls.attr('settings') || {};
			checktime = checktime['checktime'] || {},
			settings  = {};
		checktype = parseInt(checktype,10);
		if (!$('#enable-autocheckin').prop('checked')) {
			checktype = 0;
			noweekend = true; //set noweekend to default ( true )
		}
		if (isNaN(checktype) || checktype < 0 || checktype > 3) {
			$(this).next().removeClass('info').addClass('warning').html('打卡类型错误！').fadeIn();
			clearSettingTip();
			return;
		}
		if (CHCKIN == (checktype & CHCKIN) ) {
			checkin = checkTimeSetting({
				hour:$('#inhour').val(),
				minminute:$('#inminminute').val(),
				maxminute:$('#inmaxminute').val(),
				range:$('#inrange').val(),
				type:'in'
			},'in');
			if (!checkin) {
				clearSettingTip();
				return;
			}
			checktime['in'] = checkin;
		} else {
			delete checktime['in'];
		}

		if (CHCKOUT == (checktype & CHCKOUT) ) {
			checkout = checkTimeSetting({
				hour:$('#outhour').val(),
				minminute:$('#outminminute').val(),
				maxminute:$('#outmaxminute').val(),
				range:$('#outrange').val(),
				type:'out'
			},'out');
			if (!checkout) {
				clearSettingTip();
				return;
			}
			checktime['out'] = checkout;
		} else {
			delete checktime['out'];
		}

		if (3 == checktype) {
			if (checkout.hour < checkin.hour ) {
				$(this).next().removeClass('info').addClass('warning').html('签退的时钟数需大于签到的时钟数！').fadeIn();
				clearSettingTip();
				return;
			}
		}

		settings.checktype = checktype;
		settings.checktype = checktype;
		settings.noweekend = noweekend;
		settings.checktime = checktime;
		ls.set('settings',settings);
		$(this).next().removeClass('warning').addClass('info').html('保存成功！').fadeIn();
		clearSettingTip();
	});

	$('#enable-autocheckin').on('click',function  () {
		if ($(this).prop('checked')) {
			$('#settings input,#settings select').prop('disabled',false);
		} else {
			$('#settings input,#settings select').prop('disabled',true);
			$(this).prop('disabled',false);
		}
	});

	$('#checkin-type').on('change',function  () {
		var val = $(this).val() | 0;
		if ((val & CHCKIN) == CHCKIN) {
			$('#checkin').show();
		} else {
			$('#checkin').hide();
		}

		if ((val & CHCKOUT) == CHCKOUT) {
			$('#checkout').show();
		} else {
			$('#checkout').hide();
		}
	});

	$('#clear-log').on('click',function  () {
		clearAllLog();
		selectAllLog();
	});
});