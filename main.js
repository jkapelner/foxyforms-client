var validator = false;
//validator = require('validator'); /* un-comment out to enable local validation */

var apiOptions = {
	cleanInputs: true,
	ignoreServerErrors: true,
	ignoreSoftBounces: true,
	proxy: null,
	secure: true
};

var api = {
  host: 'api.foxyforms.com',
  port: 80,
  sslPort: 443,
  path: '/verify',
  loginPath: '/verify/login'
};

//var validator = require('validator'); /* comment out to disable local validation */
var httpClient = require('./lib/node/http-client');
var form = require('./lib/node/form');

var errorCodes = (function() {
  var error = {
    main: {
      badData: {code: 300, message: 'Invalid data passed to API'},
      badLogin: {code: 302, message: 'Invalid API login'},
      badToken: {code: 303, message: 'Invalid API token'},
      notValid: {code: 304, message: 'Validation failed'},
      required: {code: 305, message: 'Field is required'},
      serverComm: {code: 500, message: 'Unable to communicate with verification server'},
      serverData: {code: 501, message: 'Server returned bad data'},
      internal: {code: 502, message: 'Internal server error occurred'}
    },
    phone: {
			ok: {code: 200, message: 'Phone number is OK'},
			badType: {code: 400, message: 'Invalid data type passed - must be a string or number'},
      badFormat: {code: 401, message: 'Data entered is not a valid phone number - must be 10 digits'},
      notValid: {code: 402, message: 'Phone number is invalid'},
      wrongCountry: {code: 403, message: "Phone number doesn't match the specified countries"},
      tollFree: {code: 404, message: "Phone number is a toll-free number, which is not allowed"}
    },
    email: {
			ok: {code: 200, message: 'Email address is OK'},
      badType: {code: 400, message: 'Invalid data type passed - must be a string'},
      badFormat: {code: 401, message: 'Data entered is not a valid email address'},
      noMxRecords: {code: 402, message: 'No MX Records found for domain'},
      noResponse: {code: 403, message: 'Mail server failed to respond'},
      notValid: {code: 404, message: 'Email address rejected by mail server'}
    }
  };
  
  return {
    get: function(fieldType, errorType) {
      return {
        code: error[fieldType][errorType].code,
        message: error[fieldType][errorType].message
      };
    }
  };
})();

var setOptions = function(options) {
  if (typeof options === 'object') {
    for (var p in options) {
      apiOptions[p] = options[p];
    }
  }
};

var getContentLength = function(str) {
  var byteArray = [];
  for (var i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) <= 0x7F) {
      byteArray.push(str.charCodeAt(i));
    }
    else {
      var h = encodeURIComponent(str.charAt(i)).substr(1).split('%');
      for (var j = 0; j < h.length; j++) {
        byteArray.push(parseInt(h[j], 16));
      }
    }
  }
  
  return byteArray.length;
};

var jsonRequest = function(options, postData, callback) {
  var json;

	if (apiOptions.proxy) {
		if (typeof(apiOptions.proxy.host) !== 'undefined') {
			options.host = apiOptions.proxy.host;
		}

		if (typeof(apiOptions.proxy.port) !== 'undefined') {
			options.port = apiOptions.proxy.port;
		}

		if (typeof(apiOptions.proxy.path) !== 'undefined') {
			postData.path = options.path;
			options.path = apiOptions.proxy.path;
		}
	}
	
	json = JSON.stringify(postData);
  options.method = 'POST';
  options.headers = {
    'Content-Type': 'application/json'
  };
  httpClient.request(options, json, function(err, response) {
    if (err) { //server error
      var error = errorCodes.get('main', 'serverComm');
      error.reason = err;
      callback({result: false, error: error});
    }
    else {
      var result = JSON.parse(response);
      
      if (result) { //server responded successfully
        callback(result);  
      }
      else { //bad data returned
        callback({result: false, error: errorCodes.get('main', 'serverData')});                       
      }
    }
  });
};

var validatorFuncs = {
  phone: function(phone) {
		if (validator) {
			var type = typeof phone;

			if (type === 'number') {
				phone = phone.toString();
			}
			else if (type !== 'string') {
				return {result: false, error: errorCodes.get('phone', 'badType')};
			}

			if (apiOptions.cleanInputs) {
				phone = phone.replace(/[\s\(\)-]/g, ''); //strip out phone formatter characters (i.e. spaces, dashes, parenthesis)

				if (phone[0] == 1) {
					phone = phone.substr(1); //strip off leading '1'
				}
			}

			//make sure phone number contains only 10 digits
			if ((phone.length != 10) || phone.match(/[^0-9]/)) {
				return {result: false, error: errorCodes.get('phone', 'badFormat')};
			}
		}

    return {result: true, value: phone};
  },
  email: function(email) {
		if (validator) {
			var type = typeof email;

			if (type !== 'string') {
				return {result: false, error: errorCodes.get('email', 'badType')};
			}

			if (apiOptions.cleanInputs) {
				email = email.replace(/^\s+|\s+$/gm, ''); //remove leading and trailing whitespace
				email = email.toLowerCase();
			}

			if (!validator.isEmail(email)) {
				return {result: false, error: errorCodes.get('email', 'badFormat')};
			}
		}
    
    return {result: true, value: email};
  }
};

