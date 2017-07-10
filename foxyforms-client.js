(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.foxyformsClient = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"./lib/node/form":[function(require,module,exports){
var formPrefix = 'foxyforms_';

var validators = require('./validators.js');
var initialized = false;

var addEvent = function(elem, event, func, params) {
  var onevent = 'on' + event;
  
  if (elem.addEventListener) { //modern browsers
    elem.addEventListener(event, function(e){
      elem.event = e ? e : window.event;
      func.apply(elem, params);
    }, false); 
  } 
  else if (elem.attachEvent)  { //IE8 and below
    elem.attachEvent(onevent, function(e){
      elem.event = e ? e : window.event;
      func.apply(elem, params);
    });
  }
  else { //just in case
    var oldEvent = elem[onevent];
    if (typeof elem[onevent] != 'function') {
      elem[onevent] = function(e){
        elem.event = e ? e : window.event;
        func.apply(elem, params);
      };
    } else {
      elem[onevent] = function(e) {
        if (oldEvent) {
          oldEvent();
        }
        elem.event = e ? e : window.event;
        func.apply(elem, params);
      };
    }
  }
};

var addLoadEvent = function(func, params) {
  addEvent(window, 'load', func, params);
};

var addEventById = function(id, event, func, params) {
  if (id && typeof id === 'string') {
    var elem = document.getElementById(id);
    
    if (elem) {
      addEvent(elem, event, func, params);
      return elem;
    }
  }
  
  return null;
};

//get all the necessary field attributes (i.e. value, required, type, etc.)
var getFieldAttributes = function(field) {
  if (typeof field === 'string') {
    field = {id: field};
  }
  
  if ((typeof field === 'object') && (field.id)) {
    var elem = document.getElementById(field.id);
    
    if (elem) {
      if (typeof field.required === 'undefined') {
        field.required = elem.getAttributeNode(formPrefix + 'required') ? true : (elem.getAttributeNode('required') ? true : false);
      }
      
      field.value = elem.value; //always get the latest value from the form
      
      if (typeof field.type === 'undefined') {
        field.type = elem.getAttribute(formPrefix + 'type');
        
        if (!field.type) {
          var type = elem.getAttribute('type');
          
          switch (type) {
            case 'phone':
            case 'phoneNA':
            case 'tel':
              field.type = 'phone';
              break;
              
            case 'email':
              field.type = type;
              break;
          }
        }
      }
      
      if (typeof field.errorMessage === 'undefined') {
        var msg = elem.getAttribute(formPrefix + 'error_message');
        
        if (msg) {
          field.errorMessage = msg;
        }
        else {
          msg = elem.getAttribute('title');
          
          if (msg) {
            field.errorMessage = msg;
          }
        }
      }
    }
  }
  
  return field;
};

//show validation error
var showError = function(error, elem) {
  /*
  var msgId = formPrefix + 'error_' + elem.id;
  var msgElem = document.getElementById(msgId);
  
  if (msgElem) {
    msgElem.removeAttribute('style');
  }
  else {
    msgElem = document.createElement('div');
    
    if (msgElem) {
      msgElem.innerHTML = error.message;
      
    }
  }
  */
};

//clear validation error
var clearError = function(elem) {
  /*
  var msgId = formPrefix + 'error_' + elem.id;
  var msgElem = document.getElementById(msgId);
  
  if (msgElem) {
    var attr = msgElem.getAttributeNode('style');
    
    if (attr) {
      attr.value = 'display: none;';
    }
    else {
      attr = document.createAttribute('style');
      attr.value = 'display: none;';
      msgElem.setAttributeNode(attr);
    }
  }
  */
};

var processResults = function(results, formData, focusFlag) {
  var focusElem = null;
  
  for (var i = 0; i < results.length; i++) {
    var field = results[i];
    var elem = document.getElementById(field.id);
    
    if (elem) {
      elem.value = field.value; //update the form field's value with the result from validation (it might have been cleaned)
      
      if (formData) {
        if (field.result) { //if field validation was successful
          if (field.onSuccess && (typeof field.onSuccess === 'function')) {
            field.onSuccess(elem); //custom handler defined for the individual field
          }
          else if (formData.onFieldSuccess && (typeof formData.onFieldSuccess === 'function')) {
            formData.onFieldSuccess(elem); //custom handler defined for all fields
          }
          else {
            clearError(elem); //default handler - clear the error message
          }
        }
        else { //if field validation failed
          if (field.onError && (typeof field.onError === 'function')) {
            field.onError(field.error, elem); //custom handler defined for the individual field
          }
          else if (formData.onFieldError && (typeof formData.onFieldError === 'function')) {
            formData.onFieldError(field.error, elem); //custom handler defined for all fields
          }
          else {
            showError(field.error, elem); //default handler - show the error message
          }
          
          if (!focusElem && focusFlag) { //focus the 1st failed field
            focusElem = elem;
            focusElem.focus();
          }
        }
      }
    }
  }
};

exports.postProcess = function(results) {
  processResults(results);
};

//parse the fields for the data we need to validate
exports.parse = function(fields, verifyController) {
  if (typeof fields === 'object') {
    //if 'fields' is an array, input fields will be defined in the array
    for (var i = 0; i < fields.length; i++) {
      fields[i] = getFieldAttributes(fields[i]);
    }
  }
  else if (typeof fields === 'string') {
    //if 'fields' is an id string, get all the input fields marked for verification that are descendents of the element with the matching id
    var id = fields;
    var elem = document.getElementById(id);
    fields = [];
    
    if (elem) {
      var inputs = [];

      if (elem.nodeName.toLowerCase() == 'input') { //if this is an input element, use it
        inputs.push(elem);
      }
      else { //otherwise we'll look for child input elements of this node
        inputs = elem.getElementsByTagName('input');
      }
      
      for (var i = 0; i < inputs.length; i++) {
        var id = inputs[i].getAttribute('id');
        
        if (id) {
          var field = getFieldAttributes(id); 

          if (field.type && verifyController.isTypeSupported(field.type)) {
            fields.push(field);
          }
        }
      }
    }
  }
  
  return fields;
}

exports.init = function(forms, verifyController) {
  if (!initialized) {
    validators.update(verifyController);
    if (forms && (typeof forms === 'object')) {
      addLoadEvent(function(forms){
        for (var i = 0; i < forms.length; i++) {
          var formData = forms[i];
          
          if (formData && (typeof formData === 'object') && formData.id) {
            var eventId = formData.id;
            var event = 'submit';
            
            if (formData.buttonId) {
              eventId = formData.buttonId;
              event = 'click';
            }
            
            if (!formData.fields) {
              formData.fields = formData.id; //if the form fields are not defined, then just use the form's id so the fields will get parsed
            }
            
            formData.fields = exports.parse(formData.fields, verifyController); //parse the fields we need to validate
            
            //add event to validate fields upon form submission
            addEventById(eventId, event, function(formData){
              //prevent the default form submission
              if (this.event) {
                if (this.event.preventDefault) {
                  this.event.preventDefault();
                }
                else {
                  this.event.returnValue = false;
                }
              }
              
              verifyController.verify(formData.fields, function(err, results) {
                var form = document.getElementById(formData.id);
                
                processResults(results, formData, true/*focus the error element*/); //process the results (i.e. show/hide error messages or call callbacks)
                
                if (err) { //validation failed
                  if (formData.onError && (typeof formData.onError === 'function')) {
                    formData.onError(err, form); //custom handler defined, so call it
                  }                  
                }
                else { //validation was successful
                  if (formData.onSuccess && (typeof formData.onSuccess === 'function')) {
                    formData.onSuccess(form); //custom handler defined, so call it
                  }
                  else {
                    //default handler - submit the form                   
                    if (form) {
                      form.submit();
                    }
                  }
                }
              });
            }, [formData]);
            
            if (formData.enableOnBlurEvents) {
              for (var j = 0; j < formData.fields.length; j++) { //add onblur events for each input field
                var field = formData.fields[j];
                addEventById(field.id, 'blur', function(formData, field) {
                  verifyController.verify([field], function(err, results) {
                    processResults(results, formData, false/*focus the error element*/); //process the results (i.e. show/hide error messages or call callbacks)
                  });
                }, [formData, field]);
              }
            }
          }
        }    
      }, [forms]);
    }
    
    intialized = true; //we only want to allow this to be called once
  }
};

},{"./validators.js":1}],"./lib/node/http-client":[function(require,module,exports){
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

        
},{}],1:[function(require,module,exports){
//update 3rd party validators such as jquery validate with our own validation methods
exports.update = function(controller) {
  if (window.jQuery) { //if jquery is loaded
    (function($) {
    
      //jquery validator
      if ($.validator) { //if jquery validator is being used
        $.extend($.validator, {
          addAsyncMethod: function(name, method, message) {
            $.validator.addMethod(name, function( value, element, param ) {
              if ( this.optional(element) ) {
                return "dependency-mismatch";
              }

              var previous = this.previousValue(element);
              if (!this.settings.messages[element.name] ) {
                this.settings.messages[element.name] = {};
              }
              previous.originalMessage = this.settings.messages[element.name][name];
              this.settings.messages[element.name][name] = previous.message;

              if ( previous.old === value ) {
                return previous.valid;
              }

              previous.old = value;
              var validator = this;
              this.startRequest(element);
              var data = {};
              data[element.name] = value;
              
              method(value, element, function(err) {
                validator.settings.messages[element.name][name] = previous.originalMessage;
                var valid = err ? false : true;

                if ( valid ) {
                  var submitted = validator.formSubmitted;
                  validator.prepareElement(element);
                  validator.formSubmitted = submitted;
                  validator.successList.push(element);
                  delete validator.invalid[element.name];
                  validator.showErrors();
                } else {
                  var errors = {};
                  var message = err || validator.defaultMessage( element, name );
                  errors[element.name] = previous.message = $.isFunction(message) ? message(value) : message;
                  validator.invalid[element.name] = true;
                  validator.showErrors(errors);
                }
                previous.valid = valid;
                validator.stopRequest(element, valid);
              }, param);
              return "pending";
            }, message);
          }
        });
        
        $.validator.addAsyncMethod("email", function(value, element, callback) {
          controller.verify([element.id], function(err, results) {
            var error = results[0].result ? null : results[0].error.message;
            callback(error);
          }, "Please enter a valid email address.");
        });      
        $.validator.addAsyncMethod("phoneNA", function(value, element, callback) {
          controller.verify([element.id], function(err, results) {
            var error = results[0].result ? null : results[0].error.message;
            callback(error);
          }, "Please enter a valid phone number.");
        });    
        $.validator.addAsyncMethod("tel", function(value, element, callback) {
          controller.verify([element.id], function(err, results) {
            var error = results[0].result ? null : results[0].error.message;
            callback(error);
          }, "Please enter a valid phone number.");
        });    
      }
      
      //jquery validation engine
      if ($.validationEngine) { //if jquery validation engine is being used
        controller.jQueryValidateEngineHandler = function(field, rules, i, options, callback) {
          controller.verify([field.attr('id')], function(err, results) {
            callback(results[0].result, results[0].error ? results[0].error.message : null);
          });
        };
      }
    }(window.jQuery));
  }
};

},{}],2:[function(require,module,exports){
var enableSSL = false;
var validator = false;
//validator = require('validator'); /* un-comment out to enable local validation */

var apiOptions = {
	cleanInputs: true,
	ignoreServerErrors: true,
	ignoreSoftBounces: true,
	proxy: null
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
		postData.path = options.path;
		options.host = apiOptions.proxy.host;
		options.path = apiOptions.proxy.path;
	}
	
	json = JSON.stringify(postData);
  options.method = 'POST';
  options.headers = {
    'Content-Type': 'application/json',
    'Content-Length': getContentLength(json)
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
  var useSSL = enableSSL && (apiOptions.apiKey || apiOptions.useSSL) ? true : false;
  
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
    scheme: enableSSL ? 'https' : 'http',
    host: api.host,
    port: enableSSL ? api.sslPort : api.port,
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


},{"./lib/node/form":"./lib/node/form","./lib/node/http-client":"./lib/node/http-client"}]},{},[2])(2)
});