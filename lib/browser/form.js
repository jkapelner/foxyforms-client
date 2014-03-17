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