var formatErrors = function(error, fields) {
  if (error) {
    if (error.code == errorCodes.get('main', 'notValid').code) {
      for (var i = 0; i < fields.length; i++) {
        if (!fields[i].result && fields[i].error && fields[i].errorMessage) { //if the field has a custom validation error
          if ((fields[i].error.code >= 400) && (fields[i].error.code < 500)) { //if a field validation failed
            fields[i].error.message = fields[i].errorMessage; //replace the error message with the custom one
          }
        }
      }
    }
  }
  
  return fields;
};

var run = function(fields, callback) {
  var validate = exports.validateFields(fields); //validate the fields (i.e. check the inputs for well-formedness)
  var fieldsToVerify = [];
  
  //check for fields that need verification from the api service
  for (var i = 0; i < validate.fields.length; i++) {
    if (validate.fields[i].result === null) { //field needs further verification
      fieldsToVerify.push(validate.fields[i]);
    }
  }
  
  if (fieldsToVerify.length > 0) {
    exports.verifyFields(fieldsToVerify, function(result){
      var error = validate.result ? (result.result ? null : result.error) : validate.error;
      
      if (result.fields) {
        //merge the verification results back into the validation results, so we have the results of everything
        for (var i = 0; i < result.fields.length; i++) {
          for (var j = 0; j < validate.fields.length; j++) {
            if (validate.fields[j].id === result.fields[i].id) {
              validate.fields[j] = result.fields[i];
							break;
            }
          }
        }
      }
      
      validate.fields = formatErrors(error, validate.fields); //replace error messages with custom ones if necessary
      form.postProcess(validate.fields);
      callback(error, validate.fields); //return the merged results (keep the initial validation error if there was one)
    });
  }
  else {
    validate.fields = formatErrors(validate.error, validate.fields); //replace error messages with custom ones if necessary
    form.postProcess(validate.fields);
    callback(validate.error, validate.fields); //nothing to verify, just return the validation result
  }
};

exports.validateFields = function(fields) {
  var result = true;
  var error = null;
  
  if (fields && (typeof fields === 'object') && fields.length) {        
    for (var i = 0; i < fields.length; i++) { //foreach field, do some basic input validation
      var field = fields[i];
      
      if (field && typeof field === 'object' && field.id && field.type) {
        fields[i].result = null; //result not yet known
        
        if (typeof field.value === 'undefined' || !field.value.length) { //if field value is empty
          if (field.required) { //if field is required, then it's an error
            fields[i].result = false;
            fields[i].error = errorCodes.get('main', 'required');
            result = false;
            error = errorCodes.get('main', 'notValid');
          }
          else {
            fields[i].result = true; //field not required so it's ok to be empty
          }
        }
        else if (typeof validatorFuncs[field.type] === 'function') {
          var validation = validatorFuncs[field.type](field.value); //run the client-side validation function if there is one
                                  
          if (!validation.result) { //if validation failed
            for (var p in validation) {
              fields[i][p] = validation[p]; //merge validation result into the field object
            }
            result = false;
            error = errorCodes.get('main', 'notValid');
          }
        }
        else {
          fields[i].result = true; //validation not supported so ignore it
        }
      }
      else {
        error = errorCodes.get('main', 'badData');
        result = false;
      }
    }
  }
  else {
    error = errorCodes.get('main', 'badData');
    result = false;
  }
    
  return {result: result, error: error, fields: fields};
};

exports.verifyFields = function(fields, callback) {
  var useSSL = apiOptions.secure ? true : false;
  
  jsonRequest({
    scheme: useSSL ? 'https' : 'http',
    host: api.host,
    port: useSSL ? api.sslPort : api.port,
    path: api.path
  }, {
    fields: fields,
    options: apiOptions
  }, function(result) {
		if (!result.result && result.error && (result.error.code >= 500) && (result.error.code < 600)) {
			result.result = apiOptions.ignoreServerErrors; //ignore server errors
			result.fields = fields;

			//for each field that needed verification, but the server failed, assume success
			for (var i = 0; i < result.fields.length; i++) {
				if ((typeof(result.fields[i].result) === 'undefined') || (result.fields[i].result === null)) {
					result.fields[i].result = apiOptions.ignoreServerErrors;
					result.fields[i].error = errorCodes.get('main', 'serverComm');
				}
			}
		}

		callback(result);
	});
};
    
exports.login = function(username, apiKey, callback) {
  jsonRequest({
    scheme: apiOptions.secure ? 'https' : 'http',
    host: api.host,
    port: apiOptions.secure ? api.sslPort : api.port,
    path: api.loginPath
  }, {
    username: username,
    apiKey: apiKey
  }, callback);
};

exports.init = function(options, forms) {        
  setOptions(options);
  form.init(forms, exports);
};

exports.verify = function(fields, callback) {
  fields = form.parse(fields, exports);
  run(fields, callback);
};

exports.isTypeSupported = function(type) {
  return validatorFuncs[type] ? true : false;
};

exports.getError = function(fieldType, errorType) {
  return errorCodes.get(fieldType, errorType);
};

exports.isLocalValidationEnabled = function() {
	return validator ? true : false;
};

