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

"use strict";

const rdflib = require('rdflib');

// Define some useful namespaces

const OSLC = require('./server').OSLC;
const OSLCCM = require('./server').OSLCCM;
const OSLCRM = require('./server').OSLCRM;
const JD = require('./server').JD;
const OSLCCONFIG = require('./server').OSLCCONFIG;

// Encapsulates a Jazz rootservices document as in-memory RDF knowledge base
//
// @uri: the URI of the Jazz rootservices resource
// @rdfSource: the RDF/XML source for the rootservices resource
//
function RootServices(uri, rdfSource) {
	// Parse the RDF source into an internal representation for future use
	this.rootServicesURI = uri;

	this.kb = new rdflib.IndexedFormula();

	rdflib.parse(rdfSource, this.kb, uri, 'application/rdf+xml');
}

// The RTC rootservices document has a number of jd:oslcCatalogs properties
// that contain inlined oslc:ServiceProviderCatalog instances.
//  <jd:oslcCatalogs>
//        <oslc:ServiceProviderCatalog rdf:about="https://oslclnx2.rtp.raleigh.ibm.com:9443/ccm/oslc/workitems/catalog">
//            <oslc:domain rdf:resource="http://open-services.net/ns/cm#"/>
//        </oslc:ServiceProviderCatalog>
//  </jd:oslcCatalogs>
// We want to get the URI for the CM oslc:domain Service Provider Catalog.
//
// @domain: the domain of the service provider catalog you want to get
// @return: the service provider catalog URI
//
RootServices.prototype.serviceProviderCatalogURI = function(domain) {

	if ( ! ( _.isObjectLike( domain ) ) || ! ( 'uri' in domain ) )
	{
		throwError( 'cannot look for a Catalog URI for an invalid OSLC Domain Namespace.' );
	}

	let catalogs;

	// each Jazz application uniquely exposes its OSLC catalog(s)
	switch ( domain.uri ) {
		case OSLCRM().uri :

			catalogs = this.kb.each(this.kb.sym(this.rootServicesURI), OSLCRM('rmServiceProviders'));

			break;

		case OSLCCM().uri :

			catalogs = this.kb.each(this.kb.sym(this.rootServicesURI), JD('oslcCatalogs'));

			break;

		case OSLCCONFIG().uri :

			catalogs = this.kb.each(this.kb.sym(this.rootServicesURI), OSLCCONFIG('configServiceProviders'));

		default:

			catalogs = [];

	}

	for (var c in catalogs) {
		var catalog = this.kb.statementsMatching(catalogs[c], OSLC('domain'), domain);
		if (catalog) return catalogs[c].uri;
	}

	return null;
}

module.exports = RootServices;
