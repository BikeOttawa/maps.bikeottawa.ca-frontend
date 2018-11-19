const OsmRequest = require('osm-request');
const osmAuth = require('osm-auth');

const osm = new OsmRequest({
  endpoint: 'https://www.openstreetmap.org',
  oauthConsumerKey: 'ZgM987arjTsqx9SH8jknXREO12x5dcgNpTt66EjK',
  oauthSecret: 'ZV29qzTCGZ2vd5GMEVDyVRz6yK1C4vyrzc0z7FUy',
  oauthUserToken: 'sghksxC7dDAra207oXGY4WIJX6ddXZrvixnrlzjL',
//  oauthUserTokenSecret: 'yvt9PMGgv8dGDPKw2s6ReHjBbBBkfUHBgEOmPus9',
});


global.sendOsmData = async function () {
  let element = await osm.fetchElement('way/39169225');
  element = osm.setProperty(element, 'key', 'value');
  element = osm.setProperties(element, {
    key1: 'value1',
    key2: 'value2',
    key3: 'value3',
  });
  element = osm.removeProperty(element, 'key2');
  element = osm.setTimestampToNow(element);

  const changesetId = await osm.createChangeset('Created by me', 'Test comment');
  //const isChangesetStillOpen = await osm.isChangesetStillOpen(changesetId);
  const newElementVersion = await osm.sendElement(element, changesetId);
  //element = osm.setVersion(element, newElementVersion);
}

global.sendOsmData1 = async function () {
  let element = await osm.fetchElement('way/39169225');
  element = osm.setProperty(element, 'key', 'value');
  element = osm.setProperties(element, {
    key1: 'value1',
    key2: 'value2',
    key3: 'value3',
  });
  element = osm.removeProperty(element, 'key2');
  element = osm.setTimestampToNow(element);


  const changesetId = await osm.createChangeset('Created by me', 'Test comment');
  const isChangesetStillOpen = await osm.isChangesetStillOpen(changesetId);
  const newElementVersion = await osm.sendElement(element, changesetId);
  //element = osm.setVersion(element, newElementVersion);
}


//sendOsmData1();
