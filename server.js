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

/**
 * server is a JavaScript Node.js API for accessing OSLC resources. It provides a
 * convenient JavaScript interface to OSLC REST services, with all resources handled
 * using JSON-LD.
 */

const request = require('request').defaults({
    headers : {
        'Accept' : 'application/rdf+xml',
        'OSLC-Core-Version' : '2.0'
    },
    strictSSL : false, // no need for certificates
    jar : true, // cookie jar
    followAllRedirects : true // for FORM based authentication
});

const requestApromise = require('request-promise-native').defaults({
    headers : {
        'Accept' : 'application/rdf+xml',
        'OSLC-Core-Version' : '2.0'
    },
    strictSSL : false, // no need for certificates
    jar : true, // cookie jar
    followAllRedirects : true // for FORM based authentication
});

var RootServices = require('./RootServices');
var ServiceProviderCatalog = require('./ServiceProviderCatalog');
var OSLCResource = require('./resource');

var rdflib = require('rdflib');

const URI = require('urijs');
const _ = require('lodash');

// Define some useful namespaces

var FOAF = rdflib.Namespace("http://xmlns.com/foaf/0.1/");
var RDF = rdflib.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
var RDFS = rdflib.Namespace("http://www.w3.org/2000/01/rdf-schema#");
var OWL = rdflib.Namespace("http://www.w3.org/2002/07/owl#");
var DC = rdflib.Namespace("http://purl.org/dc/elements/1.1/");
var RSS = rdflib.Namespace("http://purl.org/rss/1.0/");
var XSD = rdflib.Namespace("http://www.w3.org/TR/2004/REC-xmlschema-2-20041028/#dt-");
var CONTACT = rdflib.Namespace("http://www.w3.org/2000/10/swap/pim/contact#");
var OSLC = rdflib.Namespace("http://open-services.net/ns/core#");
var OSLCCM = rdflib.Namespace('http://open-services.net/ns/cm#');
var OSLCRM = rdflib.Namespace('http://open-services.net/xmlns/rm/1.0/');
var DCTERMS = rdflib.Namespace('http://purl.org/dc/terms/');

/**
 * Construct a generic OSLC server that can be used on any OSLC domain
 * @constructor
 * @param {URI} serverURI - the server URI
 * @property {URI} serverURI - the URI of the OSLC server being accessed
 * @property {string} userName - the user name or authentication ID of the user
 * @property {string} password - the user's password credentials
 * @property {URI} providerContainerName - the project area the user wants to access
 * @property {RootServices} rootServices - the Jazz rootservices document
 * @property {ServiceProviderCatalog} serviceProviderCatalog - the servers' service provider catalog
 * @property {ServiceProvider} serviceProvider - A service provider describing available services
 */
function OSLCServer(serverURI)
{
    this.serverURI = serverURI;
    this.userName = null;
    this.password = null;
    this.rootServices = null;
    this.serviceProviderCatalog = null;
    this.providerContainerName = null;
    this.serviceProvider = null;
}

/**
 * Ask the credentialed OSLCServer to get a promise for a ServiceProviderCatalog
 *
 * @param {string} catalogURI - the URI of a domain-specific Catalog
 */
OSLCServer.prototype.getPromisedServiceProviderCatalog = function( catalogURI )
{
  const _self = this;

  return new Promise( (resolve,reject) =>
  {
    requestApromise
      .get( { uri: catalogURI, resolveWithFullResponse: true } )
      .then( (response) =>
        {
          // the ServiceProviderCatalog is an access-restricted Resource
          // on the first request, Jazz will challenge for FORM authentication
          // by including its unique HTTP Header and value
          if (response.headers['x-com-ibm-team-repository-web-auth-msg'] === 'authrequired')
          {
              const securityUri = URI( _self.serverURI )
                  .segment( 'j_security_check' )
                  .addSearch( 'j_username', _self.userName )
                  .addSearch( 'j_password', _self.password )
                  .toString();

              // post the HTTP Form credentials and recursively retry the original request
              requestApromise
                .post( securityUri )
                .then( (body) =>
                  {
                    resolve( _self.getPromisedServiceProviderCatalog( catalogURI ) );
                  }
                )
                .catch( (err) =>
                  {
                    reject(err);
                  }
                );
          }

          // otherwise, this is an authenticated secondary response
          if (response.statusCode != 200)
          {
              reject( 'Failed to read the OSLC ServiceProviderCatalog' );
          }

          _self.serviceProviderCatalog = new ServiceProviderCatalog(response.request.uri.href, response.body);

          resolve( _self.serviceProviderCatalog );
        }
      )
      .catch( (err) =>
        {
          reject( err );
        }
      );
    }
  );
}

/**
 * Connect to the server with the given credentials
 *
 * @param {string} userName - the user name or authentication ID of the user
 * @param {string} password - the user's password credentials
 */
OSLCServer.prototype.connect = function(userName, password)
{
  const _self = this; // needed to refer to this inside nested callback functions

  _self.userName = userName;
  _self.password = password;

  const rootServicesUri = URI( _self.serverURI ).segment( 'rootservices' ).toString();

  return new Promise( (resolve,reject) =>
    {
      // Get the Jazz rootservices document for OSLC v2
      // This does not require authentication
      requestApromise
        .get( { uri: rootServicesUri, resolveWithFullResponse: true } )
        .then( (response) =>
          {
            if (response.statusCode != 200)
            {
              reject( 'Failed to read the Jazz rootservices resource ' );
            }

            _self.rootServices = new RootServices(rootServicesUri, response.body);

            const catalogURI = _self.rootServices.serviceProviderCatalogURI( OSLCRM() );

            if (catalogURI == null)
            {
                reject( 'No catalog URI at ' + _self.rootServices.rootServicesURI );
            }

            // Now get a promise of the ServiceProviderCatalog
            _self.getPromisedServiceProviderCatalog( catalogURI )
              .then( (catalog) =>
                {
                  // having a connected OSLCServer with a ServiceProviderCatalog, return the OSLCServer
                  resolve( _self );
                }
              )
              .catch( (err) =>
                {
                  reject( err );
                }
              );
          }
        )
        .catch( (err) =>
          {
            reject( err );
          }
        );
      }
  );
}

