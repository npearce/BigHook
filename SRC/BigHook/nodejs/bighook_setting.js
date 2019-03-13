/*
*   BigHookSettings:
*     GitHub Enterprise webhook server Settings.
*
*   N. Pearce, April 2018
*   http://github.com/npearce
*
*/
"use strict";

const util = require('./util');
const octokit = require('@octokit/rest')({
    headers: {
      accept: 'application/vnd.github.v3+json'
    }
});
const os = require('os');
  
function BigHookSettings() {
  this.state = {};
}

BigHookSettings.prototype.WORKER_URI_PATH = "shared/webhook/github-settings";
BigHookSettings.prototype.isPublic = true;
BigHookSettings.prototype.isSingleton = true;
BigHookSettings.prototype.isPersisted = true;

/**
 * handle onStart
 */
BigHookSettings.prototype.onStart = function(success, error) {

    var me = this;
    this.loadState(null,

        function (err, state) {
            if (err) {

                error('[BigHookSettings] - Error loading state:' +err);
                return;

            }

            util.logInfo('State loaded.');
            me.state = state;
        }

    );
    success();

};

/**
 * handle onGet HTTP request
 */
BigHookSettings.prototype.onGet = function(restOperation) {

    // Respond with the persisted state (config)
    restOperation.setBody(this.state);
    this.completeRestOperation(restOperation);
  
};

/**
 * handle onPost HTTP request
 */
BigHookSettings.prototype.onPost = function(restOperation) {

    var newState = restOperation.getBody();

    // If there's no 
    if (!newState) {

        restOperation.fail(new Error("[BigHookSettings] - No state provided..."));
        return;

    }
    else {

        util.logInfo('Settings updated.');
        this.state = newState;

        this.validateSettings(newState)
        .then((results) => {

            util.logInfo(`Settings validation results: ${results}`);

        })
        .catch((err) => {
            
            util.logError(`validateSettings(): ${err}`);

        });

    }

    restOperation.setBody(this.state);
    this.completeRestOperation(restOperation);
      
};

/**
 * validate settings
 */
BigHookSettings.prototype.validateSettings = function(newState) {

    return new Promise((resolve, reject) => {

        octokit.authenticate({
            type: 'oauth',
            token: newState.config.ghe_access_token
        });

        let hostname = os.hostname();
        let repo = newState.config.repository.split('/');
        let title = 'Validated settings for: ' +hostname;
        let body = 'The F5 BIG-IP: \''+hostname+'\' is managed by this repository: \'' +newState.config.repository+ '\'';

        octokit.issues.create({baseUrl: newState.config.ghe_base_url, owner: repo[0], repo: repo[1], title: title, labels: ['validated'], body: body})
        .then((result) => {

            resolve(result.headers.status);

        })
        .catch((err) => {

            reject(err);

        });
    });

};

/**
 * handle /example HTTP request
 */
BigHookSettings.prototype.getExampleState = function () {    
  
    return {
        "config": {
            "ghe_base_url":"https://1.1.1.1/api/v3",
            "repository": "iacorg/bigip1.prod.n8labs.local",
            "ghe_access_token": "[GitHub Access Token]",
            "max_queue_length": 10,
            "debug": false
        }
    };
  
};

module.exports = BigHookSettings;