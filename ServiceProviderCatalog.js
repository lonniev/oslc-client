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

const _ = require('lodash');
const escapeStringRegexp = require('escape-string-regexp');

const rdflib = require('rdflib');
const ServiceProvider = require('./ServiceProvider');

// Define some useful namespaces

const FOAF = require('./server').FOAF;
const RDF = require('./server').RDF;
const RDFS = require('./server').RDFS;
const OWL = require('./server').OWL;
const DC = require('./server').DC;
const RSS = require('./server').RSS;
const XSD = require('./server').XSD;
const CONTACT = require('./server').CONTACT;
const OSLC = require('./server').OSLC;
const OSLCCM = require('./server').OSLCCM;
const OSLCRM = require('./server').OSLCRM;
const OSLCCM10 = require('./server').OSLCCM10;
const JD = require('./server').JD;
const DCTERMS = require('./server').DCTERMS;

// Encapsulates a OSLC ServiceProviderCatalog resource as in-memory RDF knowledge base

// Construct a ServiceProviderCatalog
//
// @uri: the ServiceProviderCatalog URI
// @rdfSource: the RDF/XML for the ServiceProviderCatalog
//
function ServiceProviderCatalog(uri, rdfSource)
{
    // Parse the RDF source into an internal representation for future use
    var _self = this;
    _self.catalogURI = uri;
    _self.catalog = new rdflib.IndexedFormula();
    rdflib.parse(rdfSource, _self.catalog, uri, 'application/rdf+xml');
    _self.xmlLiteral = _self.catalog.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral');
}

// Get the ServiceProvider with the given service provider name. This will also load all the
// services for that service provider so they are available for use.
//
// This is an example of an asnychronous constructor. The constructor returns immediately
// with the constructed function, but its member variables are set asynchronously.
// The actual constructed function is returned through a callback when it's
// construction has completed.
//
// @serviceProviderTitle: the dcterms:title of the service provider (e.g., an RTC project area)
// @callback(err, serviceProvider): called back when the ServiceProvider had been populated with Services
//
ServiceProviderCatalog.prototype.serviceProvider =
    function(serviceProviderTitle, request, callback)
    {
        var haveTitle = this.catalog.statementsMatching(
            undefined,
            DCTERMS('title'),
            undefined );

        const regex = new RegExp( ".*?" + escapeStringRegexp( serviceProviderTitle ) + ".*?" );

        var sp = _.filter( haveTitle,
            (s) =>
            {
                return s.object.value.match( regex );
            }
        );

        if ( ! Array.isArray( sp ) || sp.length == 0 )
        {
           return console.log( `Service Provider ${serviceProviderTitle} not found` );
        }

        var serviceProvider = new ServiceProvider(
            sp[0].subject.uri,
            request,

            (err) =>
            {
                if (err)
                {
                    return console.log(
                        `Cannot load services for ${serviceProviderTitle}: ${err}` );
                }

                callback(undefined, serviceProvider); // the constructed ServiceProvider is now fully constructed
            }
        );
    }


module.exports = ServiceProviderCatalog;
