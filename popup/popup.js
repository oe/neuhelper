function  inject_js(tab) {
	chrome.tabs.executeScript(tab.id,{file: "popup/login.js"});
}

$('span').on('click',function  () {
	var data = $(this).attr('data');
	chrome.tabs.create({url:urls[data]['login_url']},inject_js);
});
