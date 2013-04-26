function autoLogin (accountinfo) {
	var href = window.location.href;
	if (!accountinfo || (typeof accountinfo != 'object')) {
		chrome.runtime.sendMessage({method: "showAddAccountTip"}, function  (str) {});
		return;
	}
	if (false === accountinfo['available']) {
		return;
	}
	if (0 === href.indexOf('http://kq.neusoft.com') || 0 === href.indexOf('http://ehr.neusoft.com')) {
		var inputs = document.getElementsByClassName('textfield');
		try{
			inputs[0].value = accountinfo['username'];
			inputs[1].value = accountinfo['password'];
			document.getElementsByTagName('form')[0].submit();
		}catch(e){}
	}else if(0 === href.indexOf('http://processbase.neusoft.com') || 0 === href.indexOf('https://portal.neusoft.com') || 0 === href.indexOf('https://mail.neusoft.com')){
		try{
			document.getElementsByName('username')[0].value = accountinfo['username'];
			document.getElementsByName('password')[0].value = accountinfo['password'];
			document.getElementsByTagName('form')[0].submit();
		}catch(e){}
	}
}
if (document.readyState == 'complete') {
	chrome.runtime.sendMessage({method: "getAccountInfo"}, autoLogin);
} else {
	var stateChange = function  () {
		if (document.readyState == 'complete') {
			chrome.runtime.sendMessage({method: "getAccountInfo"}, autoLogin);
		}
	};
	document.onreadystatechange = stateChange;
}
