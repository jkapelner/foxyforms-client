// ----------------------------------------------------------
// A short snippet for detecting versions of IE in JavaScript
// without resorting to user-agent sniffing
// ----------------------------------------------------------
// If you're not in IE (or IE version is less than 5) then:
//     ie === undefined
// If you're in IE (>=5) then you can determine which version:
//     ie === 7; // IE7
// Thus, to detect IE:
//     if (ie) {}
// And to detect the version:
//     ie === 6 // IE6
//     ie > 7 // IE8, IE9 ...
//     ie < 9 // Anything less than IE9
// ----------------------------------------------------------

// UPDATE: Now using Live NodeList idea from @jdalton

var ie = (function(){
    var undef,
        v = 3,
        div = document.createElement('div'),
        all = div.getElementsByTagName('i');

    while (
        div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->',
        all[0]
    );

    return v > 4 ? v : undef;
}());

var xhrHttp = (function () {
  if (typeof window === 'undefined') {
    throw new Error('no window object present');
  }
  else if (window.XMLHttpRequest) {
    return window.XMLHttpRequest;
  }
  else if (window.ActiveXObject) {
    var axs = [
      'Msxml2.XMLHTTP.6.0',
      'Msxml2.XMLHTTP.3.0',
      'Microsoft.XMLHTTP'
    ];
    for (var i = 0; i < axs.length; i++) {
      try {
        var ax = new(window.ActiveXObject)(axs[i]);
        return function () {
          if (ax) {
            var ax_ = ax;
            ax = null;
            return ax_;
          }
          else {
            return new(window.ActiveXObject)(axs[i]);
          }
        };
      }
      catch (e) {}
    }
    throw new Error('ajax not supported in this browser')
  }
  else {
    throw new Error('ajax not supported in this browser');
  }
})();

exports.request = function(options, postData, callback) {
  try
  {
    if (typeof options !== 'object') {
      callback('options object is required');
      return;
    }
    
    var method = options.method ? options.method : 'GET';
    var url = options.scheme + '://' + options.host + ':' + options.port.toString() + options.path;
    var client;
    
    if (ie < 8) { //IE7 and below
      callback('Internet Explorer ' + ie.toString() + ' is not supported');
    }
    else if ((ie === 8) || (ie === 9)) { //IE8 and IE9 use XDomainRequest
      var xdr = new XDomainRequest();
      
      if (xdr) {
          xdr.onerror = function(){
            callback('XDomainRequest error');
          };
          xdr.ontimeout = function(){
            callback('XDomainRequest timed out');
          };
          xdr.onload = function(){
            callback(null, xdr.responseText);
          };
          xdr.timeout = 10000;
          xdr.open(method, url);
          xdr.send(postData);
      } else {
          callback('XDomainRequest undefined');
      }
    }
    else { //all modern browsers
      client = new xhrHttp();
      client.open(method, url, true);
      
      if (options.headers) {
        for (var key in options.headers) {
          client.setRequestHeader(key, options.headers[key]);
        }
      }
      
      client.send(postData);
      
      client.onreadystatechange=function()
      {
        if (client.readyState==4)
        {
          if (client.status==200) {
            callback(null, client.responseText);
          }
          else { //server error
            callback("XMLHttpRequest error status: " + client.status);
          }
        }
      };
    }
  }
  catch (err) {
    callback(err.message);
  }
};

        