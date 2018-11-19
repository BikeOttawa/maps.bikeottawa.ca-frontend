const OsmRequest = require('osm-request');


const osm = new OsmRequest({
  endpoint: 'https://www.openstreetmap.org',
  oauthConsumerKey: 'ZgM987arjTsqx9SH8jknXREO12x5dcgNpTt66EjK',
  oauthSecret: 'ZV29qzTCGZ2vd5GMEVDyVRz6yK1C4vyrzc0z7FUy',
  oauthUserToken: 'uay6rh6McCIIZ2HCSyO1tf2xpYdljPUT0ufWIPwv',         //BikeOttawaMaps
  oauthUserTokenSecret: 'FklCZos2wjGMaqtH3NKc0gWXxwsZSFBdmLkwSf6l',   //BikeOttawaMaps
});


let changesetId = 0;

global.submitOsmChangeset = async function (osmElement, tags) {
    let element = await osm.fetchElement(osmElement);
    for (const key of Object.keys(tags)) {
      element = osm.setProperty(element, key, tags[key]);
    }
    //element = osm.removeProperty(element, 'key2');
    //element = osm.setTimestampToNow(element);

    const changesetId = await osm.createChangeset('BikeOttawaMaps', 'Changed pathway details - https://maps.bikeottawa.ca');
    //const changesetId = await osm.isChangesetStillOpen(changesetId);
    const newElementVersion = await osm.sendElement(element, changesetId);

    //element = osm.setVersion(element, newElementVersion);

}
