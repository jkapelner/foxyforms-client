/* global ActiveXObject */

var validator = require('validator');

var _errorCodes = {
    main: {
        badData: {code: 300, message: 'Invalid data passed to API'},
        badToken: {code: 302, message: 'Invalid API token'},
        notValid: {code: 303, message: 'Validation failed'},
        required: {code: 304, message: 'Field is required'},
        serverComm: {code: 500, message: 'Unable to communicate with verification server'},
        serverData: {code: 501, message: 'Server returned bad data'}
    },
    phone: {
        badType: {code: 400, message: 'Invalid data type passed - must be a string or number'},
        badFormat: {code: 401, message: 'Data entered is not a valid phone number - must be 10 digits'}
    },
    email: {
        badType: {code: 400, message: 'Invalid data type passed - must be a string or number'},
        badFormat: {code: 401, message: 'Data entered is not a valid email address'}
    }
};

var _addEvent = function(elem, event, func) {
    var oldEvent = elem[event];
    if (typeof elem[event] != 'function') {
        elem[event] = func;
    } else {
        elem[event] = function() {
            if (oldEvent) {
                oldEvent();
            }
            func();
        };
    }
};
var _addLoadEvent = function(func) {
    _addEvent(window, 'onload', func);
};

var _xmlhttp;
var _apiOptions = null;
var _apiToken = null;
var _apiUrl = 'http://verifly.mumusoft.com/verify';

if (window.XMLHttpRequest)
{// code for IE7+, Firefox, Chrome, Opera, Safari
    _xmlhttp=new XMLHttpRequest();
}
else
{// code for IE6, IE5
    _xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
}

var _validatorFuncs = {
    phone: function(elem) {
        var phone = elem.value;      
        var type = typeof phone;

        if (type == 'number') {
            phone = phone.toString();
        }
        else if (type != 'string') {
            return {result: false, error: _errorCodes.phone.badData};
        }

        if (_apiOptions.cleanInputs) {
            phone = phone.replace(/[\s\(\)-]/g, ''); //strip out phone formatter characters (i.e. spaces, dashes, parenthesis)

            if (phone[0] == 1) {
                phone = phone.substr(1); //strip off leading '1'
            }
        }

        //make sure phone number contains only 10 digits
        if ((phone.length != 10) || phone.match(/[^0-9]/)) {
            return {result: false, error: _errorCodes.phone.badFormat};
        }

        return {result: true, value: phone};
    },
    email: function(elem) {
        var email = elem.value;
        var type = typeof email;

        if (type != 'string') {
            return {result: false, error: _errorCodes.email.badData};
        }

        if (_apiOptions.cleanInputs) {
            email = email.replace(/^\s+|\s+$/gm,''); //remove leading and trailing whitespace
            email = email.toLowerCase();
        }

        if (!validator.isEmail(email)) {
            return {result: false, error: _errorCodes.email.badFormat};
        }
        
        return {result: true, value: email};
    }
};

var _verify = function(fields, callback) {
    if (!_apiToken) { //make sure there is an api token
        if (callback) {
            callback({result: false, error: _errorCodes.main.badToken});
        }            
    }
    else if (fields && (typeof fields == 'object') && fields.length) {
        var validationPassed = true; //assume success
        
        for (var i = 0; i < fields.length; i++) { //foreach field, do some basic input validation
            var field = fields[i];
            
            if (field && typeof field == 'object' && field.id && field.type) {
                var elem = document.getElementById(field.id);
                
                if (elem) {
                    if (!field.value.length) { //if field value is empty
                        if (field.required || elem.getAttributeNode('required')) { //if field is required, then it's an error
                            if (callback) {
                                field.result = false;
                                field.error = _errorCodes.main.required;
                                callback({result: false, error: _errorCodes.main.notValid, fields: [field]}); //throw error
                            }
                            validationPassed = false; //failure
                            break;
                        }
                    }
                    else if (typeof _validatorFuncs[field.type] == 'function') {
                        var result = _validatorFuncs[field.type](elem); //run the client-side validation function if there is one
                                                
                        if (!result.result) { //throw error for failed validation
                            for (var p in result) {
                                field[p] = result[p]; //merge field result into the field object
                            }

                            if (callback) {
                                callback({result: false, error: _errorCodes.main.notValid, fields: [field]}); //throw error
                            }
                            validationPassed = false; //failure
                            break;
                        }
                    }
                }
            }
            else {
                if (callback) {
                    callback({result: false, error: _errorCodes.main.badData});
                }
                validationPassed = false; //failure
                break;
            }
        }
        
        //if validation passed, send the data to the verification server
        if (validationPassed) {
            var postData = {
                fields: fields,
                options: _apiOptions,
                token: _apiToken
            };
            var json = JSON.stringify(postData);
            
            _xmlhttp.open("POST", _apiUrl, true);
            _xmlhttp.setRequestHeader("Content-type","application/json");
            _xmlhttp.send(json);
            
            _xmlhttp.onreadystatechange=function()
            {
                if (_xmlhttp.readyState==4)
                {
                    if (_xmlhttp.status==200) {
                        var result = JSON.parse(_xmlhttp.responseText);
                        
                        if (result) { //server responded successfully
                            if (callback) {
                                callback(result);
                            }    
                        }
                        else { //bad data returned
                            if (callback) {
                                callback({result: false, error: _errorCodes.main.serverData});
                            }                        
                        }
                    }
                    else { //server error
                        if (callback) {
                            callback({result: false, error: _errorCodes.main.serverComm});
                        }
                    }
                }
            };
        }
    }
    else {
        if (callback) {
            callback({result: false, error: _errorCodes.main.badData});
        }
    }
};
    
exports.init = function(token, options, data) {
    _apiToken = token;
    _apiOptions = options;
    
    if (data && typeof data == 'object') {
    
    }
};

exports.setOptions = function(options) {
    _apiOptions = options;
};

exports.verify = function(fields, callback) {
    _verify(fields, callback);
};
