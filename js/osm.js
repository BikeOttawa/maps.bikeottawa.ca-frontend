const OsmRequest = require('osm-request');


const osm = new OsmRequest({
  endpoint: 'https://www.openstreetmap.org',
  oauthConsumerKey: 'ZgM987arjTsqx9SH8jknXREO12x5dcgNpTt66EjK',
  oauthSecret: 'ZV29qzTCGZ2vd5GMEVDyVRz6yK1C4vyrzc0z7FUy',
  oauthUserToken: 'uay6rh6McCIIZ2HCSyO1tf2xpYdljPUT0ufWIPwv',         //BikeOttawaMaps
  oauthUserTokenSecret: 'FklCZos2wjGMaqtH3NKc0gWXxwsZSFBdmLkwSf6l',   //BikeOttawaMaps
});


let changesetId = 1;

global.submitOsmChangeset = async function (osmElement, tags) {
    let element = await osm.fetchElement(osmElement);
    for (const key of Object.keys(tags)) {
      if(tags[key].trim()!='')
        element = osm.setProperty(element, key, tags[key].trim());
    }

    let isOpen = false;
    try {
			await osm.isChangesetStillOpen(changesetId);
		}
		catch(e) {
			changesetId = 1;
		}

    if(changesetId == 1)
      changesetId = await osm.createChangeset('BikeOttawaMaps', 'Pathway details based on mapillary and local knowledge - https://maps.bikeottawa.ca');

    const newElementVersion = await osm.sendElement(element, changesetId);

    //element = osm.setVersion(element, newElementVersion);

}
