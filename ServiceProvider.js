/*
 * Copyright 2014 IBM Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var rdflib = require('rdflib');
const _ = require('lodash');

// Define some useful namespaces

const FOAF = rdflib.Namespace("http://xmlns.com/foaf/0.1/");
const RDF = rdflib.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
const RDFS = rdflib.Namespace("http://www.w3.org/2000/01/rdf-schema#");
const OWL = rdflib.Namespace("http://www.w3.org/2002/07/owl#");
const DC = rdflib.Namespace("http://purl.org/dc/elements/1.1/");
const RSS = rdflib.Namespace("http://purl.org/rss/1.0/");
const XSD = rdflib.Namespace("http://www.w3.org/TR/2004/REC-xmlschema-2-20041028/#dt-");
const CONTACT = rdflib.Namespace("http://www.w3.org/2000/10/swap/pim/contact#");
const OSLC = rdflib.Namespace("http://open-services.net/ns/core#");
const OSLCCM = rdflib.Namespace('http://open-services.net/ns/cm#');
const OSLCRM = rdflib.Namespace('http://open-services.net/xmlns/rm/1.0/');
const OSLCCM10 = rdflib.Namespace('http://open-services.net/xmlns/cm/1.0/');
const JD = rdflib.Namespace('http://jazz.net/xmlns/prod/jazz/discovery/1.0/');
const OSLCCONFIG = rdflib.Namespace('http://open-services.net/ns/config#');

// Encapsulates a OSLC ServiceProvider resource as in-memory RDF knowledge base
// This is an asynchronous constructor. The callback is called when the ServiceProvider
// has discovered all its services
// @uri: the URI of the ServiceProvider
// @request: for making HTTP requests
// @callback(err, serviceProvider): called with the newly constructed and populated service provider

function ServiceProvider(uri, request, callback) {
	// Parse the RDF source into an internal representation for future use
	var _self = this;
	_self.providerURI = uri;
	_self.provider = new rdflib.IndexedFormula();

	request.get(uri, function parseServiceProvider(err, response, body) {
		if (!response || response.statusCode != 200) {
			return console.error('Failed to read the ServiceProvider '+err);
		}
		rdflib.parse(body, _self.provider, uri, 'application/rdf+xml');
		rdflib.fromRDF(_self.provider, _self.provider.sym(_self.providerURI), _self);

		callback(undefined);
	});
}

ServiceProvider.prototype.queryBase = function( soughtResource ) {

        const queryCapabilities = _.filter( this.service.queryCapability,
            (s) =>
                {
                    return _.has( s, 'resourceType' )
                        && _.has( s, 'queryBase' );
                }
            );

        const qcsWithSoughtResource = _.filter( queryCapabilities,
            (qc) =>
                {
                    return _.some( qc.resourceType,
                        (rt) => {
                            return rt.match( soughtResource )
                        }
                    );
                }
            );

        return _.first(qcsWithSoughtResource).queryBase;
 }

// Introspect an RDF object's properties and values, and put them
// into the JavaScript object
//
// @kb: the rdflib IndexedFormula that contains the RDF graph
// @subject: the RDF object (an rdflib sym)
// @jObject: a JavaScript object that will get the discovered properties
// @return: true if the properties were filled in, false if the subject is an external reference
//
rdflib.fromRDF = function (kb, subject, jObject) {
	var props = kb.statementsMatching(subject, undefined, undefined);
	if (props.length === 0) return false;
	for (p in props) {
		var prop = props[p].predicate.uri.replace(/.*(#|\/)/, '');
		var multiValued = false;
		if (jObject[prop] !== undefined) {
			if (!Array.isArray(jObject[prop])) {
				jObject[prop] = [jObject[prop]];
			}
			multiValued = true;
		}
		var value = null;
		if (props[p].object.termType === 'literal') {
			value = props[p].object.value;
		} else {
			value = {};
			if (!this.fromRDF(kb, props[p].object, value)) value = props[p].object.uri;
		}
		if (multiValued) {
			jObject[prop].push(value);
		} else {
			jObject[prop] = value;
		}
	}
	return true;
}

module.exports = ServiceProvider;
