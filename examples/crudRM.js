// This is the same example as
// A simple example OSLC client application that demonstrates how to utilize
// typical OSLC integration capabilities for doing CRUD operations on resource.
// The example is based on the OSLC Workshop example at:
// /Users/jamsden/Documents/workspace/net.jazz.oslc.consumer.oslc4j.cm.client
// Example04.java, but in JavaScript and using Node.js and a prototype of oslc.js

var async = require('async');

var OSLCServer = require('../../oslc-client');

// setup information - server, user, project area, work item to update
var serverURI = "https://splendid-alm.atsodius.com:9443/rm"; // Set the Public URI of your RTC server
var userName = "patricia"; // the user login name or id
var password = "patricia";
var providerContainerName = "Splendid Agile Golf"; // Set the project area name where is located the Work Item/Change Request to be changed
var requirementID = "3"; // Set the Work Item/Change Request # to change

var server = new OSLCServer(serverURI);

// Connect to the OSLC server, use a service provider container, and do some
// operations on resources. All operations are asynchronous but often have
// to be done in a specific order.

console.log('Waiting for requirement to update...');

// async.series executes a array of asynchronous functions in sequence.
// Each function takes a callback(err, [result]) that must be called when the function completes.
// Since the callbacks for OSLCServer usually have the same signature,
// we can use the same callback for async.series callbacks directly.
//
// The functions can be defined inline if they do not need to be reused. Otherwise
// define them separately and pass a reference in the array.

var requirement = null; // the requirement we'll be updating

async.series(
    [
	function connect(callback) {
		server.connect(userName, password, callback);
	},

	function use(callback) {
		server.use(providerContainerName, callback);
	},

	function read(callback) {

	    server.read(requirementID,

	      (err, result) =>
	      {
	          if (!err)
	          {
	              requirement = result;
	              console.log( `Got Requirement Id: ${requirement.id}.`);
	          }

	          callback(err, requirement);
	      }
	    );
	},

	function update(callback) {
	    requirement.description = requirement.description + new Date();

		server.update(requirement, function(err) {
			if (!err) console.log('Updated: ' + requirement.id);
			callback(err);
		});
	},

	function cleanup(callback) {
		server.disconnect();
		console.log('Done');
		callback(null);
	}
]);
