function  inject_js(tab) {
	chrome.tabs.executeScript(tab.id,{file: "popup/login.js"});
}

function init_weather (wh) {
	var str = wh.city + '天气预报';
	str += '<br>';
	str += '今日' + '<a href="' + wh.today.link + '"><img src="' + wh.today.img[0] + '" title="' + wh.today.condition + '">' + wh.today.temp + '</a>';
	str += '<br>';
	str += '明日' + '<a href="' + wh.tomorrow.link + '"><img src="' + wh.tomorrow.img[0] + '" title="' + wh.tomorrow.condition + '">' + wh.tomorrow.temp + '</a>';
	$('#ans').html(str);
}

$('span').on('click',function  () {
	var data = $(this).attr('data');
	chrome.tabs.create({url:urls[data]['login_url']},inject_js);
});
