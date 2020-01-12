const OsmRequest = require('osm-request');


const osm = new OsmRequest({
  endpoint: 'https://www.openstreetmap.org',
  oauthConsumerKey: 'ZgM987arjTsqx9SH8jknXREO12x5dcgNpTt66EjK',
  oauthSecret: 'ZV29qzTCGZ2vd5GMEVDyVRz6yK1C4vyrzc0z7FUy',
  oauthUserToken: 'uay6rh6McCIIZ2HCSyO1tf2xpYdljPUT0ufWIPwv',         //BikeOttawaMaps
  oauthUserTokenSecret: 'FklCZos2wjGMaqtH3NKc0gWXxwsZSFBdmLkwSf6l',   //BikeOttawaMaps
});

var oldChangesetId = 1;

global.modifyOsmElement = function (osmElement, tags, comment) {
  return new Promise(function(resolve, reject) {
    osm.comment = comment;
    osm.fetchElement(osmElement)
    .then(function(element) {
      for (const key of Object.keys(tags)) {
        if(tags[key].trim()!='')
          element = osm.setProperty(element, key, tags[key].trim());
      }
      return element;
    })
    .catch(function(e) {
      reject(e);
    })
    .then(function(element){
      return osm.isChangesetStillOpen(oldChangesetId)
      .catch(function(e) {
        return osm.createChangeset('BikeOttawaMaps', osm.comment?osm.comment:'Pathway details based on mapillary and local knowledge - https://maps.bikeottawa.ca')
      })
      .then(function(newChangesetId){
        osm.sendElement(element, newChangesetId)
        .then(function(newElem){
          oldChangesetId  = newChangesetId;
          resolve();
        })
        .catch(function(e) {
          reject(e);
        })
      })
    })

    //element = osm.setVersion(element, newElementVersion);
  })
}

global.createOsmNode = function (lat, lng, tags, comment) {
  return new Promise(function(resolve, reject) {
    osm.comment = comment;
    osm.isChangesetStillOpen(oldChangesetId)
    .catch(e => osm.createChangeset('BikeOttawaMaps', osm.comment?osm.comment:'Ottawa details based on mapillary and local knowledge - https://maps.bikeottawa.ca'))
    .then(newChangesetId => {
      if(!newChangesetId){throw new Error('Can\'t create new changeset')}
      oldChangesetId  = newChangesetId;
      const element = osm.createNodeElement(lat, lng, tags)
      osm.sendElement(element, newChangesetId)
    })
    .then(newElem => resolve())
    .catch(e => reject(e))
  })
}
