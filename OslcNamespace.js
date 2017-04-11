/**
 * Created by lonniev on 10-Apr-17.
 */

const rdflib = require('rdflib');

function OslcNamespace ()
{
}

// Define several common OSLC namespace constructor functions
OslcNamespace.prototype.FOAF = rdflib.Namespace("http://xmlns.com/foaf/0.1/");
OslcNamespace.prototype.RDF = rdflib.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
OslcNamespace.prototype.RDFS = rdflib.Namespace("http://www.w3.org/2000/01/rdf-schema#");
OslcNamespace.prototype.OWL = rdflib.Namespace("http://www.w3.org/2002/07/owl#");
OslcNamespace.prototype.DC = rdflib.Namespace("http://purl.org/dc/elements/1.1/");
OslcNamespace.prototype.RSS = rdflib.Namespace("http://purl.org/rss/1.0/");
OslcNamespace.prototype.XSD = rdflib.Namespace("http://www.w3.org/TR/2004/REC-xmlschema-2-20041028/#dt-");
OslcNamespace.prototype.CONTACT = rdflib.Namespace("http://www.w3.org/2000/10/swap/pim/contact#");
OslcNamespace.prototype.OSLC = rdflib.Namespace("http://open-services.net/ns/core#");
OslcNamespace.prototype.OSLCCONFIG = rdflib.Namespace("http://open-services.net/ns/config#");
OslcNamespace.prototype.OSLCCM = rdflib.Namespace('http://open-services.net/ns/cm#');
OslcNamespace.prototype.OSLCRM = rdflib.Namespace('http://open-services.net/xmlns/rm/1.0/');
OslcNamespace.prototype.DCTERMS = rdflib.Namespace('http://purl.org/dc/terms/');
OslcNamespace.prototype.OSLCCM10 = rdflib.Namespace('http://open-services.net/xmlns/cm/1.0/');
OslcNamespace.prototype.JD = rdflib.Namespace('http://jazz.net/xmlns/prod/jazz/discovery/1.0/');

module.exports = new OslcNamespace();