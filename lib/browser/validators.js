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