/**
 * Set the OSLCServer context to use the given ServiceProvider (e.g., project area).
 * After this call, all the Services for the ServiceProvider are known.
 *
 * @param {URI} providerContainerName - the ServiceProvider or LDP Container (e.g., project area) name
 * @param callback(err) - called when the context is set to the service provider
 */
OSLCServer.prototype.use = function(providerContainerName, callback)
{
    var _self = this;

    _self.providerContainerName = providerContainerName;

    // From the service provider catalog, get the service provider resource(service.xml)
    // resource for the project area.
    _self.serviceProviderCatalog.serviceProvider(providerContainerName, request,

        (err, serviceProvider) =>
        {
            _self.serviceProvider = serviceProvider;

            callback(undefined); // call the callback with no error
        }
    );
}

/**
 * Create a new OSLC resource
 *
 * @param callback(err, result) - callback with an error or the created resource
 */
OSLCServer.prototype.create = function(err, callback) {
    // TODO: complete the create function
}

/**
 * Read or GET all the properties of a specific OSLC resource
 *
 * @param {string} resourceID - the OSLC resource ID
 * @param callback(err, result) - callback with an error or the read OSLCResource
 */
OSLCServer.prototype.read = function(resourceID, callback) {
    // GET the OSLC resource and convert it to a JavaScript object

    this.query(
        {
            prefixes : 'dcterms=<http://purl.org/dc/terms/>',
            select : '*',
            where : `dcterms:identifier=${resourceID}`,
            orderBy : ''
        },

        (err, results) => {

            if (err)
            {
                return console.log(`Unable to Query for Resource ${resourceID} due to Error ${err}`)
            }

            if (results.length > 0)
            {
                console.log(`Successful Query for Resource ${resourceID} returned ${results.length} results`);
            }

            callback(err, results[0]);
        }
    );
}

/**
 * Update an OSLCResource
 *
 * @param {string} resourceID - the change request ID
 * @param callback(err) - callback with a potential error
 */
OSLCServer.prototype.update = function(resourceID, callback) {
    // Convert the OSLC Resource into an RDF/XML resource and PUT to the server
    callback(null);
}

/**
 * Delete an OSLCResource
 *
 * @param resourceID - the OSLC Resource ID
 * @param callback(err): callback with a potential error
 */
OSLCServer.prototype.delete = function(resourceID, callback) {
    // TODO: complete the delete function
}

/**
 * Execute an OSLC query on server resources (e.g., ChangeRequests)
 *
 * @param options: options for the query. An object of the form:
 *   {prefexes: 'prefix=<URI>,...',   - a list of namespace prefixes and URIs to resolve prefexes in the query
 *    select: '*',  - a list of resource properties to return
 *    where: 'property=value',  - what resources to return
 * 	  orderBy: '+property'     - what properties and order to sort the result
 *  }
 *
 * A query with only a where clause returns a list of matching members URIs
 * A query with a select clause returns the matching members and the
 * RDF representation of the resource including the selected properties.
 *
 * @param callback(err, result) - called with the query results
 */
OSLCServer.prototype.query = function(options, callback) {

    // discover the query base URL
    const queryBase = this.serviceProvider.queryBase( 'Requirement' );

    if ( queryBase == null )
    {
        return console.error( 'Lookup of Query Base failed for Service Provider ' + this.serviceProvider.providerURI );
    }

    var queryURI = URI(queryBase);

    // now add the OSLC Query arguments
    queryURI.search(

        (query) =>
        {
            if ( !_.isEmpty( options.prefixes ) )
            {
                query['oslc.prefix'] = options.prefixes;
            }

            if ( !_.isEmpty( options.select ) )
            {
                query['oslc.select'] = options.select;
            }

            if ( !_.isEmpty( options.where ) )
            {
                query['oslc.where'] = options.where;
            }

            if ( !_.isEmpty( options.orderBy ) )
            {
                query['oslc.orderBy'] = options.orderBy;
            }
        }
    );

    // send the OSLC Query GET to the server
    request.get(queryURI.toString(),

        (err, response, body) =>
        {
            if (err || response.statusCode != 200)
            {
                console.log( response );

                return console.log('Unable to execute query: ' + err);
            }

            // iterate over the members creating an OSLCResource for each matching member
            // that contains the selected properties
            var kb = new rdflib.IndexedFormula();

            rdflib.parse(body, kb, queryURI.toString(), 'application/rdf+xml');

            const resultSetMembers = kb.each(undefined, RDFS('member'));

            const results = _.map( resultSetMembers,

              (m) =>
                    {
                        const oslcResource = new OSLCResource(m.uri);

                        rdflib.fromRDF(kb, m, oslcResource);

                        return oslcResource;
                    }

            );

            callback(null, results);
        }
    );
}

/**
 * Disconnect from the server and release any resources
 */
OSLCServer.prototype.disconnect = function() {
    // Logout from the server
}

module.exports = OSLCServer;
