!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),(f.foxyformsClient||(f.foxyformsClient={})).js=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"EkpMeO":[function(_dereq_,module,exports){
var formPrefix = 'foxyforms_';

var initialized = false;
var validators = _dereq_('./validators');

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

var processResults = function(formData, results, focusFlag) {
  var focusElem = null;
  
  for (var i = 0; i < results.length; i++) {
    var field = results[i];
    var elem = document.getElementById(field.id);
    
    if (elem) {
      elem.value = field.value; //update the form field's value with the result from validation (it might have been cleaned)
      
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
    validators.update(verifyController); //update 3rd party validators if they exist
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
                
                processResults(formData, results, true/*focus the error element*/); //process the results (i.e. show/hide error messages or call callbacks)
                
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
                    processResults(formData, results, false/*focus the error element*/); //process the results (i.e. show/hide error messages or call callbacks)
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

},{"./validators":5}],"./lib/node/form":[function(_dereq_,module,exports){
module.exports=_dereq_('EkpMeO');
},{}],"BX/C5g":[function(_dereq_,module,exports){
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

        
},{}],"./lib/node/http-client":[function(_dereq_,module,exports){
module.exports=_dereq_('BX/C5g');
},{}],5:[function(_dereq_,module,exports){
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
        $.extend(controller, {
          jqv: function(field, rules, i, options) {
            var errorSelector = rules[i + 1];
            var rule = options.allrules[errorSelector];
            var extraData = rule.extraData;
            var extraDataDynamic = rule.extraDataDynamic;
            var data = {
              "fieldId" : field.attr("id"),
              "fieldValue" : field.val()
            };

            if (typeof extraData === "object") {
              $.extend(data, extraData);
            } else if (typeof extraData === "string") {
              var tempData = extraData.split("&");
              for(var i = 0; i < tempData.length; i++) {
                var values = tempData[i].split("=");
                if (values[0] && values[0]) {
                  data[values[0]] = values[1];
                }
              }
            }

            if (extraDataDynamic) {
              var tmpData = [];
              var domIds = String(extraDataDynamic).split(",");
              for (var i = 0; i < domIds.length; i++) {
                var id = domIds[i];
                if ($(id).length) {
                  var inputValue = field.closest("form, .validationEngineContainer").find(id).val();
                  var keyValue = id.replace('#', '') + '=' + escape(inputValue);
                  data[id.replace('#', '')] = inputValue;
                }
              }
            }

            // If a field change event triggered this we want to clear the cache for this ID
            if (options.eventTrigger == "field") {
              delete(options.ajaxValidCache[field.attr("id")]);
            }

            // If there is an error or if the the field is already validated, do not re-execute AJAX
            if (!options.isError && !methods._checkAjaxFieldStatus(field.attr("id"), options)) {
              $.ajax({
                type: options.ajaxFormValidationMethod,
                url: rule.url,
                cache: false,
                dataType: "json",
                data: data,
                field: field,
                rule: rule,
                methods: methods,
                options: options,
                beforeSend: function() {},
                error: function(data, transport) {
                  if (options.onFailure) {
                    options.onFailure(data, transport);
                  } else {
                    methods._ajaxError(data, transport);
                  }
                },
                success: function(json) {
                  // asynchronously called on success, data is the json answer from the server
                  var errorFieldId = json[0];
                  //var errorField = $($("#" + errorFieldId)[0]);
                  var errorField = $("#"+ errorFieldId).eq(0);

                  // make sure we found the element
                  if (errorField.length == 1) {
                    var status = json[1];
                    // read the optional msg from the server
                    var msg = json[2];
                    if (!status) {
                      // Houston we got a problem - display an red prompt
                      options.ajaxValidCache[errorFieldId] = false;
                      options.isError = true;

                      // resolve the msg prompt
                      if(msg) {
                        if (options.allrules[msg]) {
                          var txt = options.allrules[msg].alertText;
                          if (txt) {
                            msg = txt;
                          }
                        }
                      }
                      else {
                        msg = rule.alertText;
                      }

                      if (options.showPrompts) {
                        methods._showPrompt(errorField, msg, "", true, options);
                      }
                    } 
                    else {
                      options.ajaxValidCache[errorFieldId] = true;

                      // resolves the msg prompt
                      if(msg) {
                        if (options.allrules[msg]) {
                          var txt = options.allrules[msg].alertTextOk;
                          if (txt) {
                            msg = txt;
                          }
                        }
                      }
                      else {
                        msg = rule.alertTextOk;
                      }

                      if (options.showPrompts) {
                        // see if we should display a green prompt
                        if (msg) {
                          methods._showPrompt(errorField, msg, "pass", true, options);
                        }
                        else {
                          methods._closePrompt(errorField);
                        }
                      }

                      // If a submit form triggered this, we want to re-submit the form
                      if (options.eventTrigger == "submit") {
                        field.closest("form").submit();
                      }
                    }
                  }
                  errorField.trigger("jqv.field.result", [errorField, options.isError, msg]);
                }
              });

              return rule.alertTextLoad;
            }
          }
        });
      }
    }(window.jQuery));
  }
};

},{}],6:[function(_dereq_,module,exports){
var enableSSL = false;
var apiOptions = {cleanInputs: true, ignoreServerErrors: false};
var api = {
  host: 'bloatie.com',
  port: 1337,
  sslPort: 443,
  path: '/verify',
  loginPath: '/verify/login'
};

var validator = _dereq_('validator');
var httpClient = _dereq_('./lib/node/http-client');
var form = _dereq_('./lib/node/form');

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

var formatErrors = function(error, fields) {
  if (error) {
    if (error.code == exports.errorCodes.main.notValid.code) {
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
      var error;
      
      if (apiOptions.ignoreServerErrors && !result.result && result.error && (result.error.code >= 500) && (result.error.code < 600)) {
        result.result = true; //ignore server errors
        result.error = null;
      }
      
      error = validate.result ? result.error : validate.error;
      
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
      callback(error, validate.fields); //return the merged results (keep the initial validation error if there was one)
    });
  }
  else {
    validate.fields = formatErrors(validate.error, validate.fields); //replace error messages with custom ones if necessary
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
        else {
          fields[i].result = true; //validation not supported so ignore it
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


},{"./lib/node/form":"EkpMeO","./lib/node/http-client":"BX/C5g","validator":7}],7:[function(_dereq_,module,exports){
/*!
 * Copyright (c) 2014 Chris O'Hara <cohara87@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

(function (name, definition) {
    if (typeof module !== 'undefined') {
        module.exports = definition();
    } else if (typeof define === 'function' && typeof define.amd === 'object') {
        define(definition);
    } else {
        this[name] = definition();
    }
})('validator', function (validator) {

    'use strict';

    validator = { version: '3.2.1' };

    var email = /^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/;

    var url = /^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[0-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i;

    var creditCard = /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})$/;

    var isbn10Maybe = /^(?:[0-9]{9}X|[0-9]{10})$/
      , isbn13Maybe = /^(?:[0-9]{13})$/;

    var ipv4Maybe = /^(\d?\d?\d)\.(\d?\d?\d)\.(\d?\d?\d)\.(\d?\d?\d)$/
      , ipv6 = /^::|^::1|^([a-fA-F0-9]{1,4}::?){1,7}([a-fA-F0-9]{1,4})$/;

    var uuid = {
        '3': /^[0-9A-F]{8}-[0-9A-F]{4}-3[0-9A-F]{3}-[0-9A-F]{4}-[0-9A-F]{12}$/i
      , '4': /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
      , '5': /^[0-9A-F]{8}-[0-9A-F]{4}-5[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
      , all: /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i
    };

    var alpha = /^[a-zA-Z]+$/
      , alphanumeric = /^[a-zA-Z0-9]+$/
      , numeric = /^-?[0-9]+$/
      , int = /^(?:-?(?:0|[1-9][0-9]*))$/
      , float = /^(?:-?(?:[0-9]+))?(?:\.[0-9]*)?(?:[eE][\+\-]?(?:[0-9]+))?$/
      , hexadecimal = /^[0-9a-fA-F]+$/
      , hexcolor = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

    validator.extend = function (name, fn) {
        validator[name] = function () {
            var args = Array.prototype.slice.call(arguments);
            args[0] = validator.toString(args[0]);
            return fn.apply(validator, args);
        };
    };

    validator.noCoerce = ['toString', 'toDate', 'extend', 'init'];

    //Right before exporting the validator object, pass each of the builtins
    //through extend() so that their first argument is coerced to a string
    validator.init = function () {
        for (var name in validator) {
            if (typeof validator[name] !== 'function' || validator.noCoerce.indexOf(name) >= 0) {
                continue;
            }
            validator.extend(name, validator[name]);
        }
    };

    validator.toString = function (input) {
        if (input === null || typeof input === 'undefined' || (isNaN(input) && !input.length)) {
            input = '';
        } else if (typeof input === 'object' && input.toString) {
            input = input.toString();
        } else if (typeof input !== 'string') {
            input += '';
        }
        return input;
    };

    validator.toDate = function (date) {
        if (Object.prototype.toString.call(date) === '[object Date]') {
            return date;
        }
        date = Date.parse(date);
        return !isNaN(date) ? new Date(date) : null;
    };

    validator.toFloat = function (str) {
        return parseFloat(str);
    };

    validator.toInt = function (str, radix) {
        return parseInt(str, radix || 10);
    };

    validator.toBoolean = function (str, strict) {
        if (strict) {
            return str === '1' || str === 'true';
        }
        return str !== '0' && str !== 'false' && str !== '';
    };

    validator.equals = function (str, comparison) {
        return str === validator.toString(comparison);
    };

    validator.contains = function (str, elem) {
        return str.indexOf(validator.toString(elem)) >= 0;
    };

    validator.matches = function (str, pattern, modifiers) {
        if (Object.prototype.toString.call(pattern) !== '[object RegExp]') {
            pattern = new RegExp(pattern, modifiers);
        }
        return pattern.test(str);
    };

    validator.isEmail = function (str) {
        return email.test(str);
    };

    validator.isURL = function (str) {
        return str.length < 2083 && url.test(str);
    };

    validator.isIP = function (str, version) {
        version = validator.toString(version);
        if (!version) {
            return validator.isIP(str, 4) || validator.isIP(str, 6);
        } else if (version === '4') {
            if (!ipv4Maybe.test(str)) {
                return false;
            }
            var parts = str.split('.').sort();
            return parts[3] <= 255;
        }
        return version === '6' && ipv6.test(str);
    };

    validator.isAlpha = function (str) {
        return alpha.test(str);
    };

    validator.isAlphanumeric = function (str) {
        return alphanumeric.test(str);
    };

    validator.isNumeric = function (str) {
        return numeric.test(str);
    };

    validator.isHexadecimal = function (str) {
        return hexadecimal.test(str);
    };

    validator.isHexColor = function (str) {
        return hexcolor.test(str);
    };

    validator.isLowercase = function (str) {
        return str === str.toLowerCase();
    };

    validator.isUppercase = function (str) {
        return str === str.toUpperCase();
    };

    validator.isInt = function (str) {
        return int.test(str);
    };

    validator.isFloat = function (str) {
        return str !== '' && float.test(str);
    };

    validator.isDivisibleBy = function (str, num) {
        return validator.toFloat(str) % validator.toInt(num) === 0;
    };

    validator.isNull = function (str) {
        return str.length === 0;
    };

    validator.isLength = function (str, min, max) {
        return str.length >= min && (typeof max === 'undefined' || str.length <= max);
    };

    validator.isUUID = function (str, version) {
        var pattern = uuid[version ? version : 'all'];
        return pattern && pattern.test(str);
    };

    validator.isDate = function (str) {
        return !isNaN(Date.parse(str));
    };

    validator.isAfter = function (str, date) {
        var comparison = validator.toDate(date || new Date())
          , original = validator.toDate(str);
        return original && comparison && original > comparison;
    };

    validator.isBefore = function (str, date) {
        var comparison = validator.toDate(date || new Date())
          , original = validator.toDate(str);
        return original && comparison && original < comparison;
    };

    validator.isIn = function (str, options) {
        if (!options || typeof options.indexOf !== 'function') {
            return false;
        }
        if (Object.prototype.toString.call(options) === '[object Array]') {
            var array = [];
            for (var i = 0, len = options.length; i < len; i++) {
                array[i] = validator.toString(options[i]);
            }
            options = array;
        }
        return options.indexOf(str) >= 0;
    };

    validator.isCreditCard = function (str) {
        var sanitized = str.replace(/[^0-9]+/g, '');
        if (!creditCard.test(sanitized)) {
            return false;
        }
        var sum = 0, digit, tmpNum, shouldDouble;
        for (var i = sanitized.length - 1; i >= 0; i--) {
            digit = sanitized.substring(i, (i + 1));
            tmpNum = parseInt(digit, 10);
            if (shouldDouble) {
                tmpNum *= 2;
                if (tmpNum >= 10) {
                    sum += ((tmpNum % 10) + 1);
                } else {
                    sum += tmpNum;
                }
            } else {
                sum += tmpNum;
            }
            shouldDouble = !shouldDouble;
        }
        return (sum % 10) === 0 ? sanitized : false;
    };

    validator.isISBN = function (str, version) {
        version = validator.toString(version);
        if (!version) {
            return validator.isISBN(str, 10) || validator.isISBN(str, 13);
        }
        var sanitized = str.replace(/[\s-]+/g, '')
          , checksum = 0, i;
        if (version === '10') {
            if (!isbn10Maybe.test(sanitized)) {
                return false;
            }
            for (i = 0; i < 9; i++) {
                checksum += (i + 1) * sanitized.charAt(i);
            }
            if (sanitized.charAt(9) === 'X') {
                checksum += 10 * 10;
            } else {
                checksum += 10 * sanitized.charAt(9);
            }
            if ((checksum % 11) === 0) {
                return sanitized;
            }
        } else  if (version === '13') {
            if (!isbn13Maybe.test(sanitized)) {
                return false;
            }
            var factor = [ 1, 3 ];
            for (i = 0; i < 12; i++) {
                checksum += factor[i % 2] * sanitized.charAt(i);
            }
            if (sanitized.charAt(12) - ((10 - (checksum % 10)) % 10) === 0) {
                return sanitized;
            }
        }
        return false;
    };

    validator.ltrim = function (str, chars) {
        var pattern = chars ? new RegExp('^[' + chars + ']+', 'g') : /^\s+/g;
        return str.replace(pattern, '');
    };

    validator.rtrim = function (str, chars) {
        var pattern = chars ? new RegExp('[' + chars + ']+$', 'g') : /\s+$/g;
        return str.replace(pattern, '');
    };

    validator.trim = function (str, chars) {
        var pattern = chars ? new RegExp('^[' + chars + ']+|[' + chars + ']+$', 'g') : /^\s+|\s+$/g;
        return str.replace(pattern, '');
    };

    validator.escape = function (str) {
        return (str.replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;'));
    };

    validator.whitelist = function (str, chars) {
        return str.replace(new RegExp('[^' + chars + ']+', 'g'), '');
    };

    validator.blacklist = function (str, chars) {
        return str.replace(new RegExp('[' + chars + ']+', 'g'), '');
    };

    validator.init();

    return validator;

});

},{}]},{},[6])
(6)
});