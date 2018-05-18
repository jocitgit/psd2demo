const Alexa = require('alexa-sdk');
const https = require('https');

const HOSTNAME = 'api.nordeaopenbanking.com';
const PATH = '/v2/accounts';
const CLIENT_ID = 'cb8d8af2-2416-4ce5-bb6c-2344e09793ec';
const CLIENT_SECRET = 'H2xH5gN2lX0aF3fH6cD7qN0hS3dV8fS2fH8eV3dO7uF0aM6kD4';

const APP_ID = 'amzn1.ask.skill.b6e63153-71b2-4189-adde-fb75ec7a4860';
const HELP_MESSAGE = 'You can say what is my balance, or, you can say give me my summary... What can I help you with?';
const HELP_REPROMPT = 'What can I help you with?';
const STOP_MESSAGE = 'Goodbye!';



exports.handler = function(event, context, callback) {
    const alexa = Alexa.handler(event, context, callback);
    alexa.appId = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

const handlers = {
    'Unhandled': function () {
        console.log('Unhandled');
        this.emit('AMAZON.HelpIntent');
    },
    'LaunchRequest': function () {
        console.log('LaunchRequest');
        this.emit('AMAZON.HelpIntent');
    },
    'AccountSummaryIntent': function () {
        console.log('AccountSummaryIntent');
        if (this.event.session.user.accessToken === undefined) {
            console.log('Access token undefined');
            //this.emit(':tellWithLinkAccountCard', 'to start using this skill, please use the companion app to authorize access');
            this.response.speak('to start using this skill, please use the companion app to authorize access')
                .linkAccountCard()
                .shouldEndSession(true);
            this.emit(':responseReady');
        } else { 
            console.log('Access token found');
            retrieveData.call(this, this.event.session.user.accessToken, (accounts) => {
                var speech = '';
                var accountNumber = '';
                if (!Array.isArray(accounts)) {
                    accounts = [accounts]; // Convert single account object to array if required
                }
                for (var i=0; i<accounts.length; i++) {
                    if (accounts[i].availableBalance != null) {
                        accountNumber = accounts[i].accountNumber.value;
                        speech += 'The available balance for account ending <say-as interpret-as="digits">' + accountNumber.substr(accountNumber.length-4) + '</say-as> ';
                        speech += 'is <say-as interpret-as="cardinal">' + accounts[i].availableBalance + '</say-as><break time="1s"/> ';
                    }
                }
                if (speech != '') {
                    this.response.speak(speech);
                } else {
                    this.response.speak('There are no account balances listed');
                }
                this.emit(':responseReady');
            });
            
        }  
    },
     'AccountBalanceIntent': function () {
        console.log('AccountBalanceIntent');
        console.log('Dialog State: ' + this.event.request.dialogState);
        console.log('Slot value: ' + this.event.request.intent.slots.AccountEnding.value);
        if (this.event.request.dialogState !== 'COMPLETED') {
            return this.emit(':delegate');
        }
        var slotValue = this.event.request.intent.slots.AccountEnding.value;
        if (slotValue === undefined || isNaN(slotValue) || slotValue.length != 4) {
            this.response.speak(slotValue + ' is not a four digit number');
            return this.emit(':responseReady');
        }
        
        if (this.event.session.user.accessToken === undefined) {
            console.log('Access token undefined');
            //this.emit(':tellWithLinkAccountCard', 'to start using this skill, please use the companion app to authorize access');
            this.response.speak('to start using this skill, please use the companion app to authorize access')
                .linkAccountCard()
                .shouldEndSession(true);
            this.emit(':responseReady');
        } else { 
            console.log('Access token found');
            retrieveData.call(this, this.event.session.user.accessToken, (accounts) => {
                var speech = '';
                var accountNumber = '';
                var found = false;
                if (!Array.isArray(accounts)) {
                    accounts = [accounts]; // Convert single account object to array if required
                }
                for (var i=0; i<accounts.length; i++) {
                    accountNumber = accounts[i].accountNumber.value;
                    if (accountNumber.substr(accountNumber.length-4)===slotValue) {
                        found=true;
                        if (accounts[i].availableBalance != null) {
                            speech += 'The available balance for account ending <say-as interpret-as="digits">' + accountNumber.substr(accountNumber.length-4) + '</say-as> ';
                            speech += 'is <say-as interpret-as="cardinal">' + accounts[i].availableBalance + '</say-as><break time="1s"/> ';
                        }
                        break;
                    }
                }
                if (!found) {
                    speech = 'I could not find an account ending <say-as interpret-as="digits">' + slotValue + '</say-as>';
                }
                if (speech != '') {
                    this.response.speak(speech);
                } else {
                    this.response.speak('There is no balance listed for this account');
                }
                this.emit(':responseReady');
            });
            
        }  
        
    },
    'AMAZON.HelpIntent': function () {
        const speechOutput = HELP_MESSAGE;
        const reprompt = HELP_REPROMPT;

        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    },
    'AMAZON.StopIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    }
};

function retrieveData(accessToken, callback) {
    
    var headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': 'Bearer ' + accessToken,
                'X-IBM-Client-Id': CLIENT_ID,
                'X-IBM-Client-Secret': CLIENT_SECRET
            };
     

            var options = {
                hostname: HOSTNAME,
                path: PATH,
                method: 'GET',
                headers: headers
            };
            
            var body = '';
            
            https.get(options, (res) => {
                console.log('statusCode:', res.statusCode);
                
                res.on('data', (data) => {
                    body += data;
                });
                
                 res.on('end', () => {
                    console.log('data complete');
                
                    var responseObject = JSON.parse(body);
                    
                    switch (res.statusCode) {
                        case 401: // access code issue
                            console.log(JSON.stringify(responseObject));
                            this.response.speak('There was a problem accessing your account. Please try linking your account again in the companion app')
                                .linkAccountCard()
                                .shouldEndSession(true);
                            break;
                        case 403: // authorization level issue
                            console.log(JSON.stringify(responseObject));
                            this.response.speak('I am not authorized to access your accounts. Please grant permission using the companion app')
                            .linkAccountCard()
                            .shouldEndSession(true);
                            break;
                        case 200: // OK
                            var accounts = responseObject.response.accounts;
                            if (accounts == null) {
                                this.response.speak('There are no accounts listed');
                                break;
                            }
                            return callback(accounts);
                        default:
                            console.log(JSON.stringify(responseObject));
                            this.response.speak('I am sorry. An unexpected error has occurred');
                    }
                    this.emit(':responseReady');
                });
                
            }).on('error', (e) => {
                console.error(e);
                this.emit(':tell', 'I am currently unable to access your account information. Please try again later');
            })
}
