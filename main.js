var enableSSL = false;
var apiOptions = {cleanInputs: true};
var api = {
  host: 'bloatie.com',
  port: 1337,
  sslPort: 443,
  path: '/verify',
  loginPath: '/verify/login'
};

var validator = require('validator');
var httpClient = require('./lib/node/http-client');

exports.errorCodes = {
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
    badType: {code: 400, message: 'Invalid data type passed - must be a string or number'},
    badFormat: {code: 401, message: 'Data entered is not a valid phone number - must be 10 digits'},
    notValid: {code: 402, message: 'Phone number is invalid'},
    wrongCountry: {code: 403, message: "Phone number doesn't match the specified countries"},
    tollFree: {code: 404, message: "Phone number is a toll-free number, which is not allowed"}
  },
  email: {
    badType: {code: 400, message: 'Invalid data type passed - must be a string'},
    badFormat: {code: 401, message: 'Data entered is not a valid email address'},
    noMxRecords: {code: 402, message: 'No MX Records found for domain'},
    noResponse: {code: 403, message: 'Mail server failed to respond'},
    notValid: {code: 404, message: 'Email address rejected by mail server'}
  }
};

var setOptions = function(options) {
  if (typeof options === 'object') {
    for (var p in options) {
      apiOptions[p] = options[p];
    }
  }
};

var jsonRequest = function(options, postData, callback) {
  var json = JSON.stringify(postData);
  
  options.method = 'POST';
  options.headers = {'Content-type': 'application/json'};
  httpClient.request(options, json, function(err, response) {
    if (err) { //server error
      var error = exports.errorCodes.main.serverComm;
      error.reason = err;
      callback({result: false, error: error});
    }
    else {
      var result = JSON.parse(response);
      
      if (result) { //server responded successfully
        callback(result);  
      }
      else { //bad data returned
        callback({result: false, error: exports.errorCodes.main.serverData});                       
      }
    }
  });
};

var validatorFuncs = {
  phone: function(phone) {
    var type = typeof phone;

    if (type === 'number') {
      phone = phone.toString();
    }
    else if (type !== 'string') {
      return {result: false, error: exports.errorCodes.phone.badType};
    }

    if (apiOptions.cleanInputs) {
      phone = phone.replace(/[\s\(\)-]/g, ''); //strip out phone formatter characters (i.e. spaces, dashes, parenthesis)

      if (phone[0] == 1) {
          phone = phone.substr(1); //strip off leading '1'
      }
    }

    //make sure phone number contains only 10 digits
    if ((phone.length != 10) || phone.match(/[^0-9]/)) {
      return {result: false, error: exports.errorCodes.phone.badFormat};
    }

    return {result: true, value: phone};
  },
  email: function(email) {
    var type = typeof email;

    if (type !== 'string') {
      return {result: false, error: exports.errorCodes.email.badType};
    }

    if (apiOptions.cleanInputs) {
      email = email.replace(/^\s+|\s+$/gm,''); //remove leading and trailing whitespace
      email = email.toLowerCase();
    }

    if (!validator.isEmail(email)) {
      return {result: false, error: exports.errorCodes.email.badFormat};
    }
    
    return {result: true, value: email};
  }
};

var run = function(fields, callback) {
  var validate = exports.validateFields(fields); //validate the fields (i.e. check the inputs for well-formedness)
  var fieldsToVerify = [];
  
  if (validate.result) {
    //validation passed, check for fields that need verification from the api service
    for (var i = 0; i < validate.fields.length; i++) {
      if (validate.fields[i].result === null) { //field needs further verification
        fieldsToVerify.push(validate.fields[i]);
      }
    }
    
    if (fieldsToVerify.length > 0) {
      exports.verifyFields(fieldsToVerify, function(result){
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
        if (result.result) {
          callback(null, validate.fields); //verification passed
        }
        else {
          callback(result.error, validate.fields); //verification failed
        }
      });
    }
    else {
      callback(null, validate.fields); //all fields passed validation
    }
  }
  else {
    callback(validate.error, validate.fields); //validation failed, return error
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
          if (field.required/* || elem.getAttributeNode('required')*/) { //if field is required, then it's an error
            fields[i].result = false;
            fields[i].error = exports.errorCodes.main.required;
            result = false;
            error = exports.errorCodes.main.notValid;
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
            error = exports.errorCodes.main.notValid;
          }
        }
      }
      else {
        error = exports.errorCodes.main.badData;
        result = false;
      }
    }
  }
  else {
    error = exports.errorCodes.main.badData;
    result = false;
  }
    
  return {result: result, error: error, fields: fields};
};

exports.verifyFields = function(fields, callback) {
  var useSSL = enableSSL && (apiOptions.apiKey || apiOptions.useSSL) ? true : false;
  
  jsonRequest({
    scheme: useSSL ? 'https' : 'http',
    host: api.host,
    port: useSSL ? api.sslPort : api.port,
    path: api.path
  }, {
    fields: fields,
    options: apiOptions
  }, callback);
};
    
exports.login = function(username, apiKey, callback) {
  jsonRequest({
    scheme: enableSSL ? 'https' : 'http',
    host: api.host,
    port: enableSSL ? api.sslPort : api.port,
    path: api.loginPath
  }, {
    username: username,
    apiKey: apiKey
  }, callback);
};

exports.init = function(options) {        
  setOptions(options);
};

exports.verify = function(fields, callback) {
  run(fields, callback);
};
