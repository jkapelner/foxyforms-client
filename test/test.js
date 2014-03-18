var main = require('../main');
var expect = require("chai").expect;

var expectResult = function(result, val) {
  expect(result).to.have.property('result');
  expect(result.result).to.equal(val);
}
var expectError = function(result, error) {
  expectResult(result, false);
  expect(result).to.have.property('error');
  expect(result.error).to.have.property('code');
  expect(result.error).to.have.property('message');
  expect(result.error.code).to.equal(error.code);
  expect(result.error.message).to.be.a('string');
}

var settings = {
  countries: ['US', 'CANADA'],
  allowTollFree: false,
  cleanInputs: true
};

describe("Main", function(){
  describe("#isTypeSupported()", function(){
    it("field is not supported", function(){
      var result = main.isTypeSupported('bad_type');
      expect(result).to.be.false;
    });
    it("field is supported", function(){
      var result = main.isTypeSupported('email');
      expect(result).to.be.true;
    });
  });
  
  describe("#login()", function(){
    var username, apiKey;

    this.timeout(0);
    
    it("username and apiKey should be passed on the command line:\nmocha --reporter spec test/test.js --user=test --apiKey=12345", function(){
      for (var index in process.argv) {
        var str = process.argv[index];

        if (str.indexOf("--apiKey=") == 0) {
          apiKey = str.substr(9);
        }
        else if (str.indexOf("--user=") == 0) {
          username = str.substr(7);
        }
      }

      expect(username).to.be.a('string');
      expect(apiKey).to.be.a('string');
    });
 
    it("should attempt to login to the API and fail", function(done){
      main.login('badname', 'badkey', function(result) {
        expect(result).to.not.have.property('authToken');
        expectError(result, main.getError('main', 'badLogin'));
        done();
      });
    });
    
    it("verification should fail if no api token", function(done){
      main.verifyFields([{id: 'phone', type: 'phone'}, {id: 'email', type: 'email'}], function(result){
        expectError(result, main.getError('main', 'badToken'));
        done();
      });
    });

    it("should login to the API and return a token", function(done){
      main.login(username, apiKey, function(result) {
        expectResult(result, true);
        expect(result).to.have.property('authToken');
        expect(result.authToken).to.be.a('string');
        settings.authToken = result.authToken;
        done();
      });
    });
    
    after(function(){
      if (settings.authToken) {
        main.init(settings); //initialize the api settings
        
        describe('#validateFields()', function(){
          it("validation should fail if fields are invalid", function(){
            var result = main.validateFields();
            expectError(result, main.getError('main', 'badData'));
            result = main.validateFields([]);
            expectError(result, main.getError('main', 'badData'));
            result = main.validateFields(['asdfas']);
            expectError(result, main.getError('main', 'badData'));
            result = main.validateFields([{id: 'phone', type: 'phone'}, {type: 'email'}]);
            expectError(result, main.getError('main', 'badData'));
            result = main.validateFields(['phone1', {id: 'phone', type: 'phone'}]);
            expectError(result, main.getError('main', 'badData')); 
          });
          
          it("validation should fail if required fields are empty", function(){
            var result = main.validateFields([{id: 'phone', type: 'phone'}, {id: 'email', type: 'email', required: true, value: ''}]);
            expectError(result, main.getError('main', 'notValid'));
            expect(result.fields).to.deep.equal([{id: 'phone', type: 'phone', result: true}, {id: 'email', type: 'email', required: true, value: '', result: false, error: main.getError('main', 'required')}]);
          });
          
          it("validation should pass empty fields that are not required", function(){            
            var result = main.validateFields([{id: 'phone', type: 'phone'}, {id: 'email', type: 'email', required: false, value: ''}]);
            expect(result).to.deep.equal({result: true, error: null, fields: [{id: 'phone', type: 'phone', result: true}, {id: 'email', type: 'email', required: false, value: '', result: true}]});
          });
          
          it("validation should fail for invalid data type for phone", function(){
            var phone = ['5165555555'];
            var email = 'asdfa@adsfdsfd.com';
            var result = main.validateFields([{id: 'phone', type: 'phone', value: phone}, {id: 'email', type: 'email', value: email}]);
            expectError(result, main.getError('main', 'notValid'));
            expect(result.fields).to.deep.equal([{id: 'phone', type: 'phone', value: phone, result: false, error: main.getError('phone', 'badType')}, {id: 'email', type: 'email', value: email, result: null}]);
          });
          
          it("validation should fail for invalid data type for email", function(){            
            var phone = '5165555555';
            var email = ['asdfa@adsfdf.com'];
            var result = main.validateFields([{id: 'phone', type: 'phone', value: phone}, {id: 'email', type: 'email', value: email}]);
            expectError(result, main.getError('main', 'notValid'));
            expect(result.fields).to.deep.equal([{id: 'phone', type: 'phone', value: phone, result: null}, {id: 'email', type: 'email', value: email, result: false, error: main.getError('email', 'badType')}]);         
          });
          
          it("validation should fail for bad phone format", function(){
            var phone = '516555555a';
            var email = 'asdfa@adsfdf.com';
            var result = main.validateFields([{id: 'phone', type: 'phone', value: phone}, {id: 'email', type: 'email', value: email}]);
            expectError(result, main.getError('main', 'notValid'));
            expect(result.fields).to.deep.equal([{id: 'phone', type: 'phone', value: phone, result: false, error: main.getError('phone', 'badFormat')}, {id: 'email', type: 'email', value: email, result: null}]);         
          });
          
          it("validation should fail for bad email format", function(){
            var phone = '5165555555';
            var email = 'asdfa@adsfdfdfa';
            var result = main.validateFields([{id: 'phone', type: 'phone', value: phone}, {id: 'email', type: 'email', value: email}]);
            expectError(result, main.getError('main', 'notValid'));
            expect(result.fields).to.deep.equal([{id: 'phone', type: 'phone', value: phone, result: null}, {id: 'email', type: 'email', value: email, result: false, error: main.getError('email', 'badFormat')}]);
          });
          
          it("validation should pass", function(){
            var phone = ' 1-(516) 555-5555 ';
            var email = ' asdfa@adsfdfdfa.com ';
            var result = main.validateFields([{id: 'phone', type: 'phone', value: phone}, {id: 'email', type: 'email', value: email}]);
            expect(result).to.deep.equal({result: true, error: null, fields: [{id: 'phone', type: 'phone', value: phone, result: null}, {id: 'email', type: 'email', value: email, result: null}]});
          });
        });
        
        describe('#verifyFields()', function(){          
          this.timeout(0);
          it("verification should fail if fields are invalid", function(done){
            main.verifyFields(null, function(result){
              expectError(result, main.getError('main', 'badData'));
              main.verifyFields([], function(result){
                expectError(result, main.getError('main', 'badData'));
                main.verifyFields(['asdfas'], function(result){
                  expectError(result, main.getError('main', 'badData'));
                  main.verifyFields([{id: 'phone', type: 'phone'}, {type: 'email'}], function(result){
                    expectError(result, main.getError('main', 'badData'));
                    main.verifyFields(['phone1', {id: 'phone', type: 'phone'}], function(result){
                      expectError(result, main.getError('main', 'badData')); 
                      done();
                    });
                  });
                });
              });
            });
          });
          
          it("verification should fail if required fields are empty", function(done){
            main.verifyFields([{id: 'phone', type: 'phone'}, {id: 'email', type: 'email', required: true, value: ''}], function(result){
              expectError(result, main.getError('main', 'notValid'));
              delete(result.fields[0].warning); //ignore the warning
              expect(result.fields).to.deep.equal([{id: 'phone', type: 'phone', result: true}, {id: 'email', type: 'email', required: true, value: '', result: false, error: main.getError('main', 'required')}]);
              done();
            });
          });
          
          it("verification should pass empty fields that are not required", function(done){            
            main.verifyFields([{id: 'phone', type: 'phone'}, {id: 'email', type: 'email', required: false, value: ''}], function(result){
              delete(result.fields[0].warning); //ignore the warning
              delete(result.fields[1].warning); //ignore the warning
              expect(result).to.deep.equal({result: true, error: null, fields: [{id: 'phone', type: 'phone', result: true}, {id: 'email', type: 'email', required: false, value: '', result: true}]});
              done();
            });
          });
          
          it("verification should fail for invalid data type for phone", function(done){
            var phone = ['5162122222'];
            var email = 'support@bloatie.com';
            main.verifyFields([{id: 'phone', type: 'phone', value: phone}, {id: 'email', type: 'email', value: email}], function(result){
              expectError(result, main.getError('main', 'notValid'));
              delete(result.fields[1].data); //ignore additional data
              expect(result.fields).to.deep.equal([{id: 'phone', type: 'phone', value: phone, result: false, error: main.getError('phone', 'badType')}, {id: 'email', type: 'email', value: email, result: true}]);
              done();
            });
          });
                   
          it("verification should fail for bad phone format", function(done){
            var phone = '516212222a';
            var email = 'support@bloatie.com';
            main.verifyFields([{id: 'phone', type: 'phone', value: phone}, {id: 'email', type: 'email', value: email}], function(result){
              expectError(result, main.getError('main', 'notValid'));
              delete(result.fields[1].data); //ignore additional data
              expect(result.fields).to.deep.equal([{id: 'phone', type: 'phone', value: phone, result: false, error: main.getError('phone', 'badFormat')}, {id: 'email', type: 'email', value: email, result: true}]);
              done();
            });
          });

          it("verification should fail for invalid phone number", function(done){
            var phone = '(222)-212-2222'; //unknown number should fail
            var cleanPhone = '2222122222'
            var email = 'support@bloatie.com';
            main.verifyFields([{id: 'phone', type: 'phone', value: phone}, {id: 'email', type: 'email', value: email}], function(result){
              expectError(result, main.getError('main', 'notValid'));
              delete(result.fields[1].data); //ignore additional data
              expect(result.fields).to.deep.equal([{id: 'phone', type: 'phone', value: cleanPhone, result: false, error: main.getError('phone', 'notValid')}, {id: 'email', type: 'email', value: email, result: true}]);
              done();
            });
          });

          it("verification should fail for phone number for country not allowed", function(done){
            var phone = '1-(242)-212-2222'; //bahamas number should fail
            var cleanPhone = '2422122222'
            var email = 'support@bloatie.com';
            main.verifyFields([{id: 'phone', type: 'phone', value: phone}, {id: 'email', type: 'email', value: email}], function(result){
              expectError(result, main.getError('main', 'notValid'));
              delete(result.fields[0].data); //ignore additional data
              delete(result.fields[1].data); //ignore additional data
              expect(result.fields).to.deep.equal([{id: 'phone', type: 'phone', value: cleanPhone, result: false, error: main.getError('phone', 'wrongCountry')}, {id: 'email', type: 'email', value: email, result: true}]);
              done();
            });
          });
 
          it("verification should fail for toll free phone number when not allowed", function(done){
            var phone = '1-800-212-2222'; //toll free number should fail
            var cleanPhone = '8002122222'
            var email = 'support@bloatie.com';
            main.verifyFields([{id: 'phone', type: 'phone', value: phone}, {id: 'email', type: 'email', value: email}], function(result){
              expectError(result, main.getError('main', 'notValid'));
              delete(result.fields[0].data); //ignore additional data
              delete(result.fields[1].data); //ignore additional data
              expect(result.fields).to.deep.equal([{id: 'phone', type: 'phone', value: cleanPhone, result: false, error: main.getError('phone', 'tollFree')}, {id: 'email', type: 'email', value: email, result: true}]);
              done();
            });
          });

          it("verification should pass for toll free phone number when allowed", function(done){
            var phone = '1-800-212-2222'; //toll free number should fail
            var cleanPhone = '8002122222'
            settings.allowTollFree = true;
            main.init(settings);
            main.verifyFields([{id: 'phone', type: 'phone', value: phone}], function(result){
              expect(result.fields[0].data.tollFree).to.equal(1);
              delete(result.fields[0].data); //ignore additional data
              expect(result).to.deep.equal({result: true, error: null, fields: [{id: 'phone', type: 'phone', value: cleanPhone, result: true}]});
              done();
            });
          });

          it("verification should fail for invalid data type for email", function(done){            
            var phone = '5162122222'; //US number should pass
            var email = ['support@bloatie.com'];
            main.verifyFields([{id: 'phone', type: 'phone', value: phone}, {id: 'email', type: 'email', value: email}], function(result){
              expectError(result, main.getError('main', 'notValid'));
              delete(result.fields[0].data); //ignore additional data
              expect(result.fields).to.deep.equal([{id: 'phone', type: 'phone', value: phone, result: true}, {id: 'email', type: 'email', value: email, result: false, error: main.getError('email', 'badType')}]);         
              done();
            });
          });
          
          it("verification should fail for bad email format", function(done){
            var phone = '1-236-212-2222'; //canadian number should pass
            var cleanPhone = '2362122222'
            var email = 'supportbloatie.com';
            main.verifyFields([{id: 'phone', type: 'phone', value: phone}, {id: 'email', type: 'email', value: email}], function(result){
              expectError(result, main.getError('main', 'notValid'));
              delete(result.fields[0].data); //ignore additional data
              expect(result.fields).to.deep.equal([{id: 'phone', type: 'phone', value: cleanPhone, result: true}, {id: 'email', type: 'email', value: email, result: false, error: main.getError('email', 'badFormat')}]);
              done();
            });
          });

          it("verification should fail for bad email exchange", function(done){
            var phone = '1-516-212-2222'; //US number should pass
            var cleanPhone = '5162122222'
            var email = 'support@hffheuiofhfhfhewuiohfsdkhf.com';
            main.verifyFields([{id: 'phone', type: 'phone', value: phone}, {id: 'email', type: 'email', value: email}], function(result){
              expectError(result, main.getError('main', 'notValid'));
              delete(result.fields[0].data); //ignore additional data
              delete(result.fields[1].data); //ignore additional data
              expect(result.fields).to.deep.equal([{id: 'phone', type: 'phone', value: cleanPhone, result: true}, {id: 'email', type: 'email', value: email, result: false, error: main.getError('email', 'noMxRecords')}]);
              done();
            });
          });

          it("verification should fail for rejected email", function(done){
            var phone = '1-516-212-2222'; //US number should pass
            var cleanPhone = '5162122222'
            var email = 'asdfasdfasd@mumusoft.com';
            main.verifyFields([{id: 'phone', type: 'phone', value: phone}, {id: 'email', type: 'email', value: email}], function(result){
              expectError(result, main.getError('main', 'notValid'));
              delete(result.fields[0].data); //ignore additional data
              delete(result.fields[1].data); //ignore additional data
              delete(result.fields[1].error.reason); //ignore mail reject reason
              expect(result.fields).to.deep.equal([{id: 'phone', type: 'phone', value: cleanPhone, result: true}, {id: 'email', type: 'email', value: email, result: false, error: main.getError('email', 'notValid')}]);
              done();
            });
          });
          
          it("verification should pass", function(done){
            var phone = ' 1-(236) 212-2222 ';
            var cleanPhone = '2362122222'
            var email = ' support@mumusoft.com ';
            var cleanEmail = 'support@mumusoft.com';
            main.verifyFields([{id: 'phone', type: 'phone', value: phone}, {id: 'email', type: 'email', value: email}], function(result){
              delete(result.fields[0].data); //ignore additional data
              delete(result.fields[1].data); //ignore additional data
              expect(result).to.deep.equal({result: true, error: null, fields: [{id: 'phone', type: 'phone', value: cleanPhone, result: true}, {id: 'email', type: 'email', value: cleanEmail, result: true}]});
              done();
            });
          });
        });
        
        describe('#verify()', function(){
          this.timeout(0);
          it("verification should fail", function(done){
            var phone = ' 1-(236) 212-2222 ';
            var cleanPhone = '2362122222'
            var email = ' support@bloatie.com ';
            var cleanEmail = 'support@bloatie.com';
            var phone2 = 'adfdsfdsfs';
            var email2 = 'sdfdfasdfsd';
            main.verify([{id: 'phone', type: 'phone', value: phone}, {id: 'email', type: 'email', value: email}, {id: 'phone2', type: 'phone', value: phone2, errorMessage: 'Custom error message'}, {id: 'email2', type: 'email', value: email2}], function(err, results){
              expect(err).to.deep.equal(main.getError('main', 'notValid'));
              delete(results[0].data); //ignore additional data
              delete(results[1].data); //ignore additional data
              expect(results).to.deep.equal([{id: 'phone', type: 'phone', value: cleanPhone, result: true}, {id: 'email', type: 'email', value: cleanEmail, result: true}, {id: 'phone2', type: 'phone', value: phone2, errorMessage: 'Custom error message', result: false, error: {code: main.getError('phone', 'badFormat').code, message: 'Custom error message'}}, {id: 'email2', type: 'email', value: email2, result: false, error: main.getError('email', 'badFormat')}]);
              done();
            });
          });
          
          it("verification should pass", function(done){
            var phone = ' 1-(236) 212-2222 ';
            var cleanPhone = '2362122222'
            var email = ' support@bloatie.com ';
            var cleanEmail = 'support@bloatie.com';
            main.verify([{id: 'phone', type: 'phone', value: phone, errorId: 'phone-error', errorMessage: 'Phone number is invalid'}, {id: 'email', type: 'email', value: email}, {id: 'name', type: 'text', value: 'test'}], function(err, results){
              expect(err).to.be.null;
              delete(results[0].data); //ignore additional data
              delete(results[1].data); //ignore additional data
              expect(results).to.deep.equal([{id: 'phone', type: 'phone', value: cleanPhone, result: true, errorId: 'phone-error', errorMessage: 'Phone number is invalid'}, {id: 'email', type: 'email', value: cleanEmail, result: true}, {id: 'name', type: 'text', value: 'test', result: true}]);
              done();
            });
          });
        
        });
      }
    });
  });
});