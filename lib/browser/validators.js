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
