var http = require('http');

exports.request = function(options, postData, callback) {
  var request = http.request(options, function(response) {
    var str = '';
    response.on('data', function (chunk) {
      str += chunk;
    });

    response.on('end', function () {
      callback(null, str); //success
    });
    
    if (response.statusCode !== 200) { //server error
      callback("http response error status: " + response.statusCode);
    }
  });
  
  request.on('error', function(e) { //server error
    callback(e.message);
  });
  
  request.write(postData);
  request.end();
};

        