$(function  () {
	var hash = window.location.hash ? window.location.hash : 'accounts';

	function selectAllLog () {
		if (db) {
			db.transaction(function (tx) {
				tx.executeSql('SELECT * FROM klog ORDER BY id DESC', [], function (tx, results) {
					var len = results.rows.length,
						i = 0,
						msg = '';
					msg += '<table>';
					if (len) {
						for (i = 0; i < len; ++i) {
							msg += '<tr class="' + results.rows.item(i).type + '">';
							msg += '<td>' + results.rows.item(i).time + '</td>';
							msg += '<td>' + results.rows.item(i).log + '</td></tr>';
						}
					} else{
						msg += '<tr class="info"><td colspan="2">No logs has been found yet!</td></tr>';
					}
					msg += '</table>';
					document.querySelector('#ans').innerHTML = msg;
				}, null);
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
			}
		}
		return ret;
	}

	function removeAllLog () {
		if (db) {
			db.transaction(function  (tx) {
				tx.executeSql('DELETE FROM klog');
			});
		}
	}

	$('.sidebar .nav li a').on('click',function  () {
		var target = $(this).attr('href');
		target = target.substring(1);
		$('.sidebar .nav li a.current').removeClass('current');
		$('.contents div.selected').removeClass('selected');
		var href = ($(this).attr('href')).substring(1);
		$(this).addClass('current');
		$('#' + href).addClass('selected');
		console.log(target);
		switch(target) {
			case 'accounts':
				var account = localdata_attr('account','default');
				if (account) {
					$('#nickname').val(account.nickname);
					$('#username').val(account.username);
					$('#password').val(account.password);
				}
				break;
			case 'settings':
				var settings = localdata_attr('settings'),
					checkintime;
				if (typeof settings.autocheckin === 'undefined') {
					settings.autocheckin = false;
					localdata_attr('settings','autocheckin',settings.autocheckin);
				}
				if (typeof settings.checkintime === 'undefined') {
					checkintime = {
						hour: 8,
						minminute: 15,
						maxminute: 50,
						range: 10
					};
					localdata_attr('settings','checkintime',checkintime);
				} else {
					checkintime = settings.checkintime;
				}
				console.log(checkintime);
				$('#enable-autocheckin').attr('checked',settings.autocheckin);
				$('#hour').val(checkintime.hour);
				$('#minminute').val(checkintime.minminute);
				$('#maxminute').val(checkintime.maxminute);
				$('#range').val(checkintime.range);
				$('#range-tip').text('从' + checkintime.hour + '时' + checkintime.minminute + '分开始');
				break;
			default:
				break;
		}
	});

	$('.sidebar .nav li a[href="#' + hash + '"]')[0].click();

	$('#accounts input').on('focus',function  () {
		$(this).removeClass('warning');
		$(this).next().fadeOut();
	});

	$('#save-account').on('click',function  () {
		if(check_inputs($(this))){
			$(this).text('正在验证您的账户...').attr('disabled',true);
			var data = {};
			data['username'] = $.trim($('#username').val());
			data['password'] = $.trim($('#password').val());
			data['nickname'] = $.trim($('#nickname').val());
			localdata_attr('account','default',data);
			loginKaoqin({
				savebtn: $(this),
				callback:function  (config) {
					console.log(config);
					if (-1 == config.htmlstr.indexOf('name="attendanceForm"')) {
						config.savebtn.next().removeClass('info').addClass('warning').html('用户名密码不好使啊！再试下呗！').fadeIn();
						localdata_attr('settings','autocheckin',false);
					} else {
						config.savebtn.next().html('账户设置正常！保存成功！').fadeIn();
					}
					setTimeout(function () {
						config.savebtn.attr('disabled',false);
						config.savebtn.text('保存',false);
						config.savebtn.next().fadeOut(function  () {
							$(this).removeClass('warning').addClass('info');
						});
						config = null;
					},2000);

				}});

		}
	});

	$('#save-settings').on('click',function  () {
		var hour = $('#hour').val(),
			minminute = $('#minminute').val(),
			maxminute = $('#maxminute').val(),
			range = $('#range').val(),
			checktype = $('input[name="checkin-type"]:checked').val(),
			btn = $(this);
		hour = parseInt(hour,10);
		console.log(range);
		if (isNaN(hour) || hour < 0 || hour > 23) {
			$(this).next().removeClass('info').addClass('warning').html('时钟数需在0~23之间').fadeIn();
		} else {
			minminute = parseInt(minminute,10);
			maxminute = parseInt(maxminute,10);
			if(isNaN(minminute) || minminute < 0 ||
				minminute > 59 || isNaN(maxminute) ||
				minminute < 0 || minminute > 59 ||
				(minminute + 4 ) >= maxminute){
				$(this).next().removeClass('info').addClass('warning').html('分钟数需在0~59之间，并请确保分钟数之差大于4分钟').fadeIn();
			} else {
				range = parseInt(range,10);
				if (isNaN(range) || range < 4 || (minminute + range) > maxminute) {
					$(this).next().removeClass('info').addClass('warning').html('自动打卡时间范围需不小于4分钟，并不得超过公司打卡时间范围').fadeIn();
				} else {
					if (checktype != 'in' && checktype != 'out') {
						$(this).next().removeClass('info').addClass('warning').html('签到类型不对啊，你改网页了？').fadeIn();
					} else {
						var checkintime = {
							'hour': hour,
							'minminute': minminute,
							'maxminute': maxminute,
							'range': range
						};
						localdata_attr('settings','checkintime',checkintime);
						localdata_attr('settings','checktype',checktype);
						localdata_attr('settings','autocheckin',$('#enable-autocheckin').prop('checked'));
						$(this).next().removeClass('warning').addClass('info').html('保存成功！').fadeIn();
					}
				}
			}
		}
		setTimeout(function () {
			btn.next().fadeOut(function  () {
				btn.removeClass('warning').addClass('info');
			});
		},2000);
	});

});